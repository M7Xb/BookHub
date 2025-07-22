import { supabase } from '../js/supabaseClient.js';

let allAudiobooks = [];
let currentFilter = 'all';
let currentAudiobookInModal = null;

document.addEventListener('DOMContentLoaded', async () => {
  createParticles();
  setupScrollAnimations();
  await loadAudiobooks();
  await loadCategories();

  // Favorite button logic
  const playerFavoriteBtn = document.getElementById('playerFavoriteBtn');
  if (playerFavoriteBtn) {
    playerFavoriteBtn.addEventListener('click', toggleFavorite);
  }

  // Handle deep linking to a specific audiobook modal
  const urlParams = new URLSearchParams(window.location.search);
  const audiobookIdToOpen = urlParams.get('id');

  if (audiobookIdToOpen && allAudiobooks.length > 0) {
    const audiobook = allAudiobooks.find(ab => ab.id == audiobookIdToOpen);
    if (audiobook) {
      // Use a small timeout to ensure the DOM is fully ready for the modal
      setTimeout(() => showAudiobookPlayerModal(audiobook), 100);
    }
  }
});

async function loadAudiobooks() {
  const grid = document.getElementById('audiobooksGrid');
  grid.innerHTML = '';

  const { data: audiobooks, error } = await supabase
    .from('audiobooks')
    .select(`id, title, author, description, cover_url, audiobook_url, categories ( name )`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching audiobooks:', error);
    grid.innerHTML = '<div class="text-center"><h3>Error loading audiobooks</h3></div>';
    return;
  }

  allAudiobooks = audiobooks;

  if (!audiobooks.length) {
    grid.innerHTML = '<div class="text-center"><h3>No audiobooks available</h3></div>';
    return;
  }

  await renderAudiobooks();
}

async function renderAudiobooks() {
  const grid = document.getElementById('audiobooksGrid');
  grid.innerHTML = '';

  const filtered = currentFilter === 'all'
    ? allAudiobooks
    : allAudiobooks.filter(audiobook => audiobook.categories?.name?.toLowerCase() === currentFilter);

  if (!filtered.length) {
    grid.innerHTML = `<div class="text-center">
      <h3>No audiobooks found</h3>
      <p class="text-muted">Try a different category or search term.</p>
    </div>`;
    return;
  }

  const row = document.createElement('div');
  row.className = 'row';

  for (const audiobook of filtered) {
    let signedCoverUrl = 'https://via.placeholder.com/300x400';

    if (audiobook.cover_url && audiobook.cover_url.includes('/')) {
      const { data: signed, error: coverErr } = await supabase
        .storage
        .from('audiobook-covers')
        .createSignedUrl(audiobook.cover_url, 3600);

      if (!coverErr && signed?.signedUrl) {
        signedCoverUrl = signed.signedUrl;
      }
    }

    const col = document.createElement('div');
    col.className = 'col-lg-3 col-md-4 col-sm-6 mb-4';
    col.innerHTML = `
      <div class="audiobook-card fade-in h-100 d-flex flex-column justify-content-between">
        <img src="${signedCoverUrl}" class="audiobook-cover" alt="${audiobook.title}">
        <div class="audiobook-info p-3 d-flex flex-column flex-grow-1">
          <h5 class="audiobook-title"><i class="fas fa-book"></i> ${audiobook.title}</h5>
          <p class="audiobook-author text-danger small"><i class="fas fa-user me-2"></i>  ${audiobook.author || 'Unknown'}</p>
          <p class="audiobook-description flex-grow-1"> <i class="fas fa-info-circle me-2"></i>${audiobook.description || 'No description available.'}</p>
          <div class="audiobook-actions mt-3">
            <button class="view-btn" onclick='showAudiobookPlayerModal(${JSON.stringify(audiobook).replace(/'/g, "&apos;")})'>
              <i class="fas fa-eye me-2"></i>View Details
            </button>
          </div>
        </div>
      </div>
    `;
    row.appendChild(col);
  }

  grid.appendChild(row);
  setupScrollAnimations();
}

window.showAudiobookPlayerModal = async (audiobook) => {
  currentAudiobookInModal = audiobook;
  const modal = new bootstrap.Modal(document.getElementById('audiobookPlayerModal'));

  // Set title, author, description
  document.getElementById('playerTitle').textContent = audiobook.title;
  document.getElementById('playerAuthor').textContent = audiobook.author || 'Unknown';
  document.getElementById('playerDescription').textContent = audiobook.description || 'No description available.';
  document.getElementById('playerCategories').textContent = audiobook.categories?.name || 'Uncategorized';

  // Cover image
  let signedCoverUrl = 'https://via.placeholder.com/350x350';
  if (audiobook.cover_url && audiobook.cover_url.includes('/')) {
    const { data: signed, error } = await supabase
      .storage
      .from('audiobook-covers')
      .createSignedUrl(audiobook.cover_url, 3600);
    if (!error && signed?.signedUrl) {
      signedCoverUrl = signed.signedUrl;
    }
  }
  document.getElementById('playerCover').src = signedCoverUrl;
  document.getElementById('playerCover').alt = audiobook.title;

  // Audio file
  let signedAudioUrl = '';
  if (audiobook.audiobook_url && audiobook.audiobook_url.includes('/')) {
    const { data: signed, error } = await supabase
      .storage
      .from('audio-books')
      .createSignedUrl(audiobook.audiobook_url, 3600);
    if (!error && signed?.signedUrl) {
      signedAudioUrl = signed.signedUrl;
    }
  }
  const audioPlayer = document.getElementById('audioPlayer');
  audioPlayer.src = signedAudioUrl;

  await updateAudiobookFavoriteButtonState();

  // Load parts
  const otherPartsContainer = document.getElementById('otherPartsContainer');
  otherPartsContainer.innerHTML = '<div class="text-white-50">Loading parts...</div>';

  const { data: parts, error: partsError } = await supabase
    .from('audiobook_parts')
    .select('*')
    .eq('audiobook_id', audiobook.id)
    .order('part_number', { ascending: true });

  if (partsError) {
    console.error('Error loading parts:', partsError);
    otherPartsContainer.innerHTML = '<p class="text-danger">Error loading parts.</p>';
  } else if (!parts.length) {
    otherPartsContainer.innerHTML = '<p class="text-white-50">No other parts available.</p>';
  } else {
    otherPartsContainer.innerHTML = '';
    for (const part of parts) {
      let partAudioUrl = '';

      if (part.audio_url) {
        const { data: signed, error: audioErr } = await supabase
          .storage
          .from('audio-book-parts')
          .createSignedUrl(part.audio_url, 3600);
        if (!audioErr && signed?.signedUrl) {
          partAudioUrl = signed.signedUrl;
        }
      }

      const item = document.createElement('div');
      item.className = 'list-group-item bg-transparent text-light';

      item.innerHTML = `
    <div class="d-flex justify-content-between align-items-center flex-wrap">
      <div class="mb-2 mb-sm-0">
        <i class="fas fa-play-circle me-2 text-success"></i>
        <strong>Part ${part.part_number}:</strong> ${part.title}
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-primary play-part-btn">
          <i class="fas fa-play me-1"></i> 
        </button>
        <button class="btn btn-sm btn-outline-success download-part-btn">
          <i class="fas fa-download me-1"></i> 
        </button>
      </div>
    </div>
  `;

      // Play part
      item.querySelector('.play-part-btn').addEventListener('click', () => {
        const audioPlayer = document.getElementById('audioPlayer');
        audioPlayer.src = partAudioUrl;
        audioPlayer.play();
      });

      // Download part
      item.querySelector('.download-part-btn').addEventListener('click', () => {
        if (partAudioUrl) {
          const a = document.createElement('a');
          a.href = partAudioUrl;
          a.download = `${audiobook.title} - Part ${part.part_number}.mp3`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          Swal.fire('Download Error', 'Audio file not available.', 'error');
        }
      });

      otherPartsContainer.appendChild(item);
    }

  }

  modal.show();
};

async function updateAudiobookFavoriteButtonState() {
  const { data: { user } } = await supabase.auth.getUser();
  const favoriteBtn = document.getElementById('playerFavoriteBtn');

  if (!user || !currentAudiobookInModal) {
    favoriteBtn.className = 'btn btn-outline-danger rounded-pill px-4';
    favoriteBtn.innerHTML = '<i class="fas fa-heart me-2"></i> Favorite';
    return;
  }

  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('audiobook_id', currentAudiobookInModal.id)
    .single();

  if (data) {
    favoriteBtn.className = 'btn btn-danger rounded-pill px-4';
    favoriteBtn.innerHTML = '<i class="fas fa-heart-broken me-2"></i> ';
  } else {
    favoriteBtn.className = 'btn btn-outline-danger rounded-pill px-4';
    favoriteBtn.innerHTML = '<i class="fas fa-heart me-2"></i> ';
  }
}

async function toggleFavorite() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Swal.fire('Login Required', 'You must be logged in to manage favorites.', 'warning');
  }

  if (!currentAudiobookInModal) return;

  const { data: existingFavorite } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('audiobook_id', currentAudiobookInModal.id)
    .single();

  if (existingFavorite) {
    const { error: deleteError } = await supabase.from('favorites').delete().eq('id', existingFavorite.id);
    if (deleteError) {
      Swal.fire('Error', 'Could not remove from favorites.', 'error');
    } else {
      Swal.fire('Removed!', 'Removed from your favorites.', 'success');
    }
  } else {
    const { error: insertError } = await supabase.from('favorites').insert({ user_id: user.id, audiobook_id: currentAudiobookInModal.id });
    if (insertError) {
      Swal.fire('Error', 'Could not add to favorites.', 'error');
    } else {
      Swal.fire('Added!', 'Added to your favorites.', 'success');
    }
  }
  await updateAudiobookFavoriteButtonState();
}

async function loadCategories() {
  const pills = document.getElementById('filterPills');
  const { data: categories, error } = await supabase.from('categories').select('*');

  if (error) {
    console.error('Error loading categories:', error);
    return;
  }

  if (!categories || !categories.length) {
    pills.innerHTML = `<div class="text-center w-100 text-white-50">
      <p>No categories available.</p>
    </div>`;
    return;
  }

  const allBtn = document.createElement('div');
  allBtn.className = 'filter-pill active';
  allBtn.textContent = 'All Audiobooks';
  allBtn.onclick = () => setFilter('all', allBtn);
  pills.appendChild(allBtn);

  categories.forEach(cat => {
    const pill = document.createElement('div');
    pill.className = 'filter-pill';
    pill.textContent = cat.name;
    pill.onclick = () => setFilter(cat.name.toLowerCase(), pill);
    pills.appendChild(pill);
  });
}

function setFilter(category, element) {
  currentFilter = category;
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  element.classList.add('active');

  const grid = document.getElementById('audiobooksGrid');
  grid.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  setTimeout(() => renderAudiobooks(), 300);
}

function setupScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-in').forEach(el => {
    observer.observe(el);
  });
}

function createParticles() {
  const particles = document.getElementById('particles');
  for (let i = 0; i < 50; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    const size = Math.random() * 6 + 2;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 8}s`;
    particle.style.animationDuration = `${Math.random() * 10 + 8}s`;
    particles.appendChild(particle);
  }
}

document.getElementById('searchBtn').addEventListener('click', async () => {
  const term = document.getElementById('searchInput').value.toLowerCase();
  const grid = document.getElementById('audiobooksGrid');

  grid.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  const filtered = allAudiobooks.filter(audiobook =>
    audiobook.title.toLowerCase().includes(term) ||
    audiobook.author?.toLowerCase().includes(term) ||
    audiobook.description?.toLowerCase().includes(term)
  );

  setTimeout(async () => {
    grid.innerHTML = '';

    if (!filtered.length) {
      grid.innerHTML = `<div class="text-center">
        <h3>No audiobooks found</h3>
        <p class="text-muted">Try a different search term.</p>
      </div>`;
      return;
    }

    const row = document.createElement('div');
    row.className = 'row';

    for (const audiobook of filtered) {
      let signedCoverUrl = 'https://via.placeholder.com/300x400';

      if (audiobook.cover_url && audiobook.cover_url.includes('/')) {
        const { data: signed, error: coverErr } = await supabase
          .storage
          .from('audiobook-covers')
          .createSignedUrl(audiobook.cover_url, 3600);

        if (!coverErr && signed?.signedUrl) {
          signedCoverUrl = signed.signedUrl;
        }
      }

      const col = document.createElement('div');
      col.className = 'col-lg-3 col-md-4 col-sm-6 mb-4';
      col.innerHTML = `
        <div class="audiobook-card fade-in h-100 d-flex flex-column justify-content-between">
          <img src="${signedCoverUrl}" class="audiobook-cover" alt="${audiobook.title}">
          <div class="audiobook-info p-3 d-flex flex-column flex-grow-1">
            <h5 class="audiobook-title">${audiobook.title}</h5>
            <p class="audiobook-author text-danger small"><i class="fas fa-user me-2"></i> ${audiobook.author || 'Unknown'}</p>
          
            <p class="audiobook-description flex-grow-1"><i class="fas fa-info-circle me-2"></i>${audiobook.description || 'No description available.'}</p>
            <div class="audiobook-actions mt-3">
              <button class="view-btn" onclick='showAudiobookPlayerModal(${JSON.stringify(audiobook).replace(/'/g, "&apos;")})'>
                <i class="fas fa-eye me-2"></i>View Details
              </button>
            </div>
          </div>
        </div>
      `;
      row.appendChild(col);
    }

    grid.appendChild(row);
    setupScrollAnimations();
  }, 300);
});

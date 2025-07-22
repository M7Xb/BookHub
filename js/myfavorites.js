// myfavorites.js
import { supabase } from './supabaseClient.js';

let allFavorites = [];

// DOM Ready
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    Swal.fire('Not Logged In', 'Please log in to view your favorites.', 'warning');
    return;
  }

  await loadFavorites(user.id);

  // Setup filter pill buttons
  document.getElementById('all-filter').addEventListener('click', () => filterFavorites('all'));
  document.getElementById('book-filter').addEventListener('click', () => filterFavorites('book'));
  document.getElementById('audiobook-filter').addEventListener('click', () => filterFavorites('audiobook'));
  setupScrollAnimations(); // Handle any static elements with fade-in
});

async function loadFavorites(userId) {
  const grid = document.getElementById('favoritesGrid');
  const noFavorites = document.getElementById('noFavorites');
  grid.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  grid.style.display = 'flex';
  noFavorites.style.display = 'none';
  
  const { data: favorites, error } = await supabase
    .from('favorites')
    .select(`
      id,
      books (id, title, description, author, cover_url, categories (name)),
      audiobooks (id, title, description, author, cover_url, categories (name))
    `)
    .eq('user_id', userId);

  if (error) {
    console.error('Error loading favorites:', error);
    grid.innerHTML = '<div class="text-center"><h3>Error loading favorites</h3></div>';
    return;
  }

  grid.innerHTML = '';
  allFavorites = [];

  for (const fav of favorites) {
    const isBook = fav.books !== null;
    // Skip if both are null, which can happen if a book/audiobook was deleted
    if (!isBook && fav.audiobooks === null) continue;
    const item = isBook ? fav.books : fav.audiobooks;
    // Skip if the related item is null (e.g., deleted)
    if (!item) continue;
    const type = isBook ? 'book' : 'audiobook';

    let signedCoverUrl = 'https://via.placeholder.com/300x400';
    if (item.cover_url && item.cover_url.includes('/')) {
      const { data: signed } = await supabase
        .storage
        .from(isBook ? 'book-covers' : 'audiobook-covers')
        .createSignedUrl(item.cover_url, 3600);
      if (signed?.signedUrl) signedCoverUrl = signed.signedUrl;
    }

    allFavorites.push({ ...item, type, signedCoverUrl });
  }

  renderFavorites('all');
}

function renderFavorites(filterType) {
  const grid = document.getElementById('favoritesGrid');
  const noFavorites = document.getElementById('noFavorites');
  grid.innerHTML = '';

  const filtered = filterType === 'all'
    ? allFavorites
    : allFavorites.filter(fav => fav.type === filterType);

  if (allFavorites.length === 0) {
    grid.style.display = 'none';
    noFavorites.style.display = 'block';
    return;
  }

  grid.style.display = 'flex';
  noFavorites.style.display = 'none';

if (filtered.length === 0) {
  grid.innerHTML = `
    <div class="text-center text-white-50 w-100 fade-in py-5 visible">
      <div class="d-flex flex-column align-items-center justify-content-center">
        <i class="fas fa-heart-broken fa-5x mb-3" style="color: #a16eff; opacity: 0.8;"></i>
        <h2 class="mb-3">No ${filterType === 'book' ? 'Books' : 'Audiobooks'} found in your favorites.</h2>
        <p class="text-muted">Try adding some from the ${filterType === 'book' ? 'Books' : 'Audiobooks'} page.</p>
      </div>
    </div>
  `;
  return;
}




  filtered.forEach(item => {
    const col = document.createElement('div');
    col.className = 'col-lg-3 col-md-4 col-sm-6 mb-4 favorite-card';
    col.dataset.type = item.type;

    col.innerHTML = `
      <div class="book-card fade-in h-100 d-flex flex-column justify-content-between">
        <img src="${item.signedCoverUrl}" class="book-cover" alt="${item.title}">
        <div class="book-info p-3 d-flex flex-column flex-grow-1">
          <h5 class="book-title"><i class="fas fa-book me-2"></i> ${item.title}</h5>
          <p class="book-author text-danger small"> <i class="fas fa-user me-2"></i> by ${item.author || 'Unknown'}</p>
          <p class="book-description flex-grow-1"><i class="fas fa-book-open me-2"></i> ${item.description || 'No description available.'}</p>
          <div class="book-actions mt-3">
            <a href="../pages/${item.type}s.html?id=${item.id}" class="view-btn">
              <i class="fas fa-eye me-2"></i> View Details
            </a>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(col);
  });

  // Re-initialize scroll animations for the newly added cards
  setupScrollAnimations();
}

function filterFavorites(type) {
  document.querySelectorAll('.filter-pill').forEach(pill => pill.classList.remove('active'));
  document.getElementById(`${type}-filter`).classList.add('active');
  renderFavorites(type);
}

/**
 * Sets up an IntersectionObserver to add the 'visible' class to elements
 * with the 'fade-in' class when they enter the viewport.
 */
function setupScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-in:not(.visible)').forEach(el => {
    observer.observe(el);
  });
}

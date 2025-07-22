// books.js
import { supabase } from '../js/supabaseClient.js';

let allBooks = [];
let currentFilter = 'all';
let currentBookInModal = null;

const favoriteBtn = document.getElementById('favoriteBtn');

// Setup

document.addEventListener('DOMContentLoaded', async () => {
  createParticles();
  setupScrollAnimations();
  await loadBooks();
  await loadCategories();

  // Handle deep linking to a specific book modal
  const urlParams = new URLSearchParams(window.location.search);
  const bookIdToOpen = urlParams.get('id');

  if (bookIdToOpen && allBooks.length > 0) {
    const book = allBooks.find(b => b.id == bookIdToOpen);
    if (book) {
      // Use a small timeout to ensure the DOM is fully ready for the modal
      setTimeout(() => showBookModal(book), 100);
    }
  }
});

// Load Books

async function loadBooks() {
  const grid = document.getElementById('booksGrid');
  grid.innerHTML = '';

  const { data: books, error } = await supabase
    .from('books')
    .select(`id, title, author, description, cover_url, book_url, categories ( name )`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching books:', error);
    grid.innerHTML = '<div class="text-center"><h3>Error loading books</h3></div>';
    return;
  }

  allBooks = books;

  if (!books.length) {
    grid.innerHTML = '<div class="text-center"><h3>No books available</h3></div>';
    return;
  }

  await renderBooks();
}

// Render Books

async function renderBooks() {
  const grid = document.getElementById('booksGrid');
  grid.innerHTML = '';

  const filtered = currentFilter === 'all'
    ? allBooks
    : allBooks.filter(book => book.categories?.name?.toLowerCase() === currentFilter);

  if (!filtered.length) {
    grid.innerHTML = `<div class="text-center">
      <h3>No books found</h3>
      <p class="text-muted">Try a different category or search term.</p>
    </div>`;
    return;
  }

  const row = document.createElement('div');
  row.className = 'row';

  for (const book of filtered) {
    let signedCoverUrl = 'https://via.placeholder.com/300x400';

    if (book.cover_url && book.cover_url.includes('/')) {
      const { data: signed, error: coverErr } = await supabase
        .storage
        .from('book-covers')
        .createSignedUrl(book.cover_url, 3600);

      if (!coverErr && signed?.signedUrl) {
        signedCoverUrl = signed.signedUrl;
      }
    }

    const col = document.createElement('div');
    col.className = 'col-lg-3 col-md-4 col-sm-6 mb-4';
    col.innerHTML = `
      <div class="book-card fade-in h-100 d-flex flex-column justify-content-between">
        <img src="${signedCoverUrl}" class="book-cover" alt="${book.title}">
        <div class="book-info p-3 d-flex flex-column flex-grow-1">
          <h5 class="book-title"><i class="fas fa-book me-2"></i>${book.title}</h5>
          <p class="book-author text-danger small"><i class="fas fa-user me-2"></i>${book.author || 'Unknown'}</p>
          <p class="book-description flex-grow-1"><i class="fas fa-info-circle me-2"></i>${book.description || 'No description available.'}</p>
          <div class="book-actions mt-3">
            <button class="view-btn" onclick='showBookModal(${JSON.stringify(book).replace(/'/g, "&apos;")})'>
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

// Modal logic

window.showBookModal = async (book) => {
  currentBookInModal = book;
  const modal = new bootstrap.Modal(document.getElementById('bookModal'));

  document.getElementById('modalTitle').textContent = book.title;
  document.getElementById('modalAuthor').textContent = book.author || 'Unknown';
  document.getElementById('modalCategory').textContent = book.categories?.name || 'Uncategorized';
  document.getElementById('modalDescription').textContent = book.description || 'No description available.';

  let signedCoverUrl = 'https://via.placeholder.com/400x500';
  if (book.cover_url && book.cover_url.includes('/')) {
    const { data: signed, error } = await supabase
      .storage
      .from('book-covers')
      .createSignedUrl(book.cover_url, 3600);
    if (!error && signed?.signedUrl) {
      signedCoverUrl = signed.signedUrl;
    }
  }
  document.getElementById('modalCover').src = signedCoverUrl;
  document.getElementById('modalCover').alt = book.title;

  await updateFavoriteButtonState();

  const downloadBtn = document.getElementById('downloadBtn');
  downloadBtn.onclick = async () => {
    if (!book.book_url) {
      Swal.fire('Error', 'No file available for this book.', 'error');
      return;
    }

    const { data, error } = await supabase.storage
      .from('book-files')
      .createSignedUrl(book.book_url, 3600);

    if (error) {
      console.error('Error creating signed URL:', error);
      Swal.fire('Error', 'Could not get download link.', 'error');
      return;
    }

    const link = document.createElement('a');
    link.href = data.signedUrl;
    link.download = book.title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  modal.show();
};

// Load categories

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
  allBtn.textContent = 'All Books';
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

  const grid = document.getElementById('booksGrid');
  grid.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  setTimeout(() => renderBooks(), 300);
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

// Favorite logic

async function updateFavoriteButtonState() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !currentBookInModal) {
    favoriteBtn.className = 'btn btn-outline-danger rounded-pill px-4';
    favoriteBtn.innerHTML = '<i class="fas fa-heart me-2"></i> Favorite';
    return;
  }

  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('book_id', currentBookInModal.id)
    .single();

  if (data) {
    favoriteBtn.className = 'btn btn-danger rounded-pill px-4';
    favoriteBtn.innerHTML = '<i class="fas fa-heart-broken me-2"></i> ';
  } else {
    favoriteBtn.className = 'btn btn-outline-danger rounded-pill px-4';
    favoriteBtn.innerHTML = '<i class="fas fa-heart me-2"></i> ';
  }
}

favoriteBtn.addEventListener('click', async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Swal.fire('Login Required', 'You must be logged in to manage favorites.', 'warning');
  }

  if (!currentBookInModal) return;

  const { data: existingFavorite } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('book_id', currentBookInModal.id)
    .single();

  if (existingFavorite) {
    const { error: deleteError } = await supabase
      .from('favorites')
      .delete()
      .eq('id', existingFavorite.id);

    if (deleteError) {
      Swal.fire('Error', 'Could not remove from favorites.', 'error');
    } else {
      Swal.fire('Removed!', 'Removed from your favorites.', 'success');
    }
  } else {
    const { error: insertError } = await supabase
      .from('favorites')
      .insert({ user_id: user.id, book_id: currentBookInModal.id });

    if (insertError) {
      Swal.fire('Error', 'Could not add to favorites.', 'error');
    } else {
      Swal.fire('Added!', 'Added to your favorites.', 'success');
    }
  }

  await updateFavoriteButtonState();
});

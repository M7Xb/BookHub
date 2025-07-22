import { supabase } from './supabaseClient.js';

// Load latest books
async function getLatestBooks() {
  const { data: books, error } = await supabase
    .from('books')
    .select('*, categories(name)')
    .order('created_at', { ascending: false })
    .limit(4);

  if (error) {
    console.error('Error fetching latest books:', error);
    return;
  }

  const container = document.getElementById('latest-books-container');
  container.innerHTML = '';

  const viewAllBtnContainer = document.getElementById('view-all-books-btn-container');

  if (!books || books.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center text-muted py-5">
        <i class="fas fa-folder-open fa-4x mb-3"></i>
        <h4 class="fw-bold">No Books Added Yet</h4>
        <p>Check back later to see the latest uploads!</p>
      </div>
    `;
    if (viewAllBtnContainer) {
      viewAllBtnContainer.style.display = 'none';
    }
    return;
  }

  if (viewAllBtnContainer) {
    viewAllBtnContainer.style.display = 'block';
  }

  for (const book of books) {
    let coverUrl = '../assets/default-cover.png'; // fallback

    if (book.cover_url) {
      const { data: signedUrlData } = await supabase
        .storage
        .from('book-covers')
        .createSignedUrl(book.cover_url, 3600);

      if (signedUrlData?.signedUrl) {
        coverUrl = signedUrlData.signedUrl;
      }
    }

    const card = `
      <div class="col-lg-3 col-md-6">
        <div class="book-card">
          <img src="${coverUrl}" class="img-fluid mb-3" alt="${book.title}" style="height: 250px; object-fit: cover; border-radius: 8px;" />
          <div class="book-info">
            <h4 class="book-title"><i class="fas fa-book"></i> ${book.title}</h4>
            <p class="book-category"><i class="fas fa-tag"></i> ${book.categories?.name || 'Unknown'}</p>
            <p class="book-author"><i class="fas fa-user"></i> Written by ${book.author}</p>
            <p class="book-description"><i class="fas fa-info-circle"></i> ${book.description || 'No description available'}</p>
            <a href="/pages/books.html?id=${book.id}" class="view-btn">View Details</a>
          </div>
        </div>
      </div>
    `;
    container.innerHTML += card;
  }
}



// Load site stats
async function getStats() {
  try {
    const { count: bookCount } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true });

    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: categoryCount } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true });

    const { count: audiobookCount } = await supabase
      .from('audiobooks')
      .select('*', { count: 'exact', head: true });

    document.getElementById('total-books').textContent = bookCount ?? 0;
    document.getElementById('total-users').textContent = userCount ?? 0;
    document.getElementById('total-categories').textContent = categoryCount ?? 0;
    document.getElementById('total-audiobooks').textContent = audiobookCount ?? 0;
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  getStats();
  getLatestBooks();
});

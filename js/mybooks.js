import { supabase } from './supabaseClient.js';

let currentUser = null;
let books = [];

const categorySelect = document.getElementById('category');
const bookForm = document.getElementById('bookForm');
const uploadBtn = document.getElementById('uploadBtn');
const progressBar = document.querySelector('.progress-bar');
const progressContainer = document.getElementById('progress');

// Initialize on DOM ready
window.addEventListener('DOMContentLoaded', async () => {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    Swal.fire('Unauthorized', 'You must be logged in.', 'warning');
    return;
  }

  currentUser = user;
  await fetchCategories();
  await loadBooks();
});

// Fetch categories from database
async function fetchCategories() {
  const { data, error } = await supabase.from('categories').select('*');
  if (error) {
    console.error('Category load error:', error);
    return Swal.fire('Error loading categories', error.message, 'error');
  }

  categorySelect.innerHTML = '<option value="">Select Category</option>';
  const editCategorySelect = document.getElementById('editCategory');
  editCategorySelect.innerHTML = '<option value="">Select Category</option>';

  data.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = cat.name;
    categorySelect.appendChild(option.cloneNode(true));
    editCategorySelect.appendChild(option);
  });
}

window.openEditModal = async function (id) {
  const book = books.find(b => b.id === id);
  if (!book) return;

  document.getElementById('editTitle').value = book.title;
  document.getElementById('editAuthor').value = book.author;
  document.getElementById('editDescription').value = book.description;
  document.getElementById('editCategory').value = book.category_id;

  const editModal = new bootstrap.Modal(document.getElementById('editBookModal'));
  editModal.show();

  const editForm = document.getElementById('editBookForm');
  editForm.onsubmit = async (e) => {
    e.preventDefault();
    await updateBook(id);
    editModal.hide();
  };
};

async function updateBook(id) {
  const title = document.getElementById('editTitle').value.trim();
  const author = document.getElementById('editAuthor').value.trim();
  const description = document.getElementById('editDescription').value.trim();
  const category_id = document.getElementById('editCategory').value;
  const coverFile = document.getElementById('editCover').files[0];
  const bookFile = document.getElementById('editBookFile').files[0];

  if (!title || !author || !description || !category_id) {
    return Swal.fire('Missing Info', 'Please fill all required fields.', 'warning');
  }

  try {
    const updateBtn = document.getElementById('updateBtn');
    updateBtn.disabled = true;
    updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Updating...';

    const book = books.find(b => b.id === id);
    let cover_url = book.cover_url;
    let book_url = book.book_url;

    if (coverFile) {
      const timestamp = Date.now();
      const coverPath = `${currentUser.id}/${timestamp}_cover.${coverFile.name.split('.').pop()}`;
      const { error: coverError } = await supabase.storage.from('book-covers').upload(coverPath, coverFile);
      if (coverError) throw coverError;
      cover_url = coverPath;
    }

    if (bookFile) {
      const timestamp = Date.now();
      const bookPath = `${currentUser.id}/${timestamp}_book.${bookFile.name.split('.').pop()}`;
      const { error: bookError } = await supabase.storage.from('book-files').upload(bookPath, bookFile);
      if (bookError) throw bookError;
      book_url = bookPath;
    }

    const { error: updateError } = await supabase.from('books').update({
      title,
      author,
      description,
      category_id,
      cover_url,
      book_url
    }).eq('id', id);

    if (updateError) throw updateError;

    Swal.fire('Success', 'Book updated successfully!', 'success');
    await loadBooks();
  } catch (err) {
    console.error('Update error:', err);
    Swal.fire('Error updating book', err.message, 'error');
  } finally {
    const updateBtn = document.getElementById('updateBtn');
    updateBtn.disabled = false;
    updateBtn.innerHTML = '<i class="fas fa-save me-2"></i>Save Changes';
  }
}


// Load books for current user
async function loadBooks() {
  const loading = document.getElementById('loading');
  const grid = document.getElementById('booksGrid');
  const noBooks = document.getElementById('noBooks');

  loading.style.display = 'block';
  grid.style.display = 'none';
  noBooks.style.display = 'none';

  const { data, error } = await supabase
    .from('books')
    .select(`*, categories(name)`)
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Load error:', error);
    Swal.fire('Error loading books', error.message, 'error');
    loading.style.display = 'none';
    return;
  }

  books = data || [];
  grid.innerHTML = '';

  if (books.length === 0) {
    noBooks.style.display = 'block';
  } else {
    grid.style.display = 'flex';
    for (const book of books) {
      let signedCoverUrl = book.cover_url;
      if (signedCoverUrl?.includes('/')) {
        const { data: signed, error: coverErr } = await supabase
          .storage
          .from('book-covers')
          .createSignedUrl(book.cover_url, 3600);
        if (!coverErr) {
          signedCoverUrl = signed?.signedUrl;
        }
      }

      const col = document.createElement('div');
      col.className = 'col-12 col-sm-6 col-lg-3 mb-4'; // 4 cards per row on large screens
      col.innerHTML = `
        <div class="book-card fade-in h-100 d-flex flex-column justify-content-between">
          <img src="${signedCoverUrl || 'https://via.placeholder.com/300x200?text=No+Cover'}" class="book-cover" alt="${book.title}">
          <div class="p-3 d-flex flex-column flex-grow-1">
            <h5 class="gradient-text">${book.title}</h5>
            <p class="small text-muted mb-1">by ${book.author}</p>
            <p class="small text-muted flex-grow-1">${book.description?.slice(0, 300)}...</p>
            <div class="d-flex justify-content-between align-items-center mt-3">
              <span class="badge bg-primary">${book.categories?.name || 'Unknown'}</span>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-light" onclick="downloadBook('${book.id}')"><i class="fas fa-download"></i></button>
                <button class="btn btn-sm btn-outline-primary" onclick="openEditModal('${book.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteBook('${book.id}')"><i class="fas fa-trash"></i></button>
              </div>
            </div>
          </div>
        </div>`;
      grid.appendChild(col);
    }
  }

  loading.style.display = 'none';
}

// Upload new book
bookForm.addEventListener('submit', async e => {
  e.preventDefault();

  const title = document.getElementById('title').value.trim();
  const author = document.getElementById('author').value.trim();
  const description = document.getElementById('description').value.trim();
  const category_id = document.getElementById('category').value;
  const coverFile = document.getElementById('cover').files[0];
  const bookFile = document.getElementById('bookFile').files[0];

  if (!title || !author || !description || !category_id || !coverFile || !bookFile) {
    return Swal.fire('Missing Info', 'Please fill all fields and select files.', 'warning');
  }

  try {
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Uploading...';
    progressContainer.style.display = 'block';

    const timestamp = Date.now();
    const coverPath = `${currentUser.id}/${timestamp}_cover.${coverFile.name.split('.').pop()}`;
    const bookPath = `${currentUser.id}/${timestamp}_book.${bookFile.name.split('.').pop()}`;

    const { error: coverError } = await supabase.storage.from('book-covers').upload(coverPath, coverFile);
    if (coverError) throw coverError;
    updateProgress(40);

    const { error: bookError } = await supabase.storage.from('book-files').upload(bookPath, bookFile);
    if (bookError) throw bookError;
    updateProgress(70);

    const { error: insertError } = await supabase.from('books').insert([{
      title,
      author,
      description,
      category_id,
      user_id: currentUser.id,
      cover_url: coverPath,
      book_url: bookPath
    }]);

    if (insertError) throw insertError;

    updateProgress(100);
    Swal.fire('Success', 'Book uploaded successfully!', 'success');
    bookForm.reset();
    bootstrap.Modal.getInstance(document.getElementById('newBookModal')).hide();
    await loadBooks();
  } catch (err) {
    console.error('Upload error:', err);
    Swal.fire('Error uploading book', err.message, 'error');
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = '<i class="fas fa-upload me-2"></i>Upload';
    progressContainer.style.display = 'none';
    updateProgress(0);
  }
});

function updateProgress(val) {
  progressBar.style.width = `${val}%`;
}

window.downloadBook = async function (id) {
  const book = books.find(b => b.id === id);
  if (!book) return;

  try {
    const { data: signed, error } = await supabase
      .storage
      .from('book-files')
      .createSignedUrl(book.book_url, 3600);

    if (error) throw error;

    const a = document.createElement('a');
    a.href = signed.signedUrl;
    a.download = `${book.title}.pdf`;
    a.click();
  } catch (err) {
    console.error('Download error:', err);
    Swal.fire('Error', 'Failed to download book file.', 'error');
  }
};

window.deleteBook = async function (id) {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: 'This book will be permanently deleted!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete it!'
  });

  if (!result.isConfirmed) return;

  try {
    const { error } = await supabase.from('books').delete().eq('id', id);
    if (error) throw error;
    Swal.fire('Deleted!', 'Your book has been removed.', 'success');
    await loadBooks();
  } catch (err) {
    console.error('Delete error:', err);
    Swal.fire('Error deleting', err.message, 'error');
  }
};

import { supabase } from './supabaseClient.js';

// DOM Ready
document.addEventListener('DOMContentLoaded', async () => {
  await initAdminDashboard();

  // Initialize sidebar navigation
  initSidebarNavigation();
});

// ------------------------------
// Initialize Sidebar Navigation
// ------------------------------
function initSidebarNavigation() {
  // Add active class handling for navigation links
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      // Remove active class from all links
      navLinks.forEach(l => l.classList.remove('active'));
      // Add active class to clicked link
      this.classList.add('active');
    });
  });
}

// ------------------------------
// Init Admin + Load Dashboard
// ------------------------------
async function initAdminDashboard() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return; // Safeguard in case auth check fails

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  // Use optional chaining to prevent errors if profile is not found
  document.getElementById('sidebar-name1').textContent = profile?.full_name || 'Admin';
  document.getElementById('sidebar-name2').textContent = profile?.full_name || 'Admin';
  document.getElementById('sidebar-name-mobile').textContent = profile?.full_name || 'Admin';

  document.getElementById('logout-btn1')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
  });
  document.getElementById('logout-btn2')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
  });
  document.getElementById('logout-btn-mobile')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
  });

  await loadDashboardStats();

  document.getElementById('addCategoryBtn')?.addEventListener('click', addCategory);
}

// ------------------------------
// Show Section Handler - Updated
// ------------------------------
window.showSection = (id) => {
  console.log('Showing section:', id); // Debug log

  // Hide all dashboard sections
  const sections = document.querySelectorAll('.dashboard-section');
  sections.forEach(section => {
    section.classList.add('d-none');
    section.style.display = 'none'; // Extra safeguard
  });

  // Show the selected section
  const targetSection = document.getElementById(id);
  if (targetSection) {
    targetSection.classList.remove('d-none');
    targetSection.style.display = 'block'; // Extra safeguard
    console.log('Section shown:', id); // Debug log

    // Load data based on section
    switch (id) {
      case 'manage-users':
        loadUsers();
        break;
      case 'manage-categories':
        loadCategories();
        break;
      case 'manage-books':
        loadBooks();
        break;
      case 'manage-audiobooks':
        loadAudiobooks();
        break;
      case 'report-section':
        loadReports();
        break;
      case 'dashboard-overview':
        loadDashboardStats();
        break;
    }
  } else {
    console.error('Section not found:', id); // Debug log
  }
};

// ------------------------------
// Dashboard Statistics
// ------------------------------
async function loadDashboardStats() {
  try {
    const { count: bookCount } = await supabase.from('books').select('*', { count: 'exact', head: true });
    const { count: audioCount } = await supabase.from('audiobooks').select('*', { count: 'exact', head: true });
    const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: catCount } = await supabase.from('categories').select('*', { count: 'exact', head: true });

    document.getElementById('total-books').textContent = bookCount ?? 0;
    document.getElementById('total-audiobooks').textContent = audioCount ?? 0;
    document.getElementById('total-users').textContent = userCount ?? 0;
    document.getElementById('total-categories').textContent = catCount ?? 0;
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
  }
}

// ------------------------------
// USERS
// ------------------------------
async function loadUsers() {
  const tbody = document.getElementById('userTableBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-muted">
    <div class="loading"></div>
    <span class="ms-2">Loading users...</span>
  </td></tr>`;

  try {
    const { data: users, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, role")
      .order("full_name", { ascending: true });

    if (error || !users?.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-danger">No users found.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      let avatarUrl = '../assets/default-avatar.png';

      if (user.avatar_url) {
        const { data: signed, error: urlError } = await supabase
          .storage
          .from('avatars')
          .createSignedUrl(user.avatar_url, 60);

        if (!urlError && signed?.signedUrl) {
          avatarUrl = signed.signedUrl;
        }
      }

      tbody.innerHTML += `
        <tr>
          <td data-label="#">${i + 1}</td>
          <td data-label="Avatar">
            <img src="${avatarUrl}" class="rounded-circle" width="40" height="40"
                 alt="Avatar" onerror="this.onerror=null; this.src='../assets/default-avatar.png';">
          </td>
          <td data-label="Full Name">${user.full_name || '-'}</td>
          <td data-label="Email">${user.email || '-'}</td>
          <td data-label="Role">${user.role || '-'}</td>
          <td data-label="Actions"><button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')"><i class="fas fa-trash-alt"></i></button></td>
        </tr>
      `;
    }
  } catch (error) {
    console.error('Error loading users:', error);
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Error loading users.</td></tr>`;
  }
}

window.deleteUser = async (userId) => {
  const result = await Swal.fire({
    title: "Are you sure?",
    text: "This user will be permanently deleted.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, delete",
    cancelButtonText: "Cancel",
  });

  if (!result.isConfirmed) return;

  const { error } = await supabase.from("profiles").delete().eq("id", userId);
  if (error) {
    Swal.fire("Error", "Failed to delete user.", "error");
  } else {
    Swal.fire("Deleted!", "User has been removed.", "success");
    loadUsers();
  }
};

// ------------------------------
// CATEGORIES
// ------------------------------
async function loadCategories() {
  const tbody = document.getElementById('categoryTableBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="3" class="text-muted">
    <div class="loading"></div>
    <span class="ms-2">Loading categories...</span>
  </td></tr>`;

  try {
    const { data: categories, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error || !categories?.length) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-danger">No categories found.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    categories.forEach((cat, index) => {
      tbody.innerHTML += `
        <tr>
          <td data-label="#">${index + 1}</td>
          <td data-label="Name">${cat.name}</td>
          <td data-label="Actions">
            <button class="btn btn-sm btn-warning me-2" onclick="editCategory(${cat.id}, '${cat.name}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-danger" onclick="deleteCategory(${cat.id})"><i class="fas fa-trash-alt"></i></button>
          </td>
        </tr>
      `;
    });
  } catch (error) {
    console.error('Error loading categories:', error);
    tbody.innerHTML = `<tr><td colspan="3" class="text-danger">Error loading categories.</td></tr>`;
  }
}

async function addCategory() {
  const { value: name } = await Swal.fire({
    title: 'Add Category',
    input: 'text',
    inputLabel: 'Category Name',
    inputPlaceholder: 'Enter name',
    showCancelButton: true
  });

  if (name) {
    const { error } = await supabase.from("categories").insert({ name });
    if (error) {
      Swal.fire("Error", "Failed to add category.", "error");
    } else {
      Swal.fire("Success", "Category added!", "success");
      loadCategories();
    }
  }
}

window.editCategory = async (id, currentName) => {
  const { value: newName } = await Swal.fire({
    title: 'Edit Category',
    input: 'text',
    inputValue: currentName,
    showCancelButton: true
  });

  if (newName && newName !== currentName) {
    const { error } = await supabase.from("categories").update({ name: newName }).eq("id", id);
    if (error) {
      Swal.fire("Error", "Update failed.", "error");
    } else {
      Swal.fire("Updated!", "Category updated successfully.", "success");
      loadCategories();
    }
  }
};

window.deleteCategory = async (id) => {
  const confirm = await Swal.fire({
    title: 'Are you sure?',
    text: "This will permanently delete the category.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete it!'
  });

  if (confirm.isConfirmed) {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      Swal.fire("Error", "Deletion failed.", "error");
    } else {
      Swal.fire("Deleted!", "Category deleted successfully.", "success");
      loadCategories();
    }
  }
};

// ------------------------------
// BOOKS
// ------------------------------
async function loadBooks() {
  const tbody = document.getElementById('bookTableBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="text-muted">
    <div class="loading"></div>
    <span class="ms-2">Loading books...</span>
  </td></tr>`;

  try {
    const { data: books, error } = await supabase
      .from("books")
      .select(`
        id, title, author, cover_url,
        categories(name),
        profiles(full_name)
      `)
      .order("created_at", { ascending: false });

    if (error || !books?.length) {
      console.error("Supabase error:", error);
      tbody.innerHTML = `<tr><td colspan="7" class="text-danger text-center">No books found.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    for (let i = 0; i < books.length; i++) {
      const book = books[i];

      let coverUrl = "../assets/default-cover.png";
      if (book.cover_url) {
        const { data: signed } = await supabase
          .storage
          .from("book-covers")
          .createSignedUrl(book.cover_url, 3600);
        if (signed?.signedUrl) coverUrl = signed.signedUrl;
      }

      tbody.innerHTML += `
        <tr>
          <td data-label="#">${i + 1}</td>
          <td data-label="Cover"><img src="${coverUrl}" alt="${book.title}" class="avatar-sm rounded" style="width: 50px; height: auto;"></td>
          <td data-label="Title">${book.title}</td>
          <td data-label="Author">${book.author}</td>
          <td data-label="Category">${book.categories?.name || '-'}</td>
          <td data-label="Uploaded By">${book.profiles?.full_name || '-'}</td>
          <td data-label="Actions">
            <button class="btn btn-sm btn-danger" onclick="deleteBook('${book.id}')">
              <i class="fas fa-trash-alt"></i> 
            </button>
          </td>
        </tr>
      `;
    }

  } catch (err) {
    console.error("Unexpected error:", err);
    tbody.innerHTML = `<tr><td colspan="7" class="text-danger">Error loading books.</td></tr>`;
  }
}


window.deleteBook = async (bookId) => {
  const result = await Swal.fire({
    title: "Are you sure?",
    text: "This book will be permanently deleted.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, delete",
    cancelButtonText: "Cancel",
  });

  if (!result.isConfirmed) return;

  const { error } = await supabase.from("books").delete().eq("id", bookId);
  if (error) {
    Swal.fire("Error", "Failed to delete book.", "error");
  } else {
    Swal.fire("Deleted!", "Book has been removed.", "success");
    loadBooks();
  }
};

// ------------------------------
// AUDIOBOOKS
// ------------------------------
async function loadAudiobooks() {
  const tbody = document.getElementById('audiobookTableBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-muted">
    <div class="loading"></div>
    <span class="ms-2">Loading audiobooks...</span>
  </td></tr>`;

  try {
    const { data: audiobooks, error } = await supabase
      .from("audiobooks")
      .select("*, categories(name)")
      .order("created_at", { ascending: false });

    if (error || !audiobooks?.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-danger">No audiobooks found.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    audiobooks.forEach((book, index) => {
      tbody.innerHTML += `
        <tr>
          <td data-label="#">${index + 1}</td>
          <td data-label="Title">${book.title || '-'}</td>
          <td data-label="Author">${book.author || '-'}</td>
          <td data-label="Category">${book.categories?.name || '-'}</td>
          <td data-label="Parts">
            <button class="btn btn-sm btn-info" onclick="viewParts('${book.id}', '${book.title?.replace(/'/g, "\\'")}')">
              <i class="fas fa-eye me-1"></i>
            </button>
          </td>
          <td data-label="Actions">
            <button class="btn btn-sm btn-danger" onclick="deleteAudiobook('${book.id}')"><i class="fas fa-trash-alt"></i> </button>
          </td>
        </tr>
      `;
    });
  } catch (error) {
    console.error('Error loading audiobooks:', error);
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Error loading audiobooks.</td></tr>`;
  }
};

window.deleteAudiobook = async (id) => {
  const confirm = await Swal.fire({
    title: 'Delete this audiobook?',
    text: 'This will permanently remove it.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete it'
  });

  if (confirm.isConfirmed) {
    const { error } = await supabase.from('audiobooks').delete().eq('id', id);
    if (error) {
      Swal.fire('Error', 'Failed to delete audiobook.', 'error');
    } else {
      Swal.fire('Deleted!', 'Audiobook has been deleted.', 'success');
      loadAudiobooks();
    }
  }
};

window.viewParts = async (audiobookId, title) => {
  const partsList = document.getElementById('partsList');
  const modalLabel = document.getElementById('partsModalLabel');

  if (!partsList || !modalLabel) return;

  // Get or create the modal instance to avoid re-initialization
  const partsModalEl = document.getElementById('partsModal');
  const modal = bootstrap.Modal.getOrCreateInstance(partsModalEl);

  modalLabel.textContent = `Audiobook Parts – ${title}`;
  partsList.innerHTML = `<li class="list-group-item text-muted text-center">
    <div class="loading"></div>
    <span class="ms-2">Loading parts...</span>
  </li>`;

  // Show the modal before fetching data
  modal.show();

  try {
    const { data: parts, error } = await supabase
      .from("audiobook_parts")
      .select("*")
      .eq("audiobook_id", audiobookId)
      .order("part_number", { ascending: true });

    if (error || !parts?.length) {
      partsList.innerHTML = `<li class="list-group-item text-danger text-center">No parts found.</li>`;
      return; // Modal is already shown, so we just update the content and exit.
    }

    partsList.innerHTML = '';
    for (const part of parts) {
      let playUrl = '#';
      let disabledAttr = 'disabled';

      if (part.audio_url) {
        const { data: signed, error: urlError } = await supabase.storage.from('audio-book-parts').createSignedUrl(part.audio_url, 3600);
        if (!urlError && signed?.signedUrl) {
          playUrl = signed.signedUrl;
          disabledAttr = '';
        }
      }

      const partElement = document.createElement('li');
      partElement.className = 'list-group-item d-flex justify-content-between align-items-center';
      partElement.innerHTML = `
        <div><strong>Part ${part.part_number}:</strong> ${part.title || 'Untitled'}</div>
        <div class="btn-group" role="group">
          <a class="btn btn-sm btn-outline-primary" href="${playUrl}" target="_blank" ${disabledAttr}>
            <i class="fas fa-play me-1"></i> 
          </a>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteAudiobookPart('${part.id}', '${audiobookId}', '${title.replace(/'/g, "\\'")}')">
            <i class="fas fa-trash me-1"></i> 
          </button>
        </div>
      `;
      partsList.appendChild(partElement);
    }

  } catch (error) {
    console.error('Error loading parts:', error);
    partsList.innerHTML = `<li class="list-group-item text-danger text-center">Error loading parts.</li>`;
  }
};

window.deleteAudiobookPart = async (partId, audiobookId, audiobookTitle) => {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: "This part and its audio file will be permanently deleted.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete it!',
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6c757d'
  });

  if (!result.isConfirmed) return;

  try {
    // First, get the part to find its audio file path
    const { data: part, error: partError } = await supabase
      .from('audiobook_parts')
      .select('audio_url')
      .eq('id', partId)
      .single();

    if (partError) throw new Error('Could not find the audiobook part.');

    // If an audio file path exists, delete it from storage
    if (part.audio_url) {
      const { error: storageError } = await supabase.storage
        .from('audio-book-parts')
        .remove([part.audio_url]);

      if (storageError) {
        // Log error but continue, as the main goal is to remove the DB record
        console.error('Storage deletion error:', storageError);
        Swal.fire('Warning', 'Could not delete the audio file from storage, but will remove the database entry.', 'warning');
      }
    }

    // Delete the part record from the database
    const { error: deleteError } = await supabase.from('audiobook_parts').delete().eq('id', partId);

    if (deleteError) throw deleteError;

    Swal.fire('Deleted!', 'The audiobook part has been removed.', 'success');

    // Refresh the parts list in the modal
    await viewParts(audiobookId, audiobookTitle);
  } catch (error) {
    console.error('Error deleting audiobook part:', error);
    Swal.fire('Error', `Failed to delete part: ${error.message}`, 'error');
  }
};

// ------------------------------
// REPORTS – Reported Content
// ------------------------------
async function loadReports() {
  const tbody = document.getElementById('reportTableBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-muted">
    <div class="loading"></div>
    <span class="ms-2">Loading reports...</span>
  </td></tr>`;

  try {
    const { data: reports, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !reports?.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-danger">No reports found.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    reports.forEach((r, i) => {
      tbody.innerHTML += `
        <tr>
          <td data-label="#">${i + 1}</td>
          <td data-label="User ID">${r.user_id}</td>
          <td data-label="Type">${r.target_type}</td>
          <td data-label="Target ID">${r.target_id}</td>
          <td data-label="Reason">${r.reason || '-'}</td>
          <td data-label="Created At">${new Date(r.created_at).toLocaleString()}</td>
        </tr>
      `;
    });
  } catch (error) {
    console.error('Error loading reports:', error);
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Error loading reports.</td></tr>`;
  }
}
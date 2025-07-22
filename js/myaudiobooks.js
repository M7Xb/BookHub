import { supabase } from './supabaseClient.js';

let currentUser = null;
let audiobooks = [];
let currentEditingAudiobookId = null;
let currentEditingPart = null;

const categorySelect = document.getElementById('category');
const audiobookForm = document.getElementById('audiobookForm');
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
  await loadAudiobooks();

  // Centralized event handler for the main edit form
  const editAudiobookForm = document.getElementById('editAudiobookForm');
  if (editAudiobookForm) {
    editAudiobookForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (currentEditingAudiobookId) {
        await updateAudiobook(currentEditingAudiobookId);
        const modal = bootstrap.Modal.getInstance(document.getElementById('editAudiobookModal'));
        if (modal) {
          modal.hide();
        }
      }
    });
  }

  // Centralized event handler for the part edit form
  const editPartForm = document.getElementById('editPartForm');
  if (editPartForm) {
    editPartForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (currentEditingPart) {
        await updateAudiobookPart(currentEditingPart.id, currentEditingPart.audiobook_id);
        const modal = bootstrap.Modal.getInstance(document.getElementById('editPartModal'));
        if (modal) {
          modal.hide();
        }
      }
    });
  }
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
  currentEditingAudiobookId = id; // Set the currently editing ID
  const audiobook = audiobooks.find(b => b.id === id);
  if (!audiobook) return;

  document.getElementById('editTitle').value = audiobook.title;
  document.getElementById('editAuthor').value = audiobook.author;
  document.getElementById('editDescription').value = audiobook.description;
  document.getElementById('editCategory').value = audiobook.category_id;

  const editModal = new bootstrap.Modal(document.getElementById('editAudiobookModal'));
  editModal.show();

  await loadAudiobookParts(id);
};

async function updateAudiobook(id) {
  const title = document.getElementById('editTitle').value.trim();
  const author = document.getElementById('editAuthor').value.trim();
  const description = document.getElementById('editDescription').value.trim();
  const category_id = document.getElementById('editCategory').value;
  const coverFile = document.getElementById('editCover').files[0];
  const audiobookFile = document.getElementById('editAudiobookFile').files[0];

  if (!title || !author || !description || !category_id) {
    return Swal.fire('Missing Info', 'Please fill all required fields.', 'warning');
  }

  try {
    const updateBtn = document.getElementById('updateBtn');
    updateBtn.disabled = true;
    updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Updating...';

    const audiobook = audiobooks.find(b => b.id === id);
    let cover_url = audiobook.cover_url;
    let audiobook_url = audiobook.audiobook_url;

    if (coverFile) {
      const timestamp = Date.now();
      const coverPath = `${currentUser.id}/${timestamp}_cover.${coverFile.name.split('.').pop()}`;
      const { error: coverError } = await supabase.storage.from('audiobook-covers').upload(coverPath, coverFile);
      if (coverError) throw coverError;
      cover_url = coverPath;
    }

    if (audiobookFile) {
      const timestamp = Date.now();
      const audiobookPath = `${currentUser.id}/${timestamp}_audiobook.${audiobookFile.name.split('.').pop()}`;
      const { error: audiobookError } = await supabase.storage.from('audio-books').upload(audiobookPath, audiobookFile);
      if (audiobookError) throw audiobookError;
      audiobook_url = audiobookPath;
    }

    const { error: updateError } = await supabase.from('audiobooks').update({
      title,
      author,
      description,
      category_id,
      cover_url,
      audiobook_url
    }).eq('id', id);

    if (updateError) throw updateError;

    Swal.fire('Success', 'Audiobook updated successfully!', 'success');
    await loadAudiobooks();
  } catch (err) {
    console.error('Update error:', err);
    Swal.fire('Error updating audiobook', err.message, 'error');
  } finally {
    const updateBtn = document.getElementById('updateBtn');
    updateBtn.disabled = false;
    updateBtn.innerHTML = '<i class="fas fa-save me-2"></i>Save Changes';
  }
}

async function loadAudiobookParts(audiobookId) {
  const partsList = document.getElementById('editPartsList');
  partsList.innerHTML = '<li class="list-group-item text-center">Loading...</li>';

  const { data: parts, error } = await supabase
    .from('audiobook_parts')
    .select('*')
    .eq('audiobook_id', audiobookId)
    .order('part_number');

  if (error) {
    console.error('Error loading parts:', error);
    partsList.innerHTML = '<li class="list-group-item text-danger">Error loading parts.</li>';
    return;
  }

  partsList.innerHTML = '';
  parts.forEach(part => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `
      <span>Part ${part.part_number}: ${part.title}</span>
      <div>
        <button type="button" class="btn btn-sm btn-outline-primary me-2" onclick="openEditPartModal('${part.id}')"><i class="fas fa-edit"></i></button>
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteAudiobookPart('${part.id}', '${audiobookId}')"><i class="fas fa-trash"></i></button>
      </div>
    `;
    partsList.appendChild(li);
  });
}

window.deleteAudiobookPart = async function (partId, audiobookId) {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: 'This part will be permanently deleted!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete it!'
  });

  if (!result.isConfirmed) return;

  try {
    const { error } = await supabase.from('audiobook_parts').delete().eq('id', partId);
    if (error) throw error;
    Swal.fire('Deleted!', 'The part has been removed.', 'success');
    await loadAudiobookParts(audiobookId);
  } catch (err) {
    console.error('Delete error:', err);
    Swal.fire('Error deleting', err.message, 'error');
  }
};

window.openEditPartModal = async function (partId) {
  currentEditingPart = null; // Reset first
  const { data: part, error } = await supabase.from('audiobook_parts').select('*').eq('id', partId).single();
  if (error || !part) {
    return Swal.fire('Error', 'Could not find the part details.', 'error');
  }
  currentEditingPart = part; // Set the part object to be edited

  document.getElementById('editPartNumber').value = part.part_number;
  document.getElementById('editPartTitle').value = part.title;

  const editPartModal = new bootstrap.Modal(document.getElementById('editPartModal'));
  editPartModal.show();
};

async function updateAudiobookPart(partId, audiobookId) {
  const part_number = parseInt(document.getElementById('editPartNumber').value, 10);
  const title = document.getElementById('editPartTitle').value.trim();
  const audioFile = document.getElementById('editPartAudioFile').files[0];

  if (!part_number || !title) {
    return Swal.fire('Missing Info', 'Please fill all required fields.', 'warning');
  }

  try {
    const updatePartBtn = document.getElementById('updatePartBtn');
    updatePartBtn.disabled = true;
    updatePartBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Updating...';

    let audio_url;
    if (audioFile) {
      const timestamp = Date.now();
      const audioPath = `${currentUser.id}/${audiobookId}/${timestamp}_part.${audioFile.name.split('.').pop()}`;
      const { error: audioError } = await supabase
        .storage
        .from('audio-book-parts')
        .upload(audioPath, audioFile);

      if (audioError) throw audioError;
      audio_url = audioPath;
    }

    const updateData = { part_number, title };
    if (audio_url) {
      updateData.audio_url = audio_url;
    }

    const { error: updateError } = await supabase
      .from('audiobook_parts')
      .update(updateData)
      .eq('id', partId);

    if (updateError) throw updateError;

    Swal.fire('Success', 'Part updated successfully!', 'success');
    await loadAudiobookParts(audiobookId);
  } catch (err) {
    console.error('Update error:', err);
    Swal.fire('Error updating part', err.message, 'error');
  } finally {
    const updatePartBtn = document.getElementById('updatePartBtn');
    updatePartBtn.disabled = false;
    updatePartBtn.innerHTML = '<i class="fas fa-save me-2"></i>Save Part Changes';
  }
}



// Load audiobooks for current user
async function loadAudiobooks() {
  const loading = document.getElementById('loading');
  const grid = document.getElementById('audiobooksGrid');
  const noAudiobooks = document.getElementById('noAudiobooks');

  loading.style.display = 'block';
  grid.style.display = 'none';
  noAudiobooks.style.display = 'none';

  const { data, error } = await supabase
    .from('audiobooks')
    .select(`*, categories(name), audiobook_parts(count)`)
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Load error:', error);
    Swal.fire('Error loading audiobooks', error.message, 'error');
    loading.style.display = 'none';
    return;
  }

  audiobooks = data || [];
  grid.innerHTML = '';

  if (audiobooks.length === 0) {
    noAudiobooks.style.display = 'block';
  } else {
    grid.style.display = 'flex';
    for (const audiobook of audiobooks) {
      let signedCoverUrl = audiobook.cover_url;
      if (signedCoverUrl?.includes('/')) {
        const { data: signed, error: coverErr } = await supabase
          .storage
          .from('audiobook-covers')
          .createSignedUrl(audiobook.cover_url, 3600);
        if (!coverErr) {
          signedCoverUrl = signed?.signedUrl;
        }
      }
      const partCount = audiobook.audiobook_parts?.[0]?.count ?? 0;
      const col = document.createElement('div');
      col.className = 'col-12 col-sm-6 col-lg-3 mb-4';
      col.innerHTML = `
        <div class="audiobook-card fade-in h-100 d-flex flex-column justify-content-between">
          <img src="${signedCoverUrl || 'https://via.placeholder.com/300x200?text=No+Cover'}" class="audiobook-cover" alt="${audiobook.title}">
          <div class="p-3 d-flex flex-column flex-grow-1">
            <h5 class="gradient-text"><i class="fas fa-book"></i>  ${audiobook.title}</h5>
            <p class="small text-muted mb-1"><i class="fas fa-user"></i>  ${audiobook.author}</p>
            <p class="small text-muted flex-grow-1"><i class="fas fa-file-alt"></i>  ${audiobook.description?.slice(0, 300)}...</p>
            <div class="d-flex justify-content-between align-items-center mt-3">
              <span class="badge bg-primary">${audiobook.categories?.name || 'Unknown'}</span>
                <span class="badge bg-info text-dark"> ${partCount} Parts</span>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-info" title="Add Parts" onclick="openAddPartsModal('${audiobook.id}', '${audiobook.title.replace(/'/g, "\'")}')"><i class="fas fa-plus"></i></button>
                <button class="btn btn-sm btn-outline-light" onclick="downloadAudiobook('${audiobook.id}')"><i class="fas fa-download"></i></button>
                <button class="btn btn-sm btn-outline-primary" onclick="openEditModal('${audiobook.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteAudiobook('${audiobook.id}')"><i class="fas fa-trash"></i></button>
              </div>
            </div>
          </div>
        </div>`;
      grid.appendChild(col);
    }
  }

  loading.style.display = 'none';
}

let addPartsModalInstance = null;
document.addEventListener('DOMContentLoaded', () => {
  const addPartsModalEl = document.getElementById('addPartsModal');
  if (addPartsModalEl) {
    addPartsModalInstance = new bootstrap.Modal(addPartsModalEl);
  }
});

window.openAddPartsModal = function (audiobookId, audiobookTitle) {
  if (!addPartsModalInstance) return;

  document.getElementById('modalAudiobookTitle').textContent = audiobookTitle;
  document.getElementById('currentAudiobookId').value = audiobookId;

  addPartsModalInstance.show();
}

const addPartForm = document.getElementById('addPartForm');
if (addPartForm) {
  addPartForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const audiobookId = document.getElementById('currentAudiobookId').value;
    const partNumber = document.getElementById('partNumber').value;
    const partTitle = document.getElementById('partTitle').value.trim();
    const audioFile = document.getElementById('partAudioFile').files[0];
    const uploadPartBtn = document.getElementById('uploadPartBtn');

    if (!audiobookId || !partNumber || !partTitle || !audioFile) {
      return Swal.fire('Missing Info', 'Please fill all fields and select a file.', 'warning');
    }

    try {
      uploadPartBtn.disabled = true;
      uploadPartBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Uploading...';

      const fileExt = audioFile.name.split('.').pop();
      const safePartTitle = partTitle.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const fileName = `${partNumber}_${safePartTitle}.${fileExt}`;
      const filePath = `${currentUser.id}/${audiobookId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-book-parts') // ← exact name in Supabase Storage

        .upload(filePath, audioFile);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('audiobook_parts').insert([{
        audiobook_id: audiobookId,
        part_number: parseInt(partNumber, 10),
        title: partTitle,
        audio_url: filePath,
        // user_id: currentUser.id
      }]);

      if (insertError) throw insertError;

      Swal.fire('Success', 'Audiobook part uploaded successfully!', 'success');
      addPartForm.reset();
      addPartsModalInstance.hide();
    } catch (err) {
      console.error('Part upload error:', err);
      Swal.fire('Error uploading part', err.message, 'error');
    } finally {
      uploadPartBtn.disabled = false;
      uploadPartBtn.innerHTML = '<i class="fas fa-upload me-2"></i>Upload Part';
    }
  });
}

// Upload new audiobook
audiobookForm.addEventListener('submit', async e => {
  e.preventDefault();

  const title = document.getElementById('title').value.trim();
  const author = document.getElementById('author').value.trim();
  const description = document.getElementById('description').value.trim();
  const category_id = document.getElementById('category').value;
  const coverFile = document.getElementById('cover').files[0];
  const audiobookFile = document.getElementById('audiobookFile').files[0];

  if (!title || !author || !description || !category_id || !coverFile || !audiobookFile) {
    return Swal.fire('Missing Info', 'Please fill all fields and select files.', 'warning');
  }

  try {
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Uploading...';
    progressContainer.style.display = 'block';

    const timestamp = Date.now();
    const coverPath = `${currentUser.id}/${timestamp}_cover.${coverFile.name.split('.').pop()}`;
    const audiobookPath = `${currentUser.id}/${timestamp}_audiobook.${audiobookFile.name.split('.').pop()}`;

    const { error: coverError } = await supabase.storage.from('audiobook-covers').upload(coverPath, coverFile);
    if (coverError) throw coverError;
    updateProgress(40);

    const { error: audiobookError } = await supabase.storage.from('audio-books').upload(audiobookPath, audiobookFile);
    if (audiobookError) throw audiobookError;
    updateProgress(70);

    const { error: insertError } = await supabase.from('audiobooks').insert([{
      title,
      author,
      description,
      category_id,
      user_id: currentUser.id,
      cover_url: coverPath,
      audiobook_url: audiobookPath
    }]);

    if (insertError) throw insertError;

    updateProgress(100);
    Swal.fire('Success', 'Audiobook uploaded successfully!', 'success');
    audiobookForm.reset();
    bootstrap.Modal.getInstance(document.getElementById('newAudiobookModal')).hide();
    await loadAudiobooks();
  } catch (err) {
    console.error('Upload error:', err);
    Swal.fire('Error uploading audiobook', err.message, 'error');
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

window.downloadAudiobook = async function (id) {
  const audiobook = audiobooks.find(b => b.id === id);
  if (!audiobook) return;

  try {
    const { data: signed, error } = await supabase
      .storage
      .from('audio-books')
      .createSignedUrl(audiobook.audiobook_url, 3600);

    if (error) throw error;

    const a = document.createElement('a');
    a.href = signed.signedUrl;
    a.download = `${audiobook.title}.mp3`;
    a.click();
  } catch (err) {
    console.error('Download error:', err);
    Swal.fire('Error', 'Failed to download audiobook file.', 'error');
  }
};

window.deleteAudiobook = async function (id) {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: 'This audiobook will be permanently deleted!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete it!'
  });

  if (!result.isConfirmed) return;

  try {
    const { error } = await supabase.from('audiobooks').delete().eq('id', id);
    if (error) throw error;
    Swal.fire('Deleted!', 'Your audiobook has been removed.', 'success');
    await loadAudiobooks();
  } catch (err) {
    console.error('Delete error:', err);
    Swal.fire('Error deleting', err.message, 'error');
  }
};

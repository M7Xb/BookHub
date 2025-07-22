import { supabase } from './supabaseClient.js';

const fullNameInput = document.getElementById('full_name');
const emailInput = document.getElementById('email');
const avatarImage = document.getElementById('avatar-image');
const avatarInput = document.getElementById('avatar-input');
const profileForm = document.getElementById('profile-form');
const passwordForm = document.getElementById('password-form');

const newPassword = document.getElementById('new_password');
const confirmPassword = document.getElementById('confirm_password');

let userId = null;

async function loadProfile() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User authentication error:', userError);
      return;
    }

    userId = user.id;
    emailInput.value = user.email;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error loading profile:', error);
      // If profile doesn't exist, use default values
      if (error.code === 'PGRST116') {
        console.log('Profile not found, using defaults');
        fullNameInput.value = '';
        avatarImage.src = defaultAvatar();
        return;
      }
      return;
    }

    console.log('Profile loaded:', profile); // Debug log

    fullNameInput.value = profile?.full_name || '';

    if (profile?.avatar_url) {
      console.log('Avatar URL from database:', profile.avatar_url); // Debug log
      
      const { data: signedUrlData, error: signedUrlError } = await supabase
        .storage
        .from('avatars')
        .createSignedUrl(profile.avatar_url, 3600); // valid for 1 hour
      
      console.log('Signed URL data:', signedUrlData); // Debug log
      
      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error('Signed URL fetch failed:', signedUrlError);
        avatarImage.src = defaultAvatar();
      } else {
        const avatarUrl = signedUrlData.signedUrl + `&t=${Date.now()}`;
        console.log('Final avatar URL:', avatarUrl); // Debug log
        
        avatarImage.src = avatarUrl;
        avatarImage.onerror = () => {
          console.error('Failed to load avatar from signed URL');
          avatarImage.src = defaultAvatar();
        };
        avatarImage.onload = () => {
          console.log('Avatar image loaded successfully from signed URL');
        };
      }
    } else {
      console.log('No avatar URL in profile, using default');
      avatarImage.src = defaultAvatar();
    }
  } catch (error) {
    console.error('Load profile error:', error);
    avatarImage.src = defaultAvatar();
  }
}

function defaultAvatar() {
  return '../assets/avatar.svg';
}


async function uploadAvatar(file) {
  try {
    // Validate file
    if (!file) {
      Swal.fire('Error', 'No file selected.', 'error');
      return null;
    }

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('Error', 'File size too large. Maximum 5MB allowed.', 'error');
      return null;
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      Swal.fire('Error', 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.', 'error');
      return null;
    }

    if (!userId) {
      Swal.fire('Error', 'User not authenticated.', 'error');
      return null;
    }

    const ext = file.name.split('.').pop();
    const fileName = `${userId}.${ext}`;
    const filePath = fileName;

    console.log('Uploading file:', {
      fileName,
      fileSize: file.size,
      fileType: file.type,
      userId
    });

    // Show loading state
    Swal.fire({
      title: 'Uploading...',
      text: 'Please wait while we upload your avatar.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { 
        upsert: true,
        contentType: file.type
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      Swal.fire('Upload Failed', `Could not upload avatar: ${uploadError.message}`, 'error');
      return null;
    }

    console.log('Upload successful:', uploadData);

    // Update profile table
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: filePath })
      .eq('id', userId);

    if (updateError) {
      console.error('Database update error:', updateError);
      Swal.fire('Database Error', `Could not update avatar path: ${updateError.message}`, 'error');
      return null;
    }

    console.log('Profile update successful:', updateData);

    // Get signed URL and update image
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from('avatars')
      .createSignedUrl(filePath, 3600); // valid for 1 hour

   if (signedUrlError || !signedUrlData?.signedUrl) {
  console.error('Signed URL fetch failed:', signedUrlError);
  Swal.fire('Warning', 'Avatar uploaded but could not load preview.', 'warning');
} else {
  // Add timestamp to prevent caching issues
  avatarImage.src = signedUrlData.signedUrl + `&t=${Date.now()}`;
  Swal.fire('Success!', 'Avatar uploaded successfully.', 'success').then(() => {
    location.reload();
  });
}


    return filePath;

  } catch (error) {
    console.error('Upload avatar error:', error);
    Swal.fire('Error', `Unexpected error: ${error.message}`, 'error');
    return null;
  }
}

// Avatar preview & upload
avatarInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Show preview immediately
  const reader = new FileReader();
  reader.onload = (e) => avatarImage.src = e.target.result;
  reader.readAsDataURL(file);

  // Update label
  const label = document.querySelector('.file-input-label span');
  if (label) {
    label.textContent = file.name;
  }

  // Upload file
  await uploadAvatar(file);
});

// Profile form
profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const full_name = fullNameInput.value.trim();

    if (!userId) {
      Swal.fire('Error', 'User not authenticated.', 'error');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ full_name })
      .eq('id', userId);

    if (error) {
      console.error('Profile update error:', error);
      Swal.fire('Error', `Failed to update profile: ${error.message}`, 'error');
    } else {
      Swal.fire('Success', 'Profile updated successfully.', 'success');
    
      loadProfile();
        location.reload();
    }
  } catch (error) {
    console.error('Profile form error:', error);
    Swal.fire('Error', `Unexpected error: ${error.message}`, 'error');
  }
});

// Password form
passwordForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  try {
    if (newPassword.value !== confirmPassword.value) {
      Swal.fire('Oops!', 'Passwords do not match!', 'warning');
      return;
    }

    if (newPassword.value.length < 6) {
      Swal.fire('Error', 'Password must be at least 6 characters long.', 'error');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword.value });

    if (error) {
      console.error('Password update error:', error);
      Swal.fire('Error', `Failed to update password: ${error.message}`, 'error');
    } else {
      Swal.fire('Success', 'Password updated successfully.', 'success');
      location.reload();
      newPassword.value = '';
      confirmPassword.value = '';
    }
  } catch (error) {
    console.error('Password form error:', error);
    Swal.fire('Error', `Unexpected error: ${error.message}`, 'error');
  }
});

// Floating particles
function createParticles() {
  const particles = document.getElementById('particles');
  if (!particles) return;
  
  const particleCount = 50;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 6 + 's';
    particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
    particles.appendChild(particle);
  }
}

// UI animations
document.addEventListener('DOMContentLoaded', () => {
  loadProfile();
  createParticles();

  document.querySelectorAll('.form-control').forEach(control => {
    control.addEventListener('focus', () => {
      if (control.parentElement) {
        control.parentElement.style.transform = 'translateY(-2px)';
      }
    });
    control.addEventListener('blur', () => {
      if (control.parentElement) {
        control.parentElement.style.transform = 'translateY(0)';
      }
    });
  });

  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => btn.style.transform = 'translateY(-2px)');
    btn.addEventListener('mouseleave', () => {
      if (!btn.classList.contains('loading')) {
        btn.style.transform = 'translateY(0)';
      }
    });
  });
});
import { supabase } from './supabaseClient.js';

// Sign Up Handler
document.getElementById("signup-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const fullName = document.getElementById("full_name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  // Check if passwords match
  if (password !== confirmPassword) {
    Swal.fire({
      icon: 'error',
      title: 'Password Mismatch',
      text: 'Passwords do not match. Please try again.',
    });
    return;
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });

  if (signUpError) {
    Swal.fire({
      icon: 'error',
      title: 'Sign Up Failed',
      text: signUpError.message,
    });
    return;
  }

  const user = signUpData.user;

  const { error: profileError } = await supabase.from('profiles').insert({
    id: user.id,
    full_name: fullName,
    email: email,
    avatar_url: '',
    role: 'user'
  });

  if (profileError) {
    Swal.fire({
      icon: 'error',
      title: 'Profile Creation Failed',
      text: profileError.message,
    });
    return;
  }

  Swal.fire({
    icon: 'success',
    title: 'Sign Up Successful',
    text: 'Click OK to log in.'
  }).then(() => {
    window.location.href = 'login.html';
  });

  document.getElementById("signup-form").reset();
});

// Toggle password visibility
function toggleVisibility(toggleId, inputId) {
  const toggleIcon = document.getElementById(toggleId);
  const inputField = document.getElementById(inputId);
  if (toggleIcon && inputField) {
    toggleIcon.addEventListener("click", () => {
      const isHidden = inputField.type === "password";
      inputField.type = isHidden ? "text" : "password";
      toggleIcon.classList.toggle("fa-eye");
      toggleIcon.classList.toggle("fa-eye-slash");
    });
  }
}

toggleVisibility("toggle-password", "password");
toggleVisibility("toggle-confirm-password", "confirm-password");

// Particles background animation
const particles = document.getElementById("particles");
if (particles) {
  const dots = [];
  for (let i = 0; i < 40; i++) {
    const dot = document.createElement("div");
    dot.style.position = "absolute";
    dot.style.borderRadius = "50%";
    dot.style.background = "rgba(255, 255, 255, 0.18)";
    dot.style.width = dot.style.height = `${Math.random() * 8 + 6}px`;
    dot.style.top = `${Math.random() * 100}%`;
    dot.style.left = `${Math.random() * 100}%`;
    dot.style.filter = "blur(1px)";
    dot.style.transition = "top 8s linear, left 8s linear";
    particles.appendChild(dot);
    dots.push(dot);
  }

  setInterval(() => {
    dots.forEach(dot => {
      dot.style.top = `${Math.random() * 100}%`;
      dot.style.left = `${Math.random() * 100}%`;
    });
  }, 2000);
}

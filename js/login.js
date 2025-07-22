import { supabase } from './supabaseClient.js';

// Elements
const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const particles = document.getElementById("particles");

// Handle login
form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    Swal.fire({
      icon: "error",
      title: "Login Failed",
      text: error.message,
    });
    return;
  }

  const userId = authData.user.id;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  Swal.fire({
    icon: "success",
    title: "Logged In",
    text: "Redirecting...",
    timer: 1500,
    showConfirmButton: false,
  });

  setTimeout(() => {
    if (profileError || !profile?.role) {
      window.location.href = "home.html";
    } else if (profile.role === "admin") {
      window.location.href = "dashboard.html";
    } else {
      window.location.href = "home.html";
    }
  }, 1500);
});

// Toggle password visibility
// Toggle password visibility
togglePassword?.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";

  // Fix class toggling explicitly
  togglePassword.classList.remove("fa-eye", "fa-eye-slash");
  togglePassword.classList.add(isHidden ? "fa-eye-slash" : "fa-eye");
});

// Particles
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
    dots.forEach((dot) => {
      dot.style.top = `${Math.random() * 100}%`;
      dot.style.left = `${Math.random() * 100}%`;
    });
  }, 2000);
}

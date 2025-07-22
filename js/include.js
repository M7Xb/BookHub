import { supabase } from './supabaseClient.js';

/**
 * Sets the 'active' class on the current page's navigation link.
 * This function should be called AFTER the navbar's HTML (including dynamic links)
 * has been inserted into the DOM.
 */
function setActiveNavLink() {
  // Get the path of the current page, e.g., "/pages/home.html"
  const currentPagePath = window.location.pathname;

  // Select all navigation links in the navbar and dropdown
  const navLinks = document.querySelectorAll('.navbar-nav .nav-link, .dropdown-menu .dropdown-item');

  navLinks.forEach(link => {
    // Create a URL object to safely get the pathname from the link's href.
    const linkPath = new URL(link.href, window.location.origin).pathname;

    // Check if the link's path matches the current page's path
    if (linkPath === currentPagePath) {
      link.classList.add('active');
      // If the active link is inside a dropdown, also highlight the dropdown toggle
      const dropdown = link.closest('.dropdown');
      if (dropdown) dropdown.querySelector('.dropdown-toggle')?.classList.add('active');
    }
  });
}

async function includeComponent(id, file) {
  const res = await fetch(file);
  const html = await res.text();
  document.getElementById(id).innerHTML = html;

  if (id === 'navbar') {
    setTimeout(async () => {
      const avatar = document.getElementById('user-avatar');
      const authMenu = document.getElementById('auth-menu');
      const mainLinks = document.getElementById('main-links');
      const userNameSpan = document.querySelector('.nav-link.dropdown-toggle span');

      const defaultAvatarUrl = '../assets/avatar.svg';

      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          authMenu.innerHTML = `
            <li><a class="dropdown-item" href="login.html"><i class="fas fa-sign-in-alt me-2"></i>Log In</a></li>
            <li><a class="dropdown-item" href="signup.html"><i class="fas fa-user-plus me-2"></i>Sign Up</a></li>
          `;
          if (avatar) avatar.src = defaultAvatarUrl;
          // Set active link for logged-out users
          return;
        }

        const user = session.user;

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, role')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          if (avatar) avatar.src = defaultAvatarUrl;
          return;
        }

        // Set name
        if (userNameSpan) {
          userNameSpan.textContent = profile.full_name || "Account";
        }

        // Set main links
        mainLinks.innerHTML = `
          <li class="nav-item"><a class="nav-link" href="home.html"><i class="fas fa-home me-2"></i>Home</a></li>
          <li class="nav-item"><a class="nav-link" href="books.html"><i class="fas fa-book me-2"></i>Books</a></li>
          <li class="nav-item"><a class="nav-link" href="audiobooks.html"><i class="fas fa-headphones me-2"></i>Audiobooks</a></li>

        `;

        if (profile.role === 'admin') {
          mainLinks.innerHTML += `
            <li class="nav-item"><a class="nav-link" href="dashboard.html"><i class="fas fa-tools me-2"></i>Dashboard</a></li>
          `;
        }

        // Auth menu with My Books badge
        authMenu.innerHTML = `
          <li><a class="dropdown-item" href="profile.html"><i class="fas fa-user me-2"></i>Profile</a></li>
          <li><hr class="dropdown-divider"></li>
          <li>
            <a class="dropdown-item d-flex justify-content-between align-items-center" href="Mybooks.html">
              <span><i class="fas fa-book me-2"></i>Mybooks</span>
              <span id="myBooksBadge" class="badge bg-danger rounded-pill ms-2 d-none">0</span>
            </a>
          </li>
          <li><hr class="dropdown-divider"></li>
          <li>
            <a class="dropdown-item d-flex justify-content-between align-items-center" href="myaudiobooks.html">
              <span><i class="fas fa-book me-2"></i>MyAudioBooks</span>
              <span id="myAudioBooksBadge" class="badge bg-danger rounded-pill ms-2 d-none">0</span>
            </a>
          </li>
          <li><hr class="dropdown-divider"></li>
             <li>
            <a class="dropdown-item d-flex justify-content-between align-items-center" href="myfavorites.html">
              <span><i class="fas fa-heart me-2"></i>MyFavorites</span>
              <span id="myFavoritesBadge" class="badge bg-danger rounded-pill ms-2 d-none">0</span>
            </a>
          </li>

          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item text-danger" href="#" id="logout-btn"><i class="fas fa-sign-out-alt me-2"></i>Logout</a></li>
        `;

        // Avatar load
        if (avatar && profile.avatar_url) {
          const { data: signedUrlData } = await supabase
            .storage
            .from('avatars')
            .createSignedUrl(profile.avatar_url, 1000);

          if (signedUrlData?.signedUrl) {
            avatar.src = signedUrlData.signedUrl;
            avatar.onerror = () => { avatar.src = defaultAvatarUrl; };
          } else {
            avatar.src = defaultAvatarUrl;
          }
        } else if (avatar) {
          avatar.src = defaultAvatarUrl;
        }

        // Book count badge
        const { count, error: countError } = await supabase
          .from('books')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (!countError) {
          const badge = document.getElementById('myBooksBadge');
          if (badge) {
            badge.textContent = count || 0;
            badge.classList.remove('d-none');
          }
        }
        // Audiobook count badge
        const { count: audioCount, error: audioCountError } = await supabase
          .from('audiobooks')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (!audioCountError) {
          const badge = document.getElementById('myAudioBooksBadge');
          if (badge) {
            badge.textContent = audioCount || 0;
            badge.classList.remove('d-none');
          }
        }

        // Favorites count badge
        const { count: favCount, error: favCountError } = await supabase
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        if (favCount !== undefined && favCount !== null && favCount >= 0) {
          const badge = document.getElementById('myFavoritesBadge');
          if (badge) {
            badge.textContent = favCount;
            badge.classList.remove('d-none');
          }
        }
        if (!favCountError) {
          const badge = document.getElementById('myFavoritesBadge');
          if (badge) {
            badge.textContent = favCount || 0;
            badge.classList.remove('d-none');
          }
        }

        // ✅ Logout confirmation using SweetAlert
        setTimeout(() => {
          const logoutBtn = document.getElementById('logout-btn');
          if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
              e.preventDefault();

              const result = await Swal.fire({
                title: 'Are you sure?',
                text: "You will be logged out.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Yes, log me out'
              });

              if (result.isConfirmed) {
                await supabase.auth.signOut();
                Swal.fire({
                  icon: 'success',
                  title: 'Logged out',
                  showConfirmButton: false,
                  timer: 1200
                }).then(() => {
                  window.location.href = 'login.html';
                });
              }
            });
          }
        }, 0);

      } catch (err) {
        console.error('Navbar load error:', err);
        if (avatar) avatar.src = defaultAvatarUrl;
      } finally {
        // This is the best place. It runs after try/catch,
        // and after all the dynamic links have been added.
        setActiveNavLink();
      }
    }, 0);
  }
}

// Load navbar and footer
includeComponent("navbar", "../components/navbar.html");
includeComponent("footer", "../components/footer.html");

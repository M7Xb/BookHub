import { supabase } from './supabaseClient.js';

(async () => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  // If no user is logged in, redirect to the login page.
  if (sessionError || !session) {
    window.location.href = 'login.html';
    return;
  }

  // Fetch the user's profile to check their role.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  // If the user is not an admin, redirect to the home page.
  if (profileError || !profile || profile.role !== 'admin') {
    window.location.href = 'home.html';
  }
})();
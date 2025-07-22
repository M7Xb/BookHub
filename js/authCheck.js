import { supabase } from './supabaseClient.js';

const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  window.location.href = 'login.html';
}

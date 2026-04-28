import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aevfqaltuiumvnzusmkg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFldmZxYWx0dWl1bXZuenVzbWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MTE0NDcsImV4cCI6MjA4MjM4NzQ0N30.R913etWevk6kBAKHwJxeZITRvxGbCr0Bkau6HGrGsVY';

// Dual storage: writes to both localStorage AND sessionStorage.
// sessionStorage is never purged by Firefox's bounce tracker protection,
// so the session survives even when localStorage gets wiped.
const storage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key) ?? sessionStorage.getItem(key);
    } catch {
      return sessionStorage.getItem(key);
    }
  },
  setItem: (key: string, value: string): void => {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
    try { sessionStorage.setItem(key, value); } catch { /* ignore */ }
  },
  removeItem: (key: string): void => {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    try { sessionStorage.removeItem(key); } catch { /* ignore */ }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
    storageKey: 'warehouse414-auth',
    storage,
  },
});

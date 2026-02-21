import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aevfqaltuiumvnzusmkg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFldmZxYWx0dWl1bXZuenVzbWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MTE0NDcsImV4cCI6MjA4MjM4NzQ0N30.R913etWevk6kBAKHwJxeZITRvxGbCr0Bkau6HGrGsVY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

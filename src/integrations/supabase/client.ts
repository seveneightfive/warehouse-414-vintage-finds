import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aevfqaltuiumvnzusmkg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFldmZxYWx0dWl1bXZuenVzbWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MTE0NDcsImV4cCI6MjA4MjM4NzQ0N30.R913etWevk6kBAKHwJxeZITRvxGbCr0Bkau6HGrGsVY';

export const SESSION_EXPIRED_MESSAGE =
  "Not saved — you're signed out on this device. Please sign in again and redo the change.";

/**
 * Safety net for admin writes.
 *
 * With Row Level Security, an UPDATE or DELETE sent without a signed-in
 * session doesn't fail — Postgres just matches zero rows and PostgREST
 * answers 204 "success". The dashboard then shows "Status updated" while
 * nothing changed. That is exactly what happened on phones whose session
 * had expired (or that opened an admin link without ever signing in).
 *
 * The public site never updates or deletes rows, so any PATCH/DELETE to the
 * REST API that only carries the anon key is refused here with a clear error,
 * which every existing `if (error) throw error` then surfaces as a toast.
 */
const guardedFetch: typeof fetch = async (input, init) => {
  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

  if ((method === 'PATCH' || method === 'DELETE') && url.includes('/rest/v1/')) {
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    const auth = headers.get('Authorization') ?? '';
    if (!auth || auth === `Bearer ${SUPABASE_ANON_KEY}`) {
      return new Response(
        JSON.stringify({ code: 'SESSION_EXPIRED', message: SESSION_EXPIRED_MESSAGE, details: null, hint: null }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }
  }

  return fetch(input, init);
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
  },
  global: { fetch: guardedFetch },
});

/** Throws a friendly error if there is no signed-in session on this device. */
export async function requireSession() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error(SESSION_EXPIRED_MESSAGE);
  return data.session;
}

/** Throws if an update/delete with `.select()` came back with no rows. */
export function assertRowsWritten<T>(rows: T[] | null | undefined, what = 'Change'): T[] {
  if (!rows || rows.length === 0) {
    throw new Error(`${what} was not saved. Refresh the page and try again — if it keeps happening, sign out and back in.`);
  }
  return rows;
}

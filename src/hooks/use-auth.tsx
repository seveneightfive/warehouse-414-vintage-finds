import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  // `loading` stays true until we know both who the user is AND whether they
  // are an admin, so route guards never redirect (or render) on a half-answer.
  const [loading, setLoading] = useState(true);
  const checkedUserId = useRef<string | null>(null);

  const checkAdmin = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    // On a transient network error keep the previous answer rather than
    // kicking a known admin out to the login screen.
    if (!error) {
      setIsAdmin(!!data);
      checkedUserId.current = userId;
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (!currentUser) {
          checkedUserId.current = null;
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        // Token refreshes fire this callback too; only re-check the role
        // when the signed-in user actually changes.
        if (checkedUserId.current === currentUser.id) {
          setLoading(false);
          return;
        }

        setLoading(true);
        // Defer any further Supabase calls out of the auth callback
        // to avoid a deadlock between the auth state lock and this query.
        setTimeout(() => {
          checkAdmin(currentUser.id).finally(() => setLoading(false));
        }, 0);
      }
    );

    // Phones freeze background tabs, so the session can quietly expire while
    // the dashboard sits open. Re-validate whenever the tab comes back.
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

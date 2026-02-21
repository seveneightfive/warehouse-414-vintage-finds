import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const AdminLogin = () => {
  const { user, isAdmin, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn } = useAuth();

  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading...</div>;
  if (user && isAdmin) return <Navigate to="/admin" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl tracking-[0.3em] uppercase text-foreground text-center mb-8">Admin</h1>
        {user && !isAdmin && (
          <p className="text-destructive text-sm text-center mb-4">You do not have admin access.</p>
        )}
        {!user && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={submitting} className="w-full text-xs tracking-[0.15em] uppercase">
              {submitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminLogin;

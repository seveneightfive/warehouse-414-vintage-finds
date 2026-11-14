import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { toE164, formatPhone } from '@/lib/phone';

type Mode = 'email' | 'phone';

const RESEND_SECONDS = 60;

const friendlyAuthError = (err: unknown, fallback: string) => {
  const msg = err instanceof Error ? err.message : '';
  if (/signups not allowed|user not found/i.test(msg)) {
    return 'No admin account is linked to that phone number.';
  }
  if (/expired|invalid/i.test(msg) && /token|otp/i.test(msg)) {
    return 'That code is invalid or has expired. Request a new one.';
  }
  if (/rate limit|too many|for security purposes/i.test(msg)) {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  return msg || fallback;
};

const AdminLogin = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Where the user was headed before being asked to sign in (e.g. a hold
  // link from an email), so they land back on it instead of the dashboard.
  const from = (location.state as { from?: string } | null)?.from;
  const returnTo = from && from.startsWith('/admin') && !from.startsWith('/admin/login') ? from : '/admin';
  const [mode, setMode] = useState<Mode>('email');
  const [submitting, setSubmitting] = useState(false);

  // Email magic link
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  // Phone OTP
  const [phoneInput, setPhoneInput] = useState('');
  const [phone, setPhone] = useState<string | null>(null); // E.164, set once code is sent
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate(returnTo, { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, returnTo]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading...</div>;
  if (user && isAdmin) return <Navigate to={returnTo} replace />;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: 'https://www.warehouse414.com/admin' },
      });
      if (error) throw error;
      setSent(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setSubmitting(false);
    }
  };

  const sendCode = async (target: string) => {
    setSubmitting(true);
    try {
      // shouldCreateUser: false — only phones already attached to an
      // existing account can sign in; random numbers can't create users.
      const { error } = await supabase.auth.signInWithOtp({
        phone: target,
        options: { shouldCreateUser: false, channel: 'sms' },
      });
      if (error) throw error;
      setPhone(target);
      setCode('');
      setCooldown(RESEND_SECONDS);
      toast.success(`Code sent to ${formatPhone(target)}`);
    } catch (err: unknown) {
      toast.error(friendlyAuthError(err, 'Failed to send code'));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = toE164(phoneInput);
    if (!normalized) {
      toast.error('Enter a valid phone number, e.g. (785) 555-1234');
      return;
    }
    await sendCode(normalized);
  };

  const verifyCode = async (token: string) => {
    if (!phone || token.length !== 6) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
      if (error) throw error;
      // onAuthStateChange handles the redirect
    } catch (err: unknown) {
      toast.error(friendlyAuthError(err, 'Could not verify code'));
      setCode('');
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setSent(false);
    setPhone(null);
    setCode('');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl tracking-[0.3em] uppercase text-foreground text-center mb-8">Admin</h1>
        {user && !isAdmin && (
          <p className="text-destructive text-sm text-center mb-4">You do not have admin access.</p>
        )}
        {!user && from && (
          <p className="text-sm text-muted-foreground text-center mb-4">
            Please sign in on this device to make changes. You'll go right back to where you were.
          </p>
        )}

        {!user && (
          <div className="grid grid-cols-2 gap-1 p-1 mb-6 rounded-md bg-muted">
            {(['email', 'phone'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`py-2 rounded text-xs tracking-[0.15em] uppercase font-display transition-colors ${
                  mode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'email' ? 'Email link' : 'Text code'}
              </button>
            ))}
          </div>
        )}

        {/* ---------- Email magic link ---------- */}
        {!user && mode === 'email' && sent && (
          <div className="text-center space-y-2">
            <p className="text-foreground text-sm">Check your email for a magic link to sign in.</p>
            <p className="text-muted-foreground text-xs">Sent to {email}</p>
            <Button variant="ghost" size="sm" className="mt-4 text-xs tracking-[0.15em] uppercase" onClick={() => setSent(false)}>
              Try a different email
            </Button>
          </div>
        )}
        {!user && mode === 'email' && !sent && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" disabled={submitting} className="w-full text-xs tracking-[0.15em] uppercase">
              {submitting ? 'Sending...' : 'Send Magic Link'}
            </Button>
          </form>
        )}

        {/* ---------- Phone OTP ---------- */}
        {!user && mode === 'phone' && !phone && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <Label>Mobile number</Label>
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(785) 555-1234"
                required
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full text-xs tracking-[0.15em] uppercase">
              {submitting ? 'Sending...' : 'Text Me a Code'}
            </Button>
          </form>
        )}
        {!user && mode === 'phone' && phone && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <p className="text-foreground text-sm">Enter the 6-digit code we texted you.</p>
              <p className="text-muted-foreground text-xs">Sent to {formatPhone(phone)}</p>
            </div>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={setCode}
                onComplete={verifyCode}
                disabled={submitting}
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              onClick={() => verifyCode(code)}
              disabled={submitting || code.length !== 6}
              className="w-full text-xs tracking-[0.15em] uppercase"
            >
              {submitting ? 'Verifying...' : 'Sign In'}
            </Button>
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" className="text-xs tracking-[0.15em] uppercase" onClick={() => setPhone(null)}>
                Change number
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs tracking-[0.15em] uppercase"
                disabled={submitting || cooldown > 0}
                onClick={() => sendCode(phone)}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLogin;

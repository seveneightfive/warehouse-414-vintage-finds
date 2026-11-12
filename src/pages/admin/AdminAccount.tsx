import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toE164, formatPhone } from '@/lib/phone';

const RESEND_SECONDS = 60;

/**
 * Lets a signed-in admin attach (or change) a mobile number on their auth user.
 * Supabase texts a code via the configured SMS provider (Twilio Verify); once verified,
 * the number can be used on the login page's "Text code" option.
 */
const AdminAccount = () => {
  const { user } = useAuth();
  const [currentPhone, setCurrentPhone] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    setCurrentPhone(user?.phone ? user.phone : null);
  }, [user]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendCode = async (target: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ phone: target });
      if (error) throw error;
      setPendingPhone(target);
      setCode('');
      setCooldown(RESEND_SECONDS);
      toast.success(`Verification code sent to ${formatPhone(target)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send code';
      toast.error(/already.*registered|exists/i.test(msg) ? 'That number is already linked to another account.' : msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = toE164(phoneInput);
    if (!normalized) {
      toast.error('Enter a valid phone number, e.g. (785) 555-1234');
      return;
    }
    if (currentPhone && normalized.replace('+', '') === currentPhone.replace('+', '')) {
      toast.info('That number is already on your account.');
      return;
    }
    await sendCode(normalized);
  };

  const verify = async (token: string) => {
    if (!pendingPhone || token.length !== 6) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone: pendingPhone, token, type: 'phone_change' });
      if (error) throw error;
      setCurrentPhone(data.user?.phone ?? pendingPhone);
      setPendingPhone(null);
      setPhoneInput('');
      setCode('');
      toast.success('Phone number verified. You can now sign in with a text code.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not verify code');
      setCode('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="font-display text-2xl tracking-wide text-foreground">Account</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage how you sign in to the dashboard.</p>
      </div>

      <section className="space-y-2">
        <h2 className="font-display text-sm tracking-[0.15em] uppercase text-muted-foreground">Email</h2>
        <p className="text-sm text-foreground">{user?.email || '—'}</p>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-sm tracking-[0.15em] uppercase text-muted-foreground">Mobile number</h2>
          <p className="text-sm text-foreground mt-2">
            {currentPhone ? formatPhone(currentPhone) : <span className="text-muted-foreground">No phone number yet</span>}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Add a mobile number to sign in with a texted one-time code instead of an email link.
          </p>
        </div>

        {!pendingPhone && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label>{currentPhone ? 'New mobile number' : 'Mobile number'}</Label>
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(785) 555-1234"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={submitting} className="text-xs tracking-[0.15em] uppercase">
              {submitting ? 'Sending...' : currentPhone ? 'Change number' : 'Add number'}
            </Button>
          </form>
        )}

        {pendingPhone && (
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              Enter the 6-digit code sent to {formatPhone(pendingPhone)}.
            </p>
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              onComplete={verify}
              disabled={submitting}
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
              </InputOTPGroup>
            </InputOTP>
            <div className="flex gap-2">
              <Button
                onClick={() => verify(code)}
                disabled={submitting || code.length !== 6}
                className="text-xs tracking-[0.15em] uppercase"
              >
                {submitting ? 'Verifying...' : 'Verify'}
              </Button>
              <Button
                variant="ghost"
                className="text-xs tracking-[0.15em] uppercase"
                disabled={submitting || cooldown > 0}
                onClick={() => sendCode(pendingPhone)}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend'}
              </Button>
              <Button
                variant="ghost"
                className="text-xs tracking-[0.15em] uppercase"
                disabled={submitting}
                onClick={() => { setPendingPhone(null); setCode(''); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminAccount;

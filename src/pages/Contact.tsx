import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  try {
    // Optional: also save to a contact_messages table
    const { error } = await supabase.functions.invoke('send-contact-email', {
      body: JSON.stringify(form),
      headers: { 'Content-Type': 'application/json' },
    });
    if (error) throw error;
    toast.success("Message sent! We'll be in touch.");
    setForm({ name: '', email: '', message: '' });
  } catch (err: unknown) {
    toast.error(err instanceof Error ? err.message : 'Something went wrong');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="container mx-auto px-4 py-16 max-w-xl">
      <h1 className="font-display text-3xl tracking-[0.3em] uppercase text-foreground mb-8">Contact</h1>
      <p className="text-muted-foreground mb-8">
        Questions about a piece? Interested in visiting? Drop us a line.
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label>Name</Label>
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label>Email</Label>
          <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <Label>Message</Label>
          <Textarea required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={5} />
        </div>
        <Button type="submit" disabled={loading} className="w-full text-xs tracking-[0.15em] uppercase">
          {loading ? 'Sending...' : 'Send Message'}
        </Button>
      </form>
    </div>
  );
};

export default Contact;

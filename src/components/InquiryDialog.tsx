import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShoppingCart, Clock, DollarSign } from 'lucide-react';

type InquiryType = 'hold' | 'offer' | 'inquiry';

interface InquiryDialogProps {
  type: InquiryType;
  productId: string;
  productTitle: string;
  triggerClassName?: string;
  triggerVariant?: 'default' | 'outline';
}

const config = {
  hold: { title: 'Place a Hold', button: 'HOLD', table: 'product_holds', icon: Clock },
  offer: { title: 'Make an Offer', button: 'MAKE OFFER', table: 'purchase_inquiries', icon: DollarSign },
  inquiry: { title: 'Purchase Inquiry', button: 'BUY', table: 'purchase_inquiries', icon: ShoppingCart },
};

export default function InquiryDialog({ type, productId, productTitle, triggerClassName, triggerVariant }: InquiryDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', amount: '' });

  const cfg = config[type];
  const Icon = cfg.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const record: Record<string, unknown> = {
        product_id: productId,
        customer_name: form.name,
        customer_email: form.email,
        customer_phone: form.phone || null,
        status: 'pending',
      };
      if (type === 'offer') { record.offer_amount = parseFloat(form.amount); record.inquiry_type = 'offer'; }
      if (type === 'inquiry') { record.inquiry_type = 'purchase'; }
      if (type === 'offer' || type === 'inquiry') record.message = form.message || null;

      const { error } = await supabase.from(cfg.table).insert(record);
      if (error) throw error;
      toast.success(`${cfg.title} submitted successfully!`);
      setForm({ name: '', email: '', phone: '', message: '', amount: '' });
      setOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant || (type === 'inquiry' ? 'default' : 'outline')} className={triggerClassName}>
          <Icon size={14} className="mr-1.5" /> {cfg.button}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wide">{cfg.title}</DialogTitle>
          <p className="text-sm text-muted-foreground">{productTitle}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Email *</Label>
            <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          {type === 'offer' && (
            <div>
              <Label>Offer Amount ($) *</Label>
              <Input required type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
          )}
          <div>
            <Label>{type === 'hold' ? 'Notes' : 'Message'}</Label>
            <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} />
          </div>
          <Button type="submit" disabled={loading} className="w-full text-xs tracking-[0.15em] uppercase">
            {loading ? 'Submitting...' : cfg.button}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

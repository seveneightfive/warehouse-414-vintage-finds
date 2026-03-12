import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DURATION_OPTIONS = [
  { value: '1', label: '1 day' },
  { value: '2', label: '2 days' },
  { value: '3', label: '3 days' },
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
];

interface PlaceHoldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  onConfirm: (data: {
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    hold_duration_hours: number;
    expires_at: string;
    notes: string;
  }) => void;
  isLoading: boolean;
}

const PlaceHoldDialog = ({ open, onOpenChange, productName, onConfirm, isLoading }: PlaceHoldDialogProps) => {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [days, setDays] = useState('3');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedDays = parseInt(days);
    onConfirm({
      customer_name: customerName.trim() || 'Internal Hold',
      customer_email: customerEmail.trim() || 'internal@warehouse414.com',
      customer_phone: customerPhone.trim(),
      hold_duration_hours: selectedDays * 24,
      expires_at: new Date(Date.now() + selectedDays * 24 * 60 * 60 * 1000).toISOString(),
      notes: notes.trim(),
    });
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setDays('3');
    setNotes('');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg tracking-wide">Place Hold</DialogTitle>
          <p className="text-sm text-muted-foreground">{productName}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="hold-name">Customer Name</Label>
            <Input
              id="hold-name"
              placeholder="Optional — defaults to 'Internal Hold'"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              maxLength={100}
            />
          </div>
          <div>
            <Label htmlFor="hold-email">Customer Email</Label>
            <Input
              id="hold-email"
              type="email"
              placeholder="Optional"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              maxLength={255}
            />
          </div>
          <div>
            <Label htmlFor="hold-phone">Customer Phone</Label>
            <Input
              id="hold-phone"
              placeholder="Optional"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              maxLength={30}
            />
          </div>
          <div>
            <Label>Hold Duration</Label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="hold-notes">Notes</Label>
            <Textarea
              id="hold-notes"
              placeholder="Optional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Placing...' : 'Place Hold'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PlaceHoldDialog;

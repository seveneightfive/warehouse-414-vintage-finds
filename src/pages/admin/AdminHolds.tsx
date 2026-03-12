import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Clock, Unlock, CalendarPlus } from 'lucide-react';

const EXTEND_OPTIONS = [
  { value: '1', label: '1 day' },
  { value: '2', label: '2 days' },
  { value: '3', label: '3 days' },
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
];

const AdminHolds = () => {
  const queryClient = useQueryClient();
  const [extendHold, setExtendHold] = useState<{ id: string; expires_at: string; hold_duration_hours: number } | null>(null);
  const [extendDays, setExtendDays] = useState('3');

  const { data: heldProducts, isLoading } = useQuery({
    queryKey: ['admin-holds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, sku, status, featured_image_url, price,
          product_holds(
            id, customer_name, customer_email, customer_phone,
            hold_duration_hours, created_at, expires_at, notes
          )
        `)
        .eq('status', 'on_hold')
        .order('name');
      if (error) throw error;
      // For each product, pick the most recent hold
      return (data ?? []).map((p: any) => {
        const holds = p.product_holds ?? [];
        const latestHold = holds.sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0] ?? null;
        return { ...p, hold: latestHold };
      });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.from('products').update({ status: 'available' }).eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-holds'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Hold released');
    },
    onError: () => toast.error('Failed to release hold'),
  });

  const extendMutation = useMutation({
    mutationFn: async ({ holdId, newExpiresAt, newDurationHours }: { holdId: string; newExpiresAt: string; newDurationHours: number }) => {
      const { error } = await supabase
        .from('product_holds')
        .update({ expires_at: newExpiresAt, hold_duration_hours: newDurationHours })
        .eq('id', holdId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-holds'] });
      toast.success('Hold extended');
      setExtendHold(null);
    },
    onError: () => toast.error('Failed to extend hold'),
  });

  const handleExtend = () => {
    if (!extendHold) return;
    const days = parseInt(extendDays);
    const currentExpiry = new Date(extendHold.expires_at).getTime();
    const newExpiresAt = new Date(currentExpiry + days * 24 * 60 * 60 * 1000).toISOString();
    const newDurationHours = (extendHold.hold_duration_hours || 0) + days * 24;
    extendMutation.mutate({ holdId: extendHold.id, newExpiresAt, newDurationHours });
  };

  const isExpiringSoon = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock size={20} className="text-primary" />
        <h1 className="text-xl font-display tracking-wide">Active Holds</h1>
        {heldProducts && <span className="text-sm text-muted-foreground">({heldProducts.length})</span>}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : !holds?.length ? (
        <p className="text-muted-foreground text-sm">No active holds.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Image</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Placed</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holds.map((h: any) => (
              <TableRow key={h.id}>
                <TableCell>
                  {h.products?.featured_image_url ? (
                    <img
                      src={h.products.featured_image_url}
                      alt={h.products.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded" />
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">
                  {h.products?.sku || '—'}
                </TableCell>
                <TableCell className="font-medium text-sm">{h.products?.name || '—'}</TableCell>
                <TableCell className={`text-sm ${h.customer_name === 'Internal Hold' ? 'text-muted-foreground italic' : ''}`}>
                  {h.customer_name}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{h.customer_email}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{h.customer_phone || '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(h.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className={`text-xs font-medium ${isExpiringSoon(h.expires_at) ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {h.expires_at ? new Date(h.expires_at).toLocaleDateString() : '—'}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setExtendDays('3'); setExtendHold({ id: h.id, expires_at: h.expires_at, hold_duration_hours: h.hold_duration_hours || 0 }); }}
                    title="Extend Hold"
                  >
                    <CalendarPlus size={14} className="mr-1" /> Extend
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => releaseMutation.mutate(h.products?.id)}
                    disabled={releaseMutation.isPending}
                    title="Release Hold"
                  >
                    <Unlock size={14} className="mr-1" /> Release
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Extend Hold Modal */}
      <Dialog open={!!extendHold} onOpenChange={(open) => { if (!open) setExtendHold(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg tracking-wide">Extend Hold</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Add days</Label>
            <Select value={extendDays} onValueChange={setExtendDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXTEND_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {extendHold && (
              <p className="text-xs text-muted-foreground">
                New expiry: {new Date(new Date(extendHold.expires_at).getTime() + parseInt(extendDays) * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendHold(null)}>Cancel</Button>
            <Button onClick={handleExtend} disabled={extendMutation.isPending}>
              {extendMutation.isPending ? 'Extending...' : 'Extend'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminHolds;

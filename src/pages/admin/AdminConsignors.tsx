import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Eye, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

type ConsignorStats = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  consignor_code: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  total_products: number;
  available_products: number;
  sold_products: number;
};

type ConsignorForm = {
  first_name: string;
  last_name: string;
  consignor_code: string;
  email: string;
  phone: string;
  notes: string;
};

const emptyForm: ConsignorForm = {
  first_name: '',
  last_name: '',
  consignor_code: '',
  email: '',
  phone: '',
  notes: '',
};

const AdminConsignors = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ConsignorForm>(emptyForm);

  const { data: consignors, isLoading, refetch: fetchConsignors } = useQuery({
    queryKey: ['admin-consignors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consignors_with_stats' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as any[]) as ConsignorStats[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: ConsignorForm & { id?: string }) => {
      const payload = {
        first_name: values.first_name || null,
        last_name: values.last_name || null,
        consignor_code: values.consignor_code.toUpperCase(),
        email: values.email || null,
        phone: values.phone || null,
        notes: values.notes || null,
      };
      if (values.id) {
        const { error } = await supabase.from('consignors' as any).update(payload).eq('id', values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('consignors' as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-consignors'] });
      toast.success(editId ? 'Consignor updated' : 'Consignor added');
      closeModal();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (c: ConsignorStats) => {
    setEditId(c.id);
    setForm({
      first_name: c.first_name || '',
      last_name: c.last_name || '',
      consignor_code: c.consignor_code,
      email: c.email || '',
      phone: c.phone || '',
      notes: c.notes || '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.consignor_code.trim()) {
      toast.error('Consignor code is required');
      return;
    }
    upsertMutation.mutate({ ...form, id: editId ?? undefined });
  };

  const filtered = consignors?.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
    return (
      name.includes(q) ||
      c.consignor_code.toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-display tracking-tight">Consignors</h1>
        <Button onClick={openAdd} size="sm">
          <Plus size={16} className="mr-1" /> Add Consignor
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, code, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Products</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered && filtered.length > 0 ? (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{c.consignor_code}</TableCell>
                    <TableCell className="text-sm">{c.email || '—'}</TableCell>
                    <TableCell className="text-sm">{c.phone || '—'}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{c.notes || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">
                          {c.total_products} total
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {c.available_products} avail
                        </Badge>
                        <Badge variant="default" className="text-[10px]">
                          {c.sold_products} sold
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Edit">
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/admin/products?sku=${c.consignor_code}`)}
                          title="View Products"
                        >
                          <Eye size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No consignors found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Consignor' : 'Add Consignor'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>First Name</Label>
                <Input value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Last Name</Label>
                <Input value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Consignor Code *</Label>
              <Input
                value={form.consignor_code}
                onChange={(e) => setForm((f) => ({ ...f, consignor_code: e.target.value.toUpperCase() }))}
                className="font-mono uppercase"
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminConsignors;

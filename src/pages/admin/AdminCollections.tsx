import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type CollectionRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  'cover-image': string | null;
  display_order: number | null;
  is_active: boolean | null;
  product_count: number;
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const AdminCollections = () => {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [editId, setEditId] = useState<string | null>(null);

  const { data: collections, isLoading } = useQuery<CollectionRow[]>({
    queryKey: ['admin-collections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select('*, collection_products(id)')
        .order('display_order', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []).map((c: any) => ({
        ...c,
        product_count: c.collection_products?.length ?? 0,
      }));
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const row: any = {
        name: payload.name,
        slug: payload.slug || slugify(payload.name),
        description: payload.description || null,
        'cover-image': payload.cover_image || null,
        display_order: payload.display_order ? Number(payload.display_order) : null,
        is_active: payload.is_active ?? true,
      };
      if (payload.id) {
        const { error } = await supabase.from('collections').update(row).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('collections').insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-collections'] });
      toast.success(editId ? 'Collection updated' : 'Collection added');
      closeModal();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('collections').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-collections'] });
      toast.success('Collection deleted');
    },
    onError: (err) => toast.error(err.message),
  });

  const openNew = () => {
    setEditId(null);
    setForm({ is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (c: CollectionRow) => {
    setEditId(c.id);
    setForm({
      name: c.name,
      slug: c.slug || '',
      description: c.description || '',
      cover_image: c['cover-image'] || '',
      display_order: c.display_order ?? '',
      is_active: c.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const closeModal = () => {
    setDialogOpen(false);
    setEditId(null);
    setForm({});
  };

  const handleNameChange = (name: string) => {
    const updates: any = { ...form, name };
    if (!editId) updates.slug = slugify(name);
    setForm(updates);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl tracking-wide text-foreground">Collections</h1>
        <Button onClick={openNew} className="text-xs tracking-[0.1em] uppercase">
          <Plus size={14} className="mr-1" /> Add Collection
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wide">
              {editId ? 'Edit Collection' : 'New Collection'}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              upsertMutation.mutate({ ...form, ...(editId ? { id: editId } : {}) });
            }}
            className="space-y-4"
          >
            <div>
              <Label>Name *</Label>
              <Input required value={form.name || ''} onChange={(e) => handleNameChange(e.target.value)} />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={form.slug || ''} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={3} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Cover Image URL</Label>
              <Input value={form.cover_image || ''} onChange={(e) => setForm({ ...form, cover_image: e.target.value })} />
            </div>
            <div>
              <Label>Display Order</Label>
              <Input type="number" value={form.display_order ?? ''} onChange={(e) => setForm({ ...form, display_order: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active ?? true} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>
            <Button type="submit" disabled={upsertMutation.isPending} className="w-full text-xs tracking-[0.1em] uppercase">
              {upsertMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-16">Active</TableHead>
              <TableHead className="w-16">Order</TableHead>
              <TableHead className="w-20">Products</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collections?.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  {c['cover-image'] ? (
                    <img src={c['cover-image']} alt="" className="w-12 h-12 object-cover rounded" />
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded" />
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  <Link to={`/admin/collections/${c.id}`} className="hover:underline text-foreground">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">{c.slug || '—'}</TableCell>
                <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{c.description || '—'}</TableCell>
                <TableCell>{c.is_active ? '✓' : '—'}</TableCell>
                <TableCell>{c.display_order ?? '—'}</TableCell>
                <TableCell>{c.product_count}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      if (confirm('Delete this collection?')) deleteMutation.mutate(c.id);
                    }}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default AdminCollections;

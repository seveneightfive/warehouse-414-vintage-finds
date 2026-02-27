import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

type AdminCrudListProps = {
  title: string;
  tableName: string;
  columns?: { key: string; label: string }[];
};

const AdminCrudList = ({ title, tableName, columns = [{ key: 'name', label: 'Name' }] }: AdminCrudListProps) => {
  const queryClient = useQueryClient();
  const [editItem, setEditItem] = useState<Record<string, string> | null>(null);
  const [newItem, setNewItem] = useState<Record<string, string>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: items, isLoading } = useQuery({
    queryKey: [tableName],
    queryFn: async () => {
      const { data, error } = await supabase.from(tableName).select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (item: Record<string, string>) => {
      if (item.id) {
        const { error } = await supabase.from(tableName).update(item).eq('id', item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(tableName).insert(item);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      toast.success('Saved');
      setDialogOpen(false);
      setEditItem(null);
      setNewItem({});
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      toast.success('Deleted');
    },
    onError: (err) => toast.error(err.message),
  });

  const openNew = () => {
    setEditItem(null);
    setNewItem({});
    setDialogOpen(true);
  };

  const openEdit = (item: Record<string, string>) => {
    setEditItem(item);
    setNewItem({});
    setDialogOpen(true);
  };

  const currentValues = editItem || newItem;
  const setCurrentValues = (vals: Record<string, string>) => {
    if (editItem) setEditItem(vals);
    else setNewItem(vals);
  };

  const filtered = items?.filter((item: Record<string, string>) =>
    !search || columns.some((col) => item[col.key]?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl tracking-wide text-foreground">{title}</h1>
        <Button onClick={openNew} className="text-xs tracking-[0.1em] uppercase">
          <Plus size={14} className="mr-1" /> Add
        </Button>
      </div>
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Filter ${title.toLowerCase()}…`}
          className="pl-9 max-w-sm"
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wide">
              {editItem ? `Edit ${title.slice(0, -1)}` : `New ${title.slice(0, -1)}`}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const payload = { ...currentValues };
              if (editItem?.id) payload.id = editItem.id;
              upsertMutation.mutate(payload);
            }}
            className="space-y-4"
          >
            {columns.map((col) => (
              <div key={col.key}>
                <Label>{col.label}</Label>
                <Input
                  required
                  value={currentValues[col.key] || ''}
                  onChange={(e) => setCurrentValues({ ...currentValues, [col.key]: e.target.value })}
                />
              </div>
            ))}
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
              {columns.map((col) => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered?.map((item: Record<string, string>) => (
              <TableRow key={item.id}>
                {columns.map((col) => (
                  <TableCell key={col.key}>{item[col.key] || '—'}</TableCell>
                ))}
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      if (confirm('Delete?')) deleteMutation.mutate(item.id);
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

export default AdminCrudList;

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

type Column = { key: string; label: string; type?: 'text' | 'textarea' };
type StatColumn = { key: string; label: string };

type AdminCrudListProps = {
  title: string;
  /** Table to write to (insert/update/delete). Always the base table. */
  tableName: string;
  /** Optional view to read from (must include `id`). Falls back to tableName. */
  viewName?: string;
  /** Editable columns shown in the dialog and written to tableName. */
  columns?: Column[];
  /** Read-only stat columns sourced from the view. */
  statColumns?: StatColumn[];
  /** Sort column for the read query. Defaults to 'name'. */
  defaultSort?: string | null;
  /** Extra column keys to include in search beyond `columns`. */
  extraSearchKeys?: string[];

  // ---- legacy props (kept for backwards compat with routes that don't yet use a stats view) ----
  /** Foreign key column on products table (e.g. "designer_id"). Adds a Products count column. */
  productFk?: string;
  /** Junction table for many-to-many counting (e.g. "product_makers"). */
  productJunction?: string;
};

const AdminCrudList = ({
  title,
  tableName,
  viewName,
  columns = [{ key: 'name', label: 'Name' }],
  statColumns,
  defaultSort = 'name',
  extraSearchKeys = [],
  productFk,
  productJunction,
}: AdminCrudListProps) => {
  const queryClient = useQueryClient();
  const readSource = viewName ?? tableName;

  const [editItem, setEditItem] = useState<Record<string, any> | null>(null);
  const [newItem, setNewItem] = useState<Record<string, any>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setSearchQuery('');
  }, [readSource]);

  const { data: items, isLoading } = useQuery({
    queryKey: [readSource],
    queryFn: async () => {
      let q = supabase.from(readSource).select('*');
      if (defaultSort) q = q.order(defaultSort);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  // Legacy product-count query (only runs when productFk is set AND no stats view is being used)
  const { data: productCounts } = useQuery({
    queryKey: [tableName, 'product-counts', productJunction],
    queryFn: async () => {
      if (!productFk || !items?.length) return {};
      const ids = items.map((i: any) => i.id);

      if (productJunction) {
        const { data, error } = await supabase
          .from(productJunction)
          .select(`product_id, ${productFk}`)
          .in(productFk, ids);
        if (error) throw error;
        const seen: Record<string, Set<string>> = {};
        data?.forEach((row: any) => {
          const fk = row[productFk];
          if (!fk) return;
          (seen[fk] ||= new Set()).add(row.product_id);
        });
        const counts: Record<string, number> = {};
        Object.entries(seen).forEach(([k, v]) => { counts[k] = v.size; });
        return counts;
      }

      const { data, error } = await supabase
        .from('products')
        .select(`id, ${productFk}`)
        .in(productFk, ids);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((p: any) => {
        const fkVal = p[productFk];
        if (fkVal) counts[fkVal] = (counts[fkVal] || 0) + 1;
      });
      return counts;
    },
    enabled: !!productFk && !!items?.length && !statColumns,
  });

  const upsertMutation = useMutation({
    mutationFn: async (item: Record<string, any>) => {
      // Only persist editable fields — never push view-only stat columns to the table
      const editableKeys = new Set(columns.map((c) => c.key));
      const payload: Record<string, any> = {};
      for (const k of Object.keys(item)) {
        if (editableKeys.has(k)) payload[k] = item[k];
      }

      if (item.id) {
        const { error } = await supabase.from(tableName).update(payload).eq('id', item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(tableName).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [readSource] });
      toast.success('Saved');
      setDialogOpen(false);
      setEditItem(null);
      setNewItem({});
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [readSource] });
      toast.success('Deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openNew = () => {
    setEditItem(null);
    setNewItem({});
    setDialogOpen(true);
  };

  const openEdit = (item: Record<string, any>) => {
    setEditItem(item);
    setNewItem({});
    setDialogOpen(true);
  };

  const currentValues = editItem || newItem;
  const setCurrentValues = (vals: Record<string, any>) => {
    if (editItem) setEditItem(vals);
    else setNewItem(vals);
  };

  const formatStat = (val: any) => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'number') return val.toLocaleString();
    return String(val);
  };

  const searchKeys = [...columns.map((c) => c.key), ...extraSearchKeys];

  const filteredItems = items?.filter((item: Record<string, any>) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return searchKeys.some((k) => String(item[k] ?? '').toLowerCase().includes(q));
  });

  const showLegacyProductsColumn = !!productFk && !statColumns;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl tracking-wide text-foreground">{title}</h1>
        <Button onClick={openNew} className="text-xs tracking-[0.1em] uppercase">
          <Plus size={14} className="mr-1" /> Add
        </Button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
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
                {col.type === 'textarea' ? (
                  <Textarea
                    rows={8}
                    value={currentValues[col.key] || ''}
                    onChange={(e) => setCurrentValues({ ...currentValues, [col.key]: e.target.value })}
                  />
                ) : (
                  <Input
                    required
                    value={currentValues[col.key] || ''}
                    onChange={(e) => setCurrentValues({ ...currentValues, [col.key]: e.target.value })}
                  />
                )}
              </div>
            ))}
            <Button
              type="submit"
              disabled={upsertMutation.isPending}
              className="w-full text-xs tracking-[0.1em] uppercase"
            >
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
              {statColumns?.map((col) => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}
              {showLegacyProductsColumn && <TableHead>Products</TableHead>}
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems?.map((item: Record<string, any>) => (
              <TableRow key={item.id}>
                {columns.map((col) => (
                  <TableCell key={col.key}>{item[col.key] || '—'}</TableCell>
                ))}
                {statColumns?.map((col) => (
                  <TableCell key={col.key} className="text-muted-foreground tabular-nums">
                    {formatStat(item[col.key])}
                  </TableCell>
                ))}
                {showLegacyProductsColumn && (
                  <TableCell className="text-muted-foreground tabular-nums">
                    {productCounts?.[item.id] ?? 0}
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Delete?')) deleteMutation.mutate(item.id);
                      }}
                    >
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

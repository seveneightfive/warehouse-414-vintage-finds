import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Trash2, GripVertical, Search, Plus } from 'lucide-react';
import { toast } from 'sonner';

type CuratedSetProductRow = {
  id: string;
  curated_set_id: string;
  product_id: string;
  display_order: number | null;
  product: {
    id: string;
    name: string;
    sku: string | null;
    status: string;
    featured_image_url: string | null;
  };
};

const AdminCollectionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const { data: curatedSet } = useQuery({
    queryKey: ['admin-curated-set', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('curated_sets').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: products, isLoading } = useQuery<CuratedSetProductRow[]>({
    queryKey: ['admin-curated-set-products', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curated_set_products')
        .select('*, product:products(id, name, sku, status, featured_image_url)')
        .eq('curated_set_id', id!)
        .order('display_order', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as CuratedSetProductRow[];
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (cpId: string) => {
      const { error } = await supabase.from('curated_set_products').delete().eq('id', cpId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-curated-set-products', id] });
      toast.success('Product removed');
    },
    onError: (err) => toast.error(err.message),
  });

  const addMutation = useMutation({
    mutationFn: async (productId: string) => {
      const nextOrder = (products?.length ?? 0);
      const { error } = await supabase.from('curated_set_products').insert({
        curated_set_id: id!,
        product_id: productId,
        display_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-curated-set-products', id] });
      setSearchResults([]);
      setSearchQuery('');
      toast.success('Product added');
    },
    onError: (err) => toast.error(err.message),
  });

  const searchProducts = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from('products')
      .select('id, name, sku, featured_image_url')
      .or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
      .limit(10);
    const existingIds = new Set(products?.map(p => p.product_id) ?? []);
    setSearchResults((data ?? []).filter(p => !existingIds.has(p.id)));
    setSearching(false);
  }, [products]);

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDrop = async (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx || !products) return;
    const reordered = [...products];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    setDragIdx(null);

    qc.setQueryData(['admin-curated-set-products', id], reordered);

    const updates = reordered.map((cp, i) =>
      supabase.from('curated_set_products').update({ display_order: i }).eq('id', cp.id)
    );
    await Promise.all(updates);
    qc.invalidateQueries({ queryKey: ['admin-curated-set-products', id] });
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/curated-sets">
          <Button variant="ghost" size="icon"><ArrowLeft size={18} /></Button>
        </Link>
        <div>
          <h1 className="font-display text-2xl tracking-wide text-foreground">
            {curatedSet?.name ?? 'Curated Set'}
          </h1>
          {curatedSet?.description && (
            <p className="text-sm text-muted-foreground mt-1">{curatedSet.description}</p>
          )}
        </div>
      </div>

      <div className="mb-6">
        <Label className="text-sm font-medium mb-2 block">Add Products</Label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or SKU..."
            value={searchQuery}
            onChange={(e) => searchProducts(e.target.value)}
            className="pl-9"
          />
        </div>
        {searchResults.length > 0 && (
          <div className="border border-border rounded-md mt-1 bg-card max-h-60 overflow-y-auto">
            {searchResults.map((p) => (
              <button
                key={p.id}
                onClick={() => addMutation.mutate(p.id)}
                className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-muted transition-colors text-sm"
              >
                {p.featured_image_url ? (
                  <img src={p.featured_image_url} alt="" className="w-8 h-8 object-cover rounded" />
                ) : (
                  <div className="w-8 h-8 bg-muted rounded" />
                )}
                <span className="flex-1 text-foreground">{p.name}</span>
                <span className="text-muted-foreground text-xs">{p.sku || ''}</span>
                <Plus size={14} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
        {searching && <p className="text-xs text-muted-foreground mt-1">Searching...</p>}
      </div>

      <h2 className="font-display text-lg tracking-wide text-foreground mb-3">
        Products ({products?.length ?? 0})
      </h2>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !products?.length ? (
        <p className="text-muted-foreground text-sm">No products in this curated set yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead className="w-16">Image</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((cp, idx) => (
              <TableRow
                key={cp.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(idx)}
                className={dragIdx === idx ? 'opacity-50' : ''}
              >
                <TableCell>
                  <GripVertical size={14} className="text-muted-foreground cursor-grab" />
                </TableCell>
                <TableCell>
                  {cp.product?.featured_image_url ? (
                    <img src={cp.product.featured_image_url} alt="" className="w-10 h-10 object-cover rounded" />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded" />
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{cp.product?.sku || '—'}</TableCell>
                <TableCell className="font-medium text-foreground">{cp.product?.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground capitalize">{cp.product?.status}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => {
                    if (confirm('Remove from curated set?')) removeMutation.mutate(cp.id);
                  }}>
                    <Trash2 size={14} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={className} {...props} />
);

export default AdminCollectionDetail;

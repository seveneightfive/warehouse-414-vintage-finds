import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { Pencil, Eye, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/types/database';

const AdminProducts = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, designer:designers(name), category:categories(name), product_images(image_url, sort_order)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Product deleted');
    },
    onError: (err) => toast.error(err.message),
  });

  const statusColor = (s: string) => {
    switch (s) {
      case 'available': return 'default';
      case 'on_hold': return 'secondary';
      case 'sold': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl tracking-wide text-foreground">Products</h1>
        <Link to="/admin/products/new">
          <Button className="text-xs tracking-[0.1em] uppercase">Add Product</Button>
        </Link>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Designer</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products?.filter((p) => {
              if (!searchQuery) return true;
              const q = searchQuery.toLowerCase();
              return [p.name, p.designer?.name, p.category?.name, p.status]
                .some(v => v && v.toLowerCase().includes(q));
            }).map((p) => {
              const thumb = p.product_images?.sort((a, b) => a.sort_order - b.sort_order)?.[0];
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    {thumb ? (
                      <img src={thumb.image_url} alt="" className="w-12 h-12 rounded-sm object-cover" />
                    ) : p.featured_image_url ? (
                      <img src={p.featured_image_url} alt="" className="w-12 h-12 rounded-sm object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-sm bg-muted" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.designer?.name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{p.category?.name || '—'}</TableCell>
                  <TableCell><Badge variant={statusColor(p.status)}>{p.status}</Badge></TableCell>
                  <TableCell>{p.price ? `$${p.price.toLocaleString()}` : '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Link to={`/product/${p.id}`}><Button variant="ghost" size="icon"><Eye size={14} /></Button></Link>
                      <Link to={`/admin/products/${p.id}`}><Button variant="ghost" size="icon"><Pencil size={14} /></Button></Link>
                      <Button variant="ghost" size="icon" onClick={() => {
                        if (confirm('Delete this product?')) deleteMutation.mutate(p.id);
                      }}><Trash2 size={14} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default AdminProducts;

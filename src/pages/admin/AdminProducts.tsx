import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Link } from 'react-router-dom';
import { Pencil, Eye, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/types/database';

const PAGE_SIZE = 25;

const AdminProducts = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, searchQuery],
    queryFn: async () => {
      let countQuery = supabase.from('products').select('*', { count: 'exact', head: true });
      if (searchQuery) countQuery = countQuery.or(`name.ilike.%${searchQuery}%`);

      let query = supabase
        .from('products')
        .select('*, designer:designers(name), category:categories(name), product_images(image_url, sort_order)')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (searchQuery) query = query.or(`name.ilike.%${searchQuery}%`);

      const [{ count }, { data: products, error }] = await Promise.all([countQuery, query]);
      if (error) throw error;
      return { products: products as Product[], total: count ?? 0 };
    },
  });

  const products = data?.products;
  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

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

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(0);
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
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
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
              {products?.map((p) => {
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages} ({data?.total} products)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft size={14} className="mr-1" /> Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  Next <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminProducts;

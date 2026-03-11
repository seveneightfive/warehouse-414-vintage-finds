import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Link } from 'react-router-dom';
import { Pencil, Eye, Trash2, Search, ChevronLeft, ChevronRight, CircleDollarSign } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/types/database';
import MarkSoldDialog from '@/components/MarkSoldDialog';

const PAGE_SIZE = 25;

const AdminProducts = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [soldProduct, setSoldProduct] = useState<Product | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, searchQuery, statusFilter],
    queryFn: async () => {
      let countQuery = supabase.from('products').select('*', { count: 'exact', head: true });
      if (searchQuery) countQuery = countQuery.or(`name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`);
      if (statusFilter !== 'all') countQuery = countQuery.eq('status', statusFilter);

      let query = supabase
        .from('products')
        .select('*, product_images(image_url, sort_order)')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (searchQuery) query = query.or(`name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);

      const [{ count }, { data: products, error }] = await Promise.all([countQuery, query]);
      if (error) throw error;

      // Fetch holds for on_hold filter
      let holdsMap: Record<string, string> = {};
      if (statusFilter === 'on_hold' && products && products.length > 0) {
        const productIds = products.map((p: any) => p.id);
        const { data: holds } = await supabase
          .from('product_holds')
          .select('product_id, expires_at')
          .in('product_id', productIds)
          .eq('status', 'approved');
        if (holds) {
          holds.forEach((h: any) => { holdsMap[h.product_id] = h.expires_at; });
        }
      }

      return { products: products as Product[], total: count ?? 0, holdsMap };
    },
  });

  const products = data?.products;
  const holdsMap = data?.holdsMap ?? {};
  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);
  const showStatus = statusFilter === 'all';
  const showExpires = statusFilter === 'on_hold';
  const showSoldDetails = statusFilter === 'sold';

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

  const markSoldMutation = useMutation({
    mutationFn: async ({ id, sale_price, sale_platform, sale_date }: { id: string; sale_price: number | null; sale_platform: string; sale_date: string }) => {
      const { error } = await supabase.from('products').update({ status: 'sold' as const, sale_price, sale_platform, sale_date }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Product marked as sold');
      setSoldProduct(null);
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

  const handleStatusFilter = (value: string) => {
    if (value) {
      setStatusFilter(value);
      setPage(0);
    }
  };

  return (
    <>
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

        <div className="mb-4">
          <ToggleGroup type="single" value={statusFilter} onValueChange={handleStatusFilter} className="justify-start flex-wrap">
            <ToggleGroupItem value="all" className="text-xs tracking-wider uppercase px-3">All {statusCounts?.all != null && <span className="ml-1 text-muted-foreground">({statusCounts.all})</span>}</ToggleGroupItem>
            <ToggleGroupItem value="available" className="text-xs tracking-wider uppercase px-3">Available {statusCounts?.available != null && <span className="ml-1 text-muted-foreground">({statusCounts.available})</span>}</ToggleGroupItem>
            <ToggleGroupItem value="on_hold" className="text-xs tracking-wider uppercase px-3">On Hold {statusCounts?.on_hold != null && <span className="ml-1 text-muted-foreground">({statusCounts.on_hold})</span>}</ToggleGroupItem>
            <ToggleGroupItem value="sold" className="text-xs tracking-wider uppercase px-3">Sold {statusCounts?.sold != null && <span className="ml-1 text-muted-foreground">({statusCounts.sold})</span>}</ToggleGroupItem>
            <ToggleGroupItem value="inventory" className="text-xs tracking-wider uppercase px-3">Inventory {statusCounts?.inventory != null && <span className="ml-1 text-muted-foreground">({statusCounts.inventory})</span>}</ToggleGroupItem>
          </ToggleGroup>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Title</TableHead>
                  {showStatus && <TableHead>Status</TableHead>}
                  {showExpires && <TableHead>Expires</TableHead>}
                  {showSoldDetails && <TableHead>Sale Price</TableHead>}
                  {showSoldDetails && <TableHead>Platform</TableHead>}
                  {showSoldDetails && <TableHead>Sale Date</TableHead>}
                  {!showSoldDetails && <TableHead>Price</TableHead>}
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
                      <TableCell className="text-muted-foreground text-xs">{p.sku || '—'}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      {showStatus && <TableCell><Badge variant={statusColor(p.status)}>{p.status}</Badge></TableCell>}
                      {showExpires && (
                        <TableCell className="text-muted-foreground text-xs">
                          {holdsMap[p.id] ? new Date(holdsMap[p.id]).toLocaleDateString() : ''}
                        </TableCell>
                      )}
                      {showSoldDetails && (
                        <TableCell className="text-sm">{p.sale_price ? `$${p.sale_price.toLocaleString()}` : '—'}</TableCell>
                      )}
                      {showSoldDetails && (
                        <TableCell className="text-sm text-muted-foreground">{p.sale_platform || '—'}</TableCell>
                      )}
                      {showSoldDetails && (
                        <TableCell className="text-sm text-muted-foreground">{p.sale_date ? new Date(p.sale_date).toLocaleDateString() : '—'}</TableCell>
                      )}
                      {!showSoldDetails && (
                        <TableCell>
                          <div>{p.price ? `$${p.price.toLocaleString()}` : '—'}</div>
                          {p.sale_price && (
                            <div className="text-xs text-destructive">${p.sale_price.toLocaleString()}</div>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex gap-1">
                          <Link to={`/product/${p.id}`}><Button variant="ghost" size="icon"><Eye size={14} /></Button></Link>
                          <Link to={`/admin/products/${p.id}`}><Button variant="ghost" size="icon"><Pencil size={14} /></Button></Link>
                          {p.status !== 'sold' && (
                            <Button variant="ghost" size="icon" onClick={() => setSoldProduct(p)} title="Mark as sold">
                              <CircleDollarSign size={14} />
                            </Button>
                          )}
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

      <MarkSoldDialog
        open={!!soldProduct}
        onOpenChange={(open) => !open && setSoldProduct(null)}
        productName={soldProduct?.name ?? ''}
        currentPrice={soldProduct?.price ?? null}
        onConfirm={(saleData) => {
          if (soldProduct) markSoldMutation.mutate({ id: soldProduct.id, ...saleData });
        }}
        isLoading={markSoldMutation.isPending}
      />
    </>
  );
};

export default AdminProducts;

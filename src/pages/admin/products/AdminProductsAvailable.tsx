import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import {
  Search, ChevronLeft, ChevronRight, MoreVertical,
  Eye, Pencil, Clock, CircleDollarSign, Trash2, LinkIcon, Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/types/database';
import { useState } from 'react';
import MarkSoldDialog from '@/components/MarkSoldDialog';
import AdminPlaceHoldDialog from '@/components/AdminPlaceHoldDialog';

const PAGE_SIZE = 25;

type ExternalLinksState = {
  firstdibs_url: string;
  chairish_url: string;
  ebay_url: string;
};

const AdminProductsAvailable = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [soldProduct, setSoldProduct] = useState<Product | null>(null);
  const [holdProduct, setHoldProduct] = useState<Product | null>(null);
  const [changeStatusProduct, setChangeStatusProduct] = useState<Product | null>(null);
  const [pendingStatus, setPendingStatus] = useState('');
  const [linksProduct, setLinksProduct] = useState<Product | null>(null);
  const [linksState, setLinksState] = useState<ExternalLinksState>({ firstdibs_url: '', chairish_url: '', ebay_url: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products-available', page, searchQuery],
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      let countQ = supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'available');
      if (searchQuery) countQ = countQ.or(`name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`);

      let q = supabase
        .from('products')
        .select('*, product_images(image_url, sort_order)')
        .eq('status', 'available')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (searchQuery) q = q.or(`name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`);

      const [{ count }, { data: products, error }] = await Promise.all([countQ, q]);
      if (error) throw error;
      return { products: products as Product[], total: count ?? 0 };
    },
  });

  const products = data?.products ?? [];
  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-products-available'] });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Product deleted'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const markSoldMutation = useMutation({
    mutationFn: async ({ id, sold_price, sale_platform, sale_date }: { id: string; sold_price: number | null; sale_platform: string; sale_date: string }) => {
      const { error } = await supabase.from('products').update({ status: 'sold', sold_price, sale_platform, sale_date } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Marked as sold'); setSoldProduct(null); },
    onError: (err: Error) => toast.error(err.message),
  });

  const placeHoldMutation = useMutation({
    mutationFn: async ({ product_id, customer_name, customer_email, customer_phone, hold_duration_hours, expires_at, notes, platform }: {
      product_id: string; customer_name: string; customer_email: string; customer_phone: string;
      hold_duration_hours: number; expires_at: string; notes: string; platform: string;
    }) => {
      const { error: hErr } = await supabase.from('product_holds').insert({ product_id, customer_name, customer_email, customer_phone: customer_phone || null, hold_duration_hours, expires_at, notes: notes || null, platform });
      if (hErr) throw hErr;
      const { error: pErr } = await supabase.from('products').update({ status: 'on_hold' } as any).eq('id', product_id);
      if (pErr) throw pErr;
    },
    onSuccess: () => { invalidate(); toast.success('Hold placed'); setHoldProduct(null); },
    onError: (err: Error) => toast.error(err.message),
  });

  const changeStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('products').update({ status } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Status updated'); setChangeStatusProduct(null); setPendingStatus(''); },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateLinksMutation = useMutation({
    mutationFn: async ({ id, links }: { id: string; links: ExternalLinksState }) => {
      const { error } = await supabase.from('products').update({
        firstdibs_url: links.firstdibs_url || null,
        chairish_url: links.chairish_url || null,
        ebay_url: links.ebay_url || null,
      } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('External links updated'); setLinksProduct(null); },
    onError: (err: Error) => toast.error(err.message),
  });

  const openLinksDialog = (p: Product) => {
    setLinksState({
      firstdibs_url: (p as any).firstdibs_url ?? '',
      chairish_url: (p as any).chairish_url ?? '',
      ebay_url: (p as any).ebay_url ?? '',
    });
    setLinksProduct(p);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-wide text-foreground">Available Products</h1>
          <p className="text-sm text-muted-foreground mt-1">{data?.total ?? 0} items ready to sell</p>
        </div>
        <Link to="/admin/products/new">
          <Button className="text-xs tracking-[0.1em] uppercase">Add Product</Button>
        </Link>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or SKU..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
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
                <TableHead className="w-16">Image</TableHead>
                <TableHead className="w-32">SKU</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-28">Price</TableHead>
                <TableHead className="w-28">Added</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
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
                    <TableCell>{p.price ? `$${p.price.toLocaleString()}` : '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical size={15} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem asChild>
                            <Link to={`/product/${p.slug}`} className="flex items-center gap-2 cursor-pointer">
                              <Eye size={13} /> View on Site
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/admin/products/${p.id}?from=available`} className="flex items-center gap-2 cursor-pointer">
                              <Pencil size={13} /> Edit Product
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setHoldProduct(p)} className="flex items-center gap-2 cursor-pointer">
                            <Clock size={13} /> Place Hold
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSoldProduct(p)} className="flex items-center gap-2 cursor-pointer">
                            <CircleDollarSign size={13} /> Mark as Sold
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => { setChangeStatusProduct(p); setPendingStatus(p.status); }} className="flex items-center gap-2 cursor-pointer">
                            <Tag size={13} /> Change Status
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openLinksDialog(p)} className="flex items-center gap-2 cursor-pointer">
                            <LinkIcon size={13} /> Update External Links
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => { if (confirm('Delete this product?')) deleteMutation.mutate(p.id); }} className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive">
                            <Trash2 size={13} /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">Page {page + 1} of {totalPages} ({data?.total} products)</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft size={14} className="mr-1" /> Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                  Next <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <MarkSoldDialog
        open={!!soldProduct}
        onOpenChange={(open) => !open && setSoldProduct(null)}
        productName={soldProduct?.name ?? ''}
        currentPrice={soldProduct?.price ?? null}
        onConfirm={(saleData) => { if (soldProduct) markSoldMutation.mutate({ id: soldProduct.id, ...saleData }); }}
        isLoading={markSoldMutation.isPending}
      />

      <AdminPlaceHoldDialog
        open={!!holdProduct}
        onOpenChange={(open) => !open && setHoldProduct(null)}
        productName={holdProduct?.name ?? ''}
        onConfirm={(holdData) => { if (holdProduct) placeHoldMutation.mutate({ product_id: holdProduct.id, ...holdData }); }}
        isLoading={placeHoldMutation.isPending}
      />

      <Dialog open={!!changeStatusProduct} onOpenChange={(open) => { if (!open) { setChangeStatusProduct(null); setPendingStatus(''); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground truncate">{changeStatusProduct?.name}</p>
          <div className="grid grid-cols-1 gap-1.5 mt-2">
            {['available', 'on_hold', 'at_auction', 'sold', 'draft', 'inventory', 'deactivated'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setPendingStatus(s)}
                className={`flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
                  pendingStatus === s ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted'
                }`}
              >
                <span className="text-sm capitalize">{s.replace('_', ' ')}</span>
                {pendingStatus === s && <span className="ml-auto text-primary text-xs">✓</span>}
              </button>
            ))}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setChangeStatusProduct(null); setPendingStatus(''); }}>Cancel</Button>
            <Button
              disabled={!pendingStatus || pendingStatus === changeStatusProduct?.status || changeStatusMutation.isPending}
              onClick={() => {
                if (changeStatusProduct && pendingStatus) {
                  changeStatusMutation.mutate({ id: changeStatusProduct.id, status: pendingStatus });
                }
              }}
            >
              {changeStatusMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!linksProduct} onOpenChange={(open) => { if (!open) setLinksProduct(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update External Links</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground truncate mb-2">{linksProduct?.name}</p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstdibs_url">1stDibs URL</Label>
              <Input
                id="firstdibs_url"
                placeholder="https://www.1stdibs.com/..."
                value={linksState.firstdibs_url}
                onChange={(e) => setLinksState((s) => ({ ...s, firstdibs_url: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chairish_url">Chairish URL</Label>
              <Input
                id="chairish_url"
                placeholder="https://www.chairish.com/..."
                value={linksState.chairish_url}
                onChange={(e) => setLinksState((s) => ({ ...s, chairish_url: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ebay_url">eBay URL</Label>
              <Input
                id="ebay_url"
                placeholder="https://www.ebay.com/itm/..."
                value={linksState.ebay_url}
                onChange={(e) => setLinksState((s) => ({ ...s, ebay_url: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setLinksProduct(null)}>Cancel</Button>
            <Button
              disabled={updateLinksMutation.isPending}
              onClick={() => { if (linksProduct) updateLinksMutation.mutate({ id: linksProduct.id, links: linksState }); }}
            >
              {updateLinksMutation.isPending ? 'Saving…' : 'Save Links'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProductsAvailable;

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search, ChevronLeft, ChevronRight, ArrowLeft,
  ChevronDown, ChevronUp, MoreVertical,
  Eye, Pencil, Clock, RefreshCw, CircleDollarSign, Trash2,
  Link as LinkIcon, Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/types/database';
import MarkSoldDialog from '@/components/MarkSoldDialog';
import PlaceHoldDialog from '@/components/PlaceHoldDialog';

const PAGE_SIZE = 25;

type StatusValue = 'available' | 'on_hold' | 'at_auction' | 'sold' | 'inventory' | 'draft' | 'deactivated';

const PRODUCTS_TABS: { value: StatusValue; label: string }[] = [
  { value: 'available',  label: 'Available'  },
  { value: 'on_hold',    label: 'On Hold'    },
  { value: 'at_auction', label: 'At Auction' },
  { value: 'sold',       label: 'Sold'       },
];

const INVENTORY_TABS: { value: StatusValue; label: string }[] = [
  { value: 'inventory',   label: 'Inventory'   },
  { value: 'draft',       label: 'Drafts'      },
  { value: 'deactivated', label: 'Deactivated' },
];

const ALL_STATUSES: { value: StatusValue; label: string }[] = [
  { value: 'available',   label: 'Available'   },
  { value: 'on_hold',     label: 'On Hold'     },
  { value: 'at_auction',  label: 'At Auction'  },
  { value: 'sold',        label: 'Sold'        },
  { value: 'inventory',   label: 'Inventory'   },
  { value: 'draft',       label: 'Draft'       },
  { value: 'deactivated', label: 'Deactivated' },
];

const STATUS_BADGE: Record<StatusValue, { label: string; className: string }> = {
  available:   { label: 'Available',   className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  on_hold:     { label: 'On Hold',     className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  at_auction:  { label: 'At Auction',  className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  sold:        { label: 'Sold',        className: 'bg-muted text-muted-foreground' },
  inventory:   { label: 'Inventory',   className: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300' },
  draft:       { label: 'Draft',       className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  deactivated: { label: 'Deactivated', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

const StatusBadge = ({ status }: { status: StatusValue }) => {
  const cfg = STATUS_BADGE[status] ?? { label: status, className: 'bg-muted text-muted-foreground' };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase whitespace-nowrap ${cfg.className}`}>
      {cfg.label}
    </span>
  );
};

const INVENTORY_STATUSES = new Set<StatusValue>(['inventory', 'draft', 'deactivated']);
const NO_SOLD_STATUSES   = new Set<string>(['sold', 'inventory', 'draft', 'deactivated']);

type HoldDetail = {
  id: string;
  product_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  hold_duration_hours: number;
  created_at: string;
  expires_at: string;
  notes: string | null;
};

type ExternalLinksState = {
  firstdibs_url: string;
  chairish_url: string;
  ebay_url: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

const AdminProducts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId     = searchParams.get('highlight');
  const consignorFilter = searchParams.get('sku');
  const queryClient     = useQueryClient();

  const [searchQuery,  setSearchQuery]  = useState('');
  const statusFilter: StatusValue = (searchParams.get('status') as StatusValue) ?? 'available';
  const setStatusFilter = (value: StatusValue) => {
    setSearchParams(prev => { prev.set('status', value); return prev; });
    setPage(0);
  };
  const [page,          setPage]          = useState(0);
  const [soldProduct,   setSoldProduct]   = useState<Product | null>(null);
  const [holdProduct,   setHoldProduct]   = useState<Product | null>(null);
  const [openHoldId,    setOpenHoldId]    = useState<string | null>(null);

  // Change Status dialog
  const [changeStatusProduct, setChangeStatusProduct] = useState<Product | null>(null);
  const [pendingStatus,        setPendingStatus]       = useState<StatusValue | ''>('');

  // External Links dialog
  const [linksProduct, setLinksProduct] = useState<Product | null>(null);
  const [linksState,   setLinksState]   = useState<ExternalLinksState>({ firstdibs_url: '', chairish_url: '', ebay_url: '' });

  const isInventorySection = INVENTORY_STATUSES.has(statusFilter);

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, searchQuery, statusFilter, consignorFilter],
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      let countQ = supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', statusFilter);
      if (consignorFilter) countQ = countQ.ilike('sku', `${consignorFilter}%`);
      if (searchQuery)     countQ = countQ.or(`name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`);

      let q = supabase
        .from('products')
        .select('*, product_images(image_url, sort_order)')
        .eq('status', statusFilter)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (consignorFilter) q = q.ilike('sku', `${consignorFilter}%`);
      if (searchQuery)     q = q.or(`name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`);

      const [{ count }, { data: products, error }] = await Promise.all([countQ, q]);
      if (error) throw error;

      let holdsMap: Record<string, HoldDetail> = {};
      if (statusFilter === 'on_hold' && products?.length) {
        const { data: holds } = await supabase
          .from('product_holds')
          .select('*')
          .in('product_id', products.map((p: any) => p.id))
          .order('created_at', { ascending: false });
        holds?.forEach((h: any) => { if (!holdsMap[h.product_id]) holdsMap[h.product_id] = h; });
      }

      return { products: products as Product[], total: count ?? 0, holdsMap };
    },
  });

  const { data: statusCounts } = useQuery({
    queryKey: ['admin-product-counts'],
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const statuses: StatusValue[] = ['available', 'on_hold', 'at_auction', 'sold', 'inventory', 'draft', 'deactivated'];
      const results = await Promise.all(
        statuses.map((s) => supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', s)),
      );
      return Object.fromEntries(statuses.map((s, i) => [s, results[i].count ?? 0])) as Record<StatusValue, number>;
    },
  });

  const products   = data?.products ?? [];
  const holdsMap   = data?.holdsMap ?? {};
  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  const showExpires     = statusFilter === 'on_hold';
  const showSoldDetails = statusFilter === 'sold';
  const showAuction     = statusFilter === 'at_auction';
  const showPrice       = !showSoldDetails && !showAuction;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    queryClient.invalidateQueries({ queryKey: ['admin-product-counts'] });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Product deleted'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const releaseAuctionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').update({ status: 'available', chairish_auction_url: null } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Released from auction'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const releaseHoldMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').update({ status: 'available' } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Released from hold → Available'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const extendHoldMutation = useMutation({
    mutationFn: async ({ holdId }: { holdId: string }) => {
      const newExpiry = new Date();
      newExpiry.setHours(newExpiry.getHours() + 48);
      const { error } = await supabase.from('product_holds').update({ expires_at: newExpiry.toISOString(), hold_duration_hours: 48 }).eq('id', holdId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Hold extended 48 hours'); },
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
    mutationFn: async ({ product_id, customer_name, customer_email, customer_phone, hold_duration_hours, expires_at, notes }: {
      product_id: string; customer_name: string; customer_email: string; customer_phone: string;
      hold_duration_hours: number; expires_at: string; notes: string;
    }) => {
      const { error: hErr } = await supabase.from('product_holds').insert({ product_id, customer_name, customer_email, customer_phone: customer_phone || null, hold_duration_hours, expires_at, notes: notes || null });
      if (hErr) throw hErr;
      const { error: pErr } = await supabase.from('products').update({ status: 'on_hold' } as any).eq('id', product_id);
      if (pErr) throw pErr;
    },
    onSuccess: () => { invalidate(); toast.success('Hold placed'); setHoldProduct(null); },
    onError: (err: Error) => toast.error(err.message),
  });

  const changeStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusValue }) => {
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
        chairish_url:  links.chairish_url  || null,
        ebay_url:      links.ebay_url      || null,
      } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('External links updated'); setLinksProduct(null); },
    onError: (err: Error) => toast.error(err.message),
  });

  const openLinksDialog = (p: Product) => {
    setLinksState({
      firstdibs_url: (p as any).firstdibs_url ?? '',
      chairish_url:  (p as any).chairish_url  ?? '',
      ebay_url:      (p as any).ebay_url       ?? '',
    });
    setLinksProduct(p);
  };

  const handleSearch       = (v: string) => { setSearchQuery(v); setPage(0); };
  const handleStatusFilter = (v: string) => { if (v) { setStatusFilter(v as StatusValue); setPage(0); } };

  const cnt = (s: StatusValue) => {
    const n = statusCounts?.[s];
    return n != null ? <span className="ml-1 opacity-60">({n})</span> : null;
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {consignorFilter && (
              <Button variant="ghost" size="sm" onClick={() => setSearchParams({})} className="text-muted-foreground">
                <ArrowLeft size={14} className="mr-1" /> All Products
              </Button>
            )}
            <h1 className="font-display text-2xl tracking-wide text-foreground">
              {consignorFilter ? `Products — ${consignorFilter}` : isInventorySection ? 'Inventory' : 'Products'}
            </h1>
          </div>
          <Link to="/admin/products/new">
            <Button className="text-xs tracking-[0.1em] uppercase">Add Product</Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search products..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} className="pl-9" />
        </div>

        {/* Tabs */}
        <div className="mb-4">
          {!isInventorySection ? (
            <ToggleGroup type="single" value={statusFilter} onValueChange={handleStatusFilter} className="justify-start flex-wrap gap-1">
              {PRODUCTS_TABS.map((t) => (
                <ToggleGroupItem key={t.value} value={t.value} className="text-xs tracking-wider uppercase px-3">
                  {t.label}{cnt(t.value)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          ) : (
            <ToggleGroup type="single" value={statusFilter} onValueChange={handleStatusFilter} className="justify-start flex-wrap gap-1">
              {INVENTORY_TABS.map((t) => (
                <ToggleGroupItem key={t.value} value={t.value} className="text-xs tracking-wider uppercase px-3">
                  {t.label}{cnt(t.value)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        </div>

        {/* Table */}
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
                  <TableHead className="w-28">Status</TableHead>
                  {showExpires     && <TableHead className="w-32">Hold Expires</TableHead>}
                  {showAuction     && <TableHead>Auction URL</TableHead>}
                  {showSoldDetails && <TableHead className="w-28">Sold Price</TableHead>}
                  {showSoldDetails && <TableHead className="w-28">Platform</TableHead>}
                  {showSoldDetails && <TableHead className="w-28">Sale Date</TableHead>}
                  {showPrice       && <TableHead className="w-28">Price</TableHead>}
                  <TableHead className="w-28">Added</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const thumb    = p.product_images?.sort((a, b) => a.sort_order - b.sort_order)?.[0];
                  const hold     = holdsMap[p.id] as HoldDetail | undefined;
                  const holdOpen = openHoldId === p.id;

                  return (
                    <>
                      <TableRow
                        key={p.id}
                        className={highlightId === p.id ? 'bg-primary/10 ring-1 ring-primary/30' : ''}
                      >
                        {/* Image */}
                        <TableCell>
                          {thumb ? (
                            <img src={thumb.image_url} alt="" className="w-12 h-12 rounded-sm object-cover" />
                          ) : p.featured_image_url ? (
                            <img src={p.featured_image_url} alt="" className="w-12 h-12 rounded-sm object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-sm bg-muted" />
                          )}
                        </TableCell>

                        {/* SKU */}
                        <TableCell className="text-muted-foreground text-xs">{p.sku || '—'}</TableCell>

                        {/* Title */}
                        <TableCell className="font-medium">{p.name}</TableCell>

                        {/* Status badge */}
                        <TableCell>
                          <StatusBadge status={p.status as StatusValue} />
                        </TableCell>

                        {/* On Hold: expiry + accordion toggle */}
                        {showExpires && (
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">
                                {hold?.expires_at ? new Date(hold.expires_at).toLocaleDateString() : '—'}
                              </span>
                              {hold && (
                                <button
                                  type="button"
                                  onClick={() => setOpenHoldId(holdOpen ? null : p.id)}
                                  className="text-muted-foreground hover:text-foreground transition-colors"
                                  title="View hold details"
                                >
                                  {holdOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                </button>
                              )}
                            </div>
                          </TableCell>
                        )}

                        {/* At Auction */}
                        {showAuction && (
                          <TableCell className="text-xs">
                            {(p as any).chairish_auction_url ? (
                              <a href={(p as any).chairish_auction_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block max-w-[200px]">
                                View on Chairish
                              </a>
                            ) : '—'}
                          </TableCell>
                        )}

                        {/* Sold details */}
                        {showSoldDetails && (
                          <>
                            <TableCell className="text-sm">{(p as any).sold_price ? `$${(p as any).sold_price.toLocaleString()}` : '—'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{p.sale_platform || '—'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{p.sale_date ? new Date(p.sale_date).toLocaleDateString() : '—'}</TableCell>
                          </>
                        )}

                        {/* Price */}
                        {showPrice && (
                          <TableCell>
                            <div className="text-sm">{p.price ? `$${p.price.toLocaleString()}` : '—'}</div>
                            {p.sale_price && <div className="text-xs text-destructive">${p.sale_price.toLocaleString()}</div>}
                          </TableCell>
                        )}

                        {/* Added date */}
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </TableCell>

                        {/* ── Kebab Actions Menu ── */}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical size={15} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">

                              {/* View / Edit */}
                              <DropdownMenuItem asChild>
                                <Link to={`/product/${p.slug}`} className="flex items-center gap-2 cursor-pointer">
                                  <Eye size={13} /> View on Site
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/admin/products/${p.id}?from=${p.status}`} className="flex items-center gap-2 cursor-pointer">
                                  <Pencil size={13} /> Edit Product
                                </Link>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {/* Status-specific actions */}
                              {p.status === 'available' && (
                                <DropdownMenuItem onClick={() => setHoldProduct(p)} className="flex items-center gap-2 cursor-pointer">
                                  <Clock size={13} /> Place Hold
                                </DropdownMenuItem>
                              )}
                              {p.status === 'on_hold' && hold && (
                                <DropdownMenuItem onClick={() => extendHoldMutation.mutate({ holdId: hold.id })} className="flex items-center gap-2 cursor-pointer">
                                  <RefreshCw size={13} /> Extend Hold 48h
                                </DropdownMenuItem>
                              )}
                              {p.status === 'on_hold' && (
                                <DropdownMenuItem onClick={() => { if (confirm('Release hold and set back to Available?')) releaseHoldMutation.mutate(p.id); }} className="flex items-center gap-2 cursor-pointer">
                                  <ArrowLeft size={13} /> Release Hold → Available
                                </DropdownMenuItem>
                              )}
                              {p.status === 'at_auction' && (
                                <DropdownMenuItem onClick={() => { if (confirm('Release from auction back to Available?')) releaseAuctionMutation.mutate(p.id); }} className="flex items-center gap-2 cursor-pointer">
                                  <ArrowLeft size={13} /> Release from Auction
                                </DropdownMenuItem>
                              )}
                              {!NO_SOLD_STATUSES.has(p.status) && (
                                <DropdownMenuItem onClick={() => setSoldProduct(p)} className="flex items-center gap-2 cursor-pointer">
                                  <CircleDollarSign size={13} /> Mark as Sold
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              {/* Change Status */}
                              <DropdownMenuItem
                                onClick={() => { setChangeStatusProduct(p); setPendingStatus(p.status as StatusValue); }}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Tag size={13} /> Change Status
                              </DropdownMenuItem>

                              {/* External Links */}
                              <DropdownMenuItem onClick={() => openLinksDialog(p)} className="flex items-center gap-2 cursor-pointer">
                                <LinkIcon size={13} /> Update External Links
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {/* Delete */}
                              <DropdownMenuItem
                                onClick={() => { if (confirm('Delete this product?')) deleteMutation.mutate(p.id); }}
                                className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                              >
                                <Trash2 size={13} /> Delete
                              </DropdownMenuItem>

                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>

                      {/* ── Hold detail accordion row ── */}
                      {showExpires && holdOpen && hold && (
                        <TableRow key={`${p.id}-hold`} className="bg-muted/40 hover:bg-muted/40">
                          <TableCell colSpan={9} className="py-3 pl-16 pr-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3 text-sm">
                              <div>
                                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-0.5">Customer</p>
                                <p className="font-medium">{hold.customer_name}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-0.5">Email</p>
                                <a href={`mailto:${hold.customer_email}`} className="text-primary hover:underline">{hold.customer_email}</a>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-0.5">Phone</p>
                                <p>{hold.customer_phone || '—'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-0.5">Hold Placed</p>
                                <p>{new Date(hold.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                              </div>
                              {hold.notes && (
                                <div className="col-span-2 md:col-span-4">
                                  <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-0.5">Notes</p>
                                  <p className="text-muted-foreground">{hold.notes}</p>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
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
      </div>

      {/* ── Mark Sold Dialog ── */}
      <MarkSoldDialog
        open={!!soldProduct}
        onOpenChange={(open) => !open && setSoldProduct(null)}
        productName={soldProduct?.name ?? ''}
        currentPrice={soldProduct?.price ?? null}
        onConfirm={(saleData) => { if (soldProduct) markSoldMutation.mutate({ id: soldProduct.id, ...saleData }); }}
        isLoading={markSoldMutation.isPending}
      />

      {/* ── Place Hold Dialog ── */}
      <PlaceHoldDialog
        open={!!holdProduct}
        onOpenChange={(open) => !open && setHoldProduct(null)}
        productName={holdProduct?.name ?? ''}
        onConfirm={(holdData) => { if (holdProduct) placeHoldMutation.mutate({ product_id: holdProduct.id, ...holdData }); }}
        isLoading={placeHoldMutation.isPending}
      />

      {/* ── Change Status Dialog ── */}
      <Dialog open={!!changeStatusProduct} onOpenChange={(open) => { if (!open) { setChangeStatusProduct(null); setPendingStatus(''); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground truncate">{changeStatusProduct?.name}</p>
          <div className="grid grid-cols-1 gap-1.5 mt-2">
            {ALL_STATUSES.map((s) => {
              const cfg = STATUS_BADGE[s.value];
              const isSelected = pendingStatus === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setPendingStatus(s.value)}
                  className={`flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted'
                  }`}
                >
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${cfg.className}`}>
                    {cfg.label}
                  </span>
                  {isSelected && <span className="ml-auto text-primary text-xs">✓</span>}
                </button>
              );
            })}
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

      {/* ── External Links Dialog ── */}
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
    </>
  );
};

export default AdminProducts;

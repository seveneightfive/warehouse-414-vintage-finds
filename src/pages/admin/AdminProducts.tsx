import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Link as LinkIcon,
  Tag,
  Clock,
  CircleDollarSign,
  ArrowLeft,
  ImagePlus,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/types/database';
import MarkSoldDialog from '@/components/MarkSoldDialog';
import AdminPlaceHoldDialog from '@/components/AdminPlaceHoldDialog';
import QuickUploadImagesModal from '@/components/QuickUploadImagesModal';

const PAGE_SIZE = 25;

const STALE_LISTING_MS = 360 * 24 * 60 * 60 * 1000;

type ProductStatusKey = 'available' | 'draft' | 'at_auction' | 'sold' | 'on_hold' | 'inventory' | 'deactivated';

type CountsMap = Record<ProductStatusKey, number>;

type StatusChangeVariables = {
  id: string;
  oldStatus: ProductStatusKey;
  newStatus: ProductStatusKey;
  extraData?: Record<string, unknown>;
};

type HoldFormData = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  hold_duration_hours: number;
  expires_at: string;
  notes: string;
  platform: string;
};

// Added 'sold_at' as a sortable key
type SortKey = 'default' | 'price' | 'created_at' | 'sale_date';
type SortDir = 'asc' | 'desc';

type StatusTab = {
  id: ProductStatusKey;
  label: string;
  subtitle: string;
};

const STATUS_TABS: StatusTab[] = [
  { id: 'available', label: 'Available', subtitle: 'Ready to sell' },
  { id: 'draft', label: 'Draft', subtitle: 'Work in progress' },
  { id: 'on_hold', label: 'On Hold', subtitle: 'Held for customers' },
  { id: 'at_auction', label: 'At Auction', subtitle: 'Listed on marketplaces' },
  { id: 'sold', label: 'Sold', subtitle: 'Historical sales' },
  { id: 'inventory', label: 'Inventory', subtitle: 'Awaiting production' },
  { id: 'deactivated', label: 'Deactivated', subtitle: 'Hidden from site' },
];

const STATUS_LABELS: Record<ProductStatusKey, string> = {
  available: 'Available',
  draft: 'Draft',
  at_auction: 'At Auction',
  sold: 'Sold',
  on_hold: 'On Hold',
  inventory: 'Inventory',
  deactivated: 'Deactivated',
};

const STATUS_OPTIONS: ProductStatusKey[] = ['available', 'draft', 'on_hold', 'at_auction', 'sold', 'inventory', 'deactivated'];

const VALID_STATUSES: ProductStatusKey[] = ['available', 'draft', 'at_auction', 'sold', 'on_hold', 'inventory', 'deactivated'];

const defaultCounts: CountsMap = {
  available: 0,
  draft: 0,
  at_auction: 0,
  sold: 0,
  on_hold: 0,
  inventory: 0,
  deactivated: 0,
};

const formatPrice = (product: Product) => {
  const soldPrice = (product as any).sold_price;
  if (product.status === 'sold' && soldPrice != null) {
    return `$${Number(soldPrice).toLocaleString()}`;
  }
  return product.price ? `$${product.price.toLocaleString()}` : '—';
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const isStaleListing = (product: Product) => {
  const ref = (product as any).published_at ?? product.created_at;
  if (!ref) return false;
  return Date.now() - new Date(ref).getTime() > STALE_LISTING_MS;
};

const daysSince = (dateString?: string | null) => {
  if (!dateString) return 0;
  return Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
};

const CrossListChips = ({ product }: { product: Product }) => {
  const platforms: { label: string; key: 'firstdibs_url' | 'chairish_url' | 'ebay_url'; title: string }[] = [
    { label: '1D', key: 'firstdibs_url', title: '1stDibs' },
    { label: 'CH', key: 'chairish_url', title: 'Chairish' },
    { label: 'eB', key: 'ebay_url', title: 'eBay' },
  ];
  return (
    <div className="flex gap-1">
      {platforms.map((p) => {
        const url = (product as any)[p.key];
        const listed = !!(url && String(url).trim());
        return (
          <span
            key={p.key}
            title={listed ? `Listed on ${p.title}` : `Not on ${p.title}`}
            className={
              'inline-flex items-center justify-center text-[10px] font-semibold tracking-wider uppercase rounded-sm px-1.5 py-0.5 border ' +
              (listed
                ? 'border-foreground/70 text-foreground bg-foreground/5'
                : 'border-border text-muted-foreground/40 bg-transparent')
            }
          >
            {p.label}
          </span>
        );
      })}
    </div>
  );
};

const fetchStatusCounts = async () => {
  const statuses: ProductStatusKey[] = ['available', 'draft', 'at_auction', 'sold', 'on_hold', 'inventory', 'deactivated'];
  const results = await Promise.all(statuses.map((status) =>
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', status)
  ));

  const counts = { ...defaultCounts };

  results.forEach((result, index) => {
    const status = statuses[index];
    if (result.error) throw result.error;
    counts[status] = result.count ?? 0;
  });

  return counts;
};

const AdminProducts = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlStatus = searchParams.get('status') as ProductStatusKey | null;
  const initialStatus: ProductStatusKey =
    urlStatus && VALID_STATUSES.includes(urlStatus) ? urlStatus : 'available';

  const [selectedStatus, setSelectedStatus] = useState<ProductStatusKey>(initialStatus);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [moveStatusProduct, setMoveStatusProduct] = useState<Product | null>(null);
  const [pendingStatus, setPendingStatus] = useState<ProductStatusKey>('available');
  const [soldProduct, setSoldProduct] = useState<Product | null>(null);
  const [holdProduct, setHoldProduct] = useState<Product | null>(null);
  const [linksProduct, setLinksProduct] = useState<Product | null>(null);
  const [linksState, setLinksState] = useState({ firstdibs_url: '', chairish_url: '', ebay_url: '' });
  const [isSavingLinks, setIsSavingLinks] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [uploadProduct, setUploadProduct] = useState<Product | null>(null);


  useEffect(() => {
    if (urlStatus && VALID_STATUSES.includes(urlStatus) && urlStatus !== selectedStatus) {
      setSelectedStatus(urlStatus);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlStatus]);

  // When switching to the sold tab, default to sold_at desc.
  // When leaving, reset to the standard default.
  useEffect(() => {
  // Reset sort based on which tab we're on
  if (selectedStatus === 'sold') {
    setSortKey('sale_date');
  } else {
    setSortKey('default');
  }
  setSortDir('desc');
  setPage(0);

  // Sync URL
  const current = searchParams.get('status');
  if (current !== selectedStatus) {
    setSearchParams({ status: selectedStatus }, { replace: true });
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedStatus]);

  
  const { data: countsData } = useQuery({
    queryKey: ['admin-product-counts'],
    staleTime: 1000 * 60,
    queryFn: fetchStatusCounts,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', selectedStatus, page, searchQuery, sortKey, sortDir],
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      let countQuery = supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', selectedStatus);
      let listQuery = supabase
        .from('products')
        .select('*, product_images(image_url, sort_order)')
        .eq('status', selectedStatus);

      if (sortKey === 'price') {
        listQuery = listQuery
          .order('price', { ascending: sortDir === 'asc', nullsFirst: false })
          .order('id', { ascending: false });
      } else if (sortKey === 'created_at') {
  listQuery = listQuery
    .order('published_at', { ascending: sortDir === 'asc', nullsFirst: false })
    .order('created_at', { ascending: sortDir === 'asc' })
    .order('id', { ascending: false });
      } else if (sortKey === 'sale_date') {
        listQuery = listQuery
          .order('sale_date', { ascending: sortDir === 'asc', nullsFirst: false })
          .order('id', { ascending: false });
      } else {
  listQuery = listQuery
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });
}
      listQuery = listQuery.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (searchQuery) {
        const filter = `name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`;
        countQuery = countQuery.or(filter);
        listQuery = listQuery.or(filter);
      }

      const [{ count }, { data: products, error }] = await Promise.all([countQuery, listQuery]);
      if (error) throw error;
      return { products: products as Product[], total: count ?? 0 };
    },
  });

  const products = data?.products ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const counts = countsData ?? defaultCounts;

  const cycleSort = (key: 'price' | 'created_at' | 'sale_date') => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('desc');
      return;
    }
    if (sortDir === 'desc') {
      setSortDir('asc');
      return;
    }
    // Third click: revert. For sold tab, go back to sold_at desc rather than 'default'.
    if (selectedStatus === 'sold' && key !== 'sale_date') {
      setSortKey('sale_date');
    } else if (selectedStatus === 'sold' && key === 'sale_date') {
      setSortDir('desc'); // can't clear the primary sort on sold tab — just flip back
    } else {
      setSortKey('default');
    }
    setSortDir('desc');
  };

  const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) => {
    if (!active) return <ChevronsUpDown size={12} className="opacity-40" />;
    return dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const statusChangeOnMutate = async ({ id, oldStatus, newStatus }: StatusChangeVariables) => {
    await queryClient.cancelQueries({ queryKey: ['admin-products', selectedStatus, page, searchQuery, sortKey, sortDir] });
    await queryClient.cancelQueries({ queryKey: ['admin-product-counts'] });

    const previousProducts = queryClient.getQueryData<{ products: Product[]; total: number }>(['admin-products', selectedStatus, page, searchQuery, sortKey, sortDir]);
    const previousCounts = queryClient.getQueryData<CountsMap>(['admin-product-counts']);

    if (previousProducts && oldStatus === selectedStatus) {
      queryClient.setQueryData(['admin-products', selectedStatus, page, searchQuery, sortKey, sortDir], {
        ...previousProducts,
        products: previousProducts.products.filter((product) => product.id !== id),
        total: Math.max(0, previousProducts.total - 1),
      });
    }

    if (previousCounts) {
      queryClient.setQueryData<CountsMap>(['admin-product-counts'], {
        ...previousCounts,
        [oldStatus]: Math.max(0, (previousCounts[oldStatus] ?? 0) - 1),
        [newStatus]: (previousCounts[newStatus] ?? 0) + 1,
      });
    }

    return { previousProducts, previousCounts };
  };

  const statusChangeOnError = (err: Error, _variables: StatusChangeVariables, context: any) => {
    if (context?.previousProducts) {
      queryClient.setQueryData(['admin-products', selectedStatus, page, searchQuery, sortKey, sortDir], context.previousProducts);
    }
    if (context?.previousCounts) {
      queryClient.setQueryData(['admin-product-counts'], context.previousCounts);
    }
    toast.error(err.message);
  };

  const statusChangeOnSuccess = () => {
    setMoveStatusProduct(null);
    setPendingStatus('available');
    setSoldProduct(null);
    setLinksProduct(null);
    toast.success('Status updated');
  };

  const changeStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus, extraData }: StatusChangeVariables) => {
      const { error } = await supabase.from('products').update({ status: newStatus, ...extraData } as any).eq('id', id);
      if (error) throw error;
    },
    onMutate: statusChangeOnMutate,
    onError: statusChangeOnError,
    onSuccess: statusChangeOnSuccess,
  });

  const placeHoldMutation = useMutation({
    mutationFn: async ({ productId, holdData }: { productId: string; holdData: HoldFormData }) => {
      const { error } = await supabase.from('product_holds').insert({
        product_id: productId,
        customer_name: holdData.customer_name,
        customer_email: holdData.customer_email || null,
        customer_phone: holdData.customer_phone || null,
        hold_duration_hours: holdData.hold_duration_hours,
        expires_at: holdData.expires_at,
        notes: holdData.notes || null,
        platform: holdData.platform || null,
      });
      if (error) throw error;
    },
    onMutate: async ({ productId }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-products', selectedStatus, page, searchQuery, sortKey, sortDir] });
      await queryClient.cancelQueries({ queryKey: ['admin-product-counts'] });

      const previousProducts = queryClient.getQueryData<{ products: Product[]; total: number }>(['admin-products', selectedStatus, page, searchQuery, sortKey, sortDir]);
      const previousCounts = queryClient.getQueryData<CountsMap>(['admin-product-counts']);

      const movingProduct = previousProducts?.products.find((p) => p.id === productId);
      const oldStatus = (movingProduct?.status as ProductStatusKey) ?? 'available';

      if (previousProducts && oldStatus === selectedStatus) {
        queryClient.setQueryData(['admin-products', selectedStatus, page, searchQuery, sortKey, sortDir], {
          ...previousProducts,
          products: previousProducts.products.filter((p) => p.id !== productId),
          total: Math.max(0, previousProducts.total - 1),
        });
      }

      if (previousCounts) {
        queryClient.setQueryData<CountsMap>(['admin-product-counts'], {
          ...previousCounts,
          [oldStatus]: Math.max(0, (previousCounts[oldStatus] ?? 0) - 1),
          on_hold: (previousCounts.on_hold ?? 0) + 1,
        });
      }

      return { previousProducts, previousCounts };
    },
    onError: (err: Error, _variables, context: any) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(['admin-products', selectedStatus, page, searchQuery, sortKey, sortDir], context.previousProducts);
      }
      if (context?.previousCounts) {
        queryClient.setQueryData(['admin-product-counts'], context.previousCounts);
      }
      toast.error(err.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products', selectedStatus, page, searchQuery, sortKey, sortDir] });
      queryClient.invalidateQueries({ queryKey: ['admin-product-counts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-holds'] });
      setHoldProduct(null);
      toast.success('Hold placed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products', selectedStatus] });
      queryClient.invalidateQueries({ queryKey: ['admin-product-counts'] });
      toast.success('Product deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openLinksDialog = (product: Product) => {
    setLinksState({
      firstdibs_url: (product as any).firstdibs_url ?? '',
      chairish_url: (product as any).chairish_url ?? '',
      ebay_url: (product as any).ebay_url ?? '',
    });
    setLinksProduct(product);
  };

  const saveLinks = async () => {
    if (!linksProduct) return;
    setIsSavingLinks(true);
    try {
      const { error } = await supabase.from('products').update({
        firstdibs_url: linksState.firstdibs_url || null,
        chairish_url: linksState.chairish_url || null,
        ebay_url: linksState.ebay_url || null,
      } as any).eq('id', linksProduct.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('External links updated');
      setLinksProduct(null);
      queryClient.invalidateQueries({ queryKey: ['admin-products', selectedStatus, page, searchQuery, sortKey, sortDir] });
    } finally {
      setIsSavingLinks(false);
    }
  };

  const moveToStatusOptions = STATUS_OPTIONS.filter((status) => status !== moveStatusProduct?.status);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl tracking-wide text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">One unified product table with live status filters</p>
        </div>
        <Link to="/admin/products/new">
          <Button className="text-xs tracking-[0.1em] uppercase">Add Product</Button>
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedStatus(tab.id)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              selectedStatus === tab.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:border-primary hover:text-foreground'
            }`}
          >
            <span>{tab.label}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {counts[tab.id] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setPage(0);
            }}
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {counts[selectedStatus] ?? 0} {STATUS_LABELS[selectedStatus]} products
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading products…</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Image</TableHead>
                <TableHead className="w-32">SKU</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-28">Cross-Listed</TableHead>
                <TableHead className="w-28">
                  <button
                    type="button"
                    onClick={() => cycleSort('price')}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    title="Sort by price"
                  >
                    Price
                    <SortIcon active={sortKey === 'price'} dir={sortDir} />
                  </button>
                </TableHead>
                <TableHead className="w-28">
                  <button
                    type="button"
                    onClick={() => cycleSort('created_at')}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    title="Sort by date published"
                  >
                    Published
                    <SortIcon active={sortKey === 'created_at'} dir={sortDir} />
                  </button>
                </TableHead>
                {/* Sold On column — only visible on the sold tab */}
                {selectedStatus === 'sold' && (
                  <TableHead className="w-28">
                    <button
                      type="button"
                      onClick={() => cycleSort('sale_date')}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      title="Sort by date sold"
                    >
                      Sold On
                      <SortIcon active={sortKey === 'sale_date'} dir={sortDir} />
                    </button>
                  </TableHead>
                )}
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const thumb = product.product_images?.sort((a, b) => a.sort_order - b.sort_order)?.[0];
                const hasImages = !!thumb || !!product.featured_image_url;
                const stale = isStaleListing(product);
                const publishedAt = (product as any).published_at ?? product.created_at;
                const daysListed = daysSince(publishedAt);

                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      {thumb ? (
                        <img src={thumb.image_url} alt={product.name} className="w-12 h-12 rounded-sm object-cover" />
                      ) : product.featured_image_url ? (
                        <img src={product.featured_image_url} alt={product.name} className="w-12 h-12 rounded-sm object-cover" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setUploadProduct(product)}
                          title="Upload images"
                          className="w-12 h-12 rounded-sm bg-muted hover:bg-muted/70 flex items-center justify-center text-muted-foreground transition-colors"
                        >
                          <ImagePlus size={16} />
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{product.sku || '—'}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{product.name}</span>
                        {stale && (
                          <span
                            title={`Listed ${daysListed} days ago`}
                            className="inline-flex items-center text-amber-700 dark:text-amber-300"
                          >
                            <Clock size={14} />
                          </span>
                        )}
                        {!hasImages && (
                          <span className="text-[10px] font-semibold tracking-wider uppercase text-amber-700 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded">
                            No images
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <CrossListChips product={product} />
                    </TableCell>
                    <TableCell>{formatPrice(product)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
  {formatDate((product as any).published_at ?? product.created_at)}
</TableCell>
                    {/* Sold On cell — only rendered on the sold tab */}
                    {selectedStatus === 'sold' && (
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate((product as any).sale_date)}
                      </TableCell>
                    )}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical size={15} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 bg-card border border-border">
                          <DropdownMenuItem asChild>
                            <Link to={`/product/${product.slug}`} className="flex items-center gap-2 cursor-pointer">
                              <Eye size={13} /> View on Site
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/admin/products/${product.id}`} className="flex items-center gap-2 cursor-pointer">
                              <Pencil size={13} /> Edit Product
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => setUploadProduct(product)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <ImagePlus size={13} /> Manage Images
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {selectedStatus === 'available' && (
                            <>
                              <DropdownMenuItem onClick={() => setHoldProduct(product)} className="flex items-center gap-2 cursor-pointer">
                                <Clock size={13} /> Place Hold
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSoldProduct(product)} className="flex items-center gap-2 cursor-pointer">
                                <CircleDollarSign size={13} /> Mark as Sold
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}

                          {selectedStatus === 'at_auction' && (
                            <DropdownMenuItem
                              onClick={() => {
                                if (confirm('Release this item from auction and move it back to Available?')) {
                                  changeStatusMutation.mutate({ id: product.id, oldStatus: product.status as ProductStatusKey, newStatus: 'available', extraData: { chairish_auction_url: null } });
                                }
                              }}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <ArrowLeft size={13} /> Release from Auction
                            </DropdownMenuItem>
                          )}

                          {selectedStatus === 'sold' && (
                            <DropdownMenuItem
                              onClick={() => {
                                if (confirm('Move this item back to Available?')) {
                                  changeStatusMutation.mutate({ id: product.id, oldStatus: product.status as ProductStatusKey, newStatus: 'available' });
                                }
                              }}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <ArrowLeft size={13} /> Move to Available
                            </DropdownMenuItem>
                          )}

                          {selectedStatus === 'deactivated' && (
                            <DropdownMenuItem
                              onClick={() => {
                                if (confirm('Reactivate this product and move it back to Available?')) {
                                  changeStatusMutation.mutate({ id: product.id, oldStatus: product.status as ProductStatusKey, newStatus: 'available' });
                                }
                              }}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <ArrowLeft size={13} /> Reactivate
                            </DropdownMenuItem>
                          )}

                          {selectedStatus === 'inventory' && (
                            <DropdownMenuItem
                              onClick={() => {
                                if (confirm('Promote this inventory item to Available?')) {
                                  changeStatusMutation.mutate({ id: product.id, oldStatus: product.status as ProductStatusKey, newStatus: 'available' });
                                }
                              }}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <ArrowLeft size={13} /> Move to Available
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setMoveStatusProduct(product);
                              setPendingStatus('available');
                            }}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Tag size={13} /> Move to…
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openLinksDialog(product)} className="flex items-center gap-2 cursor-pointer">
                            <LinkIcon size={13} /> Update External Links
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              if (confirm('Delete this product?')) deleteMutation.mutate(product.id);
                            }}
                            className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                          >
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
              <p className="text-sm text-muted-foreground">Page {page + 1} of {totalPages} ({data?.total ?? 0} products)</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>
                  <ChevronLeft size={14} className="mr-1" /> Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((current) => current + 1)}>
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
        onConfirm={(saleData) => {
          if (!soldProduct) return;
          changeStatusMutation.mutate({
            id: soldProduct.id,
            oldStatus: soldProduct.status as ProductStatusKey,
            newStatus: 'sold',
            extraData: saleData,
          });
        }}
        isLoading={changeStatusMutation.isPending}
      />

      <AdminPlaceHoldDialog
        open={!!holdProduct}
        onOpenChange={(open) => !open && setHoldProduct(null)}
        productName={holdProduct?.name ?? ''}
        onConfirm={(holdData) => {
          if (!holdProduct) return;
          placeHoldMutation.mutate({ productId: holdProduct.id, holdData });
        }}
        isLoading={placeHoldMutation.isPending}
      />

      <QuickUploadImagesModal
        productId={uploadProduct?.id ?? null}
        productName={uploadProduct?.name ?? null}
        sku={uploadProduct?.sku ?? null}
        open={!!uploadProduct}
        onClose={() => setUploadProduct(null)}
      />

      <Dialog open={!!moveStatusProduct} onOpenChange={(open) => { if (!open) { setMoveStatusProduct(null); setPendingStatus('available'); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Move to…</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground truncate">{moveStatusProduct?.name}</p>
          <div className="grid grid-cols-1 gap-2 mt-4">
            {moveToStatusOptions.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setPendingStatus(status)}
                className={`flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors ${
                  pendingStatus === status ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted'
                }`}
              >
                <span className="capitalize">{STATUS_LABELS[status]}</span>
                {pendingStatus === status && <span className="text-primary text-xs">✓</span>}
              </button>
            ))}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setMoveStatusProduct(null); setPendingStatus('available'); }}>Cancel</Button>
            <Button
              disabled={!pendingStatus || pendingStatus === moveStatusProduct?.status || changeStatusMutation.isPending}
              onClick={() => {
                if (!moveStatusProduct || !pendingStatus) return;
                changeStatusMutation.mutate({
                  id: moveStatusProduct.id,
                  oldStatus: moveStatusProduct.status as ProductStatusKey,
                  newStatus: pendingStatus,
                });
              }}
            >
              {changeStatusMutation.isPending ? 'Moving…' : 'Move'}
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
                onChange={(event) => setLinksState((current) => ({ ...current, firstdibs_url: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chairish_url">Chairish URL</Label>
              <Input
                id="chairish_url"
                placeholder="https://www.chairish.com/..."
                value={linksState.chairish_url}
                onChange={(event) => setLinksState((current) => ({ ...current, chairish_url: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ebay_url">eBay URL</Label>
              <Input
                id="ebay_url"
                placeholder="https://www.ebay.com/itm/..."
                value={linksState.ebay_url}
                onChange={(event) => setLinksState((current) => ({ ...current, ebay_url: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setLinksProduct(null)} disabled={isSavingLinks}>Cancel</Button>
            <Button disabled={isSavingLinks} onClick={saveLinks}>
              {isSavingLinks ? 'Saving…' : 'Save Links'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProducts;

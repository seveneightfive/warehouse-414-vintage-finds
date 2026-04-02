import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Pencil, Printer, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

type ConsignorForm = {
  first_name: string;
  last_name: string;
  consignor_code: string;
  email: string;
  phone: string;
  notes: string;
};

type Product = {
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
  sale_price: number | null;
  status: string;
  slug: string;
  created_at: string;
  featured_image_url: string | null;
  sold_price: number | null;
  sale_date: string | null;
  sale_platform: string | null;
};

const ProductTable = ({ products, showSoldDetails = false }: { products: Product[]; showSoldDetails?: boolean }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Image</TableHead>
        <TableHead>SKU</TableHead>
        <TableHead>Title</TableHead>
        {showSoldDetails ? (
          <>
            <TableHead>Sold Price</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Sale Date</TableHead>
          </>
        ) : (
          <TableHead>Price</TableHead>
        )}
        <TableHead>Added</TableHead>
        <TableHead className="w-16 print:hidden">Edit</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {products.length === 0 ? (
        <TableRow>
          <TableCell colSpan={showSoldDetails ? 7 : 6} className="text-center text-muted-foreground py-6 text-sm">
            None
          </TableCell>
        </TableRow>
      ) : (
        products.map((p) => (
          <TableRow key={p.id}>
            <TableCell>
              {p.featured_image_url ? (
                <img src={p.featured_image_url} alt="" className="w-12 h-12 rounded-sm object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-sm bg-muted" />
              )}
            </TableCell>
            <TableCell className="text-muted-foreground text-xs font-mono">{p.sku || '—'}</TableCell>
            <TableCell className="font-medium">
              <a href={`/product/${p.slug}`} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                {p.name}
                <ExternalLink size={10} className="text-muted-foreground print:hidden" />
              </a>
            </TableCell>
            {showSoldDetails ? (
              <>
                <TableCell className="text-sm">{p.sold_price ? `$${p.sold_price.toLocaleString()}` : '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.sale_platform || '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.sale_date ? new Date(p.sale_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</TableCell>
              </>
            ) : (
              <TableCell>
                <div>{p.price ? `$${p.price.toLocaleString()}` : '—'}</div>
                {p.sale_price && <div className="text-xs text-destructive">${p.sale_price.toLocaleString()}</div>}
              </TableCell>
            )}
            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
              {p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
            </TableCell>
            <TableCell className="print:hidden">
              <Link to={`/admin/products/${p.id}`}>
                <Button variant="ghost" size="icon"><Pencil size={14} /></Button>
              </Link>
            </TableCell>
          </TableRow>
        ))
      )}
    </TableBody>
  </Table>
);

const AdminConsignorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ConsignorForm>({
    first_name: '', last_name: '', consignor_code: '', email: '', phone: '', notes: '',
  });

  const { data: consignor, isLoading, refetch } = useQuery({
    queryKey: ['consignor-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consignors' as any)
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['consignor-products', id, consignor?.consignor_code],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, price, sale_price, status, slug, created_at, featured_image_url, sold_price, sale_date, sale_platform')
        .ilike('sku', `${consignor.consignor_code}%`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!consignor?.consignor_code,
  });

  const updateMutation = useMutation({
    mutationFn: async (values: ConsignorForm) => {
      const { error } = await supabase
        .from('consignors' as any)
        .update({
          first_name: values.first_name || null,
          last_name: values.last_name || null,
          consignor_code: values.consignor_code.toUpperCase(),
          email: values.email || null,
          phone: values.phone || null,
          notes: values.notes || null,
        })
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast.success('Consignor updated');
      setModalOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openEdit = () => {
    setForm({
      first_name: consignor.first_name || '',
      last_name: consignor.last_name || '',
      consignor_code: consignor.consignor_code,
      email: consignor.email || '',
      phone: consignor.phone || '',
      notes: consignor.notes || '',
    });
    setModalOpen(true);
  };

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading…</p>;
  if (!consignor) return <p className="text-muted-foreground text-sm">Consignor not found.</p>;

  const available = products?.filter(p => p.status === 'available') ?? [];
  const onHold = products?.filter(p => p.status === 'on_hold') ?? [];
  const atAuction = products?.filter(p => p.status === 'at_auction') ?? [];
  const sold = products?.filter(p => p.status === 'sold') ?? [];

  const fullName = [consignor.first_name, consignor.last_name].filter(Boolean).join(' ') || '—';

  return (
    <div className="space-y-8 max-w-5xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/consignors')} className="print:hidden">
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="font-display text-2xl tracking-wide text-foreground">{fullName}</h1>
            <p className="text-sm text-muted-foreground font-mono mt-0.5">{consignor.consignor_code}</p>
          </div>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={openEdit}>
            <Pencil size={14} className="mr-1.5" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer size={14} className="mr-1.5" /> Print
          </Button>
        </div>
      </div>

      {/* Consignor Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg border border-border bg-card text-sm">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Email</p>
          <p>{consignor.email || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Phone</p>
          <p>{consignor.phone || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
          <p>{consignor.notes || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Since</p>
          <p>{consignor.created_at ? new Date(consignor.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        <Badge variant="secondary" className="text-sm px-3 py-1">{products?.length ?? 0} total</Badge>
        <Badge variant="outline" className="text-sm px-3 py-1">{available.length} available</Badge>
        <Badge variant="outline" className="text-sm px-3 py-1">{onHold.length} on hold</Badge>
        <Badge variant="outline" className="text-sm px-3 py-1">{atAuction.length} at auction</Badge>
        <Badge variant="default" className="text-sm px-3 py-1">{sold.length} sold</Badge>
      </div>

      {/* Available */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold border-b border-border pb-2">
          Available <span className="text-muted-foreground font-normal text-sm">({available.length})</span>
        </h2>
        <ProductTable products={available} />
      </section>

      {/* On Hold */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold border-b border-border pb-2">
          On Hold <span className="text-muted-foreground font-normal text-sm">({onHold.length})</span>
        </h2>
        <ProductTable products={onHold} />
      </section>

      {/* At Auction */}
      {atAuction.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold border-b border-border pb-2">
            At Auction <span className="text-muted-foreground font-normal text-sm">({atAuction.length})</span>
          </h2>
          <ProductTable products={atAuction} />
        </section>
      )}

      {/* Sold */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold border-b border-border pb-2">
          Sold <span className="text-muted-foreground font-normal text-sm">({sold.length})</span>
        </h2>
        <ProductTable products={sold} showSoldDetails />
      </section>

      {/* Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => !open && setModalOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Consignor</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(form); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>First Name</Label>
                <Input value={form.first_name} onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Last Name</Label>
                <Input value={form.last_name} onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Consignor Code *</Label>
              <Input
                value={form.consignor_code}
                onChange={(e) => setForm(f => ({ ...f, consignor_code: e.target.value.toUpperCase() }))}
                className="font-mono uppercase"
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminConsignorDetail;

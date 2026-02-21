import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useProduct, useSimilarProducts } from '@/hooks/use-products';
import ProductCard from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateSpecSheet } from '@/lib/generate-spec-sheet';
import { FileText } from 'lucide-react';

const ProductDetail = () => {
  const { id } = useParams();
  const { data: product, isLoading } = useProduct(id);
  const { data: similar } = useSimilarProducts(id, product?.category_id);
  const [selectedImage, setSelectedImage] = useState(0);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-12">
          <div className="aspect-square bg-muted animate-pulse rounded-sm" />
          <div className="space-y-4">
            <div className="h-8 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Product not found.</div>;
  }

  const images = product.product_images?.sort((a, b) => a.position - b.position) || [];
  const currentImage = images[selectedImage];

  return (
    <div>
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div>
            <div className="aspect-square overflow-hidden rounded-sm bg-muted mb-3">
              {currentImage ? (
                <img src={currentImage.url} alt={product.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No Image</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 flex-shrink-0 rounded-sm overflow-hidden border-2 transition-colors ${
                      i === selectedImage ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <h1 className="font-display text-3xl tracking-wide text-foreground mb-2">{product.title}</h1>
            {product.designer && (
              <p className="text-muted-foreground text-sm mb-1">
                Designer: <a href={`/designer/${product.designer.id}`} className="hover:text-primary transition-colors">{product.designer.name}</a>
              </p>
            )}
            {product.maker && <p className="text-muted-foreground text-sm mb-1">Maker: {product.maker.name}</p>}
            {product.price && <p className="text-2xl text-foreground font-medium mt-4">${product.price.toLocaleString()}</p>}

            <div className="mt-6 space-y-2 text-sm text-muted-foreground">
              {product.dimensions && <p><span className="text-foreground">Dimensions:</span> {product.dimensions}</p>}
              {product.materials && <p><span className="text-foreground">Materials:</span> {product.materials}</p>}
              {product.condition && <p><span className="text-foreground">Condition:</span> {product.condition}</p>}
              {product.year && <p><span className="text-foreground">Year:</span> {product.year}</p>}
              {product.period && <p><span className="text-foreground">Period:</span> {product.period.name}</p>}
              {product.country && <p><span className="text-foreground">Country:</span> {product.country.name}</p>}
              {product.category && <p><span className="text-foreground">Category:</span> {product.category.name}</p>}
              {product.style && <p><span className="text-foreground">Style:</span> {product.style.name}</p>}
            </div>

            {product.description && (
              <p className="mt-6 text-sm text-muted-foreground leading-relaxed">{product.description}</p>
            )}

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap gap-3">
              {product.status === 'available' && (
                <>
                  <InquiryDialog type="hold" productId={product.id} productTitle={product.title} />
                  <InquiryDialog type="offer" productId={product.id} productTitle={product.title} />
                  <InquiryDialog type="inquiry" productId={product.id} productTitle={product.title} />
                </>
              )}
              <Button
                variant="outline"
                className="text-xs tracking-[0.15em] uppercase"
                onClick={async () => {
                  try {
                    await generateSpecSheet(product, window.location.origin);
                    toast.success('Spec sheet downloaded!');
                  } catch {
                    toast.error('Failed to generate spec sheet');
                  }
                }}
              >
                <FileText size={14} className="mr-1" /> Spec Sheet
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Products */}
      {similar && similar.length > 0 && (
        <section className="container mx-auto px-4 py-16 border-t border-border mt-8">
          <h2 className="font-display text-xl tracking-[0.2em] uppercase text-foreground mb-8">Similar Pieces</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

function InquiryDialog({ type, productId, productTitle }: { type: 'hold' | 'offer' | 'inquiry'; productId: string; productTitle: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', amount: '' });

  const labels = {
    hold: { title: 'Place a Hold', button: 'Request Hold', table: 'product_holds' },
    offer: { title: 'Make an Offer', button: 'Submit Offer', table: 'offers' },
    inquiry: { title: 'Purchase Inquiry', button: 'Send Inquiry', table: 'purchase_inquiries' },
  };
  const config = labels[type];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const record: Record<string, unknown> = {
        product_id: productId,
        customer_name: form.name,
        customer_email: form.email,
        customer_phone: form.phone || null,
        status: 'pending',
      };
      if (type === 'offer') record.amount = parseFloat(form.amount);
      if (type === 'offer' || type === 'inquiry') record.message = form.message || null;
      if (type === 'hold') record.notes = form.message || null;

      const { error } = await supabase.from(config.table).insert(record);
      if (error) throw error;
      toast.success(`${config.title} submitted successfully!`);
      setForm({ name: '', email: '', phone: '', message: '', amount: '' });
      setOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={type === 'hold' ? 'default' : 'outline'} className="text-xs tracking-[0.15em] uppercase">
          {config.button}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wide">{config.title}</DialogTitle>
          <p className="text-sm text-muted-foreground">{productTitle}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Email *</Label>
            <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          {type === 'offer' && (
            <div>
              <Label>Offer Amount ($) *</Label>
              <Input required type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
          )}
          <div>
            <Label>{type === 'hold' ? 'Notes' : 'Message'}</Label>
            <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} />
          </div>
          <Button type="submit" disabled={loading} className="w-full text-xs tracking-[0.15em] uppercase">
            {loading ? 'Submitting...' : config.button}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ProductDetail;

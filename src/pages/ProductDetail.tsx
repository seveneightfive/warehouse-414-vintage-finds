import { useParams } from 'react-router-dom';
import { useState, useRef, useCallback } from 'react';
import { useProduct, useSimilarProducts } from '@/hooks/use-products';
import ProductCard from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { generateSpecSheet } from '@/lib/generate-spec-sheet';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import InquiryDialog from '@/components/InquiryDialog';

const ProductDetail = () => {
  const { id } = useParams();
  const { data: product, isLoading } = useProduct(id);
  const { data: similar } = useSimilarProducts(id, product?.category_id);
  const [selectedImage, setSelectedImage] = useState(0);
  const touchStart = useRef<number | null>(null);

  const images = product?.product_images?.sort((a, b) => a.sort_order - b.sort_order) || [];
  const allImages = images.length > 0 ? images : (product?.featured_image_url ? [{ id: 'featured', image_url: product.featured_image_url, sort_order: 0, alt_text: null, product_id: '', created_at: '' }] : []);
  const currentImage = allImages[selectedImage];

  const goNext = useCallback(() => {
    if (allImages.length > 1) setSelectedImage(i => (i + 1) % allImages.length);
  }, [allImages.length]);
  const goPrev = useCallback(() => {
    if (allImages.length > 1) setSelectedImage(i => (i - 1 + allImages.length) % allImages.length);
  }, [allImages.length]);

  const onTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? goNext() : goPrev(); }
    touchStart.current = null;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-5 py-12">
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
    return <div className="container mx-auto px-5 py-20 text-center text-muted-foreground">Product not found.</div>;
  }

  const detailRows = [
    product.sku && { label: 'SKU', value: product.sku },
    product.product_dimensions && { label: 'DIMENSIONS', value: product.product_dimensions },
    product.materials && { label: 'MATERIALS', value: product.materials },
    product.condition && { label: 'CONDITION', value: product.condition },
    product.year_created && { label: 'YEAR', value: `c. ${product.year_created}` },
    product.period && { label: 'PERIOD', value: product.period.name },
    product.country && { label: 'COUNTRY', value: product.country.name },
    product.category && { label: 'CATEGORY', value: product.category.name },
    product.style && { label: 'STYLE', value: product.style.name },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="pb-24">
      {/* Hero: Gallery + Basic Info */}
      <div className="container mx-auto px-5 py-6 md:py-12">
        <div className="grid md:grid-cols-2 gap-6 md:gap-12">
          {/* Gallery */}
          <div>
            <div
              className="aspect-square overflow-hidden rounded-sm bg-muted mb-3 relative select-none"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {currentImage ? (
                <img src={currentImage.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No Image</div>
              )}
              {product.status === 'sold' && (
                <span className="absolute top-3 left-3 bg-foreground text-background font-display text-xs tracking-[0.15em] px-3 py-1.5">sold</span>
              )}
              {product.status === 'on_hold' && (
                <span className="absolute top-3 left-3 bg-background text-foreground font-display text-xs tracking-[0.15em] px-3 py-1.5">on hold</span>
              )}
              {allImages.length > 1 && (
                <>
                  <button onClick={goPrev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-1.5 transition-colors">
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={goNext} className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-1.5 transition-colors">
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {allImages.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 flex-shrink-0 rounded-sm overflow-hidden border-2 transition-colors ${i === selectedImage ? 'border-primary' : 'border-transparent'}`}
                  >
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div>
            <h1 className="font-display text-2xl md:text-3xl tracking-wide text-foreground mb-2">{product.name}</h1>
            {product.designer && (
              <p className="text-muted-foreground text-base mb-1">
                Designer: <a href={`/designer/${product.designer.id}`} className="hover:text-primary transition-colors">{product.designer.name}</a>
              </p>
            )}
            {product.maker && <p className="text-muted-foreground text-base mb-1">Maker: {product.maker.name}</p>}
            {product.price && (
              <p className="font-display text-xl md:text-2xl text-muted-foreground mt-4">${product.price.toLocaleString()}</p>
            )}
            {product.short_description && (
              <div
                className="text-base leading-relaxed text-foreground mt-4 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: product.short_description }}
              />
            )}
          </div>
        </div>
      </div>

      {/* About This Piece */}
      {(product.short_description || product.long_description) && (
        <section className="container mx-auto px-5 py-12 border-t border-border">
          <div className="grid md:grid-cols-[200px_1fr] gap-6 md:gap-16">
            <h2 className="font-display text-sm tracking-[0.2em] uppercase text-muted-foreground pt-1">about this piece</h2>
            <div
              className="text-base leading-relaxed text-foreground prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: product.long_description || product.short_description || '' }}
            />
          </div>
        </section>
      )}

      {/* Image Row */}
      {allImages.length > 1 && (
        <section className="container mx-auto px-5 py-8">
          <div className="flex gap-3 overflow-x-auto">
            {allImages.map((img) => (
              <div key={img.id} className="flex-shrink-0 w-[calc(25%-9px)] min-w-[200px] aspect-square overflow-hidden rounded-sm bg-muted">
                <img src={img.image_url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Product Details */}
      {detailRows.length > 0 && (
        <section className="container mx-auto px-5 py-12 border-t border-border">
          <div className="grid md:grid-cols-2 gap-6 md:gap-16">
            <div className="hidden md:block">
              {/* On desktop, show featured image next to details */}
              {product.featured_image_url && (
                <img src={product.featured_image_url} alt={product.name} className="w-full h-auto object-cover rounded-sm" />
              )}
            </div>
            <div>
              <h2 className="font-display text-2xl md:text-3xl tracking-wide text-foreground mb-8">product details</h2>
              <div className="space-y-0">
                {detailRows.map((row, i) => (
                  <div key={i} className="py-4 border-b border-border">
                    <p className="font-display text-xs tracking-[0.2em] text-muted-foreground mb-1">{row.label}</p>
                    <p className="text-lg text-foreground">{row.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Similar Products */}
      {similar && similar.length > 0 && (
        <section className="container mx-auto px-5 py-16 border-t border-border">
          <h2 className="font-display text-xl tracking-[0.2em] uppercase text-foreground mb-8">similar pieces</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
        <div className="container mx-auto px-5 py-3">
          <div className="grid grid-cols-4 gap-2">
            {product.status === 'available' ? (
              <>
                <InquiryDialog
                  type="inquiry"
                  productId={product.id}
                  productTitle={product.name}
                  triggerVariant="default"
                  triggerClassName="w-full text-xs tracking-[0.15em] uppercase h-11"
                />
                <InquiryDialog
                  type="offer"
                  productId={product.id}
                  productTitle={product.name}
                  triggerVariant="outline"
                  triggerClassName="w-full text-xs tracking-[0.15em] uppercase h-11"
                />
                <InquiryDialog
                  type="hold"
                  productId={product.id}
                  productTitle={product.name}
                  triggerVariant="outline"
                  triggerClassName="w-full text-xs tracking-[0.15em] uppercase h-11"
                />
              </>
            ) : (
              <>
                <div />
                <div />
                <div />
              </>
            )}
            <Button
              variant="outline"
              className="w-full text-xs tracking-[0.15em] uppercase h-11"
              onClick={async () => {
                try {
                  await generateSpecSheet(product, window.location.origin);
                  toast.success('Spec sheet downloaded!');
                } catch {
                  toast.error('Failed to generate spec sheet');
                }
              }}
            >
              <Download size={14} className="mr-1.5" /> spec sheet
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;

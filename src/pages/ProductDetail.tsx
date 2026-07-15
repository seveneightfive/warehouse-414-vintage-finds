import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useParams, Link } from 'react-router-dom';
import { useState, useRef, useCallback } from 'react';
import { useProduct, useSimilarProducts, useProducts } from '@/hooks/use-products';
import ProductCard from '@/components/ProductCard';
import ProductActions from '@/components/ProductActions';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import ImageLightbox from '@/components/ImageLightbox';
import firstdibsLogo from '@/assets/1stdibs-logo.png';
import ebayLogo from '@/assets/ebay-logo.png';
import chairishLogo from '@/assets/chairish-logo.png';

// ─── Helper: render an attribution prefix ────────────────────────────────────
const Attribution = ({ type }: { type?: string | null }) =>
  type && type !== 'by' ? (
    <span className="italic text-muted-foreground mr-1">{type}</span>
  ) : null;

const formatDescription = (text: string) => {
  if (!text) return '';
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return text
    .split(/\n\n+/)
    .filter(s => s.trim())
    .map(p => `<p>${p.replace(/\n/g, '<br />')}</p>`)
    .join('');
};

// ─── Component ────────────────────────────────────────────────────────────────

const ProductDetail = () => {
  const { slug } = useParams();
  const { data: product, isLoading } = useProduct(slug);

  // ─── Product Count ────────────────────────────────────────────────────────────────

useEffect(() => {
  if (!slug) return;
  const key = `viewed_${slug}`;
  if (sessionStorage.getItem(key)) return; // already counted this session
  sessionStorage.setItem(key, '1');
  supabase.rpc('increment_view_count', { product_slug: slug });
}, [slug]);

  // Collect all category IDs this product belongs to (for similar products)
  const categoryIds = product?.product_categories?.map(
    (pc: any) => pc.category?.id,
  ).filter(Boolean) ?? [];

  // Collect all designer + maker IDs for "more by" sections
  const designerIds = product?.product_designers?.map((pd: any) => pd.designer?.id).filter(Boolean) ?? [];
  const makerIds    = product?.product_makers?.map((pm: any) => pm.maker?.id).filter(Boolean) ?? [];

  // "More by" — use the first designer/maker for the section (most common case)
  // If a product has multiple, we only show one "more by" section to keep the page clean
  const primaryDesignerId = designerIds[0];
  const primaryMakerId    = makerIds[0];
  const primaryDesignerName = product?.product_designers?.[0]?.designer?.name;
  const primaryMakerName    = product?.product_makers?.[0]?.maker?.name;

  const { data: designerProductsRaw } = useProducts(
    primaryDesignerId ? { designer_id: primaryDesignerId } : undefined,
  );
  const { data: makerProductsRaw } = useProducts(
    primaryMakerId ? { maker_id: primaryMakerId } : undefined,
  );

  const designerProducts = designerProductsRaw?.filter((p) => p.id !== product?.id);
  const makerProducts    = makerProductsRaw?.filter((p) => p.id !== product?.id);

const stylePeriodIds = product?.product_styles_periods?.map(
  (psp: any) => psp.styles_periods?.id
).filter(Boolean) ?? [];

const { data: similar } = useSimilarProducts(product?.id, categoryIds, {
  materials: product?.materials,
  stylePeriodIds,
  countryId: product?.country?.id,
  periodCreated: (product as any)?.period_created,
});
  
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const touchStart = useRef<number | null>(null);

  const images = product?.product_images?.sort(
    (a: any, b: any) => a.sort_order - b.sort_order,
  ) || [];
  const allImages =
    images.length > 0
      ? images
      : product?.featured_image_url
        ? [{ id: 'featured', image_url: product.featured_image_url, sort_order: 0, alt_text: null, product_id: '', created_at: '' }]
        : [];
  const currentImage = allImages[selectedImage];

  const goNext = useCallback(() => {
    if (allImages.length > 1) setSelectedImage((i) => (i + 1) % allImages.length);
  }, [allImages.length]);
  const goPrev = useCallback(() => {
    if (allImages.length > 1) setSelectedImage((i) => (i - 1 + allImages.length) % allImages.length);
  }, [allImages.length]);

  const onTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? goNext() : goPrev(); }
    touchStart.current = null;
  };

  // ── Loading / not found ────────────────────────────────────────────────────
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
    return (
      <div className="container mx-auto px-5 py-20 text-center text-muted-foreground">
        Product not found.
      </div>
    );
  }

  const hasDimensions = product.product_dimensions || product.box_dimensions;
  const hasArtwork = product.artwork_artist || product.artwork_title || product.artwork_medium;

  // ── Detail rows (bottom table) ─────────────────────────────────────────────
  // Categories: show all, primary first
  const sortedCategories = [...(product.product_categories ?? [])].sort(
    (a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0),
  );
  const categoryLabel = sortedCategories
    .map((pc: any) => pc.subcategory?.name ?? pc.category?.name)
    .filter(Boolean)
    .join(', ');

  const detailRows = [
    product.materials && { label: 'MATERIALS', value: product.materials },
    product.year_created && { label: 'YEAR', value: `c. ${product.year_created}` },
    product.period_designed && { label: 'PERIOD DESIGNED', value: product.period_designed },
    product.period_created && { label: 'PERIOD CREATED', value: product.period_created },
    product.period && { label: 'PERIOD', value: product.period.name },
    product.country && { label: 'COUNTRY', value: product.country.name },
    product.line && { label: 'LINE', value: product.line },
    categoryLabel && { label: 'CATEGORY', value: categoryLabel },
    product.style && { label: 'STYLE', value: product.style.name },
  ].filter(Boolean) as { label: string; value: string }[];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="pb-24 overflow-x-hidden">
      {/* Hero: Gallery + Basic Info */}
      <div className="container mx-auto px-5 py-6 md:py-12">
        <div className="grid md:grid-cols-2 gap-6 md:gap-12">

          {/* Gallery */}
          <div className="w-full min-w-0 overflow-hidden">
            <div
              className="aspect-square overflow-hidden rounded-sm bg-muted mb-3 relative select-none"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {currentImage ? (
                <img
                  src={currentImage.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => { setLightboxIndex(selectedImage); setLightboxOpen(true); }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                  No Image
                </div>
              )}
              {product.status === 'sold' && (
                <span className="absolute top-3 left-3 bg-foreground text-background font-display text-xs tracking-[0.15em] px-3 py-1.5">sold</span>
              )}
              {product.status === 'on_hold' && (
                <span className="absolute top-3 left-3 bg-background text-foreground font-display text-xs tracking-[0.15em] px-3 py-1.5">on hold</span>
              )}
              {product.status === 'limbo' && (
                <span className="absolute top-3 left-3 bg-background text-foreground font-display text-xs tracking-[0.15em] px-3 py-1.5">limbo</span>
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
                {allImages.map((img: any, i: number) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 flex-shrink-0 rounded-sm overflow-hidden border-2 transition-colors ${
                      i === selectedImage ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="min-w-0">
            {product.status === 'limbo' && (
              <div className="mb-4 border border-border bg-secondary/50 rounded-sm px-4 py-3 flex items-center gap-2">
                <span className="font-display text-sm tracking-wide text-foreground">
                  This item is currently at auction on Chairish
                </span>
                {(product as any).chairish_auction_url && (
                  <a
                    href={(product as any).chairish_auction_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm flex items-center gap-1"
                  >
                    View auction <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}

            <h1 className="font-display text-2xl md:text-3xl tracking-wide text-foreground mb-2">
              {product.name}
            </h1>

            {/* ── Designers (multiple) ── */}
            {product.product_designers && product.product_designers.length > 0 && (
              <div className="mb-2">
                <p className="font-display text-xs tracking-[0.2em] text-muted-foreground mb-0.5">
                  {product.product_designers.length === 1 ? 'designer' : 'designers'}
                </p>
                <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                  {product.product_designers.map((pd: any, i: number) => (
                    <span key={pd.designer?.id ?? i} className="text-base text-foreground flex items-center gap-1">
                      <Attribution type={pd.attribution_type} />
                      {pd.designer ? (
                        <Link to={`/designer/${pd.designer.slug}`} className="hover:text-primary transition-colors">
                          {pd.designer.name}
                        </Link>
                      ) : null}
                      {i < product.product_designers.length - 1 && (
                        <span className="text-muted-foreground">&</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Makers (multiple) ── */}
            {product.product_makers && product.product_makers.length > 0 && (
              <div className="mb-2">
                <p className="font-display text-xs tracking-[0.2em] text-muted-foreground mb-0.5">
                  {product.product_makers.length === 1 ? 'maker' : 'makers'}
                </p>
                <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                  {product.product_makers.map((pm: any, i: number) => (
                    <span key={pm.maker?.id ?? i} className="text-base text-foreground flex items-center gap-1">
                      <Attribution type={pm.attribution_type} />
                      {pm.maker ? (
                        <Link to={`/maker/${pm.maker.slug}`} className="hover:text-primary transition-colors">
                          {pm.maker.name}
                        </Link>
                      ) : null}
                      {i < product.product_makers.length - 1 && (
                        <span className="text-muted-foreground">&</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Styles / Periods (multiple) ── */}
{product.product_styles_periods && product.product_styles_periods.length > 0 && (
  <div className="mb-2">
    <p className="font-display text-xs tracking-[0.2em] text-muted-foreground mb-0.5">
      {product.product_styles_periods.length === 1 ? 'style / period' : 'styles / periods'}
    </p>
    <div className="flex flex-col gap-0.5">
      {product.product_styles_periods.map((psp: any, i: number) => (
        <span key={psp.styles_periods?.id ?? i} className="text-base text-foreground flex items-center gap-1">
          <Attribution type={psp.attribution_type} />
          {psp.styles_periods ? (
            <span>{psp.styles_periods.name}</span>
          ) : null}
        </span>
      ))}
    </div>
  </div>
)}

            {/* ── Price ── */}
            {product.price && product.status !== 'limbo' && (
              <p className="font-display text-xl md:text-2xl text-muted-foreground mt-4">
                {product.sale_price ? (
                  <>
                    <span className="line-through opacity-60 mr-2">${product.price.toLocaleString()}</span>
                    <span className="text-destructive">${product.sale_price.toLocaleString()}</span>
                  </>
                ) : (
                  `$${product.price.toLocaleString()}`
                )}
              </p>
            )}

            {product.short_description && (
              <div
                className="text-base leading-relaxed text-foreground mt-4 prose prose-sm max-w-none md:pr-10 prose-p:mb-4"
                dangerouslySetInnerHTML={{ __html: formatDescription(product.short_description) }}
              />
            )}
          </div>
        </div>
      </div>

      {/* About This Piece */}
      {(product.short_description || product.long_description) && (
        <section className="bg-secondary/50 border-t border-border">
          <div className="container mx-auto px-5 md:pr-24 py-14 md:py-20">
            <h2 className="bg-foreground text-background font-display text-sm tracking-[0.2em] px-4 py-2 inline-block mb-8">
              about this piece
            </h2>
            <div
              className="text-lg leading-[1.9] text-foreground prose max-w-none prose-p:mb-4"
              dangerouslySetInnerHTML={{ __html: formatDescription(product.long_description || product.short_description || '') }}
            />
          </div>
        </section>
      )}

      {/* Image Row */}
      {allImages.length > 1 && (
        <section className="container mx-auto px-5 py-8">
          <div className="flex gap-3 overflow-x-auto">
            {allImages.map((img: any) => (
              <div
                key={img.id}
                className="flex-shrink-0 w-[calc(25%-9px)] min-w-[150px] md:min-w-[200px] aspect-square overflow-hidden rounded-sm bg-muted cursor-pointer"
                onClick={() => { setLightboxIndex(allImages.indexOf(img)); setLightboxOpen(true); }}
              >
                <img src={img.image_url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Product Details */}
{(detailRows.length > 0 || hasDimensions || hasArtwork) && (
  <section className="container mx-auto px-5 py-12 border-t border-border">
    <div className="grid md:grid-cols-2 gap-6 md:gap-16">

      {/* Left col — image + SKU/condition (desktop only) */}
      <div className="hidden md:block space-y-4">
        {product.featured_image_url && (
          <img src={product.featured_image_url} alt={product.name} className="w-full h-auto object-cover rounded-sm" />
        )}
        {(product.sku || product.condition) && (
          <div className="space-y-3 pt-2">
            {product.sku && (
              <div>
                <p className="font-display text-xs tracking-[0.2em] text-muted-foreground mb-1">SKU</p>
                <p className="text-sm text-foreground">{product.sku}</p>
              </div>
            )}
            {product.condition && (
              <div>
                <p className="font-display text-xs tracking-[0.2em] text-muted-foreground mb-1">CONDITION</p>
                <p className="text-sm text-foreground leading-relaxed">{product.condition}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right col — all details */}
      <div>
        <h2 className="bg-foreground text-background font-display text-sm tracking-[0.2em] px-4 py-2 inline-block mb-8">
          product details
        </h2>

        {/* Mobile only: SKU + condition above dimensions */}
        <div className="md:hidden space-y-3 mb-6">
          {product.sku && (
            <div>
              <p className="font-display text-xs tracking-[0.2em] text-muted-foreground mb-1">SKU</p>
              <p className="text-sm text-foreground">{product.sku}</p>
            </div>
          )}
          {product.condition && (
            <div>
              <p className="font-display text-xs tracking-[0.2em] text-muted-foreground mb-1">CONDITION</p>
              <p className="text-sm text-foreground leading-relaxed">{product.condition}</p>
            </div>
          )}
        </div>

        {hasDimensions && (
          <div className="py-4 border-b border-border">
            <p className="font-display text-xs tracking-[0.2em] text-muted-foreground mb-3">DIMENSIONS</p>
            <div className="flex flex-col md:flex-row gap-4 md:gap-0">
              {product.product_dimensions && (
                <div className={product.box_dimensions ? 'flex-1 md:pr-6' : ''}>
                  <p className="font-display text-[10px] tracking-[0.15em] text-muted-foreground mb-1.5">PRODUCT</p>
                  {product.product_dimensions.split('\n').map((line: string, i: number) => (
                    <p key={i} className="text-base text-foreground leading-relaxed">{line}</p>
                  ))}
                </div>
              )}
              {product.product_dimensions && product.box_dimensions && (
                <>
                  <div className="hidden md:block w-px bg-border/50" />
                  <div className="md:hidden h-px bg-border/50" />
                </>
              )}
              {product.box_dimensions && (
                <div className={product.product_dimensions ? 'flex-1 md:pl-6' : ''}>
                  <p className="font-display text-[10px] tracking-[0.15em] text-muted-foreground mb-1.5">BOXED / CRATED</p>
                  {product.box_dimensions.split('\n').map((line: string, i: number) => (
                    <p key={i} className="text-base text-foreground leading-relaxed">{line}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {hasArtwork && (
          <div className="py-4 border-b border-border">
            <p className="font-display text-xs tracking-[0.2em] text-muted-foreground mb-3">ARTWORK</p>
            <div className="space-y-1.5">
              {product.artwork_artist && (
                <p className="text-base text-foreground">
                  <span className="text-muted-foreground">Artist: </span>{product.artwork_artist}
                </p>
              )}
              {product.artwork_title && (
                <p className="text-base text-foreground">
                  <span className="text-muted-foreground">Title: </span>
                  <span className="italic">{product.artwork_title}</span>
                </p>
              )}
              {product.artwork_medium && (
                <p className="text-base text-foreground">
                  <span className="text-muted-foreground">Medium: </span>{product.artwork_medium}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-0">
          {detailRows.map((row, i) => (
            <div key={i} className="py-4 border-b border-border">
              <p className="font-display text-xs tracking-[0.2em] text-muted-foreground mb-1">{row.label}</p>
              <p className="text-lg text-foreground whitespace-pre-line">{row.value}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  </section>
)}
      
      {/* Also Listed On */}
      {(product.firstdibs_url || product.ebay_url || product.chairish_url) && (
        <section className="container mx-auto px-5 py-10 border-t border-border">
          <div className="flex items-center gap-6 flex-wrap">
            <p className="text-muted-foreground text-sm italic">Also listed on:</p>
            {product.firstdibs_url && (
              <a href={product.firstdibs_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                <img src={firstdibsLogo} alt="1stDibs" className="h-5 object-contain" />
                <ExternalLink size={14} className="text-muted-foreground" />
              </a>
            )}
            {product.ebay_url && (
              <a href={product.ebay_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                <img src={ebayLogo} alt="eBay" className="h-5 object-contain" />
                <ExternalLink size={14} className="text-muted-foreground" />
              </a>
            )}
            {product.chairish_url && (
              <a href={product.chairish_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                <img src={chairishLogo} alt="Chairish" className="h-5 object-contain" />
                <ExternalLink size={14} className="text-muted-foreground" />
              </a>
            )}
          </div>
        </section>
      )}

      {/* Similar Products */}
      {similar && similar.length > 0 && (
        <section className="container mx-auto px-5 py-16 border-t border-border">
          <h2 className="font-display text-xl tracking-[0.2em] uppercase text-foreground mb-8">similar pieces</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {similar.map((p: any) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Pieces by Designer — shows primary designer only to avoid duplicate sections */}
      {designerProducts && designerProducts.length > 0 && primaryDesignerName && (
        <section className="container mx-auto px-5 py-16 border-t border-border">
          <h2 className="bg-foreground text-background font-display text-sm tracking-[0.2em] px-4 py-2 inline-block mb-8">
            more from {primaryDesignerName}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {designerProducts.slice(0, 4).map((p: any) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Pieces by Maker — only shown if different from designer section */}
      {makerProducts && makerProducts.length > 0 && primaryMakerName && (
        <section className="container mx-auto px-5 py-16 border-t border-border">
          <h2 className="bg-foreground text-background font-display text-sm tracking-[0.2em] px-4 py-2 inline-block mb-8">
            more from {primaryMakerName}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {makerProducts.slice(0, 4).map((p: any) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40">
        <div className="container mx-auto px-5 py-3 flex items-center gap-3">
          <ProductActions product={product} mode="specsheet" />
          <div className="w-px h-6 bg-border shrink-0" />
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <p className="font-display text-sm tracking-wide text-foreground truncate hidden sm:block">
              {product.name}
            </p>
            {product.price && (
              <p className="font-display text-sm text-muted-foreground shrink-0">
                {product.sale_price ? (
                  <>
                    <span className="line-through opacity-60 mr-1">${product.price.toLocaleString()}</span>
                    <span className="text-destructive">${product.sale_price.toLocaleString()}</span>
                  </>
                ) : (
                  `$${product.price.toLocaleString()}`
                )}
              </p>
            )}
          </div>
          <ProductActions product={product} mode="actions" />
        </div>
      </div>

      <ImageLightbox
        images={allImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </div>
  );
};

export default ProductDetail;

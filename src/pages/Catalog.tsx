import { useSearchParams } from 'react-router-dom';
import { useInfiniteProducts, useFilterOptions } from '@/hooks/use-products';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import ProductCard from '@/components/ProductCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { useState, useMemo } from 'react';

const Catalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const search = searchParams.get('q') || '';
  const designerId = searchParams.get('designer') || '';
  const makerId = searchParams.get('maker') || '';
  const categoryId = searchParams.get('category') || '';
  const styleId = searchParams.get('style') || '';
  const periodId = searchParams.get('period') || '';
  const countryId = searchParams.get('country') || '';

  const setParam = (key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      return next;
    }, { replace: true });
  };

  const { data: filterOptions } = useFilterOptions();
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteProducts({
    search: search || undefined,
    designer_id: designerId || undefined,
    maker_id: makerId || undefined,
    category_id: categoryId || undefined,
    style_id: styleId || undefined,
    period_id: periodId || undefined,
    country_id: countryId || undefined,
  });

  const products = useMemo(
    () => data?.pages.flatMap((page) => page) ?? [],
    [data]
  );

  const sentinelRef = useInfiniteScroll({
    fetchNextPage,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
  });

  const activeFilterCount = [designerId, makerId, categoryId, styleId, periodId, countryId].filter(Boolean).length;

  const clearFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const filterSelect = (
    label: string,
    paramKey: string,
    value: string,
    options: { id: string; name: string }[] | undefined
  ) => (
    <div className="space-y-1.5 font-display">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <Select value={value} onValueChange={(v) => setParam(paramKey, v === '__all__' ? '' : v)}>
        <SelectTrigger className="bg-card border-border text-sm font-display">
          <SelectValue placeholder={`All ${label}s`} />
        </SelectTrigger>
        <SelectContent className="font-display">
          <SelectItem value="__all__">{`All ${label}s`}</SelectItem>
          {options?.map((o) => (
            <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div>
      {/* Sticky toolbar */}
      <div className="sticky top-[6.5rem] z-40 bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={scrollToTop}
            className="font-display text-lg tracking-[0.3em] uppercase text-foreground shrink-0 hover:text-primary transition-colors"
          >
            Catalog
          </button>

          <div className="relative flex-1 max-w-md min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setParam('q', e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setDrawerOpen(true)}
            className="shrink-0 gap-2"
          >
            <SlidersHorizontal size={16} />
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Filter Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-80 font-display">
          <SheetHeader>
            <SheetTitle className="font-display lowercase font-bold">filters</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {filterSelect('Category', 'category', categoryId, filterOptions?.categories)}
            {filterSelect('Style', 'style', styleId, filterOptions?.styles)}
            {filterSelect('Designer', 'designer', designerId, filterOptions?.designers)}
            {filterSelect('Maker', 'maker', makerId, filterOptions?.makers)}
            {filterSelect('Period', 'period', periodId, filterOptions?.periods)}
            {filterSelect('Country', 'country', countryId, filterOptions?.countries)}
          </div>
          <div className="mt-6 flex items-center gap-3">
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground font-display">
                <X size={14} /> Clear all filters
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setDrawerOpen(false)}
              className="ml-auto font-display"
            >
              View Products{products.length > 0 ? ` (${products.length}${hasNextPage ? '+' : ''})` : ''}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Product Grid */}
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse rounded-sm" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-20 space-y-4">
            <p className="text-sm text-muted-foreground">Something went wrong loading products.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            {/* Loading more skeletons */}
            {isFetchingNextPage && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-muted animate-pulse rounded-sm" />
                ))}
              </div>
            )}

            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="h-1" />

            {/* End of results */}
            {!hasNextPage && products.length > 0 && (
              <p className="text-center text-muted-foreground text-xs py-8 tracking-widest uppercase">
                You've seen all products
              </p>
            )}
          </>
        ) : (
          <p className="text-center text-muted-foreground py-20 text-sm">No products found.</p>
        )}
      </div>
    </div>
  );
};

export default Catalog;

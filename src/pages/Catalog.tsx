import { useState } from 'react';
import { useProducts, useFilterOptions } from '@/hooks/use-products';
import ProductCard from '@/components/ProductCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Search, X, SlidersHorizontal } from 'lucide-react';

const Catalog = () => {
  const [search, setSearch] = useState('');
  const [designerId, setDesignerId] = useState<string>('');
  const [makerId, setMakerId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [styleId, setStyleId] = useState<string>('');
  const [periodId, setPeriodId] = useState<string>('');
  const [countryId, setCountryId] = useState<string>('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: filterOptions } = useFilterOptions();
  const { data: products, isLoading } = useProducts({
    search: search || undefined,
    designer_id: designerId || undefined,
    maker_id: makerId || undefined,
    category_id: categoryId || undefined,
    style_id: styleId || undefined,
    period_id: periodId || undefined,
    country_id: countryId || undefined,
  });

  const activeFilterCount = [designerId, makerId, categoryId, styleId, periodId, countryId].filter(Boolean).length;

  const clearFilters = () => {
    setSearch('');
    setDesignerId('');
    setMakerId('');
    setCategoryId('');
    setStyleId('');
    setPeriodId('');
    setCountryId('');
  };

  const filterSelect = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    options: { id: string; name: string }[] | undefined
  ) => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-card border-border text-sm">
          <SelectValue placeholder={`All ${label}s`} />
        </SelectTrigger>
        <SelectContent>
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

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
        <SheetContent side="right" className="w-80">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {filterSelect('Designer', designerId, (v) => setDesignerId(v === '__all__' ? '' : v), filterOptions?.designers)}
            {filterSelect('Maker', makerId, (v) => setMakerId(v === '__all__' ? '' : v), filterOptions?.makers)}
            {filterSelect('Category', categoryId, (v) => setCategoryId(v === '__all__' ? '' : v), filterOptions?.categories)}
            {filterSelect('Style', styleId, (v) => setStyleId(v === '__all__' ? '' : v), filterOptions?.styles)}
            {filterSelect('Period', periodId, (v) => setPeriodId(v === '__all__' ? '' : v), filterOptions?.periods)}
            {filterSelect('Country', countryId, (v) => setCountryId(v === '__all__' ? '' : v), filterOptions?.countries)}
          </div>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-6 gap-1 text-muted-foreground">
              <X size={14} /> Clear all filters
            </Button>
          )}
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
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-20 text-sm">No products found.</p>
        )}
      </div>
    </div>
  );
};

export default Catalog;

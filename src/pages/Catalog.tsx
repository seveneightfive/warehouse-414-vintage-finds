import { useState } from 'react';
import { useProducts, useFilterOptions } from '@/hooks/use-products';
import ProductCard from '@/components/ProductCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';

const Catalog = () => {
  const [search, setSearch] = useState('');
  const [designerId, setDesignerId] = useState<string>('');
  const [makerId, setMakerId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [styleId, setStyleId] = useState<string>('');
  const [periodId, setPeriodId] = useState<string>('');
  const [countryId, setCountryId] = useState<string>('');

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

  const hasFilters = search || designerId || makerId || categoryId || styleId || periodId || countryId;

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
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-card border-border text-sm h-9">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">{`All ${label}s`}</SelectItem>
        {options?.map((o) => (
          <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="font-display text-3xl tracking-[0.3em] uppercase text-foreground mb-8">Catalog</h1>

      {/* Filters */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {filterSelect('Designer', designerId, (v) => setDesignerId(v === '__all__' ? '' : v), filterOptions?.designers)}
          {filterSelect('Maker', makerId, (v) => setMakerId(v === '__all__' ? '' : v), filterOptions?.makers)}
          {filterSelect('Category', categoryId, (v) => setCategoryId(v === '__all__' ? '' : v), filterOptions?.categories)}
          {filterSelect('Style', styleId, (v) => setStyleId(v === '__all__' ? '' : v), filterOptions?.styles)}
          {filterSelect('Period', periodId, (v) => setPeriodId(v === '__all__' ? '' : v), filterOptions?.periods)}
          {filterSelect('Country', countryId, (v) => setCountryId(v === '__all__' ? '' : v), filterOptions?.countries)}
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* Grid */}
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
  );
};

export default Catalog;

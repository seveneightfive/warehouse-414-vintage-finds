import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, Package, Users, ShoppingBag, Palette, Tag, Globe, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';

type SearchResult = {
  id: string;
  name: string;
  type: string;
  path: string;
  icon: typeof Package;
};

const SEARCHABLE_TABLES = [
  { table: 'products', type: 'Product', path: '/admin/products', icon: Package, nameCol: 'name' },
  { table: 'designers', type: 'Designer', path: '/admin/designers', icon: Users, nameCol: 'name' },
  { table: 'makers', type: 'Maker', path: '/admin/makers', icon: ShoppingBag, nameCol: 'name' },
  { table: 'categories', type: 'Category', path: '/admin/categories', icon: Layers, nameCol: 'name' },
  { table: 'styles', type: 'Style', path: '/admin/styles', icon: Palette, nameCol: 'name' },
  { table: 'periods', type: 'Period', path: '/admin/periods', icon: Tag, nameCol: 'name' },
  { table: 'countries', type: 'Country', path: '/admin/countries', icon: Globe, nameCol: 'name' },
];

const AdminSearch = () => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: results = [] } = useQuery<SearchResult[]>({
    queryKey: ['admin-search', query],
    queryFn: async () => {
      if (query.length < 2) return [];
      const promises = SEARCHABLE_TABLES.map(async ({ table, type, path, icon, nameCol }) => {
        const { data } = await supabase
          .from(table)
          .select('id, name')
          .ilike(nameCol, `%${query}%`)
          .limit(5);
        return (data || []).map((item: { id: string; name: string }) => ({
          id: item.id,
          name: item.name,
          type,
          path: table === 'products' ? `${path}/${item.id}` : path,
          icon,
        }));
      });
      return (await Promise.all(promises)).flat();
    },
    enabled: query.length >= 2,
  });

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Search everything…"
          className="pl-9 h-8 text-sm bg-muted/50 border-border"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 max-h-72 overflow-y-auto">
          {results.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => handleSelect(r)}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
            >
              <r.icon size={14} className="text-muted-foreground shrink-0" />
              <span className="truncate text-foreground">{r.name}</span>
              <span className="ml-auto text-xs text-muted-foreground shrink-0">{r.type}</span>
            </button>
          ))}
        </div>
      )}
      {open && query.length >= 2 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 p-3 text-sm text-muted-foreground">
          No results found
        </div>
      )}
    </div>
  );
};

export default AdminSearch;

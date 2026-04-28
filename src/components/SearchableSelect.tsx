import { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X, ChevronDown } from 'lucide-react';

interface SearchableSelectProps {
  label: string;
  value: string;
  options: { id: string; name: string }[] | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchableSelect = ({ label, value, options, onChange, placeholder }: SearchableSelectProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = useMemo(() => {
    if (!value) return '';
    return options?.find(o => o.id === value)?.name || '';
  }, [value, options]);

  const filtered = useMemo(() => {
    if (!options) return [];
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter(o => o.name.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="space-y-1.5 font-display" ref={containerRef}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setOpen(!open);
            if (!open) setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="flex items-center justify-between w-full h-10 px-3 py-2 text-sm rounded-md border border-border bg-card text-left font-display hover:bg-accent/50 transition-colors"
        >
          <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
            {selectedLabel || placeholder || `All ${label}s`}
          </span>
          <div className="flex items-center gap-1">
            {value && (
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                  setQuery('');
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </span>
            )}
            <ChevronDown size={14} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${label.toLowerCase()}s...`}
                  className="h-8 pl-8 text-sm bg-background border-border font-display"
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto p-1">
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={`w-full text-left px-3 py-2 text-sm rounded-sm transition-colors font-display ${
                  !value ? 'bg-black text-white' : 'hover:bg-accent'
                }`}
              >
                All {label}s
              </button>
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">No results found</p>
              ) : (
                filtered.map(o => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => handleSelect(o.id)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-sm transition-colors font-display ${
                      value === o.id ? 'bg-black text-white' : 'hover:bg-accent'
                    }`}
                  >
                    {o.name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchableSelect;

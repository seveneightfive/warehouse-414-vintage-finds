import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { ArrowLeft, Save, Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import ProductImageManager from '@/components/ProductImageManager';

const SOLD_ON_OPTIONS = ['1stDibs', 'Chairish', 'eBay', 'Website', 'Direct', 'Other'];

const STATUS_OPTIONS = [
  { value: 'draft',      label: 'Draft'       },
  { value: 'available',  label: 'Available'   },
  { value: 'on_hold',    label: 'On Hold'     },
  { value: 'at_auction', label: 'At Auction'  },
  { value: 'sold',       label: 'Sold'        },
  { value: 'inventory',  label: 'Inventory'   },
];

const ATTRIBUTION_OPTIONS = [
  { value: 'by',              label: 'by'              },
  { value: 'attributed to',   label: 'attributed to'   },
  { value: 'in the style of', label: 'in the style of' },
];

const STYLES_PERIODS_ATTRIBUTION_OPTIONS = [
  { value: 'in the style of', label: 'in the style of' },
  { value: 'of the period',   label: 'of the period'   },
];

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full bg-foreground px-4 py-2.5">
    <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-background">{children}</h2>
  </div>
);

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-foreground/70">{children}</span>
);

type DesignerRow = { designer_id: string | null; attribution_type: string };
type MakerRow    = { maker_id:    string | null; attribution_type: string };
type StylesPeriodsRow = { style_period_id: string | null; attribution_type: string };
type CategoryRow = {
  category_id:        string | null;
  subcategory_id:     string | null;
  sub_subcategory_id: string | null;
};

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().nullable().optional(),
  consignor_id: z.coerce.number().nullable().optional(),
  line: z.string().nullable().optional(),
  short_description: z.string().nullable().optional(),
  long_description: z.string().nullable().optional(),
  price: z.coerce.number().nullable().optional(),
  sale_price: z.coerce.number().nullable().optional(),
  status: z.enum(['draft', 'available', 'on_hold', 'sold', 'inventory', 'at_auction']).default('draft'),
  designer_id: z.string().nullable().optional(),
  maker_id: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
  subcategory_id: z.string().nullable().optional(),
  country_id: z.string().nullable().optional(),
  designer_attribution: z.string().nullable().optional(),
  maker_attribution: z.string().nullable().optional(),
  product_dimensions: z.string().nullable().optional(),
  box_dimensions: z.string().nullable().optional(),
  dimension_notes: z.string().nullable().optional(),
  materials: z.string().nullable().optional(),
  condition: z.string().nullable().optional(),
  year_created: z.string().nullable().optional(),
  period_designed: z.string().nullable().optional(),
  period_created: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
  firstdibs_url: z.string().url().nullable().optional().or(z.literal('')),
  chairish_url: z.string().url().nullable().optional().or(z.literal('')),
  ebay_url: z.string().url().nullable().optional().or(z.literal('')),
  chairish_auction_url: z.string().url().nullable().optional().or(z.literal('')),
  sold_on:              z.string().nullable().optional(),
  notes:                z.string().nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

const useTaxonomyOptions = () => {
  const fetch = (table: string) => async () => {
    const { data, error } = await supabase.from(table).select('id, name').order('name');
    if (error) throw error;
    return data as { id: string; name: string }[];
  };
  return {
    designers:  useQuery({ queryKey: ['taxonomy-designers'],  queryFn: fetch('designers')  }).data,
    makers:     useQuery({ queryKey: ['taxonomy-makers'],     queryFn: fetch('makers')     }).data,
    categories: useQuery({ queryKey: ['taxonomy-categories'], queryFn: fetch('categories') }).data,
    stylesPeriods: useQuery({ queryKey: ['taxonomy-styles-periods'], queryFn: fetch('styles_periods') }).data,
    countries:  useQuery({ queryKey: ['taxonomy-countries'],  queryFn: fetch('countries')  }).data,
  };
};

const InlineCombobox = ({ value, onChange, options, placeholder, className }: {
  value: string | null;
  onChange: (id: string | null) => void;
  options?: { id: string; name: string }[];
  placeholder: string;
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const selectedName = options?.find((o) => o.id === value)?.name;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className={cn('justify-between font-normal min-w-0', !value && 'text-muted-foreground', className)}>
          <span className="truncate">{selectedName || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Search…" />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__none" onSelect={() => { onChange(null); setOpen(false); }}>
                <Check className={cn('mr-2 h-4 w-4', !value ? 'opacity-100' : 'opacity-0')} /> None
              </CommandItem>
              {options?.map((o) => (
                <CommandItem key={o.id} value={o.name} onSelect={() => { onChange(o.id); setOpen(false); }}>
                  <Check className={cn('mr-2 h-4 w-4', value === o.id ? 'opacity-100' : 'opacity-0')} /> {o.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const SubcategoryCombobox = ({ categoryId, value, onChange }: {
  categoryId: string; value: string | null; onChange: (id: string | null) => void;
}) => {
  const { data } = useQuery({
    queryKey: ['taxonomy-subcategories', categoryId],
    queryFn: async () => {
      const { data, error } = await supabase.from('subcategories').select('id, name').eq('category_id', categoryId).is('parent_id', null).order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: !!categoryId,
  });
  if (!data || data.length === 0) return null;
  return <InlineCombobox value={value} onChange={onChange} options={data} placeholder="Subcategory…" className="flex-1 min-w-[130px]" />;
};

const SubSubcategoryCombobox = ({ subcategoryId, value, onChange }: {
  subcategoryId: string; value: string | null; onChange: (id: string | null) => void;
}) => {
  const { data } = useQuery({
    queryKey: ['taxonomy-sub-subcategories', subcategoryId],
    queryFn: async () => {
      const { data, error } = await supabase.from('subcategories').select('id, name').eq('parent_id', subcategoryId).order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: !!subcategoryId,
  });
  if (!data || data.length === 0) return null;
  return <InlineCombobox value={value} onChange={onChange} options={data} placeholder="Specific type…" className="flex-1 min-w-[130px]" />;
};

const AdminProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isEditing = !!id;
  const taxonomy = useTaxonomyOptions();
  const hasHydratedRef = useRef(false);

  const returnStatus = new URLSearchParams(location.search).get('from') ?? null;
  const backUrl = returnStatus ? `/admin/products?status=${returnStatus}` : '/admin/products';

  const [designers,  setDesigners]  = useState<DesignerRow[]>([{ designer_id: null, attribution_type: 'by' }]);
  const [makers,     setMakers]     = useState<MakerRow[]>([{ maker_id: null, attribution_type: 'by' }]);
  const [stylesPeriods, setStylesPeriods] = useState<StylesPeriodsRow[]>([{ style_period_id: null, attribution_type: 'of the period' }]);
  const [categories, setCategories] = useState<CategoryRow[]>([{ category_id: null, subcategory_id: null, sub_subcategory_id: null }]);

  const { data: consignors } = useQuery({
    queryKey: ['consignors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('consignors').select('id, first_name, last_name, consignor_code').order('consignor_code');
      if (error) throw error;
      return data as { id: number; first_name: string | null; last_name: string | null; consignor_code: string | null }[];
    },
  });

  // Default new products to 'draft' so they don't appear on the website
  // until images are uploaded.
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', status: 'draft' },
  });
  const draftKey = `product-draft-${id ?? 'new'}`;

  useEffect(() => {
    const sub = form.watch((values) => {
      localStorage.setItem(draftKey, JSON.stringify({ form: values, designers, makers, stylesPeriods, categories }));
    });
    return () => sub.unsubscribe();
  }, [form, draftKey, designers, makers, stylesPeriods, categories]);

  useEffect(() => {
    if (isEditing) return;
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        form.reset(p.form ?? p);
        if (p.designers)  setDesigners(p.designers);
        if (p.makers)     setMakers(p.makers);
        if (p.stylesPeriods) setStylesPeriods(p.stylesPeriods);
        if (p.categories) setCategories(p.categories);
        toast.info('Draft restored', { description: 'Your unsaved changes were recovered.' });
      } catch {
        // ignore corrupt drafts
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const watchStatus = form.watch('status');
  const auctionUrlRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (watchStatus === 'at_auction') {
      setTimeout(() => auctionUrlRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }, [watchStatus]);

  const { data: product, isLoading } = useQuery({
    queryKey: ['admin-product', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('products')
        .select(`*, product_designers(designer_id, attribution_type), product_makers(maker_id, attribution_type), product_categories(category_id, subcategory_id, is_primary), product_styles_periods(style_period_id, attribution_type)`)
        .eq('id', id!).single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  const { data: allSubcategories } = useQuery({
    queryKey: ['taxonomy-all-subcategories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subcategories').select('id, name, category_id, parent_id');
      if (error) throw error;
      return data as { id: string; name: string; category_id: string | null; parent_id: string | null }[];
    },
  });

  useEffect(() => {
    if (!product || !allSubcategories) return;
    if (hasHydratedRef.current) return;
    hasHydratedRef.current = true;

    const values: Partial<FormValues> = {};
    for (const key of Object.keys(schema.shape)) {
      (values as Record<string, unknown>)[key] = (product as Record<string, unknown>)[key] ?? '';
    }
    values.price        = product.price ?? undefined;
    values.sale_price   = (product as any).sale_price ?? undefined;
    values.consignor_id = (product as any).consignor_id ?? undefined;
    values.line         = (product as any).line ?? undefined;
    const rawTags = (product as any).tags;
    values.tags = Array.isArray(rawTags) ? (rawTags as string[]).join(', ') : '';
    form.reset(values as FormValues);

    const dbD: DesignerRow[] = (product as any).product_designers?.map((r: any) => ({ designer_id: r.designer_id, attribution_type: r.attribution_type || 'by' })) ?? [];
    setDesigners(dbD.length > 0 ? dbD : [{ designer_id: null, attribution_type: 'by' }]);

    const dbM: MakerRow[] = (product as any).product_makers?.map((r: any) => ({ maker_id: r.maker_id, attribution_type: r.attribution_type || 'by' })) ?? [];
    setMakers(dbM.length > 0 ? dbM : [{ maker_id: null, attribution_type: 'by' }]);

    const dbSP: StylesPeriodsRow[] = (product as any).product_styles_periods?.map((r: any) => ({ style_period_id: r.style_period_id, attribution_type: r.attribution_type || 'of the period' })) ?? [];
    setStylesPeriods(dbSP.length > 0 ? dbSP : [{ style_period_id: null, attribution_type: 'of the period' }]);

    const dbC: CategoryRow[] = [...((product as any).product_categories ?? [])]
      .sort((a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
      .map((r: any) => {
        const savedSubId = r.subcategory_id ?? null;
        if (!savedSubId) return { category_id: r.category_id, subcategory_id: null, sub_subcategory_id: null };
        const sub = allSubcategories.find((s) => s.id === savedSubId);
        if (sub?.parent_id) return { category_id: r.category_id, subcategory_id: sub.parent_id, sub_subcategory_id: savedSubId };
        return { category_id: r.category_id, subcategory_id: savedSubId, sub_subcategory_id: null };
      });
    setCategories(dbC.length > 0 ? dbC : [{ category_id: null, subcategory_id: null, sub_subcategory_id: null }]);
  }, [product, allSubcategories, form]);

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  // Try the base slug first; on collision, retry with a 4-digit suffix up to 5 times.
  // Last resort uses Date.now() which is essentially guaranteed unique.
  const ensureUniqueSlug = async (baseSlug: string): Promise<string> => {
    let candidate = baseSlug;
    for (let attempt = 0; attempt < 6; attempt++) {
      const { data } = await supabase.from('products').select('id').eq('slug', candidate).maybeSingle();
      if (!data) return candidate;
      candidate = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    return `${baseSlug}-${Date.now()}`;
  };

  const performSave = async (values: FormValues): Promise<string> => {
    // Separate the form's `tags` (string) from the DB column (text[]).
    const { tags: tagsString, ...rest } = values;
    const payload: Record<string, unknown> = { ...rest };

    payload.tags = typeof tagsString === 'string' && tagsString.trim()
      ? tagsString.split(',').map((t) => t.trim()).filter(Boolean)
      : null;

    // Empty strings → null for cleaner DB rows.
    for (const [k, v] of Object.entries(payload)) {
      if (v === '' || v === undefined) payload[k] = null;
    }

    const firstD = designers.find((d) => d.designer_id);
    const firstM = makers.find((m) => m.maker_id);
    const firstC = categories.find((c) => c.category_id);

    payload.designer_id          = firstD?.designer_id ?? null;
    payload.designer_attribution = firstD?.attribution_type ?? null;
    payload.maker_id             = firstM?.maker_id ?? null;
    payload.maker_attribution    = firstM?.attribution_type ?? null;
    payload.category_id          = firstC?.category_id ?? null;
    payload.subcategory_id       = firstC?.sub_subcategory_id ?? firstC?.subcategory_id ?? null;

    if (!isEditing && values.name) {
      payload.slug = await ensureUniqueSlug(generateSlug(values.name));
    }

    let productId: string;
    if (isEditing) {
      const { error } = await supabase.from('products').update(payload).eq('id', id!);
      if (error) throw error;
      productId = id!;
    } else {
      const { data, error } = await supabase.from('products').insert(payload).select('id').single();
      if (error) throw error;
      productId = data.id;
    }

    // Replace junction rows. With RLS allowing authenticated INSERT/DELETE on
    // these tables, all of these should succeed.
    await supabase.from('product_designers').delete().eq('product_id', productId);
    const vD = designers.filter((d) => d.designer_id);
    if (vD.length > 0) {
      const { error } = await supabase.from('product_designers').insert(vD.map((d) => ({
        product_id: productId,
        designer_id: d.designer_id,
        attribution_type: d.attribution_type || 'by',
      })));
      if (error) throw error;
    }

    await supabase.from('product_makers').delete().eq('product_id', productId);
    const vM = makers.filter((m) => m.maker_id);
    if (vM.length > 0) {
      const { error } = await supabase.from('product_makers').insert(vM.map((m) => ({
        product_id: productId,
        maker_id: m.maker_id,
        attribution_type: m.attribution_type || 'by',
      })));
      if (error) throw error;
    }

    await supabase.from('product_categories').delete().eq('product_id', productId);
    const vC = categories.filter((c) => c.category_id);
    if (vC.length > 0) {
      const { error } = await supabase.from('product_categories').insert(vC.map((c, i) => ({
        product_id:     productId,
        category_id:    c.category_id,
        subcategory_id: c.sub_subcategory_id ?? c.subcategory_id ?? null,
        is_primary:     i === 0,
      })));
      if (error) throw error;
    }

    await supabase.from('product_styles_periods').delete().eq('product_id', productId);
    const vSP = stylesPeriods.filter((sp) => sp.style_period_id);
    if (vSP.length > 0) {
      const { error } = await supabase.from('product_styles_periods').insert(vSP.map((sp) => ({
        product_id: productId,
        style_period_id: sp.style_period_id,
        attribution_type: sp.attribution_type || 'of the period',
      })));
      if (error) throw error;
    }

    return productId;
  };

  const onSuccess = (newId: string) => {
    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    queryClient.invalidateQueries({ queryKey: ['admin-product-counts'] });
    localStorage.removeItem(draftKey);

    if (isEditing) {
      queryClient.invalidateQueries({ queryKey: ['admin-product', newId] });
      toast.success('Product updated');
      navigate(`/admin/products?highlight=${id}&status=${form.getValues('status')}`);
    } else {
      // After creating, send the user to the edit page so they can upload images.
      toast.success('Product created — now add images');
      navigate(`/admin/products/${newId}`);
    }
  };

  const saveMutation = useMutation({
    mutationFn: (v: FormValues) => performSave(v),
    onSuccess: (newId) => onSuccess(newId),
    onError: (err: Error) => toast.error(err.message),
  });

  if (isEditing && isLoading) return <p className="text-muted-foreground">Loading…</p>;

  const ComboboxField = ({ name, label, options }: { name: keyof FormValues; label: string; options?: { id: string; name: string }[] }) => {
    const [open, setOpen] = useState(false);
    return (
      <FormField control={form.control} name={name} render={({ field }) => {
        const selectedName = options?.find((o) => o.id === field.value)?.name;
        return (
          <FormItem className="flex flex-col">
            <FormLabel><FieldLabel>{label}</FieldLabel></FormLabel>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button variant="outline" role="combobox" className={cn('w-full justify-between font-normal', !field.value && 'text-muted-foreground')}>
                    {selectedName || `Select ${label.toLowerCase()}`}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder={`Search ${label.toLowerCase()}…`} />
                  <CommandList>
                    <CommandEmpty>No results.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem value="__none" onSelect={() => { field.onChange(null); setOpen(false); }}>
                        <Check className={cn('mr-2 h-4 w-4', !field.value ? 'opacity-100' : 'opacity-0')} /> None
                      </CommandItem>
                      {options?.map((o) => (
                        <CommandItem key={o.id} value={o.name} onSelect={() => { field.onChange(o.id); setOpen(false); }}>
                          <Check className={cn('mr-2 h-4 w-4', field.value === o.id ? 'opacity-100' : 'opacity-0')} /> {o.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        );
      }} />
    );
  };

  const consignorLabel = (c: { first_name: string | null; last_name: string | null; consignor_code: string | null }) => {
    const name = [c.first_name, c.last_name].filter(Boolean).join(' ');
    return name ? `${c.consignor_code} — ${name}` : (c.consignor_code ?? '—');
  };

  const isBusy = saveMutation.isPending;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(backUrl)}>
          <ArrowLeft size={18} />
        </Button>
        <h1 className="font-display text-2xl tracking-wide text-foreground">
          {isEditing ? 'Edit Product' : 'New Product'}
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-0">

          {/* ── BASIC INFO ── */}
          <section className="pb-8 space-y-4">
            <SectionHeading>Basic Info</SectionHeading>

            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel><FieldLabel>Name *</FieldLabel></FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="sku" render={({ field }) => (
                <FormItem>
                  <FormLabel><FieldLabel>SKU</FieldLabel></FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel><FieldLabel>Status</FieldLabel></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {!isEditing && watchStatus === 'draft' && (
              <p className="text-xs text-muted-foreground">
                New products default to <strong>Draft</strong> so they don't appear on the website. Change to <strong>Available</strong> after uploading images.
              </p>
            )}

            {watchStatus === 'at_auction' && (
              <p className="text-xs text-muted-foreground">
                Don't forget to add the{' '}
                <button type="button" className="underline text-primary" onClick={() => auctionUrlRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Chairish Auction URL</button>{' '}below.
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem>
                  <FormLabel><FieldLabel>Price</FieldLabel></FormLabel>
                  <FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="sale_price" render={({ field }) => (
                <FormItem>
                  <FormLabel><FieldLabel>Sale Price</FieldLabel></FormLabel>
                  <FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {watchStatus === 'sold' && (
              <FormField control={form.control} name="sold_on" render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel><FieldLabel>Sold On</FieldLabel></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value as string || ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {SOLD_ON_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {/* Consignor */}
            <FormField control={form.control} name="consignor_id" render={({ field }) => (
              <FormItem className="max-w-xs">
                <FormLabel><FieldLabel>Consignor</FieldLabel></FormLabel>
                <Select
                  onValueChange={(val) => field.onChange(val === '__none' ? null : Number(val))}
                  value={field.value != null ? String(field.value) : '__none'}
                >
                  <FormControl><SelectTrigger><SelectValue placeholder="Select consignor" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {consignors?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{consignorLabel(c)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="short_description" render={({ field }) => (
              <FormItem>
                <FormLabel><FieldLabel>Short Description</FieldLabel></FormLabel>
                <FormControl><Textarea rows={5} {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="long_description" render={({ field }) => (
              <FormItem>
                <FormLabel><FieldLabel>Long Description</FieldLabel></FormLabel>
                <FormControl><Textarea rows={10} {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </section>

          {/* ── TAXONOMY & ATTRIBUTION ── */}
          <section className="pb-8 space-y-5">
            <SectionHeading>Taxonomy &amp; Attribution</SectionHeading>
            <p className="text-xs text-muted-foreground">Attribution precedes the name, e.g. "by", "in the style of", "attributed to"</p>

            {/* Categories */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-foreground/70">Categories</p>
                <span className="text-xs text-muted-foreground">(first row is the primary)</span>
              </div>
              {categories.map((row, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  {i === 0
                    ? <span className="text-[10px] font-semibold tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap">PRIMARY</span>
                    : <span className="w-[58px] shrink-0" />
                  }
                  <InlineCombobox value={row.category_id} onChange={(val) => setCategories((prev) => prev.map((r, j) => j === i ? { ...r, category_id: val, subcategory_id: null, sub_subcategory_id: null } : r))} options={taxonomy.categories} placeholder="Category…" className="flex-1 min-w-[130px]" />
                  {row.category_id && <SubcategoryCombobox categoryId={row.category_id} value={row.subcategory_id} onChange={(val) => setCategories((prev) => prev.map((r, j) => j === i ? { ...r, subcategory_id: val, sub_subcategory_id: null } : r))} />}
                  {row.subcategory_id && <SubSubcategoryCombobox subcategoryId={row.subcategory_id} value={row.sub_subcategory_id} onChange={(val) => setCategories((prev) => prev.map((r, j) => j === i ? { ...r, sub_subcategory_id: val } : r))} />}
                  {categories.length > 1 && (
                    <button type="button" onClick={() => setCategories((prev) => prev.filter((_, j) => j !== i))} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"><X size={16} /></button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setCategories((prev) => [...prev, { category_id: null, subcategory_id: null, sub_subcategory_id: null }])}>
                <Plus size={14} /> Add another category
              </Button>
            </div>

            {/* Designers */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-foreground/70">Designers</p>
              {designers.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select value={row.attribution_type || 'by'} onValueChange={(val) => setDesigners((prev) => prev.map((r, j) => j === i ? { ...r, attribution_type: val } : r))}>
                    <SelectTrigger className="w-[25%] shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>{ATTRIBUTION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <InlineCombobox value={row.designer_id} onChange={(val) => setDesigners((prev) => prev.map((r, j) => j === i ? { ...r, designer_id: val } : r))} options={taxonomy.designers} placeholder="Select designer…" className="flex-1" />
                  <div className="w-[25%] flex justify-end items-center gap-1 shrink-0">
                    {i === designers.length - 1 && <Button type="button" variant="outline" size="sm" className="gap-1 text-xs whitespace-nowrap" onClick={() => setDesigners((prev) => [...prev, { designer_id: null, attribution_type: 'by' }])}><Plus size={12} /> Add</Button>}
                    {designers.length > 1 && <button type="button" onClick={() => setDesigners((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors p-1"><X size={16} /></button>}
                  </div>
                </div>
              ))}
            </div>

            {/* Makers */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-foreground/70">Makers</p>
              {makers.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select value={row.attribution_type || 'by'} onValueChange={(val) => setMakers((prev) => prev.map((r, j) => j === i ? { ...r, attribution_type: val } : r))}>
                    <SelectTrigger className="w-[25%] shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>{ATTRIBUTION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <InlineCombobox value={row.maker_id} onChange={(val) => setMakers((prev) => prev.map((r, j) => j === i ? { ...r, maker_id: val } : r))} options={taxonomy.makers} placeholder="Select maker…" className="flex-1" />
                  <div className="w-[25%] flex justify-end items-center gap-1 shrink-0">
                    {i === makers.length - 1 && <Button type="button" variant="outline" size="sm" className="gap-1 text-xs whitespace-nowrap" onClick={() => setMakers((prev) => [...prev, { maker_id: null, attribution_type: 'by' }])}><Plus size={12} /> Add</Button>}
                    {makers.length > 1 && <button type="button" onClick={() => setMakers((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors p-1"><X size={16} /></button>}
                  </div>
                </div>
              ))}
            </div>

            {/* Styles / Periods */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-foreground/70">Styles / Periods</p>
              {stylesPeriods.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select value={row.attribution_type || 'of the period'} onValueChange={(val) => setStylesPeriods((prev) => prev.map((r, j) => j === i ? { ...r, attribution_type: val } : r))}>
                    <SelectTrigger className="w-[25%] shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>{STYLES_PERIODS_ATTRIBUTION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <InlineCombobox value={row.style_period_id} onChange={(val) => setStylesPeriods((prev) => prev.map((r, j) => j === i ? { ...r, style_period_id: val } : r))} options={taxonomy.stylesPeriods} placeholder="Select style/period…" className="flex-1" />
                  <div className="w-[25%] flex justify-end items-center gap-1 shrink-0">
                    {i === stylesPeriods.length - 1 && <Button type="button" variant="outline" size="sm" className="gap-1 text-xs whitespace-nowrap" onClick={() => setStylesPeriods((prev) => [...prev, { style_period_id: null, attribution_type: 'of the period' }])}><Plus size={12} /> Add</Button>}
                    {stylesPeriods.length > 1 && <button type="button" onClick={() => setStylesPeriods((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors p-1"><X size={16} /></button>}
                  </div>
                </div>
              ))}
            </div>

            {/* Line + Country */}
            <FormField control={form.control} name="line" render={({ field }) => (
              <FormItem>
                <FormLabel><FieldLabel>Line / Collection</FieldLabel></FormLabel>
                <FormControl><Input {...field} value={field.value ?? ''} placeholder="e.g. Modern Collection, Vintage Revival" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <ComboboxField name="country_id" label="Country" options={taxonomy.countries} />
            </div>

            <FormField control={form.control} name="materials" render={({ field }) => (
              <FormItem>
                <FormLabel><FieldLabel>Materials</FieldLabel></FormLabel>
                <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="year_created" render={({ field }) => (
                <FormItem>
                  <FormLabel><FieldLabel>Year Created</FieldLabel></FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                  <p className="text-xs text-muted-foreground">No apostrophe, e.g. 1950s</p>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="condition" render={({ field }) => (
                <FormItem><FormLabel>Condition Notes</FormLabel><FormControl><Textarea rows={2} {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="period_designed" render={({ field }) => (
                <FormItem>
                  <FormLabel><FieldLabel>Period Designed</FieldLabel></FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ''} placeholder="e.g. Mid-Century Modern" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="period_created" render={({ field }) => (
                <FormItem>
                  <FormLabel><FieldLabel>Period Created</FieldLabel></FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ''} placeholder="e.g. Late 20th Century" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </section>

          {/* ── DIMENSIONS ── */}
          <section className="pb-8 space-y-4">
            <SectionHeading>Dimensions</SectionHeading>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="product_dimensions" render={({ field }) => (
                <FormItem>
                  <FormLabel><FieldLabel>Product Dimensions</FieldLabel></FormLabel>
                  <FormControl><Textarea rows={8} className="font-mono text-sm" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="box_dimensions" render={({ field }) => (
                <FormItem>
                  <FormLabel><FieldLabel>Box / Shipping Dimensions</FieldLabel></FormLabel>
                  <FormControl><Textarea rows={8} className="font-mono text-sm" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="dimension_notes" render={({ field }) => (
              <FormItem>
                <FormLabel><FieldLabel>Dimension Notes</FieldLabel></FormLabel>
                <FormControl><Textarea rows={2} {...field} value={field.value ?? ''} /></FormControl>
                <p className="text-xs text-muted-foreground">Internal use only — not displayed publicly.</p>
                <FormMessage />
              </FormItem>
            )} />
          </section>

          {/* ── CROSS-LISTING URLS ── */}
          <section className="pb-8 space-y-4">
            <SectionHeading>Cross-Listing URLs</SectionHeading>
            <FormField control={form.control} name="firstdibs_url" render={({ field }) => (
              <FormItem>
                <FormLabel><FieldLabel>1stDibs URL</FieldLabel></FormLabel>
                <FormControl><Input type="url" placeholder="https://www.1stdibs.com/..." {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="chairish_url" render={({ field }) => (
              <FormItem>
                <FormLabel><FieldLabel>Chairish URL</FieldLabel></FormLabel>
                <FormControl><Input type="url" placeholder="https://www.chairish.com/..." {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="ebay_url" render={({ field }) => (
              <FormItem>
                <FormLabel><FieldLabel>eBay URL</FieldLabel></FormLabel>
                <FormControl><Input type="url" placeholder="https://www.ebay.com/..." {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div ref={auctionUrlRef}>
              <FormField control={form.control} name="chairish_auction_url" render={({ field }) => (
                <FormItem>
                  <FormLabel><FieldLabel>Chairish Auction URL</FieldLabel></FormLabel>
                  <FormControl><Input type="url" placeholder="https://www.chairish.com/..." {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </section>

          {/* ── NOTES ── */}
          <section className="pb-8 space-y-4">
            <SectionHeading>Notes</SectionHeading>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel><FieldLabel>Internal Notes</FieldLabel></FormLabel>
                <FormControl><Textarea rows={3} {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </section>

          {/* ── IMAGES ── */}
          <section className="pb-8 space-y-4">
            <SectionHeading>Images</SectionHeading>
            {!isEditing
              ? <p className="text-sm text-muted-foreground">Save the product first, then you can upload images.</p>
              : <ProductImageManager productId={id!} sku={form.watch('sku')} />
            }
          </section>

          {/* ── ACTION BUTTONS ── */}
          <div className="flex flex-wrap gap-3 pt-6 border-t border-border">
            <Button type="submit" disabled={isBusy} className="gap-2">
              <Save size={16} />
              {saveMutation.isPending ? 'Saving…' : isEditing ? 'Update Product' : 'Create Product'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate(backUrl)}>
              Cancel
            </Button>
          </div>

        </form>
      </Form>
    </div>
  );
};

export default AdminProductForm;

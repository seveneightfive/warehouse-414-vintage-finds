import { useEffect, useState, useRef } from 'react';
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
import { ArrowLeft, Save, Check, ChevronsUpDown, Upload, Loader2, Star, Trash2, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, rectSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SOLD_ON_OPTIONS = ['1stDibs', 'Chairish', 'eBay', 'Website', 'Direct', 'Other'];

const STATUS_OPTIONS = [
  { value: 'available',  label: 'Available'  },
  { value: 'on_hold',    label: 'On Hold'     },
  { value: 'at_auction', label: 'At Auction'  },
  { value: 'sold',       label: 'Sold'        },
  { value: 'inventory',  label: 'Inventory'   },
  { value: 'draft',      label: 'Draft'       },
];

const ATTRIBUTION_OPTIONS = [
  { value: 'by',              label: 'by'              },
  { value: 'attributed to',   label: 'attributed to'   },
  { value: 'in the style of', label: 'in the style of' },
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
type PeriodRow   = { period_id:   string | null; attribution_type: string };
type CategoryRow = {
  category_id:        string | null;
  subcategory_id:     string | null;
  sub_subcategory_id: string | null;
};

const schema = z.object({
  name:                 z.string().min(1, 'Name is required'),
  sku:                  z.string().nullable().optional(),
  short_description:    z.string().nullable().optional(),
  long_description:     z.string().nullable().optional(),
  price:                z.coerce.number().nullable().optional(),
  sale_price:           z.coerce.number().nullable().optional(),
  status:               z.enum(['available', 'on_hold', 'sold', 'inventory', 'at_auction', 'draft']).default('available'),
  consignor_id:         z.coerce.number().int().nullable().optional(),
  style_id:             z.string().nullable().optional(),
  country_id:           z.string().nullable().optional(),
  product_dimensions:   z.string().nullable().optional(),
  box_dimensions:       z.string().nullable().optional(),
  dimension_notes:      z.string().nullable().optional(),
  materials:            z.string().nullable().optional(),
  condition:            z.string().nullable().optional(),
  year_created:         z.string().nullable().optional(),
  tags:                 z.string().nullable().optional(),
  firstdibs_url:        z.string().url().nullable().optional().or(z.literal('')),
  chairish_url:         z.string().url().nullable().optional().or(z.literal('')),
  ebay_url:             z.string().url().nullable().optional().or(z.literal('')),
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
    styles:     useQuery({ queryKey: ['taxonomy-styles'],     queryFn: fetch('styles')     }).data,
    periods:    useQuery({ queryKey: ['taxonomy-periods'],    queryFn: fetch('periods')    }).data,
    countries:  useQuery({ queryKey: ['taxonomy-countries'],  queryFn: fetch('countries')  }).data,
  };
};

const SortableImage = ({ img, isFeatured, onSetFeatured, onDelete }: {
  img: { id: string; image_url: string };
  isFeatured: boolean;
  onSetFeatured: (url: string) => void;
  onDelete: (id: string, url: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: img.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : undefined }} className="relative group cursor-grab active:cursor-grabbing">
      <img src={img.image_url} alt="" className={cn('w-full aspect-square object-cover rounded-md', isFeatured ? 'border-2 border-primary' : 'border border-border')} {...attributes} {...listeners} />
      {isFeatured && <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">Featured</span>}
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isFeatured && (
          <button type="button" onClick={() => onSetFeatured(img.image_url)} className="bg-accent text-accent-foreground rounded-full p-1"><Star size={14} /></button>
        )}
        <button type="button" onClick={() => onDelete(img.id, img.image_url)} className="bg-destructive text-destructive-foreground rounded-full p-1"><Trash2 size={14} /></button>
      </div>
    </div>
  );
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

  const returnStatus = new URLSearchParams(location.search).get('from') ?? null;
  const backUrl = returnStatus ? `/admin/products?status=${returnStatus}` : '/admin/products';

  const [designers,  setDesigners]  = useState<DesignerRow[]>([{ designer_id: null, attribution_type: 'by' }]);
  const [makers,     setMakers]     = useState<MakerRow[]>([{ maker_id: null, attribution_type: 'by' }]);
  const [periods,    setPeriods]    = useState<PeriodRow[]>([{ period_id: null, attribution_type: 'by' }]);
  const [categories, setCategories] = useState<CategoryRow[]>([{ category_id: null, subcategory_id: null, sub_subcategory_id: null }]);

  const { data: consignors } = useQuery({
    queryKey: ['consignors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('consignors').select('id, first_name, last_name, consignor_code').order('consignor_code');
      if (error) throw error;
      return data as { id: number; first_name: string | null; last_name: string | null; consignor_code: string | null }[];
    },
  });

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', status: 'available' } });
  const draftKey = `product-draft-${id ?? 'new'}`;

  useEffect(() => {
    const sub = form.watch((values) => {
      localStorage.setItem(draftKey, JSON.stringify({ form: values, designers, makers, periods, categories }));
    });
    return () => sub.unsubscribe();
  }, [form, draftKey, designers, makers, periods, categories]);

  useEffect(() => {
    if (isEditing) return;
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        form.reset(p.form ?? p);
        if (p.designers)  setDesigners(p.designers);
        if (p.makers)     setMakers(p.makers);
        if (p.periods)    setPeriods(p.periods);
        if (p.categories) setCategories(p.categories);
        toast.info('Draft restored', { description: 'Your unsaved changes were recovered.' });
      } catch {}
    }
  }, []);

  const watchStatus = form.watch('status');
  const auctionUrlRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (watchStatus === 'at_auction') setTimeout(() => auctionUrlRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }, [watchStatus]);

  const { data: product, isLoading } = useQuery({
    queryKey: ['admin-product', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('products')
        .select(`*, product_images(id, image_url, sort_order), product_designers(designer_id, attribution_type), product_makers(maker_id, attribution_type), product_categories(category_id, subcategory_id, is_primary)`)
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

    const values: Partial<FormValues> = {};
    for (const key of Object.keys(schema.shape)) {
      (values as Record<string, unknown>)[key] = (product as Record<string, unknown>)[key] ?? '';
    }
    values.price        = product.price ?? undefined;
    values.sale_price   = (product as any).sale_price ?? undefined;
    values.consignor_id = (product as any).consignor_id ?? undefined;
    const rawTags = (product as any).tags;
    values.tags = Array.isArray(rawTags) ? (rawTags as string[]).join(', ') : '';
    form.reset(values as FormValues);

    const dbD: DesignerRow[] = (product as any).product_designers?.map((r: any) => ({ designer_id: r.designer_id, attribution_type: r.attribution_type || 'by' })) ?? [];
    setDesigners(dbD.length > 0 ? dbD : [{ designer_id: null, attribution_type: 'by' }]);

    const dbM: MakerRow[] = (product as any).product_makers?.map((r: any) => ({ maker_id: r.maker_id, attribution_type: r.attribution_type || 'by' })) ?? [];
    setMakers(dbM.length > 0 ? dbM : [{ maker_id: null, attribution_type: 'by' }]);

    const existingPeriodId   = (product as any).period_id ?? null;
    const existingPeriodAttr = (product as any).period_attribution ?? 'by';
    setPeriods(existingPeriodId
      ? [{ period_id: existingPeriodId, attribution_type: existingPeriodAttr }]
      : [{ period_id: null, attribution_type: 'by' }]);

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
  const ensureUniqueSlug = async (slug: string) => {
    const { data } = await supabase.from('products').select('id').eq('slug', slug).maybeSingle();
    return data ? `${slug}-${Math.floor(1000 + Math.random() * 9000)}` : slug;
  };

  const performSave = async (values: FormValues, overrideStatus?: string) => {
    const payload: Record<string, unknown> = { ...values };
    if (overrideStatus) payload.status = overrideStatus;
    if (typeof payload.tags === 'string' && payload.tags) {
      payload.tags = (payload.tags as string).split(',').map((t: string) => t.trim()).filter(Boolean);
    }
    for (const [k, v] of Object.entries(payload)) if (v === '' || v === undefined) payload[k] = null;

    const firstD = designers.find((d) => d.designer_id);
    const firstM = makers.find((m) => m.maker_id);
    const firstP = periods.find((p) => p.period_id);
    const firstC = categories.find((c) => c.category_id);

    payload.designer_id          = firstD?.designer_id ?? null;
    payload.designer_attribution = firstD?.attribution_type ?? null;
    payload.maker_id             = firstM?.maker_id ?? null;
    payload.maker_attribution    = firstM?.attribution_type ?? null;
    payload.period_id            = firstP?.period_id ?? null;
    const validAttr = ['by', 'attributed to', 'in the style of'];
    payload.period_attribution   = firstP?.period_id && validAttr.includes(firstP.attribution_type) ? firstP.attribution_type : null;
    payload.category_id          = firstC?.category_id ?? null;
    payload.subcategory_id       = firstC?.sub_subcategory_id ?? firstC?.subcategory_id ?? null;

    if (!isEditing && values.name) payload.slug = await ensureUniqueSlug(generateSlug(values.name));

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

    await supabase.from('product_designers').delete().eq('product_id', productId);
    const vD = designers.filter((d) => d.designer_id);
    if (vD.length > 0) {
      const { error } = await supabase.from('product_designers').insert(vD.map((d) => ({ product_id: productId, designer_id: d.designer_id, attribution_type: d.attribution_type || 'by' })));
      if (error) throw error;
    }

    await supabase.from('product_makers').delete().eq('product_id', productId);
    const vM = makers.filter((m) => m.maker_id);
    if (vM.length > 0) {
      const { error } = await supabase.from('product_makers').insert(vM.map((m) => ({ product_id: productId, maker_id: m.maker_id, attribution_type: m.attribution_type || 'by' })));
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

    return productId;
  };

  const onSuccess = (newId: string, statusLabel: string) => {
    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    queryClient.invalidateQueries({ queryKey: ['admin-product-counts'] });
    queryClient.invalidateQueries({ queryKey: ['admin-product', newId] });
    localStorage.removeItem(draftKey);
    toast.success(statusLabel);
    if (isEditing) {
      navigate(`/admin/products?highlight=${id}&status=${form.getValues('status')}`);
    } else {
      navigate(`/admin/products/${newId}`);
    }
  };

  const saveMutation = useMutation({
    mutationFn: (v: FormValues) => performSave(v),
    onSuccess: (id) => onSuccess(id, isEditing ? 'Product updated' : 'Product created'),
    onError: (err: Error) => toast.error(err.message),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !product?.product_images) return;
    const reordered = arrayMove(product.product_images,
      product.product_images.findIndex((img: any) => img.id === active.id),
      product.product_images.findIndex((img: any) => img.id === over.id));
    await Promise.all(reordered.map((img: any, i: number) => supabase.from('product_images').update({ sort_order: i }).eq('id', img.id)));
    if (reordered[0]?.image_url !== product.featured_image_url)
      await supabase.from('products').update({ featured_image_url: reordered[0].image_url }).eq('id', product.id);
    queryClient.invalidateQueries({ queryKey: ['admin-product', id] });
  };

  const uploadImages = async (files: FileList) => {
    if (!id) return;
    const sku = form.getValues('sku');
    if (!sku) { toast.error('Product must have a SKU before uploading images'); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error('Not authenticated'); return; }
    let nextSort = (product?.product_images || []).length;
    for (const file of Array.from(files)) {
      const tempId = `${file.name}-${Date.now()}`;
      setUploadingFiles((prev) => [...prev, tempId]);
      try {
        const fd = new FormData();
        fd.append('file', file); fd.append('productId', id); fd.append('sku', sku); fd.append('sort_order', String(nextSort));
        const res = await supabase.functions.invoke('upload-product-images', { body: fd });
        if (res.error) throw new Error(res.error.message);
        nextSort++;
      } catch (err: unknown) {
        toast.error(`Failed to upload ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setUploadingFiles((prev) => prev.filter((f) => f !== tempId));
      }
    }
    queryClient.invalidateQueries({ queryKey: ['admin-product', id] });
    toast.success('Images uploaded');
  };

  const deleteImage = async (imageId: string, imageUrl: string) => {
    const { error } = await supabase.from('product_images').delete().eq('id', imageId);
    if (error) { toast.error('Delete failed', { description: error.message }); return; }
    if (product?.featured_image_url === imageUrl) await supabase.from('products').update({ featured_image_url: null }).eq('id', product.id);
    toast.success('Image deleted');
    queryClient.invalidateQueries({ queryKey: ['admin-product', id] });
  };

  const setFeaturedImage = async (imageUrl: string) => {
    const { error } = await supabase.from('products').update({ featured_image_url: imageUrl }).eq('id', product.id);
    if (error) { toast.error('Failed to set featured image', { description: error.message }); return; }
    const images = [...(product.product_images ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
    const idx = images.findIndex((img: any) => img.image_url === imageUrl);
    if (idx > 0) {
      const reordered = arrayMove(images, idx, 0);
      await Promise.all(reordered.map((img: any, i: number) => supabase.from('product_images').update({ sort_order: i }).eq('id', img.id)));
    }
    toast.success('Featured image updated');
    queryClient.invalidateQueries({ queryKey: ['admin-product', id] });
  };

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

            {/* Period — same layout as Designers/Makers */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-foreground/70">Period</p>
              {periods.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select value={row.attribution_type || 'by'} onValueChange={(val) => setPeriods((prev) => prev.map((r, j) => j === i ? { ...r, attribution_type: val } : r))}>
                    <SelectTrigger className="w-[25%] shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>{ATTRIBUTION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <InlineCombobox value={row.period_id} onChange={(val) => setPeriods((prev) => prev.map((r, j) => j === i ? { ...r, period_id: val } : r))} options={taxonomy.periods} placeholder="Select period…" className="flex-1" />
                  <div className="w-[25%] shrink-0" />
                </div>
              ))}
            </div>

            {/* Style + Country */}
            <div className="grid grid-cols-2 gap-4">
              <ComboboxField name="style_id" label="Style" options={taxonomy.styles} />
              <ComboboxField name="country_id" label="Country" options={taxonomy.countries} />
            </div>

            {/* Materials — full width */}
            <FormField control={form.control} name="materials" render={({ field }) => (
              <FormItem>
                <FormLabel><FieldLabel>Materials</FieldLabel></FormLabel>
                <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Year Created — half width */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="year_created" render={({ field }) => (
                <FormItem>
                  <FormLabel><FieldLabel>Year Created</FieldLabel></FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                  <p className="text-xs text-muted-foreground">No apostrophe, e.g. 1950s</p>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="tags" render={({ field }) => (
              <FormItem>
                <FormLabel><FieldLabel>Tags</FieldLabel></FormLabel>
                <FormControl><Input placeholder="Comma-separated tags" {...field} value={field.value ?? ''} /></FormControl>
                <p className="text-xs text-muted-foreground">Separate with commas, e.g. mid-century, brass, sculptural</p>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="condition" render={({ field }) => (
              <FormItem>
                <FormLabel><FieldLabel>Condition Notes</FieldLabel></FormLabel>
                <FormControl><Textarea rows={4} {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
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
              : (
                <>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && uploadImages(e.target.files)} />
                  <Button type="button" variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={16} /> Upload Images
                  </Button>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={(product?.product_images ?? []).map((img: any) => img.id)} strategy={rectSortingStrategy}>
                      <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                        {(product?.product_images ?? [])
                          .sort((a: any, b: any) => a.sort_order - b.sort_order)
                          .map((img: any) => (
                            <SortableImage key={img.id} img={img} isFeatured={product?.featured_image_url === img.image_url} onSetFeatured={setFeaturedImage} onDelete={deleteImage} />
                          ))}
                        {uploadingFiles.map((tempId) => (
                          <div key={tempId} className="w-full aspect-square rounded-md border border-border flex items-center justify-center bg-muted">
                            <Loader2 className="animate-spin text-muted-foreground" size={24} />
                          </div>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </>
              )}
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

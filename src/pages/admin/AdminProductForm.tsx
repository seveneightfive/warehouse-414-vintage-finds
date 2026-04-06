import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── Constants ────────────────────────────────────────────────────────────────

const SOLD_ON_OPTIONS = ['1stDibs', 'Chairish', 'eBay', 'Website', 'Direct', 'Other'];
const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'at_auction', label: 'At Auction' },
  { value: 'sold', label: 'Sold' },
  { value: 'inventory', label: 'Inventory' },
];
const ATTRIBUTION_OPTIONS = [
  { value: 'by', label: 'by' },
  { value: 'attributed to', label: 'attributed to' },
  { value: 'in the style of', label: 'in the style of' },
];

// ─── Junction row types (local state) ────────────────────────────────────────

type DesignerRow = { designer_id: string | null; attribution_type: string };
type MakerRow    = { maker_id: string | null;    attribution_type: string };
type CategoryRow = { category_id: string | null; subcategory_id: string | null };

// ─── Zod schema — no longer includes designer_id/maker_id/category_id ────────

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().nullable().optional(),
  short_description: z.string().nullable().optional(),
  long_description: z.string().nullable().optional(),
  price: z.coerce.number().nullable().optional(),
  sale_price: z.coerce.number().nullable().optional(),
  status: z.enum(['available', 'on_hold', 'sold', 'inventory', 'at_auction']).default('available'),
  style_id: z.string().nullable().optional(),
  period_id: z.string().nullable().optional(),
  country_id: z.string().nullable().optional(),
  period_attribution: z.string().nullable().optional(),
  product_dimensions: z.string().nullable().optional(),
  box_dimensions: z.string().nullable().optional(),
  dimension_notes: z.string().nullable().optional(),
  materials: z.string().nullable().optional(),
  condition: z.string().nullable().optional(),
  year_created: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
  firstdibs_url: z.string().url().nullable().optional().or(z.literal('')),
  chairish_url: z.string().url().nullable().optional().or(z.literal('')),
  ebay_url: z.string().url().nullable().optional().or(z.literal('')),
  chairish_auction_url: z.string().url().nullable().optional().or(z.literal('')),
  sold_on: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Taxonomy hook ────────────────────────────────────────────────────────────

const useTaxonomyOptions = () => {
  const fetchTable = (table: string) => async () => {
    const { data, error } = await supabase.from(table).select('id, name').order('name');
    if (error) throw error;
    return data as { id: string; name: string }[];
  };
  return {
    designers: useQuery({ queryKey: ['taxonomy-designers'], queryFn: fetchTable('designers') }).data,
    makers:    useQuery({ queryKey: ['taxonomy-makers'],    queryFn: fetchTable('makers')    }).data,
    categories:useQuery({ queryKey: ['taxonomy-categories'],queryFn: fetchTable('categories')}).data,
    styles:    useQuery({ queryKey: ['taxonomy-styles'],    queryFn: fetchTable('styles')    }).data,
    periods:   useQuery({ queryKey: ['taxonomy-periods'],   queryFn: fetchTable('periods')   }).data,
    countries: useQuery({ queryKey: ['taxonomy-countries'], queryFn: fetchTable('countries') }).data,
  };
};

// ─── Sortable image ───────────────────────────────────────────────────────────

const SortableImage = ({
  img, isFeatured, onSetFeatured, onDelete,
}: {
  img: { id: string; image_url: string };
  isFeatured: boolean;
  onSetFeatured: (url: string) => void;
  onDelete: (id: string, url: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: img.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : undefined };
  return (
    <div ref={setNodeRef} style={style} className="relative group cursor-grab active:cursor-grabbing">
      <img src={img.image_url} alt="" className={cn('w-full aspect-square object-cover rounded-md', isFeatured ? 'border-2 border-primary' : 'border border-border')} {...attributes} {...listeners} />
      {isFeatured && <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">Featured</span>}
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isFeatured && (
          <button type="button" onClick={() => onSetFeatured(img.image_url)} className="bg-accent text-accent-foreground rounded-full p-1" title="Set as featured">
            <Star size={14} />
          </button>
        )}
        <button type="button" onClick={() => onDelete(img.id, img.image_url)} className="bg-destructive text-destructive-foreground rounded-full p-1" title="Delete image">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

// ─── Inline combobox (not a FormField — used in junction row UIs) ─────────────

const InlineCombobox = ({
  value, onChange, options, placeholder,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  options?: { id: string; name: string }[];
  placeholder: string;
}) => {
  const [open, setOpen] = useState(false);
  const selectedName = options?.find((o) => o.id === value)?.name;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className={cn('justify-between font-normal flex-1 min-w-0', !value && 'text-muted-foreground')}>
          <span className="truncate">{selectedName || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0">
        <Command>
          <CommandInput placeholder={`Search…`} />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__none" onSelect={() => { onChange(null); setOpen(false); }}>
                <Check className={cn('mr-2 h-4 w-4', !value ? 'opacity-100' : 'opacity-0')} />
                None
              </CommandItem>
              {options?.map((o) => (
                <CommandItem key={o.id} value={o.name} onSelect={() => { onChange(o.id); setOpen(false); }}>
                  <Check className={cn('mr-2 h-4 w-4', value === o.id ? 'opacity-100' : 'opacity-0')} />
                  {o.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// ─── SubcategoryCombobox — fetches based on category_id ──────────────────────

const SubcategoryCombobox = ({
  categoryId, value, onChange,
}: {
  categoryId: string;
  value: string | null;
  onChange: (id: string | null) => void;
}) => {
  const { data: subcategories } = useQuery({
    queryKey: ['taxonomy-subcategories', categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subcategories')
        .select('id, name')
        .eq('category_id', categoryId)
        .order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: !!categoryId,
  });

  if (!subcategories || subcategories.length === 0) return null;

  return (
    <InlineCombobox
      value={value}
      onChange={onChange}
      options={subcategories}
      placeholder="Subcategory (optional)"
    />
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const AdminProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;
  const taxonomy = useTaxonomyOptions();

  // ── Junction state ──────────────────────────────────────────────────────────
  const [designers, setDesigners] = useState<DesignerRow[]>([{ designer_id: null, attribution_type: 'by' }]);
  const [makers,    setMakers]    = useState<MakerRow[]>([{ maker_id: null, attribution_type: 'by' }]);
  const [categories, setCategories] = useState<CategoryRow[]>([{ category_id: null, subcategory_id: null }]);

  // ── Form ────────────────────────────────────────────────────────────────────
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', status: 'available' },
  });

  const draftKey = `product-draft-${id ?? 'new'}`;

  useEffect(() => {
    const subscription = form.watch((values) => {
      localStorage.setItem(draftKey, JSON.stringify({ form: values, designers, makers, categories }));
    });
    return () => subscription.unsubscribe();
  }, [form, draftKey, designers, makers, categories]);

  useEffect(() => {
    if (isEditing) return;
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        form.reset(parsed.form ?? parsed);
        if (parsed.designers) setDesigners(parsed.designers);
        if (parsed.makers)    setMakers(parsed.makers);
        if (parsed.categories) setCategories(parsed.categories);
        toast.info('Draft restored', { description: 'Your unsaved changes were recovered.' });
      } catch {}
    }
  }, []);

  const watchStatus = form.watch('status');
  const auctionUrlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (watchStatus === 'at_auction') {
      setTimeout(() => auctionUrlRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }, [watchStatus]);

  // ── Load existing product ───────────────────────────────────────────────────
  const { data: product, isLoading } = useQuery({
    queryKey: ['admin-product', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_images(id, image_url, sort_order),
          product_designers(designer_id, attribution_type),
          product_makers(maker_id, attribution_type),
          product_categories(category_id, subcategory_id, is_primary)
        `)
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (!product) return;

    // Reset main form fields
    const values: Partial<FormValues> = {};
    for (const key of Object.keys(schema.shape)) {
      (values as Record<string, unknown>)[key] = (product as Record<string, unknown>)[key] ?? '';
    }
    values.price      = product.price ?? undefined;
    values.sale_price = (product as any).sale_price ?? undefined;
    const rawTags = (product as any).tags;
    values.tags = Array.isArray(rawTags) ? (rawTags as string[]).join(', ') : '';
    form.reset(values as FormValues);

    // Populate junction state from DB
    const dbDesigners: DesignerRow[] = (product as any).product_designers?.map((r: any) => ({
      designer_id: r.designer_id,
      attribution_type: r.attribution_type || 'by',
    })) ?? [];
    setDesigners(dbDesigners.length > 0 ? dbDesigners : [{ designer_id: null, attribution_type: 'by' }]);

    const dbMakers: MakerRow[] = (product as any).product_makers?.map((r: any) => ({
      maker_id: r.maker_id,
      attribution_type: r.attribution_type || 'by',
    })) ?? [];
    setMakers(dbMakers.length > 0 ? dbMakers : [{ maker_id: null, attribution_type: 'by' }]);

    const dbCats: CategoryRow[] = [...((product as any).product_categories ?? [])]
      .sort((a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
      .map((r: any) => ({ category_id: r.category_id, subcategory_id: r.subcategory_id ?? null }));
    setCategories(dbCats.length > 0 ? dbCats : [{ category_id: null, subcategory_id: null }]);
  }, [product, form]);

  // ── Slug helpers ────────────────────────────────────────────────────────────
  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  const ensureUniqueSlug = async (slug: string): Promise<string> => {
    const { data } = await supabase.from('products').select('id').eq('slug', slug).maybeSingle();
    if (data) return `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    return slug;
  };

  // ── Save mutation ───────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Build product payload
      const payload: Record<string, unknown> = { ...values };
      if (typeof payload.tags === 'string' && payload.tags) {
        payload.tags = (payload.tags as string).split(',').map((t: string) => t.trim()).filter(Boolean);
      }
      for (const [k, v] of Object.entries(payload)) {
        if (v === '' || v === undefined) payload[k] = null;
      }
      const validAttributions = ['by', 'attributed to', 'in the style of'];
      if (!validAttributions.includes(payload.period_attribution as string)) payload.period_attribution = null;

      // Write legacy single-value columns for backwards compat
      // Use the first valid entry from each junction list
      const firstDesigner = designers.find((d) => d.designer_id);
      const firstMaker    = makers.find((m) => m.maker_id);
      const firstCategory = categories.find((c) => c.category_id);
      payload.designer_id          = firstDesigner?.designer_id ?? null;
      payload.designer_attribution = firstDesigner?.attribution_type ?? null;
      payload.maker_id             = firstMaker?.maker_id ?? null;
      payload.maker_attribution    = firstMaker?.attribution_type ?? null;
      payload.category_id          = firstCategory?.category_id ?? null;
      payload.subcategory_id       = firstCategory?.subcategory_id ?? null;

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

      // ── Sync junction tables (delete-all-then-reinsert) ───────────────────

      // Designers
      await supabase.from('product_designers').delete().eq('product_id', productId);
      const validDesigners = designers.filter((d) => d.designer_id);
      if (validDesigners.length > 0) {
        const { error } = await supabase.from('product_designers').insert(
          validDesigners.map((d) => ({
            product_id: productId,
            designer_id: d.designer_id,
            attribution_type: d.attribution_type || 'by',
          }))
        );
        if (error) throw error;
      }

      // Makers
      await supabase.from('product_makers').delete().eq('product_id', productId);
      const validMakers = makers.filter((m) => m.maker_id);
      if (validMakers.length > 0) {
        const { error } = await supabase.from('product_makers').insert(
          validMakers.map((m) => ({
            product_id: productId,
            maker_id: m.maker_id,
            attribution_type: m.attribution_type || 'by',
          }))
        );
        if (error) throw error;
      }

      // Categories
      await supabase.from('product_categories').delete().eq('product_id', productId);
      const validCategories = categories.filter((c) => c.category_id);
      if (validCategories.length > 0) {
        const { error } = await supabase.from('product_categories').insert(
          validCategories.map((c, i) => ({
            product_id: productId,
            category_id: c.category_id,
            subcategory_id: c.subcategory_id ?? null,
            is_primary: i === 0,
          }))
        );
        if (error) throw error;
      }

      return productId;
    },
    onSuccess: (newId) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-product', newId] });
      localStorage.removeItem(`product-draft-${id ?? 'new'}`);
      toast.success(isEditing ? 'Product updated' : 'Product created');
      if (isEditing) {
        navigate(`/admin/products?highlight=${id}&status=${form.getValues('status')}`);
      } else {
        navigate(`/admin/products/${newId}`);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Images ──────────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !product?.product_images) return;
    const oldIndex = product.product_images.findIndex((img: any) => img.id === active.id);
    const newIndex = product.product_images.findIndex((img: any) => img.id === over.id);
    const reordered = arrayMove(product.product_images, oldIndex, newIndex);
    await Promise.all(reordered.map((img: any, index: number) => supabase.from('product_images').update({ sort_order: index }).eq('id', img.id)));
    if (reordered[0]?.image_url !== product.featured_image_url) {
      await supabase.from('products').update({ featured_image_url: reordered[0].image_url }).eq('id', product.id);
    }
    queryClient.invalidateQueries({ queryKey: ['admin-product', id] });
  };

  const uploadImages = async (files: FileList) => {
    if (!id) return;
    const sku = form.getValues('sku');
    if (!sku) { toast.error('Product must have a SKU before uploading images'); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error('Not authenticated'); return; }
    const currentImages = product?.product_images || [];
    let nextSort = currentImages.length;
    for (const file of Array.from(files)) {
      const tempId = `${file.name}-${Date.now()}`;
      setUploadingFiles((prev) => [...prev, tempId]);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('productId', id);
        formData.append('sku', sku);
        formData.append('sort_order', String(nextSort));
        const res = await supabase.functions.invoke('upload-product-images', { body: formData });
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
    if (product?.featured_image_url === imageUrl) {
      await supabase.from('products').update({ featured_image_url: null }).eq('id', product.id);
    }
    toast.success('Image deleted');
    queryClient.invalidateQueries({ queryKey: ['admin-product', id] });
  };

  const setFeaturedImage = async (imageUrl: string) => {
    const { error } = await supabase.from('products').update({ featured_image_url: imageUrl }).eq('id', product.id);
    if (error) { toast.error('Failed to set featured image', { description: error.message }); return; }
    const images = [...(product.product_images ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
    const featuredIndex = images.findIndex((img: any) => img.image_url === imageUrl);
    if (featuredIndex > 0) {
      const reordered = arrayMove(images, featuredIndex, 0);
      await Promise.all(reordered.map((img: any, index: number) => supabase.from('product_images').update({ sort_order: index }).eq('id', img.id)));
    }
    toast.success('Featured image updated');
    queryClient.invalidateQueries({ queryKey: ['admin-product', id] });
  };

  if (isEditing && isLoading) return <p className="text-muted-foreground">Loading…</p>;

  // ── Shared sub-components ───────────────────────────────────────────────────

  /** FormField combobox — for fields still on the product row (period, style etc.) */
  const ComboboxField = ({ name, label, options }: { name: keyof FormValues; label: string; options?: { id: string; name: string }[] }) => {
    const [open, setOpen] = useState(false);
    return (
      <FormField control={form.control} name={name} render={({ field }) => {
        const selectedName = options?.find((o) => o.id === field.value)?.name;
        return (
          <FormItem className="flex flex-col">
            <FormLabel>{label}</FormLabel>
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
                        <Check className={cn('mr-2 h-4 w-4', !field.value ? 'opacity-100' : 'opacity-0')} />
                        None
                      </CommandItem>
                      {options?.map((o) => (
                        <CommandItem key={o.id} value={o.name} onSelect={() => { field.onChange(o.id); setOpen(false); }}>
                          <Check className={cn('mr-2 h-4 w-4', field.value === o.id ? 'opacity-100' : 'opacity-0')} />
                          {o.name}
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

  const AttributionSelect = ({ name, label }: { name: keyof FormValues; label: string }) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <Select onValueChange={(val) => field.onChange(val === '__none' ? null : val)} value={field.value ?? '__none'}>
          <FormControl><SelectTrigger><SelectValue placeholder="Select attribution" /></SelectTrigger></FormControl>
          <SelectContent>
            <SelectItem value="__none">None</SelectItem>
            {ATTRIBUTION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )} />
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/products')}>
          <ArrowLeft size={18} />
        </Button>
        <h1 className="font-display text-2xl tracking-wide text-foreground">
          {isEditing ? 'Edit Product' : 'New Product'}
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-10">

          {/* ── Basic Info ── */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">Basic Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="md:col-span-3"><FormLabel>Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="sku" render={({ field }) => (
                <FormItem><FormLabel>SKU</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem><FormLabel>Price</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="sale_price" render={({ field }) => (
                <FormItem><FormLabel>Sale Price</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              {watchStatus === 'at_auction' && (
                <p className="text-xs text-muted-foreground md:col-span-3">
                  Don't forget to add the{' '}
                  <button type="button" className="underline text-primary" onClick={() => auctionUrlRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                    Chairish Auction URL
                  </button>{' '}below.
                </p>
              )}
              {watchStatus === 'sold' && (
                <FormField control={form.control} name="sold_on" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sold On</FormLabel>
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
            </div>
            <FormField control={form.control} name="short_description" render={({ field }) => (
              <FormItem><FormLabel>Short Description</FormLabel><FormControl><Textarea rows={2} {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="long_description" render={({ field }) => (
              <FormItem><FormLabel>Long Description</FormLabel><FormControl><Textarea rows={7} {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
          </section>

          {/* ── Taxonomy & Attribution ── */}
          <section className="space-y-6">
            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">Taxonomy & Attribution</h2>
            <p className="text-sm text-muted-foreground -mt-2">Attribution precedes the name, e.g. "by", "in the style of", "attributed to"</p>

            {/* Designers — multi-row */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Designers</p>
              {designers.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  {/* Attribution */}
                  <Select
                    value={row.attribution_type || 'by'}
                    onValueChange={(val) => setDesigners((prev) => prev.map((r, j) => j === i ? { ...r, attribution_type: val } : r))}
                  >
                    <SelectTrigger className="w-40 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ATTRIBUTION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {/* Designer combobox */}
                  <InlineCombobox
                    value={row.designer_id}
                    onChange={(val) => setDesigners((prev) => prev.map((r, j) => j === i ? { ...r, designer_id: val } : r))}
                    options={taxonomy.designers}
                    placeholder="Select designer…"
                  />
                  {/* Remove row (only if more than one) */}
                  {designers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setDesigners((prev) => prev.filter((_, j) => j !== i))}
                      className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 mt-1"
                onClick={() => setDesigners((prev) => [...prev, { designer_id: null, attribution_type: 'by' }])}
              >
                <Plus size={14} /> Add another designer
              </Button>
            </div>

            {/* Makers — multi-row */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Makers</p>
              {makers.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select
                    value={row.attribution_type || 'by'}
                    onValueChange={(val) => setMakers((prev) => prev.map((r, j) => j === i ? { ...r, attribution_type: val } : r))}
                  >
                    <SelectTrigger className="w-40 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ATTRIBUTION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <InlineCombobox
                    value={row.maker_id}
                    onChange={(val) => setMakers((prev) => prev.map((r, j) => j === i ? { ...r, maker_id: val } : r))}
                    options={taxonomy.makers}
                    placeholder="Select maker…"
                  />
                  {makers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setMakers((prev) => prev.filter((_, j) => j !== i))}
                      className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 mt-1"
                onClick={() => setMakers((prev) => [...prev, { maker_id: null, attribution_type: 'by' }])}
              >
                <Plus size={14} /> Add another maker
              </Button>
            </div>

            {/* Period */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ComboboxField name="period_id" label="Period" options={taxonomy.periods} />
              <AttributionSelect name="period_attribution" label="Period Attribution" />
            </div>

            {/* Categories — multi-row */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">Categories</p>
                <span className="text-xs text-muted-foreground">(first row is the primary)</span>
              </div>
              {categories.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  {i === 0 && (
                    <span className="text-[10px] font-medium tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                      PRIMARY
                    </span>
                  )}
                  {i > 0 && <span className="w-[58px] shrink-0" />}
                  {/* Category */}
                  <InlineCombobox
                    value={row.category_id}
                    onChange={(val) =>
                      setCategories((prev) =>
                        prev.map((r, j) => j === i ? { ...r, category_id: val, subcategory_id: null } : r)
                      )
                    }
                    options={taxonomy.categories}
                    placeholder="Select category…"
                  />
                  {/* Subcategory — only shown when a category is chosen */}
                  {row.category_id && (
                    <SubcategoryCombobox
                      categoryId={row.category_id}
                      value={row.subcategory_id}
                      onChange={(val) =>
                        setCategories((prev) =>
                          prev.map((r, j) => j === i ? { ...r, subcategory_id: val } : r)
                        )
                      }
                    />
                  )}
                  {categories.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setCategories((prev) => prev.filter((_, j) => j !== i))}
                      className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 mt-1"
                onClick={() => setCategories((prev) => [...prev, { category_id: null, subcategory_id: null }])}
              >
                <Plus size={14} /> Add another category
              </Button>
            </div>

            {/* Style + Country */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ComboboxField name="style_id" label="Style" options={taxonomy.styles} />
              <ComboboxField name="country_id" label="Country" options={taxonomy.countries} />
            </div>

            {/* Tags + Materials + Year + Condition */}
            <FormField control={form.control} name="tags" render={({ field }) => (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl><Input placeholder="Comma-separated tags" {...field} value={field.value ?? ''} /></FormControl>
                <p className="text-xs text-muted-foreground">Separate with commas, e.g. mid-century, brass, sculptural</p>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="materials" render={({ field }) => (
                <FormItem><FormLabel>Materials</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="year_created" render={({ field }) => (
                <FormItem>
                  <FormLabel>Year Created</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                  <p className="text-xs text-muted-foreground">No apostrophe, e.g. 1950s</p>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="condition" render={({ field }) => (
                <FormItem><FormLabel>Condition Notes</FormLabel><FormControl><Textarea rows={2} {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </section>

          {/* ── Dimensions ── */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">Dimensions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="product_dimensions" render={({ field }) => (
                <FormItem><FormLabel>Product Dimensions</FormLabel><FormControl><Textarea rows={8} className="max-w-sm font-mono text-sm" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="box_dimensions" render={({ field }) => (
                <FormItem><FormLabel>Box / Shipping Dimensions</FormLabel><FormControl><Textarea rows={8} className="max-w-sm font-mono text-sm" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="dimension_notes" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>Dimension Notes</FormLabel><FormControl><Textarea rows={2} {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </section>

          {/* ── Cross-Listing URLs ── */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">Cross-Listing URLs</h2>
            <div className="grid grid-cols-1 gap-4">
              <FormField control={form.control} name="firstdibs_url" render={({ field }) => (
                <FormItem><FormLabel>1stDibs URL</FormLabel><FormControl><Input type="url" placeholder="https://www.1stdibs.com/..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="chairish_url" render={({ field }) => (
                <FormItem><FormLabel>Chairish URL</FormLabel><FormControl><Input type="url" placeholder="https://www.chairish.com/..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="ebay_url" render={({ field }) => (
                <FormItem><FormLabel>eBay URL</FormLabel><FormControl><Input type="url" placeholder="https://www.ebay.com/..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <div ref={auctionUrlRef}>
                <FormField control={form.control} name="chairish_auction_url" render={({ field }) => (
                  <FormItem><FormLabel>Chairish Auction URL</FormLabel><FormControl><Input type="url" placeholder="https://www.chairish.com/..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>
          </section>

          {/* ── Notes ── */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">Notes</h2>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Internal Notes</FormLabel><FormControl><Textarea rows={3} {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
          </section>

          {/* ── Images ── */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">Images</h2>
            {!isEditing && (
              <p className="text-sm text-muted-foreground">Save the product first, then you can upload images.</p>
            )}
            {isEditing && (
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
                          <SortableImage
                            key={img.id}
                            img={img}
                            isFeatured={product?.featured_image_url === img.image_url}
                            onSetFeatured={setFeaturedImage}
                            onDelete={deleteImage}
                          />
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

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button type="submit" disabled={saveMutation.isPending} className="gap-2">
              <Save size={16} />
              {saveMutation.isPending ? 'Saving…' : isEditing ? 'Update Product' : 'Create Product'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/admin/products')}>Cancel</Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default AdminProductForm;

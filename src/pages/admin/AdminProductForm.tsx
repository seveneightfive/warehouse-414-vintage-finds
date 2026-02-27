import { useEffect } from 'react';
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
import { ArrowLeft, Save } from 'lucide-react';

const SOLD_ON_OPTIONS = ['1stDibs', 'Chairish', 'eBay', 'Website', 'Direct', 'Other'];
const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'sold', label: 'Sold' },
  { value: 'inventory', label: 'Inventory' },
];

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().nullable().optional(),
  short_description: z.string().nullable().optional(),
  long_description: z.string().nullable().optional(),
  price: z.coerce.number().nullable().optional(),
  status: z.enum(['available', 'on_hold', 'sold', 'inventory']).default('available'),
  designer_id: z.string().nullable().optional(),
  maker_id: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
  style_id: z.string().nullable().optional(),
  period_id: z.string().nullable().optional(),
  country_id: z.string().nullable().optional(),
  designer_attribution: z.string().nullable().optional(),
  maker_attribution: z.string().nullable().optional(),
  period_attribution: z.string().nullable().optional(),
  product_dimensions: z.string().nullable().optional(),
  box_dimensions: z.string().nullable().optional(),
  dimension_notes: z.string().nullable().optional(),
  materials: z.string().nullable().optional(),
  condition: z.string().nullable().optional(),
  year_created: z.string().nullable().optional(),
  firstdibs_url: z.string().url().nullable().optional().or(z.literal('')),
  chairish_url: z.string().url().nullable().optional().or(z.literal('')),
  ebay_url: z.string().url().nullable().optional().or(z.literal('')),
  sold_on: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

const useTaxonomyOptions = () => {
  const fetchTable = (table: string) => async () => {
    const { data, error } = await supabase.from(table).select('id, name').order('name');
    if (error) throw error;
    return data as { id: string; name: string }[];
  };

  const designers = useQuery({ queryKey: ['taxonomy-designers'], queryFn: fetchTable('designers') });
  const makers = useQuery({ queryKey: ['taxonomy-makers'], queryFn: fetchTable('makers') });
  const categories = useQuery({ queryKey: ['taxonomy-categories'], queryFn: fetchTable('categories') });
  const styles = useQuery({ queryKey: ['taxonomy-styles'], queryFn: fetchTable('styles') });
  const periods = useQuery({ queryKey: ['taxonomy-periods'], queryFn: fetchTable('periods') });
  const countries = useQuery({ queryKey: ['taxonomy-countries'], queryFn: fetchTable('countries') });

  return { designers: designers.data, makers: makers.data, categories: categories.data, styles: styles.data, periods: periods.data, countries: countries.data };
};

const AdminProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;
  const taxonomy = useTaxonomyOptions();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', status: 'available' },
  });

  const watchStatus = form.watch('status');

  const { data: product, isLoading } = useQuery({
    queryKey: ['admin-product', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, product_images(id, image_url, sort_order)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (product) {
      const values: Partial<FormValues> = {};
      for (const key of Object.keys(schema.shape)) {
        (values as Record<string, unknown>)[key] = (product as Record<string, unknown>)[key] ?? '';
      }
      values.price = product.price ?? undefined;
      form.reset(values as FormValues);
    }
  }, [product, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: Record<string, unknown> = { ...values };
      // Clean empty strings to null
      for (const [k, v] of Object.entries(payload)) {
        if (v === '' || v === undefined) payload[k] = null;
      }
      if (isEditing) {
        const { error } = await supabase.from('products').update(payload).eq('id', id!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(isEditing ? 'Product updated' : 'Product created');
      navigate('/admin/products');
    },
    onError: (err) => toast.error(err.message),
  });

  if (isEditing && isLoading) return <p className="text-muted-foreground">Loading…</p>;

  const SelectField = ({ name, label, options }: { name: keyof FormValues; label: string; options?: { id: string; name: string }[] }) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <Select onValueChange={field.onChange} value={field.value as string || ''}>
          <FormControl><SelectTrigger><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger></FormControl>
          <SelectContent>
            <SelectItem value="__none">None</SelectItem>
            {options?.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )} />
  );

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

          {/* Basic Info */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">Basic Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="sku" render={({ field }) => (
                <FormItem><FormLabel>SKU</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem><FormLabel>Price</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
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
              <FormItem><FormLabel>Long Description</FormLabel><FormControl><Textarea rows={4} {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
          </section>

          {/* Taxonomy */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">Taxonomy</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <SelectField name="designer_id" label="Designer" options={taxonomy.designers} />
              <SelectField name="maker_id" label="Maker" options={taxonomy.makers} />
              <SelectField name="category_id" label="Category" options={taxonomy.categories} />
              <SelectField name="style_id" label="Style" options={taxonomy.styles} />
              <SelectField name="period_id" label="Period" options={taxonomy.periods} />
              <SelectField name="country_id" label="Country" options={taxonomy.countries} />
            </div>
          </section>

          {/* Attribution */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">Attribution</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="designer_attribution" render={({ field }) => (
                <FormItem><FormLabel>Designer Attribution</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="maker_attribution" render={({ field }) => (
                <FormItem><FormLabel>Maker Attribution</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="period_attribution" render={({ field }) => (
                <FormItem><FormLabel>Period Attribution</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </section>

          {/* Dimensions & Condition */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">Dimensions & Condition</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="product_dimensions" render={({ field }) => (
                <FormItem><FormLabel>Product Dimensions</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="box_dimensions" render={({ field }) => (
                <FormItem><FormLabel>Box Dimensions</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="dimension_notes" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>Dimension Notes</FormLabel><FormControl><Textarea rows={2} {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="materials" render={({ field }) => (
                <FormItem><FormLabel>Materials</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="condition" render={({ field }) => (
                <FormItem><FormLabel>Condition</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="year_created" render={({ field }) => (
                <FormItem><FormLabel>Year Created</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </section>

          {/* Cross-Listing URLs */}
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
            </div>
          </section>

          {/* Notes */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">Notes</h2>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Internal Notes</FormLabel><FormControl><Textarea rows={3} {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
          </section>

          {/* Images (read-only for edit) */}
          {isEditing && product?.product_images?.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">Images</h2>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                {product.product_images
                  .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
                  .map((img: { id: string; image_url: string }) => (
                    <img key={img.id} src={img.image_url} alt="" className="w-full aspect-square object-cover rounded-md border border-border" />
                  ))}
              </div>
            </section>
          )}

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

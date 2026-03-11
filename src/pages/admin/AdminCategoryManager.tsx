import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Pencil, Trash2, ChevronRight, FolderOpen, Folder, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type Category = { id: string; name: string; slug: string | null };
type Subcategory = { id: string; name: string; slug: string | null; category_id: string; parent_id: string | null };

const toSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

type FormDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  onSubmit: (name: string) => void;
  isPending: boolean;
  initialName?: string;
};

const FormDialog = ({ open, onOpenChange, title, onSubmit, isPending, initialName = '' }: FormDialogProps) => {
  const [name, setName] = useState(initialName);

  // Reset name when dialog opens with new initial value
  const handleOpenChange = (v: boolean) => {
    if (v) setName(initialName);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wide">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(name); }} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <p className="text-xs text-muted-foreground mt-1">Slug: {toSlug(name) || '—'}</p>
          </div>
          <Button type="submit" disabled={isPending} className="w-full text-xs tracking-[0.1em] uppercase">
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const AdminCategoryManager = () => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<{ type: 'add-cat' | 'edit-cat' | 'add-sub' | 'edit-sub' | 'add-subsub' | 'edit-subsub'; categoryId?: string; subcategoryId?: string; name?: string; id?: string } | null>(null);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ['subcategories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subcategories').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Product counts per category
  const { data: catCounts = {} } = useQuery({
    queryKey: ['categories', 'product-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('id, category_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((p) => { if (p.category_id) counts[p.category_id] = (counts[p.category_id] || 0) + 1; });
      return counts;
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['categories'] });
    qc.invalidateQueries({ queryKey: ['subcategories'] });
  };

  const upsertCat = useMutation({
    mutationFn: async ({ id, name }: { id?: string; name: string }) => {
      const slug = toSlug(name);
      if (id) {
        const { error } = await supabase.from('categories').update({ name, slug }).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert({ name, slug });
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidateAll(); toast.success('Saved'); setDialog(null); },
    onError: (e) => toast.error(e.message),
  });

  const deleteCat = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success('Deleted'); },
    onError: (e) => toast.error(e.message),
  });

  const upsertSub = useMutation({
    mutationFn: async ({ id, name, category_id, parent_id }: { id?: string; name: string; category_id: string; parent_id?: string | null }) => {
      const slug = toSlug(name);
      if (id) {
        const { error } = await supabase.from('subcategories').update({ name, slug }).eq('id', id);
        if (error) throw error;
      } else {
        const payload: any = { name, slug, category_id };
        if (parent_id) payload.parent_id = parent_id;
        const { error } = await supabase.from('subcategories').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidateAll(); toast.success('Saved'); setDialog(null); },
    onError: (e) => toast.error(e.message),
  });

  const deleteSub = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subcategories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success('Deleted'); },
    onError: (e) => toast.error(e.message),
  });

  const getSubcategories = (categoryId: string) => subcategories.filter(s => s.category_id === categoryId && !s.parent_id);
  const getSubSubcategories = (parentId: string) => subcategories.filter(s => s.parent_id === parentId);

  const handleSubmit = (name: string) => {
    if (!dialog) return;
    switch (dialog.type) {
      case 'add-cat': upsertCat.mutate({ name }); break;
      case 'edit-cat': upsertCat.mutate({ id: dialog.id, name }); break;
      case 'add-sub': upsertSub.mutate({ name, category_id: dialog.categoryId! }); break;
      case 'edit-sub': upsertSub.mutate({ id: dialog.id, name, category_id: dialog.categoryId! }); break;
      case 'add-subsub': upsertSub.mutate({ name, category_id: dialog.categoryId!, parent_id: dialog.subcategoryId }); break;
      case 'edit-subsub': upsertSub.mutate({ id: dialog.id, name, category_id: dialog.categoryId! }); break;
    }
  };

  const dialogTitle = dialog ? {
    'add-cat': 'New Category',
    'edit-cat': 'Edit Category',
    'add-sub': 'New Subcategory',
    'edit-sub': 'Edit Subcategory',
    'add-subsub': 'New Sub-subcategory',
    'edit-subsub': 'Edit Sub-subcategory',
  }[dialog.type] : '';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl tracking-wide text-foreground">Category Manager</h1>
        <Button onClick={() => setDialog({ type: 'add-cat' })} className="text-xs tracking-[0.1em] uppercase">
          <Plus size={14} className="mr-1" /> Add Category
        </Button>
      </div>

      <FormDialog
        open={!!dialog}
        onOpenChange={(v) => { if (!v) setDialog(null); }}
        title={dialogTitle}
        onSubmit={handleSubmit}
        isPending={upsertCat.isPending || upsertSub.isPending}
        initialName={dialog?.name || ''}
      />

      <Accordion type="multiple" className="space-y-2">
        {categories.map((cat) => {
          const subs = getSubcategories(cat.id);
          return (
            <AccordionItem key={cat.id} value={cat.id} className="border border-border rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center gap-2 text-left flex-1">
                  <FolderOpen size={16} className="text-primary shrink-0" />
                  <span className="font-display tracking-wide">{cat.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {catCounts[cat.id] || 0} products · {subs.length} subcategories
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Button variant="outline" size="sm" onClick={() => setDialog({ type: 'edit-cat', id: cat.id, name: cat.name })} className="text-xs">
                    <Pencil size={12} className="mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { if (confirm('Delete this category and all its subcategories?')) deleteCat.mutate(cat.id); }} className="text-xs text-destructive hover:text-destructive">
                    <Trash2 size={12} className="mr-1" /> Delete
                  </Button>
                  <div className="flex-1" />
                  <Button variant="outline" size="sm" onClick={() => setDialog({ type: 'add-sub', categoryId: cat.id })} className="text-xs">
                    <Plus size={12} className="mr-1" /> Add Subcategory
                  </Button>
                </div>

                {subs.length > 0 && (
                  <Accordion type="multiple" className="ml-4 space-y-1">
                    {subs.map((sub) => {
                      const subSubs = getSubSubcategories(sub.id);
                      return (
                        <AccordionItem key={sub.id} value={sub.id} className="border border-border/60 rounded-md overflow-hidden">
                          <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-muted/30 text-sm">
                            <div className="flex items-center gap-2 text-left flex-1">
                              <Folder size={14} className="text-muted-foreground shrink-0" />
                              <span>{sub.name}</span>
                              <span className="text-xs text-muted-foreground ml-1">({subSubs.length})</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-3 pb-3">
                            <div className="flex items-center gap-2 mb-3">
                              <Button variant="ghost" size="sm" onClick={() => setDialog({ type: 'edit-sub', id: sub.id, name: sub.name, categoryId: cat.id })} className="text-xs h-7">
                                <Pencil size={12} className="mr-1" /> Edit
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete?')) deleteSub.mutate(sub.id); }} className="text-xs h-7 text-destructive hover:text-destructive">
                                <Trash2 size={12} className="mr-1" /> Delete
                              </Button>
                              <div className="flex-1" />
                              <Button size="sm" onClick={() => setDialog({ type: 'add-subsub', categoryId: cat.id, subcategoryId: sub.id })} className="text-xs tracking-[0.1em] uppercase">
                                <Plus size={12} className="mr-1" /> Add Sub-subcategory
                              </Button>
                            </div>

                            {subSubs.length > 0 && (
                              <div className="ml-4 space-y-1">
                                {subSubs.map((ss) => (
                                  <div key={ss.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/30 group">
                                    <FileText size={12} className="text-muted-foreground shrink-0" />
                                    <span className="text-sm flex-1">{ss.name}</span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDialog({ type: 'edit-subsub', id: ss.id, name: ss.name, categoryId: cat.id })}>
                                        <Pencil size={11} />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => { if (confirm('Delete?')) deleteSub.mutate(ss.id); }}>
                                        <Trash2 size={11} />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {categories.length === 0 && (
        <p className="text-muted-foreground text-center py-12">No categories yet. Add one to get started.</p>
      )}
    </div>
  );
};

export default AdminCategoryManager;

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Collection, CollectionProduct } from '@/types/database';

export function useCollections() {
  return useQuery<Collection[]>({
    queryKey: ['collections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data ?? []).map((d: any) => ({
        ...d,
        cover_image: d['cover-image'] ?? d.cover_image,
        slug: (d.slug || '').replace(/^collection\//, ''),
      }));
    },
  });
}

export function useCollectionBySlug(slug: string | undefined) {
  return useQuery<Collection | null>({
    queryKey: ['collection', slug],
    enabled: !!slug,
    queryFn: async () => {
      // Try with and without the collection/ prefix
      let { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('slug', slug!)
        .maybeSingle();
      if (!data) {
        ({ data, error } = await supabase
          .from('collections')
          .select('*')
          .eq('slug', `collection/${slug}`)
          .single());
      }
      if (error) throw error;
      return data ? { ...data, cover_image: (data as any)['cover-image'] ?? data.cover_image, slug: (data.slug || '').replace(/^collection\//, '') } as Collection : null;
    },
  });
}

export function useCollectionProducts(collectionId: string | undefined) {
  return useQuery<CollectionProduct[]>({
    queryKey: ['collection-products', collectionId],
    enabled: !!collectionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_products')
        .select('*, product:products(*, designer:designers(*), product_images(*))')
        .eq('collection_id', collectionId!)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as unknown as CollectionProduct[];
    },
  });
}

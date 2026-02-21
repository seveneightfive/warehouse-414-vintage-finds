import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { Product } from '@/types/database';

export function useProducts(filters?: {
  designer_id?: string;
  maker_id?: string;
  category_id?: string;
  style_id?: string;
  period_id?: string;
  country_id?: string;
  color_id?: string;
  search?: string;
  year_min?: number;
  year_max?: number;
  status?: string;
}) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          designer:designers(*),
          maker:makers(*),
          category:categories(*),
          style:styles(*),
          period:periods(*),
          country:countries(*),
          product_images(*),
          product_colors(*, color:colors(*))
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      } else {
        query = query.in('status', ['available', 'on_hold', 'sold']);
      }

      if (filters?.designer_id) query = query.eq('designer_id', filters.designer_id);
      if (filters?.maker_id) query = query.eq('maker_id', filters.maker_id);
      if (filters?.category_id) query = query.eq('category_id', filters.category_id);
      if (filters?.style_id) query = query.eq('style_id', filters.style_id);
      if (filters?.period_id) query = query.eq('period_id', filters.period_id);
      if (filters?.country_id) query = query.eq('country_id', filters.country_id);
      if (filters?.search) query = query.ilike('name', `%${filters.search}%`);
      if (filters?.year_min) query = query.gte('year', filters.year_min);
      if (filters?.year_max) query = query.lte('year', filters.year_max);

      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          designer:designers(*),
          maker:makers(*),
          category:categories(*),
          style:styles(*),
          period:periods(*),
          country:countries(*),
          product_images(*),
          product_colors(*, color:colors(*))
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Product;
    },
    enabled: !!id,
  });
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          designer:designers(*),
          product_images(*)
        `)
        .eq('status', 'available')
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useSimilarProducts(productId: string | undefined, categoryId: string | null | undefined) {
  return useQuery({
    queryKey: ['products', 'similar', productId, categoryId],
    queryFn: async () => {
      if (!productId) return [];
      let query = supabase
        .from('products')
        .select(`*, designer:designers(*), product_images(*)`)
        .neq('id', productId)
        .eq('status', 'available')
        .limit(4);
      if (categoryId) query = query.eq('category_id', categoryId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!productId,
  });
}

export function useFilterOptions() {
  return useQuery({
    queryKey: ['filter-options'],
    queryFn: async () => {
      const [designers, makers, categories, styles, periods, countries, colors] = await Promise.all([
        supabase.from('designers').select('*').order('name'),
        supabase.from('makers').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('styles').select('*').order('name'),
        supabase.from('periods').select('*').order('name'),
        supabase.from('countries').select('*').order('name'),
        supabase.from('colors').select('*').order('name'),
      ]);
      return {
        designers: designers.data || [],
        makers: makers.data || [],
        categories: categories.data || [],
        styles: styles.data || [],
        periods: periods.data || [],
        countries: countries.data || [],
        colors: colors.data || [],
      };
    },
  });
}

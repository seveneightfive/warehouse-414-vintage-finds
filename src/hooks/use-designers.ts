import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { Designer } from '@/types/database';

export function useDesigners() {
  return useQuery({
    queryKey: ['designers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('designers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Designer[];
    },
  });
}

export function useDesigner(slug: string | undefined) {
  return useQuery({
    queryKey: ['designer', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('designers')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      return data as Designer | null;
    },
    enabled: !!slug,
  });
}

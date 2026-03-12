import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { Maker } from '@/types/database';

export function useMakers() {
  return useQuery({
    queryKey: ['makers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('makers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Maker[];
    },
  });
}

export function useMaker(slug: string | undefined) {
  return useQuery({
    queryKey: ['maker', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('makers')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      return data as Maker | null;
    },
    enabled: !!slug,
  });
}

import { getSupabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { Maker } from '@/types/database';

export function useMakers() {
  return useQuery({
    queryKey: ['makers'],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('makers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Maker[];
    },
  });
}

export function useMaker(id: string | undefined) {
  return useQuery({
    queryKey: ['maker', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await getSupabase()
        .from('makers')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Maker;
    },
    enabled: !!id,
  });
}

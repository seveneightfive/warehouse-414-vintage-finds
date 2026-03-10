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

export function useDesigner(id: string | undefined) {
  return useQuery({
    queryKey: ['designer', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('designers')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Designer;
    },
    enabled: !!id,
  });
}

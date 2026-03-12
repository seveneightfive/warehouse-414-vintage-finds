import { useParams } from 'react-router-dom';
import { useMaker } from '@/hooks/use-makers';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@/types/database';

const MakerDetail = () => {
  const { slug } = useParams();
  const { data: maker, isLoading } = useMaker(slug);

  const { data: products } = useQuery({
    queryKey: ['maker-products', maker?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, product_images(*)')
        .eq('maker_id', maker!.id)
        .order('name');
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!maker?.id,
  });

  if (isLoading) {
    return <div className="container mx-auto px-4 py-12"><div className="h-8 bg-muted animate-pulse rounded w-1/3" /></div>;
  }

  if (!maker) {
    return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Maker not found.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mb-12">
        <h1 className="font-display text-3xl tracking-wide text-foreground mb-4">{maker.name}</h1>
        {maker.about && <p className="text-muted-foreground leading-relaxed">{maker.about}</p>}
      </div>

      {products && products.length > 0 && (
        <div>
          <h2 className="font-display text-xl tracking-[0.2em] uppercase text-foreground mb-8">
            Pieces by {maker.name}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MakerDetail;

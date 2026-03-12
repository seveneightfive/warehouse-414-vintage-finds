import { useParams } from 'react-router-dom';
import { useDesigner } from '@/hooks/use-designers';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@/types/database';

const DesignerDetail = () => {
  const { slug } = useParams();
  const { data: designer, isLoading } = useDesigner(slug);

  const { data: products } = useQuery({
    queryKey: ['designer-products', designer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, product_images(*)')
        .eq('designer_id', designer!.id)
        .order('name');
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!designer?.id,
  });

  if (isLoading) {
    return <div className="container mx-auto px-4 py-12"><div className="h-8 bg-muted animate-pulse rounded w-1/3" /></div>;
  }

  if (!designer) {
    return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Designer not found.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mb-12">
        <h1 className="font-display text-3xl tracking-wide text-foreground mb-4">{designer.name}</h1>
        {designer.about && <p className="text-muted-foreground leading-relaxed">{designer.about}</p>}
      </div>

      {products && products.length > 0 && (
        <div>
          <h2 className="font-display text-xl tracking-[0.2em] uppercase text-foreground mb-8">
            Pieces by {designer.name}
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

export default DesignerDetail;

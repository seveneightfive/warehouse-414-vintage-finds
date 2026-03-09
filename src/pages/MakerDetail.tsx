import { useParams } from 'react-router-dom';
import { useMaker } from '@/hooks/use-makers';
import { useProducts } from '@/hooks/use-products';
import ProductCard from '@/components/ProductCard';

const MakerDetail = () => {
  const { id } = useParams();
  const { data: maker, isLoading } = useMaker(id);
  const { data: products } = useProducts({ maker_id: id });

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

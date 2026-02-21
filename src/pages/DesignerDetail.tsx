import { useParams, Link } from 'react-router-dom';
import { useDesigner } from '@/hooks/use-designers';
import { useProducts } from '@/hooks/use-products';
import ProductCard from '@/components/ProductCard';

const DesignerDetail = () => {
  const { id } = useParams();
  const { data: designer, isLoading } = useDesigner(id);
  const { data: products } = useProducts({ designer_id: id });

  if (isLoading) {
    return <div className="container mx-auto px-4 py-12"><div className="h-8 bg-muted animate-pulse rounded w-1/3" /></div>;
  }

  if (!designer) {
    return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Designer not found.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mb-12">
        {designer.image_url && (
          <img src={designer.image_url} alt={designer.name} className="w-32 h-32 rounded-full object-cover mb-6" />
        )}
        <h1 className="font-display text-3xl tracking-wide text-foreground mb-4">{designer.name}</h1>
        {designer.bio && <p className="text-muted-foreground leading-relaxed">{designer.bio}</p>}
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

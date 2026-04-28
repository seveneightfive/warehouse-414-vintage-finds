import { useParams } from 'react-router-dom';
import { useCollectionBySlug, useCollectionProducts } from '@/hooks/use-collections';
import ProductCard from '@/components/ProductCard';

const CollectionDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: collection, isLoading: loadingCollection } = useCollectionBySlug(slug);
  const { data: items, isLoading: loadingProducts } = useCollectionProducts(collection?.id);

  if (loadingCollection) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="h-8 w-64 bg-muted animate-pulse mx-auto mb-4" />
        <div className="h-4 w-96 bg-muted animate-pulse mx-auto" />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">Collection not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-20">
      <h1 className="font-display text-3xl md:text-4xl tracking-[0.3em] uppercase text-center text-foreground mb-4">
        {collection.name}
      </h1>
      {collection.description && (
        <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
          {collection.description}
        </p>
      )}

      {loadingProducts ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square bg-muted animate-pulse rounded-sm" />
          ))}
        </div>
      ) : items && items.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {items.map((item) =>
            item.product ? <ProductCard key={item.id} product={item.product} /> : null
          )}
        </div>
      ) : (
        <p className="text-center text-muted-foreground text-sm">No products in this collection yet.</p>
      )}
    </div>
  );
};

export default CollectionDetail;

import { Link } from 'react-router-dom';
import { useFeaturedProducts } from '@/hooks/use-products';
import ProductCard from '@/components/ProductCard';
import heroImage from '@/assets/hero-warehouse.jpg';

const Index = () => {
  const { data: products, isLoading } = useFeaturedProducts();

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-background/70" />
        <div className="relative z-10 text-center px-4">
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl tracking-[0.4em] uppercase text-foreground mb-4">
            Warehouse 414
          </h1>
          <p className="text-muted-foreground text-sm md:text-base tracking-[0.25em] uppercase mb-8">
            Curated vintage & mid-century modern furniture
          </p>
          <Link
            to="/catalog"
            className="inline-block border border-foreground text-foreground px-8 py-3 text-xs tracking-[0.3em] uppercase hover:bg-foreground hover:text-background transition-all duration-300"
          >
            Browse Collection
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="font-display text-2xl tracking-[0.25em] uppercase text-center text-foreground mb-12">
          Featured Pieces
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse rounded-sm" />
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground text-sm">No products yet.</p>
        )}
        <div className="text-center mt-12">
          <Link
            to="/catalog"
            className="inline-block border border-muted-foreground text-muted-foreground px-6 py-2 text-xs tracking-[0.2em] uppercase hover:border-foreground hover:text-foreground transition-all"
          >
            View All
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Index;

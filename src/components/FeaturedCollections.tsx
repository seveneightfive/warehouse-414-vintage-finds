import { Link } from 'react-router-dom';
import { useCollections } from '@/hooks/use-collections';

const FeaturedCollections = () => {
  const { data: collections, isLoading } = useCollections();

  if (isLoading) {
    return (
      <section className="bg-muted py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-muted-foreground/10 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!collections || collections.length === 0) return null;

  return (
    <section className="bg-muted py-20">
      <div className="container mx-auto px-4">
        <div className="flex gap-8 md:gap-12">
          {/* Vertical title */}
          <div className="hidden md:flex flex-col items-center pt-4 shrink-0">
            <span
              className="font-display text-xs tracking-[0.3em] uppercase text-muted-foreground"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              Featured collections
            </span>
            <div className="w-px bg-border flex-1 mt-4" />
          </div>

          {/* Mobile title */}
          <h2 className="md:hidden font-display text-2xl tracking-[0.25em] uppercase text-foreground mb-8 w-full text-center">
            Featured Collections
          </h2>

          {/* Collection cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 flex-1">
            {collections.map((collection) => (
              <Link
                key={collection.id}
                to={`/collection/${collection.slug}`}
                className="group block"
              >
                <div className="aspect-[3/4] overflow-hidden bg-muted-foreground/10 mb-3">
                  {collection.cover_image ? (
                    <img
                      src={collection.cover_image}
                      alt={collection.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs tracking-widest uppercase">
                      No Image
                    </div>
                  )}
                </div>
                <div className="border-t border-border pt-3">
                  <h3 className="font-display text-xs tracking-[0.2em] uppercase text-foreground group-hover:text-primary transition-colors">
                    {collection.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedCollections;

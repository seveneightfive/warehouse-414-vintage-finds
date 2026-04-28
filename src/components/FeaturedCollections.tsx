import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
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

  const CollectionCard = ({ collection }: { collection: (typeof collections)[0] }) => (
    <Link
      to={`/collection/${collection.slug}`}
      className="group block shrink-0 w-[80vw] md:w-auto"
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
      <div className="border-t border-border pt-3 flex items-center justify-between">
        <h3 className="font-display text-xs tracking-[0.2em] uppercase text-foreground group-hover:text-primary transition-colors">
          {collection.name}
        </h3>
        <span className="font-display text-xs tracking-[0.15em] uppercase text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1 whitespace-nowrap">
          Shop Now <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </Link>
  );

  return (
    <section className="bg-muted py-20">
      {/* Mobile: horizontal scroll */}
      <div className="md:hidden px-4">
        <h2 className="font-display text-2xl tracking-[0.15em] uppercase text-foreground mb-6">
          Featured Collections
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {collections.map((collection) => (
            <div key={collection.id} className="snap-start">
              <CollectionCard collection={collection} />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: grid with vertical title */}
      <div className="hidden md:block container mx-auto px-4">
        <div className="flex gap-8 md:gap-12">
          <div className="flex flex-col items-center pt-4 shrink-0">
            <span
              className="font-display text-xs tracking-[0.3em] uppercase text-muted-foreground"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              Featured collections
            </span>
            <div className="w-px bg-border flex-1 mt-4" />
          </div>
          <div className="grid grid-cols-3 gap-6 flex-1">
            {collections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedCollections;

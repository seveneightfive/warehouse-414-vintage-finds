import { Link } from 'react-router-dom';
import type { Product } from '@/types/database';

const ProductCard = ({ product }: { product: Product }) => {
  const image = product.product_images?.sort((a, b) => a.position - b.position)?.[0];
  const designerName = product.designer?.name;

  return (
    <Link to={`/product/${product.id}`} className="group block">
      <div className="aspect-square overflow-hidden rounded-sm bg-muted mb-3">
        {image ? (
          <img
            src={image.url}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs tracking-widest uppercase">
            No Image
          </div>
        )}
      </div>
      <h3 className="text-sm font-display tracking-wide text-foreground group-hover:text-primary transition-colors line-clamp-1">
        {product.title}
      </h3>
      {designerName && (
        <p className="text-xs text-muted-foreground mt-0.5 lowercase">{designerName}</p>
      )}
      {product.price && (
        <p className="text-sm text-foreground mt-1 font-medium">
          ${product.price.toLocaleString()}
        </p>
      )}
      {product.status === 'on_hold' && (
        <span className="inline-block mt-1 text-[10px] tracking-[0.15em] uppercase text-amber-500">
          on hold
        </span>
      )}
    </Link>
  );
};

export default ProductCard;

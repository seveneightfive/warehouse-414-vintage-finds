import { Link } from 'react-router-dom';
import type { Product } from '@/types/database';

const ProductCard = ({ product }: { product: Product }) => {
  const image = product.product_images?.sort((a, b) => a.sort_order - b.sort_order)?.[0];
  const imageUrl = image?.image_url || product.featured_image_url;
  const designerName = product.designer?.name;

  return (
    <Link to={`/product/${product.id}`} className="group block">
      <div className="aspect-square overflow-hidden rounded-sm bg-muted mb-3">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs tracking-widest uppercase">
            No Image
          </div>
        )}
      </div>
      <h3 className="text-sm font-display tracking-wide text-foreground group-hover:text-primary transition-colors line-clamp-2">
        {product.name}
      </h3>
      {designerName && (
        <p className="text-xs text-muted-foreground mt-0.5">{designerName}</p>
      )}
      {product.price && (
        <p className="text-sm text-foreground mt-1 font-medium">
          ${product.price.toLocaleString()}
        </p>
      )}
      {product.status === 'on_hold' && (
        <span className="inline-block mt-1 text-[10px] tracking-[0.15em] uppercase text-primary">
          on hold
        </span>
      )}
    </Link>
  );
};

export default ProductCard;

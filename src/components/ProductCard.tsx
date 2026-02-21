import { Link } from 'react-router-dom';
import type { Product } from '@/types/database';

const ProductCard = ({ product }: { product: Product }) => {
  const image = product.product_images?.sort((a, b) => a.sort_order - b.sort_order)?.[0];
  const imageUrl = image?.image_url || product.featured_image_url;
  const designerName = product.designer?.name;

  return (
    <Link to={`/product/${product.id}`} className="group block">
      <div className="aspect-square overflow-hidden rounded-sm bg-muted mb-3 relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            width={400}
            height={400}
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs tracking-widest uppercase">
            No Image
          </div>
        )}
        {product.status === 'sold' && (
          <span className="absolute top-2 left-2 bg-black text-white font-display text-[10px] tracking-[0.15em] px-2.5 py-1">
            sold
          </span>
        )}
        {product.status === 'on_hold' && (
          <span className="absolute top-2 left-2 bg-white text-black font-display text-[10px] tracking-[0.15em] px-2.5 py-1">
            on hold
          </span>
        )}
      </div>
      <h3 className="text-sm font-display tracking-wide text-foreground group-hover:text-primary transition-colors line-clamp-2">
        {product.name}
      </h3>
      {designerName && (
        <p className="text-xs text-muted-foreground mt-0.5">{designerName}</p>
      )}
      {product.price && (
        <p className="text-sm text-muted-foreground mt-1 font-display">
          ${product.price.toLocaleString()}
        </p>
      )}
    </Link>
  );
};

export default ProductCard;

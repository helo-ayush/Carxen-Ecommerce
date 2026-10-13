import React from 'react';
import type { Product } from '@/data/products';

interface ProductArtProps {
  product: Product;
  className?: string;
  style?: React.CSSProperties;
}

export function ProductArt({ product, className, style }: ProductArtProps) {
  const getViewBox = () => {
    switch (product.a) {
      case 'seat':
        return '0 0 320 400';
      case 'mats':
        return '0 0 400 300';
      case 'wheel':
        return '0 0 320 320';
      case 'trunk':
        return '0 0 320 220';
      case 'pillow':
      case 'arm':
      default:
        return '0 0 320 200';
    }
  };

  return (
    <svg viewBox={getViewBox()} className={className} style={style} aria-label={product.n}>
      <use href={`#a-${product.a}`} />
    </svg>
  );
}

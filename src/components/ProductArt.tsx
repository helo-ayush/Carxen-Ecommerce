import React from 'react';
import type { Product } from '@/data/products';

interface ProductArtProps {
  product: Product;
  className?: string;
  style?: React.CSSProperties;
}

function isUrl(val?: string | null): val is string {
  if (!val) return false;
  const t = val.trim();
  return t.startsWith('http://') || t.startsWith('https://') || t.startsWith('/') || t.startsWith('data:image');
}

export function ProductArt({ product, className, style }: ProductArtProps) {
  const rawSrc = product.image || (isUrl(product.a) ? product.a : undefined);
  const imgSrc =
    product.n?.toLowerCase().includes('quilted seat bench') ||
    rawSrc?.includes('photo-1486006920555')
      ? '/quilted-seat-bench.jpg'
      : rawSrc;

  if (imgSrc) {
    return (
      <img
        src={imgSrc}
        alt={product.n}
        className={className}
        style={{ objectFit: 'cover', width: '100%', height: '100%', borderRadius: 'inherit', ...style }}
        loading="lazy"
      />
    );
  }

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
      <use href={`#a-${product.a || 'seat'}`} />
    </svg>
  );
}

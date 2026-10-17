'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/data/products';
import { formatINR, TINT_OPTIONS } from '@/data/products';
import { ProductArt } from '@/components/ProductArt';

export interface ProductCardProps {
  product: Product;
  isSpot?: boolean;
  isFav: boolean;
  onToggleFav: (productId: number) => void;
  onAddToCart: (productId: number, qty?: number) => void;
  onOpenCart?: () => void;
  onTagClick?: (tag: string) => void;
  fitText?: string | null;
  isCustomFitBadge?: boolean;
  className?: string;
}

export function ProductCard({
  product,
  isSpot = false,
  isFav,
  onToggleFav,
  onAddToCart,
  onOpenCart,
  onTagClick,
  fitText,
  isCustomFitBadge = false,
  className = '',
}: ProductCardProps) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);

  const discountPercent =
    product.o && product.o > product.p
      ? Math.round(((product.o - product.p) / product.o) * 100)
      : 0;

  // Use the EXACT SAME color options that are displayed on the individual product page
  const colorOptions = useMemo(() => {
    if (product.colors && product.colors.length > 0) {
      return product.colors.map((c) => ({
        name: c.name,
        hex: c.hex,
        filter: c.filter || 'none',
      }));
    }
    const tints =
      product.tintOptions && product.tintOptions.length > 0
        ? product.tintOptions
        : TINT_OPTIONS;
    return tints.map((t) => ({
      name: t[0],
      filter: t[1],
      hex: t[2],
    }));
  }, [product]);

  const activeTintFilter = colorOptions[selectedColorIdx]?.filter;

  const handleCardClick = () => {
    router.push(`/product/${product.id}`);
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAdding(true);
    onAddToCart(product.id, 1);
    if (onOpenCart) {
      onOpenCart();
    }
    setTimeout(() => setIsAdding(false), 800);
  };

  const [isPopping, setIsPopping] = useState(false);

  const handleFavClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFav) {
      setIsPopping(true);
      setTimeout(() => setIsPopping(false), 700);
    }
    onToggleFav(product.id);
  };

  const handleTagClick = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    if (onTagClick) {
      onTagClick(tag);
    } else {
      router.push(`/shop?q=${encodeURIComponent(tag)}`);
    }
  };

  const categoryName = (() => {
    if (product.categoryLabel) return product.categoryLabel;
    switch (product.c) {
      case 'seats':
        return 'Seat Covers';
      case 'mats':
        return 'Floor Mats';
      case 'steering':
        return 'Steering Covers';
      case 'comfort':
        return 'Cabin Comfort';
      default:
        return product.s ? `${product.s} Series` : 'Car Accessories';
    }
  })();

  // Single subtle badge matching UI reference (never stacked, never stretched)
  const badge = (() => {
    if (isCustomFitBadge && fitText && product.c === 'mats' && (product.id === 2 || !product.o)) {
      return { type: 'fit', label: fitText };
    }
    if (discountPercent > 0) return { type: 'sale', label: 'Sale' };
    if (product.top || product.spot) return { type: 'best', label: 'Best Seller' };
    if (product.nw) return { type: 'new', label: 'New' };
    if (isCustomFitBadge && fitText) return { type: 'fit', label: fitText };
    return null;
  })();

  return (
    <article
      className={`ref-card ${className}`}
      data-id={product.id}
    >
      {/* Inset rounded media frame */}
      <div className="ref-media" onClick={handleCardClick}>
        {/* Top-Left Badge: Single, compact, subtle pill */}
        {badge && (
          <div className="ref-badge-wrap">
            <span className={`ref-badge ref-badge-${badge.type}`}>
              {badge.label}
            </span>
          </div>
        )}

        {/* Top-Right Heart Wishlist Button */}
        <button
          className={`ref-hrt ${isFav ? 'on' : ''} ${isPopping ? 'pop' : ''}`}
          onClick={handleFavClick}
          aria-label={isFav ? 'Remove from wishlist' : 'Add to wishlist'}
          type="button"
        >
          <svg viewBox="0 0 24 24">
            <path d="M12 20s-7-4.6-9-9A5.2 5.2 0 0 1 12 6.4 5.2 5.2 0 0 1 21 11c-2 4.4-9 9-9 9z" />
          </svg>
        </button>

        {/* Product Artwork with dynamic color filter reacting to swatch click */}
        <ProductArt
          product={product}
          style={{
            filter:
              activeTintFilter && activeTintFilter !== 'none'
                ? activeTintFilter
                : undefined,
          }}
        />
      </div>

      {/* Info Section */}
      <div className="ref-info">
        <div className="ref-info-top">
          {/* Category */}
          <div className="ref-category">{categoryName}</div>

          {/* Product Title */}
          <h3
            className="ref-title"
            onClick={handleCardClick}
            title={product.n}
          >
            {product.n}
          </h3>

          {/* Rating row: ★ 4.8 (124 reviews) */}
          <div className="ref-rating">
            <span className="star">★</span>
            <span className="score">{product.r.toFixed(1)}</span>
            <span className="count">({product.rv} reviews)</span>
          </div>

          {/* Product Tags */}
          {Array.isArray(product.tags) && product.tags.length > 0 && (
            <div className="ref-tags" aria-label="Product tags">
              {product.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="ref-tag-pill"
                  onClick={(e) => handleTagClick(e, tag)}
                  title={`Search products with tag #${tag}`}
                >
                  #{tag}
                </span>
              ))}
              {product.tags.length > 3 && (
                <span
                  className="ref-tag-pill more"
                  title={product.tags.slice(3).join(', ')}
                >
                  +{product.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="ref-info-bottom">
          {/* Bottom row: Price on the left, matching swatches on the right (eliminating dead space) */}
          <div className="ref-bottom-row">
            <div className="ref-price-row">
              <span className="ref-price-now">{formatINR(product.p)}</span>
              {product.o && product.o > product.p && (
                <span className="ref-price-old">{formatINR(product.o)}</span>
              )}
              {discountPercent > 0 && (
                <span className="ref-price-discount">-{discountPercent}%</span>
              )}
            </div>

            {/* Matching Color Swatches */}
            <div className="ref-swatches" aria-label="Color options">
              {colorOptions.map((color, idx) => (
                <span
                  key={idx}
                  className={`ref-swatch ${selectedColorIdx === idx ? 'active' : ''}`}
                  style={{ background: color.hex }}
                  title={color.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedColorIdx(idx);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Full-Width Add to Cart Button */}
          <button
            type="button"
            className={`ref-btn ref-btn-primary ${isAdding ? 'ok' : ''}`}
            onClick={handleAddClick}
            aria-label={`Add ${product.n} to cart`}
          >
            {isAdding ? (
              <>
                <svg viewBox="0 0 24 24" style={{ strokeWidth: 2.2 }}>
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span>Added to Cart</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24">
                  <circle cx="9" cy="20" r="1" />
                  <circle cx="18" cy="20" r="1" />
                  <path d="M1 1h4l2.68 12.39a2 2 0 0 0 2 1.61h8.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                <span>Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/data/products';
import { formatINR, TINT_OPTIONS } from '@/data/products';
import { ProductArt } from '@/components/ProductArt';
import {
  categoryLabel,
  isMatCategory,
  isSeatCategory,
  isSteeringCategory,
} from '@/lib/storefront/categories';

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
  onTagClick: _onTagClick,
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
  const colorOptions: { name: string; hex: string; filter: string; images?: string[] }[] = useMemo(() => {
    if (product.colors && product.colors.length > 0) {
      return product.colors.map((c) => ({
        name: c.name,
        hex: c.hex,
        filter: c.filter || 'none',
        images: Array.isArray(c.images) && c.images.length > 0 ? c.images : undefined,
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
      images: undefined,
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

  const isSeats = isSeatCategory(product.c);
  const isMats = isMatCategory(product.c);
  const isSteering = isSteeringCategory(product.c);

  const categoryName = (() => {
    if (product.categoryLabel) return product.categoryLabel;
    switch (true) {
      case isSeats:
        return 'Seat Covers';
      case isMats:
        return 'Floor Mats';
      case isSteering:
        return 'Steering Covers';
      default:
        return categoryLabel(product.c);
    }
  })();

  // First meaningful line from the factory spec sheet — design and colour when
  // the item has them, so the chip is a real attribute instead of set dressing.
  const specChip = (() => {
    const specs = Array.isArray(product.sp) ? product.sp : [];
    const find = (pattern: RegExp) => specs.find(([key]) => pattern.test(key.trim()));
    const design = find(/^design( pattern)?$/i);
    const colour = find(/^(upper|colour|color|fabric|material|mat type)$/i);
    if (design && colour) return `${design[1]} · ${colour[1]}`;
    const fallback =
      design || colour || specs.find(([key]) => !/^(item code|uom|hsn|gst|sku)$/i.test(key.trim()));
    return fallback ? fallback[1] : null;
  })();

  // Single subtle luxury tag matching clean UI
  const badge = (() => {
    if (isCustomFitBadge && fitText && isMats && (product.id === 2 || !product.o)) {
      return { type: 'fit', label: fitText.replace(/^[✓✔\s]+/, '') };
    }
    if (discountPercent > 0) return { type: 'sale', label: `${discountPercent}% OFF` };
    if (product.top || product.spot) return { type: 'best', label: 'Best Seller' };
    if (product.nw) return { type: 'new', label: 'New' };
    if (isCustomFitBadge && fitText) return { type: 'fit', label: fitText.replace(/^[✓✔\s]+/, '') };
    return null;
  })();

  return (
    <article
      className={`ref-card ${className}`}
      data-id={product.id}
    >
      {/* Inset rounded media frame */}
      <div className="ref-media" onClick={handleCardClick}>
        {/* Top-Left Badge: Clean, subtle luxury tag */}
        {badge && (
          <div className="ref-badge-wrap">
            <span className={`ref-badge ref-badge-${badge.type}`}>
              {badge.type === 'sale' && <span className="ref-badge-dot ref-badge-dot-sale" />}
              {badge.type === 'new' && <span className="ref-badge-dot ref-badge-dot-new" />}
              {badge.type === 'best' && <span className="ref-badge-star">★</span>}
              {badge.type === 'fit' && <span className="ref-badge-check">✓</span>}
              <span>{badge.label}</span>
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
          product={{
            ...product,
            image: colorOptions[selectedColorIdx]?.images?.[0] || product.image,
          }}
          style={{
            filter:
              (!colorOptions[selectedColorIdx]?.images || colorOptions[selectedColorIdx]?.images.length === 0) &&
              activeTintFilter &&
              activeTintFilter !== 'none'
                ? activeTintFilter
                : undefined,
          }}
        />
      </div>

      {/* Info Section */}
      <div className="ref-info">
        <div className="ref-info-top">
          {/* Top Meta Row: Category on left, Rating at right top */}
          <div className="ref-meta-row">
            <span className="ref-category">{categoryName}</span>
            <div className="ref-rating">
              {product.rv > 0 ? (
                <>
                  <span className="star">★</span>
                  <span className="score">{product.r.toFixed(1)}</span>
                  <span className="count">({product.rv})</span>
                </>
              ) : (
                <span className="count">No reviews yet</span>
              )}
            </div>
          </div>

          {/* Product Title */}
          <h3
            className="ref-title"
            onClick={handleCardClick}
            title={product.n}
          >
            {product.n}
          </h3>

          {/* Feature chips: real fitment, then a real attribute from the spec sheet */}
          <div className="ref-feature-chips">
            <span className="ref-feature-chip fit">
              {fitText?.replace(/^[✓✔\s]+/, '') ||
                (product.customFit !== false ? 'Custom fit' : 'Universal fit')}
            </span>
            {specChip && <span className="ref-feature-chip spec">{specChip}</span>}
          </div>
        </div>

        <div className="ref-info-bottom">
          {/* Price & Swatches in a balanced, spacious row */}
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

            {/* Subtle, minimalist color swatches */}
            {colorOptions.length > 1 && (
              <div className="ref-swatches" aria-label="Color options">
                {colorOptions.map((color, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`ref-swatch ${selectedColorIdx === idx ? 'active' : ''}`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                    aria-label={`Select ${color.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedColorIdx(idx);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            className={`ref-btn ref-btn-primary ${isAdding ? 'ok' : ''}`}
            onClick={handleAddClick}
            aria-label={`Add ${product.n} to cart`}
          >
            {isAdding ? (
              <>
                <svg viewBox="0 0 24 24" className="ref-btn-svg" strokeWidth="2.4" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                </svg>
                <span>Added to Cart</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="ref-btn-svg" strokeWidth="2" fill="none" stroke="currentColor">
                  <circle cx="9" cy="20" r="1.5" />
                  <circle cx="18" cy="20" r="1.5" />
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

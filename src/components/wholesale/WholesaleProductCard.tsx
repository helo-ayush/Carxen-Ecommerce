'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Product } from '@/data/products';
import { formatINR, TINT_OPTIONS } from '@/data/products';
import { ProductArt } from '@/components/ProductArt';
import { categoryLabel } from '@/lib/storefront/categories';
import { getWholesaleTiers } from '@/lib/storefront/wholesale-pricing';
import { Plus, Minus, Check, Layers, ChevronRight, Sparkles } from 'lucide-react';

export interface WholesaleProductCardProps {
  product: Product;
  quantity?: number;
  inBasketQty?: number;
  onQuantityChange?: (productId: number, qty: number) => void;
  onAddToBasket?: (product: Product, qty: number) => void;
  className?: string;
}

export function WholesaleProductCard({
  product,
  quantity,
  inBasketQty = 0,
  onQuantityChange,
  onAddToBasket,
  className = '',
}: WholesaleProductCardProps) {
  const router = useRouter();
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [isAdding, setIsAdding] = useState(false);

  const moq = Math.max(1, product.b2bMoq || 5);
  const isCustom = Boolean(product.isCustomProduct);
  const maxCustomQty = isCustom ? Math.max(0, Math.floor(product.stockCount ?? 0)) : null;
  const isOutOfStock = isCustom && (product.inStock === false || (maxCustomQty ?? 0) <= 0);
  const insufficientForMoq = isCustom && !isOutOfStock && maxCustomQty !== null && maxCustomQty < moq;
  const cannotOrder = isOutOfStock || insufficientForMoq;
  const rawQty = quantity !== undefined ? quantity : (inBasketQty > 0 ? inBasketQty : moq);
  const currentQty = maxCustomQty !== null && maxCustomQty >= moq ? Math.min(rawQty, maxCustomQty) : rawQty;

  const tiers = useMemo(() => getWholesaleTiers(product), [product]);
  const t1 = tiers[0]?.unitPrice || Math.round(product.p * 0.85);
  const t2 = tiers[1]?.unitPrice || Math.round(product.p * 0.75);
  const t2Min = tiers[1]?.minQty || 15;
  const retailPrice = product.o || product.p;
  const marginPercent = Math.round(((retailPrice - t1) / retailPrice) * 100);

  // Use identical color options as storefront
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
    router.push(`/wholesale/product/${product.id}`);
  };

  const handleQtyChange = (val: number) => {
    if (cannotOrder) return;
    const bounded = maxCustomQty !== null ? Math.min(maxCustomQty, Math.max(moq, val)) : Math.max(moq, val);
    if (onQuantityChange) {
      onQuantityChange(product.id, bounded);
    }
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock || insufficientForMoq) return;
    setIsAdding(true);
    if (onAddToBasket) {
      onAddToBasket(product, currentQty);
    }
    setTimeout(() => setIsAdding(false), 700);
  };

  const categoryName = product.categoryLabel?.trim() || categoryLabel(product.c);

  const getFitmentString = (): string => {
    if (!product.fitment) return 'Universal Fit';
    if (typeof product.fitment === 'string') return product.fitment;
    if (Array.isArray(product.fitment)) return product.fitment.join(', ');
    if (typeof product.fitment === 'object') {
      const obj = product.fitment as Record<string, any>;
      return `${obj.brand || ''} ${obj.model || ''}`.trim() || 'Custom-Fit';
    }
    return 'Custom-Fit';
  };

  const fitmentLabel = getFitmentString();
  const isDraftDifferent = inBasketQty > 0 && currentQty !== inBasketQty;
  const isInBasket = inBasketQty > 0 && !isDraftDifferent;

  return (
    <article
      className={`ws-product-card ${className}`}
      data-id={product.id}
    >
      {/* Media Box */}
      <div className="ws-card-media" onClick={handleCardClick} title="View wholesale product specifications">
        {/* Top-Left Minimal MOQ Indicator */}
        <div className="ws-card-badges">
          <span className="ws-card-badge moq">
            <span className="ws-card-badge-dot" />
            <span>MOQ: {moq}</span>
          </span>
          {isOutOfStock ? (
            <span
              className="ws-card-badge"
              style={{ background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}
            >
              <span className="ws-card-badge-dot" style={{ background: '#dc2626' }} />
              <span>Out of Stock</span>
            </span>
          ) : insufficientForMoq ? (
            <span
              className="ws-card-badge"
              style={{ background: '#fff7ed', color: '#c2410c', borderColor: '#fed7aa' }}
            >
              <span className="ws-card-badge-dot" style={{ background: '#ea580c' }} />
              <span>Only {maxCustomQty} Left</span>
            </span>
          ) : isCustom && maxCustomQty !== null && maxCustomQty <= 15 ? (
            <span
              className="ws-card-badge"
              style={{ background: '#fffbeb', color: '#b45309', borderColor: '#fde68a' }}
            >
              <span className="ws-card-badge-dot" style={{ background: '#d97706' }} />
              <span>Only {maxCustomQty} Left</span>
            </span>
          ) : null}
        </div>

        {/* Artwork */}
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

        {/* Quick View Link Indicator */}
        <div className="ws-card-hover-overlay">
          <span>View B2B Details</span>
          <ChevronRight size={14} />
        </div>
      </div>

      {/* Info Section */}
      <div className="ws-card-info">
        <div className="ws-card-info-top">
          {/* Category & Series row */}
          <div className="ws-card-meta-row">
            <span className="ws-card-category">{categoryName}</span>
            <div className="ws-card-rating">
              <span className="ws-card-star">★</span>
              <span className="ws-card-score">{product.r.toFixed(1)}</span>
              <span className="ws-card-count">({product.rv})</span>
            </div>
          </div>

          {/* Product Title */}
          <h3
            className="ws-card-title"
            onClick={handleCardClick}
            title={product.n}
          >
            {product.n}
          </h3>

          {/* Vehicle Fitment & Series Feature Chips */}
          <div className="ws-card-chips">
            <span className="ws-card-chip fit" title={fitmentLabel}>
              <span className="ws-chip-icon">🚗</span>
              <span className="ws-chip-text">{fitmentLabel}</span>
            </span>
            <span className="ws-card-chip series">
              {product.s} Series
            </span>
          </div>

          {/* Color Finish Swatches */}
          {colorOptions.length > 1 && (
            <div className="ws-card-swatches-wrap" onClick={(e) => e.stopPropagation()}>
              <span className="ws-card-swatch-label">Finish:</span>
              <div className="ws-card-swatches">
                {colorOptions.map((color, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`ws-card-swatch ${selectedColorIdx === idx ? 'active' : ''}`}
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
            </div>
          )}
        </div>

        {/* Bottom Pricing & Order Action (pinned to bottom) */}
        <div className="ws-card-info-bottom">
          {/* Price Stack */}
          <div className="ws-card-price-stack">
            <div className="ws-card-price-primary">
              <span className="ws-card-price-wholesale">{formatINR(t1)}</span>
              <span className="ws-card-price-unit">/ unit</span>
              {marginPercent > 0 && (
                <span className="ws-card-margin-pill">
                  {marginPercent}% Margin
                </span>
              )}
              {retailPrice > t1 && (
                <span className="ws-card-price-retail">MRP {formatINR(retailPrice)}</span>
              )}
            </div>
            <div className="ws-card-tier2-teaser">
              <span>Volume ({t2Min}+):</span>
              <strong>{formatINR(t2)} / u</strong>
              <span className="ws-tier2-save">· Volume Rate</span>
            </div>
          </div>

          {/* Order Actions: Stepper + Add to Basket */}
          <div className="ws-card-actions" onClick={(e) => e.stopPropagation()}>
            <div className="ws-card-stepper">
              <button
                type="button"
                className="ws-card-stepper-btn"
                onClick={() => handleQtyChange(currentQty - 1)}
                disabled={cannotOrder || currentQty <= moq}
                aria-label="Decrease batch quantity"
                title={currentQty <= moq ? `Minimum Order Quantity is ${moq}` : 'Decrease quantity'}
              >
                <Minus size={13} />
              </button>
              <input
                type="number"
                min={moq}
                max={maxCustomQty ?? undefined}
                disabled={cannotOrder}
                className="ws-card-stepper-input"
                value={currentQty}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v)) {
                    handleQtyChange(v);
                  }
                }}
                aria-label={`Wholesale batch quantity for ${product.n}`}
              />
              <button
                type="button"
                className="ws-card-stepper-btn"
                onClick={() => handleQtyChange(currentQty + 1)}
                disabled={cannotOrder || (maxCustomQty !== null && currentQty >= maxCustomQty)}
                aria-label="Increase batch quantity"
              >
                <Plus size={13} />
              </button>
            </div>

            {cannotOrder ? (
              <button
                type="button"
                disabled
                className="ws-card-add-btn"
                style={{ opacity: 0.55, cursor: 'not-allowed', background: '#f1f5f9', color: '#64748b', borderColor: '#cbd5e1' }}
                title={
                  isOutOfStock
                    ? 'Currently out of stock'
                    : `Only ${maxCustomQty} unit(s) available, below MOQ (${moq})`
                }
              >
                <span>{isOutOfStock ? 'Out of Stock' : `Only ${maxCustomQty} (< MOQ)`}</span>
              </button>
            ) : (
              <button
                type="button"
                className={`ws-card-add-btn ${isInBasket ? 'in-basket' : ''} ${isAdding ? 'animating' : ''}`}
                onClick={handleAdd}
                title={isInBasket ? 'Currently in Order Basket' : 'Add batch to wholesale order basket'}
              >
                {isInBasket ? (
                  <>
                    <Check size={14} className="ws-btn-check-icon" />
                    <span>In Basket ({inBasketQty})</span>
                  </>
                ) : isDraftDifferent ? (
                  <>
                    <Plus size={14} />
                    <span>Update ({currentQty})</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    <span>Add ({currentQty})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  TINT_OPTIONS,
  CATEGORIES_LIST,
  formatINR,
  isCustomFit,
} from '@/data/products';
import type { Product } from '@/data/products';
import { ProductArt } from '@/components/ProductArt';
import { WholesaleProductCard } from '@/components/wholesale/WholesaleProductCard';
import { WholesaleIcon } from '@/components/wholesale/WholesaleIcon';
import {
  getWholesaleTiers,
  getEffectiveWholesaleUnitPrice,
  getActiveWholesaleTier,
} from '@/lib/storefront/wholesale-pricing';

// Icons
import {
  ArrowLeft,
  Check,
  Plus,
  Minus,
  Truck,
  ShieldCheck,
  Layers,
  ChevronLeft,
  ChevronRight,
  Car,
  Gauge,
  Sparkles,
  Shield,
  Compass,
  ArrowRight,
  FileText,
  Package,
  Wrench,
  Percent,
  CheckCircle2,
  Info,
  Clock,
  PhoneCall,
  ExternalLink,
} from 'lucide-react';
import '../../wholesale.css';

export default function WholesaleProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

  const {
    user,
    isWholesaleApproved,
    authLoading,
    products,
    b2bProfile,
    wholesaleBasket,
    wholesaleBasketSkuCount,
    addToWholesaleBasket,
    showToast,
  } = useApp();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace(`/login?redirect=/wholesale/product/${id}`);
      } else if (!isWholesaleApproved) {
        router.replace('/wholesale');
      }
    }
  }, [authLoading, id, isWholesaleApproved, router, user]);

  const product = useMemo(() => products.find((p) => p.id === id), [id, products]);

  if (authLoading || !user || !isWholesaleApproved) {
    return null;
  }

  if (!product) {
    return (
      <div className="ws-page-container">
        <div className="ws-header-bar">
          <div className="ws-header-titles">
            <Link href="/wholesale/catalog" className="ws-breadcrumb-kicker">
              <ArrowLeft size={13} />
              <span>Back to Catalogue</span>
            </Link>
            <h1>Product Not Found</h1>
            <p>The requested automotive part does not exist in the active wholesale inventory.</p>
          </div>
        </div>
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <Link href="/wholesale/catalog" className="ws-btn-primary ws-btn-brand">
            Return to Catalogue
          </Link>
        </div>
      </div>
    );
  }

  return <WholesaleProductDetailContent product={product} />;
}

function WholesaleProductDetailContent({ product }: { product: Product }) {
  const router = useRouter();
  const {
    b2bProfile,
    products,
    wholesaleBasket,
    wholesaleBasketSkuCount,
    addToWholesaleBasket,
    showToast,
  } = useApp();

  const moq = Math.max(1, product.b2bMoq || 5);
  const initialQty = wholesaleBasket[product.id] || moq;
  const [quantity, setQuantity] = useState<number>(initialQty);
  const [selectedColorIdx, setSelectedColorIdx] = useState<number>(0);
  const [activeThumbIndex, setActiveThumbIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'specs' | 'fitment' | 'install' | 'box' | 'commercial'>('specs');
  const [isAdding, setIsAdding] = useState<boolean>(false);

  // Keep stepper synced if basket updates externally
  useEffect(() => {
    if (wholesaleBasket[product.id] && wholesaleBasket[product.id] >= moq) {
      setQuantity(wholesaleBasket[product.id]);
    }
  }, [wholesaleBasket, product.id, moq]);

  const tiers = useMemo(() => getWholesaleTiers(product), [product]);
  const activeTier = useMemo(() => getActiveWholesaleTier(product, quantity), [product, quantity]);
  const effectiveUnitPrice = useMemo(() => getEffectiveWholesaleUnitPrice(product, quantity), [product, quantity]);

  const retailPrice = product.o || product.p;
  const batchSubtotal = effectiveUnitPrice * quantity;
  const retailResaleTotal = retailPrice * quantity;
  const estimatedDealerProfit = retailResaleTotal - batchSubtotal;
  const profitMarginPercent = Math.round(((retailPrice - effectiveUnitPrice) / retailPrice) * 100);

  // Gallery perspectives
  const galleryPerspectives = useMemo(() => {
    const defaultAngles = [
      {
        url: product.image || '/quilted-seat-bench.jpg',
        title: 'Factory Showcase Angle',
        badge: 'Studio',
        icon: 'car',
      },
      {
        url: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1200&q=85',
        title: 'Cockpit Fitment View',
        badge: 'Cockpit',
        icon: 'gauge',
      },
      {
        url: 'https://images.unsplash.com/photo-1583573278124-e8d4fd3edf3c?auto=format&fit=crop&w=1200&q=85',
        title: 'Precision Quilt / Seam Macro',
        badge: 'Texture',
        icon: 'sparkles',
      },
      {
        url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=85',
        title: 'Side Bolsters & Foam Density',
        badge: 'Bolsters',
        icon: 'shield',
      },
      {
        url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85',
        title: 'Installed Road Test Angle',
        badge: 'Road Test',
        icon: 'compass',
      },
    ];

    if (Array.isArray(product.images) && product.images.length > 1) {
      return product.images.map((img, idx) => ({
        url: img,
        title: defaultAngles[idx % defaultAngles.length].title,
        badge: defaultAngles[idx % defaultAngles.length].badge,
        icon: defaultAngles[idx % defaultAngles.length].icon,
      }));
    }

    return defaultAngles;
  }, [product]);

  // Color options
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

  const activeColor = colorOptions[selectedColorIdx] || colorOptions[0];

  // Fitment string
  const fitmentLabel = useMemo(() => {
    if (!product.fitment) return 'Universal Multi-Vehicle Fitment';
    if (typeof product.fitment === 'string') return product.fitment;
    if (Array.isArray(product.fitment)) return product.fitment.join(', ');
    if (typeof product.fitment === 'object') {
      const obj = product.fitment as Record<string, any>;
      return `${obj.brand || ''} ${obj.model || ''} ${obj.year || ''}`.trim() || 'Custom-Fit';
    }
    return 'Custom-Fit Automotive';
  }, [product]);

  const categoryName = useMemo(() => {
    if (product.categoryLabel) return product.categoryLabel;
    switch (product.c) {
      case 'seats':
        return 'Custom Seat Covers';
      case 'mats':
        return '7D Luxury Floor Mats';
      case 'steering':
        return 'Ergonomic Steering Covers';
      case 'comfort':
        return 'Cabin Comfort Cushions';
      default:
        return product.s ? `${product.s} Series` : 'Automotive Essentials';
    }
  }, [product]);

  const handleQtyChange = (val: number) => {
    setQuantity(Math.max(moq, val));
  };

  const handleAddToBasket = () => {
    setIsAdding(true);
    addToWholesaleBasket(product.id, quantity);
    showToast(`Added ${quantity} units of "${product.n}" to Wholesale Order Basket.`);
    setTimeout(() => setIsAdding(false), 700);
  };

  // Sticky procurement bar visibility
  const mainBuyBoxRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!mainBuyBoxRef.current) return;
      const rect = mainBuyBoxRef.current.getBoundingClientRect();
      setShowStickyBar(rect.bottom < 0);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Related wholesale parts
  const relatedProducts = useMemo(() => {
    return products
      .filter((p) => p.id !== product.id && p.c === product.c)
      .concat(products.filter((p) => p.id !== product.id && p.c !== product.c))
      .slice(0, 4);
  }, [product, products]);

  const isInBasket = Boolean(wholesaleBasket[product.id]);
  const currentInBasketQty = wholesaleBasket[product.id] || 0;
  const isDraftDifferent = isInBasket && quantity !== currentInBasketQty;

  const partnerTier = b2bProfile?.wholesaleTier === 'tier2' ? 'Tier 2 Partner (25% Base Margin)' : 'Tier 1 Partner (15% Base Margin)';

  return (
    <div className="ws-page-container">
      {/* Sleek Top Navigation Bar */}
      <div className="ws-pdp-top-nav">
        <Link href="/wholesale/catalog" className="ws-breadcrumb-back-link">
          <ArrowLeft size={16} />
          <span>Back to Wholesale Catalogue</span>
        </Link>
        <div className="ws-pdp-top-meta">
          <div className="ws-partner-status-chip">
            <span className="ws-partner-ping" />
            <span>{partnerTier}</span>
          </div>
          <Link href="/wholesale/order-basket" className="ws-btn-secondary" style={{ height: '36px', padding: '0 14px', fontSize: '12.5px', borderRadius: '8px' }}>
            <WholesaleIcon name="basket" size={15} />
            <span>Basket ({wholesaleBasketSkuCount})</span>
          </Link>
        </div>
      </div>

      {/* 2-Column Hero Grid: Left Showcase, Right Commercial Buy Box */}
      <div className="ws-pdp-hero-grid">
        {/* LEFT: Showcase Media, Perspectives & B2B Technical Highlights */}
        <div className="ws-pdp-gallery-col">
          <div className="ws-pdp-showcase-box">
            {/* Top Badges */}
            <div className="ws-pdp-badges-overlay">
              <span className="ws-pdp-overlay-chip moq">
                <span className="ws-card-badge-dot" />
                <span>MOQ: {moq} Units</span>
              </span>
              <span className="ws-pdp-overlay-chip margin">
                <span>{profitMarginPercent}% Wholesale Margin</span>
              </span>
              {product.s && (
                <span className="ws-pdp-overlay-chip series">
                  {product.s} Series
                </span>
              )}
            </div>

            {/* Perspective Label */}
            <div className="ws-pdp-perspective-tag">
              <Car size={13} />
              <span>{galleryPerspectives[activeThumbIndex]?.title || 'Studio Showcase'}</span>
            </div>

            {/* Chevron Navigation */}
            <button
              type="button"
              className="ws-pdp-arrow left"
              onClick={() => setActiveThumbIndex((i) => (i === 0 ? galleryPerspectives.length - 1 : i - 1))}
              aria-label="Previous image perspective"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className="ws-pdp-arrow right"
              onClick={() => setActiveThumbIndex((i) => (i === galleryPerspectives.length - 1 ? 0 : i + 1))}
              aria-label="Next image perspective"
            >
              <ChevronRight size={20} />
            </button>

            {/* Main Image with dynamic tint filter */}
            <div className="ws-pdp-art-frame">
              <ProductArt
                product={product}
                style={{
                  filter: activeColor.filter && activeColor.filter !== 'none' ? activeColor.filter : undefined,
                }}
              />
            </div>
          </div>

          {/* Perspective Thumbnails */}
          <div className="ws-pdp-thumbs-row">
            {galleryPerspectives.map((item, idx) => {
              const isActive = activeThumbIndex === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  className={`ws-pdp-thumb-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveThumbIndex(idx)}
                  aria-label={`View angle: ${item.title}`}
                >
                  <div className="ws-pdp-thumb-img-wrap">
                    <img src={item.url} alt={item.title} />
                  </div>
                  <div className="ws-pdp-thumb-label">
                    {item.icon === 'gauge' ? (
                      <Gauge size={11} />
                    ) : item.icon === 'sparkles' ? (
                      <Sparkles size={11} />
                    ) : item.icon === 'shield' ? (
                      <Shield size={11} />
                    ) : item.icon === 'compass' ? (
                      <Compass size={11} />
                    ) : (
                      <Car size={11} />
                    )}
                    <span>{item.badge}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Vehicle Compatibility & OEM Verification Card */}
          <div className="ws-pdp-fitment-assurance-card">
            <div className="ws-pdp-assurance-header">
              <div className="ws-assurance-icon-wrap">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h4>Precision Vehicle Fitment Verified</h4>
                <p>Designed to OEM specifications with laser-measured precision</p>
              </div>
            </div>
            <div className="ws-fitment-tag-display">
              <span className="ws-fitment-key">Verified Fitment:</span>
              <strong className="ws-fitment-val">{fitmentLabel}</strong>
            </div>
          </div>

          {/* Commercial Engineering & Packaging Specs Card (Balances Left & Right Columns) */}
          <div className="ws-pdp-specs-summary-card">
            <div className="ws-pdp-specs-summary-header">
              <div className="ws-specs-summary-icon">
                <FileText size={17} />
              </div>
              <div>
                <h4>B2B Engineering & Packaging Specs</h4>
                <p>Commercial factory grade compliance & warehouse stock specs</p>
              </div>
            </div>

            <div className="ws-specs-summary-grid">
              <div className="ws-spec-summary-item">
                <div className="ws-spec-summary-label">
                  <FileText size={13} style={{ color: '#2563eb' }} />
                  <span>HSN & Tax Code</span>
                </div>
                <strong className="ws-spec-summary-val">87082900 · 18% ITC</strong>
              </div>
              <div className="ws-spec-summary-item">
                <div className="ws-spec-summary-label">
                  <Wrench size={13} style={{ color: '#e2231a' }} />
                  <span>Bay Installation</span>
                </div>
                <strong className="ws-spec-summary-val">15–25 Mins (Fast DIY)</strong>
              </div>
              <div className="ws-spec-summary-item">
                <div className="ws-spec-summary-label">
                  <Package size={13} style={{ color: '#d97706' }} />
                  <span>Master Outer Carton</span>
                </div>
                <strong className="ws-spec-summary-val">5–10 Sets Export Pack</strong>
              </div>
              <div className="ws-spec-summary-item">
                <div className="ws-spec-summary-label">
                  <ShieldCheck size={13} style={{ color: '#059669' }} />
                  <span>Tolerance Deviation</span>
                </div>
                <strong className="ws-spec-summary-val">&lt; 0.5 mm 3D Laser CAD</strong>
              </div>
            </div>

            {/* Editorial Description */}
            <p className="ws-specs-summary-desc">
              {(product.d ? product.d.replace(/Full of Corona Virus/gi, '').replace(/\s+/g, ' ').trim() : '') ||
                'Precision-engineered with laser-measured contours, automotive climate-adaptive memory upholstery, and factory twist-lock anchors for seamless dealership installation.'}
            </p>

            {/* Dealer Assurance Strip */}
            <div className="ws-pdp-card-assurance-strip">
              <div className="ws-card-assurance-item">
                <ShieldCheck size={14} style={{ color: '#059669' }} />
                <span>2-Yr Commercial Warranty</span>
              </div>
              <div className="ws-card-assurance-item">
                <Truck size={14} style={{ color: '#e2231a' }} />
                <span>24–48h Factory Dispatch</span>
              </div>
              <div className="ws-card-assurance-item">
                <CheckCircle2 size={14} style={{ color: '#2563eb' }} />
                <span>Zero Online Checkout</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: B2B Commercial Buy Box */}
        <div className="ws-pdp-details-col" ref={mainBuyBoxRef}>
          <div className="ws-pdp-buybox-card">
            {/* Eyebrow & Meta */}
            <div className="ws-pdp-buybox-top">
              <div className="ws-pdp-sku-meta">
                <span className="ws-pdp-cat-eyebrow">{categoryName}</span>
                <span className="ws-pdp-dot-sep">•</span>
                <span className="ws-sku-badge" style={{ fontSize: '11px' }}>Part #{product.slug || `CX-${product.id}`}</span>
              </div>
              <div className="ws-card-rating">
                <span className="ws-card-star">★</span>
                <span className="ws-card-score">{product.r.toFixed(1)}</span>
                <span className="ws-card-count">({product.rv} Verified Reviews)</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="ws-pdp-title">{product.n}</h1>

            {/* Wholesale Price Stack */}
            <div className="ws-pdp-price-panel">
              <div className="ws-pdp-price-row">
                <div className="ws-pdp-price-main">
                  <span className="ws-pdp-price-curr">{formatINR(effectiveUnitPrice)}</span>
                  <span className="ws-pdp-price-unit">/ unit</span>
                  {retailPrice > effectiveUnitPrice && (
                    <span className="ws-pdp-retail-strike">MRP {formatINR(retailPrice)}</span>
                  )}
                </div>
                <div className="ws-pdp-margin-pill">
                  <Percent size={13} />
                  <span>{profitMarginPercent}% Wholesale Margin</span>
                </div>
              </div>

              <div className="ws-pdp-tax-note">
                Commercial invoicing with 18% GST Input Tax Credit (ITC) · Zero online checkout payment
              </div>
            </div>

            {/* Wholesale Tier Volume Matrix Table */}
            <div className="ws-pdp-tier-matrix-wrap">
              <div className="ws-pdp-tier-matrix-title">
                <span>Commercial Volume Breaks & Tier Pricing</span>
                <span className="ws-pdp-tier-helper">Click tier to set quantity</span>
              </div>

              <div className="ws-pdp-tier-grid">
                {tiers.map((tier, idx) => {
                  const isCurrentActive = activeTier.label === tier.label;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`ws-pdp-tier-card ${isCurrentActive ? 'active' : ''}`}
                      onClick={() => setQuantity(tier.minQty)}
                      title={`Select ${tier.label}`}
                    >
                      <div className="ws-tier-card-head">
                        <span className="ws-tier-badge">{tier.badge || `Tier ${idx + 1}`}</span>
                        {isCurrentActive && (
                          <span className="ws-tier-active-pill">
                            <Check size={11} />
                            <span>Active Rate</span>
                          </span>
                        )}
                      </div>
                      <div className="ws-tier-min-qty">{tier.minQty}+ Units</div>
                      <div className="ws-tier-price">{formatINR(tier.unitPrice)} <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>/ u</span></div>
                      <div className="ws-tier-margin">
                        <span>{tier.marginPercent}% Margin</span>
                        {tier.discountPercent > 0 && (
                          <span className="ws-tier-extra-save">Save {tier.discountPercent}%</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Swatch Selection */}
            {colorOptions.length > 0 && (
              <div className="ws-pdp-color-section">
                <div className="ws-pdp-color-header">
                  <span className="ws-pdp-color-label">Finish:</span>
                  <strong className="ws-pdp-color-active-name">{activeColor.name}</strong>
                </div>
                <div className="ws-pdp-color-swatches" role="radiogroup" aria-label="Select upholstery color finish">
                  {colorOptions.map((opt, idx) => {
                    const isSelected = selectedColorIdx === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        title={opt.name}
                        onClick={() => setSelectedColorIdx(idx)}
                        className={`ws-pdp-swatch-circle ${isSelected ? 'selected' : ''}`}
                        style={{ backgroundColor: opt.hex }}
                        aria-label={`Select ${opt.name}`}
                      >
                        {isSelected && (
                          <Check
                            size={14}
                            color={opt.hex.toLowerCase() === '#f0f0f2' || opt.hex.toLowerCase() === '#ffffff' ? '#0f172a' : '#ffffff'}
                            strokeWidth={3}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Stepper & Commercial Batch Summary */}
            <div className="ws-pdp-batch-section">
              <div className="ws-pdp-stepper-row">
                <div className="ws-pdp-stepper-wrap">
                  <span className="ws-pdp-stepper-label">Order Quantity:</span>
                  <div className="ws-card-stepper" style={{ width: '130px', height: '42px' }}>
                    <button
                      type="button"
                      className="ws-card-stepper-btn"
                      onClick={() => handleQtyChange(quantity - 1)}
                      disabled={quantity <= moq}
                      aria-label="Decrease quantity"
                      title={quantity <= moq ? `Minimum order quantity is ${moq}` : 'Decrease quantity'}
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min={moq}
                      className="ws-card-stepper-input"
                      style={{ fontSize: '15px', fontWeight: 700 }}
                      value={quantity}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v)) {
                          handleQtyChange(v);
                        }
                      }}
                      aria-label="Batch Quantity"
                    />
                    <button
                      type="button"
                      className="ws-card-stepper-btn"
                      onClick={() => handleQtyChange(quantity + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div className="ws-pdp-moq-hint">
                  <Info size={14} />
                  <span>MOQ: {moq} units per batch</span>
                </div>
              </div>

              {/* Dynamic Batch Commercial Summary Box */}
              <div className="ws-pdp-summary-box">
                <div className="ws-summary-line">
                  <span>Batch Calculation:</span>
                  <strong>{quantity} units × {formatINR(effectiveUnitPrice)} / unit</strong>
                </div>
                <div className="ws-summary-line highlight">
                  <span>Batch Commercial Estimate:</span>
                  <strong className="ws-summary-total">{formatINR(batchSubtotal)}</strong>
                </div>
                <div className="ws-summary-line profit">
                  <span>Est. Dealer Resale Value:</span>
                  <span>{formatINR(retailResaleTotal)} (Gross Margin: {formatINR(estimatedDealerProfit)})</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="ws-pdp-actions-row">
              <button
                type="button"
                className={`ws-btn-primary ws-pdp-main-btn ${isInBasket && !isDraftDifferent ? 'in-basket' : 'ws-btn-brand'} ${isAdding ? 'animating' : ''}`}
                onClick={handleAddToBasket}
              >
                {isInBasket && !isDraftDifferent ? (
                  <>
                    <Check size={17} />
                    <span>In Basket ({currentInBasketQty} Units) · Update</span>
                  </>
                ) : isDraftDifferent ? (
                  <>
                    <Plus size={17} />
                    <span>Update Basket to {quantity} Units</span>
                  </>
                ) : (
                  <>
                    <Plus size={17} />
                    <span>Add {quantity} Units to Order Basket</span>
                  </>
                )}
              </button>

              <Link href="/wholesale/order-basket" className="ws-btn-secondary" style={{ height: '48px', padding: '0 20px', fontWeight: 700 }}>
                <span>Review Basket</span>
                <ArrowRight size={15} />
              </Link>
            </div>

            {/* Quick Assurance Strip */}
            <div className="ws-pdp-perks-grid">
              <div className="ws-pdp-perk-item">
                <Truck size={16} />
                <div>
                  <strong>Priority Dispatch</strong>
                  <span>24–48 Hours Factory Freight</span>
                </div>
              </div>
              <div className="ws-pdp-perk-item">
                <ShieldCheck size={16} />
                <div>
                  <strong>2-Year Commercial Warranty</strong>
                  <span>Full factory replacement guarantee</span>
                </div>
              </div>
              <div className="ws-pdp-perk-item">
                <FileText size={16} />
                <div>
                  <strong>GST Tax Invoice</strong>
                  <span>18% ITC compliant B2B billing</span>
                </div>
              </div>
              <div className="ws-pdp-perk-item">
                <CheckCircle2 size={16} />
                <div>
                  <strong>Commercial Settlement</strong>
                  <span>Zero online checkout payment</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deep Specification & Technical Hub (Tabbed Layout) */}
      <div className="ws-pdp-tabs-container">
        <div className="ws-pdp-tabs-header">
          {[
            { id: 'specs', label: 'Technical Specifications', icon: FileText },
            { id: 'fitment', label: 'Vehicle Compatibility Matrix', icon: Car },
            { id: 'install', label: 'Dealership Installation Guide', icon: Wrench },
            { id: 'box', label: 'Master Carton & Packaging', icon: Package },
            { id: 'commercial', label: 'Commercial Terms & Invoicing', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`ws-pdp-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id as any)}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="ws-pdp-tab-panel">
          {activeTab === 'specs' && (
            <div className="ws-specs-tab-content">
              <h3>Automotive Grade Engineering Specifications</h3>
              <p>Certified factory specifications formulated for extreme climate conditions, friction endurance, and zero-degradation durability.</p>

              <div className="ws-specs-grid">
                <div className="ws-spec-item">
                  <span className="ws-spec-key">Automotive Part Number</span>
                  <span className="ws-spec-val">{product.slug || `CX-${product.id}`}</span>
                </div>
                <div className="ws-spec-item">
                  <span className="ws-spec-key">Product Series</span>
                  <span className="ws-spec-val">CarXen {product.s} Series</span>
                </div>
                <div className="ws-spec-item">
                  <span className="ws-spec-key">HSN Classification Code</span>
                  <span className="ws-spec-val">87082900 (Automotive Accessories)</span>
                </div>
                <div className="ws-spec-item">
                  <span className="ws-spec-key">Applicable GST Rate</span>
                  <span className="ws-spec-val">18% (100% Eligible for B2B ITC)</span>
                </div>
                <div className="ws-spec-item">
                  <span className="ws-spec-key">Material Construction</span>
                  <span className="ws-spec-val">
                    {product.c === 'mats'
                      ? '7D Multi-Layer EVA with Reinforced Carbon Heel-Pad'
                      : product.c === 'seats'
                      ? 'High-Density Breathable Memory Foam & Ultra-Nappa Leatherette'
                      : product.c === 'steering'
                      ? 'Natural Odorless Rubber Core with Double-Stitched Ergonomic Grip'
                      : 'High-Density Orthopedic Memory Core with Breathable Mesh'}
                  </span>
                </div>
                <div className="ws-spec-item">
                  <span className="ws-spec-key">Laser Scanning Tolerance</span>
                  <span className="ws-spec-val">&lt; 0.5 mm CAD precision deviation</span>
                </div>
                <div className="ws-spec-item">
                  <span className="ws-spec-key">Water & Spill Resistance</span>
                  <span className="ws-spec-val">100% Hydrophobic Coating, Impermeable</span>
                </div>
                <div className="ws-spec-item">
                  <span className="ws-spec-key">Warranty Coverage</span>
                  <span className="ws-spec-val">2-Year CarXen B2B Commercial Warranty</span>
                </div>
                <div className="ws-spec-item">
                  <span className="ws-spec-key">Country of Origin</span>
                  <span className="ws-spec-val">Made in India (CarXen Automotive Facilities)</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fitment' && (
            <div className="ws-fitment-tab-content">
              <h3>OEM Multi-Vehicle Fitment Matrix</h3>
              <p>Laser scanned contour verification data across major OEM platforms.</p>

              <div className="ws-fitment-matrix-box">
                <div className="ws-fitment-pill-large">
                  <Car size={18} />
                  <span>Primary Compatibility: {fitmentLabel}</span>
                </div>
                <p style={{ fontSize: '13.5px', color: '#475569', marginTop: '12px', lineHeight: 1.6 }}>
                  This part has been 3D laser mapped on actual production vehicles to ensure flush mounting without interference with pedal travel, seat adjuster tracks, center console lids, or side airbag deployment zones.
                </p>
                <div className="ws-fitment-check-grid">
                  <div className="ws-fitment-check-item">
                    <CheckCircle2 size={16} color="#059669" />
                    <span>No drilling or vehicle modification required</span>
                  </div>
                  <div className="ws-fitment-check-item">
                    <CheckCircle2 size={16} color="#059669" />
                    <span>OEM pedal clearance safety tested</span>
                  </div>
                  <div className="ws-fitment-check-item">
                    <CheckCircle2 size={16} color="#059669" />
                    <span>Airbag seam deployment certified</span>
                  </div>
                  <div className="ws-fitment-check-item">
                    <CheckCircle2 size={16} color="#059669" />
                    <span>Precision anchor grommets and lock clips included</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'install' && (
            <div className="ws-install-tab-content">
              <h3>Dealership & Workshop Installation Guide</h3>
              <p>Designed for fast technician turnaround in dealership accessory fitment bays.</p>

              <div className="ws-install-meta-row">
                <div className="ws-install-stat">
                  <Clock size={16} />
                  <span>Estimated Workshop Time: <strong>15–25 Minutes</strong></span>
                </div>
                <div className="ws-install-stat">
                  <Wrench size={16} />
                  <span>Tools Required: <strong>Standard Non-Marring Trim Tool (Included)</strong></span>
                </div>
              </div>

              <div className="ws-install-steps-list">
                <div className="ws-install-step-card">
                  <div className="ws-step-num">01</div>
                  <div className="ws-step-body">
                    <strong>Pre-Fitment Cabin Inspection</strong>
                    <p>Clean and vacuum the vehicle footwell or seat upholstery. Verify part orientation against vehicle specs.</p>
                  </div>
                </div>
                <div className="ws-install-step-card">
                  <div className="ws-step-num">02</div>
                  <div className="ws-step-body">
                    <strong>Contour Seating & Anchor Engagement</strong>
                    <p>Position part onto the vehicle floor or seat frame. Engage factory twist-lock pegs or anchor discs through seat creases.</p>
                  </div>
                </div>
                <div className="ws-install-step-card">
                  <div className="ws-step-num">03</div>
                  <div className="ws-step-body">
                    <strong>Tensioner Hooking & Edge Locking</strong>
                    <p>Fasten heavy-duty spring-tension metal hooks underneath the structural seat base to maintain edge-to-edge tautness.</p>
                  </div>
                </div>
                <div className="ws-install-step-card">
                  <div className="ws-step-num">04</div>
                  <div className="ws-step-body">
                    <strong>Final Quality Check & Customer Handover</strong>
                    <p>Test pedal clearance and seat slider movement. Wipe down with microfiber cloth and attach CarXen warranty card.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'box' && (
            <div className="ws-box-tab-content">
              <h3>Master Carton & Outer Packaging Configuration</h3>
              <p>Engineered for safe transit via surface cargo and clean dealership stockroom racking.</p>

              <div className="ws-packaging-grid">
                <div className="ws-pkg-card">
                  <h4>Inner Retail Packaging</h4>
                  <ul>
                    <li>Heavy-duty 100-micron clear protective dust sleeve</li>
                    <li>Individual high-tensile branded carry bag with handle</li>
                    <li>Retail hanging header with barcode & part number label</li>
                    <li>Full-color illustrated installation manual</li>
                  </ul>
                </div>
                <div className="ws-pkg-card">
                  <h4>Master Outer Carton</h4>
                  <ul>
                    <li>5-Ply corrugated export-grade heavy-duty outer shipper</li>
                    <li>Master carton quantity: <strong>5 to 10 sets (based on part type)</strong></li>
                    <li>Moisture barrier shrink wrapping on bulk shipments</li>
                    <li>Barcode labels on both long sides for warehouse scanning</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'commercial' && (
            <div className="ws-commercial-tab-content">
              <h3>CarXen B2B Commercial Terms & Settlement</h3>
              <p>Transparent wholesale commercial terms for registered automotive dealerships and distributors.</p>

              <div className="ws-terms-grid">
                <div className="ws-term-card">
                  <div className="ws-term-icon"><FileText size={18} /></div>
                  <h4>Zero Online Payment</h4>
                  <p>Orders submitted through the portal generate an official Commercial Purchase Order (PO). Settlement is conducted via direct bank NEFT/RTGS after Proforma validation.</p>
                </div>
                <div className="ws-term-card">
                  <div className="ws-term-icon"><Truck size={18} /></div>
                  <h4>Freight & Logistics</h4>
                  <p>Dispatched directly from CarXen central factory warehouse via express road freight. Real-time docket tracking shared upon dispatch.</p>
                </div>
                <div className="ws-term-card">
                  <div className="ws-term-icon"><Percent size={18} /></div>
                  <h4>GST ITC Invoicing</h4>
                  <p>Formal Tax Invoice with 18% GST and your business GSTIN issued upon vehicle handover, ensuring complete Input Tax Credit compliance.</p>
                </div>
                <div className="ws-term-card">
                  <div className="ws-term-icon"><Shield size={18} /></div>
                  <h4>Warranty & Damage Replacement</h4>
                  <p>2-Year comprehensive commercial warranty against fabric peeling, seam unraveling, and contour warping. Instant replacement on transit damage.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related Wholesale Catalogue Items */}
      <div className="ws-related-section" style={{ marginTop: '48px' }}>
        <div className="ws-related-header">
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0' }}>
              Complementary Procurement Parts
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Popular cross-selling items frequently ordered together with {product.n}
            </p>
          </div>
          <Link href="/wholesale/catalog" className="ws-btn-secondary" style={{ fontSize: '13px' }}>
            <span>View Full Catalogue</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="ws-card-grid" style={{ marginTop: '20px' }}>
          {relatedProducts.map((rel) => (
            <WholesaleProductCard
              key={rel.id}
              product={rel}
              inBasketQty={wholesaleBasket[rel.id] || 0}
              onQuantityChange={(prodId, q) => addToWholesaleBasket(prodId, q)}
              onAddToBasket={(p, q) => {
                addToWholesaleBasket(p.id, q);
                showToast(`Added ${q} units of "${p.n}" to wholesale basket.`);
              }}
            />
          ))}
        </div>
      </div>

      {/* Sticky Bottom Procurement Dock */}
      {showStickyBar && (
        <div className="ws-pdp-sticky-dock">
          <div className="ws-sticky-dock-inner">
            <div className="ws-sticky-product-info">
              <div className="ws-sticky-thumb">
                <ProductArt product={product} />
              </div>
              <div>
                <div className="ws-sticky-title">{product.n}</div>
                <div className="ws-sticky-meta">
                  <span className="ws-sticky-price">{formatINR(effectiveUnitPrice)} / u</span>
                  <span className="ws-sticky-sep">·</span>
                  <span className="ws-sticky-tier">{activeTier.label}</span>
                </div>
              </div>
            </div>

            <div className="ws-sticky-dock-actions">
              <div className="ws-card-stepper" style={{ height: '38px', width: '120px' }}>
                <button
                  type="button"
                  className="ws-card-stepper-btn"
                  onClick={() => handleQtyChange(quantity - 1)}
                  disabled={quantity <= moq}
                  aria-label="Decrease quantity"
                >
                  <Minus size={13} />
                </button>
                <input
                  type="number"
                  min={moq}
                  className="ws-card-stepper-input"
                  value={quantity}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v)) {
                      handleQtyChange(v);
                    }
                  }}
                  aria-label="Sticky batch quantity"
                />
                <button
                  type="button"
                  className="ws-card-stepper-btn"
                  onClick={() => handleQtyChange(quantity + 1)}
                  aria-label="Increase quantity"
                >
                  <Plus size={13} />
                </button>
              </div>

              <button
                type="button"
                className={`ws-btn-primary ${isInBasket && !isDraftDifferent ? 'in-basket' : 'ws-btn-brand'}`}
                onClick={handleAddToBasket}
                style={{ height: '38px', fontSize: '13px', padding: '0 18px' }}
              >
                {isInBasket && !isDraftDifferent ? (
                  <>
                    <Check size={14} />
                    <span>In Basket ({currentInBasketQty})</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    <span>Add {quantity} Units ({formatINR(batchSubtotal)})</span>
                  </>
                )}
              </button>

              <Link
                href="/wholesale/order-basket"
                className="ws-btn-secondary"
                style={{ height: '38px', fontSize: '13px', padding: '0 16px' }}
              >
                Review Basket
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

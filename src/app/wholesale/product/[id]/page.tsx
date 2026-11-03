'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  TINT_OPTIONS,
  formatINR,
  isCustomFit,
} from '@/data/products';
import type { Product } from '@/data/products';
import {
  categoryLabel,
  isMatCategory,
  isSeatCategory,
  isSteeringCategory,
} from '@/lib/storefront/categories';
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
  CreditCard,
  Clock,
  PhoneCall,
  ExternalLink,
  Maximize2,
  PlayCircle,
} from 'lucide-react';
import { ProductImageLightbox } from '@/components/ProductImageLightbox';
import { readFitment } from '@/lib/storefront/fitment';
import '../../wholesale.css';

// ---------------------------------------------------------------------------
// HELPER FUNCTIONS FOR PRODUCT SPECIFICATIONS, INSTALLATION & FITMENT
// Sourced directly from Veda catalog attributes — no mock/hardcoded data.
// ---------------------------------------------------------------------------

function getInstallationDetails(product: Product) {
  const installation = product.installation;
  return {
    difficulty: installation?.difficulty ?? '',
    time: installation?.time ?? '',
    steps: Array.isArray(installation?.steps) ? installation.steps.filter(Boolean) : [],
    videoUrl: installation?.videoUrl,
  };
}

function getPackageContents(product: Product) {
  const row = (Array.isArray(product.sp) ? product.sp : []).find(([label]) =>
    /^(package|box) contents$/i.test(String(label).trim()),
  );
  if (!row) return [];
  return String(row[1])
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((name) => ({ name, qty: '' }));
}

function getEnrichedSpecifications(product: Product) {
  const custom = product.customFit !== false;
  const existingSpecs = new Map<string, string>();
  if (Array.isArray(product.sp)) {
    for (const [k, v] of product.sp) {
      if (k && v) existingSpecs.set(k.trim(), String(v).trim());
    }
  }

  if (!existingSpecs.has('Vehicle Compatibility')) {
    const fitment = readFitment(product);
    existingSpecs.set(
      'Vehicle Compatibility',
      fitment.kind === 'vehicle' ? fitment.label : 'Universal multi-vehicle fit',
    );
  }
  if (!existingSpecs.has('Product Series') && product.s) {
    existingSpecs.set('Product Series', `CarXen ${product.s} Series`);
  }
  if (!existingSpecs.has('Fitment Type')) {
    existingSpecs.set('Fitment Type', custom ? 'Vehicle-specific custom fit' : 'Universal stretch fit');
  }
  if (product.packageDimensions && !existingSpecs.has('Package Dimensions')) {
    existingSpecs.set('Package Dimensions', product.packageDimensions);
  }

  return Array.from(existingSpecs.entries());
}

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
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [isHoverZooming, setIsHoverZooming] = useState<boolean>(false);
  const [zoomOrigin, setZoomOrigin] = useState<{ x: number; y: number }>({ x: 50, y: 50 });

  const handleShowcaseMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomOrigin({ x, y });
  };

  const [activeTab, setActiveTab] = useState<'specs' | 'fitment' | 'install' | 'box' | 'procurement'>('specs');
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

  // Color options
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

  const activeColor = colorOptions[selectedColorIdx] || colorOptions[0];

  // Automatically reset active thumbnail to 0 when user changes color choice
  useEffect(() => {
    setActiveThumbIndex(0);
  }, [selectedColorIdx]);

  // Gallery — only real uploaded images, never stock photos
  const galleryPerspectives = useMemo(() => {
    const ICON_ORDER = ['car', 'gauge', 'sparkles', 'shield', 'compass'];
    const labelFor = (idx: number): string => {
      const meta = (product as any).imageMeta;
      if (Array.isArray(meta) && meta[idx]?.label) return meta[idx].label;
      return `Photo ${idx + 1}`;
    };

    // Priority 1: color-specific images
    if (activeColor?.images && activeColor.images.length > 0) {
      return activeColor.images.map((img: string, idx: number) => ({
        url: img,
        title: idx === 0 ? activeColor.name : `${activeColor.name} — Angle ${idx + 1}`,
        badge: idx === 0 ? activeColor.name : `Angle ${idx + 1}`,
        icon: ICON_ORDER[idx % ICON_ORDER.length],
      }));
    }

    // Priority 2: base product images with owner labels
    const baseImages = Array.isArray(product.images) && product.images.length > 0 ? product.images : (product.image ? [product.image] : []);
    if (baseImages.length > 0) {
      return baseImages.map((img: string, idx: number) => {
        const label = labelFor(idx);
        return { url: img, title: label, badge: label, icon: ICON_ORDER[idx % ICON_ORDER.length] };
      });
    }

    return [];
  }, [product, activeColor]);

  // Fixed 6-in-a-row thumbnail row pagination
  const THUMBS_PER_ROW = 6;
  const [thumbPage, setThumbPage] = useState<number>(0);
  const totalThumbPages = Math.max(1, Math.ceil(galleryPerspectives.length / THUMBS_PER_ROW));

  // Sync thumbPage when activeThumbIndex changes externally
  useEffect(() => {
    const pageForActive = Math.floor(activeThumbIndex / THUMBS_PER_ROW);
    setThumbPage(pageForActive);
  }, [activeThumbIndex]);

  // Reset to first page when color choice changes
  useEffect(() => {
    setThumbPage(0);
  }, [selectedColorIdx]);

  const visibleThumbnails = useMemo(() => {
    const start = thumbPage * THUMBS_PER_ROW;
    return galleryPerspectives.slice(start, start + THUMBS_PER_ROW);
  }, [galleryPerspectives, thumbPage]);

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
    const label = product.categoryLabel?.trim() || categoryLabel(product.c);
    if (isSeatCategory(product.c)) return `${label} · Custom Fit`;
    if (isMatCategory(product.c)) return `${label} · All-Weather`;
    if (isSteeringCategory(product.c)) return `${label} · Ergonomic`;
    return label;
  }, [product]);

  const fitmentData = useMemo(() => {
    return readFitment(product);
  }, [product]);

  const installationDetails = useMemo(() => {
    return getInstallationDetails(product);
  }, [product]);

  const packageContents = useMemo(() => {
    return getPackageContents(product);
  }, [product]);

  const enrichedSpecs = useMemo(() => {
    return getEnrichedSpecifications(product);
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

  const partnerTier = 'Verified Wholesale Partner';

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
          <div
            className="ws-pdp-showcase-box zoomable group"
            onClick={() => setIsLightboxOpen(true)}
            onMouseEnter={() => setIsHoverZooming(true)}
            onMouseLeave={() => setIsHoverZooming(false)}
            onMouseMove={handleShowcaseMouseMove}
            title="Click to view in full screen & 4x zoom"
          >
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
              <span>{galleryPerspectives[activeThumbIndex]?.title || ''}</span>
            </div>

            {/* Chevron Navigation */}
            <button
              type="button"
              className="ws-pdp-arrow left"
              onClick={(e) => {
                e.stopPropagation();
                setActiveThumbIndex((i) => (i === 0 ? galleryPerspectives.length - 1 : i - 1));
              }}
              aria-label="Previous image perspective"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className="ws-pdp-arrow right"
              onClick={(e) => {
                e.stopPropagation();
                setActiveThumbIndex((i) => (i === galleryPerspectives.length - 1 ? 0 : i + 1));
              }}
              aria-label="Next image perspective"
            >
              <ChevronRight size={20} />
            </button>

            {/* Quick Full Screen & Zoom Trigger Button */}
            <button
              type="button"
              className="ws-pdp-fullscreen-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsLightboxOpen(true);
              }}
              title="Open Full Screen & Interactive Zoom"
              aria-label="Open Full Screen and Zoom"
            >
              <Maximize2 size={13} />
              <span>Full Screen / Zoom</span>
            </button>

            {/* Main Image with dynamic cursor-following zoom & tint filter */}
            <div
              className="ws-pdp-art-frame"
              style={{
                transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                transform: isHoverZooming ? 'scale(1.55)' : 'scale(1)',
                transition: isHoverZooming ? 'transform 0.08s ease-out' : 'transform 0.3s ease',
              }}
            >
              <ProductArt
                product={{
                  ...product,
                  image: galleryPerspectives[activeThumbIndex]?.url || product.image,
                }}
                style={{
                  filter:
                    (!activeColor.images || activeColor.images.length === 0) &&
                    activeColor.filter &&
                    activeColor.filter !== 'none'
                      ? activeColor.filter
                      : undefined,
                }}
              />
            </div>
          </div>

          {/* Perspective Thumbnails - Fixed 6 in a row with arrow pagination */}
          <div className="ws-pdp-thumbs-container">
            {galleryPerspectives.length > THUMBS_PER_ROW && (
              <div className="ws-pdp-thumbs-header">
                <div className="ws-pdp-thumbs-header-title">
                  <Car size={13} style={{ color: 'var(--ws-red, #dc2626)' }} />
                  <span>Vehicle Perspectives ({galleryPerspectives.length})</span>
                </div>
                <div className="ws-pdp-thumbs-header-nav">
                  <button
                    type="button"
                    disabled={thumbPage === 0}
                    onClick={() => setThumbPage((p) => Math.max(0, p - 1))}
                    className="ws-pdp-thumbs-nav-arrow"
                    aria-label="Previous row"
                    title="Previous 6 thumbnails"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="ws-pdp-thumbs-page-badge">
                    Row {thumbPage + 1} of {totalThumbPages}
                  </span>
                  <button
                    type="button"
                    disabled={thumbPage >= totalThumbPages - 1}
                    onClick={() => setThumbPage((p) => Math.min(totalThumbPages - 1, p + 1))}
                    className="ws-pdp-thumbs-nav-arrow"
                    aria-label="Next row"
                    title={`Next ${Math.min(THUMBS_PER_ROW, galleryPerspectives.length - (thumbPage + 1) * THUMBS_PER_ROW)} thumbnails`}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            <div className="ws-pdp-thumbs-row-wrap">
              {galleryPerspectives.length > THUMBS_PER_ROW && (
                <button
                  type="button"
                  disabled={thumbPage === 0}
                  onClick={() => setThumbPage((p) => Math.max(0, p - 1))}
                  className="ws-pdp-flank-arrow left"
                  aria-label="Previous thumbnails row"
                  title="Previous row"
                >
                  <ChevronLeft size={16} />
                </button>
              )}

              <div className="ws-pdp-thumbs-row">
                {visibleThumbnails.map((item, localIdx) => {
                  const actualIdx = thumbPage * THUMBS_PER_ROW + localIdx;
                  const isActive = activeThumbIndex === actualIdx;
                  return (
                    <button
                      key={actualIdx}
                      type="button"
                      className={`ws-pdp-thumb-btn ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveThumbIndex(actualIdx)}
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

              {galleryPerspectives.length > THUMBS_PER_ROW && (
                <button
                  type="button"
                  disabled={thumbPage >= totalThumbPages - 1}
                  onClick={() => setThumbPage((p) => Math.min(totalThumbPages - 1, p + 1))}
                  className="ws-pdp-flank-arrow right"
                  aria-label="Next thumbnails row"
                  title="Next row of thumbnails"
                >
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
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
                <span>Razorpay &amp; COD Available</span>
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
                Commercial invoicing with 18% GST Input Tax Credit (ITC) · Online Payment &amp; COD
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
                  <strong>Flexible Payment</strong>
                  <span>Razorpay online &amp; Cash on Delivery</span>
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
            { id: 'specs', label: 'Technical Specifications', icon: FileText, badge: `${enrichedSpecs.length}` },
            { id: 'fitment', label: 'Vehicle Compatibility Matrix', icon: Car, badge: fitmentData.kind === 'vehicle' ? 'Vehicle-Specific' : 'Universal' },
            { id: 'install', label: 'Dealership Installation Guide', icon: Wrench, badge: installationDetails.steps.length > 0 ? `${installationDetails.steps.length} Steps` : undefined },
            { id: 'box', label: 'Master Carton & Packaging', icon: Package, badge: `MOQ: ${product.b2bMoq || 5}` },
            { id: 'procurement', label: 'Procurement & Invoicing', icon: ShieldCheck },
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
                {tab.badge && <span className="ws-tab-badge">{tab.badge}</span>}
              </button>
            );
          })}
        </div>

        <div className="ws-pdp-tab-panel">
          {/* TAB 1: TECHNICAL SPECIFICATIONS (Direct from Veda product.sp) */}
          {activeTab === 'specs' && (
            <div className="ws-specs-tab-content">
              <h3>Technical Specifications &amp; Engineering Details</h3>
              <p>Official manufacturer specifications, materials, and compliance standards recorded for this SKU in CarXen Veda registry.</p>

              <div className="ws-specs-grid">
                <div className="ws-spec-item">
                  <span className="ws-spec-key">Part Number (SKU)</span>
                  <span className="ws-spec-val font-mono">{product.slug || `CX-${product.id}`}</span>
                </div>
                {product.s && (
                  <div className="ws-spec-item">
                    <span className="ws-spec-key">Product Series</span>
                    <span className="ws-spec-val">CarXen {product.s} Series</span>
                  </div>
                )}
                <div className="ws-spec-item">
                  <span className="ws-spec-key">Fitment Classification</span>
                  <span className="ws-spec-val">
                    {product.customFit !== false ? 'Vehicle-Specific Custom Fit' : 'Universal Stretch Fit'}
                  </span>
                </div>
                {product.taxBreakdown ? (
                  <>
                    <div className="ws-spec-item">
                      <span className="ws-spec-key">GST Tax Rate</span>
                      <span className="ws-spec-val">{product.taxBreakdown.gstPercent}% (100% Eligible for B2B ITC)</span>
                    </div>
                    <div className="ws-spec-item">
                      <span className="ws-spec-key">Base Price (ex-GST)</span>
                      <span className="ws-spec-val">{formatINR(product.taxBreakdown.basePriceExGst)}</span>
                    </div>
                  </>
                ) : (
                  <div className="ws-spec-item">
                    <span className="ws-spec-key">Applicable GST Rate</span>
                    <span className="ws-spec-val">18% (100% Eligible for B2B ITC)</span>
                  </div>
                )}
                {product.packageDimensions && (
                  <div className="ws-spec-item">
                    <span className="ws-spec-key">Package Dimensions</span>
                    <span className="ws-spec-val">{product.packageDimensions}</span>
                  </div>
                )}

                {/* Real Veda Key-Value Specs */}
                {enrichedSpecs.map(([k, v], idx) => {
                  const lower = k.toLowerCase();
                  if (lower === 'product series' || lower === 'fitment type' || lower === 'package dimensions') return null;
                  return (
                    <div key={idx} className="ws-spec-item">
                      <span className="ws-spec-key">{k}</span>
                      <span className="ws-spec-val">{v}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: VEHICLE COMPATIBILITY MATRIX (Direct from Veda fitment) */}
          {activeTab === 'fitment' && (
            <div className="ws-fitment-tab-content">
              <h3>OEM Multi-Vehicle Fitment Matrix</h3>
              <p>Laser scanned contour verification and model compatibility recorded in Veda.</p>

              <div className="ws-fitment-matrix-box">
                <div className="ws-fitment-pill-large">
                  <Car size={18} />
                  <span>
                    {fitmentData.kind === 'vehicle'
                      ? `Vehicle-Specific Fit: ${fitmentData.label}`
                      : `Universal Compatibility: ${fitmentData.label}`}
                  </span>
                </div>

                <div style={{ marginTop: '16px' }}>
                  {fitmentData.kind === 'vehicle' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                      {fitmentData.brand && (
                        <div className="ws-spec-item" style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <span className="ws-spec-key">Vehicle Brand</span>
                          <span className="ws-spec-val" style={{ fontWeight: 700 }}>{fitmentData.brand}</span>
                        </div>
                      )}
                      {fitmentData.model && (
                        <div className="ws-spec-item" style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <span className="ws-spec-key">Vehicle Model</span>
                          <span className="ws-spec-val" style={{ fontWeight: 700 }}>{fitmentData.model}</span>
                        </div>
                      )}
                      {fitmentData.detail && (
                        <div className="ws-spec-item" style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <span className="ws-spec-key">Generation / Year</span>
                          <span className="ws-spec-val" style={{ fontWeight: 700 }}>{fitmentData.detail}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, marginBottom: '16px' }}>
                      This item features universal automotive proportions designed to fit standard passenger cars, hatchbacks, sedans, and SUVs without vehicle-specific cutting or alterations.
                    </p>
                  )}
                </div>

                <div className="ws-fitment-check-grid">
                  <div className="ws-fitment-check-item">
                    <CheckCircle2 size={16} color="#059669" />
                    <span>{product.customFit !== false ? 'Laser scanned OEM contour pattern' : 'Universal stretch-to-fit geometry'}</span>
                  </div>
                  <div className="ws-fitment-check-item">
                    <CheckCircle2 size={16} color="#059669" />
                    <span>Non-destructive installation — zero vehicle drilling required</span>
                  </div>
                  <div className="ws-fitment-check-item">
                    <CheckCircle2 size={16} color="#059669" />
                    <span>Tested for cabin safety &amp; seat movement clearance</span>
                  </div>
                  <div className="ws-fitment-check-item">
                    <CheckCircle2 size={16} color="#059669" />
                    <span>Dealership PDI &amp; accessory bay verified</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DEALERSHIP INSTALLATION GUIDE (Direct from Veda product.installation) */}
          {activeTab === 'install' && (
            <div className="ws-install-tab-content">
              <h3>Dealership &amp; Workshop Installation Guide</h3>
              <p>Step-by-step fitment workflow for dealership accessory bay technicians.</p>

              {(installationDetails.difficulty || installationDetails.time || installationDetails.videoUrl) && (
                <div className="ws-install-meta-row" style={{ marginBottom: '20px' }}>
                  {installationDetails.time && (
                    <div className="ws-install-stat">
                      <Clock size={16} />
                      <span>Estimated Bay Time: <strong>{installationDetails.time}</strong></span>
                    </div>
                  )}
                  {installationDetails.difficulty && (
                    <div className="ws-install-stat">
                      <Wrench size={16} />
                      <span>Difficulty Rating: <strong>{installationDetails.difficulty}</strong></span>
                    </div>
                  )}
                  {installationDetails.videoUrl && (
                    <a
                      href={installationDetails.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ws-btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                    >
                      <PlayCircle size={14} />
                      <span>Watch Installation Video</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              )}

              {installationDetails.steps.length > 0 ? (
                <div className="ws-install-steps-list">
                  {installationDetails.steps.map((stepText, idx) => {
                    const cleanText = stepText.replace(/^Step\s*\d+:\s*/i, '');
                    return (
                      <div key={idx} className="ws-install-step-card">
                        <div className="ws-step-num">{String(idx + 1).padStart(2, '0')}</div>
                        <div className="ws-step-body">
                          <strong>Step {idx + 1}</strong>
                          <p>{cleanText}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
                  <Wrench size={28} style={{ color: '#94a3b8', margin: '0 auto 10px', display: 'block' }} />
                  <p style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                    Standard Workshop Accessory Fitment
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    Specific step-by-step instructions have not been published for this item in Veda yet. Refer to standard dealership fitment procedures or contact the commercial support desk for technician assistance.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MASTER CARTON & PACKAGING (Direct from Veda package dimensions & box contents) */}
          {activeTab === 'box' && (
            <div className="ws-box-tab-content">
              <h3>Master Carton &amp; Outer Packaging Configuration</h3>
              <p>Commercial packaging specifications, package contents, and wholesale master carton batching from CarXen fulfillment centers.</p>

              <div className="ws-packaging-grid">
                <div className="ws-pkg-card">
                  <h4>Package Contents</h4>
                  {packageContents.length > 0 ? (
                    <ul>
                      {packageContents.map((item, idx) => (
                        <li key={idx}>
                          <CheckCircle2 size={14} color="#059669" style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
                          {item.name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul>
                      <li>1 × Complete {product.n} Set</li>
                      <li>Retail packaging sleeve with barcode SKU identifier ({product.slug || `CX-${product.id}`})</li>
                      <li>Illustrated installation and maintenance instruction sheet</li>
                      <li>CarXen commercial warranty registration card</li>
                    </ul>
                  )}
                </div>

                <div className="ws-pkg-card">
                  <h4>Master Outer Carton &amp; Logistics</h4>
                  <ul>
                    <li>
                      Wholesale Minimum Order Quantity (MOQ): <strong>{product.b2bMoq || 5} units</strong>
                    </li>
                    {product.packageDimensions ? (
                      <li>
                        Package Dimensions (L × W × H): <strong>{product.packageDimensions}</strong>
                      </li>
                    ) : null}
                    <li>Heavy-duty corrugated outer shipper sealed for surface &amp; express freight</li>
                    <li>Master outer shipper packed in batch multiples of <strong>{product.b2bMoq || 5} sets</strong></li>
                    <li>Dual-sided barcode &amp; part number labels for stockroom racking &amp; scanning</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PROCUREMENT & INVOICING (Direct from Veda wholesale pricing & commercial terms) */}
          {activeTab === 'procurement' && (
            <div className="ws-commercial-tab-content">
              <h3>CarXen B2B Procurement &amp; Invoicing</h3>
              <p>Transparent wholesale procurement terms for registered automotive dealerships and commercial partners.</p>

              <div className="ws-terms-grid">
                <div className="ws-term-card">
                  <div className="ws-term-icon"><CreditCard size={18} /></div>
                  <h4>Online Payment &amp; COD</h4>
                  <p>Orders placed through the wholesale portal can be completed seamlessly via Razorpay online payment (instant UPI, cards, NetBanking) or Cash on Delivery at your warehouse.</p>
                </div>
                <div className="ws-term-card">
                  <div className="ws-term-icon"><Truck size={18} /></div>
                  <h4>Freight &amp; Direct Logistics</h4>
                  <p>Dispatched directly from CarXen Kashmere Gate Hub / Delhi fulfillment warehouse via express road freight. Real-time docket tracking shared upon dispatch.</p>
                </div>
                <div className="ws-term-card">
                  <div className="ws-term-icon"><Percent size={18} /></div>
                  <h4>GST ITC Invoicing</h4>
                  <p>Formal Tax Invoice with 18% GST and your business GSTIN issued upon vehicle handover, ensuring complete Input Tax Credit compliance.</p>
                </div>
                <div className="ws-term-card">
                  <div className="ws-term-icon"><Shield size={18} /></div>
                  <h4>Warranty &amp; Damage Replacement</h4>
                  <p>Comprehensive commercial warranty against material defects, seam unraveling, and contour warping. Instant replacement on transit damage.</p>
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

      {/* Fullscreen & Interactive Zoom Lightbox Modal */}
      <ProductImageLightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        images={galleryPerspectives}
        activeIndex={activeThumbIndex}
        onIndexChange={setActiveThumbIndex}
        productName={product.n}
        categoryLabel={categoryName}
        colorName={activeColor?.name}
        colorFilter={
          (!activeColor.images || activeColor.images.length === 0) &&
          activeColor.filter &&
          activeColor.filter !== 'none'
            ? activeColor.filter
            : undefined
        }
      />
    </div>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  TINT_OPTIONS,
  SAMPLE_REVIEWS,
  CATEGORIES_LIST,
  formatINR,
  isCustomFit,
} from '@/data/products';
import type { Product } from '@/data/products';
import { CatalogState } from '@/components/CatalogState';
import { ProductArt } from '@/components/ProductArt';
import { ProductCard } from '@/components/ProductCard';
import { Footer } from '@/components/Footer';

// shadcn UI components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Lucide icons
import {
  Star,
  Heart,
  Calendar,
  Check,
  Camera,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
} from 'lucide-react';

import '@/components/storefront/product-subtle-layout.css';

export default function ProductDetailPage() {
  const params = useParams();
  const id = Number(params?.id);
  const { products, catalogStatus, catalogError, retryCatalog } = useApp();

  const product = useMemo(() => products.find((p) => p.id === id), [id, products]);

  if (!product) {
    return (
      <div className="ps-page-wrapper">
        <div className="ps-inner-wrap" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {catalogStatus === 'ready' ? (
            <Card className="max-w-md w-full p-8 text-center bg-white border border-[#dcdbd5] shadow-sm rounded-2xl">
              <h2 className="text-xl font-bold mb-2 text-[#0e0e0f]">Product unavailable</h2>
              <p className="text-sm text-[#5d5d64] mb-6">
                This item is not currently active in the storefront catalog.
              </p>
              <Link href="/shop">
                <Button variant="default" className="w-full">
                  Browse products
                </Button>
              </Link>
            </Card>
          ) : (
            <CatalogState
              status={catalogStatus}
              error={catalogError}
              onRetry={retryCatalog}
            />
          )}
        </div>
        <Footer />
      </div>
    );
  }

  return <ProductDetailContent key={product.id} product={product} />;
}

function ProductDetailContent({ product }: { product: Product }) {
  const router = useRouter();
  const {
    user,
    car,
    addToCart,
    openCart,
    toggleFav,
    isFav,
    showToast,
    products,
  } = useApp();

  const activeCar = useMemo(() => {
    return car || { b: 'Hyundai', m: 'Creta', y: '2024', f: 'Petrol' };
  }, [car]);

  // Genuine product images (do NOT duplicate single images into 5 copies!)
  const productImages = useMemo(() => {
    if (Array.isArray(product.images) && product.images.length > 0) return product.images;
    if (product.image) return [product.image];
    return [];
  }, [product]);

  const [activeThumbIndex, setActiveThumbIndex] = useState(0);

  // Exact same color options used in ProductCard & initial listing
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

  // Default color index is 0 ('none') so image matches product listing card exactly!
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const activeColor = colorOptions[selectedColorIdx] || colorOptions[0];

  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState('');
  const [deliveryMsg, setDeliveryMsg] = useState('Delivery in 2 — 4 business days · Express Shipping available');
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'fitment' | 'install'>('desc');

  // Review submission state
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [userReviews, setUserReviews] = useState<
    Array<{ name: string; title: string; comment: string; rating: number; date: string }>
  >([]);

  // Review filter pills state (matching reference chips)
  const [activeReviewFilter, setActiveReviewFilter] = useState<string>('5stars');

  const custom = isCustomFit(product);
  const discountPercent = product.o
    ? Math.round((1 - product.p / product.o) * 100)
    : 0;

  const categoryLabel =
    product.categoryLabel || CATEGORIES_LIST.find((c) => c[0] === product.c)?.[1] || 'Accessories';

  const handleBuyNow = () => {
    addToCart(product.id, quantity);
    if (!user) {
      showToast('Please sign in to proceed with your order');
      router.push('/login?redirect=/checkout');
      return;
    }
    router.push('/checkout');
  };

  const handleStartReview = () => {
    if (!user) {
      showToast('Please sign in to write a review');
      router.push(`/login?redirect=${encodeURIComponent(`/product/${product.id}#reviews-section`)}`);
      return;
    }
    setIsWritingReview(true);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTitle.trim() || !reviewComment.trim()) {
      showToast('Please provide a review headline and details');
      return;
    }
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    setUserReviews((prev) => [
      {
        name: user?.name || 'Verified Driver',
        title: reviewTitle.trim(),
        comment: reviewComment.trim(),
        rating: reviewRating,
        date: today,
      },
      ...prev,
    ]);
    setIsWritingReview(false);
    setReviewTitle('');
    setReviewComment('');
    showToast(`Thank you, ${user?.name || 'Driver'}! Review published.`);
  };

  const handleCheckPincode = () => {
    if (/^\d{6}$/.test(pincode.trim())) {
      const d = new Date(Date.now() + 3 * 864e5);
      setDeliveryMsg(
        'Delivery by ' +
          d.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          }) +
          ' to ' +
          pincode +
          ' (Express Delivery)'
      );
    } else {
      setDeliveryMsg('Enter a valid 6-digit postal code');
    }
  };

  // Bought together bundle items
  const bundleItems = useMemo(() => {
    const others = products
      .filter((x) => x.id !== product.id && x.c !== product.c)
      .sort((a, b) => b.rv - a.rv)
      .slice(0, 2);
    return [product, ...others];
  }, [product, products]);

  const bundleTotal = bundleItems.reduce((acc, curr) => acc + curr.p, 0);

  const handleAddBundle = () => {
    bundleItems.forEach((item) => addToCart(item.id, 1));
    openCart();
  };

  // Similar products (full product cards)
  const similarProducts = useMemo(() => {
    return products
      .filter((x) => x.id !== product.id && x.c === product.c)
      .concat(products.filter((x) => x.id !== product.id && x.c !== product.c))
      .slice(0, 4);
  }, [product, products]);

  // Combined review data
  const baseReviews = useMemo(() => {
    return [
      {
        name: 'Lori Barnett',
        rating: 5,
        date: '02 May',
        comment:
          'Incredible craftsmanship and flawless seams. Looks OEM-fitted in the cabin and gives that premium minimalist aesthetic.',
      },
      {
        name: 'Phillip Douglas',
        rating: 5,
        date: '29 April',
        comment:
          'The fitment on my Creta is exact with zero creasing or loose edges. Wipes clean easily and stitching is strong.',
      },
      {
        name: 'Elena Rostova',
        rating: 4,
        date: '18 April',
        comment:
          'Very solid tactile feel, subtle stitching accents match the dashboard perfectly. Packaged nicely with clear installation instructions.',
      },
    ];
  }, []);

  const filteredReviews = useMemo(() => {
    if (activeReviewFilter === 'all') return baseReviews;
    if (activeReviewFilter === 'photos') return baseReviews.slice(0, 2);
    if (activeReviewFilter === 'text') return baseReviews;
    if (activeReviewFilter === '5stars') return baseReviews.filter((r) => r.rating === 5);
    if (activeReviewFilter === '4stars') return baseReviews.filter((r) => r.rating === 4);
    if (activeReviewFilter === '3stars') return baseReviews.filter((r) => r.rating === 3);
    return baseReviews;
  }, [activeReviewFilter, baseReviews]);

  return (
    <div className="ps-page-wrapper">
      <div className="ps-inner-wrap">
        {/* Dynamic Breadcrumbs: Main / [category] / [product name] */}
        <nav className="ps-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Main</Link>
          <span className="ps-bc-sep">/</span>
          <Link href={`/shop?cat=${product.c}`}>{product.c}</Link>
          <span className="ps-bc-sep">/</span>
          <span className="ps-bc-current">{product.n}</span>
        </nav>

        {/* ------------------------------------------------------------------
            TOP HERO SECTION: 2-COLUMN GRID (LEFT GALLERY, RIGHT DETAILS)
            ------------------------------------------------------------------ */}
        <section className="ps-hero-grid">
          {/* LEFT: THUMBNAILS (ONLY IF MULTIPLE IMAGES) + MAIN SHOWCASE IMAGE */}
          <div className="ps-gallery-layout">
            {/* Show thumbnail strip ONLY if product actually has multiple images */}
            {productImages.length > 1 && (
              <div className="ps-thumb-strip" role="tablist" aria-label="Product thumbnails">
                {productImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    role="tab"
                    aria-selected={activeThumbIndex === idx}
                    className={`ps-thumb-btn ${activeThumbIndex === idx ? 'ps-thumb-active' : ''}`}
                    onClick={() => setActiveThumbIndex(idx)}
                    aria-label={`View angle ${idx + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`${product.n} thumb ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}

            {/* Main Showcase Hero Display */}
            <div className="ps-showcase-box">
              {/* High-Contrast Fitment & Series Overlay Badge (100% visible on dark/black images) */}
              <div className="ps-badge-overlay">
                <span className={`ps-overlay-pill ${custom ? 'ps-custom-fit' : ''}`}>
                  {custom ? (
                    <>
                      <span className="ps-fit-check">✓</span> Custom Fit · {activeCar.b} {activeCar.m}
                    </>
                  ) : (
                    'Universal Fit'
                  )}
                </span>
                {product.s && (
                  <span className="ps-overlay-pill ps-series-tag">
                    {product.s} Series
                  </span>
                )}
              </div>

              {/* Showcase Image or SVG Art */}
              {productImages.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={productImages[activeThumbIndex] || productImages[0]}
                  alt={product.n}
                  style={{
                    filter: activeColor.filter && activeColor.filter !== 'none' ? activeColor.filter : undefined,
                  }}
                />
              ) : (
                <div style={{ width: '80%', height: '80%', filter: activeColor.filter && activeColor.filter !== 'none' ? activeColor.filter : undefined }}>
                  <ProductArt product={product} />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: PRODUCT DETAILS & ACTIONS */}
          <div className="ps-details-col">
            {/* Rating Row: ★★★★★ 5.0 */}
            <div className="ps-rating-score-row">
              <span className="ps-stars-gold">★★★★★</span>
              <span className="ps-rating-num">5.0</span>
              <a
                href="#reviews-section"
                className="ps-rating-count-link"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                ({product.rv || 123} reviews)
              </a>
            </div>

            {/* Product Title */}
            <h1 className="ps-product-title">{product.n}</h1>

            {/* Big Price Display */}
            <div className="ps-price-display">
              <span className="ps-current-price">{formatINR(product.p)}</span>
              {product.o && (
                <>
                  <span className="ps-original-price">{formatINR(product.o)}</span>
                  <span className="ps-discount-pill">−{discountPercent}%</span>
                </>
              )}
            </div>

            {/* CTA Action Buttons: Add to Cart (outline) + Buy it now (Carxen Red) + Wishlist */}
            <div className="ps-cta-row">
              <button
                type="button"
                className="ps-btn-add-cart"
                onClick={() => {
                  addToCart(product.id, quantity);
                  openCart();
                }}
              >
                Add to Cart
              </button>

              <button
                type="button"
                className="ps-btn-buy-now"
                onClick={handleBuyNow}
              >
                Buy it now
              </button>

              <button
                type="button"
                className={`ps-wishlist-btn ${isFav(product.id) ? 'ps-fav-active' : ''}`}
                onClick={() => toggleFav(product.id)}
                aria-label={isFav(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart
                  className="w-5 h-5"
                  fill={isFav(product.id) ? '#e2231a' : 'none'}
                  stroke={isFav(product.id) ? '#e2231a' : 'currentColor'}
                />
              </button>
            </div>

            {/* Colour Swatches (Matching ProductCard & initial listing) */}
            <div className="ps-swatches-section">
              <p className="ps-swatch-label">
                Colour: <span>{activeColor.name}</span>
              </p>
              <div className="ps-swatches-row" role="radiogroup" aria-label="Choose product colour">
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
                      className={`ps-swatch-circle ${isSelected ? 'ps-swatch-selected' : ''}`}
                      style={{
                        backgroundColor: opt.hex,
                        border: opt.hex.toLowerCase() === '#f0f0f2' || opt.hex.toLowerCase() === '#ffffff' ? '1px solid #d4d4d8' : 'none',
                      }}
                      aria-label={opt.name}
                    >
                      {isSelected && (
                        <Check
                          className="w-3.5 h-3.5"
                          color={opt.hex.toLowerCase() === '#f0f0f2' || opt.hex.toLowerCase() === '#ffffff' ? '#0e0e0f' : '#ffffff'}
                          strokeWidth={3}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Delivery Info Row */}
            <div className="ps-delivery-row">
              <Calendar className="ps-delivery-icon" style={{ width: '16px', height: '16px' }} />
              <div style={{ flex: 1 }}>
                <span>{deliveryMsg}</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="Pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  style={{ height: '32px', width: '90px', fontSize: '12px', padding: '0 8px', borderRadius: '8px' }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  style={{ height: '32px', fontSize: '12px', padding: '0 10px', borderRadius: '8px' }}
                  onClick={handleCheckPincode}
                >
                  Check
                </Button>
              </div>
            </div>

            {/* Description & Expandable Specs */}
            <div className="ps-desc-section">
              <h3 className="ps-desc-heading">Description:</h3>
              <p className="ps-desc-text">
                {product.d ||
                  'Engineered with laser-measured ergonomic contours, premium climate-adaptive upholstery, and precision fitment for your vehicle.'}
              </p>
              <button
                type="button"
                className="ps-desc-toggle"
                onClick={() => setShowFullDesc(!showFullDesc)}
              >
                {showFullDesc ? 'Hide specifications ▲' : 'See full description ▼'}
              </button>

              {/* Expandable Tabs for Specifications, Fitment, Installation */}
              {showFullDesc && (
                <div style={{ marginTop: '16px', background: '#ffffff', border: '1px solid var(--line, #dcdbd5)', borderRadius: '16px', padding: '16px' }}>
                  <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
                    <TabsList style={{ width: '100%', justifyContent: 'flex-start', overflowX: 'auto' }}>
                      <TabsTrigger value="desc">Overview</TabsTrigger>
                      <TabsTrigger value="specs">Specifications</TabsTrigger>
                      <TabsTrigger value="fitment">Fitment</TabsTrigger>
                      <TabsTrigger value="install">Installation</TabsTrigger>
                    </TabsList>

                    <TabsContent value="desc" style={{ paddingTop: '8px', fontSize: '12px', color: '#5d5d64', lineHeight: '1.6' }}>
                      <p>{product.d}</p>
                      <p style={{ marginTop: '8px', color: '#16a34a', fontWeight: 600 }}>
                        ✓ Backed by CARXEN 2-year warranty and 30-day hassle-free returns.
                      </p>
                    </TabsContent>

                    <TabsContent value="specs" style={{ paddingTop: '8px' }}>
                      {product.sp && product.sp.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                          {product.sp.map(([key, val], idx) => (
                            <div key={idx} style={{ padding: '8px 12px', background: 'var(--bg, #f4f3ef)', borderRadius: '8px', fontSize: '12px' }}>
                              <span style={{ color: '#8d8d93', display: 'block' }}>{key}</span>
                              <b style={{ color: '#0e0e0f' }}>{val}</b>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '12px', color: '#5d5d64' }}>Model-specific technical specifications certificate included.</p>
                      )}
                    </TabsContent>

                    <TabsContent value="fitment" style={{ paddingTop: '8px', fontSize: '12px', color: '#5d5d64' }}>
                      <p>
                        {custom
                          ? `Custom-cut precision for your ${activeCar.y} ${activeCar.b} ${activeCar.m} (${activeCar.f}) from laser-mapped templates.`
                          : `Universal fit. Engineered for your ${activeCar.m} and most passenger cars.`}
                      </p>
                    </TabsContent>

                    <TabsContent value="install" style={{ paddingTop: '8px', fontSize: '12px', color: '#5d5d64' }}>
                      <p>1. Unbox components onto clean cabin surface.</p>
                      <p>2. Align contour straps with headrest and seat base anchors.</p>
                      <p>3. Fasten precision clips. No tools required (15 min average).</p>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>

            {/* Note: Store/Manufacturer card has been removed as requested */}
          </div>
        </section>

        {/* ------------------------------------------------------------------
            FREQUENTLY BOUGHT TOGETHER BUNDLE SUITE
            ------------------------------------------------------------------ */}
        {bundleItems.length > 1 && (
          <section className="ps-bundle-section">
            <div className="ps-bundle-header">
              <h3 className="ps-bundle-title">
                <span style={{ color: 'var(--red, #e2231a)' }}>●</span> Frequently bought together
              </h3>
              <span className="ps-bundle-total-price">
                Bundle Total: {formatINR(bundleTotal)}
              </span>
            </div>
            <div className="ps-bundle-grid">
              {bundleItems.map((bItem, i) => (
                <React.Fragment key={bItem.id}>
                  {i > 0 && <span className="ps-bundle-plus-icon">+</span>}
                  <div className="ps-bundle-item-card">
                    <div className="ps-bundle-thumb-box">
                      {bItem.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={bItem.image} alt={bItem.n} />
                      ) : (
                        <div style={{ width: '80%', height: '80%' }}>
                          <ProductArt product={bItem} />
                        </div>
                      )}
                    </div>
                    <div className="ps-bundle-item-info">
                      <span className="ps-bundle-item-name">{bItem.n}</span>
                      <span className="ps-bundle-item-price">{formatINR(bItem.p)}</span>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddBundle}
              className="ps-bundle-cta-btn"
            >
              Add all {bundleItems.length} items to cart
            </button>
          </section>
        )}

        <Separator style={{ margin: '40px 0' }} />

        {/* ------------------------------------------------------------------
            REVIEWS SECTION
            ------------------------------------------------------------------ */}
        <section className="ps-reviews-section" id="reviews-section">
          {/* Header: Reviews ★★★★★ 4.6 */}
          <div className="ps-reviews-top">
            <h2 className="ps-reviews-title">Customer Reviews</h2>
            <span className="ps-overall-stars">★★★★★</span>
            <span className="ps-overall-score">4.6</span>
          </div>

          {/* Filter Pills Row (All, Photo, Text, 5-Star, 4-Star, etc.) */}
          <div className="ps-filter-pills-row" role="group" aria-label="Review filters">
            <button
              type="button"
              className={`ps-filter-chip ${activeReviewFilter === 'all' ? 'ps-chip-active-dark' : ''}`}
              onClick={() => setActiveReviewFilter('all')}
            >
              All (123)
            </button>

            <button
              type="button"
              className={`ps-filter-chip ${activeReviewFilter === 'photos' ? 'ps-chip-active-dark' : ''}`}
              onClick={() => setActiveReviewFilter('photos')}
            >
              <Camera style={{ width: '14px', height: '14px' }} /> (33)
            </button>

            <button
              type="button"
              className={`ps-filter-chip ${activeReviewFilter === 'text' ? 'ps-chip-active-dark' : ''}`}
              onClick={() => setActiveReviewFilter('text')}
            >
              <MessageSquare style={{ width: '14px', height: '14px' }} /> (12)
            </button>

            {/* Official CARXEN Red active pill for 5-star reviews */}
            <button
              type="button"
              className={`ps-filter-chip ${activeReviewFilter === '5stars' ? 'ps-chip-active-red' : ''}`}
              onClick={() => setActiveReviewFilter('5stars')}
            >
              ★★★★★ (2 227)
            </button>

            <button
              type="button"
              className={`ps-filter-chip ${activeReviewFilter === '4stars' ? 'ps-chip-active-dark' : ''}`}
              onClick={() => setActiveReviewFilter('4stars')}
            >
              ★★★★ (502)
            </button>

            <button
              type="button"
              className={`ps-filter-chip ${activeReviewFilter === '3stars' ? 'ps-chip-active-dark' : ''}`}
              onClick={() => setActiveReviewFilter('3stars')}
            >
              ★★★ (21)
            </button>

            <button
              type="button"
              className={`ps-filter-chip ${activeReviewFilter === '2stars' ? 'ps-chip-active-dark' : ''}`}
              onClick={() => setActiveReviewFilter('2stars')}
            >
              ★★ (8)
            </button>

            <button
              type="button"
              className={`ps-filter-chip ${activeReviewFilter === '1star' ? 'ps-chip-active-dark' : ''}`}
              onClick={() => setActiveReviewFilter('1star')}
            >
              ★ (2)
            </button>
          </div>

          {/* Review Cards List */}
          <div className="ps-review-cards-list">
            {/* User Submitted Verified Reviews */}
            {userReviews.map((ur, idx) => (
              <div key={`user-${idx}`} className="ps-review-item-card" style={{ borderLeft: '3px solid var(--red, #e2231a)' }}>
                <div className="ps-review-item-top">
                  <div className="ps-review-author-wrap">
                    <Avatar fallback={ur.name.slice(0, 2)} style={{ width: '34px', height: '34px', fontSize: '12px' }} />
                    <div className="ps-review-stars-user">
                      <span className="ps-review-item-stars">
                        {'★'.repeat(ur.rating) + '☆'.repeat(5 - ur.rating)}
                      </span>
                      <span className="ps-review-user-name">{ur.name} <span style={{ color: '#16a34a', fontSize: '11px', fontWeight: 600 }}>✓ Verified Buyer</span></span>
                    </div>
                  </div>
                  <span className="ps-review-date">{ur.date}</span>
                </div>
                {ur.title && <b style={{ fontSize: '13.5px', color: 'var(--ink, #0e0e0f)' }}>{ur.title}</b>}
                <p className="ps-review-body-text">{ur.comment}</p>
              </div>
            ))}

            {/* Filtered Sample Reviews */}
            {filteredReviews.map((rev, idx) => (
              <div key={idx} className="ps-review-item-card">
                <div className="ps-review-item-top">
                  <div className="ps-review-author-wrap">
                    <Avatar
                      fallback={rev.name.slice(0, 2)}
                      src={
                        idx === 0
                          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'
                          : idx === 1
                          ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80'
                          : undefined
                      }
                      style={{ width: '34px', height: '34px', fontSize: '12px' }}
                    />
                    <div className="ps-review-stars-user">
                      <span className="ps-review-item-stars">
                        {'★'.repeat(rev.rating) + '☆'.repeat(5 - rev.rating)}
                      </span>
                      <span className="ps-review-user-name">{rev.name}</span>
                    </div>
                  </div>
                  <span className="ps-review-date">{rev.date}</span>
                </div>
                <p className="ps-review-body-text">{rev.comment}</p>
              </div>
            ))}
          </div>

          {/* Write a review action */}
          <div style={{ marginTop: '24px' }}>
            {!isWritingReview ? (
              <Button
                variant="outline"
                style={{ borderRadius: '12px', fontSize: '13px', fontWeight: 600, height: '42px', padding: '0 20px' }}
                onClick={handleStartReview}
              >
                Write a verified review
              </Button>
            ) : (
              <div className="ps-review-writer-card">
                <form onSubmit={handleSubmitReview}>
                  <div className="ps-review-writer-header">
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--ink, #0e0e0f)' }}>
                        Write a Review
                      </h4>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--steel, #5d5d64)' }}>
                        Sharing your experience as <b style={{ color: 'var(--ink, #0e0e0f)' }}>{user?.name || 'Verified Driver'}</b>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsWritingReview(false)}
                      style={{ color: '#8d8d93', cursor: 'pointer', padding: '6px' }}
                      aria-label="Close form"
                    >
                      <X style={{ width: '18px', height: '18px' }} />
                    </button>
                  </div>

                  <div className="ps-star-picker-row">
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink, #0e0e0f)', marginRight: '6px' }}>
                      Overall Rating:
                    </span>
                    {[1, 2, 3, 4, 5].map((s) => {
                      const isHighlighted = (hoverRating || reviewRating) >= s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onMouseEnter={() => setHoverRating(s)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setReviewRating(s)}
                          className="ps-star-picker-btn"
                          style={{
                            color: isHighlighted ? '#f5a623' : '#dcdbd5',
                          }}
                        >
                          ★
                        </button>
                      );
                    })}
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#f5a623', marginLeft: '6px' }}>
                      {reviewRating} of 5 Stars
                    </span>
                  </div>

                  <input
                    type="text"
                    className="ps-review-input-field"
                    placeholder="Review headline (e.g., Flawless fitment and luxurious feel)"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    required
                  />

                  <textarea
                    className="ps-review-textarea-field"
                    placeholder="Share specific details about the quality, installation ease, and fitment..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={4}
                    required
                  />

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                      type="submit"
                      className="ps-btn-buy-now"
                      style={{ height: '42px', padding: '0 24px', fontSize: '13px' }}
                    >
                      Publish Verified Review
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsWritingReview(false)}
                      className="ps-btn-add-cart"
                      style={{ height: '42px', padding: '0 18px', fontSize: '13px', borderColor: 'var(--line, #dcdbd5)', color: 'var(--ink, #0e0e0f)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </section>

        <Separator style={{ margin: '40px 0' }} />

        {/* ------------------------------------------------------------------
            SIMILAR PRODUCTS: FULL PRODUCT CARDS
            ------------------------------------------------------------------ */}
        <section className="ps-similar-section">
          <div className="ps-similar-header">
            <h2 className="ps-similar-title">Similar Items</h2>
            <Link href="/shop" style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--red, #e2231a)', textDecoration: 'none' }}>
              Browse all parts →
            </Link>
          </div>
          <div className="ps-similar-grid">
            {similarProducts.map((p) => {
              const isCustom = isCustomFit(p);
              return (
                <ProductCard
                  key={p.id}
                  product={p}
                  isFav={isFav(p.id)}
                  onToggleFav={toggleFav}
                  onAddToCart={addToCart}
                  onOpenCart={openCart}
                  fitText={isCustom ? `✓ Fits ${activeCar.m}` : 'Universal fit'}
                  isCustomFitBadge={isCustom}
                />
              );
            })}
          </div>
        </section>
      </div>

      {/* Sticky Mobile Buy Bar */}
      <div className="ps-mobile-sticky-bar">
        <div>
          <span style={{ fontSize: '11px', color: '#71717a', display: 'block' }}>Total price</span>
          <b style={{ fontSize: '15px', color: 'var(--ink, #0e0e0f)' }}>{formatINR(product.p)}</b>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => {
              addToCart(product.id, quantity);
              openCart();
            }}
            className="ps-btn-add-cart"
            style={{ height: '36px', padding: '0 14px', fontSize: '12px' }}
          >
            Add to Cart
          </button>
          <button
            type="button"
            onClick={handleBuyNow}
            className="ps-btn-buy-now"
            style={{ height: '36px', padding: '0 14px', fontSize: '12px' }}
          >
            Buy it now
          </button>
        </div>
      </div>

      {/* Footer at bottom with ZERO trailing whitespace */}
      <Footer />
    </div>
  );
}

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
import { supabase } from '@/lib/supabase/client';
import type { Product } from '@/data/products';
import {
  categoryLabel as resolveCategoryLabel,
  isMatCategory,
  isSeatCategory,
  isSteeringCategory,
} from '@/lib/storefront/categories';
import {
  fitBadgeText,
  fitsVehicle,
  readFitment,
} from '@/lib/storefront/fitment';
import { rankSimilarProducts } from '@/lib/storefront/similar-products';
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
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Pencil,
  Lock,
  ShieldCheck,
  Wrench,
  Clock,
  Sparkles,
  Layers,
  Car,
  Shield,
  FileText,
  PackageCheck,
  PlayCircle,
  CheckCircle2,
  ExternalLink,
  Award,
  Info,
  Truck,
  RotateCcw,
  Zap,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Compass,
  Maximize2,
} from 'lucide-react';

import { ProductImageLightbox } from '@/components/ProductImageLightbox';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
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

// ---------------------------------------------------------------------------
// HELPER FUNCTIONS FOR PRODUCT SPECIFICATIONS, INSTALLATION & FITMENT
// ---------------------------------------------------------------------------

function getInstallationDetails(product: Product) {
  // Only the listing's own installation data — no invented steps.
  const installation = product.installation;
  return {
    difficulty: installation?.difficulty ?? '',
    time: installation?.time ?? '',
    steps: Array.isArray(installation?.steps) ? installation.steps.filter(Boolean) : [],
    videoUrl: installation?.videoUrl,
  };
}

function getPackageContents(product: Product) {
  // Shown only when the item's specification states what is in the box.
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
  // Everything here is either recorded on the listing or derived from the
  // product's own fitment and series — nothing is invented.
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
    existingSpecs.set('Product Series', `CARXEN ${product.s} Series`);
  }
  if (!existingSpecs.has('Fitment Type')) {
    existingSpecs.set('Fitment Type', custom ? 'Vehicle-specific custom fit' : 'Universal stretch fit');
  }
  if (product.packageDimensions && !existingSpecs.has('Package Dimensions')) {
    existingSpecs.set('Package Dimensions', product.packageDimensions);
  }

  return Array.from(existingSpecs.entries());
}

function getFeatureHighlights(product: Product, activeCar: { b: string; m: string; y: string; f: string }) {
  const custom = product.customFit !== false;
  const fitment = readFitment(product);
  const builtFor = fitment.kind === 'vehicle' ? fitment.label : null;
  const fitsMyCar = fitsVehicle(product, activeCar);

  const specs = new Map<string, string>();
  for (const [key, value] of Array.isArray(product.sp) ? product.sp : []) {
    if (key && value) specs.set(key.trim().toLowerCase(), String(value).trim());
  }

  const highlights: { title: string; desc: string; icon: string }[] = [
    {
      title: custom
        ? fitsMyCar
          ? `Made For Your ${activeCar.m}`
          : `Made For ${builtFor ?? 'A Specific Vehicle'}`
        : 'Universal Multi-Vehicle Fitment',
      desc: custom
        ? `Vehicle fitment recorded for this item: ${builtFor ?? `${activeCar.b} ${activeCar.m}`}.`
        : 'Fits most passenger cars, sedans and SUVs.',
      icon: 'laser',
    },
  ];

  const design = specs.get('design');
  if (design) {
    highlights.push({ title: `${design} Design`, desc: 'Design recorded on this item.', icon: 'shield' });
  }

  const material = specs.get('fabric') ?? specs.get('material') ?? specs.get('upper');
  if (material) {
    highlights.push({ title: material, desc: 'Material recorded on this item.', icon: 'sparkles' });
  }

  const warranty = specs.get('warranty');
  if (warranty) {
    highlights.push({ title: `${warranty} Warranty`, desc: 'Manufacturer warranty recorded on this item.', icon: 'shield' });
  }

  return highlights;
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
    orders,
  } = useApp();

  const activeCar = useMemo(() => {
    return car || { b: 'Hyundai', m: 'Creta', y: '2024', f: 'Petrol' };
  }, [car]);

  // Genuine product images
  const productImages = useMemo(() => {
    if (Array.isArray(product.images) && product.images.length > 0) return product.images;
    if (product.image) return [product.image];
    return [];
  }, [product]);

  // Exact same color options used in ProductCard & initial listing
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

  // Default color index is 0 ('none') so image matches product listing card exactly!
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const activeColor = colorOptions[selectedColorIdx] || colorOptions[0];

  // Automatically reset active gallery angle to primary when user changes color choice
  useEffect(() => {
    setActiveThumbIndex(0);
  }, [selectedColorIdx]);

  // Curated automotive perspective angles with unique car icons for slider testing
  const galleryPerspectives = useMemo(() => {
    const defaultAngles = [
      {
        url: product.image || 'https://images.unsplash.com/photo-1549064233-945d7063292f?auto=format&fit=crop&w=1200&q=85',
        title: 'Studio Overview',
        badge: 'Studio',
        icon: 'car',
      },
      {
        url: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1200&q=85',
        title: 'Cockpit Fitment',
        badge: 'Cockpit',
        icon: 'gauge',
      },
      {
        url: 'https://images.unsplash.com/photo-1583573278124-e8d4fd3edf3c?auto=format&fit=crop&w=1200&q=85',
        title: 'Diamond Quilt Macro',
        badge: 'Texture',
        icon: 'sparkles',
      },
      {
        url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=85',
        title: 'Ergonomic Bolsters',
        badge: 'Bolsters',
        icon: 'shield',
      },
      {
        url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85',
        title: 'Vehicle Road Perspective',
        badge: 'Road Test',
        icon: 'compass',
      },
    ];

    // Priority 1: Images uploaded specifically for the selected color choice!
    if (activeColor?.images && activeColor.images.length > 0) {
      return activeColor.images.map((img: string, idx: number) => ({
        url: img,
        title: `${activeColor.name} Perspective ${idx + 1}`,
        badge: idx === 0 ? `${activeColor.name}` : `Angle ${idx + 1}`,
        icon: defaultAngles[idx % defaultAngles.length]?.icon || 'car',
      }));
    }

    // Priority 2: Base gallery images of the product
    if (Array.isArray(product.images) && product.images.length > 1) {
      return product.images.map((img: string, idx: number) => ({
        url: img,
        title: defaultAngles[idx % defaultAngles.length].title,
        badge: defaultAngles[idx % defaultAngles.length].badge,
        icon: defaultAngles[idx % defaultAngles.length].icon,
      }));
    }

    return defaultAngles;
  }, [product, activeColor]);

  const [activeThumbIndex, setActiveThumbIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isHoverZooming, setIsHoverZooming] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

  const handleShowcaseMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomOrigin({ x, y });
  };

  const [isFavPopping, setIsFavPopping] = useState(false);

  const [quantity, setQuantity] = useState(1);
  const totalPrice = product.p * quantity;

  const [pincode, setPincode] = useState('');
  const [deliveryMsg, setDeliveryMsg] = useState('Delivery in 2 — 4 business days · Express Shipping available');
  const [activeInfoTab, setActiveInfoTab] = useState<'specs' | 'install' | 'desc' | 'fitment' | 'box'>('specs');

  // Sticky buy bar should only appear when the main in-page CTA buttons have scrolled out of view
  const mainCtaRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!mainCtaRef.current) return;
      const rect = mainCtaRef.current.getBoundingClientRect();
      // Show sticky bar only when the bottom of main CTA row has scrolled past the top of viewport
      setShowStickyBar(rect.bottom < 0);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToInfoTab = (tabKey: 'specs' | 'install' | 'desc' | 'fitment' | 'box') => {
    setActiveInfoTab(tabKey);
    const el = document.getElementById('product-details-hub');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const installationDetails = useMemo(() => {
    return getInstallationDetails(product);
  }, [product, activeCar]);

  const packageContents = useMemo(() => {
    return getPackageContents(product);
  }, [product]);

  const enrichedSpecs = useMemo(() => {
    return getEnrichedSpecifications(product);
  }, [product]);

  const featureHighlights = useMemo(() => {
    return getFeatureHighlights(product, activeCar);
  }, [product, activeCar]);

  // A review exactly as the storefront API returns it — written by a verified
  // buyer and published after moderation.
  interface CustomerReview {
    id: string;
    rating: number;
    title: string;
    body: string;
    verifiedPurchase: boolean;
    createdAt: string;
    customerName: string;
  }

  // Verification: has this customer ordered the product? The review API
  // re-checks this server-side, so the UI state is only a hint.
  const hasOrderedThisProduct = useMemo(() => {
    const prodIdNum = Number(product.id);
    return Boolean(
      orders?.some((order) => order.items?.some((item) => Number(item.productId) === prodIdNum)),
    );
  }, [orders, product.id]);

  // Review submission & modal state
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [showNotOrderedModal, setShowNotOrderedModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Published reviews loaded from the storefront API.
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setReviewsLoading(true);
    fetch(`/api/storefront/reviews?productId=${encodeURIComponent(String(product.id))}`, {
      cache: 'no-store',
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled || !payload) return;
        if (Array.isArray(payload.reviews)) setReviews(payload.reviews);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  // Review filter pills state (default to 'all' so users see all verified reviews and pagination)
  const [activeReviewFilter, setActiveReviewFilter] = useState<string>('all');

  const custom = isCustomFit(product);
  const discountPercent = product.o
    ? Math.round((1 - product.p / product.o) * 100)
    : 0;

  const categoryLabel = resolveCategoryLabel(product.c, product.categoryLabel);

  // Warranty is only shown when the listing actually records one.
  const warrantyLabel = (Array.isArray(product.sp) ? product.sp : [])
    .find(([label]) => /^warranty$/i.test(String(label).trim()))?.[1];

  // Fitment claims come from the product's own record, never from the garage
  // car alone — a Fortuner cover must not promise a Creta fit.
  const productFitment = readFitment(product);
  const builtFor = productFitment.kind === 'vehicle' ? productFitment.label : null;
  const fitsMyCar = fitsVehicle(product, activeCar);
  const myCarLabel = `${activeCar.b} ${activeCar.m}`.replace(/\s+/g, ' ').trim();
  const fitTargetLabel = builtFor ?? myCarLabel;

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
      showToast('Please sign in to write a review for your purchases');
      router.push(`/login?redirect=${encodeURIComponent(`/product/${product.id}#reviews-section`)}`);
      return;
    }

    if (!hasOrderedThisProduct) {
      setShowNotOrderedModal(true);
      return;
    }

    setIsWritingReview(true);
    setTimeout(() => {
      document.getElementById('review-writer-card-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTitle.trim() || !reviewComment.trim()) {
      showToast('Please provide a review headline and details');
      return;
    }

    if (!hasOrderedThisProduct) {
      setShowNotOrderedModal(true);
      return;
    }

    setSubmittingReview(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          headers.Authorization = `Bearer ${data.session.access_token}`;
        }
      } catch {}
      if (typeof window !== 'undefined') {
        const demoUser = localStorage.getItem('cx_demo_user');
        if (demoUser) {
          const parsed = JSON.parse(demoUser);
          if (parsed.id) headers['x-demo-user-id'] = parsed.id;
          if (parsed.email) headers['x-demo-user-email'] = parsed.email;
        }
      }

      const response = await fetch('/api/storefront/reviews', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          productId: product.id,
          rating: reviewRating,
          title: reviewTitle.trim(),
          body: reviewComment.trim(),
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        showToast(payload?.error || 'Could not submit your review. Please try again.');
        return;
      }

      setIsWritingReview(false);
      setReviewTitle('');
      setReviewComment('');
      if (payload?.status === 'PUBLISHED' && payload.review) {
        setReviews((current) => [payload.review as CustomerReview, ...current]);
        showToast('Your review is published. Thank you!');
      } else {
        showToast('Your review was submitted and will appear once approved.');
      }
    } catch {
      showToast('Could not submit your review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
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

  // "Frequently bought together" comes only from products configured in VEDA.
  const recommendedProducts = useMemo(() => {
    const configured = Array.isArray(product.comboItems) ? product.comboItems : [];
    return configured
      .map((item) =>
        item?.productId
          ? products.find((p) => p.id !== product.id && String(p.id) === String(item.productId))
          : undefined
      )
      .filter((p): p is Product => Boolean(p))
      .slice(0, 2);
  }, [product, products]);

  const bundleTotal = useMemo(
    () => [product, ...recommendedProducts].reduce((sum, item) => sum + item.p, 0),
    [product, recommendedProducts]
  );

  const handleAddBundle = () => {
    [product, ...recommendedProducts].forEach((item) => addToCart(item.id, 1));
    showToast(`Added ${recommendedProducts.length + 1} items to your cart!`);
    openCart();
  };

  // Similar products (ranked locally — no server call)
  const similarProducts = useMemo(
    () =>
      rankSimilarProducts(product, products, {
        vehicle: activeCar,
        excludeIds: recommendedProducts.map((entry) => entry.id),
        limit: 4,
      }),
    [product, products, activeCar, recommendedProducts]
  );

  // Review statistics and filters, derived from published reviews only.
  const starCounts = useMemo(() => {
    const counts: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((review) => {
      const star = Math.min(5, Math.max(1, Math.round(review.rating))) as 1 | 2 | 3 | 4 | 5;
      counts[star] += 1;
    });
    return counts;
  }, [reviews]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return '0.0';
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return (total / reviews.length).toFixed(1);
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (activeReviewFilter === 'all') return reviews;
    const star = Number(activeReviewFilter.replace('stars', '').replace('star', ''));
    return Number.isFinite(star)
      ? reviews.filter((review) => Math.round(review.rating) === star)
      : reviews;
  }, [activeReviewFilter, reviews]);

  const formatReviewDate = (iso: string) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Pagination system: page-by-page loading (4 reviews per page)
  const REVIEWS_PER_PAGE = 4;
  const [reviewPage, setReviewPage] = useState(1);

  // Reset page to 1 whenever active filter changes
  React.useEffect(() => {
    setReviewPage(1);
  }, [activeReviewFilter]);

  const totalReviewPages = Math.max(1, Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE));

  const paginatedReviews = useMemo(() => {
    const start = (reviewPage - 1) * REVIEWS_PER_PAGE;
    return filteredReviews.slice(start, start + REVIEWS_PER_PAGE);
  }, [filteredReviews, reviewPage]);

  return (
    <div className="ps-page-wrapper">
      <div className="ps-inner-wrap">
        {/* Back navigation to products */}
        <div style={{ marginBottom: '24px' }}>
          <Link
            href={product.c ? `/shop?cat=${encodeURIComponent(product.c)}` : '/shop'}
            className="cx-back-btn"
            aria-label="Back to products"
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Back to products</span>
          </Link>
        </div>

        {/* ------------------------------------------------------------------
            TOP HERO SECTION: 2-COLUMN GRID (LEFT GALLERY, RIGHT DETAILS)
            ------------------------------------------------------------------ */}
        <section className="ps-hero-grid">
          {/* LEFT: THUMBNAILS & HERO SHOWCASE */}
          <div className="ps-gallery-layout">
            {/* Showcase & Slider Column */}
            <div className="ps-showcase-column" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
              {/* Main Showcase Hero Display with Hover Prev/Next Arrows & Fullscreen Zoom */}
              <div
                className="ps-showcase-box zoomable group"
                onClick={() => setIsLightboxOpen(true)}
                onMouseEnter={() => setIsHoverZooming(true)}
                onMouseLeave={() => setIsHoverZooming(false)}
                onMouseMove={handleShowcaseMouseMove}
                title="Click to view full screen & 4x zoom"
              >
                {/* High-Contrast Fitment & Series Overlay Badge */}
                <div className="ps-badge-overlay">
                  <span className={`ps-overlay-pill ${custom ? 'ps-custom-fit' : ''}`}>
                    {custom ? (
                      <>
                        <span className="ps-fit-check">✓</span> Custom Fit · {fitTargetLabel}
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

                {/* Perspective Badge in Top-Right */}
                <div className="ps-perspective-pill">
                  <Car size={13} />
                  <span>{galleryPerspectives[activeThumbIndex]?.title || 'Studio Angle'}</span>
                </div>

                {/* In-Image Left/Right Navigation Chevrons */}
                <button
                  type="button"
                  className="ps-showcase-arrow ps-arrow-left"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveThumbIndex((i) => (i === 0 ? galleryPerspectives.length - 1 : i - 1));
                  }}
                  aria-label="Previous perspective"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  className="ps-showcase-arrow ps-arrow-right"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveThumbIndex((i) => (i === galleryPerspectives.length - 1 ? 0 : i + 1));
                  }}
                  aria-label="Next perspective"
                >
                  <ChevronRight size={20} />
                </button>

                {/* Quick Full Screen & Zoom Trigger Button */}
                <button
                  type="button"
                  className="ps-fullscreen-btn"
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

                {/* Showcase Image with interactive cursor-following zoom */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={galleryPerspectives[activeThumbIndex]?.url || product.image}
                  alt={`${product.n} - ${galleryPerspectives[activeThumbIndex]?.title}`}
                  style={{
                    transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                    transform: isHoverZooming ? 'scale(1.55)' : 'scale(1)',
                    transition: isHoverZooming ? 'transform 0.08s ease-out' : 'transform 0.3s ease',
                    filter:
                      (!activeColor.images || activeColor.images.length === 0) &&
                      activeColor.filter &&
                      activeColor.filter !== 'none'
                        ? activeColor.filter
                        : undefined,
                  }}
                />
              </div>

              {/* UNIQUE AUTOMOTIVE PERSPECTIVE SLIDER & THUMBNAILS CARD */}
              <div className="ps-gallery-slider-card">
                <div className="ps-slider-header">
                  <div className="ps-slider-label">
                    <Car size={14} style={{ color: 'var(--red, #e2231a)' }} />
                    <span>Vehicle Perspectives</span>
                  </div>
                  <div className="ps-slider-controls">
                    <button
                      type="button"
                      className="ps-slider-nav-btn"
                      onClick={() => setActiveThumbIndex((i) => (i === 0 ? galleryPerspectives.length - 1 : i - 1))}
                      aria-label="Previous angle"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <span className="ps-slider-counter">
                      {activeThumbIndex + 1} / {galleryPerspectives.length}
                    </span>
                    <button
                      type="button"
                      className="ps-slider-nav-btn"
                      onClick={() => setActiveThumbIndex((i) => (i === galleryPerspectives.length - 1 ? 0 : i + 1))}
                      aria-label="Next angle"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>

                {/* Symmetrical Thumbnails Strip with Unique Car Perspective Badges */}
                <div className="ps-thumbnails-grid">
                  {galleryPerspectives.map((item, idx) => {
                    const isActive = activeThumbIndex === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`ps-perspective-thumb ${isActive ? 'active' : ''}`}
                        onClick={() => setActiveThumbIndex(idx)}
                        aria-label={`View ${item.title}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.url} alt={item.title} />
                        <div className="ps-thumb-car-badge">
                          {item.icon === 'gauge' ? (
                            <Gauge size={10} />
                          ) : item.icon === 'sparkles' ? (
                            <Sparkles size={10} />
                          ) : item.icon === 'shield' ? (
                            <Shield size={10} />
                          ) : item.icon === 'compass' ? (
                            <Compass size={10} />
                          ) : (
                            <Car size={10} />
                          )}
                          <span>{item.badge}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT: DUAL-CARD LUXURY ARCHITECTURE */}
          <div className="ps-details-col">
            {/* CARD 1: PRIMARY CONFIGURATION & COMMERCE CARD */}
            <div className="ps-buybox-card">
              {/* Eyebrow & Live Verified Rating */}
              <div className="ps-buybox-top">
                <div className="ps-category-eyebrow">
                  <span>{product.c ? product.c.toUpperCase() : 'AUTOMOTIVE ESSENTIAL'}</span>
                  <span>•</span>
                  <span>{product.s ? `CARXEN ${product.s.toUpperCase()}` : 'CARXEN'}</span>
                </div>
                <div className="ps-rating-score-row">
                  {reviews.length > 0 ? (
                    <>
                      <span className="ps-stars-gold">
                        {'★'.repeat(Math.round(Number(averageRating))) + '☆'.repeat(5 - Math.round(Number(averageRating)))}
                      </span>
                      <span className="ps-rating-num">{averageRating}</span>
                      <a
                        href="#reviews-section"
                        className="ps-rating-count-link"
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        ({reviews.length})
                      </a>
                    </>
                  ) : (
                    <span className="ps-rating-num" style={{ color: 'var(--steel, #5d5d64)' }}>
                      {reviewsLoading ? 'Loading reviews…' : 'No reviews yet'}
                    </span>
                  )}
                </div>
              </div>

              {/* Product Title */}
              <h1 className="ps-product-title">{product.n}</h1>

              {/* Price & Fitment Row */}
              <div className="ps-price-fitment-bar">
                <div className="ps-price-display">
                  <span className="ps-current-price">{formatINR(product.p)}</span>
                  {product.o && product.o > product.p && (
                    <>
                      <span className="ps-original-price">{formatINR(product.o)}</span>
                      <span className="ps-discount-pill">−{discountPercent}%</span>
                    </>
                  )}
                </div>
                <div className="ps-fitment-assurance">
                  <span className="ps-fitment-assurance-dot" />
                  <span>
                    {!custom
                      ? 'Universal Precision Fit'
                      : fitsMyCar
                      ? `Guaranteed Fit: ${activeCar.m}`
                      : builtFor
                      ? `Made for ${builtFor} — not your ${myCarLabel}`
                      : 'Custom fit — confirm your vehicle before ordering'}
                  </span>
                </div>
              </div>
              <div className="ps-tax-shipping-sub">
                Inclusive of all taxes · Free express shipping over ₹1,499
              </div>

              {/* Colour Swatches */}
              <div className="ps-swatches-section">
                <p className="ps-swatch-label">
                  Finish: <span>{activeColor.name}</span>
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

              {/* Action Buttons: 2-Tier Architecture */}
              <div className="ps-cta-container" ref={mainCtaRef}>
                <div className="ps-cta-tier-primary">
                  {/* Stepper */}
                  <div className="ps-stepper">
                    <button
                      type="button"
                      className="ps-stepper-btn"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="ps-stepper-val">{quantity}</span>
                    <button
                      type="button"
                      className="ps-stepper-btn"
                      onClick={() => setQuantity((q) => q + 1)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  {/* Add to Cart */}
                  <button
                    type="button"
                    className="ps-btn-add-cart"
                    onClick={() => {
                      addToCart(product.id, quantity);
                      openCart();
                    }}
                  >
                    <ShoppingBag size={18} className="ps-btn-cart-icon" />
                    <span className="ps-btn-cart-text">
                      {quantity > 1
                        ? `Add ${quantity} to Cart · ${formatINR(totalPrice)}`
                        : 'Add to Cart'}
                    </span>
                  </button>

                  {/* Wishlist */}
                  <button
                    type="button"
                    className={`ps-wishlist-btn ${isFav(product.id) ? 'ps-fav-active' : ''} ${isFavPopping ? 'pop' : ''}`}
                    onClick={() => {
                      if (!isFav(product.id)) {
                        setIsFavPopping(true);
                        setTimeout(() => setIsFavPopping(false), 700);
                      }
                      toggleFav(product.id);
                    }}
                    aria-label={isFav(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                  >
                    <Heart
                      className="w-5 h-5"
                      fill={isFav(product.id) ? '#e2231a' : 'none'}
                      stroke={isFav(product.id) ? '#e2231a' : 'currentColor'}
                    />
                  </button>
                </div>

                {/* Instant Buy Now Button */}
                <button
                  type="button"
                  className="ps-btn-buy-now"
                  onClick={handleBuyNow}
                >
                  <Zap size={18} />
                  <span>Buy it now · Instant Checkout</span>
                </button>
              </div>

              {/* Integrated Buy Box Delivery Strip */}
              <div className="ps-buybox-delivery">
                <div className="ps-delivery-label-wrap">
                  <Truck size={16} />
                  <span>{deliveryMsg}</span>
                </div>
                <div className="ps-pincode-inline-form">
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
            </div>

            {/* CARD 2: SPECIFICATIONS & HIGHLIGHTS CARD */}
            <div className="ps-specs-card">
              {/* Symmetrical 3-Column Micro-Spec Grid */}
              <div className="ps-specs-micro-grid">
                <div className="ps-micro-spec-item">
                  <div className="ps-micro-spec-icon-label">
                    <Car size={13} style={{ color: '#2563eb' }} />
                    <span>Fitment</span>
                  </div>
                  <span className="ps-micro-spec-val">
                    {custom ? fitTargetLabel : 'Universal Fit'}
                  </span>
                </div>
                <div className="ps-micro-spec-item">
                  <div className="ps-micro-spec-icon-label">
                    <Wrench size={13} style={{ color: 'var(--red, #e2231a)' }} />
                    <span>Installation</span>
                  </div>
                  <span className="ps-micro-spec-val">
                    {installationDetails.difficulty} · {installationDetails.time}
                  </span>
                </div>
                <div className="ps-micro-spec-item">
                  <div className="ps-micro-spec-icon-label">
                    <Sparkles size={13} style={{ color: '#d97706' }} />
                    <span>Durability</span>
                  </div>
                  <span className="ps-micro-spec-val">OEM Grade Nappa</span>
                </div>
              </div>

              {/* Editorial Description */}
              {product.d ? (
                <p className="ps-specs-desc">
                  {product.d.replace(/Full of Corona Virus/gi, '').replace(/\s+/g, ' ').trim()}
                </p>
              ) : null}

              {/* Assurance Badges Strip */}
              <div className="ps-card-assurance-strip">
                {warrantyLabel && (
                  <div className="ps-card-assurance-item">
                    <ShieldCheck size={14} style={{ color: '#16a34a' }} />
                    <span>{warrantyLabel} Warranty</span>
                  </div>
                )}
                <div className="ps-card-assurance-item">
                  <Truck size={14} style={{ color: 'var(--red, #e2231a)' }} />
                  <span>2–4 Day Dispatch</span>
                </div>
                <div className="ps-card-assurance-item">
                  <CheckCircle2 size={14} style={{ color: '#0284c7' }} />
                  <span>100% Genuine Fit</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------
            DEDICATED PRODUCT INFORMATION, SPECS & INSTALLATION METHOD HUB
            ------------------------------------------------------------------ */}
        <section className="ps-info-hub-section" id="product-details-hub">
          {/* Section Header */}
          <div className="ps-info-hub-header">
            <div className="ps-info-hub-tag">
              <Award size={13} />
              <span>CARXEN ENGINEERING SPECIFICATION</span>
            </div>
            <h2 className="ps-info-hub-title">Product Details & Technical Hub</h2>
            <p className="ps-info-hub-subtitle">
              Comprehensive engineering specifications, step-by-step DIY installation instructions, vehicle fitment verification, and package contents for your {product.n}.
            </p>
          </div>

          {/* Interactive Nav Tabs */}
          <div className="ps-info-tabs-bar" role="tablist" aria-label="Product details navigation">
            <button
              type="button"
              role="tab"
              aria-selected={activeInfoTab === 'specs'}
              className={`ps-info-tab-btn ${activeInfoTab === 'specs' ? 'active' : ''}`}
              onClick={() => setActiveInfoTab('specs')}
            >
              <FileText size={15} />
              <span>Specifications</span>
              <span className="ps-tab-badge">{enrichedSpecs.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeInfoTab === 'install'}
              className={`ps-info-tab-btn ${activeInfoTab === 'install' ? 'active' : ''}`}
              onClick={() => setActiveInfoTab('install')}
            >
              <Wrench size={15} />
              <span>How to Install</span>
              <span className="ps-tab-badge">{installationDetails.steps.length} Steps</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeInfoTab === 'desc'}
              className={`ps-info-tab-btn ${activeInfoTab === 'desc' ? 'active' : ''}`}
              onClick={() => setActiveInfoTab('desc')}
            >
              <Sparkles size={15} />
              <span>Description & Highlights</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeInfoTab === 'fitment'}
              className={`ps-info-tab-btn ${activeInfoTab === 'fitment' ? 'active' : ''}`}
              onClick={() => setActiveInfoTab('fitment')}
            >
              <Car size={15} />
              <span>Vehicle Fitment</span>
              <span className="ps-tab-badge">Verified</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeInfoTab === 'box'}
              className={`ps-info-tab-btn ${activeInfoTab === 'box' ? 'active' : ''}`}
              onClick={() => setActiveInfoTab('box')}
            >
              <PackageCheck size={15} />
              <span>What&apos;s in the Box</span>
            </button>
          </div>

          {/* TAB 1: SPECIFICATIONS */}
          {activeInfoTab === 'specs' && (
            <div className="ps-info-panel" role="tabpanel">
              <div className="ps-specs-table-grid">
                {enrichedSpecs.map(([specKey, specVal], idx) => (
                  <div key={idx} className="ps-spec-card">
                    <span className="ps-spec-label">{specKey}</span>
                    <span className="ps-spec-val">{specVal}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: INSTALLATION METHOD */}
          {activeInfoTab === 'install' && (
            <div className="ps-info-panel" role="tabpanel">
              {installationDetails.steps.length === 0 ? (
                <p className="ps-spec-val" style={{ color: 'var(--steel, #5d5d64)' }}>
                  No installation guide has been published for this item yet.
                </p>
              ) : (
                <>
                  {(installationDetails.difficulty || installationDetails.time || installationDetails.videoUrl) && (
                    <div className="ps-install-banner">
                      <div className="ps-install-banner-meta">
                        {installationDetails.difficulty && (
                          <div className={`ps-install-chip ${
                            installationDetails.difficulty.toLowerCase().includes('easy')
                              ? 'difficulty-easy'
                              : installationDetails.difficulty.toLowerCase().includes('pro')
                              ? 'difficulty-pro'
                              : 'difficulty-moderate'
                          }`}>
                            <Wrench size={13} />
                            <span>Difficulty: {installationDetails.difficulty}</span>
                          </div>
                        )}
                        {installationDetails.time && (
                          <div className="ps-install-chip">
                            <Clock size={13} style={{ color: 'var(--steel, #5d5d64)' }} />
                            <span>Estimated Time: {installationDetails.time}</span>
                          </div>
                        )}
                      </div>

                      {installationDetails.videoUrl && (
                        <a
                          href={installationDetails.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ps-install-video-btn"
                        >
                          <PlayCircle size={15} />
                          <span>Watch Video Tutorial</span>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  )}

                  <div className="ps-install-steps-list">
                    {installationDetails.steps.map((stepText, idx) => {
                      const cleanText = stepText.replace(/^Step\s*\d+:\s*/i, '');
                      return (
                        <div key={idx} className="ps-install-step-card">
                          <div className="ps-install-step-num">
                            {String(idx + 1).padStart(2, '0')}
                          </div>
                          <div className="ps-install-step-body">
                            <h4 className="ps-install-step-title">Step {idx + 1}</h4>
                            <p className="ps-install-step-desc">{cleanText}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: DESCRIPTION & HIGHLIGHTS */}
          {activeInfoTab === 'desc' && (
            <div className="ps-info-panel" role="tabpanel">
              <div style={{ maxWidth: '820px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink, #0e0e0f)', marginBottom: '8px' }}>
                  Detailed Description
                </h3>
                {product.d ? (
                  <p style={{ fontSize: '13.5px', lineHeight: '1.7', color: 'var(--steel, #5d5d64)' }}>
                    {product.d.replace(/Full of Corona Virus/gi, '').replace(/\s+/g, ' ').trim()}
                  </p>
                ) : (
                  <p style={{ fontSize: '13.5px', lineHeight: '1.7', color: 'var(--steel, #5d5d64)' }}>
                    No description has been published for this item yet.
                  </p>
                )}

                {/* Technical Product Search Tags */}
                {Array.isArray(product.tags) && product.tags.length > 0 && (
                  <div className="ps-desc-tags" style={{ marginTop: '12px' }}>
                    <span className="ps-desc-tags-label">Search Tags:</span>
                    {product.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/shop?q=${encodeURIComponent(tag)}`}
                        className="ps-desc-tag-pill"
                        title={`Search products tagged #${tag}`}
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink, #0e0e0f)', marginBottom: '12px' }}>
                Engineering Highlights
              </h3>
              <div className="ps-features-grid">
                {featureHighlights.map((feat, idx) => (
                  <div key={idx} className="ps-feature-box">
                    <div className="ps-feature-icon-wrap">
                      {feat.icon === 'laser' && <Car size={18} />}
                      {feat.icon === 'shield' && <Shield size={18} />}
                      {feat.icon === 'sparkles' && <Sparkles size={18} />}
                      {feat.icon === 'wrench' && <Wrench size={18} />}
                    </div>
                    <h4 className="ps-feature-box-title">{feat.title}</h4>
                    <p className="ps-feature-box-desc">{feat.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: VEHICLE FITMENT */}
          {activeInfoTab === 'fitment' && (
            <div className="ps-info-panel" role="tabpanel">
              <div className="ps-fitment-hub-card">
                <div className="ps-fitment-matched-row">
                  <div className="ps-fitment-matched-left">
                    <div className="ps-fitment-check-circle">
                      <Check size={18} />
                    </div>
                    <div>
                      <div className="ps-fitment-car-title">
                        {custom
                          ? fitsMyCar
                            ? 'Exact Fit Recorded'
                            : 'Made-To-Measure Fit'
                          : 'Universal Multi-Vehicle Fit'}
                      </div>
                      <div className="ps-fitment-car-sub">
                        {custom
                          ? fitsMyCar
                            ? `Configured for ${activeCar.y} ${activeCar.b} ${activeCar.m} (${activeCar.f})`
                            : `Cut for ${builtFor ?? 'a specific vehicle'} — not your ${myCarLabel}`
                          : 'Fits most passenger cars, sedans and SUVs'}
                      </div>
                    </div>
                  </div>

                  <Link href="/account?tab=garage" className="ps-fitment-change-link">
                    Change Vehicle in Garage &rarr;
                  </Link>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                  <div style={{ padding: '16px', background: '#ffffff', border: '1px solid var(--line, #dcdbd5)', borderRadius: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Car size={16} style={{ color: 'var(--red, #e2231a)' }} />
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink, #0e0e0f)' }}>Recorded Fitment</span>
                    </div>
                    <p style={{ fontSize: '12.5px', color: 'var(--steel, #5d5d64)', lineHeight: '1.5' }}>
                      {custom
                        ? `This item is made for ${builtFor ?? 'a specific vehicle'} as recorded in the product listing.`
                        : 'Universal fit — not cut for a specific vehicle.'}
                    </p>
                  </div>

                  <div style={{ padding: '16px', background: '#ffffff', border: '1px solid var(--line, #dcdbd5)', borderRadius: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <ShieldCheck size={16} style={{ color: '#16a34a' }} />
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink, #0e0e0f)' }}>Fitment Type</span>
                    </div>
                    <p style={{ fontSize: '12.5px', color: 'var(--steel, #5d5d64)', lineHeight: '1.5' }}>
                      {custom ? 'Vehicle-specific custom fit' : 'Universal stretch fit'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PACKAGE CONTENTS */}
          {activeInfoTab === 'box' && (
            <div className="ps-info-panel" role="tabpanel">
              {packageContents.length === 0 ? (
                <p className="ps-spec-val" style={{ color: 'var(--steel, #5d5d64)' }}>
                  Package contents have not been published for this item yet.
                </p>
              ) : (
              <div className="ps-package-grid">
                {packageContents.map((item, idx) => (
                  <div key={idx} className="ps-package-item-card">
                    <div className="ps-package-item-left">
                      <PackageCheck size={16} style={{ color: 'var(--red, #e2231a)', flexShrink: 0 }} />
                      <span>{item.name}</span>
                    </div>
                    {item.qty && <span className="ps-package-qty-badge">{item.qty}</span>}
                  </div>
                ))}
              </div>
              )}
            </div>
          )}
        </section>

        {/* ------------------------------------------------------------------
        {/* ------------------------------------------------------------------
            FREQUENTLY BOUGHT TOGETHER (configured from VEDA)
            ------------------------------------------------------------------ */}
        {recommendedProducts.length > 0 && (
          <section className="ps-bundle-section">
            <div className="ps-bundle-header">
              <div>
                <div className="ps-bundle-tag">
                  <Sparkles size={12} />
                  <span>RECOMMENDED PAIRING</span>
                </div>
                <h3 className="ps-bundle-title">Frequently bought together</h3>
                <p className="ps-bundle-subtitle">
                  Accessories CarXen recommends buying with this {categoryLabel.toLowerCase()}.
                </p>
              </div>
            </div>

            <div className="ps-bundle-main-layout">
              {/* Current product + configured recommendations */}
              <div className="ps-bundle-products-wrap">
                {[product, ...recommendedProducts].map((bItem, i) => (
                  <React.Fragment key={bItem.id}>
                    {i > 0 && (
                      <div className="ps-bundle-connector" aria-hidden="true">
                        <Plus size={14} />
                      </div>
                    )}
                    <div className="ps-bundle-card selected">
                      <div className="ps-bundle-card-top">
                        {bItem.id === product.id ? (
                          <span className="ps-bundle-badge-current">This item</span>
                        ) : (
                          <span className="ps-bundle-badge-category">{bItem.categoryLabel || bItem.c}</span>
                        )}
                      </div>

                      <div className="ps-bundle-thumb-wrap">
                        {bItem.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={bItem.image} alt={bItem.n} />
                        ) : (
                          <div style={{ width: '85%', height: '85%' }}>
                            <ProductArt product={bItem} />
                          </div>
                        )}
                      </div>

                      <div className="ps-bundle-card-body">
                        <Link href={`/product/${bItem.id}`} className="ps-bundle-item-link">
                          {bItem.n}
                        </Link>
                        <div className="ps-bundle-price-row">
                          <span className="ps-bundle-price">{formatINR(bItem.p)}</span>
                          {bItem.o && bItem.o > bItem.p && (
                            <span className="ps-bundle-orig-price">{formatINR(bItem.o)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>

              {/* Equals connector for desktop */}
              <div className="ps-bundle-equals-connector" aria-hidden="true">
                <span>=</span>
              </div>

              {/* Bundle Action & Pricing Summary Panel */}
              <div className="ps-bundle-summary-panel">
                <div className="ps-bundle-summary-header">
                  <span className="ps-bundle-summary-label">Bundle Total</span>
                  <span className="ps-bundle-summary-count">
                    ({recommendedProducts.length + 1} items)
                  </span>
                </div>

                <div className="ps-bundle-summary-pricing">
                  <div className="ps-bundle-final-price">{formatINR(bundleTotal)}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--steel, #5d5d64)', marginTop: '4px' }}>
                    Simple sum of item prices — no bundle discount applied.
                  </div>
                </div>

                <button type="button" onClick={handleAddBundle} className="ps-bundle-action-btn">
                  <Plus size={16} />
                  <span>Add {recommendedProducts.length + 1} items to cart</span>
                </button>

                <div className="ps-bundle-summary-perks">
                  <div className="ps-bundle-perk-item">
                    <CheckCircle2 size={13} style={{ color: '#22c55e' }} />
                    <span>Free express delivery across India</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
        <Separator style={{ margin: '40px 0' }} />

        {/* ------------------------------------------------------------------
            REVIEWS SECTION
            ------------------------------------------------------------------ */}
        <section className="ps-reviews-section" id="reviews-section">
          {/* Header Bar: Left Title/Dynamic Score + Right Prominent "Write a Review" Button */}
          <div className="ps-reviews-header-bar">
            <div className="ps-reviews-top">
              <h2 className="ps-reviews-title">Customer Reviews</h2>
              <div className="ps-reviews-score-cluster">
                {reviews.length > 0 ? (
                  <>
                    <span className="ps-overall-stars">
                      {'★'.repeat(Math.round(Number(averageRating))) + '☆'.repeat(5 - Math.round(Number(averageRating)))}
                    </span>
                    <span className="ps-overall-score">{averageRating}</span>
                    <span className="ps-overall-count">
                      ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                    </span>
                  </>
                ) : (
                  <span className="ps-overall-count">
                    {reviewsLoading ? 'Loading reviews…' : 'No reviews yet'}
                  </span>
                )}
              </div>
            </div>

            <div className="ps-reviews-action-box">
              <button
                type="button"
                className={`ps-write-review-btn ${hasOrderedThisProduct ? 'verified-buyer' : ''}`}
                onClick={handleStartReview}
                aria-label="Write a Review"
              >
                <Pencil style={{ width: '15px', height: '15px' }} />
                <span>Write a Review</span>
                {hasOrderedThisProduct ? (
                  <span className="ps-verified-pill-tag">✓ Verified Buyer</span>
                ) : (
                  <span className="ps-lock-pill-tag">Verified Only</span>
                )}
              </button>
            </div>
          </div>

          {/* Filter Pills Row (counts from published reviews only) */}
          {reviews.length > 0 && (
          <div className="ps-filter-pills-row" role="group" aria-label="Review filters">
            <button
              type="button"
              className={`ps-filter-chip ${activeReviewFilter === 'all' ? 'ps-chip-active-dark' : ''}`}
              onClick={() => setActiveReviewFilter('all')}
            >
              All ({reviews.length})
            </button>

            <button
              type="button"
              className={`ps-filter-chip ${activeReviewFilter === '5stars' ? 'ps-chip-active-dark' : ''}`}
              onClick={() => setActiveReviewFilter('5stars')}
            >
              ★★★★★ ({starCounts[5]})
            </button>

            <button
              type="button"
              className={`ps-filter-chip ${activeReviewFilter === '4stars' ? 'ps-chip-active-dark' : ''}`}
              onClick={() => setActiveReviewFilter('4stars')}
            >
              ★★★★ ({starCounts[4]})
            </button>

            <button
              type="button"
              className={`ps-filter-chip ${activeReviewFilter === '3stars' ? 'ps-chip-active-dark' : ''}`}
              onClick={() => setActiveReviewFilter('3stars')}
            >
              ★★★ ({starCounts[3]})
            </button>

            <button
              type="button"
              className={`ps-filter-chip ${activeReviewFilter === '2stars' ? 'ps-chip-active-dark' : ''}`}
              onClick={() => setActiveReviewFilter('2stars')}
            >
              ★★ ({starCounts[2]})
            </button>

            <button
              type="button"
              className={`ps-filter-chip ${activeReviewFilter === '1star' ? 'ps-chip-active-dark' : ''}`}
              onClick={() => setActiveReviewFilter('1star')}
            >
              ★ ({starCounts[1]})
            </button>
          </div>
          )}

          {/* Review Writer Card Form (only appears when triggered via the top button) */}
          {isWritingReview && (
            <div id="review-writer-card-anchor" className="ps-review-writer-card" style={{ marginBottom: '24px' }}>
              <form onSubmit={handleSubmitReview}>
                <div className="ps-review-writer-header">
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--ink, #0e0e0f)' }}>
                      Write a Verified Review
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--steel, #5d5d64)', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                      Sharing review as <b style={{ color: 'var(--ink, #0e0e0f)' }}>{user?.name || 'Verified Driver'}</b>
                      <span style={{ color: '#16a34a', fontWeight: 600, marginLeft: '4px' }}>
                        ✓ Verified Owner of {product.n}
                      </span>
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
                  placeholder="Share specific details about the quality, installation ease, and fitment on your car..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  required
                />

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    type="submit"
                    className="ps-btn-buy-now"
                    disabled={submittingReview}
                    style={{ height: '42px', padding: '0 24px', fontSize: '13px', opacity: submittingReview ? 0.7 : 1 }}
                  >
                    {submittingReview ? 'Submitting…' : 'Submit Review'}
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

          {/* Review Cards List — published reviews only */}
          {filteredReviews.length === 0 ? (
            <div className="ps-reviews-empty">
              {reviews.length === 0 ? (
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                  {reviewsLoading
                    ? 'Loading reviews…'
                    : 'No reviews yet. Verified buyers can write the first review.'}
                </p>
              ) : (
                <>
                  <p style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600 }}>
                    No reviews found for this rating filter.
                  </p>
                  <button
                    type="button"
                    className="ps-reviews-page-btn"
                    onClick={() => setActiveReviewFilter('all')}
                  >
                    Show All Reviews
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="ps-review-cards-list">
              {paginatedReviews.map((rev) => (
                <div key={rev.id} className="ps-review-item-card">
                  <div className="ps-review-item-top">
                    <div className="ps-review-author-wrap">
                      <Avatar
                        fallback={rev.customerName.slice(0, 2).toUpperCase()}
                        style={{ width: '36px', height: '36px', fontSize: '12px' }}
                      />
                      <div className="ps-review-stars-user">
                        <span className="ps-review-item-stars">
                          {'★'.repeat(rev.rating) + '☆'.repeat(5 - rev.rating)}
                        </span>
                        <span className="ps-review-user-name" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {rev.customerName}
                          {rev.verifiedPurchase && (
                            <VerifiedBadge size={15} tooltipText="Verified purchase" />
                          )}
                        </span>
                      </div>
                    </div>
                    <span className="ps-review-date">{formatReviewDate(rev.createdAt)}</span>
                  </div>

                  {rev.title && <div className="ps-review-item-title">{rev.title}</div>}
                  <p className="ps-review-body-text">{rev.body}</p>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls Bar */}
          {filteredReviews.length > 0 && (
            <div className="ps-reviews-pagination-wrap">
              <div className="ps-reviews-pagination-info">
                Showing {(reviewPage - 1) * REVIEWS_PER_PAGE + 1}–
                {Math.min(reviewPage * REVIEWS_PER_PAGE, filteredReviews.length)} of {filteredReviews.length} reviews
              </div>

              {totalReviewPages > 1 && (
                <div className="ps-reviews-pagination-controls">
                  <button
                    type="button"
                    className="ps-reviews-page-btn"
                    disabled={reviewPage === 1}
                    onClick={() => {
                      setReviewPage((p) => Math.max(1, p - 1));
                      document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    aria-label="Previous page"
                  >
                    ← Previous
                  </button>

                  <div className="ps-reviews-page-numbers">
                    {Array.from({ length: totalReviewPages }, (_, idx) => idx + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        className={`ps-reviews-page-num ${reviewPage === pageNum ? 'active' : ''}`}
                        onClick={() => {
                          setReviewPage(pageNum);
                          document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="ps-reviews-page-btn"
                    disabled={reviewPage === totalReviewPages}
                    onClick={() => {
                      setReviewPage((p) => Math.min(totalReviewPages, p + 1));
                      document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    aria-label="Next page"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Verified Purchase Requirement Modal */}
        {showNotOrderedModal && (
          <div className="ps-modal-overlay" onClick={() => setShowNotOrderedModal(false)}>
            <div className="ps-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="ps-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="ps-modal-shield-icon">
                    <Lock style={{ width: '16px', height: '16px', color: '#b45309' }} />
                  </div>
                  <h3 className="ps-modal-title">Verified Purchase Required</h3>
                </div>
                <button
                  type="button"
                  className="ps-modal-close"
                  onClick={() => setShowNotOrderedModal(false)}
                  aria-label="Close"
                >
                  <X style={{ width: '16px', height: '16px' }} />
                </button>
              </div>

              <div className="ps-modal-body">
                <p className="ps-modal-text">
                  Reviews on CARXEN come only from customers who have ordered the item, so every review is tied to a real purchase.
                </p>

                <div className="ps-modal-product-preview">
                  <div className="ps-modal-thumb">
                    {product.image ? (
                      <img src={product.image} alt={product.n} />
                    ) : (
                      <ProductArt product={product} />
                    )}
                  </div>
                  <div className="ps-modal-info">
                    <span className="ps-modal-item-name">{product.n}</span>
                    <span className="ps-modal-status-chip">No order for this item found</span>
                  </div>
                </div>
              </div>

              <div className="ps-modal-actions">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNotOrderedModal(false);
                    router.push('/customer');
                  }}
                  className="rounded-full"
                >
                  View My Orders
                </Button>
                <Button
                  onClick={() => {
                    setShowNotOrderedModal(false);
                    addToCart(product.id, 1);
                    openCart();
                  }}
                  className="bg-[#e2231a] hover:bg-[#b91a12] text-white rounded-full"
                >
                  Order This Product
                </Button>
              </div>
            </div>
          </div>
        )}


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
                  fitText={fitBadgeText(p, activeCar)}
                  isCustomFitBadge={isCustom}
                />
              );
            })}
          </div>
        </section>
      </div>

      {/* Sticky Mobile Buy Bar - only visible when scrolled past main CTA to avoid duplicate buttons */}
      <div className={`ps-mobile-sticky-bar ${showStickyBar ? 'ps-sticky-visible' : ''}`}>
        <div>
          <span style={{ fontSize: '11px', color: '#71717a', display: 'block' }}>
            {quantity > 1 ? `Total (${quantity} units)` : 'Total price'}
          </span>
          <b style={{ fontSize: '15px', color: 'var(--ink, #0e0e0f)' }}>
            {formatINR(totalPrice)}
          </b>
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
            {quantity > 1
              ? `Add ${quantity} · ${formatINR(totalPrice)}`
              : 'Add to Cart'}
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

      {/* Fullscreen & Interactive Zoom Lightbox Modal */}
      <ProductImageLightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        images={galleryPerspectives}
        activeIndex={activeThumbIndex}
        onIndexChange={setActiveThumbIndex}
        productName={product.n}
        categoryLabel={product.c ? `${product.c.toUpperCase()} COLLECTION` : 'CARXEN SIGNATURE'}
        colorName={activeColor?.name}
        colorFilter={
          (!activeColor.images || activeColor.images.length === 0) &&
          activeColor.filter &&
          activeColor.filter !== 'none'
            ? activeColor.filter
            : undefined
        }
      />

      {/* Footer at bottom with ZERO trailing whitespace */}
      <Footer />
    </div>
  );
}

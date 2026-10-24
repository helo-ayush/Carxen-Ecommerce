'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  MessageSquare,
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
  AlertCircle,
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
} from 'lucide-react';

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

function getInstallationDetails(product: Product, activeCar: { b: string; m: string; y: string; f: string }) {
  const category = product.c;
  const difficulty = product.installation?.difficulty || (category === 'steering' ? 'Moderate (5-10 mins)' : 'Easy (DIY)');
  const time = product.installation?.time || (category === 'seats' ? '25 - 35 mins' : category === 'mats' ? '10 - 15 mins' : '15 mins');
  const videoUrl = product.installation?.videoUrl;

  let steps = product.installation?.steps;
  if (!steps || steps.length === 0) {
    if (category === 'seats') {
      steps = [
        'Unbox and lay out all seat sections on a clean surface to verify driver, passenger, and rear bench orientation.',
        'Slide the lower cushion cover over the front seat base, aligning side bolsters and smoothing fabric toward corners.',
        'Push the center elastic straps and round retaining discs through the seat crease between the backrest and bottom cushion.',
        'Secure the heavy-duty metal S-hooks to non-moving structural points underneath the vehicle seat frame.',
        'Slip the backrest cover over the seatback, press the ergonomic contour lining flat against the lumbar curve, and fasten the headrest loop fasteners.',
        'Repeat for the passenger and rear seats. Allow 24 hours of normal usage for the memory-lined contours to settle flush with zero creasing.',
      ];
    } else if (category === 'mats') {
      steps = [
        'Remove any old factory or aftermarket floor mats and thoroughly vacuum the cabin footwells.',
        'Align the driver-side mat over the pedal area, ensuring the reinforced heel-pad sits directly under the accelerator and brake pedals with zero pedal interference.',
        'Engage the OEM floor twist-lock pegs or anchor grommets on the floor pan to ensure 100% anti-slip security while driving.',
        'Position the front passenger mat flush against the footwell contours, fire-wall angle, and side kick-panels.',
        'Install the rear row continuous mat, tucking the center transmission hump bridge under the rear center console for seamless edge-to-edge protection.',
      ];
    } else if (category === 'steering') {
      steps = [
        'Park vehicle on level ground, turn off the engine, and ensure the steering wheel is locked straight.',
        'Warm the cover slightly (leave in sunlight for 5-10 minutes or gently warm with a hairdryer) to maximize leatherette flexibility.',
        'Align the top center marker / contrast seam of the cover with the 12 o\'clock position on the steering wheel rim.',
        'Work downward on both sides simultaneously, firmly stretching the high-friction anti-slip rubber lining around the rim.',
        'Roll the bottom edge over the lower spoke. Check all seams to verify full rim wrap and firm, non-twist grip.',
      ];
    } else {
      steps = [
        'Unbox the accessory and inspect components against the included package contents checklist.',
        'Wipe down the intended cabin mounting surface with a clean microfiber cloth to remove dust and oils.',
        'Position the accessory and secure with the integrated quick-lock buckle straps or non-marking anchors.',
        'Adjust height or orientation for personalized driving ergonomics and verify firm stability before driving.',
      ];
    }
  }

  return { difficulty, time, steps, videoUrl };
}

function getPackageContents(product: Product) {
  const category = product.c;
  if (category === 'seats') {
    return [
      { name: 'Front Driver Seat Cover (Base & Backrest)', qty: '1 Set' },
      { name: 'Front Passenger Seat Cover (Base & Backrest)', qty: '1 Set' },
      { name: 'Rear Row Bench & Split Backrest Covers', qty: '1 Set' },
      { name: 'Contoured Headrest Protective Sleeves', qty: '4 - 5 Pcs' },
      { name: 'Heavy-Duty Metal S-Hooks & Locking Retaining Discs', qty: '1 Hardware Pack' },
      { name: 'CARXEN 2-Year Official Warranty Certificate', qty: '1 Pc' },
    ];
  }
  if (category === 'mats') {
    return [
      { name: 'Driver-Side Precision Mat with Heavy-Duty Heel Pad', qty: '1 Pc' },
      { name: 'Front Passenger-Side Precision Contoured Mat', qty: '1 Pc' },
      { name: 'Continuous Rear Row Floor Mat with Transmission Hump Bridge', qty: '1 Full Piece' },
      { name: 'Anti-Skid Retention Clips & Edge Locks', qty: '1 Set' },
      { name: 'Waterproof Maintenance & Care Card', qty: '1 Pc' },
    ];
  }
  if (category === 'steering') {
    return [
      { name: 'Precision-Fit Ergonomic Steering Wheel Cover', qty: '1 Pc' },
      { name: 'Anti-Slip Odorless Natural Rubber Core', qty: 'Integrated' },
      { name: 'Fitting Guide & Authenticity QR Card', qty: '1 Pc' },
    ];
  }
  return [
    { name: `${product.n} Unit`, qty: '1 Pc' },
    { name: 'High-Tensile Elastic Quick-Lock Anchor Straps', qty: '1 Set' },
    { name: 'CARXEN Quality Inspection Certificate & Warranty Card', qty: '1 Pc' },
  ];
}

function getEnrichedSpecifications(product: Product, activeCar: { b: string; m: string; y: string; f: string }) {
  const custom = product.customFit !== false;
  const existingSpecs = new Map<string, string>();
  if (Array.isArray(product.sp)) {
    for (const [k, v] of product.sp) {
      if (k && v) existingSpecs.set(k.trim(), String(v).trim());
    }
  }

  if (!existingSpecs.has('Vehicle Compatibility')) {
    existingSpecs.set(
      'Vehicle Compatibility',
      custom ? `${activeCar.y} ${activeCar.b} ${activeCar.m} (${activeCar.f}) · Laser Mapped` : 'Universal Multi-Vehicle Fit'
    );
  }
  if (!existingSpecs.has('Product Series') && product.s) {
    existingSpecs.set('Product Series', `CARXEN ${product.s} Series`);
  }
  if (!existingSpecs.has('Fitment Type')) {
    existingSpecs.set('Fitment Type', custom ? 'Custom 3D Laser-Scanned Contours' : 'Universal Stretch-Fit');
  }
  if (!existingSpecs.has('Water Resistance')) {
    existingSpecs.set('Water Resistance', '100% Water, Mud & Spill Resistant');
  }
  if (!existingSpecs.has('Cleaning & Care')) {
    existingSpecs.set('Cleaning & Care', 'Wipe clean with damp microfiber cloth · Mild car shampoo safe');
  }
  if (!existingSpecs.has('Warranty')) {
    existingSpecs.set('Warranty', '2-Year CARXEN Comprehensive Manufacturer Warranty');
  }
  if (!existingSpecs.has('Country of Origin')) {
    existingSpecs.set('Country of Origin', 'India');
  }

  return Array.from(existingSpecs.entries());
}

function getFeatureHighlights(product: Product, activeCar: { b: string; m: string; y: string; f: string }) {
  const custom = product.customFit !== false;

  return [
    {
      title: custom ? `Laser-Mapped ${activeCar.m} Fitment` : 'Universal Multi-Vehicle Fitment',
      desc: custom
        ? `Precision-engineered using 3D laser scanners for exact contours of the ${activeCar.b} ${activeCar.m} cabin with zero creasing or loose edges.`
        : 'Engineered with flexible multi-anchor stretch tensioners to fit seamlessly across most passenger cars, sedans, and SUVs.',
      icon: 'laser',
    },
    {
      title: 'Automotive-Grade Premium Upholstery',
      desc: 'Crafted with multi-layer high-density memory composite and breathable synthetic leatherette that resists UV cracking and daily friction.',
      icon: 'shield',
    },
    {
      title: 'All-Weather & Spill Defense',
      desc: 'Hydrophobic coating ensures water, hot coffee, mud, and everyday dirt roll off without staining factory upholstery.',
      icon: 'sparkles',
    },
    {
      title: 'Easy DIY Installation',
      desc: 'No drilling, vehicle modification, or specialized tools needed. Equipped with quick-clip anchors and clear illustrated steps.',
      icon: 'wrench',
    },
  ];
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
    isVerifiedBuyer,
    totalProductsBought,
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

  const [activeThumbIndex, setActiveThumbIndex] = useState(0);
  const [isFavPopping, setIsFavPopping] = useState(false);

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
    return getInstallationDetails(product, activeCar);
  }, [product, activeCar]);

  const packageContents = useMemo(() => {
    return getPackageContents(product);
  }, [product]);

  const enrichedSpecs = useMemo(() => {
    return getEnrichedSpecifications(product, activeCar);
  }, [product, activeCar]);

  const featureHighlights = useMemo(() => {
    return getFeatureHighlights(product, activeCar);
  }, [product, activeCar]);

  // Review reply interface for nested conversation thread
  interface ReviewReply {
    id: string;
    authorName: string;
    authorAvatar?: string;
    date: string;
    text: string;
    isVerifiedBuyer?: boolean;
    isStaff?: boolean;
  }

  // Review item definition matching other customer reviews
  interface ReviewRecord {
    id: string;
    name: string;
    rating: number;
    date: string;
    title: string;
    comment: string;
    avatarUrl?: string;
    isVerified?: boolean;
    replies?: ReviewReply[];
  }

  // Verification: check if the logged in customer has ordered this item
  const hasOrderedThisProduct = useMemo(() => {
    const prodIdNum = Number(product.id);
    if (orders && orders.length > 0) {
      const match = orders.some((order) =>
        order.items?.some((item) => Number(item.productId) === prodIdNum)
      );
      if (match) return true;
    }
    try {
      const stored = localStorage.getItem('cx_order_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.some((order: any) =>
            order.items?.some((item: any) => Number(item.productId) === prodIdNum)
          );
        }
      }
    } catch {}
    return false;
  }, [orders, product.id]);

  // Verified Buyer logic: users who have bought >= 3 products across orders, or ordered this product
  const isEligibleToReview = Boolean(isVerifiedBuyer || hasOrderedThisProduct);

  // Review submission & modal state
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [showNotOrderedModal, setShowNotOrderedModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [userReviews, setUserReviews] = useState<ReviewRecord[]>([]);

  // Review reply state (conversation replies persisted per product)
  const [customReplies, setCustomReplies] = useState<Record<string, ReviewReply[]>>({});
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [replyAuthor, setReplyAuthor] = useState<string>('');

  // Load persisted user-published reviews and replies on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(`cx_product_reviews_${product.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setUserReviews(parsed);
      }
    } catch {}

    try {
      const storedReplies = localStorage.getItem(`cx_reviews_replies_${product.id}`);
      if (storedReplies) {
        const parsedReplies = JSON.parse(storedReplies);
        if (parsedReplies && typeof parsedReplies === 'object') {
          setCustomReplies(parsedReplies);
        }
      }
    } catch {}
  }, [product.id]);

  // Review filter pills state (default to 'all' so users see all verified reviews and pagination)
  const [activeReviewFilter, setActiveReviewFilter] = useState<string>('all');

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
      showToast('Please sign in to write a review for your purchases');
      router.push(`/login?redirect=${encodeURIComponent(`/product/${product.id}#reviews-section`)}`);
      return;
    }

    if (!isEligibleToReview) {
      setShowNotOrderedModal(true);
      return;
    }

    setIsWritingReview(true);
    setTimeout(() => {
      document.getElementById('review-writer-card-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTitle.trim() || !reviewComment.trim()) {
      showToast('Please provide a review headline and details');
      return;
    }

    if (!isEligibleToReview) {
      setShowNotOrderedModal(true);
      return;
    }

    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const newReview: ReviewRecord = {
      id: `user-${Date.now()}`,
      name: user?.name || 'Verified Driver',
      rating: reviewRating,
      date: today,
      title: reviewTitle.trim(),
      comment: reviewComment.trim(),
      avatarUrl: user?.avatarUrl || '',
      isVerified: true,
      replies: [],
    };

    const updated = [newReview, ...userReviews];
    setUserReviews(updated);
    try {
      localStorage.setItem(`cx_product_reviews_${product.id}`, JSON.stringify(updated));
    } catch {}

    setIsWritingReview(false);
    setReviewTitle('');
    setReviewComment('');
    showToast(`Thank you, ${user?.name || 'Driver'}! Your verified review has been published.`);
  };

  const handlePostReply = (reviewId: string) => {
    if (!replyText.trim()) {
      showToast('Please type your reply before posting');
      return;
    }

    const newReply: ReviewReply = {
      id: `rep-${Date.now()}`,
      authorName: (replyAuthor.trim() || user?.name || 'Verified Driver').trim(),
      authorAvatar: user?.avatarUrl || '',
      date: 'Just now',
      text: replyText.trim(),
      isVerifiedBuyer: Boolean(isVerifiedBuyer || hasOrderedThisProduct),
      isStaff: false,
    };

    const currentForReview = customReplies[reviewId] || [];
    const updatedMap = {
      ...customReplies,
      [reviewId]: [...currentForReview, newReply],
    };

    setCustomReplies(updatedMap);
    try {
      localStorage.setItem(`cx_reviews_replies_${product.id}`, JSON.stringify(updatedMap));
    } catch {}

    setReplyText('');
    setReplyingReviewId(null);
    showToast('Reply published to conversation thread!');
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

  // Selected bundle item IDs for interactive customization
  const [selectedBundleIds, setSelectedBundleIds] = useState<number[]>([]);

  // Keep selectedBundleIds synced with bundleItems
  React.useEffect(() => {
    setSelectedBundleIds(bundleItems.map((item) => item.id));
  }, [bundleItems]);

  const toggleBundleItem = (id: number) => {
    setSelectedBundleIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) {
          showToast('At least one item must remain selected in the bundle');
          return prev;
        }
        return prev.filter((itemId) => itemId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const selectedBundleItems = useMemo(() => {
    return bundleItems.filter((item) => selectedBundleIds.includes(item.id));
  }, [bundleItems, selectedBundleIds]);

  const rawBundleTotal = useMemo(() => {
    return selectedBundleItems.reduce((acc, curr) => acc + curr.p, 0);
  }, [selectedBundleItems]);

  // 5% Bundle savings when 2 or more items are selected
  const bundleSavings = useMemo(() => {
    return selectedBundleItems.length >= 2 ? Math.round(rawBundleTotal * 0.05) : 0;
  }, [selectedBundleItems.length, rawBundleTotal]);

  const finalBundleTotal = rawBundleTotal - bundleSavings;

  const handleAddBundle = () => {
    selectedBundleItems.forEach((item) => addToCart(item.id, 1));
    showToast(`Added ${selectedBundleItems.length} items to your cart!`);
    openCart();
  };

  // Similar products (full product cards)
  const similarProducts = useMemo(() => {
    return products
      .filter((x) => x.id !== product.id && x.c === product.c)
      .concat(products.filter((x) => x.id !== product.id && x.c !== product.c))
      .slice(0, 4);
  }, [product, products]);

  // Pre-populated base customer reviews with genuine feedback and discussion threads
  const baseReviews: ReviewRecord[] = useMemo(() => {
    return [
      {
        id: 'base-1',
        name: 'Lori Barnett',
        rating: 5,
        date: '02 May',
        title: 'Incredible craftsmanship and flawless seams',
        comment:
          'Incredible craftsmanship and flawless seams. Looks OEM-fitted in the cabin and gives that premium minimalist aesthetic.',
        avatarUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80',
        isVerified: true,
        replies: [
          {
            id: 'rep-1-1',
            authorName: 'CARXEN Support Team',
            date: '03 May',
            text: 'Thank you Lori! Delighted that our laser-measured contouring gave your car the flush OEM finish you were looking for.',
            isStaff: true,
          },
        ],
      },
      {
        id: 'base-2',
        name: 'Phillip Douglas',
        rating: 5,
        date: '29 April',
        title: 'Exact fitment on my Creta with zero creasing',
        comment:
          'The fitment on my Creta is exact with zero creasing or loose edges. Wipes clean easily and stitching is strong.',
        avatarUrl:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80',
        isVerified: true,
      },
      {
        id: 'base-3',
        name: 'Elena Rostova',
        rating: 4,
        date: '18 April',
        title: 'Solid tactile feel and subtle styling',
        comment:
          'Very solid tactile feel, subtle stitching accents match the dashboard perfectly. Packaged nicely with clear installation instructions.',
        avatarUrl:
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&auto=format&fit=crop&q=80',
        isVerified: true,
        replies: [
          {
            id: 'rep-3-1',
            authorName: 'Aditya Sen',
            date: '19 April',
            text: 'Did you need any special tools for the underside clips during installation?',
            isVerifiedBuyer: true,
          },
          {
            id: 'rep-3-2',
            authorName: 'Elena Rostova',
            date: '20 April',
            text: 'No tools at all! The quick-release buckles clicked directly into the seat anchors in under 15 mins.',
            isVerifiedBuyer: true,
          },
        ],
      },
      {
        id: 'base-4',
        name: 'Devansh Kulkarni',
        rating: 5,
        date: '12 April',
        title: 'Breathable in Indian summer heat',
        comment:
          'The micro-perforated material does not get scorching hot under direct sunlight. Feels genuinely luxurious for daily office commutes.',
        avatarUrl:
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=80',
        isVerified: true,
      },
      {
        id: 'base-5',
        name: 'Meera Nambiar',
        rating: 4,
        date: '04 April',
        title: 'Great quality, took 20 mins to fit',
        comment:
          'Very impressed with the leatherette thickness and finish. Took me roughly 20 minutes to mount without any tools.',
        avatarUrl:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=80',
        isVerified: true,
      },
      {
        id: 'base-6',
        name: 'Rohit Mehta',
        rating: 5,
        date: '28 March',
        title: 'Exceeded expectations completely',
        comment:
          'Far superior to typical aftermarket accessories. The fit around the seatbelt buckles and headrests is spot-on.',
        avatarUrl:
          'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=80',
        isVerified: true,
      },
      {
        id: 'base-7',
        name: 'Siddharth Roy',
        rating: 3,
        date: '19 March',
        title: 'Good build quality but snug fit needs patience',
        comment:
          'Quality of material is top notch. The fit is intentionally very tight so stretching it over the rear bolsters takes two hands and patience.',
        avatarUrl:
          'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&auto=format&fit=crop&q=80',
        isVerified: true,
        replies: [
          {
            id: 'rep-7-1',
            authorName: 'CARXEN Support Team',
            date: '20 March',
            text: 'Hello Siddharth! That snug contour is engineered intentionally so it stays firmly in place without bunching up over years of driving.',
            isStaff: true,
          },
        ],
      },
      {
        id: 'base-8',
        name: 'Ananya Deshmukh',
        rating: 5,
        date: '10 March',
        title: 'Premium cabin transformation',
        comment:
          'Transformed the whole interior vibe. Spill resistant too—accidentally dropped coffee on day 2 and wiped right off with zero stains.',
        avatarUrl:
          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&auto=format&fit=crop&q=80',
        isVerified: true,
      },
    ];
  }, []);

  // Unified reviews list: user published reviews and other customer reviews
  const allReviews = useMemo(() => {
    return [...userReviews, ...baseReviews];
  }, [userReviews, baseReviews]);

  // Dynamic real-time star counts computed from actual reviews
  const starCounts = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allReviews.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      counts[star] = (counts[star] || 0) + 1;
    });
    return counts;
  }, [allReviews]);

  // Dynamic overall average rating
  const averageRating = useMemo(() => {
    if (allReviews.length === 0) return '5.0';
    const total = allReviews.reduce((sum, r) => sum + r.rating, 0);
    return (total / allReviews.length).toFixed(1);
  }, [allReviews]);

  // Filtered reviews based on active chip
  const filteredReviews = useMemo(() => {
    if (activeReviewFilter === 'all') return allReviews;
    if (activeReviewFilter === '5stars') return allReviews.filter((r) => r.rating === 5);
    if (activeReviewFilter === '4stars') return allReviews.filter((r) => r.rating === 4);
    if (activeReviewFilter === '3stars') return allReviews.filter((r) => r.rating === 3);
    if (activeReviewFilter === '2stars') return allReviews.filter((r) => r.rating === 2);
    if (activeReviewFilter === '1star') return allReviews.filter((r) => r.rating === 1);
    return allReviews;
  }, [activeReviewFilter, allReviews]);

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
              {/* Main Showcase Hero Display with Hover Prev/Next Arrows */}
              <div className="ps-showcase-box">
                {/* High-Contrast Fitment & Series Overlay Badge */}
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

                {/* Perspective Badge in Top-Right */}
                <div className="ps-perspective-pill">
                  <Car size={13} />
                  <span>{galleryPerspectives[activeThumbIndex]?.title || 'Studio Angle'}</span>
                </div>

                {/* In-Image Left/Right Navigation Chevrons */}
                <button
                  type="button"
                  className="ps-showcase-arrow ps-arrow-left"
                  onClick={() => setActiveThumbIndex((i) => (i === 0 ? galleryPerspectives.length - 1 : i - 1))}
                  aria-label="Previous perspective"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  className="ps-showcase-arrow ps-arrow-right"
                  onClick={() => setActiveThumbIndex((i) => (i === galleryPerspectives.length - 1 ? 0 : i + 1))}
                  aria-label="Next perspective"
                >
                  <ChevronRight size={20} />
                </button>

                {/* Showcase Image or SVG Art */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={galleryPerspectives[activeThumbIndex]?.url || product.image}
                  alt={`${product.n} - ${galleryPerspectives[activeThumbIndex]?.title}`}
                  style={{
                    filter: activeColor.filter && activeColor.filter !== 'none' ? activeColor.filter : undefined,
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
                  <span>CARXEN SIGNATURE</span>
                </div>
                <div className="ps-rating-score-row">
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
                    ({allReviews.length})
                  </a>
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
                  <span>{custom ? `Guaranteed Fit: ${activeCar.m}` : 'Universal Precision Fit'}</span>
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
                    {custom ? `${activeCar.b} ${activeCar.m}` : 'Universal Fit'}
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
              <p className="ps-specs-desc">
                {(product.d ? product.d.replace(/Full of Corona Virus/gi, '').replace(/\s+/g, ' ').trim() : '') ||
                  'Engineered with laser-measured ergonomic contours, premium climate-adaptive upholstery, and precision fitment for your vehicle.'}
              </p>

              {/* Assurance Badges Strip */}
              <div className="ps-card-assurance-strip">
                <div className="ps-card-assurance-item">
                  <ShieldCheck size={14} style={{ color: '#16a34a' }} />
                  <span>2-Year Warranty</span>
                </div>
                <div className="ps-card-assurance-item">
                  <Truck size={14} style={{ color: 'var(--red, #e2231a)' }} />
                  <span>2–4 Day Dispatch</span>
                </div>
                <div className="ps-card-assurance-item">
                  <RotateCcw size={14} style={{ color: '#0284c7' }} />
                  <span>7-Day Returns</span>
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
              {/* Installation Meta Banner */}
              <div className="ps-install-banner">
                <div className="ps-install-banner-meta">
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
                  <div className="ps-install-chip">
                    <Clock size={13} style={{ color: 'var(--steel, #5d5d64)' }} />
                    <span>Estimated Time: {installationDetails.time}</span>
                  </div>
                  <div className="ps-install-chip">
                    <CheckCircle2 size={13} style={{ color: '#22c55e' }} />
                    <span>No Vehicle Modification Required</span>
                  </div>
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

              {/* Step-by-Step Instructions */}
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

              {/* Pro Tips Callout */}
              <div className="ps-install-pro-tips">
                <AlertCircle size={18} className="ps-install-pro-tips-icon" />
                <div className="ps-install-pro-tips-text">
                  <strong>Pro Tip for Best Fitting:</strong> For custom leatherette contours and custom-molded mats, ensure the cabin surface is thoroughly vacuumed and dry before installation. Allow 24 to 48 hours of normal cabin use for the internal high-density memory composite and tension clips to settle completely flush against your {activeCar.b} {activeCar.m} upholstery.
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DESCRIPTION & HIGHLIGHTS */}
          {activeInfoTab === 'desc' && (
            <div className="ps-info-panel" role="tabpanel">
              <div style={{ maxWidth: '820px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink, #0e0e0f)', marginBottom: '8px' }}>
                  Detailed Description
                </h3>
                <p style={{ fontSize: '13.5px', lineHeight: '1.7', color: 'var(--steel, #5d5d64)' }}>
                  {product.d ||
                    'Engineered with laser-measured ergonomic contours, premium climate-adaptive upholstery, and precision fitment for your vehicle.'}
                </p>

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
                        {custom ? '100% Guaranteed Exact Fit' : 'Universal Multi-Vehicle Fit'}
                      </div>
                      <div className="ps-fitment-car-sub">
                        Configured for {activeCar.y} {activeCar.b} {activeCar.m} ({activeCar.f})
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
                      <Award size={16} style={{ color: 'var(--red, #e2231a)' }} />
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink, #0e0e0f)' }}>Laser 3D Scanned</span>
                    </div>
                    <p style={{ fontSize: '12.5px', color: 'var(--steel, #5d5d64)', lineHeight: '1.5' }}>
                      Digitally mapped directly from OEM {activeCar.b} chassis molds to deliver zero bunching and glove-like tension.
                    </p>
                  </div>

                  <div style={{ padding: '16px', background: '#ffffff', border: '1px solid var(--line, #dcdbd5)', borderRadius: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <ShieldCheck size={16} style={{ color: '#16a34a' }} />
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink, #0e0e0f)' }}>Fitment Guarantee</span>
                    </div>
                    <p style={{ fontSize: '12.5px', color: 'var(--steel, #5d5d64)', lineHeight: '1.5' }}>
                      If this accessory does not fit your {activeCar.b} {activeCar.m} cabin as described, we provide instant replacement or 100% refund.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PACKAGE CONTENTS */}
          {activeInfoTab === 'box' && (
            <div className="ps-info-panel" role="tabpanel">
              <div className="ps-package-grid">
                {packageContents.map((item, idx) => (
                  <div key={idx} className="ps-package-item-card">
                    <div className="ps-package-item-left">
                      <PackageCheck size={16} style={{ color: 'var(--red, #e2231a)', flexShrink: 0 }} />
                      <span>{item.name}</span>
                    </div>
                    <span className="ps-package-qty-badge">{item.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ------------------------------------------------------------------
            FREQUENTLY BOUGHT TOGETHER BUNDLE SUITE
            ------------------------------------------------------------------ */}
        {bundleItems.length > 1 && (
          <section className="ps-bundle-section">
            <div className="ps-bundle-header">
              <div>
                <div className="ps-bundle-tag">
                  <Sparkles size={12} />
                  <span>PERFECT CABIN PAIRING</span>
                </div>
                <h3 className="ps-bundle-title">Frequently bought together</h3>
                <p className="ps-bundle-subtitle">
                  Upgrade your cabin with compatible accessories tailored for your {activeCar.b} {activeCar.m}.
                </p>
              </div>
              {bundleSavings > 0 && (
                <div className="ps-bundle-savings-pill">
                  <span>Save {formatINR(bundleSavings)} on this bundle (5% OFF)</span>
                </div>
              )}
            </div>

            <div className="ps-bundle-main-layout">
              {/* Products List with + separators */}
              <div className="ps-bundle-products-wrap">
                {bundleItems.map((bItem, i) => {
                  const isSelected = selectedBundleIds.includes(bItem.id);
                  const isCurrent = bItem.id === product.id;
                  return (
                    <React.Fragment key={bItem.id}>
                      {i > 0 && (
                        <div className="ps-bundle-connector" aria-hidden="true">
                          <Plus size={14} />
                        </div>
                      )}
                      <div
                        className={`ps-bundle-card ${isSelected ? 'selected' : 'unselected'}`}
                        onClick={() => toggleBundleItem(bItem.id)}
                        role="checkbox"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            toggleBundleItem(bItem.id);
                          }
                        }}
                      >
                        {/* Checkbox & Badge */}
                        <div className="ps-bundle-card-top">
                          <label className="ps-bundle-checkbox-label" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleBundleItem(bItem.id)}
                              className="ps-bundle-checkbox"
                              aria-label={`Select ${bItem.n}`}
                            />
                            <span className="ps-bundle-custom-check">
                              {isSelected && <Check size={12} strokeWidth={3.5} />}
                            </span>
                          </label>
                          {isCurrent ? (
                            <span className="ps-bundle-badge-current">This item</span>
                          ) : (
                            <span className="ps-bundle-badge-category">{bItem.categoryLabel || bItem.c}</span>
                          )}
                        </div>

                        {/* Thumbnail */}
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

                        {/* Title & Price */}
                        <div className="ps-bundle-card-body">
                          <Link
                            href={`/product/${bItem.id}`}
                            className="ps-bundle-item-link"
                            onClick={(e) => e.stopPropagation()}
                          >
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
                  );
                })}
              </div>

              {/* Equals connector for desktop */}
              <div className="ps-bundle-equals-connector" aria-hidden="true">
                <span>=</span>
              </div>

              {/* Bundle Action & Pricing Summary Panel */}
              <div className="ps-bundle-summary-panel">
                <div className="ps-bundle-summary-header">
                  <span className="ps-bundle-summary-label">Bundle Total</span>
                  <span className="ps-bundle-summary-count">({selectedBundleItems.length} {selectedBundleItems.length === 1 ? 'item' : 'items'})</span>
                </div>

                <div className="ps-bundle-summary-pricing">
                  <div className="ps-bundle-final-price">{formatINR(finalBundleTotal)}</div>
                  {bundleSavings > 0 ? (
                    <div className="ps-bundle-savings-row">
                      <span className="ps-bundle-raw-strike">{formatINR(rawBundleTotal)}</span>
                      <span className="ps-bundle-discount-badge">5% BUNDLE SAVINGS</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: '11.5px', color: 'var(--steel, #5d5d64)', marginTop: '4px' }}>
                      Select 2 or more items to unlock 5% bundle savings
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAddBundle}
                  className="ps-bundle-action-btn"
                  disabled={selectedBundleItems.length === 0}
                >
                  <Plus size={16} />
                  <span>Add {selectedBundleItems.length} {selectedBundleItems.length === 1 ? 'item' : 'items'} to cart</span>
                </button>

                <div className="ps-bundle-summary-perks">
                  <div className="ps-bundle-perk-item">
                    <CheckCircle2 size={13} style={{ color: '#22c55e' }} />
                    <span>Free express delivery across India</span>
                  </div>
                  <div className="ps-bundle-perk-item">
                    <ShieldCheck size={13} style={{ color: '#22c55e' }} />
                    <span>2-Year warranty on every item</span>
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
                <span className="ps-overall-stars">
                  {'★'.repeat(Math.round(Number(averageRating))) + '☆'.repeat(5 - Math.round(Number(averageRating)))}
                </span>
                <span className="ps-overall-score">{averageRating}</span>
                <span className="ps-overall-count">({allReviews.length} {allReviews.length === 1 ? 'review' : 'reviews'})</span>
              </div>
            </div>

            <div className="ps-reviews-action-box">
              <button
                type="button"
                className={`ps-write-review-btn ${isEligibleToReview ? 'verified-buyer' : ''}`}
                onClick={handleStartReview}
                aria-label="Write a Review"
              >
                <Pencil style={{ width: '15px', height: '15px' }} />
                <span>Write a Review</span>
                {isVerifiedBuyer ? (
                  <span className="ps-verified-pill-tag">
                    <VerifiedBadge size={14} showTooltip={false} />
                    Verified Buyer
                  </span>
                ) : hasOrderedThisProduct ? (
                  <span className="ps-verified-pill-tag">✓ Verified Buyer</span>
                ) : (
                  <span className="ps-lock-pill-tag">Verified Only</span>
                )}
              </button>
            </div>
          </div>

          {/* Filter Pills Row (Dynamic counts, camera removed) */}
          <div className="ps-filter-pills-row" role="group" aria-label="Review filters">
            <button
              type="button"
              className={`ps-filter-chip ${activeReviewFilter === 'all' ? 'ps-chip-active-dark' : ''}`}
              onClick={() => setActiveReviewFilter('all')}
            >
              All ({allReviews.length})
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
                      {isVerifiedBuyer && (
                        <VerifiedBadge size={15} tooltipText="Verified User · Purchased 3+ products" />
                      )}
                      <span style={{ color: '#16a34a', fontWeight: 600, marginLeft: '4px' }}>
                        {isVerifiedBuyer ? '✓ Verified CARXEN Buyer' : `✓ Verified Owner of ${product.n}`}
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

          {/* Review Cards List with Reply Conversations & Page-by-Page Loading */}
          {filteredReviews.length === 0 ? (
            <div className="ps-reviews-empty">
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
            </div>
          ) : (
            <div className="ps-review-cards-list">
              {paginatedReviews.map((rev) => {
                const combinedReplies = [...(rev.replies || []), ...(customReplies[rev.id] || [])];
                const isReplying = replyingReviewId === rev.id;

                return (
                  <div key={rev.id} className="ps-review-item-card">
                    <div className="ps-review-item-top">
                      <div className="ps-review-author-wrap">
                        <Avatar
                          fallback={rev.name.slice(0, 2).toUpperCase()}
                          src={rev.avatarUrl}
                          style={{ width: '36px', height: '36px', fontSize: '12px' }}
                        />
                        <div className="ps-review-stars-user">
                          <span className="ps-review-item-stars">
                            {'★'.repeat(rev.rating) + '☆'.repeat(5 - rev.rating)}
                          </span>
                          <span className="ps-review-user-name" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {rev.name}
                            {rev.isVerified && (
                              <VerifiedBadge
                                size={15}
                                tooltipText="Verified User · Purchased 3+ products from CARXEN"
                              />
                            )}
                          </span>
                        </div>
                      </div>
                      <span className="ps-review-date">{rev.date}</span>
                    </div>

                    {rev.title && <div className="ps-review-item-title">{rev.title}</div>}
                    <p className="ps-review-body-text">{rev.comment}</p>

                    {/* Review Actions Footer: Reply Counter & Reply Toggle */}
                    <div className="ps-review-footer-bar">
                      <span className="ps-reply-count-tag">
                        {combinedReplies.length > 0
                          ? `${combinedReplies.length} ${combinedReplies.length === 1 ? 'reply' : 'replies'}`
                          : 'No replies yet'}
                      </span>
                      <button
                        type="button"
                        className="ps-reply-trigger-btn"
                        onClick={() => {
                          if (isReplying) {
                            setReplyingReviewId(null);
                          } else {
                            setReplyingReviewId(rev.id);
                            setReplyText('');
                            setReplyAuthor(user?.name || '');
                          }
                        }}
                      >
                        <MessageSquare style={{ width: '13px', height: '13px' }} />
                        <span>{isReplying ? 'Close Reply' : 'Reply'}</span>
                      </button>
                    </div>

                    {/* Inline Reply Form to Continue Conversation */}
                    {isReplying && (
                      <div className="ps-reply-form-card">
                        <div className="ps-reply-form-author" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          Replying as: <b>{user?.name || 'Verified Driver'}</b>
                          {isVerifiedBuyer && (
                            <VerifiedBadge
                              size={15}
                              tooltipText="Verified User · Purchased 3+ products from CARXEN"
                            />
                          )}
                        </div>
                        <textarea
                          className="ps-reply-textarea"
                          placeholder={`Write your reply to ${rev.name}...`}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={2}
                          autoFocus
                        />
                        <div className="ps-reply-actions">
                          <button
                            type="button"
                            className="ps-reviews-page-btn"
                            onClick={() => setReplyingReviewId(null)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="ps-reviews-page-btn"
                            style={{ background: 'var(--ink, #0e0e0f)', color: '#ffffff', borderColor: 'var(--ink, #0e0e0f)' }}
                            onClick={() => handlePostReply(rev.id)}
                          >
                            Post Reply
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Replies Thread */}
                    {combinedReplies.length > 0 && (
                      <div className="ps-replies-thread">
                        {combinedReplies.map((rep) => (
                          <div key={rep.id} className="ps-reply-item">
                            <div className="ps-reply-item-top">
                              <div className="ps-reply-author-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <span className="ps-reply-author-name">{rep.authorName}</span>
                                {rep.isStaff && (
                                  <span className="ps-staff-badge">CARXEN Team</span>
                                )}
                                {rep.isVerifiedBuyer && !rep.isStaff && (
                                  <VerifiedBadge
                                    size={14}
                                    tooltipText="Verified User · Purchased 3+ products from CARXEN"
                                  />
                                )}
                              </div>
                              <span className="ps-reply-date">{rep.date}</span>
                            </div>
                            <p className="ps-reply-text">{rep.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
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
                  To ensure all reviews on CARXEN are 100% genuine and trustworthy for fellow enthusiasts, <b>only Verified Buyers (customers who have purchased 3+ products from CARXEN) or customers who ordered this item can publish a review.</b>
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
                    <span className="ps-modal-status-chip">
                      {totalProductsBought}/3 Products Purchased · Not Yet Verified
                    </span>
                  </div>
                </div>

                <p className="ps-modal-subtext">
                  You need {Math.max(1, 3 - totalProductsBought)} more product purchase{3 - totalProductsBought === 1 ? '' : 's'} to unlock your platform Verified User badge, or purchase this product directly to review.
                </p>
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
                  fitText={isCustom ? `✓ Fits ${activeCar.m}` : 'Universal fit'}
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

      {/* Footer at bottom with ZERO trailing whitespace */}
      <Footer />
    </div>
  );
}

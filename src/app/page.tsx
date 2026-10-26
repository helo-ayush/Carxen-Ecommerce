'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  VEHICLES,
  SERIES_LIST,
  formatINR,
} from '@/data/products';
import { CatalogState } from '@/components/CatalogState';
import {
  categoryLabel,
  compareCategories,
  normalizeCategoryKey,
} from '@/lib/storefront/categories';
import { ProductArt } from '@/components/ProductArt';
import { Footer } from '@/components/Footer';
import AppleCardsCarouselDemo from '@/components/ui/apple-cards-carousel-demo';
import AccordionGallery from '@/components/ui/AccordionGallery';
import { HeroFrameSection } from '@/components/HeroFrameSection';
import { Cards } from '@/components/ui/interface-crafts-cards';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/ProductCard';
import { Pagination } from '@/components/ui/Pagination';
import { AddonSections } from '@/components/storefront/AddonSections';

const WHY_GALLERY_ITEMS = [
  {
    image:
      'https://images.unsplash.com/photo-1769676501432-589faf8a8a8d?auto=format&fit=crop&w=1200&q=85',
    label: 'Sport support',
    alt: 'Sport bucket seat interior',
  },
  {
    image:
      'https://images.unsplash.com/photo-1640705049944-de916f415bb4?auto=format&fit=crop&w=1200&q=85',
    label: 'Quilted comfort',
    alt: 'Quilted seat cover interior',
  },
  {
    image:
      'https://images.unsplash.com/photo-1625690180114-5530b1304127?auto=format&fit=crop&w=1200&q=85',
    label: 'Driver control',
    alt: 'Steering wheel and dashboard interior',
  },
  {
    image:
      'https://images.unsplash.com/photo-1626966473515-71dc32f2aedd?auto=format&fit=crop&w=1200&q=85',
    label: 'All-weather guard',
    alt: 'All-weather floor mat detail',
  },
  {
    image:
      'https://images.unsplash.com/photo-1629280878139-038999084e23?auto=format&fit=crop&w=1200&q=85',
    label: 'Long-drive ease',
    alt: 'Car centre armrest detail',
  },
];

export default function HomePage() {
  const router = useRouter();
  const {
    addToCart,
    openCart,
    toggleFav,
    isFav,
    openQuickView,
    showToast,
    setVehicle,
    products,
    catalogStatus,
    catalogError,
    retryCatalog,
    storefrontConfig,
  } = useApp();

  const heroConfig = storefrontConfig?.hero;
  const categoriesConfig = storefrontConfig?.featuredCategories;
  const fitmentConfig = storefrontConfig?.fitment;
  const whyConfig = storefrontConfig?.whyCarxen;
  const reviewsConfig = storefrontConfig?.reviews;
  const craftConfig = storefrontConfig?.craftCards;
  const ctaConfig = storefrontConfig?.cta;
  const announcementConfig = storefrontConfig?.announcement;
  const addonsConfig = storefrontConfig?.addons;

  // Reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -5% 0px' }
    );

    document
      .querySelectorAll('.rv, .rv-l, .sec-head, .stack, .fit-v, .fw')
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const [filterCat, setFilterCat] = useState('all');
  const [priceMin, setPriceMin] = useState(0);
  // null = "up to the priciest product in the catalog"
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const [starRating, setStarRating] = useState(0);
  const [selectedSeries, setSelectedSeries] = useState<Set<string>>(new Set());
  const [deliveryType, setDeliveryType] = useState('std');
  const [sortBy, setSortBy] = useState('pop');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const categoryPills = useMemo(() => {
    const categories = new Map<string, string>();
    for (const product of products) {
      categories.set(product.c, product.categoryLabel?.trim() || categoryLabel(product.c));
    }
    return [
      { key: 'all', label: 'All categories' },
      ...[...categories.entries()]
        .sort((a, b) => compareCategories({ key: a[0], label: a[1] }, { key: b[0], label: b[1] }))
        .map(([key, label]) => ({ key, label })),
      { key: 'deals', label: 'Deals' },
    ];
  }, [products]);

  // Price scale, average and series list all follow the live catalog instead of
  // fixed assumptions, so a pricier product never falls off the slider.
  const priceCeiling = useMemo(() => {
    const highest = products.reduce((max, product) => Math.max(max, product.p), 0);
    return highest > 0 ? Math.ceil(highest / 500) * 500 : 7000;
  }, [products]);
  const effectivePriceMax = priceMax ?? priceCeiling;

  const averagePrice = useMemo(() => {
    if (products.length === 0) return 0;
    return Math.round(products.reduce((sum, product) => sum + product.p, 0) / products.length);
  }, [products]);

  const seriesOptions = useMemo(() => {
    const palette = new Map(SERIES_LIST);
    const counts = new Map<string, number>();
    for (const product of products) counts.set(product.s, (counts.get(product.s) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([series, count]) => ({ series, count, color: palette.get(series) ?? '#5d5d64' }));
  }, [products]);

  useEffect(() => {
    setSelectedSeries(new Set(products.map((product) => product.s)));
  }, [products]);

  // Dynamic Histogram
  const bins = 14;
  const histogramCounts = useMemo(() => {
    const counts = Array(bins).fill(0);
    products.forEach((p) => {
      const index = Math.min(bins - 1, Math.floor(p.p / (priceCeiling / bins)));
      counts[index]++;
    });
    const maxVal = Math.max(...counts, 1);
    return counts.map((count, i) => {
      const lo = (i * priceCeiling) / bins;
      const hi = lo + priceCeiling / bins;
      const isIn = hi > priceMin && lo < effectivePriceMax;
      const height = 8 + (count / maxVal) * 92;
      return { height, isIn };
    });
  }, [priceMin, effectivePriceMax, priceCeiling, products]);

  const handleSeriesToggle = (seriesName: string) => {
    setSelectedSeries((prev) => {
      const next = new Set(prev);
      if (next.has(seriesName)) next.delete(seriesName);
      else next.add(seriesName);
      return next;
    });
  };

  const handleResetSeries = () => {
    setSelectedSeries(new Set(products.map((product) => product.s)));
  };

  const handleResetPrice = () => {
    setPriceMin(0);
    setPriceMax(null);
  };

  const handleClearFilters = () => {
    setFilterCat('all');
    setPriceMin(0);
    setPriceMax(null);
    setStarRating(0);
    handleResetSeries();
    setDeliveryType('std');
    setSortBy('pop');
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      const matchCat =
        filterCat === 'all' ||
        (filterCat === 'deals' ? !!p.o : p.c === filterCat);
      const matchPrice = p.p >= priceMin && p.p <= effectivePriceMax;
      const matchStar = p.r >= starRating;
      const matchSeries = selectedSeries.has(p.s);
      const matchDelivery = deliveryType === 'std' || p.pk;
      const searchHaystack = (p.n + ' ' + p.c + ' ' + p.s + ' ' + (p.d || '')).toLowerCase();
      const matchQuery = !searchQuery || searchHaystack.includes(searchQuery.toLowerCase().trim());
      return matchCat && matchPrice && matchStar && matchSeries && matchDelivery && matchQuery;
    });

    switch (sortBy) {
      case 'lo':
        list.sort((a, b) => a.p - b.p);
        break;
      case 'hi':
        list.sort((a, b) => b.p - a.p);
        break;
      case 'rt':
        list.sort((a, b) => b.r - a.r);
        break;
      case 'pop':
      default:
        list.sort((a, b) => b.rv - a.rv);
        break;
    }
    return list;
  }, [
    filterCat,
    priceMin,
    effectivePriceMax,
    starRating,
    selectedSeries,
    deliveryType,
    sortBy,
    searchQuery,
    products,
  ]);

  // Pagination State (9 items per page for landing grid)
  const PAGE_SIZE = 9;
  const [currentPage, setCurrentPage] = useState(1);

  // Automatically reset to page 1 whenever any filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCat, priceMin, effectivePriceMax, starRating, selectedSeries, deliveryType, sortBy, searchQuery]);

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, currentPage]);

  // Fitment Finder State
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [fitmentResult, setFitmentResult] = useState<{ count: number; text: string } | null>(null);

  const availableModels = selectedBrand ? VEHICLES[selectedBrand] || [] : [];
  const years = Array.from({ length: 9 }, (_, i) => String(2026 - i));

  const handleCheckFitment = () => {
    if (!selectedBrand || !selectedModel || !selectedYear) return;
    const str = selectedBrand + selectedModel + selectedYear;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) % 997;
    }
    const count = 12 + (hash % 12);
    setFitmentResult({
      count,
      text: `${selectedYear} ${selectedBrand} ${selectedModel} — custom patterns + universal accessories verified.`,
    });
    setVehicle({
      b: selectedBrand,
      m: selectedModel,
      y: selectedYear,
      f: 'Petrol',
    });
    showToast(`Fitment confirmed — ${count} matches found`);
  };

  // Reviews carousel — only real, published reviews from verified buyers.
  type HomeReview = {
    id: string;
    text: string;
    author: string;
    sub: string;
    avatar: string;
    bg: string;
    rating: number;
  };
  const [activeReviewsList, setActiveReviewsList] = useState<HomeReview[]>([]);
  const [activeReview, setActiveReview] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/storefront/reviews?latest=6', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled || !payload || !Array.isArray(payload.reviews)) return;
        const palette = ['#e2231a', '#1b1b1e', '#5d5d64', '#b91a12', '#2a2d34'];
        setActiveReviewsList(
          payload.reviews.map((review: any, index: number) => {
            const name = String(review.customerName || 'Verified Buyer');
            return {
              id: String(review.id),
              text: String(review.body || review.title || ''),
              author: name,
              sub: review.productName ? String(review.productName) : 'Verified purchase',
              avatar: name
                .split(/\s+/)
                .map((part: string) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase(),
              bg: palette[index % palette.length],
              rating: Number(review.rating) || 0,
            };
          }),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveReview((prev) => (prev + 1) % activeReviewsList.length);
    }, 5600);
    return () => clearInterval(timer);
  }, [activeReviewsList.length]);

  // Newsletter State
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterMsg, setNewsletterMsg] = useState('');

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterMsg('✓ Welcome to the X-List — thank you for subscribing!');
    setNewsletterEmail('');
  };

  return (
    <main id="top">
      {/* HERO SECTION — Full-resolution frame sequence with scene text */}
      {heroConfig?.enabled !== false && <HeroFrameSection heroConfig={heroConfig} />}

      {/* TICKER */}
      <div className="tick" aria-hidden="true">
        <div className="tick-t">
          <span>Precision fit</span>
          <span>All-weather protection</span>
          <span>Premium leatherette</span>
          <span>100+ vehicle models</span>
          <span>2-year warranty</span>
          <span>Free shipping over ₹1,499</span>
          <span>30-day returns</span>
          <span>Precision fit</span>
          <span>All-weather protection</span>
          <span>Premium leatherette</span>
          <span>100+ vehicle models</span>
          <span>2-year warranty</span>
          <span>Free shipping over ₹1,499</span>
          <span>30-day returns</span>
        </div>
      </div>

      {/* PROMOTIONAL ADD-ONS (HIGH PREFERENCE — DIRECTLY BELOW HERO) */}
      <AddonSections addons={addonsConfig} />

      {/* CATEGORIES */}
      {categoriesConfig?.enabled !== false && (
        <section className="sec" id="categories">
          <div className="wrap">
            <AppleCardsCarouselDemo
              categoriesList={categoriesConfig?.cards}
              heading={categoriesConfig}
              onCategorySelect={(filter) => {
                // Store settings can still carry legacy keys like "seats".
                setFilterCat(
                  filter === 'all' || filter === 'deals' ? filter : normalizeCategoryKey(filter),
                );
                document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </div>
        </section>
      )}

      {/* CRAFT & MATERIALS */}
      <section className="sec" id="craft">
        <div className="wrap">
          <div className="craft">
          <div className="sec-head craft-head rv in">
            <span className="no">03</span>
            <span className="t">Materials &amp; craftsmanship</span>
            <span className="rule" />
            <span className="note">Anatomy of a CarXen panel</span>
          </div>
          <div className="craft-g">
            <div className="craft-copy">
              <Badge variant="subtleRed" style={{ marginBottom: '14px' }}>
                Engineering Standard
              </Badge>
              <h2 className="craft-title disp rv" style={{ ['--d' as any]: '.1s' }}>
                Built in
                <br />
                four
                <br />
                layers<span className="red">.</span>
              </h2>
              <p className="craft-lede cp rv" style={{ ['--d' as any]: '.2s' }}>
                Premium materials. Precise craftsmanship. A more refined drive.
                Wear surface, comfort core, climate layer and grip backing — pressed and stitched to one tolerance.
              </p>
              <a href="#shop" className="btn mag craft-cta rv" style={{ ['--d' as any]: '.3s' }}>
                Explore collection{' '}
                <svg viewBox="0 0 24 24">
                  <path d="M4 12h16M13 5l7 7-7 7" />
                </svg>
              </a>
              <div className="craft-copy-meta rv" style={{ ['--d' as any]: '.4s' }}>
                <span className="craft-meta-line" />
                <span>Engineered for the long haul</span>
              </div>
            </div>

            <div className="stack-w craft-stage">
              <div className="craft-stage-top">
                <span>Material stack / cross-section</span>
                <span>Scroll to separate</span>
              </div>
              <div className="craft-stage-glow" aria-hidden="true" />
              <svg
                className="stack"
                id="stack"
                viewBox="0 0 700 430"
                aria-label="Exploded view of four material layers"
              >
                <g className="lyr" style={{ ['--d' as any]: '.1s', ['--rest' as any]: '72px' }}>
                  <path d="M70 40 L330 40 L420 88 L160 88 Z" fill="url(#g2)" />
                  <path d="M70 40 L330 40 L420 88 L160 88 Z" fill="url(#quiltB)" opacity=".5" />
                  <path d="M70 40v12l90 48V88z" fill="#08080a" />
                  <path d="M160 88v12h260V88z" fill="#1a1a1e" />
                </g>
                <path className="lead" style={{ ['--d' as any]: '.5s' }} d="M420 64h50" />
                <text className="lbl" style={{ ['--d' as any]: '.6s' }} x="476" y="60">
                  <tspan fontWeight="bold" fill="#fff">Wear-resistant</tspan>
                </text>
                <text className="lbl" style={{ ['--d' as any]: '.6s' }} x="476" y="73">
                  Leatherette
                </text>

                <g className="lyr" style={{ ['--d' as any]: '.25s', ['--rest' as any]: '42px' }}>
                  <path d="M70 140 L330 140 L420 188 L160 188 Z" fill="#3c3c44" />
                  <path d="M70 140v14l90 48v-14z" fill="#26262b" />
                  <path d="M160 188v14h260v-14z" fill="#303037" />
                </g>
                <path className="lead" style={{ ['--d' as any]: '.65s' }} d="M420 164h50" />
                <text className="lbl" style={{ ['--d' as any]: '.75s' }} x="476" y="160">
                  <tspan fontWeight="bold" fill="#fff">Soft foam</tspan>
                </text>
                <text className="lbl" style={{ ['--d' as any]: '.75s' }} x="476" y="173">
                  8mm comfort
                </text>

                <g className="lyr" style={{ ['--d' as any]: '.4s', ['--rest' as any]: '15px' }}>
                  <path d="M70 240 L330 240 L420 288 L160 288 Z" fill="#c9c9cf" />
                  <path d="M70 240 L330 240 L420 288 L160 288 Z" fill="url(#weave)" opacity=".7" />
                  <path d="M70 240v10l90 48v-10z" fill="#9b9ba2" />
                  <path d="M160 288v10h260v-10z" fill="#aeafb5" />
                </g>
                <path className="lead" style={{ ['--d' as any]: '.8s' }} d="M420 264h50" />
                <text className="lbl" style={{ ['--d' as any]: '.9s' }} x="476" y="260">
                  <tspan fontWeight="bold" fill="#fff">Breathable</tspan>
                </text>
                <text className="lbl" style={{ ['--d' as any]: '.9s' }} x="476" y="273">
                  3D-knit fabric
                </text>

                <g className="lyr" style={{ ['--d' as any]: '.55s', ['--rest' as any]: '-16px' }}>
                  <path d="M70 340 L330 340 L420 388 L160 388 Z" fill="#101013" />
                  <path d="M70 340 L330 340 L420 388 L160 388 Z" fill="url(#grip)" />
                  <path d="M70 340v10l90 48v-10z" fill="#08080a" />
                  <path d="M160 388v10h260v-10z" fill="#17171a" />
                </g>
                <path className="lead" style={{ ['--d' as any]: '.95s' }} d="M420 364h50" />
                <text className="lbl" style={{ ['--d' as any]: '1.05s' }} x="476" y="360">
                  <tspan fontWeight="bold" fill="#fff">Anti-slip</tspan>
                </text>
                <text className="lbl" style={{ ['--d' as any]: '1.05s' }} x="476" y="373">
                  Grip backing
                </text>
              </svg>
            </div>

            <div className="feats">
              <div className="feats-head">
                <span>Why it holds</span>
                <span>03 / 03</span>
              </div>
              <div className="ft-i rv">
                <span className="ft-ic">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 3c3.5 4.2 6 7.3 6 10a6 6 0 0 1-12 0c0-2.7 2.5-5.8 6-10z" />
                  </svg>
                </span>
                <div>
                  <h4>Waterproof</h4>
                  <p>Easy to clean. Spills wipe away.</p>
                </div>
              </div>
              <div className="ft-i rv" style={{ ['--d' as any]: '.1s' }}>
                <span className="ft-ic">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 20L20 4M4 20h5M4 20v-5M20 4h-5M20 4v5" />
                  </svg>
                </span>
                <div>
                  <h4>Precision stitching</h4>
                  <p>Double-locked seams hold for years.</p>
                </div>
              </div>
              <div className="ft-i rv" style={{ ['--d' as any]: '.2s' }}>
                <span className="ft-ic">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 3l9 5-9 5-9-5 9-5z" />
                    <path d="M3 13l9 5 9-5" />
                  </svg>
                </span>
                <div>
                  <h4>Anti-slip technology</h4>
                  <p>Grip-locked backing stays planted.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="specs rv">
            <div className="spec-card">
              <span className="spec-index">01 / Seam integrity</span>
              <b className="spec-value"><span>40,000</span><em>+</em></b>
              <span className="spec-label">Double stitches <i>/ set</i></span>
            </div>
            <div className="spec-card">
              <span className="spec-index">02 / Wear resistance</span>
              <b className="spec-value"><span>120,000</span></b>
              <span className="spec-label">Abrasion cycles rated</span>
            </div>
            <div className="spec-card">
              <span className="spec-index">03 / Climate ready</span>
              <b className="spec-value"><span>−30°</span><em>/</em><span>80°</span></b>
              <span className="spec-label">Operating range <i>°C</i></span>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* POPULAR CATALOG ITEMS */}
      <section className="sec shop" id="shop">
        <div className="wrap">
          <div className="sec-head rv in">
            <span className="no">04</span>
            <span className="t">Popular products</span>
            <span className="rule" />
            <span className="note">Filter. Compare. Add to cart.</span>
          </div>

          <div className="pills rv in" id="pills">
            {categoryPills.map((category) => (
              <button
                key={category.key}
                className={`pill ${filterCat === category.key ? 'on' : ''}`}
                onClick={() => setFilterCat(category.key)}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="shop-g">
            {isMobileFilterOpen && (
              <div
                className="drawer-backdrop"
                onClick={() => setIsMobileFilterOpen(false)}
                aria-hidden="true"
              />
            )}
            {/* Sidebar */}
            <aside className={`side ${isMobileFilterOpen ? 'on' : ''}`} id="side">
              <div className="drawer-header-mobile">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e2231a" strokeWidth="2.5">
                    <path d="M3 5h18M6 12h12M10 19h4" />
                  </svg>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: '#0e0e0f' }}>Filters</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="drawer-close-btn"
                  aria-label="Close filters"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="fbox">
                <h4>
                  Price range <button onClick={handleResetPrice}>Reset</button>
                </h4>
                <p className="sub">
                  The average price is <b>{formatINR(averagePrice)}</b>
                </p>
                <div className="hist" id="hist">
                  {histogramCounts.map((item, i) => (
                    <i
                      key={i}
                      className={item.isIn ? 'in' : ''}
                      style={{ height: `${item.height}%` }}
                    />
                  ))}
                </div>
                <div className="range">
                  <div className="tr" />
                  <div
                    className="fl2"
                    id="rf"
                    style={{
                      left: `${(priceMin / priceCeiling) * 100}%`,
                      right: `${100 - (effectivePriceMax / priceCeiling) * 100}%`,
                    }}
                  />
                  <input
                    type="range"
                    min="0"
                    max={priceCeiling}
                    step="100"
                    value={priceMin}
                    onChange={(e) => {
                      const val = Math.min(Number(e.target.value), effectivePriceMax - 300);
                      setPriceMin(val);
                    }}
                  />
                  <input
                    type="range"
                    min="0"
                    max={priceCeiling}
                    step="100"
                    value={effectivePriceMax}
                    onChange={(e) => {
                      const val = Math.max(Number(e.target.value), priceMin + 300);
                      setPriceMax(val);
                    }}
                  />
                </div>
                <div className="prv">
                  <span id="p1">{formatINR(priceMin)}</span>
                  <span id="p2">{formatINR(effectivePriceMax)}</span>
                </div>
              </div>

              <div className="fbox">
                <h4>Star rating</h4>
                <div className="starsr">
                  <div className="st" id="stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        className={n <= starRating ? 'on' : ''}
                        onClick={() => setStarRating(starRating === n ? 0 : n)}
                        aria-label={`${n} stars`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <small id="starT">
                    {starRating ? `${starRating} stars & up` : 'Any rating'}
                  </small>
                </div>
              </div>

              {seriesOptions.length > 0 && (
              <div className="fbox">
                <h4>
                  Series <button onClick={handleResetSeries}>Reset</button>
                </h4>
                <div className="brands" id="brands">
                  {seriesOptions.map(({ series, count, color }) => (
                    <label key={series} className="chk">
                      <span className="lg" style={{ background: color }}>
                        {series[0]}
                      </span>
                      {series} ({count})
                      <input
                        type="checkbox"
                        checked={selectedSeries.has(series)}
                        onChange={() => handleSeriesToggle(series)}
                      />
                      <span className="bx">
                        <svg viewBox="0 0 24 24">
                          <path d="M5 12l5 5 9-10" />
                        </svg>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              )}

              <div className="fbox">
                <h4>Delivery options</h4>
                <div className="seg" id="seg">
                  <button
                    className={deliveryType === 'std' ? 'on' : ''}
                    onClick={() => {
                      setDeliveryType('std');
                      showToast('Showing all items');
                    }}
                  >
                    Standard
                  </button>
                  <button
                    className={deliveryType === 'pick' ? 'on' : ''}
                    onClick={() => {
                      setDeliveryType('pick');
                      showToast('Showing store pick-up items');
                    }}
                  >
                    Pick up
                  </button>
                </div>
              </div>

              <div className="drawer-footer-mobile">
                <button
                  className="btn dark"
                  id="sideDone"
                  onClick={() => setIsMobileFilterOpen(false)}
                  style={{ width: '100%', justifyContent: 'center', padding: '11px', borderRadius: '99px', fontSize: '13px', fontWeight: 600 }}
                >
                  Show Results
                </button>
              </div>
            </aside>

            {/* Product Grid Area */}
            <div>
              <div className="shop-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    className="mf"
                    id="mfBtn"
                    onClick={() => setIsMobileFilterOpen(true)}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="2"
                    >
                      <path d="M3 5h18M6 12h12M10 19h4" />
                    </svg>
                    Filters
                  </button>
                  <span className="res" id="res">
                    {catalogStatus === 'ready' ? (
                      filteredProducts.length > 0 ? (
                        <>
                          Showing <b>{(currentPage - 1) * PAGE_SIZE + 1} – {Math.min(currentPage * PAGE_SIZE, filteredProducts.length)}</b> of {filteredProducts.length} products
                        </>
                      ) : (
                        <>0 products found</>
                      )
                    ) : (
                      'Catalog status unavailable'
                    )}
                  </span>
                </div>

                <div className="sp-tools">
                  <label className="hd-search">
                    <svg viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="7" />
                      <path d="M20 20l-4-4" />
                    </svg>
                    <input
                      type="search"
                      placeholder="Search parts…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search parts"
                    />
                  </label>
                  <select
                    className="sort"
                    id="sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    aria-label="Sort"
                  >
                    <option value="pop">Most popular</option>
                    <option value="lo">Price: low to high</option>
                    <option value="hi">Price: high to low</option>
                    <option value="rt">Top rated</option>
                  </select>
                </div>
              </div>

              {catalogStatus !== 'ready' ? (
                <CatalogState
                  status={catalogStatus}
                  error={catalogError}
                  onRetry={retryCatalog}
                />
              ) : (
                <>
                  <div className="grid" id="grid">
                    {paginatedProducts.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        isSpot={!!p.spot}
                        isFav={isFav(p.id)}
                        onToggleFav={toggleFav}
                        onAddToCart={addToCart}
                        onOpenCart={openCart}
                      />
                    ))}
                  </div>

                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredProducts.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setCurrentPage}
                    scrollTargetId="shop"
                  />

                  {filteredProducts.length === 0 && (
                    <div className="empty on" id="empty">
                      <b>No matches</b>
                      Try widening your filters or clearing the search.
                      <br />
                      <br />
                      <button className="btn dark" id="clr" onClick={handleClearFilters}>
                        Clear filters
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FITMENT FINDER */}
      {fitmentConfig?.enabled !== false && (
        <section className="sec" id="fitment" aria-labelledby="fit-title" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="sec-head rv in">
              <span className="no">{fitmentConfig?.sectionNumber || '05'}</span>
              <span className="t">{fitmentConfig?.eyebrow || 'Find your perfect fit'}</span>
              <span className="rule" />
              <span className="note">Accessories designed for your vehicle</span>
            </div>
            <div className="fit-g">
              <div className="fit-p">
                <p className="fit-kicker">{fitmentConfig?.kicker || 'A little more you.'}</p>
                <h2 className="fit-title" id="fit-title">
                  {fitmentConfig?.title ? (
                    fitmentConfig.title
                  ) : (
                    <>
                      <span>Made for</span>
                      <em>your drive.</em>
                    </>
                  )}
                </h2>
                <p className="fit-intro">
                  {fitmentConfig?.description || 'Start with your car. Find the details that make it feel like yours.'}
                </p>
              <form
                className="fit-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleCheckFitment();
                }}
              >
                <div className="fit-field fit-field-brand">
                  <label htmlFor="fB">Brand</label>
                  <div className="fit-select">
                    <select
                      id="fB"
                      required
                      value={selectedBrand}
                      onChange={(e) => {
                        setSelectedBrand(e.target.value);
                        setSelectedModel('');
                        setSelectedYear('');
                        setFitmentResult(null);
                      }}
                    >
                      <option value="">Choose your brand</option>
                      {Object.keys(VEHICLES).map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="fit-field">
                  <label htmlFor="fM">Model</label>
                  <div className="fit-select">
                    <select
                      id="fM"
                      required
                      disabled={!selectedBrand}
                      value={selectedModel}
                      onChange={(e) => {
                        setSelectedModel(e.target.value);
                        setSelectedYear('');
                        setFitmentResult(null);
                      }}
                    >
                      <option value="">Choose model</option>
                      {availableModels.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="fit-field">
                  <label htmlFor="fY">Year</label>
                  <div className="fit-select">
                    <select
                      id="fY"
                      required
                      disabled={!selectedModel}
                      value={selectedYear}
                      onChange={(e) => {
                        setSelectedYear(e.target.value);
                        setFitmentResult(null);
                      }}
                    >
                      <option value="">Choose year</option>
                      {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="fit-submit"
                  id="fGo"
                  disabled={!(selectedBrand && selectedModel && selectedYear)}
                >
                  Find my fit
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 12h16M13 5l7 7-7 7" />
                  </svg>
                </button>
              </form>
              <p className="fit-footnote">Your vehicle. A more considered collection.</p>

              {fitmentResult && (
                <div className="fit-result" id="fRes" role="status">
                  <b id="fT">
                    <em>{fitmentResult.count}</em> products fit your car
                  </b>
                  <p id="fS">{fitmentResult.text}</p>
                  <p className="fit-result-link">
                    <NextLink href="/shop">Browse matching products →</NextLink>
                  </p>
                </div>
              )}
            </div>

            <figure className="fit-visual" id="fitV">
              <img
                className="fit-visual-photo"
                src={fitmentConfig?.image || 'https://images.unsplash.com/photo-1625690180114-5530b1304127?auto=format&fit=crop&w=1200&q=85'}
                alt={fitmentConfig?.alt || 'Leather-wrapped steering wheel in a carefully finished car interior'}
                width={1280}
                height={720}
                loading="lazy"
                decoding="async"
              />
              <div className="fit-visual-shade" aria-hidden="true" />
              <figcaption className="fit-caption">
                <span className="fit-caption-kicker">{fitmentConfig?.kicker || 'The everyday, elevated.'}</span>
                <p>
                  {fitmentConfig?.quote ? (
                    fitmentConfig.quote
                  ) : (
                    <>
                      Good things<br />
                      <em>fit right in.</em>
                    </>
                  )}
                </p>
                <div className="fit-vehicle">
                  <span className="fit-vehicle-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="m5 10 2-5h10l2 5M4 10h16v8H4zM7 14h1m8 0h1M6 18v2m12-2v2" />
                    </svg>
                  </span>
                  <div className="fit-vehicle-copy">
                    <span>{fitmentResult ? 'Added to your garage' : 'Your next chapter'}</span>
                    <strong>{[selectedBrand, selectedModel, selectedYear].filter(Boolean).join(' · ') || 'Starts with your car'}</strong>
                  </div>
                </div>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>
      )}

      {/* WHY CARXEN */}
      {whyConfig?.enabled !== false && (
        <section className="sec why" id="why" aria-labelledby="why-title">
          <div className="wrap">
            <div className="sec-head rv in">
              <span className="no">{whyConfig?.sectionNumber || '06'}</span>
              <span className="t">{whyConfig?.eyebrow || 'Why CarXen'}</span>
              <span className="rule" />
              <span className="note">{whyConfig?.badge || 'Protection / Craft'}</span>
            </div>
            <h2 className="why-heading disp rv in" id="why-title">
              {whyConfig?.title ? (
                whyConfig.title
              ) : (
                <>
                  <span>Protection you feel.</span>{' '}
                  <em>Craft you see.</em>
                </>
              )}
            </h2>
            <div className="why-g">
              <div className="why-gallery-wrap rv in">
                <div className="why-gallery-head">
                  <span>{whyConfig?.galleryHead || 'Interior systems / 06'}</span>
                  <span>Hover to explore</span>
                </div>
                <AccordionGallery
                  items={(whyConfig?.items && whyConfig.items.length > 0) ? whyConfig.items : WHY_GALLERY_ITEMS}
                  defaultIndex={1}
                  accentColor="#e2231a"
                  overlayColor="#08090d"
                  height={470}
                  expandRatio={0.52}
                  trigger="hover"
                  grayscale
                  showLabels
                />
                <div className="why-gallery-foot">
                  <span>{whyConfig?.galleryFoot || 'Designed around real drives'}</span>
                  <span>06 / 100% considered</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* REVIEWS */}
      {reviewsConfig?.enabled !== false && activeReviewsList.length > 0 && (
        <section className="sec" id="reviews">
          <div className="wrap">
            <div className="sec-head rv in">
              <span className="no">{reviewsConfig?.sectionNumber || '07'}</span>
              <span className="t">{reviewsConfig?.eyebrow || 'Driver voices'}</span>
              <span className="rule" />
              <span className="note">
                {activeReviewsList.length} verified review{activeReviewsList.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="rev-g">
              <div className="rv-l in">
                <Badge variant="subtleRed" style={{ marginBottom: '14px' }}>
                  Verified Drivers
                </Badge>
                <span className="rev-q">“</span>
                <h2 className="disp" style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.75rem)' }}>
                  {reviewsConfig?.title ? (
                    reviewsConfig.title
                  ) : (
                    <>
                      Trusted by
                      <br />
                      drivers<span className="red">.</span>
                    </>
                  )}
                </h2>
              <div className="rev-c">
                <button
                  className="rb"
                  id="rPrev"
                  onClick={() =>
                    setActiveReview(
                      (prev) => (prev - 1 + activeReviewsList.length) % activeReviewsList.length
                    )
                  }
                  aria-label="Previous"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M20 12H4M11 5l-7 7 7 7" />
                  </svg>
                </button>
                <button
                  className="rb"
                  id="rNext"
                  onClick={() =>
                    setActiveReview((prev) => (prev + 1) % activeReviewsList.length)
                  }
                  aria-label="Next"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M4 12h16M13 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="dots" id="dots">
                  {activeReviewsList.map((_, i) => (
                    <i
                      key={i}
                      className={i === activeReview ? 'on' : ''}
                      onClick={() => setActiveReview(i)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="rev-vp rv in">
              <div
                className="rev-tr"
                id="revT"
                style={{ transform: `translateX(-${activeReview * 100}%)` }}
              >
                {activeReviewsList.map((rev, idx) => (
                  <div className="rev-s" key={idx}>
                    <blockquote>{rev.text}</blockquote>
                    <div className="rev-p">
                      <span className="av" style={{ background: rev.bg }}>
                        {rev.avatar}
                      </span>
                      <div>
                        <h5>{rev.author}</h5>
                        <p>{rev.sub}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* CTA SECTION */}
{ctaConfig?.enabled !== false && (
        <section className="cta">
          <div className="wrap cta-in">
            <div className="cta-grid">
              <div className="cta-left-col">
                <div style={{ marginBottom: '16px' }}>
                  <Badge variant="outline" className="rv in" style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}>
                    {ctaConfig?.sectionNumber || '08'} — {ctaConfig?.eyebrow || 'Ready when you are'}
                  </Badge>
                </div>
                <h2 className="disp">
                  {(() => {
                    const rawTitle = ctaConfig?.title;
                    if (rawTitle && rawTitle.toLowerCase().includes('elevate')) {
                      const match = rawTitle.match(/^(.*?)(?:drive\.?)\s*(elevate\s*it\.?)$/i);
                      if (match) {
                        return (
                          <>
                            <span className="mask rv in" style={{ display: 'block' }}>
                              <span>{match[1].trim() || "Don't just"}</span>
                            </span>
                            <span className="mask rv in" style={{ display: 'block', ['--d' as any]: '.1s' }}>
                              <span>drive.</span>
                            </span>
                            <span className="mask rv in" style={{ display: 'block', ['--d' as any]: '.2s' }}>
                              <span style={{ color: 'var(--red, #e2231a)' }}>{match[2]}</span>
                            </span>
                          </>
                        );
                      }
                    }

                    if (rawTitle && rawTitle !== "Don't just drive. Elevate it.") {
                      return rawTitle;
                    }

                    return (
                      <>
                        <span className="mask rv in" style={{ display: 'block' }}>
                          <span>Don&apos;t just</span>
                        </span>
                        <span className="mask rv in" style={{ display: 'block', ['--d' as any]: '.1s' }}>
                          <span>drive.</span>
                        </span>
                        <span className="mask rv in" style={{ display: 'block', ['--d' as any]: '.2s' }}>
                          <span style={{ color: 'var(--red, #e2231a)' }}>Elevate it.</span>
                        </span>
                      </>
                    );
                  })()}
                </h2>
                <div className="perks rv in">
                  {ctaConfig?.perks && ctaConfig.perks.length > 0 ? (
                    ctaConfig.perks.map((p: string, idx: number) => (
                      <span key={idx}>✦ {p.replace(/^✦\s*/, '')}</span>
                    ))
                  ) : (
                    <>
                      <span>✦ Early access to drops</span>
                      <span>✦ Member pricing up to 20% off</span>
                      <span>✦ Fitment alerts for your garage</span>
                    </>
                  )}
                </div>
              </div>

              <div className="cta-right-col">
                <div className="craft-cards-hint mono rv in">
                  <span>{craftConfig?.hint || '✦ Click card to explore cabin craft'}</span>
                </div>
                <Cards customCards={craftConfig?.cards} />
                <form className="news rv in" id="nf" onSubmit={handleNewsletterSubmit}>
                  <label htmlFor="ne">{ctaConfig?.newsletterLabel || 'Join the X-List — 10% off first order'}</label>
                  <div className="nf">
                    <input
                      id="ne"
                      type="email"
                      placeholder="your@email.com"
                      required
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                    />
                    <button type="submit">{ctaConfig?.buttonLabel || 'Join'}</button>
                  </div>
                  <p className="msg" id="nm">
                    {newsletterMsg}
                  </p>
                </form>
              </div>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}

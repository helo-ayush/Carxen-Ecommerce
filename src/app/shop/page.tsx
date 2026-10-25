'use client';

import React, { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  SERIES_LIST,
  CATEGORIES_LIST,
  formatINR,
  isCustomFit,
} from '@/data/products';
import { CatalogState } from '@/components/CatalogState';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { Pagination } from '@/components/ui/Pagination';
import {
  Search,
  X,
  SlidersHorizontal,
  RotateCcw,
  Layers,
  ChevronDown,
  ChevronUp,
  CarFront,
} from 'lucide-react';

// Base tags from Reference
const BASE_REFERENCE_TAGS = [
  { tag: 'Waterproof', count: 7 },
  { tag: 'Custom Fit', count: 8 },
  { tag: 'Nappa Leather', count: 6 },
  { tag: 'All-Weather', count: 3 },
  { tag: 'Anti-Slip', count: 5 },
  { tag: 'Scratch-Resistant', count: 5 },
  { tag: 'OEM Grade', count: 8 },
  { tag: 'SUV', count: 7 },
  { tag: 'Sedan', count: 5 },
  { tag: 'Breathable', count: 8 },
  { tag: 'Easy Clean', count: 11 },
];

function ShopContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const catParam = searchParams.get('cat') || 'all';
  const seriesParam = searchParams.get('series') || 'all';
  const sortParam = searchParams.get('sort') || 'pop';
  const dealsParam = searchParams.get('deals') === '1';

  const {
    car,
    addToCart,
    openCart,
    toggleFav,
    isFav,
    products,
    catalogStatus,
    catalogError,
    retryCatalog,
  } = useApp();

  // Active vehicle model of customer
  const activeCar = useMemo(() => {
    return car || { b: 'Hyundai', m: 'Creta', y: '2024', f: 'Petrol' };
  }, [car]);

  const vehicleTag = activeCar.m || 'Creta';

  const referenceTagsData = useMemo(() => {
    return [
      ...BASE_REFERENCE_TAGS,
      { tag: vehicleTag, count: 1 },
    ];
  }, [vehicleTag]);

  const [category, setCategory] = useState(catParam);
  const [fitType, setFitType] = useState<'all' | 'c' | 'u'>('all');
  const [priceTier, setPriceTier] = useState<'all' | 'lo' | 'mid' | 'hi'>('all');
  const [seriesFilter, setSeriesFilter] = useState(seriesParam);
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [sortBy, setSortBy] = useState(sortParam);
  const [dealsOnly, setDealsOnly] = useState(dealsParam);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Section collapse states
  const [expandedSections, setExpandedSections] = useState({
    tags: true,
    fit: true,
    price: true,
    series: true,
  });

  // Short vehicle model name for concise, beautiful badges on mobile and desktop
  const shortCarModel = useMemo(() => {
    const m = (activeCar.m || 'Creta').trim();
    const parts = m.split(' ').filter(Boolean);
    if (parts.length > 0 && /^\d{4}$/.test(parts[0])) {
      return parts[2] || parts[1] || parts[0];
    }
    return parts[0] || m;
  }, [activeCar.m]);

  // Smooth mouse drag-to-scroll for horizontal category pills
  const pillsRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const handlePillsMouseDown = (e: React.MouseEvent) => {
    if (!pillsRef.current) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - pillsRef.current.offsetLeft;
    scrollLeftRef.current = pillsRef.current.scrollLeft;
  };

  const handlePillsMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !pillsRef.current) return;
    e.preventDefault();
    const x = e.pageX - pillsRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    pillsRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handlePillsMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  useEffect(() => {
    setSearchQuery(queryParam);
  }, [queryParam]);

  useEffect(() => {
    setCategory(catParam);
  }, [catParam]);

  useEffect(() => {
    setSeriesFilter(seriesParam);
  }, [seriesParam]);

  useEffect(() => {
    setSortBy(sortParam);
  }, [sortParam]);

  useEffect(() => {
    setDealsOnly(dealsParam);
  }, [dealsParam]);

  useEffect(() => {
    if (!isFilterOpen) return;
    document.body.classList.add('lock');
    return () => document.body.classList.remove('lock');
  }, [isFilterOpen]);

  const handleCategorySelect = (k: string) => {
    setCategory(k);
    const params = new URLSearchParams(searchParams.toString());
    if (k === 'all') {
      params.delete('cat');
    } else {
      params.set('cat', k);
    }
    const qs = params.toString();
    router.replace(`/shop${qs ? `?${qs}` : ''}`, { scroll: false });
  };

  const handleTagSelect = (tag: string) => {
    const isCurrentlyActive = searchQuery.trim().toLowerCase() === tag.toLowerCase();
    const nextQuery = isCurrentlyActive ? '' : tag;
    setSearchQuery(nextQuery);

    const params = new URLSearchParams(searchParams.toString());
    if (nextQuery) {
      params.set('q', nextQuery);
      if (category !== 'all') {
        setCategory('all');
        params.delete('cat');
      }
    } else {
      params.delete('q');
    }
    const qs = params.toString();
    router.replace(`/shop${qs ? `?${qs}` : ''}`, { scroll: false });
  };

  const priceRanges = {
    all: [0, 1e9],
    lo: [0, 1999],
    mid: [2000, 3999],
    hi: [4000, 1e9],
  };

  const filteredProducts = useMemo(() => {
    const rawQuery = searchQuery.trim().toLowerCase();
    const tokens = rawQuery
      .replace(/^#/, '')
      .split(/\s+/)
      .map((t) => t.replace(/^#/, ''))
      .filter(Boolean);

    const list = products.filter((p) => {
      const matchCat = category === 'all' || p.c === category;
      const matchFit =
        fitType === 'all' || (fitType === 'c') === isCustomFit(p);
      const [minP, maxP] = priceRanges[priceTier];
      const matchPrice = p.p >= minP && p.p <= maxP;
      const matchSeries = seriesFilter === 'all' || p.s === seriesFilter;
      const matchDeals = !dealsOnly || Boolean(p.isCombo || (p.o && p.o > p.p));

      if (!matchCat || !matchFit || !matchPrice || !matchSeries || !matchDeals) {
        return false;
      }

      if (tokens.length === 0) return true;

      const tagsStr = Array.isArray(p.tags) ? p.tags.join(' ') : '';
      const colorsStr = Array.isArray(p.colors)
        ? p.colors.map((c) => c.name).join(' ')
        : Array.isArray(p.tintOptions)
        ? p.tintOptions.map((t) => t[0]).join(' ')
        : '';
      const specsStr = Array.isArray(p.sp) ? p.sp.map((s) => `${s[0]} ${s[1]}`).join(' ') : '';
      const fitmentStr = typeof p.fitment === 'object' && p.fitment !== null ? JSON.stringify(p.fitment) : '';

      const searchHaystack = (
        p.n + ' ' +
        p.c + ' ' +
        p.s + ' ' +
        (p.categoryLabel || '') + ' ' +
        (p.d || '') + ' ' +
        tagsStr + ' ' +
        colorsStr + ' ' +
        specsStr + ' ' +
        fitmentStr
      ).toLowerCase();

      return tokens.every((token) => searchHaystack.includes(token));
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
    category,
    fitType,
    priceTier,
    seriesFilter,
    searchQuery,
    sortBy,
    dealsOnly,
    products,
  ]);

  // Pagination State (12 items per page for shop collection)
  const PAGE_SIZE = 12;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [category, fitType, priceTier, seriesFilter, searchQuery, sortBy, dealsOnly]);

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, currentPage]);

  const hasActiveFilters =
    category !== 'all' ||
    fitType !== 'all' ||
    priceTier !== 'all' ||
    seriesFilter !== 'all' ||
    dealsOnly ||
    Boolean(searchQuery.trim());

  const activeFilterCount = [
    category !== 'all',
    fitType !== 'all',
    priceTier !== 'all',
    seriesFilter !== 'all',
    dealsOnly,
    Boolean(searchQuery.trim()),
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setCategory('all');
    setFitType('all');
    setPriceTier('all');
    setSeriesFilter('all');
    setSearchQuery('');
    setDealsOnly(false);
    router.replace('/shop', { scroll: false });
  };

  // Category items with exact icons from reference
  const CATEGORY_ITEMS = [
    {
      id: 'all',
      label: 'All Parts',
      shortLabel: 'All',
      icon: (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <rect x="3" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="3" width="7" height="7" rx="2" />
          <rect x="3" y="14" width="7" height="7" rx="2" />
          <rect x="14" y="14" width="7" height="7" rx="2" />
        </svg>
      ),
    },
    {
      id: 'seats',
      label: 'Seat Covers',
      shortLabel: 'Seats',
      icon: (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3h6a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <path d="M7 10h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z" />
        </svg>
      ),
    },
    {
      id: 'mats',
      label: 'Floor Mats',
      shortLabel: 'Mats',
      icon: (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2l-1 12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6z" />
          <path d="M8 9h8M8 12h8M8 15h8" />
        </svg>
      ),
    },
    {
      id: 'steering',
      label: 'Steering',
      shortLabel: 'Steering',
      icon: (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
        </svg>
      ),
    },
    {
      id: 'comfort',
      label: 'Comfort',
      shortLabel: 'Comfort',
      icon: (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 6c-2 0-3 2-3 5s1 5 3 5c3 0 4-2 5-2s2 2 5 2c2 0 3-2 3-5s-1-5-3-5c-3 0-4 2-5 2s-2-2-5-2z" />
          <path d="M12 10v4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="in-shop">
      {/* 1. HERO BANNER DIRECTLY BELOW NAVBAR */}
      <section className="shop-hero-banner" aria-label="Shop hero banner">
        <div className="shop-hero-bg" />
        <div className="shop-hero-overlay" />
        <div className="shop-hero-content">
          <span className="shop-hero-eyebrow">PREMIUM CAR ACCESSORIES</span>
          <h1 className="shop-hero-title">
            Made for your {activeCar.m}
            <span style={{ color: 'var(--red, #e2231a)' }}>.</span>
          </h1>
          <p className="shop-hero-subtitle">
            {filteredProducts.length} precision-fit parts compatible with your {activeCar.y ? `${activeCar.y} ` : ''}{activeCar.b} {activeCar.m}
          </p>
        </div>
      </section>

      {/* 2. MAIN SHOP SECTION */}
      <section className="shop-main-section" id="v-shop">
        <div className="shop-layout">
          {/* Mobile Filter Toggle Drawer Backdrop */}
          {isFilterOpen && (
            <div
              className="drawer-backdrop"
              onClick={() => setIsFilterOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* LEFT COLUMN: FILTERS CARD */}
          <aside className={`shop-sidebar-card ${isFilterOpen ? 'open' : ''}`} aria-label="Product filters" role={isFilterOpen ? 'dialog' : undefined} aria-modal={isFilterOpen || undefined}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div className="shop-filter-heading-actions">
                <h2 className="shop-filter-title" style={{ margin: 0, fontSize: '18px' }}>Filters</h2>
                <div className="shop-filter-actions">
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#e2231a',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Reset
                    </button>
                  )}
                  <button type="button" className="mobile-filter-close" onClick={() => setIsFilterOpen(false)} aria-label="Close filters">
                    <X size={17} />
                  </button>
                </div>
              </div>
            </div>

            {/* Section 1: Search Tags */}
            <div className="shop-filter-group">
              <button
                type="button"
                className="shop-filter-group-header"
                onClick={() => setExpandedSections((prev) => ({ ...prev, tags: !prev.tags }))}
                aria-expanded={expandedSections.tags}
              >
                <div className="shop-filter-group-title">
                  <Search style={{ width: 13, height: 13, color: '#0f172a' }} />
                  <span>Search Tags</span>
                </div>
                {expandedSections.tags ? (
                  <ChevronUp className="shop-filter-chevron" />
                ) : (
                  <ChevronDown className="shop-filter-chevron" />
                )}
              </button>
              {expandedSections.tags && (
                <div className="shop-filter-pills-wrap" style={{ gap: '5px' }}>
                  {referenceTagsData.map(({ tag, count }) => {
                    const isSelected = searchQuery.toLowerCase().trim() === tag.toLowerCase();
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagSelect(tag)}
                        className={`shop-pill-chip ${isSelected ? 'active' : ''}`}
                        title={`Filter by tag #${tag}`}
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                      >
                        <span>#{tag}</span>
                        <span className="count">({count})</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2: Fit type */}
            <div className="shop-filter-group">
              <button
                type="button"
                className="shop-filter-group-header"
                onClick={() => setExpandedSections((prev) => ({ ...prev, fit: !prev.fit }))}
                aria-expanded={expandedSections.fit}
              >
                <div className="shop-filter-group-title">
                  <CarFront style={{ width: 13, height: 13, color: '#0f172a' }} />
                  <span>Fit type</span>
                </div>
                {expandedSections.fit ? (
                  <ChevronUp className="shop-filter-chevron" />
                ) : (
                  <ChevronDown className="shop-filter-chevron" />
                )}
              </button>
              {expandedSections.fit && (
                <div className="shop-filter-pills-wrap" style={{ gap: '6px' }}>
                  <button
                    type="button"
                    className={`shop-pill-chip ${fitType === 'all' ? 'active' : ''}`}
                    onClick={() => setFitType('all')}
                    style={{ padding: '5px 13px', fontSize: '11.5px' }}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className={`shop-pill-chip ${fitType === 'c' ? 'active' : ''}`}
                    onClick={() => setFitType('c')}
                    style={{ padding: '5px 13px', fontSize: '11.5px' }}
                  >
                    Custom fit
                  </button>
                  <button
                    type="button"
                    className={`shop-pill-chip ${fitType === 'u' ? 'active' : ''}`}
                    onClick={() => setFitType('u')}
                    style={{ padding: '5px 13px', fontSize: '11.5px' }}
                  >
                    Universal
                  </button>
                </div>
              )}
            </div>

            {/* Section 3: Price */}
            <div className="shop-filter-group">
              <button
                type="button"
                className="shop-filter-group-header"
                onClick={() => setExpandedSections((prev) => ({ ...prev, price: !prev.price }))}
                aria-expanded={expandedSections.price}
              >
                <div className="shop-filter-group-title">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="#0f172a">
                    <circle cx="12" cy="12" r="10" />
                    <text x="12" y="16.5" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700" fontFamily="sans-serif">₹</text>
                  </svg>
                  <span>Price</span>
                </div>
                {expandedSections.price ? (
                  <ChevronDown className="shop-filter-chevron" />
                ) : (
                  <ChevronUp className="shop-filter-chevron" />
                )}
              </button>
              {expandedSections.price && (
                <div className="shop-filter-pills-wrap" style={{ gap: '6px' }}>
                  {[
                    ['all', 'Any'],
                    ['lo', 'Under ₹2,000'],
                    ['mid', '₹2,000 – ₹3,999'],
                    ['hi', '₹4,000+'],
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      className={`shop-pill-chip ${priceTier === val ? 'active' : ''}`}
                      onClick={() => setPriceTier(val as any)}
                      style={{ padding: '5px 13px', fontSize: '11.5px' }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Section 4: Series */}
            <div className="shop-filter-group">
              <button
                type="button"
                className="shop-filter-group-header"
                onClick={() => setExpandedSections((prev) => ({ ...prev, series: !prev.series }))}
                aria-expanded={expandedSections.series}
              >
                <div className="shop-filter-group-title">
                  <Layers style={{ width: 13, height: 13, color: '#0f172a' }} />
                  <span>Series</span>
                </div>
                {expandedSections.series ? (
                  <ChevronUp className="shop-filter-chevron" />
                ) : (
                  <ChevronDown className="shop-filter-chevron" />
                )}
              </button>
              {expandedSections.series && (
                <div className="shop-filter-pills-wrap" style={{ gap: '6px' }}>
                  <button
                    type="button"
                    className={`shop-pill-chip ${seriesFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setSeriesFilter('all')}
                    style={{ padding: '5px 13px', fontSize: '11.5px' }}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className={`shop-pill-chip ${seriesFilter === 'Signature' ? 'active' : ''}`}
                    onClick={() => setSeriesFilter('Signature')}
                    style={{ padding: '5px 13px', fontSize: '11.5px' }}
                  >
                    Signature
                  </button>
                  <button
                    type="button"
                    className={`shop-pill-chip ${seriesFilter === 'Sport' ? 'active' : ''}`}
                    onClick={() => setSeriesFilter('Sport')}
                    style={{ padding: '5px 13px', fontSize: '11.5px' }}
                  >
                    Sport
                  </button>
                </div>
              )}
            </div>
            <div className="mobile-filter-drawer-actions">
              <button type="button" className="btn dark" onClick={() => setIsFilterOpen(false)}>Apply filters</button>
              <button type="button" className="mobile-filter-reset-action" onClick={resetAllFilters}>Reset</button>
            </div>
          </aside>

          {/* RIGHT COLUMN: MAIN CONTENT */}
          <div className="shop-products-column">
            {/* TOP BAR: CATEGORY PILLS (LEFT) + SORT BY (RIGHT) */}
            <div className="shop-top-bar">
              <div className="shop-category-pills">
                {CATEGORY_ITEMS.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`shop-category-pill ${category === cat.id ? 'active' : ''}`}
                    onClick={() => handleCategorySelect(cat.id)}
                    title={cat.label}
                  >
                    <span className="shop-category-icon">{cat.icon}</span>
                    <span className="shop-cat-label-full">{cat.label}</span>
                    <span className="shop-cat-label-short">{cat.shortLabel || cat.label}</span>
                  </button>
                ))}
              </div>

              <div className="shop-sort-wrap">
                <span className="sort-label">Sort by</span>
                <div className="sort-select-container">
                  <select
                    className="shop-sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    aria-label="Sort products"
                  >
                    <option value="pop">Recommended</option>
                    <option value="lo">Price: low to high</option>
                    <option value="hi">Price: high to low</option>
                    <option value="rt">Top rated</option>
                  </select>
                  <ChevronDown className="sort-chevron" />
                </div>
              </div>
            </div>

            {/* Mobile Filter Button */}
            <div className="mobile-filter-btn-bar" style={{ display: 'none', marginBottom: '14px' }}>
              <button
                type="button"
                className="btn dark"
                onClick={() => setIsFilterOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '99px',
                  padding: '9px 18px',
                  fontSize: '13px',
                }}
              >
                <SlidersHorizontal style={{ width: 14, height: 14 }} />
                <span>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</span>
              </button>
            </div>

            {/* Active Filters Bar */}
            {hasActiveFilters && (
              <div className="active-filters-bar" style={{ marginBottom: '18px' }}>
                <span className="title">Active filters:</span>
                {category !== 'all' && (
                  <button
                    type="button"
                    className="active-filter-chip"
                    onClick={() => handleCategorySelect('all')}
                  >
                    <span>Category: {category}</span>
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                )}
                {fitType !== 'all' && (
                  <button
                    type="button"
                    className="active-filter-chip"
                    onClick={() => setFitType('all')}
                  >
                    <span>Fit: {fitType === 'c' ? 'Custom' : 'Universal'}</span>
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                )}
                {priceTier !== 'all' && (
                  <button
                    type="button"
                    className="active-filter-chip"
                    onClick={() => setPriceTier('all')}
                  >
                    <span>Price: {priceTier}</span>
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                )}

                {seriesFilter !== 'all' && (
                  <button
                    type="button"
                    className="active-filter-chip"
                    onClick={() => setSeriesFilter('all')}
                  >
                    <span>Series: {seriesFilter}</span>
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                )}
                {Boolean(searchQuery.trim()) && (
                  <button
                    type="button"
                    className="active-filter-chip"
                    onClick={() => handleTagSelect(searchQuery)}
                  >
                    <span>Search: &quot;{searchQuery}&quot;</span>
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="active-filter-reset"
                >
                  Reset all
                </button>
              </div>
            )}

            {/* PRODUCT CATALOG CONTENT */}
            {catalogStatus !== 'ready' ? (
              <CatalogState
                status={catalogStatus}
                error={catalogError}
                onRetry={retryCatalog}
              />
            ) : (
              <>
                <div className="grid" id="shop-products-grid">
                  {paginatedProducts.map((p) => {
                    const custom = isCustomFit(p);
                    return (
                      <ProductCard
                        key={p.id}
                        product={p}
                        isFav={isFav(p.id)}
                        onToggleFav={toggleFav}
                        onAddToCart={addToCart}
                        onOpenCart={openCart}
                        onTagClick={handleTagSelect}
                        fitText={custom ? `✓ Fits ${shortCarModel}` : 'Universal'}
                        isCustomFitBadge={custom}
                      />
                    );
                  })}
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredProducts.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setCurrentPage}
                  scrollTargetId="shop-products-grid"
                />

                {filteredProducts.length === 0 && (
                  <div className="empty-state-card" style={{ marginTop: '24px' }}>
                    <div className="empty-state-icon">
                      <Search />
                    </div>
                    <div className="empty-state-title">No products found</div>
                    <p className="empty-state-text">
                      No items match your active filters. Try loosening your criteria or clearing search.
                    </p>
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="btn dark"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderRadius: '99px',
                        padding: '10px 22px',
                      }}
                    >
                      <RotateCcw style={{ width: '14px', height: '14px' }} />
                      <span>Clear all filters</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="wrap sec"><p className="mono">Loading collection...</p></div>}>
      <ShopContent />
    </Suspense>
  );
}

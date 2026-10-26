'use client';

import React, { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { isCustomFit } from '@/data/products';
import {
  categoryLabel,
  compareCategories,
  isMatCategory,
  isSeatCategory,
  isSteeringCategory,
  normalizeCategoryKey,
} from '@/lib/storefront/categories';
import { fitBadgeText, fitsVehicle } from '@/lib/storefront/fitment';
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

type PriceBand = { id: string; label: string; min: number; max: number; last: boolean };

function formatPrice(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function niceStep(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(value || 1));
  for (const factor of [1, 2, 2.5, 5, 10]) {
    if (value <= factor * magnitude) return factor * magnitude;
  }
  return 10 * magnitude;
}

/**
 * Price bands come from the catalog itself — tertile cuts rounded to a tidy
 * step — so the labels always describe ranges that actually contain products.
 * Empty bands are dropped rather than offered as dead ends.
 */
function buildPriceBands(prices: number[]): PriceBand[] {
  const valid = prices.filter((price) => Number.isFinite(price));
  if (valid.length === 0) return [];

  const sorted = [...valid].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (min === max) {
    return [{ id: 'b0', label: formatPrice(min), min, max, last: true }];
  }

  const step = niceStep((max - min) / 3);
  const cuts = [min];
  for (const quantile of [1 / 3, 2 / 3]) {
    const sample = sorted[Math.min(sorted.length - 1, Math.floor(quantile * sorted.length))];
    const cut = Math.round(sample / step) * step;
    if (cut > cuts[0] && cut < max && !cuts.includes(cut)) cuts.push(cut);
  }
  cuts.push(max);
  cuts.sort((a, b) => a - b);

  const bands: PriceBand[] = [];
  for (let i = 0; i < cuts.length - 1; i += 1) {
    const bandMin = cuts[i];
    const bandMax = cuts[i + 1];
    const last = i === cuts.length - 2;
    const count = sorted.filter((price) =>
      price >= bandMin && (last ? price <= bandMax : price < bandMax),
    ).length;
    if (count === 0) continue;
    const label =
      i === 0
        ? `Under ${formatPrice(bandMax)}`
        : last
        ? `${formatPrice(bandMin)} and above`
        : `${formatPrice(bandMin)} – ${formatPrice(bandMax)}`;
    bands.push({ id: `b${bands.length}`, label, min: bandMin, max: bandMax, last });
  }
  return bands;
}

function CategoryIcon({ categoryKey }: { categoryKey: string }) {
  if (isSeatCategory(categoryKey)) {
    return (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3h6a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
        <path d="M7 10h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z" />
      </svg>
    );
  }
  if (isMatCategory(categoryKey)) {
    return (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2l-1 12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6z" />
        <path d="M8 9h8M8 12h8M8 15h8" />
      </svg>
    );
  }
  if (isSteeringCategory(categoryKey)) {
    return (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 6c-2 0-3 2-3 5s1 5 3 5c3 0 4-2 5-2s2 2 5 2c2 0 3-2 3-5s-1-5-3-5c-3 0-4 2-5 2s-2-2-5-2z" />
      <path d="M12 10v4" />
    </svg>
  );
}

const ALL_CATEGORY_ICON = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <rect x="3" y="3" width="7" height="7" rx="2" />
    <rect x="14" y="3" width="7" height="7" rx="2" />
    <rect x="3" y="14" width="7" height="7" rx="2" />
    <rect x="14" y="14" width="7" height="7" rx="2" />
  </svg>
);

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

  // Tags and their counts come from the live catalog. Category names are left
  // out because the category pills already cover them.
  const referenceTagsData = useMemo(() => {
    const categoryNames = new Set(
      products.map((product) => (product.categoryLabel || categoryLabel(product.c)).toLowerCase()),
    );
    const counts = new Map<string, { tag: string; count: number }>();

    for (const product of products) {
      for (const raw of product.tags ?? []) {
        const tag = raw.trim();
        if (!tag || tag.length > 24) continue;
        const key = tag.toLowerCase();
        if (categoryNames.has(key)) continue;
        const entry = counts.get(key);
        if (entry) entry.count += 1;
        else counts.set(key, { tag, count: 1 });
      }
    }

    const vehicleKey = vehicleTag.trim().toLowerCase();
    return [...counts.values()]
      .sort((a, b) => {
        const aIsVehicle = a.tag.toLowerCase() === vehicleKey ? 1 : 0;
        const bIsVehicle = b.tag.toLowerCase() === vehicleKey ? 1 : 0;
        if (aIsVehicle !== bIsVehicle) return bIsVehicle - aIsVehicle;
        if (b.count !== a.count) return b.count - a.count;
        return a.tag.localeCompare(b.tag);
      })
      .slice(0, 12);
  }, [products, vehicleTag]);

  const [category, setCategory] = useState(() => (catParam === 'all' ? 'all' : normalizeCategoryKey(catParam)));
  const [fitType, setFitType] = useState<'all' | 'c' | 'u'>('all');
  const [priceTier, setPriceTier] = useState<string>('all');
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

  useEffect(() => {
    setSearchQuery(queryParam);
  }, [queryParam]);

  useEffect(() => {
    setCategory(catParam === 'all' ? 'all' : normalizeCategoryKey(catParam));
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

  const priceBands = useMemo(() => buildPriceBands(products.map((product) => product.p)), [products]);
  const activePriceBand = priceBands.find((band) => band.id === priceTier);

  const seriesOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) counts.set(product.s, (counts.get(product.s) ?? 0) + 1);
    return [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
  }, [products]);

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
      const matchPrice =
        !activePriceBand ||
        (p.p >= activePriceBand.min &&
          (activePriceBand.last ? p.p <= activePriceBand.max : p.p < activePriceBand.max));
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
    activePriceBand,
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

  const categoryItems = useMemo(() => {
    const categories = new Map<string, string>();
    for (const product of products) {
      categories.set(product.c, product.categoryLabel?.trim() || categoryLabel(product.c));
    }
    return [
      { id: 'all', label: 'All Parts', shortLabel: 'All', icon: ALL_CATEGORY_ICON },
      ...[...categories.entries()]
        .sort((a, b) => compareCategories({ key: a[0], label: a[1] }, { key: b[0], label: b[1] }))
        .map(([id, label]) => ({ id, label, shortLabel: label, icon: <CategoryIcon categoryKey={id} /> })),
    ];
  }, [products]);

  const activeCategoryLabel =
    categoryItems.find((item) => item.id === category)?.label ?? categoryLabel(category);

  const vehicleLabel =
    `${activeCar.y ? `${activeCar.y} ` : ''}${activeCar.b} ${activeCar.m}`.replace(/\s+/g, ' ').trim();

  // Only products that are universal or actually built for this vehicle count
  // as a fit — the collection can also hold parts for other cars.
  const fitCount = useMemo(
    () => filteredProducts.filter((product) => fitsVehicle(product, activeCar)).length,
    [filteredProducts, activeCar],
  );

  // While a search is active the results list gets shorter. Without a floor the
  // document shrinks past the scroll position and the browser clamps it, which
  // looks like the page scrolling by itself on every keystroke. Hold the
  // pre-search height until the query is cleared.
  const resultsColumnRef = useRef<HTMLDivElement>(null);
  const stableResultsHeightRef = useRef(0);
  const isSearching = Boolean(searchQuery.trim());

  useEffect(() => {
    if (isSearching) return;
    const column = resultsColumnRef.current;
    if (column) stableResultsHeightRef.current = column.offsetHeight;
  }, [isSearching, filteredProducts.length, category, fitType, priceTier, seriesFilter, products.length]);
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
            {filteredProducts.length === 0
              ? 'No parts match these filters'
              : fitCount === filteredProducts.length
              ? `${fitCount} precision-fit parts for your ${vehicleLabel}`
              : `${fitCount} of ${filteredProducts.length} parts fit your ${vehicleLabel}`}
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
            <div className="shop-filter-header-bar">
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

            <div className="shop-filter-groups-scroll">
              {/* Section 1: Search Tags */}
            {referenceTagsData.length > 0 && (
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
            )}

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
                  <ChevronUp className="shop-filter-chevron" />
                ) : (
                  <ChevronDown className="shop-filter-chevron" />
                )}
              </button>
              {expandedSections.price && (
                <div className="shop-filter-pills-wrap" style={{ gap: '6px' }}>
                  <button
                    type="button"
                    className={`shop-pill-chip ${priceTier === 'all' ? 'active' : ''}`}
                    onClick={() => setPriceTier('all')}
                    style={{ padding: '5px 13px', fontSize: '11.5px' }}
                  >
                    Any
                  </button>
                  {priceBands.map((band) => (
                    <button
                      key={band.id}
                      type="button"
                      className={`shop-pill-chip ${priceTier === band.id ? 'active' : ''}`}
                      onClick={() => setPriceTier(band.id)}
                      style={{ padding: '5px 13px', fontSize: '11.5px' }}
                    >
                      {band.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Section 4: Series */}
            {seriesOptions.length > 1 && (
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
                  {seriesOptions.map(([series, count]) => (
                    <button
                      key={series}
                      type="button"
                      className={`shop-pill-chip ${seriesFilter === series ? 'active' : ''}`}
                      onClick={() => setSeriesFilter(series)}
                      style={{ padding: '5px 13px', fontSize: '11.5px' }}
                    >
                      <span>{series}</span>
                      <span className="count">({count})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            )}
            </div>
            <div className="mobile-filter-drawer-actions">
              <button type="button" className="btn dark" onClick={() => setIsFilterOpen(false)}>Apply filters</button>
              <button type="button" className="mobile-filter-reset-action" onClick={resetAllFilters}>Reset</button>
            </div>
          </aside>

          {/* RIGHT COLUMN: MAIN CONTENT */}
          <div
            className="shop-products-column"
            ref={resultsColumnRef}
            style={
              isSearching && stableResultsHeightRef.current > 0
                ? { minHeight: stableResultsHeightRef.current }
                : undefined
            }
          >
            {/* TOP BAR: CATEGORY PILLS (LEFT) + SORT BY (RIGHT) */}
            <div className="shop-top-bar">
              <div className="shop-category-pills">
                {categoryItems.map((cat) => (
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
                    <span>Category: {activeCategoryLabel}</span>
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
                    <span>Price: {activePriceBand?.label ?? 'Any'}</span>
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
                        fitText={fitBadgeText(p, activeCar)}
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

'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  SERIES_LIST,
  CATEGORIES_LIST,
  DEFAULT_PRESET_TAGS,
  formatINR,
  isCustomFit,
} from '@/data/products';
import { CatalogState } from '@/components/CatalogState';
import { ProductArt } from '@/components/ProductArt';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/ProductCard';
import { Pagination } from '@/components/ui/Pagination';
import { Search, X, SlidersHorizontal, RotateCcw, Tag as TagIcon, Sparkles, CarFront } from 'lucide-react';

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
    setVehicle,
    addToCart,
    openCart,
    toggleFav,
    isFav,
    products,
    catalogStatus,
    catalogError,
    retryCatalog,
  } = useApp();

  // Ensure default vehicle if none set
  const activeCar = useMemo(() => {
    return car || { b: 'Hyundai', m: 'Creta', y: '2024', f: 'Petrol' };
  }, [car]);

  const [category, setCategory] = useState(catParam);
  const [fitType, setFitType] = useState<'all' | 'c' | 'u'>('all');
  const [priceTier, setPriceTier] = useState<'all' | 'lo' | 'mid' | 'hi'>('all');
  const [ratingFilter, setRatingFilter] = useState(false);
  const [seriesFilter, setSeriesFilter] = useState(seriesParam);
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [sortBy, setSortBy] = useState(sortParam);
  const [dealsOnly, setDealsOnly] = useState(dealsParam);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

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

  const allStoreTags = useMemo(() => {
    const set = new Set<string>(DEFAULT_PRESET_TAGS);
    products.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => {
          if (typeof t === 'string' && t.trim()) set.add(t.trim());
        });
      }
    });
    return Array.from(set);
  }, [products]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => {
          if (typeof t === 'string' && t.trim()) {
            counts[t.trim()] = (counts[t.trim()] || 0) + 1;
          }
        });
      }
    });
    return counts;
  }, [products]);

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
      // When clicking a tag, search across all categories by default so user sees all items
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

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    const params = new URLSearchParams(searchParams.toString());
    if (val.trim()) {
      params.set('q', val.trim());
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
      const matchRating = !ratingFilter || p.r >= 4.6;
      const matchSeries = seriesFilter === 'all' || p.s === seriesFilter;
      const matchDeals = !dealsOnly || Boolean(p.isCombo || (p.o && p.o > p.p));

      if (!matchCat || !matchFit || !matchPrice || !matchRating || !matchSeries || !matchDeals) {
        return false;
      }

      if (tokens.length === 0) return true;

      const tagsStr = Array.isArray(p.tags) ? p.tags.join(' ') : '';
      const colorsStr = Array.isArray(p.colors)
        ? p.colors.map((c) => c.name).join(' ')
        : (Array.isArray(p.tintOptions) ? p.tintOptions.map((t) => t[0]).join(' ') : '');
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
    ratingFilter,
    seriesFilter,
    searchQuery,
    sortBy,
    dealsOnly,
    products,
  ]);

  // If a category was chosen but produces 0 results, find if other categories have matches
  const crossCategoryMatches = useMemo(() => {
    if (category === 'all' || !searchQuery.trim()) return [];
    const rawQuery = searchQuery.trim().toLowerCase();
    const tokens = rawQuery
      .replace(/^#/, '')
      .split(/\s+/)
      .map((t) => t.replace(/^#/, ''))
      .filter(Boolean);
    if (tokens.length === 0) return [];

    return products.filter((p) => {
      const tagsStr = Array.isArray(p.tags) ? p.tags.join(' ') : '';
      const colorsStr = Array.isArray(p.colors)
        ? p.colors.map((c) => c.name).join(' ')
        : (Array.isArray(p.tintOptions) ? p.tintOptions.map((t) => t[0]).join(' ') : '');
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
  }, [category, searchQuery, products]);

  // Pagination State (12 items per page for shop collection)
  const PAGE_SIZE = 12;
  const [currentPage, setCurrentPage] = useState(1);

  // Automatically reset to page 1 whenever any filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [category, fitType, priceTier, ratingFilter, seriesFilter, searchQuery, sortBy, dealsOnly]);

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, currentPage]);

  const hasActiveFilters =
    category !== 'all' ||
    fitType !== 'all' ||
    priceTier !== 'all' ||
    ratingFilter ||
    seriesFilter !== 'all' ||
    dealsOnly ||
    Boolean(searchQuery.trim());

  const resetAllFilters = () => {
    setCategory('all');
    setFitType('all');
    setPriceTier('all');
    setRatingFilter(false);
    setSeriesFilter('all');
    setSearchQuery('');
    setDealsOnly(false);
    router.replace('/shop', { scroll: false });
  };

  return (
    <div className="in-shop">
      <section className="sp on" id="v-shop">
        <div className="wrap">
          <div className="sp-h">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h1 className="disp" id="spT" style={{ margin: 0 }}>
                  Made for your {activeCar.m}
                  <span className="red">.</span>
                </h1>
                <Link
                  href="/account?tab=garage"
                  className="sp-change-vehicle-btn"
                  title="Change vehicle or add new car in My Garage"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: '20px',
                    background: '#f4f4f5',
                    border: '1px solid #e4e4e7',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#0e0e0f',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <CarFront style={{ width: '13px', height: '13px', color: '#e2231a' }} />
                  <span>Change vehicle</span>
                  <span style={{ fontSize: '11px', color: '#71717a' }}>&rarr;</span>
                </Link>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--steel, #8c8b86)' }}>
                {filteredProducts.length} precision-fit parts compatible with your {activeCar.y} {activeCar.b} {activeCar.m}
              </p>
            </div>
            <div className="sp-tools">
              <label className="hd-search">
                <svg viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-4-4" />
                </svg>
                <input
                  type="search"
                  placeholder="Search by name, tags (e.g. Waterproof, Nappa)…"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  aria-label="Search parts and tags"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="hd-search-clear"
                    onClick={() => handleSearchChange('')}
                    aria-label="Clear search"
                  >
                    <X style={{ width: '13px', height: '13px' }} />
                  </button>
                )}
              </label>
              <button
                type="button"
                className="sf-t"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                aria-label="Toggle filters"
              >
                <SlidersHorizontal style={{ width: '14px', height: '14px' }} />
                <span>Filters</span>
                {hasActiveFilters && <span className="sf-badge" />}
              </button>
              <select
                className="sort"
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

          <div className="pills">
            {CATEGORIES_LIST.map(([k, label]) => (
              <button
                key={k}
                className={`pill ${category === k ? 'on' : ''}`}
                onClick={() => handleCategorySelect(k)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search Help & Popular Tags */}
          <div className="search-help-bar">
            <div className="search-help-label">
              <TagIcon style={{ width: '13px', height: '13px' }} />
              <span>Search Help & Tags:</span>
            </div>
            <div className="search-help-tags">
              {allStoreTags.map((tag) => {
                const isSelected =
                  searchQuery.toLowerCase().trim() === tag.toLowerCase();
                const count = tagCounts[tag] ?? 0;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagSelect(tag)}
                    className={`search-tag-chip ${isSelected ? 'active' : ''}`}
                    title={`Search parts with tag #${tag}`}
                  >
                    <span>#{tag}</span>
                    {count > 0 && <span className="chip-count">({count})</span>}
                    {isSelected && <X style={{ width: '11px', height: '11px', marginLeft: '2px' }} />}
                  </button>
                );
              })}
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="search-tag-clear"
                >
                  Clear search
                </button>
              )}
            </div>
          </div>

          <div className="shop-g">
            {isFilterOpen && (
              <div
                className="drawer-backdrop"
                onClick={() => setIsFilterOpen(false)}
                aria-hidden="true"
              />
            )}
            <div className={`sp-f ${isFilterOpen ? 'open' : ''}`}>
              <div className="drawer-header-mobile">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SlidersHorizontal style={{ width: '15px', height: '15px', color: '#e2231a' }} />
                  <span style={{ fontWeight: 700, fontSize: '15px', color: '#0e0e0f' }}>Filters</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      style={{ fontSize: '12px', color: '#e2231a', fontWeight: 600 }}
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(false)}
                    className="drawer-close-btn"
                    aria-label="Close filters"
                  >
                    <X style={{ width: '16px', height: '16px' }} />
                  </button>
                </div>
              </div>

              <div className="drawer-scroll-body">
                <div className="fbox">
                  <h4>Fit type</h4>
                  <div className="sp-cs">
                    <button
                      className={`pill ${fitType === 'all' ? 'on' : ''}`}
                      onClick={() => setFitType('all')}
                    >
                      All
                    </button>
                    <button
                      className={`pill ${fitType === 'c' ? 'on' : ''}`}
                      onClick={() => setFitType('c')}
                    >
                      Custom fit
                    </button>
                    <button
                      className={`pill ${fitType === 'u' ? 'on' : ''}`}
                      onClick={() => setFitType('u')}
                    >
                      Universal
                    </button>
                  </div>
                </div>

                <div className="fbox">
                  <h4>Price</h4>
                  <div className="sp-cs">
                    {[
                      ['all', 'Any'],
                      ['lo', 'Under ₹2,000'],
                      ['mid', '₹2,000 – ₹3,999'],
                      ['hi', '₹4,000 +'],
                    ].map(([val, label]) => (
                      <button
                        key={val}
                        className={`pill ${priceTier === val ? 'on' : ''}`}
                        onClick={() => setPriceTier(val as any)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="fbox">
                  <h4>Rating</h4>
                  <div className="sp-cs">
                    <button
                      className={`pill ${ratingFilter ? 'on' : ''}`}
                      onClick={() => setRatingFilter(!ratingFilter)}
                    >
                      4.6★ &amp; up
                    </button>
                  </div>
                </div>

                <div className="fbox">
                  <h4>Series</h4>
                  <div className="sp-cs">
                    {['all', ...SERIES_LIST.map((s) => s[0])].map((s) => (
                      <button
                        key={s}
                        className={`pill ${seriesFilter === s ? 'on' : ''}`}
                        onClick={() => setSeriesFilter(s)}
                      >
                        {s === 'all' ? 'All' : s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="drawer-footer-mobile">
                <button
                  type="button"
                  className="btn dark"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '11px',
                    borderRadius: '99px',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                  onClick={() => setIsFilterOpen(false)}
                >
                  Show {filteredProducts.length} Results
                </button>
              </div>
            </div>

            <div>
              {catalogStatus !== 'ready' ? (
                <CatalogState
                  status={catalogStatus}
                  error={catalogError}
                  onRetry={retryCatalog}
                />
              ) : (
                <>
                  {hasActiveFilters && (
                    <div className="active-filters-bar">
                      <span className="title">Active filters:</span>
                      {category !== 'all' && (
                        <button
                          type="button"
                          className="active-filter-chip"
                          onClick={() => setCategory('all')}
                        >
                          <span>Category: {category}</span>
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {fitType !== 'all' && (
                        <button
                          type="button"
                          className="active-filter-chip"
                          onClick={() => setFitType('all')}
                        >
                          <span>Fit: {fitType === 'c' ? 'Custom' : 'Universal'}</span>
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {priceTier !== 'all' && (
                        <button
                          type="button"
                          className="active-filter-chip"
                          onClick={() => setPriceTier('all')}
                        >
                          <span>Price: {priceTier}</span>
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {ratingFilter && (
                        <button
                          type="button"
                          className="active-filter-chip"
                          onClick={() => setRatingFilter(false)}
                        >
                          <span>Rating: 4.6★+</span>
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {seriesFilter !== 'all' && (
                        <button
                          type="button"
                          className="active-filter-chip"
                          onClick={() => setSeriesFilter('all')}
                        >
                          <span>Series: {seriesFilter}</span>
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {dealsOnly && (
                        <button
                          type="button"
                          className="active-filter-chip"
                          onClick={() => {
                            setDealsOnly(false);
                            const params = new URLSearchParams(searchParams.toString());
                            params.delete('deals');
                            const qs = params.toString();
                            router.replace(`/shop${qs ? `?${qs}` : ''}`, { scroll: false });
                          }}
                        >
                          <span>Combos & Deals</span>
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {Boolean(searchQuery.trim()) && (
                        <button
                          type="button"
                          className="active-filter-chip"
                          onClick={() => setSearchQuery('')}
                        >
                          <span>Search: &quot;{searchQuery}&quot;</span>
                          <X className="w-3 h-3" />
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

                  {/* Cross-Category Search Match Prompt */}
                  {crossCategoryMatches.length > 0 && filteredProducts.length === 0 && (
                    <div className="cross-cat-notice">
                      <div className="cross-cat-notice-text">
                        No products in <strong>{CATEGORIES_LIST.find((c) => c[0] === category)?.[1] || category}</strong> match &quot;<strong>{searchQuery}</strong>&quot;, but <strong>{crossCategoryMatches.length} matching products</strong> exist in other categories.
                      </div>
                      <button
                        type="button"
                        className="cross-cat-notice-btn"
                        onClick={() => handleCategorySelect('all')}
                      >
                        <Sparkles style={{ width: '13px', height: '13px' }} />
                        <span>Search all categories ({crossCategoryMatches.length})</span>
                      </button>
                    </div>
                  )}

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
                          fitText={custom ? `✓ Fits ${activeCar.m}` : 'Universal fit'}
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
                    <div className="empty-state-card">
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
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '99px', padding: '10px 22px' }}
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

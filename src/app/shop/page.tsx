'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  SERIES_LIST,
  CATEGORIES_LIST,
  formatINR,
  isCustomFit,
} from '@/data/products';
import { CatalogState } from '@/components/CatalogState';
import { ProductArt } from '@/components/ProductArt';
import { Footer } from '@/components/Footer';

function ShopContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const catParam = searchParams.get('cat') || 'all';

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
  const [seriesFilter, setSeriesFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [sortBy, setSortBy] = useState('pop');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    if (queryParam) setSearchQuery(queryParam);
  }, [queryParam]);

  useEffect(() => {
    if (catParam) setCategory(catParam);
  }, [catParam]);

  const priceRanges = {
    all: [0, 1e9],
    lo: [0, 1999],
    mid: [2000, 3999],
    hi: [4000, 1e9],
  };

  const filteredProducts = useMemo(() => {
    const list = products.filter((p) => {
      const matchCat = category === 'all' || p.c === category;
      const matchFit =
        fitType === 'all' || (fitType === 'c') === isCustomFit(p);
      const [minP, maxP] = priceRanges[priceTier];
      const matchPrice = p.p >= minP && p.p <= maxP;
      const matchRating = !ratingFilter || p.r >= 4.6;
      const matchSeries = seriesFilter === 'all' || p.s === seriesFilter;
      const matchQuery =
        !searchQuery ||
        (p.n + ' ' + p.c + ' ' + p.s).toLowerCase().includes(searchQuery.toLowerCase());
      return (
        matchCat &&
        matchFit &&
        matchPrice &&
        matchRating &&
        matchSeries &&
        matchQuery
      );
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
    products,
  ]);

  return (
    <div className="in-shop">
      <section className="sp on" id="v-shop">
        <div className="sp-bar">
          <div className="wrap">
            <div className="sp-car">
              <i />
              <span>
                {activeCar.y} {activeCar.b} {activeCar.m} · {activeCar.f}
              </span>
            </div>
            <Link href="/garage" className="ch">
              Change vehicle
            </Link>
            <span className="sp-ct">
              {filteredProducts.length} parts for your {activeCar.m}
            </span>
          </div>
        </div>

        <div className="wrap">
          <div className="sp-h">
            <h1 className="disp" id="spT">
              Made for your {activeCar.m}
              <span className="red">.</span>
            </h1>
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
              <button
                className="sf-t"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                Filters
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
                onClick={() => setCategory(k)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="shop-g">
            <div className={`sp-f ${isFilterOpen ? 'open' : ''}`}>
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

            <div>
              {catalogStatus !== 'ready' ? (
                <CatalogState
                  status={catalogStatus}
                  error={catalogError}
                  onRetry={retryCatalog}
                />
              ) : (
                <>
                  <div className="grid">
                    {filteredProducts.map((p) => {
                      const custom = isCustomFit(p);
                      return (
                        <article key={p.id} className="pc">
                          <div
                            className="pm"
                            onClick={() => router.push(`/product/${p.id}`)}
                          >
                            <ProductArt product={p} />
                            <span className={`fitb ${custom ? '' : 'u'}`}>
                              {custom ? `✓ Fits your ${activeCar.m}` : 'Universal fit'}
                            </span>
                            <span className="qv">View details</span>
                            {p.top && <span className="top-b">Top item</span>}
                            {p.nw && <span className="top-b new-b">New</span>}
                          </div>

                          <button
                            className={`hrt ${isFav(p.id) ? 'on' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFav(p.id);
                            }}
                            aria-label="Favourite"
                          >
                            <svg viewBox="0 0 24 24">
                              <path d="M12 20s-7-4.6-9-9A5.2 5.2 0 0 1 12 6.4 5.2 5.2 0 0 1 21 11c-2 4.4-9 9-9 9z" />
                            </svg>
                          </button>

                          <div className="pi">
                            <h3 onClick={() => router.push(`/product/${p.id}`)}>
                              {p.n}
                            </h3>
                            <div className="rt">
                              <b>★</b> {p.r} · {p.rv} reviews
                            </div>
                            <div className="pr">
                              {p.o && <s>{formatINR(p.o)}</s>}
                              <button
                                className="buy"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(p.id, 1);
                                  openCart();
                                }}
                              >
                                <svg viewBox="0 0 24 24">
                                  <path d="M6 8h12l1 12H5L6 8z" />
                                  <path d="M9 8V6a3 3 0 0 1 6 0v2" />
                                </svg>
                                {formatINR(p.p)}
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {filteredProducts.length === 0 && (
                    <div className="empty on">
                      <b>No matches</b>
                      Try widening your filters or clearing the search.
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

'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/navigation';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  VEHICLES,
  SERIES_LIST,
  formatINR,
} from '@/data/products';
import { CatalogState } from '@/components/CatalogState';
import { ProductArt } from '@/components/ProductArt';
import { Footer } from '@/components/Footer';
import AppleCardsCarouselDemo from '@/components/ui/apple-cards-carousel-demo';
import AccordionGallery from '@/components/ui/AccordionGallery';
import { HeroFrameSection } from '@/components/HeroFrameSection';
import { Cards } from '@/components/ui/interface-crafts-cards';

const WHY_GALLERY_ITEMS = [
  { image: '/sports-bucket.jpg', label: 'Sport support', alt: 'Sport bucket seat interior' },
  { image: '/head-rest.jpg', label: 'Quilted comfort', alt: 'Quilted seat cover interior' },
  { image: '/steering.jpg', label: 'Driver control', alt: 'Steering wheel and dashboard interior' },
  { image: '/floor-mat.jpg', label: 'All-weather guard', alt: 'All-weather floor mat detail' },
  { image: '/hand-rest.jpg', label: 'Long-drive ease', alt: 'Car centre armrest detail' },
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
  } = useApp();

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

  // Shop Filters State
  const [filterCat, setFilterCat] = useState('all');
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(7000);
  const [starRating, setStarRating] = useState(4);
  const [selectedSeries, setSelectedSeries] = useState<Set<string>>(
    new Set(['Signature', 'Sport', 'Urban', 'Essentials'])
  );
  const [deliveryType, setDeliveryType] = useState('std');
  const [sortBy, setSortBy] = useState('pop');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Dynamic Histogram
  const bins = 14;
  const bmax = 7000;
  const histogramCounts = useMemo(() => {
    const counts = Array(bins).fill(0);
    products.forEach((p) => {
      const index = Math.min(bins - 1, Math.floor(p.p / (bmax / bins)));
      counts[index]++;
    });
    const maxVal = Math.max(...counts, 1);
    return counts.map((count, i) => {
      const lo = (i * bmax) / bins;
      const hi = lo + bmax / bins;
      const isIn = hi > priceMin && lo < priceMax;
      const height = 8 + (count / maxVal) * 92;
      return { height, isIn };
    });
  }, [priceMin, priceMax, products]);

  const handleSeriesToggle = (seriesName: string) => {
    setSelectedSeries((prev) => {
      const next = new Set(prev);
      if (next.has(seriesName)) next.delete(seriesName);
      else next.add(seriesName);
      return next;
    });
  };

  const handleResetSeries = () => {
    setSelectedSeries(new Set(['Signature', 'Sport', 'Urban', 'Essentials']));
  };

  const handleResetPrice = () => {
    setPriceMin(0);
    setPriceMax(7000);
  };

  const handleClearFilters = () => {
    setFilterCat('all');
    setPriceMin(0);
    setPriceMax(7000);
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
      const matchPrice = p.p >= priceMin && p.p <= priceMax;
      const matchStar = p.r >= starRating;
      const matchSeries = selectedSeries.has(p.s);
      const matchDelivery = deliveryType === 'std' || p.pk;
      return matchCat && matchPrice && matchStar && matchSeries && matchDelivery;
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
    priceMax,
    starRating,
    selectedSeries,
    deliveryType,
    sortBy,
    products,
  ]);

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

  // Reviews Carousel
  const reviews = [
    {
      text: (
        <>
          The seat covers fit my Creta like they came from the factory. Stitching is genuinely{' '}
          <b>better than the dealership</b> offered at triple the price.
        </>
      ),
      author: 'Arjun Rao',
      sub: 'Hyundai Creta — Bengaluru',
      avatar: 'AR',
      bg: '#e2231a',
    },
    {
      text: (
        <>
          Ordered mats before monsoon. Mud, rain, spilled chai — it all{' '}
          <b>just wipes off</b>. Zero slip, perfect fit.
        </>
      ),
      author: 'Priya Kapoor',
      sub: 'Tata Nexon — Gurugram',
      avatar: 'PK',
      bg: '#1b1b1e',
    },
    {
      text: (
        <>
          The steering cover <b>transformed my commute</b>. Grip is phenomenal and the red accent gets noticed by everyone who sits inside.
        </>
      ),
      author: 'Vikram Mehta',
      sub: 'Mahindra Thar — Pune',
      avatar: 'VM',
      bg: '#5d5d64',
    },
  ];
  const [activeReview, setActiveReview] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveReview((prev) => (prev + 1) % reviews.length);
    }, 5600);
    return () => clearInterval(timer);
  }, [reviews.length]);

  // Newsletter State
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterMsg, setNewsletterMsg] = useState('');

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterMsg('✓ Welcome to the X-List — 10% coupon code CARXEN10 unlocked.');
    setNewsletterEmail('');
  };

  return (
    <main id="top">
      {/* HERO SECTION — Full-resolution frame sequence with scene text */}
      <HeroFrameSection />

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

      {/* CATEGORIES */}
      <section className="sec" id="categories">
        <div className="wrap">
          <AppleCardsCarouselDemo
            onCategorySelect={(filter) => {
              setFilterCat(filter);
              document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        </div>
      </section>

      {/* CRAFT & MATERIALS */}
      <section className="sec craft" id="craft">
        <div className="wrap">
          <div className="sec-head craft-head rv in">
            <span className="no">03</span>
            <span className="t">Materials &amp; craftsmanship</span>
            <span className="rule" />
            <span className="note">Anatomy of a CarXen panel</span>
          </div>
          <div className="craft-g">
            <div className="craft-copy">
              <p className="craft-eyebrow mono red rv">Details that drive difference</p>
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
            {[
              ['all', 'All categories'],
              ['seats', 'Seat covers'],
              ['mats', 'Floor mats'],
              ['steering', 'Steering'],
              ['comfort', 'Comfort'],
              ['deals', 'Deals'],
            ].map(([c, label]) => (
              <button
                key={c}
                className={`pill ${filterCat === c ? 'on' : ''}`}
                onClick={() => setFilterCat(c)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="shop-g">
            {/* Sidebar */}
            <aside className={`side ${isMobileFilterOpen ? 'on' : ''}`} id="side">
              <div className="fbox">
                <h4>
                  Price range <button onClick={handleResetPrice}>Reset</button>
                </h4>
                <p className="sub">
                  The average price is <b>₹2,400</b>
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
                      left: `${priceMin / 70}%`,
                      right: `${100 - priceMax / 70}%`,
                    }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="7000"
                    step="100"
                    value={priceMin}
                    onChange={(e) => {
                      const val = Math.min(Number(e.target.value), priceMax - 300);
                      setPriceMin(val);
                    }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="7000"
                    step="100"
                    value={priceMax}
                    onChange={(e) => {
                      const val = Math.max(Number(e.target.value), priceMin + 300);
                      setPriceMax(val);
                    }}
                  />
                </div>
                <div className="prv">
                  <span id="p1">{formatINR(priceMin)}</span>
                  <span id="p2">{formatINR(priceMax)}</span>
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

              <div className="fbox">
                <h4>
                  Series <button onClick={handleResetSeries}>Reset</button>
                </h4>
                <div className="brands" id="brands">
                  {SERIES_LIST.map(([s, color]) => (
                    <label key={s} className="chk">
                      <span className="lg" style={{ background: color }}>
                        {s[0]}
                      </span>
                      {s}
                      <input
                        type="checkbox"
                        checked={selectedSeries.has(s)}
                        onChange={() => handleSeriesToggle(s)}
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

              <button
                className="btn mf"
                id="sideDone"
                onClick={() => setIsMobileFilterOpen(false)}
                style={{ justifyContent: 'center', marginTop: '6px' }}
              >
                Show results
              </button>
            </aside>

            {/* Product Grid Area */}
            <div>
              <div className="shop-top">
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
                    <>Showing <b>{filteredProducts.length}</b> of {products.length} products</>
                  ) : (
                    'Catalog status unavailable'
                  )}
                </span>
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

              {catalogStatus !== 'ready' ? (
                <CatalogState
                  status={catalogStatus}
                  error={catalogError}
                  onRetry={retryCatalog}
                />
              ) : (
                <>
                  <div className="grid" id="grid">
                    {filteredProducts.map((p) => {
                      const isSpot = !!p.spot;
                      return (
                        <article
                          key={p.id}
                          className={`pc ${isSpot ? 'spot' : ''}`}
                          data-id={p.id}
                        >
                          <div
                            className="pm"
                            onClick={() => router.push(`/product/${p.id}`)}
                          >
                            {isSpot && (
                              <>
                                <span className="bub" style={{ top: '14px', left: '14px' }}>
                                  <i style={{ background: '#e2231a' }}>AR</i>4.9/5 <u>★</u>
                                </span>
                                <span
                                  className="bub"
                                  style={{ top: '48%', right: '12px', animationDelay: '-2s' }}
                                >
                                  <i style={{ background: '#1b1b1e' }}>PK</i>4.8/5 <u>★</u>
                                </span>
                                <span
                                  className="bub"
                                  style={{ top: '38%', left: '12px', animationDelay: '-3.4s' }}
                                >
                                  <i style={{ background: '#5d5d64' }}>VM</i>5/5 <u>★</u>
                                </span>
                              </>
                            )}
                            <ProductArt product={p} />
                            {!isSpot && <span className="qv">View details</span>}
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
                            {!isSpot && (
                              <div className="rt">
                                <b>★</b> {p.r} · {p.rv} reviews
                              </div>
                            )}
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
      <section className="sec" id="fitment" aria-labelledby="fit-title" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head rv in">
            <span className="no">05</span>
            <span className="t">Find your perfect fit</span>
            <span className="rule" />
            <span className="note">Accessories designed for your vehicle</span>
          </div>
          <div className="fit-g">
            <div className="fit-p">
              <p className="fit-kicker">A little more you.</p>
              <h2 className="fit-title" id="fit-title">
                <span>Made for</span>
                <em>your drive.</em>
              </h2>
              <p className="fit-intro">
                Start with your car. Find the details that make it feel like yours.
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
                src="/steering.jpg"
                alt="Leather-wrapped steering wheel in a carefully finished car interior"
                width={1280}
                height={720}
                loading="lazy"
                decoding="async"
              />
              <div className="fit-visual-shade" aria-hidden="true" />
              <figcaption className="fit-caption">
                <span className="fit-caption-kicker">The everyday, elevated.</span>
                <p>Good things<br /><em>fit right in.</em></p>
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

      {/* WHY CARXEN */}
      <section className="sec why" id="why" aria-labelledby="why-title">
        <div className="wrap">
          <div className="sec-head rv in">
            <span className="no">06</span>
            <span className="t">Why CarXen</span>
            <span className="rule" />
            <span className="note">Protection / Craft</span>
          </div>
          <h2 className="why-heading disp rv in" id="why-title">
            <span>Protection you feel.</span>{' '}
            <em>Craft you see.</em>
          </h2>
          <div className="why-g">
            <div className="why-gallery-wrap rv in">
              <div className="why-gallery-head">
                <span>Interior systems / 06</span>
                <span>Hover to explore</span>
              </div>
              <AccordionGallery
                items={WHY_GALLERY_ITEMS}
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
                <span>Designed around real drives</span>
                <span>06 / 100% considered</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="sec" id="reviews">
        <div className="wrap">
          <div className="sec-head rv in">
            <span className="no">07</span>
            <span className="t">Driver voices</span>
            <span className="rule" />
            <span className="note">12,000+ five-star reviews</span>
          </div>
          <div className="rev-g">
            <div className="rv-l in">
              <span className="rev-q">“</span>
              <h2 className="disp" style={{ fontSize: 'clamp(2.4rem, 4vw, 4rem)' }}>
                Trusted by
                <br />
                drivers<span className="red">.</span>
              </h2>
              <div className="rev-c">
                <button
                  className="rb"
                  id="rPrev"
                  onClick={() =>
                    setActiveReview(
                      (prev) => (prev - 1 + reviews.length) % reviews.length
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
                    setActiveReview((prev) => (prev + 1) % reviews.length)
                  }
                  aria-label="Next"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M4 12h16M13 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="dots" id="dots">
                  {reviews.map((_, i) => (
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
                {reviews.map((rev, idx) => (
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

      {/* CTA SECTION */}
      <section className="cta">
        <div className="wrap cta-in">
          <div className="cta-grid">
            <div className="cta-left-col">
              <p className="mono rv in" style={{ marginBottom: '16px' }}>
                08 — Ready when you are
              </p>
              <h2 className="disp">
                <span className="mask rv in">
                  <span>Don&apos;t just</span>
                </span>
                <span className="mask rv in" style={{ ['--d' as any]: '.1s' }}>
                  <span className="o">drive.</span>
                </span>
                <span className="mask rv in" style={{ ['--d' as any]: '.2s' }}>
                  <span>Elevate it.</span>
                </span>
              </h2>
              <div className="perks rv in">
                <span>✦ Early access to drops</span>
                <span>✦ Member pricing up to 20% off</span>
                <span>✦ Fitment alerts for your garage</span>
              </div>
            </div>

            <div className="cta-right-col">
              <div className="craft-cards-hint mono rv in">
                <span>✦ Click card to explore cabin craft</span>
              </div>
              <Cards />
              <form className="news rv in" id="nf" onSubmit={handleNewsletterSubmit}>
                <label htmlFor="ne">Join the X-List — 10% off first order</label>
                <div className="nf">
                  <input
                    id="ne"
                    type="email"
                    placeholder="your@email.com"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                  />
                  <button type="submit">Join</button>
                </div>
                <p className="msg" id="nm">
                  {newsletterMsg}
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

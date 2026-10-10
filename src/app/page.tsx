'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/navigation';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  PRODUCTS,
  VEHICLES,
  SERIES_LIST,
  Product,
  formatINR,
} from '@/data/products';
import { ProductArt } from '@/components/ProductArt';
import { Footer } from '@/components/Footer';

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

  // Scroll-based video scrubbing + scene text (lerp-smoothed)
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const heroSectionRef = useRef<HTMLElement>(null);
  const sceneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const finaleRef = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);

  // Scene definitions — each covers a [start, end] progress range (0–1)
  const SCENES = [
    {
      tag: '01 / Seat Covers',
      title: 'Quilted Perfection',
      desc: 'Diamond-stitched leatherette that wraps every contour. Airbag-safe, sweat-proof, zero-compromise.',
      start: 0.00, end: 0.20,
    },
    {
      tag: '02 / Floor Mats',
      title: 'All-Weather Guard',
      desc: 'Deep-channel rubber mats cut to OEM tolerance. Mud, rain, and chai spills wiped clean in seconds.',
      start: 0.20, end: 0.40,
    },
    {
      tag: '03 / Steering Covers',
      title: 'Grip Redefined',
      desc: 'Micro-perforated sport leather with a slip-resistant inner lining. Feel every curve, command every turn.',
      start: 0.40, end: 0.58,
    },
    {
      tag: '04 / Dashboard Accessories',
      title: 'Detail-Driven Craft',
      desc: 'Sun shades, organisers and console trims built for the interior enthusiast. Premium, purposeful, precise.',
      start: 0.58, end: 0.76,
    },
    {
      tag: '05 / Car Care',
      title: 'Showroom Finish',
      desc: 'Ceramic-infused detailing products that protect paint, glass and fabric. One kit. Every surface.',
      start: 0.76, end: 0.88,
    },
  ] as const;

  useEffect(() => {
    const video = heroVideoRef.current;
    const section = heroSectionRef.current;
    if (!video || !section) return;

    video.pause();
    video.currentTime = 0;

    let targetProgress = 0;
    let currentProgress = 0;
    let rafId: number;
    const LERP_FACTOR = 0.06; // lower = slower / smoother

    const updateOverlays = (progress: number) => {
      // Drive scene text panels
      SCENES.forEach((scene, i) => {
        const el = sceneRefs.current[i];
        if (!el) return;
        const fadeRange = 0.03;
        let opacity = 0;
        if (progress >= scene.start && progress <= scene.end) {
          const fadeIn  = Math.min(1, (progress - scene.start) / fadeRange);
          const fadeOut = Math.min(1, (scene.end - progress) / fadeRange);
          opacity = Math.min(fadeIn, fadeOut);
        }
        el.style.opacity = String(opacity);
        el.style.transform = opacity > 0
          ? 'translateY(0)'
          : progress < scene.start ? 'translateY(28px)' : 'translateY(-28px)';
      });

      // Finale overlay
      const finale = finaleRef.current;
      if (finale) {
        const finaleProgress = Math.max(0, Math.min(1, (progress - 0.88) / 0.05));
        finale.style.opacity = String(finaleProgress);
        finale.style.pointerEvents = finaleProgress > 0.5 ? 'auto' : 'none';
      }

      // Hide scroll hint once user starts scrolling
      const hint = scrollHintRef.current;
      if (hint) {
        hint.style.opacity = progress > 0.02 ? '0' : '1';
      }
    };

    const tick = () => {
      if (!video.duration) { rafId = requestAnimationFrame(tick); return; }
      // Lerp toward target
      currentProgress += (targetProgress - currentProgress) * LERP_FACTOR;
      // Clamp tiny floating point tail
      if (Math.abs(targetProgress - currentProgress) < 0.0001) {
        currentProgress = targetProgress;
      }
      video.currentTime = currentProgress * video.duration;
      updateOverlays(currentProgress);
      rafId = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const sectionHeight = section.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      targetProgress = Math.max(0, Math.min(1, scrolled / sectionHeight));

      // Tell BackToTop whether we're inside the hero
      const inHero = scrolled >= 0 && scrolled < sectionHeight;
      window.dispatchEvent(new CustomEvent('hero-scroll', { detail: { inHero } }));
    };

    const onLoaded = () => {
      video.pause();
      onScroll();
    };

    video.addEventListener('loadedmetadata', onLoaded);
    window.addEventListener('scroll', onScroll, { passive: true });
    rafId = requestAnimationFrame(tick);

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    PRODUCTS.forEach((p) => {
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
  }, [priceMin, priceMax]);

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
    let list = PRODUCTS.filter((p) => {
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
      {/* HERO SECTION — Scroll-based video with scene text */}
      <section className="hero-video-section" ref={heroSectionRef} aria-label="Hero">
        <div className="hero-video-sticky">
          {/* Video layer */}
          <video
            ref={heroVideoRef}
            className="hero-video-el"
            src="/hero-video.mp4"
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
          />

          {/* Dark vignette base */}
          <div className="hero-video-vignette" />

          {/* Scene text panels — driven by scroll */}
          {([
            { tag: '01 / Seat Covers',          title: 'Quilted Perfection',       desc: 'Diamond-stitched leatherette that wraps every contour. Airbag-safe, sweat-proof, zero-compromise.' },
            { tag: '02 / Floor Mats',            title: 'All-Weather Guard',        desc: 'Deep-channel rubber mats cut to OEM tolerance. Mud, rain, and chai spills wiped clean in seconds.' },
            { tag: '03 / Steering Covers',       title: 'Grip Redefined',           desc: 'Micro-perforated sport leather with slip-resistant inner lining. Feel every curve, command every turn.' },
            { tag: '04 / Dashboard Accessories', title: 'Detail-Driven Craft',      desc: 'Sun shades, organisers and console trims for the interior enthusiast. Premium, purposeful, precise.' },
            { tag: '05 / Car Care',              title: 'Showroom Finish',          desc: 'Ceramic-infused detailing products that protect paint, glass and fabric. One kit. Every surface.' },
          ] as const).map((scene, i) => (
            <div
              key={i}
              className="hv-scene"
              ref={(el) => { sceneRefs.current[i] = el; }}
            >
              <p className="hv-scene-tag mono">{scene.tag}</p>
              <h2 className="hv-scene-title disp">{scene.title}</h2>
              <p className="hv-scene-desc">{scene.desc}</p>
            </div>
          ))}

          {/* Finale — CARXEN logo + slogan */}
          <div className="hv-finale" ref={finaleRef}>
            <div className="hv-finale-inner">
              <p className="hv-finale-pre mono">The complete car accessories brand</p>
              <h1 className="hv-finale-logo disp">CAR<span className="hv-finale-x">X</span>EN</h1>
              <p className="hv-finale-slogan">Engineered for every drive<span className="hv-finale-dot">.</span></p>
              <div className="hv-finale-line" />
              <p className="hv-finale-sub mono">100+ Vehicle Models &nbsp;·&nbsp; 2-Year Warranty &nbsp;·&nbsp; Free Shipping</p>
            </div>
          </div>

          {/* Scroll hint — fades away on first scroll */}
          <div className="hero-video-scroll-hint-wrap" ref={scrollHintRef}>
            <p className="hero-video-label mono">Scroll to explore</p>
            <div className="hero-video-scroll-hint">
              <span />
            </div>
          </div>
        </div>
      </section>

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
          <div className="sec-head rv in">
            <span className="no">02</span>
            <span className="t">Featured categories</span>
            <span className="rule" />
            <span className="note">Explore our signature collection</span>
          </div>
          <div className="cats">
            <button
              className="cat rv in"
              onClick={() => {
                setFilterCat('seats');
                document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <div
                className="ph"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1571607388263-1044f9ea01dd?q=70&w=1200&auto=format&fit=crop')",
                }}
              />
              <div className="art">
                <svg viewBox="0 0 320 400">
                  <use href="#a-seat" />
                </svg>
              </div>
              <span className="n">01</span>
              <span className="tg">
                Comfort
                <br />
                Style
                <br />
                Durability
              </span>
              <div className="ft">
                <div>
                  <h3>Seat covers</h3>
                  <p>Custom fit. Premium finish.</p>
                </div>
                <span className="go">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 12h16M13 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </button>

            <button
              className="cat rv in"
              style={{ ['--d' as any]: '.1s' }}
              onClick={() => {
                setFilterCat('mats');
                document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <div
                className="ph"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=70&w=900&auto=format&fit=crop')",
                }}
              />
              <div className="art">
                <svg viewBox="0 0 400 300">
                  <use href="#a-mats" />
                </svg>
              </div>
              <span className="n">02</span>
              <span className="tg">
                All-weather
                <br />
                Protection
                <br />
                Easy to clean
              </span>
              <div className="ft">
                <div>
                  <h3>Floor mats</h3>
                  <p>Built for real-world roads.</p>
                </div>
                <span className="go">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 12h16M13 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </button>

            <button
              className="cat rv in"
              style={{ ['--d' as any]: '.2s' }}
              onClick={() => {
                setFilterCat('steering');
                document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <div
                className="ph"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?q=70&w=900&auto=format&fit=crop')",
                }}
              />
              <div className="art">
                <svg viewBox="0 0 320 320">
                  <use href="#a-wheel" />
                </svg>
              </div>
              <span className="n">03</span>
              <span className="tg">
                Better grip
                <br />
                Modern style
                <br />
                Universal fit
              </span>
              <div className="ft">
                <div>
                  <h3>Steering covers</h3>
                  <p>Control meets comfort.</p>
                </div>
                <span className="go">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 12h16M13 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* CRAFT & MATERIALS */}
      <section className="sec craft" id="craft">
        <div className="wrap">
          <div className="sec-head rv in">
            <span className="no">03</span>
            <span className="t">Materials &amp; craftsmanship</span>
            <span className="rule" />
            <span className="note">Anatomy of a CarXen panel</span>
          </div>
          <div className="craft-g">
            <div>
              <p className="mono red rv in">Details that drive difference</p>
              <h2 className="disp rv in" style={{ ['--d' as any]: '.1s' }}>
                Built in
                <br />
                four layers<span className="red">.</span>
              </h2>
              <p className="cp rv in" style={{ ['--d' as any]: '.2s' }}>
                Premium materials. Precise craftsmanship. A more refined drive.
                Wear surface, comfort core, climate layer and grip backing — pressed and stitched to one tolerance.
              </p>
              <a href="#shop" className="btn mag rv in" style={{ ['--d' as any]: '.3s' }}>
                Explore collection{' '}
                <svg viewBox="0 0 24 24">
                  <path d="M4 12h16M13 5l7 7-7 7" />
                </svg>
              </a>
            </div>

            <div className="stack-w">
              <svg
                className="stack in"
                id="stack"
                viewBox="0 0 540 430"
                aria-label="Exploded view of four material layers"
              >
                <g className="lyr" style={{ ['--d' as any]: '.1s', ['--c' as any]: '70px' }}>
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

                <g className="lyr" style={{ ['--d' as any]: '.25s', ['--c' as any]: '40px' }}>
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

                <g className="lyr" style={{ ['--d' as any]: '.4s', ['--c' as any]: '14px' }}>
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

                <g className="lyr" style={{ ['--d' as any]: '.55s', ['--c' as any]: '-14px' }}>
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
              <div className="ft-i rv in">
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
              <div className="ft-i rv in" style={{ ['--d' as any]: '.1s' }}>
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
              <div className="ft-i rv in" style={{ ['--d' as any]: '.2s' }}>
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

          <div className="specs rv in">
            <div>
              <b>
                <span>40,000</span>
                <em>+</em>
              </b>
              <span>Double stitches / set</span>
            </div>
            <div>
              <b>
                <span>120,000</span>
              </b>
              <span>Abrasion cycles rated</span>
            </div>
            <div>
              <b>
                −30°<em>/</em>80°
              </b>
              <span>Operating range °C</span>
            </div>
          </div>
        </div>
      </section>

      {/* POPULAR PRODUCTS */}
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
                  Showing <b>{filteredProducts.length}</b> of {PRODUCTS.length} products
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
            </div>
          </div>
        </div>
      </section>

      {/* FITMENT FINDER */}
      <section className="sec" id="fitment" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head rv in">
            <span className="no">05</span>
            <span className="t">Find your perfect fit</span>
            <span className="rule" />
            <span className="note">Accessories designed for your vehicle</span>
          </div>
          <div className="fit-g">
            <div className="fit-p rv-l in">
              <p className="mono red">Fitment finder</p>
              <h2 className="disp">
                Made for
                <br />
                your drive<span className="red">.</span>
              </h2>
              <p>
                Precise fitment for a seamless experience. Three taps and we&apos;ll narrow the collection to your car.
              </p>
              <div className="step">
                <i>1</i>Select your vehicle
              </div>
              <div className="sel">
                <select
                  id="fB"
                  aria-label="Brand"
                  value={selectedBrand}
                  onChange={(e) => {
                    setSelectedBrand(e.target.value);
                    setSelectedModel('');
                    setSelectedYear('');
                    setFitmentResult(null);
                  }}
                >
                  <option value="">Select brand</option>
                  {Object.keys(VEHICLES).map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sel">
                <select
                  id="fM"
                  aria-label="Model"
                  disabled={!selectedBrand}
                  value={selectedModel}
                  onChange={(e) => {
                    setSelectedModel(e.target.value);
                    setSelectedYear('');
                    setFitmentResult(null);
                  }}
                >
                  <option value="">Select model</option>
                  {availableModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sel">
                <select
                  id="fY"
                  aria-label="Year"
                  disabled={!selectedModel}
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setFitmentResult(null);
                  }}
                >
                  <option value="">Select year</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="btn mag"
                id="fGo"
                disabled={!(selectedBrand && selectedModel && selectedYear)}
                onClick={handleCheckFitment}
              >
                Check fitment{' '}
                <svg viewBox="0 0 24 24">
                  <path d="M4 12h16M13 5l7 7-7 7" />
                </svg>
              </button>

              {fitmentResult && (
                <div className="fres on" id="fRes">
                  <b id="fT">
                    <em>{fitmentResult.count}</em> products fit your car
                  </b>
                  <p id="fS">{fitmentResult.text}</p>
                  <p style={{ marginTop: '10px' }}>
                    <NextLink href="/shop">Browse matching products →</NextLink>
                  </p>
                </div>
              )}
            </div>

            <div className="fit-v rv in" id="fitV">
              <div className="scan" />
              <div className="cap mono">
                <span>Fig. 05 — Reference platform</span>
                <span>Scale 1:32</span>
              </div>
              <svg viewBox="0 0 840 320">
                <line x1="40" y1="262" x2="800" y2="262" className="wd" />
                <path
                  className="wire"
                  d="M78 262V224Q80 202 108 196L176 184Q214 132 292 122L486 112Q560 112 616 148L676 168Q756 176 766 208L768 262"
                />
                <path className="wire" d="M196 262Q196 200 258 200T320 262" />
                <path className="wire" d="M560 262Q560 200 622 200T684 262" />
                <circle className="wire" cx="258" cy="240" r="34" />
                <circle className="wire" cx="258" cy="240" r="13" />
                <circle className="wire" cx="622" cy="240" r="34" />
                <circle className="wire" cx="622" cy="240" r="13" />
                <path
                  className="wire"
                  d="M236 178Q268 140 320 134L470 126Q530 128 578 158L596 172L470 176V262M320 134L326 176L236 178M326 176L320 262"
                />
                <line x1="258" y1="70" x2="622" y2="70" className="wr" />
                <line x1="258" y1="62" x2="258" y2="78" className="wr" />
                <line x1="622" y1="62" x2="622" y2="78" className="wr" />
                <line x1="258" y1="78" x2="258" y2="200" className="wd" />
                <line x1="622" y1="78" x2="622" y2="200" className="wd" />
                <text
                  x="440"
                  y="56"
                  textAnchor="middle"
                  fill="#e2231a"
                  fontFamily="IBM Plex Mono"
                  fontSize="13"
                  letterSpacing="2"
                >
                  WHEELBASE 2,851 MM
                </text>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* WHY CARXEN */}
      <section className="sec why" id="why">
        <div className="wrap">
          <div className="why-g">
            <div className="why-m rv-l in">
              <div
                className="ph"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=70&w=1200&auto=format&fit=crop')",
                }}
              />
              <span className="big">4.9★</span>
              <span className="st">Cabin study — night protocol</span>
            </div>
            <div>
              <p className="mono red rv in" style={{ marginBottom: '14px' }}>
                06 — Why CarXen
              </p>
              <h2 className="disp rv in" style={{ ['--d' as any]: '.1s' }}>
                Protection you feel. Craft you see<span className="red">.</span>
              </h2>
              <ul className="ben">
                <li className="rv in">
                  <span className="n">01</span>
                  <div>
                    <h3>All-weather protection</h3>
                    <p>
                      Sealed surfaces and raised-edge mats keep mud, rain and spills off your factory interior.
                    </p>
                  </div>
                </li>
                <li className="rv in" style={{ ['--d' as any]: '.08s' }}>
                  <span className="n">02</span>
                  <div>
                    <h3>Precision fitment</h3>
                    <p>
                      Patterns measured against real vehicle data — nothing slides, nothing bunches.
                    </p>
                  </div>
                </li>
                <li className="rv in" style={{ ['--d' as any]: '.16s' }}>
                  <span className="n">03</span>
                  <div>
                    <h3>Easy maintenance</h3>
                    <p>
                      Wipe down in seconds, hose off when needed, keep the cabin looking new.
                    </p>
                  </div>
                </li>
                <li className="rv in" style={{ ['--d' as any]: '.24s' }}>
                  <span className="n">04</span>
                  <div>
                    <h3>Refined comfort</h3>
                    <p>
                      Layered foam and breathable panels turn daily driving into a lounge.
                    </p>
                  </div>
                </li>
              </ul>
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
          <div className="cta-r">
            <div className="perks rv in">
              <span>✦ Early access to drops</span>
              <span>✦ Member pricing up to 20% off</span>
              <span>✦ Fitment alerts for your garage</span>
            </div>
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
      </section>

      <Footer />
    </main>
  );
}

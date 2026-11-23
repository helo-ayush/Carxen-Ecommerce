'use client';

import React, { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatSeriesLabel, isCustomFit } from '@/data/products';
import {
  categoryLabel,
  normalizeCategoryKey,
  slugifyCategory,
} from '@/lib/storefront/categories';
import {
  compareNewArrivals,
  computeBestSellerScore,
  resolveBestSellerRankMap,
  resolveNewArrivalIdSet,
  type StorefrontCollection,
} from '@/lib/storefront/collections';
import { fitBadgeText, fitsVehicle, readFitment } from '@/lib/storefront/fitment';
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
  ChevronRight,
  ChevronUp,
  CarFront,
  FolderTree,
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

function isUrl(val?: string | null): val is string {
  if (!val) return false;
  const t = val.trim();
  return t.startsWith('http://') || t.startsWith('https://') || t.startsWith('/') || t.startsWith('data:image');
}

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

function parseCollectionParam(raw: string | null): StorefrontCollection {
  const clean = (raw || '').trim().toLowerCase();
  if (clean === 'new' || clean === 'new-arrivals') return 'new';
  if (clean === 'bestsellers' || clean === 'best-sellers' || clean === 'best') return 'bestsellers';
  return 'all';
}

function ShopContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const collectionParam = parseCollectionParam(searchParams.get('collection'));
  const groupParam = searchParams.get('group') || 'all';
  const catParam = searchParams.get('cat') || 'all';
  const seriesParam = searchParams.get('series') || 'all';
  const brandParam = searchParams.get('brand') || 'all';
  const modelParam = searchParams.get('model') || 'all';
  const sortParam = searchParams.get('sort') || 'pop';
  const dealsParam = searchParams.get('deals') === '1';

  const {
    car,
    addToCart,
    openCart,
    toggleFav,
    isFav,
    products,
    categories: categoryTree,
    flatCategories,
    catalogStatus,
    catalogError,
    retryCatalog,
    vehicleBrands,
    inventoryVehicles,
  } = useApp();

  const activeCar = useMemo(() => {
    if (car) return car;
    if (inventoryVehicles && inventoryVehicles.length > 0) {
      const first = inventoryVehicles[0];
      return { b: first.brand, m: first.models[0] || first.brand, y: '', f: '' };
    }
    return null;
  }, [car, inventoryVehicles]);

  // Live collections derived from publishedAt / isNew / real order counts / ratings / tags
  const newArrivalIds = useMemo(() => resolveNewArrivalIdSet(products), [products]);
  const bestSellerRankMap = useMemo(() => resolveBestSellerRankMap(products), [products]);

  // Live Vehicle Brand filter options derived strictly from database products + DB brand registry (zero hardcoded list)
  const catalogBrandOptions = useMemo(() => {
    const dbBrandsLongestFirst = [...vehicleBrands]
      .filter((b) => b && b.trim().toLowerCase() !== 'na' && !b.toLowerCase().includes('universal'))
      .sort((a, b) => b.length - a.length);

    const counts = new Map<string, number>();

    for (const p of products) {
      const matchedForProduct = new Set<string>();
      const fit = readFitment(p);
      if (fit.kind === 'vehicle' && fit.brand.trim()) {
        const canonical =
          dbBrandsLongestFirst.find((b) => b.toLowerCase() === fit.brand.trim().toLowerCase()) ||
          fit.brand.trim();
        matchedForProduct.add(canonical);
      } else if (fit.kind !== 'universal') {
        const rawFitText =
          typeof p.fitment === 'object' && p.fitment !== null
            ? JSON.stringify(p.fitment)
            : String(p.fitment || '');
        const haystack = `${rawFitText} ${p.n}`.toLowerCase();
        if (!haystack.includes('universal')) {
          for (const dbBrand of dbBrandsLongestFirst) {
            const bLower = dbBrand.toLowerCase();
            const pattern = new RegExp(`(^|[^a-z0-9])${bLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
            if (pattern.test(haystack)) {
              matchedForProduct.add(dbBrand);
            }
          }
        }
      }

      for (const brand of matchedForProduct) {
        counts.set(brand, (counts.get(brand) ?? 0) + 1);
      }
    }

    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [products, vehicleBrands]);

  const fitCounts = useMemo(() => {
    let custom = 0;
    let universal = 0;
    for (const p of products) {
      if (isCustomFit(p)) custom += 1;
      else universal += 1;
    }
    return { custom, universal };
  }, [products]);

  const [collection, setCollection] = useState<StorefrontCollection>(collectionParam);
  const [groupSlug, setGroupSlug] = useState(() => (groupParam === 'all' ? 'all' : slugifyCategory(groupParam)));
  const [category, setCategory] = useState(() => (catParam === 'all' ? 'all' : normalizeCategoryKey(catParam)));
  const [fitType, setFitType] = useState<'all' | 'c' | 'u'>('all');
  const [selectedVehicleBrand, setSelectedVehicleBrand] = useState<string>(brandParam);
  const [selectedVehicleModel, setSelectedVehicleModel] = useState<string>(modelParam);
  const [priceTier, setPriceTier] = useState<string>('all');
  const [seriesFilter, setSeriesFilter] = useState(seriesParam);
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [sortBy, setSortBy] = useState(sortParam);
  const [dealsOnly, setDealsOnly] = useState(dealsParam);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Expanded Master Groups inside mobile filter drawer
  const [expandedTreeIds, setExpandedTreeIds] = useState<Set<string>>(() => new Set());

  const [expandedSections, setExpandedSections] = useState({
    departments: true,
    vehicle: true,
    fit: true,
    price: true,
    series: true,
  });

  useEffect(() => {
    setSearchQuery(queryParam);
  }, [queryParam]);

  useEffect(() => {
    setCollection(collectionParam);
  }, [collectionParam]);

  useEffect(() => {
    setGroupSlug(groupParam === 'all' ? 'all' : slugifyCategory(groupParam));
  }, [groupParam]);

  useEffect(() => {
    setCategory(catParam === 'all' ? 'all' : normalizeCategoryKey(catParam));
  }, [catParam]);

  useEffect(() => {
    setSeriesFilter(seriesParam);
  }, [seriesParam]);

  useEffect(() => {
    setSelectedVehicleBrand(brandParam);
  }, [brandParam]);

  useEffect(() => {
    setSelectedVehicleModel(modelParam);
  }, [modelParam]);

  useEffect(() => {
    setSortBy(sortParam);
  }, [sortParam]);

  useEffect(() => {
    setDealsOnly(dealsParam);
  }, [dealsParam]);

  useEffect(() => {
    if (categoryTree.length > 0 && expandedTreeIds.size === 0) {
      setExpandedTreeIds(new Set(categoryTree.map((g) => g.id)));
    }
  }, [categoryTree, expandedTreeIds.size]);

  const activeSubCategoryObj = useMemo(() => {
    if (category === 'all') return null;
    const rawCat = slugifyCategory(catParam === 'all' ? category : catParam);
    return (
      flatCategories.find(
        (c) =>
          slugifyCategory(c.slug) === rawCat ||
          normalizeCategoryKey(c.slug) === category ||
          slugifyCategory(c.name) === rawCat,
      ) ?? null
    );
  }, [category, catParam, flatCategories]);

  const activeMasterGroupObj = useMemo(() => {
    if (groupSlug !== 'all') {
      const byGroup = categoryTree.find(
        (g) => slugifyCategory(g.slug) === groupSlug || slugifyCategory(g.name) === groupSlug || g.id === groupSlug,
      );
      if (byGroup) return byGroup;
    }
    if (activeSubCategoryObj) {
      if (activeSubCategoryObj.parentId) {
        return categoryTree.find((g) => g.id === activeSubCategoryObj.parentId) ?? null;
      }
      return categoryTree.find((g) => g.id === activeSubCategoryObj.id) ?? null;
    }
    return null;
  }, [groupSlug, categoryTree, activeSubCategoryObj]);

  useEffect(() => {
    if (!isFilterOpen) return;
    document.body.classList.add('lock');
    return () => document.body.classList.remove('lock');
  }, [isFilterOpen]);

  const updateUrlFilters = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (!v || v === 'all') params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    router.replace(`/shop${qs ? `?${qs}` : ''}`, { scroll: false });
  };

  const handleCollectionSelect = (nextCollection: StorefrontCollection) => {
    setCollection(nextCollection);
    updateUrlFilters({
      collection: nextCollection === 'all' ? null : nextCollection,
      ...(nextCollection !== 'all' ? { group: null, cat: null } : {}),
    });
    if (nextCollection !== 'all') {
      setGroupSlug('all');
      setCategory('all');
    }
  };

  const handleGroupSelect = (nextGroupSlug: string) => {
    setGroupSlug(nextGroupSlug);
    setCategory('all');
    setCollection('all');
    updateUrlFilters({
      collection: null,
      group: nextGroupSlug === 'all' ? null : nextGroupSlug,
      cat: null,
    });
  };

  const handleCategorySelect = (k: string, explicitGroupSlug?: string | null) => {
    setCategory(k);
    setCollection('all');
    if (k === 'all') {
      updateUrlFilters({
        collection: null,
        group: explicitGroupSlug === null ? null : explicitGroupSlug ?? (groupSlug === 'all' ? null : groupSlug),
        cat: null,
      });
      if (explicitGroupSlug === null) setGroupSlug('all');
      return;
    }
    const matchedNode = flatCategories.find(
      (c) => slugifyCategory(c.slug) === slugifyCategory(k) || normalizeCategoryKey(c.slug) === k,
    );
    const parentMaster = matchedNode?.parentId
      ? categoryTree.find((g) => g.id === matchedNode.parentId)
      : matchedNode && !matchedNode.parentId
      ? matchedNode
      : null;

    if (parentMaster && matchedNode && !matchedNode.parentId) {
      setGroupSlug(parentMaster.slug);
      setCategory('all');
      updateUrlFilters({ collection: null, group: parentMaster.slug, cat: null });
      return;
    }

    const resolvedGroup = explicitGroupSlug || parentMaster?.slug || (groupSlug !== 'all' ? groupSlug : null);
    if (resolvedGroup) setGroupSlug(resolvedGroup);
    updateUrlFilters({
      collection: null,
      group: resolvedGroup,
      cat: matchedNode?.slug || k,
    });
  };

  const handleVehicleBrandChange = (brand: string) => {
    setSelectedVehicleBrand(brand);
    setSelectedVehicleModel('all');
    updateUrlFilters({ brand: brand === 'all' ? null : brand, model: null });
  };

  const handleSeriesChange = (nextSeries: string) => {
    setSeriesFilter(nextSeries);
    updateUrlFilters({ series: nextSeries === 'all' ? null : nextSeries });
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    updateUrlFilters({ q: null });
  };

  const priceBands = useMemo(() => buildPriceBands(products.map((product) => product.p)), [products]);
  const activePriceBand = priceBands.find((band) => band.id === priceTier);

  const seriesOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      const s = (product.s || '').trim();
      if (!s) continue;
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
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
      if (collection === 'new' && !newArrivalIds.has(p.id)) {
        return false;
      }
      if (collection === 'bestsellers' && !bestSellerRankMap.has(p.id)) {
        return false;
      }

      const matchCat = (() => {
        if (category !== 'all') {
          if (activeSubCategoryObj) {
            if (p.categoryId && p.categoryId === activeSubCategoryObj.id) return true;
            const pSlug = slugifyCategory(p.c || '');
            const cSlug = slugifyCategory(activeSubCategoryObj.slug || activeSubCategoryObj.name);
            return pSlug === cSlug || normalizeCategoryKey(p.c) === normalizeCategoryKey(activeSubCategoryObj.slug);
          }
          return p.c === category || slugifyCategory(p.c) === slugifyCategory(category);
        }
        if (groupSlug !== 'all') {
          if (activeMasterGroupObj) {
            const validIds = new Set([
              activeMasterGroupObj.id,
              ...activeMasterGroupObj.children.map((c) => c.id),
            ]);
            if (p.categoryId && validIds.has(p.categoryId)) return true;
            const validSlugs = new Set([
              slugifyCategory(activeMasterGroupObj.slug),
              ...activeMasterGroupObj.children.map((c) => slugifyCategory(c.slug)),
              ...activeMasterGroupObj.children.map((c) => normalizeCategoryKey(c.slug)),
            ]);
            return validSlugs.has(slugifyCategory(p.c)) || validSlugs.has(normalizeCategoryKey(p.c));
          }
          return false;
        }
        return true;
      })();

      const matchFit =
        fitType === 'all' || (fitType === 'c') === isCustomFit(p);

      if (selectedVehicleBrand !== 'all') {
        const bQuery = selectedVehicleBrand.toLowerCase();
        const fit = readFitment(p);
        const fitmentStr = typeof p.fitment === 'object' && p.fitment !== null ? JSON.stringify(p.fitment).toLowerCase() : String(p.fitment || '').toLowerCase();
        const nameStr = p.n.toLowerCase();
        const tagsStrLower = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : '';
        const brandMatch =
          (fit.kind === 'vehicle' && fit.brand.toLowerCase() === bQuery) ||
          fitmentStr.includes(bQuery) ||
          nameStr.includes(bQuery) ||
          tagsStrLower.includes(bQuery);
        const isUniversal = fit.kind === 'universal' || fitmentStr.includes('universal');
        if (!brandMatch && !isUniversal) return false;

        if (selectedVehicleModel !== 'all') {
          const mQuery = selectedVehicleModel.toLowerCase();
          const modelMatch =
            (fit.kind === 'vehicle' && fit.model.toLowerCase().includes(mQuery)) ||
            fitmentStr.includes(mQuery) ||
            nameStr.includes(mQuery) ||
            tagsStrLower.includes(mQuery);
          if (!modelMatch && !isUniversal) return false;
        }
      }

      const matchPrice =
        !activePriceBand ||
        (p.p >= activePriceBand.min &&
          (activePriceBand.last ? p.p <= activePriceBand.max : p.p < activePriceBand.max));
      const matchSeries =
        seriesFilter === 'all' ||
        (p.s || '').trim().toLowerCase() === seriesFilter.trim().toLowerCase();
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

    // When a collection is active and sort is still on default ('pop'), apply its natural order
    const effectiveSort =
      sortBy === 'pop' && collection === 'new'
        ? 'new'
        : sortBy === 'pop' && collection === 'bestsellers'
        ? 'bestsellers'
        : sortBy;

    switch (effectiveSort) {
      case 'new':
        list.sort(compareNewArrivals);
        break;
      case 'bestsellers':
        list.sort((a, b) => {
          const rankA = bestSellerRankMap.get(a.id) ?? 9999;
          const rankB = bestSellerRankMap.get(b.id) ?? 9999;
          if (rankA !== rankB) return rankA - rankB;
          return computeBestSellerScore(b) - computeBestSellerScore(a);
        });
        break;
      case 'lo':
        list.sort((a, b) => a.p - b.p);
        break;
      case 'hi':
        list.sort((a, b) => b.p - a.p);
        break;
      case 'rt':
        list.sort((a, b) => b.r - a.r || b.rv - a.rv);
        break;
      case 'save':
        list.sort((a, b) => {
          const sa = a.o && a.o > a.p ? (a.o - a.p) / a.o : 0;
          const sb = b.o && b.o > b.p ? (b.o - b.p) / b.o : 0;
          return sb - sa;
        });
        break;
      case 'pop':
      default:
        list.sort((a, b) => computeBestSellerScore(b) - computeBestSellerScore(a) || a.id - b.id);
        break;
    }
    return list;
  }, [
    collection,
    newArrivalIds,
    bestSellerRankMap,
    groupSlug,
    activeMasterGroupObj,
    activeSubCategoryObj,
    category,
    fitType,
    selectedVehicleBrand,
    selectedVehicleModel,
    activePriceBand,
    seriesFilter,
    searchQuery,
    sortBy,
    dealsOnly,
    products,
  ]);

  const PAGE_SIZE = 12;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [collection, groupSlug, category, fitType, selectedVehicleBrand, selectedVehicleModel, priceTier, seriesFilter, searchQuery, sortBy, dealsOnly]);

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, currentPage]);

  const hasActiveFilters =
    collection !== 'all' ||
    groupSlug !== 'all' ||
    category !== 'all' ||
    fitType !== 'all' ||
    selectedVehicleBrand !== 'all' ||
    selectedVehicleModel !== 'all' ||
    priceTier !== 'all' ||
    seriesFilter !== 'all' ||
    dealsOnly ||
    Boolean(searchQuery.trim());

  const activeFilterCount = [
    collection !== 'all',
    groupSlug !== 'all',
    category !== 'all',
    fitType !== 'all',
    selectedVehicleBrand !== 'all',
    selectedVehicleModel !== 'all',
    priceTier !== 'all',
    seriesFilter !== 'all',
    dealsOnly,
    Boolean(searchQuery.trim()),
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setCollection('all');
    setGroupSlug('all');
    setCategory('all');
    setFitType('all');
    setSelectedVehicleBrand('all');
    setSelectedVehicleModel('all');
    setPriceTier('all');
    setSeriesFilter('all');
    setSearchQuery('');
    setSortBy('pop');
    setDealsOnly(false);
    router.replace('/shop', { scroll: false });
  };

  const activeCategoryLabel = activeSubCategoryObj?.name ?? categoryLabel(category);

  const heroEyebrow =
    collection === 'new'
      ? 'NEW ARRIVALS · FRESH DROPS'
      : collection === 'bestsellers'
      ? 'BEST SELLERS · TOP RANKED'
      : activeMasterGroupObj && activeSubCategoryObj
      ? `${activeMasterGroupObj.name.toUpperCase()} · SUBCATEGORY`
      : activeMasterGroupObj
      ? 'CARXEN DEPARTMENT'
      : 'PREMIUM CAR ACCESSORIES';

  const heroTitleText =
    collection === 'new'
      ? 'New Arrivals'
      : collection === 'bestsellers'
      ? 'Best Sellers'
      : activeSubCategoryObj
      ? activeSubCategoryObj.name
      : activeMasterGroupObj
      ? activeMasterGroupObj.name
      : dealsOnly
      ? 'Deals & Special Offers'
      : car
      ? `Made for your ${car.m}`
      : 'Precision Car Accessories';

  const vehicleLabel = activeCar
    ? `${activeCar.y ? `${activeCar.y} ` : ''}${activeCar.b} ${activeCar.m}`.replace(/\s+/g, ' ').trim()
    : '';

  const fitCount = useMemo(
    () => (activeCar ? filteredProducts.filter((product) => fitsVehicle(product, activeCar)).length : filteredProducts.length),
    [filteredProducts, activeCar],
  );

  const heroSubtitleText = (() => {
    if (filteredProducts.length === 0) return 'No parts match these filters';
    if (collection === 'new') {
      return `${filteredProducts.length} newly launched CarXen ${filteredProducts.length === 1 ? 'accessory' : 'accessories'} — sorted newest first`;
    }
    if (collection === 'bestsellers') {
      return `${filteredProducts.length} top-performing & highest-rated CarXen essentials chosen by drivers`;
    }
    if (activeSubCategoryObj?.description || activeMasterGroupObj?.description) {
      return `${filteredProducts.length} ${filteredProducts.length === 1 ? 'product' : 'products'} · ${activeSubCategoryObj?.description || activeMasterGroupObj?.description}`;
    }
    if (car && vehicleLabel) {
      return fitCount === filteredProducts.length
        ? `${fitCount} precision-fit parts for your ${vehicleLabel}`
        : `${fitCount} of ${filteredProducts.length} parts fit your ${vehicleLabel}`;
    }
    return `${filteredProducts.length} genuine CarXen ${filteredProducts.length === 1 ? 'accessory' : 'accessories'} ready to ship`;
  })();

  const resultsColumnRef = useRef<HTMLDivElement>(null);
  const stableResultsHeightRef = useRef(0);
  const isSearching = Boolean(searchQuery.trim());

  useEffect(() => {
    if (isSearching) return;
    const column = resultsColumnRef.current;
    if (column) stableResultsHeightRef.current = column.offsetHeight;
  }, [isSearching, filteredProducts.length, collection, category, fitType, priceTier, seriesFilter, products.length]);

  const showSiblingSubcats =
    Boolean(activeMasterGroupObj) && (activeMasterGroupObj?.children.length ?? 0) > 1;

  const activeHeroImage =
    (activeSubCategoryObj?.artKey && isUrl(activeSubCategoryObj.artKey) ? activeSubCategoryObj.artKey : null) ||
    (activeMasterGroupObj?.artKey && isUrl(activeMasterGroupObj.artKey) ? activeMasterGroupObj.artKey : null);

  return (
    <div className="in-shop">
      {/* 1. HERO BANNER DIRECTLY BELOW UNIFIED NAVBAR */}
      <section className="shop-hero-banner" aria-label="Shop hero banner">
        <div
          className="shop-hero-bg"
          style={activeHeroImage ? { backgroundImage: `url("${activeHeroImage}")`, backgroundPosition: 'center center' } : undefined}
        />
        <div className="shop-hero-overlay" />
        <div className="shop-hero-content">
          <span className="shop-hero-eyebrow">{heroEyebrow}</span>
          <h1 className="shop-hero-title">
            {heroTitleText}
            <span style={{ color: 'var(--red, #e2231a)' }}>.</span>
          </h1>
          <p className="shop-hero-subtitle">{heroSubtitleText}</p>
        </div>
      </section>

      {/* 2. MAIN SHOP SECTION */}
      <section className="shop-main-section" id="v-shop">
        <div className="shop-layout">
          {isFilterOpen && (
            <div
              className="drawer-backdrop"
              onClick={() => setIsFilterOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* LEFT COLUMN: REFINEMENT FILTERS (No repeated desktop department tree!) */}
          <aside
            className={`shop-sidebar-card ${isFilterOpen ? 'open' : ''}`}
            aria-label="Product filters"
            role={isFilterOpen ? 'dialog' : undefined}
            aria-modal={isFilterOpen || undefined}
          >
            <div className="shop-filter-header-bar">
              <div className="shop-filter-heading-actions">
                <h2 className="shop-filter-title" style={{ margin: 0, fontSize: '17px' }}>Filters</h2>
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
                  <button
                    type="button"
                    className="mobile-filter-close"
                    onClick={() => setIsFilterOpen(false)}
                    aria-label="Close filters"
                  >
                    <X size={17} />
                  </button>
                </div>
              </div>
            </div>

            <div className="shop-filter-groups-scroll">
              {/* Mobile-Only Department Switcher (hidden on desktop where navbar already handles departments) */}
              {categoryTree.length > 0 && (
                <div className="shop-filter-group shop-mobile-only-group">
                  <button
                    type="button"
                    className="shop-filter-group-header"
                    onClick={() => setExpandedSections((prev) => ({ ...prev, departments: !prev.departments }))}
                    aria-expanded={expandedSections.departments}
                  >
                    <div className="shop-filter-group-title">
                      <FolderTree style={{ width: 13, height: 13, color: '#0f172a' }} />
                      <span>Departments</span>
                    </div>
                    {expandedSections.departments ? (
                      <ChevronUp className="shop-filter-chevron" />
                    ) : (
                      <ChevronDown className="shop-filter-chevron" />
                    )}
                  </button>
                  {expandedSections.departments && (
                    <div className="shop-tree-list">
                      <button
                        type="button"
                        className={`shop-tree-all-btn ${collection === 'all' && groupSlug === 'all' && category === 'all' ? 'active' : ''}`}
                        onClick={() => handleGroupSelect('all')}
                      >
                        <span>All Parts</span>
                        <span className="shop-tree-cnt">{products.length}</span>
                      </button>
                      <button
                        type="button"
                        className={`shop-tree-all-btn ${collection === 'new' ? 'active' : ''}`}
                        onClick={() => handleCollectionSelect('new')}
                      >
                        <span>New Arrivals</span>
                        <span className="shop-tree-cnt">{newArrivalIds.size}</span>
                      </button>
                      <button
                        type="button"
                        className={`shop-tree-all-btn ${collection === 'bestsellers' ? 'active' : ''}`}
                        onClick={() => handleCollectionSelect('bestsellers')}
                      >
                        <span>Best Sellers</span>
                        <span className="shop-tree-cnt">{bestSellerRankMap.size}</span>
                      </button>
                      {categoryTree.map((group) => {
                        const isGroupActive = activeMasterGroupObj?.id === group.id;
                        const isDirectGroupSelected = isGroupActive && category === 'all';
                        const isExpanded = expandedTreeIds.has(group.id) || isGroupActive;
                        const hasChildren = group.children.length > 0;
                        return (
                          <div key={group.id} className={`shop-tree-master ${isGroupActive ? 'active' : ''}`}>
                            <div className="shop-tree-master-row">
                              <button
                                type="button"
                                className={`shop-tree-master-btn ${isDirectGroupSelected ? 'active' : ''}`}
                                onClick={() => handleGroupSelect(group.slug)}
                              >
                                {isUrl(group.artKey) && (
                                  <img
                                    src={group.artKey}
                                    alt=""
                                    style={{ width: '15px', height: '15px', borderRadius: '3px', objectFit: 'cover', flexShrink: 0 }}
                                  />
                                )}
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {group.name}
                                </span>
                                <span className="shop-tree-cnt">{group.totalProductCount}</span>
                              </button>
                              {hasChildren && (
                                <button
                                  type="button"
                                  className="shop-tree-toggle"
                                  aria-label={isExpanded ? `Collapse ${group.name}` : `Expand ${group.name}`}
                                  onClick={() =>
                                    setExpandedTreeIds((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(group.id)) next.delete(group.id);
                                      else next.add(group.id);
                                      return next;
                                    })
                                  }
                                >
                                  {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                </button>
                              )}
                            </div>
                            {hasChildren && isExpanded && (
                              <div className="shop-tree-children">
                                {group.children.map((sub) => {
                                  const isSubActive = activeSubCategoryObj?.id === sub.id;
                                  return (
                                    <button
                                      key={sub.id}
                                      type="button"
                                      className={`shop-tree-child-btn ${isSubActive ? 'active' : ''}`}
                                      onClick={() => handleCategorySelect(sub.slug, group.slug)}
                                    >
                                      {(isUrl(sub.artKey) || isUrl(group.artKey)) && (
                                        <img
                                          src={isUrl(sub.artKey) ? sub.artKey : group.artKey!}
                                          alt=""
                                          style={{ width: '13px', height: '13px', borderRadius: '3px', objectFit: 'cover', flexShrink: 0 }}
                                        />
                                      )}
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {sub.name}
                                      </span>
                                      <span className="shop-tree-cnt">{sub.productCount}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Vehicle Brand (100% Live from Database Products) */}
              {catalogBrandOptions.length > 0 && (
                <div className="shop-filter-group">
                  <button
                    type="button"
                    className="shop-filter-group-header"
                    onClick={() => setExpandedSections((prev) => ({ ...prev, vehicle: !prev.vehicle }))}
                    aria-expanded={expandedSections.vehicle}
                  >
                    <div className="shop-filter-group-title">
                      <CarFront style={{ width: 13, height: 13, color: '#0f172a' }} />
                      <span>Vehicle Brand</span>
                    </div>
                    {expandedSections.vehicle ? (
                      <ChevronUp className="shop-filter-chevron" />
                    ) : (
                      <ChevronDown className="shop-filter-chevron" />
                    )}
                  </button>
                  {expandedSections.vehicle && (
                    <div className="shop-filter-pills-wrap" style={{ gap: '5px' }}>
                      <button
                        type="button"
                        onClick={() => handleVehicleBrandChange('all')}
                        className={`shop-pill-chip ${selectedVehicleBrand === 'all' ? 'active' : ''}`}
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                      >
                        <span>All Brands</span>
                      </button>
                      {catalogBrandOptions.map(([brandName, count]) => {
                        const isSelected = selectedVehicleBrand.toLowerCase() === brandName.toLowerCase();
                        return (
                          <button
                            key={brandName}
                            type="button"
                            onClick={() => handleVehicleBrandChange(isSelected ? 'all' : brandName)}
                            className={`shop-pill-chip ${isSelected ? 'active' : ''}`}
                            title={`Filter by ${brandName}`}
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                          >
                            <span>{brandName}</span>
                            <span className="count">({count})</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Fit Type (Live counts from Database Products) */}
              {products.length > 0 && (
                <div className="shop-filter-group">
                  <button
                    type="button"
                    className="shop-filter-group-header"
                    onClick={() => setExpandedSections((prev) => ({ ...prev, fit: !prev.fit }))}
                    aria-expanded={expandedSections.fit}
                  >
                    <div className="shop-filter-group-title">
                      <CarFront style={{ width: 13, height: 13, color: '#0f172a' }} />
                      <span>Fit Type</span>
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
                      {fitCounts.custom > 0 && (
                        <button
                          type="button"
                          className={`shop-pill-chip ${fitType === 'c' ? 'active' : ''}`}
                          onClick={() => setFitType('c')}
                          style={{ padding: '5px 13px', fontSize: '11.5px' }}
                        >
                          <span>Custom fit</span>
                          <span className="count">({fitCounts.custom})</span>
                        </button>
                      )}
                      {fitCounts.universal > 0 && (
                        <button
                          type="button"
                          className={`shop-pill-chip ${fitType === 'u' ? 'active' : ''}`}
                          onClick={() => setFitType('u')}
                          style={{ padding: '5px 13px', fontSize: '11.5px' }}
                        >
                          <span>Universal</span>
                          <span className="count">({fitCounts.universal})</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Price (Live dynamic bands computed from Database Products) */}
              {priceBands.length > 0 && (
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
              )}

              {/* Product Series (100% Live from Database Products) */}
              {seriesOptions.length > 0 && (
                <div className="shop-filter-group">
                  <button
                    type="button"
                    className="shop-filter-group-header"
                    onClick={() => setExpandedSections((prev) => ({ ...prev, series: !prev.series }))}
                    aria-expanded={expandedSections.series}
                  >
                    <div className="shop-filter-group-title">
                      <Layers style={{ width: 13, height: 13, color: '#0f172a' }} />
                      <span>Product Series</span>
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
                        onClick={() => handleSeriesChange('all')}
                        style={{ padding: '5px 13px', fontSize: '11.5px' }}
                      >
                        All
                      </button>
                      {seriesOptions.map(([series, count]) => (
                        <button
                          key={series}
                          type="button"
                          className={`shop-pill-chip ${seriesFilter.toLowerCase() === series.toLowerCase() ? 'active' : ''}`}
                          onClick={() => handleSeriesChange(series)}
                          style={{ padding: '5px 13px', fontSize: '11.5px' }}
                        >
                          <span>{formatSeriesLabel(series)}</span>
                          <span className="count">({count})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mobile-filter-drawer-actions">
              <button type="button" className="btn dark" onClick={() => setIsFilterOpen(false)}>
                Apply filters
              </button>
              <button type="button" className="mobile-filter-reset-action" onClick={resetAllFilters}>
                Reset
              </button>
            </div>
          </aside>

          {/* RIGHT COLUMN: EDITORIAL RESULTS TOOLBAR + PRODUCT GRID */}
          <div
            className="shop-products-column"
            ref={resultsColumnRef}
            style={
              isSearching && stableResultsHeightRef.current > 0
                ? { minHeight: stableResultsHeightRef.current }
                : undefined
            }
          >
            {/* CLEAN RESULTS TOOLBAR (Breadcrumb + Live Count on Left, Sort on Right) */}
            <div className="shop-results-bar">
              <div className="shop-results-left">
                <nav className="shop-breadcrumb-bar" aria-label="Breadcrumb">
                  {collection === 'all' && !activeMasterGroupObj && !activeSubCategoryObj ? (
                    <span className="shop-breadcrumb-current">All Parts</span>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="shop-breadcrumb-btn"
                        onClick={resetAllFilters}
                      >
                        Shop
                      </button>
                      {collection === 'new' && (
                        <>
                          <span>/</span>
                          <span className="shop-breadcrumb-current">New Arrivals</span>
                        </>
                      )}
                      {collection === 'bestsellers' && (
                        <>
                          <span>/</span>
                          <span className="shop-breadcrumb-current">Best Sellers</span>
                        </>
                      )}
                      {activeMasterGroupObj && (
                        <>
                          <span>/</span>
                          {activeSubCategoryObj && activeSubCategoryObj.id !== activeMasterGroupObj.id ? (
                            <button
                              type="button"
                              className="shop-breadcrumb-btn"
                              onClick={() => handleGroupSelect(activeMasterGroupObj.slug)}
                            >
                              {activeMasterGroupObj.name}
                            </button>
                          ) : (
                            <span className="shop-breadcrumb-current">{activeMasterGroupObj.name}</span>
                          )}
                        </>
                      )}
                      {activeSubCategoryObj && activeSubCategoryObj.id !== activeMasterGroupObj?.id && (
                        <>
                          <span>/</span>
                          <span className="shop-breadcrumb-current">{activeSubCategoryObj.name}</span>
                        </>
                      )}
                    </>
                  )}
                </nav>
                <span className="shop-results-count">
                  {catalogStatus === 'ready'
                    ? `${filteredProducts.length} ${filteredProducts.length === 1 ? 'product' : 'products'}`
                    : 'Loading…'}
                </span>
              </div>

              <div className="shop-sort-wrap">
                <div className="mobile-filter-btn-bar">
                  <button
                    type="button"
                    className="shop-mobile-filter-btn"
                    onClick={() => setIsFilterOpen(true)}
                    aria-label="Open product filters"
                  >
                    <SlidersHorizontal size={14} />
                    <span>Filters</span>
                    {activeFilterCount > 0 && (
                      <span className="shop-mobile-filter-badge">{activeFilterCount}</span>
                    )}
                  </button>
                </div>

                <div className="sort-select-container">
                  <span className="sort-label">Sort by</span>
                  <select
                    className="shop-sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    aria-label="Sort products"
                  >
                    <option value="pop">
                      {collection === 'new'
                        ? 'Newest first'
                        : collection === 'bestsellers'
                        ? 'Best selling'
                        : 'Recommended'}
                    </option>
                    {collection !== 'new' && <option value="new">Newest first</option>}
                    <option value="lo">Price: low to high</option>
                    <option value="hi">Price: high to low</option>
                    <option value="rt">Top rated</option>
                    <option value="save">Biggest savings</option>
                  </select>
                  <ChevronDown className="sort-chevron" />
                </div>
              </div>
            </div>

            {/* CONTEXTUAL SIBLING SUBCATEGORIES (Only shown when drilled into a Master Group) */}
            {showSiblingSubcats && activeMasterGroupObj && (
              <div className="shop-subcat-strip" aria-label={`Subcategories in ${activeMasterGroupObj.name}`}>
                <button
                  type="button"
                  className={`shop-subcat-chip ${category === 'all' ? 'active' : ''}`}
                  onClick={() => handleGroupSelect(activeMasterGroupObj.slug)}
                >
                  {isUrl(activeMasterGroupObj.artKey) && (
                    <img
                      src={activeMasterGroupObj.artKey}
                      alt=""
                      style={{ width: '15px', height: '15px', borderRadius: '3px', objectFit: 'cover' }}
                    />
                  )}
                  <span>All {activeMasterGroupObj.name}</span>
                </button>
                {activeMasterGroupObj.children.map((sub) => {
                  const isSubActive = activeSubCategoryObj?.id === sub.id;
                  const chipThumb = isUrl(sub.artKey)
                    ? sub.artKey
                    : (isUrl(activeMasterGroupObj.artKey) ? activeMasterGroupObj.artKey : null);
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      className={`shop-subcat-chip ${isSubActive ? 'active' : ''}`}
                      onClick={() => handleCategorySelect(sub.slug, activeMasterGroupObj.slug)}
                    >
                      {chipThumb && (
                        <img
                          src={chipThumb}
                          alt=""
                          style={{ width: '15px', height: '15px', borderRadius: '3px', objectFit: 'cover' }}
                        />
                      )}
                      <span>{sub.name}</span>
                      {sub.productCount > 0 && (
                        <span style={{ opacity: 0.65, fontSize: '11px' }}>({sub.productCount})</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ACTIVE FILTERS CHIPS */}
            {hasActiveFilters && (
              <div className="active-filters-bar" style={{ marginBottom: '16px' }}>
                <span className="title">Active filters:</span>
                {collection !== 'all' && (
                  <button
                    type="button"
                    className="active-filter-chip"
                    onClick={() => handleCollectionSelect('all')}
                  >
                    <span>Collection: {collection === 'new' ? 'New Arrivals' : 'Best Sellers'}</span>
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                )}
                {activeMasterGroupObj && (
                  <button
                    type="button"
                    className="active-filter-chip"
                    onClick={() => handleGroupSelect('all')}
                  >
                    <span>Department: {activeMasterGroupObj.name}</span>
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                )}
                {category !== 'all' && (
                  <button
                    type="button"
                    className="active-filter-chip"
                    onClick={() => handleCategorySelect('all', activeMasterGroupObj?.slug ?? null)}
                  >
                    <span>Subcategory: {activeCategoryLabel}</span>
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                )}
                {selectedVehicleBrand !== 'all' && (
                  <button
                    type="button"
                    className="active-filter-chip"
                    onClick={() => handleVehicleBrandChange('all')}
                  >
                    <span>Car: {selectedVehicleBrand}{selectedVehicleModel !== 'all' ? ` ${selectedVehicleModel}` : ''}</span>
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
                    onClick={() => handleSeriesChange('all')}
                  >
                    <span>Series: {formatSeriesLabel(seriesFilter)}</span>
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                )}
                {dealsOnly && (
                  <button
                    type="button"
                    className="active-filter-chip"
                    onClick={() => {
                      setDealsOnly(false);
                      updateUrlFilters({ deals: null });
                    }}
                  >
                    <span>Deals Only</span>
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                )}
                {Boolean(searchQuery.trim()) && (
                  <button
                    type="button"
                    className="active-filter-chip"
                    onClick={handleClearSearch}
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
                    const bestRank = bestSellerRankMap.get(p.id);
                    const collectionBadge =
                      collection === 'new'
                        ? { type: 'new' as const, label: 'New Arrival' }
                        : collection === 'bestsellers' && bestRank
                        ? {
                            type: 'best' as const,
                            label: bestRank <= 3 ? `#${bestRank} Best Seller` : 'Best Seller',
                          }
                        : null;

                    return (
                      <ProductCard
                        key={p.id}
                        product={p}
                        isFav={isFav(p.id)}
                        onToggleFav={toggleFav}
                        onAddToCart={addToCart}
                        onOpenCart={openCart}
                        fitText={activeCar ? fitBadgeText(p, activeCar) : null}
                        isCustomFitBadge={custom}
                        collectionBadge={collectionBadge}
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

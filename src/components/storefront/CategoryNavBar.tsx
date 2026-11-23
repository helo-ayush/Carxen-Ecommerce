'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  CarFront,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  Shield,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { StorefrontCategory } from '@/lib/storefront/types';
import { formatSeriesLabel, type Product } from '@/data/products';

const MAX_MAIN_NAV_GROUPS = 3;
const MORE_MENU_ID = '__more__';

export function CategoryDeptIcon({
  slug,
  name,
  size = 16,
}: {
  slug?: string | null;
  name?: string | null;
  size?: number;
}) {
  const text = `${slug || ''} ${name || ''}`.toLowerCase();
  if (text.includes('seat') || text.includes('cushion') || text.includes('armrest')) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3h6a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
        <path d="M7 10h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z" />
      </svg>
    );
  }
  if (text.includes('mat') || text.includes('floor') || text.includes('trunk') || text.includes('boot')) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2l-1 12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6z" />
        <path d="M8 9h8M8 12h8M8 15h8" />
      </svg>
    );
  }
  if (text.includes('steer') || text.includes('wheel') || text.includes('knob')) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
      </svg>
    );
  }
  if (text.includes('exterior') || text.includes('cover') || text.includes('visor') || text.includes('sunshade')) {
    return <Shield size={size} />;
  }
  if (text.includes('care') || text.includes('polish') || text.includes('clean') || text.includes('microfiber')) {
    return <Sparkles size={size} />;
  }
  if (text.includes('interior')) {
    return <CarFront size={size} />;
  }
  return <Wrench size={size} />;
}

function isUrl(val?: string | null): val is string {
  if (!val) return false;
  const t = val.trim();
  return t.startsWith('http://') || t.startsWith('https://') || t.startsWith('/') || t.startsWith('data:image');
}

function SubcategoryVisualThumb({
  sub,
  products,
}: {
  sub: StorefrontCategory;
  products: Product[];
}) {
  if (isUrl(sub.artKey)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={sub.artKey} alt={sub.name} loading="lazy" />;
  }

  const sampleProduct = products.find(
    (p) =>
      p.image &&
      (p.categoryId === sub.id || p.c.toLowerCase() === sub.slug.toLowerCase()),
  );
  if (sampleProduct?.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={sampleProduct.image} alt={sub.name} loading="lazy" />;
  }

  const text = `${sub.slug} ${sub.name}`.toLowerCase();

  if (text.includes('seat')) {
    return (
      <svg viewBox="0 0 320 400" aria-hidden="true">
        <use href="#a-seat" />
      </svg>
    );
  }
  if (text.includes('trunk') || text.includes('boot')) {
    return (
      <svg viewBox="0 0 320 220" aria-hidden="true">
        <use href="#a-trunk" />
      </svg>
    );
  }
  if (text.includes('mat') || text.includes('floor')) {
    return (
      <svg viewBox="0 0 400 300" aria-hidden="true">
        <use href="#a-mats" />
      </svg>
    );
  }
  if (text.includes('steer') || text.includes('wheel') || text.includes('knob')) {
    return (
      <svg viewBox="0 0 320 320" aria-hidden="true">
        <use href="#a-wheel" />
      </svg>
    );
  }
  if (text.includes('pillow') || text.includes('neck') || text.includes('lumbar') || text.includes('cushion')) {
    return (
      <svg viewBox="0 0 320 200" aria-hidden="true">
        <use href="#a-pillow" />
      </svg>
    );
  }
  if (text.includes('armrest') || text.includes('console')) {
    return (
      <svg viewBox="0 0 320 200" aria-hidden="true">
        <use href="#a-arm" />
      </svg>
    );
  }
  if (text.includes('body') || text.includes('car-cover') || text.includes('cover')) {
    return (
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <path d="M10 38c1-7 5-14 11-16h22c6 2 10 9 11 16l2 4a4 4 0 0 1-4 6H12a4 4 0 0 1-4-6l2-4Z" fill="#e2231a" />
        <path d="M18 24h28l4 10H14l4-10Z" fill="#111114" opacity="0.5" />
        <path d="M14 42h36" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
        <circle cx="20" cy="46" r="4.5" fill="#18181b" stroke="#cbd5e1" strokeWidth="1.5" />
        <circle cx="44" cy="46" r="4.5" fill="#18181b" stroke="#cbd5e1" strokeWidth="1.5" />
      </svg>
    );
  }
  if (text.includes('sunshade') || text.includes('curtain') || text.includes('visor')) {
    return (
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <path d="M12 42L20 20h26l8 22H12Z" fill="#334155" stroke="#94a3b8" strokeWidth="2" strokeLinejoin="round" />
        <path d="M22 25h22M19 31h28M16 37h34" stroke="#f5b82e" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
      </svg>
    );
  }
  if (text.includes('polish') || text.includes('clean') || text.includes('care')) {
    return (
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect x="22" y="22" width="20" height="30" rx="5" fill="#e2231a" />
        <rect x="27" y="14" width="10" height="8" rx="2" fill="#e2e8f0" />
        <path d="M24 14h18l4 4" stroke="#f5b82e" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="25" y="30" width="14" height="12" rx="2" fill="#ffffff" opacity="0.88" />
      </svg>
    );
  }
  if (text.includes('microfiber') || text.includes('towel') || text.includes('mitt')) {
    return (
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect x="12" y="18" width="32" height="24" rx="5" fill="#f5b82e" />
        <rect x="20" y="24" width="32" height="24" rx="5" fill="#38bdf8" stroke="#111114" strokeWidth="2" />
        <path d="M26 32h20M26 38h14" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return <CategoryDeptIcon slug={sub.slug} name={sub.name} size={22} />;
}

/**
 * CarXen Unified Sticky Department Bar & Editorial Visual Mega-Menu.
 * Caps inline navbar groups to at most 3 Main Groups (configurable in VEDA ERP,
 * defaulting to the first 3); all remaining groups live inside the 4th "More ▾" dropdown.
 */
export function StorefrontCategoryBar() {
  const { categories, mainNavCategoryIds, products } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeCollection = (searchParams.get('collection') || '').toLowerCase();
  const activeGroupSlug = (searchParams.get('group') || '').toLowerCase();
  const activeCatSlug = (searchParams.get('cat') || '').toLowerCase();
  const isShopRoute = pathname === '/shop';
  const isAllPartsActive =
    isShopRoute && !activeCollection && !activeGroupSlug && !activeCatSlug;

  // Split live Master Groups into Main (max 3, preserving VEDA order) and More (all overflow)
  const { mainGroups, moreGroups } = useMemo(() => {
    if (categories.length === 0) {
      return { mainGroups: [] as StorefrontCategory[], moreGroups: [] as StorefrontCategory[] };
    }
    const byId = new Map(categories.map((c) => [c.id, c]));
    let resolvedMain: StorefrontCategory[] = [];

    if (mainNavCategoryIds.length > 0) {
      resolvedMain = mainNavCategoryIds
        .map((id) => byId.get(id))
        .filter((c): c is StorefrontCategory => Boolean(c))
        .slice(0, MAX_MAIN_NAV_GROUPS);
    } else if (categories.some((c) => c.isMainNav === true)) {
      resolvedMain = categories.filter((c) => c.isMainNav === true).slice(0, MAX_MAIN_NAV_GROUPS);
    } else if (categories.every((c) => c.isMainNav === false)) {
      // Owner explicitly moved every group into More
      resolvedMain = [];
    } else {
      resolvedMain = categories.slice(0, MAX_MAIN_NAV_GROUPS);
    }

    const mainIdSet = new Set(resolvedMain.map((g) => g.id));
    const overflow = categories.filter((g) => !mainIdSet.has(g.id));
    return { mainGroups: resolvedMain, moreGroups: overflow };
  }, [categories, mainNavCategoryIds]);

  const isMoreGroupActive = useMemo(
    () =>
      isShopRoute &&
      moreGroups.some(
        (g) =>
          activeGroupSlug === g.slug.toLowerCase() ||
          g.children.some((c) => c.slug.toLowerCase() === activeCatSlug),
      ),
    [isShopRoute, moreGroups, activeGroupSlug, activeCatSlug],
  );

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpenMenuId(null);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuId(null);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const scheduleClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setOpenMenuId(null), 150);
  };

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const isMoreMenuOpen = openMenuId === MORE_MENU_ID;

  const openCategory: StorefrontCategory | null = useMemo(
    () =>
      openMenuId && openMenuId !== MORE_MENU_ID
        ? categories.find((c) => c.id === openMenuId) ?? null
        : null,
    [categories, openMenuId],
  );

  // Live VEDA Series inside the currently opened Master Group
  const openCategorySeries = useMemo(() => {
    if (!openCategory) return [];
    const catIds = new Set([openCategory.id, ...openCategory.children.map((c) => c.id)]);
    const catSlugs = new Set([
      openCategory.slug.toLowerCase(),
      ...openCategory.children.map((c) => c.slug.toLowerCase()),
    ]);
    const counts = new Map<string, number>();
    for (const p of products) {
      const inGroup =
        (p.categoryId && catIds.has(p.categoryId)) ||
        catSlugs.has((p.c || '').toLowerCase());
      if (!inGroup) continue;
      const s = (p.s || '').trim();
      if (!s) continue;
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [openCategory, products]);

  return (
    <nav
      ref={barRef}
      className="cx-catbar"
      onMouseLeave={scheduleClose}
      onMouseEnter={cancelClose}
      aria-label="Shop Collections and Departments"
    >
      <div className="wrap cx-catbar-inner">
        <Link
          href="/shop"
          className={`cx-catbar-trigger ${isAllPartsActive ? 'active' : ''}`}
          onMouseEnter={() => setOpenMenuId(null)}
        >
          <span>All Parts</span>
        </Link>

        <Link
          href="/shop?collection=new"
          className={`cx-catbar-trigger ${
            isShopRoute && activeCollection === 'new' ? 'active' : ''
          }`}
          onMouseEnter={() => setOpenMenuId(null)}
        >
          <span className="cx-catbar-dot" aria-hidden="true" />
          <span>New Arrivals</span>
        </Link>

        <Link
          href="/shop?collection=bestsellers"
          className={`cx-catbar-trigger ${
            isShopRoute && activeCollection === 'bestsellers' ? 'active' : ''
          }`}
          onMouseEnter={() => setOpenMenuId(null)}
        >
          <span className="cx-catbar-star" aria-hidden="true">★</span>
          <span>Best Sellers</span>
        </Link>

        {categories.length > 0 && <span className="cx-catbar-divider" aria-hidden="true" />}

        {/* Up to 3 Main Navbar Master Groups */}
        {mainGroups.map((group) => {
          const hasChildren = group.children.length > 0;
          const isGroupActive =
            isShopRoute &&
            (activeGroupSlug === group.slug.toLowerCase() ||
              group.children.some((c) => c.slug.toLowerCase() === activeCatSlug));
          const isOpen = openMenuId === group.id;

          if (!hasChildren) {
            return (
              <div key={group.id} className="cx-catbar-item">
                <Link
                  href={`/shop?group=${encodeURIComponent(group.slug)}`}
                  className={`cx-catbar-trigger ${isGroupActive ? 'active' : ''}`}
                  onMouseEnter={() => setOpenMenuId(null)}
                >
                  <span>{group.name}</span>
                </Link>
              </div>
            );
          }

          return (
            <div key={group.id} className="cx-catbar-item">
              <button
                type="button"
                className={`cx-catbar-trigger ${isGroupActive ? 'active' : ''} ${isOpen ? 'open' : ''}`}
                aria-expanded={isOpen}
                onMouseEnter={() => {
                  cancelClose();
                  setOpenMenuId(group.id);
                }}
                onClick={() => {
                  if (isOpen) {
                    setOpenMenuId(null);
                    router.push(`/shop?group=${encodeURIComponent(group.slug)}`);
                  } else {
                    setOpenMenuId(group.id);
                  }
                }}
              >
                <span>{group.name}</span>
                <ChevronDown className="cx-chev" />
              </button>
            </div>
          );
        })}

        {/* 4th Slot: "More ▾" Dropdown revealing overflow + all groups */}
        {moreGroups.length > 0 && (
          <div className="cx-catbar-item">
            <button
              type="button"
              className={`cx-catbar-trigger ${isMoreGroupActive ? 'active' : ''} ${isMoreMenuOpen ? 'open' : ''}`}
              aria-expanded={isMoreMenuOpen}
              onMouseEnter={() => {
                cancelClose();
                setOpenMenuId(MORE_MENU_ID);
              }}
              onClick={() =>
                setOpenMenuId((prev) => (prev === MORE_MENU_ID ? null : MORE_MENU_ID))
              }
            >
              <LayoutGrid size={13} style={{ opacity: 0.78 }} />
              <span>More</span>
              <ChevronDown className="cx-chev" />
            </button>
          </div>
        )}
      </div>

      {/* MEGA-MENU PANEL FOR A SPECIFIC MAIN MASTER GROUP */}
      {openCategory && (
        <div
          className="cx-megamenu"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          role="region"
          aria-label={`${openCategory.name} subcategories`}
        >
          <div className="cx-megamenu-inner">
            <div className="cx-megamenu-head">
              <div>
                <span className="cx-megamenu-eyebrow">
                  Department · {openCategory.children.length}{' '}
                  {openCategory.children.length === 1 ? 'Subcategory' : 'Subcategories'}
                </span>
                <h3 className="cx-megamenu-title">{openCategory.name}</h3>
                {openCategory.description && (
                  <p className="cx-megamenu-desc">{openCategory.description}</p>
                )}
              </div>
              <Link
                href={`/shop?group=${encodeURIComponent(openCategory.slug)}`}
                className="cx-megamenu-viewall"
                onClick={() => setOpenMenuId(null)}
              >
                <span>
                  Explore all
                  {openCategory.totalProductCount > 0 ? ` (${openCategory.totalProductCount})` : ''}
                </span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="cx-megamenu-grid">
              {openCategory.children.map((sub) => {
                const isSubActive = activeCatSlug === sub.slug.toLowerCase();
                return (
                  <Link
                    key={sub.id}
                    href={`/shop?group=${encodeURIComponent(openCategory.slug)}&cat=${encodeURIComponent(sub.slug)}`}
                    className={`cx-megamenu-card ${isSubActive ? 'active' : ''}`}
                    onClick={() => setOpenMenuId(null)}
                  >
                    <div className="cx-megamenu-thumb">
                      <SubcategoryVisualThumb sub={sub} products={products} />
                    </div>
                    <div className="cx-megamenu-card-body">
                      <span className="cx-megamenu-card-name">{sub.name}</span>
                      <span className="cx-megamenu-card-meta">
                        {sub.productCount > 0
                          ? `${sub.productCount} ${sub.productCount === 1 ? 'product' : 'products'}`
                          : 'Browse category'}
                      </span>
                    </div>
                    <ChevronRight size={15} className="cx-megamenu-arrow" />
                  </Link>
                );
              })}
            </div>

            {openCategorySeries.length > 0 && (
              <div className="cx-megamenu-footer">
                <div className="cx-megamenu-series-wrap">
                  <span className="cx-megamenu-footer-label">Shop by Series:</span>
                  {openCategorySeries.map(([seriesName, count]) => (
                    <Link
                      key={seriesName}
                      href={`/shop?group=${encodeURIComponent(openCategory.slug)}&series=${encodeURIComponent(seriesName)}`}
                      className="cx-megamenu-series-pill"
                      onClick={() => setOpenMenuId(null)}
                    >
                      <span>{formatSeriesLabel(seriesName)}</span>
                      <span style={{ opacity: 0.6 }}>({count})</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MEGA-MENU PANEL FOR "MORE ▾" — REVEALS OVERFLOW & ALL DEPARTMENTS */}
      {isMoreMenuOpen && (
        <div
          className="cx-megamenu"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          role="region"
          aria-label="More departments and all categories"
        >
          <div className="cx-megamenu-inner">
            <div className="cx-megamenu-head">
              <div>
                <span className="cx-megamenu-eyebrow">
                  Additional Departments · {moreGroups.length} {moreGroups.length === 1 ? 'Department' : 'Departments'}
                </span>
                <h3 className="cx-megamenu-title">More Categories</h3>
              </div>
              <Link
                href="/shop"
                className="cx-megamenu-viewall"
                onClick={() => setOpenMenuId(null)}
              >
                <span>View All Parts ({products.length})</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {moreGroups.length > 0 && (
              <div className="cx-more-grid">
                {moreGroups.map((group) => {
                  const isGroupActive = activeGroupSlug === group.slug.toLowerCase();
                  return (
                    <div key={group.id} className={`cx-more-card ${isGroupActive ? 'active' : ''}`}>
                      <Link
                        href={`/shop?group=${encodeURIComponent(group.slug)}`}
                        className="cx-more-card-head"
                        onClick={() => setOpenMenuId(null)}
                      >
                        <div>
                          <div className="cx-more-card-title">{group.name}</div>
                          <div className="cx-more-card-count">
                            {group.totalProductCount > 0
                              ? `${group.totalProductCount} ${group.totalProductCount === 1 ? 'product' : 'products'}`
                              : group.children.length > 0
                              ? `${group.children.length} subcategories`
                              : 'Browse department'}
                          </div>
                        </div>
                        <ChevronRight size={15} className="cx-megamenu-arrow" />
                      </Link>
                      {group.children.length > 0 && (
                        <div className="cx-more-subpills">
                          {group.children.map((sub) => (
                            <Link
                              key={sub.id}
                              href={`/shop?group=${encodeURIComponent(group.slug)}&cat=${encodeURIComponent(sub.slug)}`}
                              className={`cx-more-subpill ${activeCatSlug === sub.slug.toLowerCase() ? 'active' : ''}`}
                              onClick={() => setOpenMenuId(null)}
                            >
                              {sub.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

/**
 * Landing-page Mega-Menu Trigger ("Categories ▾") integrated cleanly
 * into the hero navbar — uses the exact same CarXen Studio visual grid.
 */
export function LandingCategoriesDropdown() {
  const { categories, products } = useApp();
  const [open, setOpen] = useState(false);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const groupsWithChildren = useMemo(
    () => categories.filter((g) => g.children.length > 0),
    [categories],
  );

  const activeGroup = useMemo(
    () =>
      categories.find((g) => g.id === activeTabId) ??
      groupsWithChildren[0] ??
      categories[0] ??
      null,
    [categories, groupsWithChildren, activeTabId],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onOutside);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onOutside);
    };
  }, []);

  const scheduleClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setOpen(false), 180);
  };

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  if (categories.length === 0) {
    return <Link href="/shop">Categories</Link>;
  }

  return (
    <div
      ref={wrapRef}
      className="cx-landing-cat-wrap"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className={`cx-landing-cat-btn ${open ? 'open' : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>Categories</span>
        <ChevronDown size={13} className="cx-chev" />
      </button>

      {open && activeGroup && (
        <div
          className="cx-landing-mega"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="cx-landing-mega-tabs">
            {categories.map((group) => (
              <button
                key={group.id}
                type="button"
                className={`cx-landing-mega-tab ${activeGroup.id === group.id ? 'active' : ''}`}
                onMouseEnter={() => setActiveTabId(group.id)}
                onClick={() => setActiveTabId(group.id)}
              >
                <span>{group.name}</span>
                {group.totalProductCount > 0 && (
                  <span style={{ opacity: 0.72, fontSize: '11px' }}>({group.totalProductCount})</span>
                )}
              </button>
            ))}
          </div>

          {activeGroup.children.length > 0 ? (
            <div className="cx-megamenu-grid">
              {activeGroup.children.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/shop?group=${encodeURIComponent(activeGroup.slug)}&cat=${encodeURIComponent(sub.slug)}`}
                  className="cx-megamenu-card"
                  onClick={() => setOpen(false)}
                >
                  <div className="cx-megamenu-thumb">
                    <SubcategoryVisualThumb sub={sub} products={products} />
                  </div>
                  <div className="cx-megamenu-card-body">
                    <span className="cx-megamenu-card-name">{sub.name}</span>
                    <span className="cx-megamenu-card-meta">
                      {sub.productCount > 0
                        ? `${sub.productCount} ${sub.productCount === 1 ? 'product' : 'products'}`
                        : 'Browse category'}
                    </span>
                  </div>
                  <ChevronRight size={15} className="cx-megamenu-arrow" />
                </Link>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.68)', padding: '6px 0' }}>
              Browse all products in {activeGroup.name}.
            </p>
          )}

          <div className="cx-megamenu-footer">
            <div className="cx-landing-quick-links">
              <Link
                href="/shop?collection=new"
                className="cx-megamenu-series-pill"
                onClick={() => setOpen(false)}
              >
                <span className="cx-catbar-dot" aria-hidden="true" />
                <span>New Arrivals</span>
              </Link>
              <Link
                href="/shop?collection=bestsellers"
                className="cx-megamenu-series-pill"
                onClick={() => setOpen(false)}
              >
                <span className="cx-catbar-star" aria-hidden="true">★</span>
                <span>Best Sellers</span>
              </Link>
            </div>
            <Link
              href={`/shop?group=${encodeURIComponent(activeGroup.slug)}`}
              className="cx-megamenu-viewall"
              onClick={() => setOpen(false)}
            >
              <span>Explore all in {activeGroup.name}</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

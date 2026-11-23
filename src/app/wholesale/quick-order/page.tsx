'use client';
 
import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ProductArt } from '@/components/ProductArt';
import { formatINR } from '@/data/products';
import type { Product } from '@/data/products';
import { getWholesaleTiers } from '@/lib/storefront/wholesale-pricing';
import { categoryLabel, compareCategories, slugifyCategory, normalizeCategoryKey } from '@/lib/storefront/categories';
import { readFitment } from '@/lib/storefront/fitment';
import { WholesaleIcon } from '@/components/wholesale/WholesaleIcon';
import { CatalogState } from '@/components/CatalogState';
import { Plus, Minus, X, ArrowRight, Check, Layers } from 'lucide-react';
import '../wholesale.css';

export default function WholesaleQuickOrderPage() {
  const router = useRouter();
  const {
    user,
    isWholesaleApproved,
    authLoading,
    products,
    categories: categoryTree = [],
    flatCategories = [],
    catalogStatus,
    catalogError,
    retryCatalog,
    wholesaleBasket,
    wholesaleBasketSkuCount,
    wholesaleBasketCount,
    wholesaleBasketSubtotal,
    addToWholesaleBasket,
    b2bProfile,
    showToast,
    vehicleBrands,
  } = useApp();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login?redirect=/wholesale/quick-order');
      } else if (!isWholesaleApproved) {
        router.replace('/wholesale');
      }
    }
  }, [authLoading, isWholesaleApproved, router, user]);

  const [search, setSearch] = useState('');
  const [selectedMasterGroup, setSelectedMasterGroup] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('All Brands');

  // Active Master Group Object from configured Category Tree
  const activeMasterGroupObj = useMemo(() => {
    if (selectedMasterGroup === 'all') return null;
    return (
      categoryTree.find(
        (g) =>
          g.id === selectedMasterGroup ||
          g.slug === selectedMasterGroup ||
          slugifyCategory(g.slug) === slugifyCategory(selectedMasterGroup)
      ) ?? null
    );
  }, [selectedMasterGroup, categoryTree]);

  // Active Subcategory Object from configured Flat Categories
  const activeSubCategoryObj = useMemo(() => {
    if (selectedCategory === 'all') return null;
    return (
      flatCategories.find((c) => c.id === selectedCategory || c.slug === selectedCategory) ?? null
    );
  }, [selectedCategory, flatCategories]);

  // Contextual Subcategories available under the selected Master Department
  const availableSubcategories = useMemo(() => {
    if (activeMasterGroupObj) {
      return activeMasterGroupObj.children || [];
    }
    if (categoryTree.length > 0) {
      const allSubs: typeof flatCategories = [];
      for (const g of categoryTree) {
        if (Array.isArray(g.children)) {
          allSubs.push(...g.children);
        }
      }
      return allSubs;
    }
    return [];
  }, [activeMasterGroupObj, categoryTree, flatCategories]);

  // Live product counts aggregated per master category and subcategory
  const { masterCounts, subCounts } = useMemo(() => {
    const mCounts = new Map<string, number>();
    const sCounts = new Map<string, number>();

    for (const p of products) {
      const pSlug = slugifyCategory(p.c || '');
      const pNorm = normalizeCategoryKey(p.c || '');
      const pId = p.categoryId;
      const pLabel = p.categoryLabel?.toLowerCase();

      for (const group of categoryTree) {
        const groupValidIds = new Set([group.id, ...(group.children || []).map((c) => c.id)]);
        const groupValidSlugs = new Set([
          slugifyCategory(group.slug),
          ...(group.children || []).map((c) => slugifyCategory(c.slug)),
          ...(group.children || []).map((c) => normalizeCategoryKey(c.slug)),
        ]);
        const groupValidNames = new Set([
          group.name.toLowerCase(),
          ...(group.children || []).map((c) => c.name.toLowerCase()),
        ]);

        const matchesGroup =
          Boolean(pId && groupValidIds.has(pId)) ||
          groupValidSlugs.has(pSlug) ||
          groupValidSlugs.has(pNorm) ||
          Boolean(pLabel && groupValidNames.has(pLabel));

        if (matchesGroup) {
          mCounts.set(group.id, (mCounts.get(group.id) || 0) + 1);
        }

        for (const sub of group.children || []) {
          const sSlug = slugifyCategory(sub.slug || sub.name);
          const matchesSub =
            Boolean(pId && pId === sub.id) ||
            pSlug === sSlug ||
            pNorm === normalizeCategoryKey(sub.slug) ||
            Boolean(pLabel && pLabel === sub.name.toLowerCase());
          if (matchesSub) {
            sCounts.set(sub.id, (sCounts.get(sub.id) || 0) + 1);
          }
        }
      }
    }

    return { masterCounts: mCounts, subCounts: sCounts };
  }, [products, categoryTree]);

  // Fallback: Categories aggregated dynamically from VEDA products if no tree is configured
  const dynamicCategories = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of products) {
      map.set(product.c, product.categoryLabel?.trim() || categoryLabel(product.c));
    }
    return [
      ...[...map.entries()]
        .sort((a, b) => compareCategories({ key: a[0], label: a[1] }, { key: b[0], label: b[1] }))
        .map(([id, label]) => ({ id, label })),
    ];
  }, [products]);

  const handleSelectMasterGroup = (groupId: string) => {
    setSelectedMasterGroup(groupId);
    setSelectedCategory('all');
  };

  const handleSelectSubCategory = (subId: string) => {
    setSelectedCategory(subId);
  };

  const [draftQuantities, setDraftQuantities] = useState<Record<number, number>>({});

  const getProductMoq = (p: Product) => {
    if (typeof p.b2bMoq === 'number' && p.b2bMoq > 0) return p.b2bMoq;
    return 5;
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Two-Tier Category Filtering
      if (categoryTree.length > 0) {
        if (selectedCategory !== 'all') {
          const subNode = flatCategories.find(
            (c) => c.id === selectedCategory || c.slug === selectedCategory
          );
          if (subNode) {
            const pSlug = slugifyCategory(p.c || '');
            const cSlug = slugifyCategory(subNode.slug || subNode.name);
            const matchesId = p.categoryId === subNode.id;
            const matchesSlug =
              pSlug === cSlug || normalizeCategoryKey(p.c) === normalizeCategoryKey(subNode.slug);
            const matchesLabel = Boolean(
              p.categoryLabel && p.categoryLabel.toLowerCase() === subNode.name.toLowerCase()
            );
            if (!matchesId && !matchesSlug && !matchesLabel) return false;
          }
        } else if (selectedMasterGroup !== 'all' && activeMasterGroupObj) {
          const validIds = new Set([
            activeMasterGroupObj.id,
            ...activeMasterGroupObj.children.map((c) => c.id),
          ]);
          const validSlugs = new Set([
            slugifyCategory(activeMasterGroupObj.slug),
            ...activeMasterGroupObj.children.map((c) => slugifyCategory(c.slug)),
            ...activeMasterGroupObj.children.map((c) => normalizeCategoryKey(c.slug)),
          ]);
          const validNames = new Set([
            activeMasterGroupObj.name.toLowerCase(),
            ...activeMasterGroupObj.children.map((c) => c.name.toLowerCase()),
          ]);

          const matchesId = Boolean(p.categoryId && validIds.has(p.categoryId));
          const pSlug = slugifyCategory(p.c || '');
          const pNorm = normalizeCategoryKey(p.c || '');
          const matchesSlug = validSlugs.has(pSlug) || validSlugs.has(pNorm);
          const matchesLabel = Boolean(
            p.categoryLabel && validNames.has(p.categoryLabel.toLowerCase())
          );

          if (!matchesId && !matchesSlug && !matchesLabel) return false;
        }
      } else {
        if (selectedCategory !== 'all' && p.c !== selectedCategory) return false;
      }

      if (selectedBrand !== 'All Brands') {
        const brandQuery = selectedBrand.toLowerCase();
        const fit = readFitment(p);
        const fitmentStr = typeof p.fitment === 'object' ? JSON.stringify(p.fitment).toLowerCase() : String(p.fitment || '').toLowerCase();
        const nameStr = p.n.toLowerCase();
        const brandMatch =
          (fit.kind === 'vehicle' && fit.brand.toLowerCase() === brandQuery) ||
          fitmentStr.includes(brandQuery) ||
          nameStr.includes(brandQuery);
        const isUniversal = fit.kind === 'universal' || fitmentStr.includes('universal');
        if (!brandMatch && !isUniversal) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = p.n.toLowerCase().includes(q);
        const matchSku = (p.slug || `CX-${p.id}`).toLowerCase().includes(q);
        const matchSeries = p.s.toLowerCase().includes(q);
        const matchFit = typeof p.fitment === 'string' && p.fitment.toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchSeries && !matchFit) return false;
      }
      return true;
    });
  }, [
    products,
    categoryTree,
    flatCategories,
    selectedCategory,
    selectedMasterGroup,
    activeMasterGroupObj,
    selectedBrand,
    search,
  ]);

  const moqStats = useMemo(() => {
    const list = filteredProducts.length > 0 ? filteredProducts : products;
    if (list.length === 0) {
      return {
        value: 'Min 1 Unit',
        subtext: 'No active products available',
      };
    }
    const moqs = list.map((p) => getProductMoq(p));
    const min = Math.min(...moqs);
    const max = Math.max(...moqs);

    const value = min === max ? `Min ${min} Unit${min === 1 ? '' : 's'}` : `Min ${min}–${max} Units`;
    const subtext =
      min === max
        ? `Enforced at ${min} units/SKU to unlock factory discounts`
        : `Enforced range (${min}–${max} units) to unlock factory discounts`;

    return { value, subtext };
  }, [filteredProducts, products]);

  if (authLoading || !user || !isWholesaleApproved) {
    return null;
  }

  const handleQtyChange = (productId: number, val: number, moq: number) => {
    if (val <= 0) {
      setDraftQuantities((prev) => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      return;
    }
    setDraftQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(val, moq),
    }));
  };

  const handleFillAllMoqs = () => {
    const next: Record<number, number> = { ...draftQuantities };
    filteredProducts.forEach((p) => {
      const moq = getProductMoq(p);
      if (!next[p.id]) {
        next[p.id] = moq;
      }
    });
    setDraftQuantities(next);
    showToast(`Filled MOQs for all ${filteredProducts.length} visible items.`);
  };

  const handleAddRowToBasket = (p: Product) => {
    const moq = getProductMoq(p);
    const qty = draftQuantities[p.id] || moq;
    addToWholesaleBasket(p.id, qty);
    showToast(`Added ${qty} units of "${p.n}" to Wholesale Order Basket.`);
  };

  const handleAddAllDraftsToBasket = () => {
    let count = 0;
    filteredProducts.forEach((p) => {
      const moq = getProductMoq(p);
      const qty = draftQuantities[p.id] || moq;
      addToWholesaleBasket(p.id, qty);
      count++;
    });
    showToast(`Added ${count} products to Wholesale Order Basket.`);
  };

  const tierLabel = 'Verified Wholesale Pricing';

  if (catalogStatus !== 'ready') {
    return (
      <div className="ws-page-container" style={{ padding: '40px 20px' }}>
        <CatalogState status={catalogStatus} error={catalogError} onRetry={retryCatalog} />
      </div>
    );
  }

  return (
    <div className="ws-page-container">
      {/* Header Bar */}
      <div className="ws-header-bar">
        <div className="ws-header-titles">
          <div className="ws-breadcrumb-kicker">
            <WholesaleIcon name="quick-order" size={14} />
            <span>Procurement Matrix</span>
          </div>
          <h1>
            <WholesaleIcon name="quick-order" size={26} />
            Quick Order Matrix
          </h1>
          <p>
            High-speed SKU batch ordering with automatic MOQ enforcement and volume tier pricing.
            <strong> Direct factory fulfillment via CarXen with Razorpay online and COD checkout.</strong>
          </p>
        </div>

        <div className="ws-header-actions">
          <button type="button" onClick={handleFillAllMoqs} className="ws-btn-secondary" title="Set all item quantities to minimum order quantities">
            <WholesaleIcon name="spark" size={15} />
            <span>Fill All MOQs</span>
          </button>
          <button type="button" onClick={handleAddAllDraftsToBasket} className="ws-btn-secondary" title="Add all visible products to your basket">
            <WholesaleIcon name="check" size={15} />
            <span>Add All Visible ({filteredProducts.length})</span>
          </button>
          <Link href="/wholesale/order-basket" className="ws-btn-primary ws-btn-brand">
            <WholesaleIcon name="basket" size={15} />
            <span>Review Basket ({wholesaleBasketSkuCount} SKUs)</span>
          </Link>
        </div>
      </div>

      {/* Shadcn Metric Blocks */}
      <div className="ws-metrics-grid">
        <div className="ws-metric-card">
          <div className="ws-metric-header">
            <span className="ws-metric-title">Available Catalogue</span>
            <div className="ws-metric-icon-wrap">
              <WholesaleIcon name="catalogue" size={16} />
            </div>
          </div>
          <div className="ws-metric-value">{filteredProducts.length} <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>/ {products.length} SKUs</span></div>
          <div className="ws-metric-subtext">Direct automotive manufacturer parts</div>
        </div>

        <div className="ws-metric-card">
          <div className="ws-metric-header">
            <span className="ws-metric-title">Commercial Tier</span>
            <div className="ws-metric-icon-wrap brand">
              <WholesaleIcon name="tier" size={16} />
            </div>
          </div>
          <div className="ws-metric-value">{tierLabel}</div>
          <div className="ws-metric-subtext">Volume pricing automatically applied</div>
        </div>

        <div className="ws-metric-card">
          <div className="ws-metric-header">
            <span className="ws-metric-title">MOQ Policy</span>
            <div className="ws-metric-icon-wrap emerald">
              <WholesaleIcon name="shield" size={16} />
            </div>
          </div>
          <div className="ws-metric-value">{moqStats.value}</div>
          <div className="ws-metric-subtext">{moqStats.subtext}</div>
        </div>

        <div className="ws-metric-card">
          <div className="ws-metric-header">
            <span className="ws-metric-title">Active Basket</span>
            <div className="ws-metric-icon-wrap">
              <WholesaleIcon name="basket" size={16} />
            </div>
          </div>
          <div className="ws-metric-value">
            {wholesaleBasketSkuCount} <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>SKUs ({wholesaleBasketCount} units)</span>
          </div>
          <div className="ws-metric-subtext">
            {wholesaleBasketSubtotal > 0 ? `Est. Total: ${formatINR(wholesaleBasketSubtotal)}` : 'No items added yet'}
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="ws-filter-toolbar">
        <div className="ws-filter-row-primary">
          <div className="ws-search-input-wrap">
            <span className="ws-search-icon">
              <WholesaleIcon name="search" size={17} />
            </span>
            <input
              type="text"
              className="ws-search-input"
              placeholder="Filter by SKU, part name, vehicle fitment (e.g. Creta, Thar, Scorpio)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="ws-search-clear"
                title="Clear search"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

        </div>

        {/* Dynamic Vehicle Brand Pills */}
        <div className="ws-brand-chips-row">
          <span className="ws-brand-chips-label">Vehicle Brand:</span>
          {['All Brands', ...vehicleBrands].map((b) => (
            <button
              key={b}
              type="button"
              className={`ws-category-chip ${selectedBrand === b ? 'active' : ''}`}
              style={{ fontSize: '12px', padding: '4px 12px' }}
              onClick={() => setSelectedBrand(b)}
            >
              {b}
            </button>
          ))}
        </div>

        {/* Two-Tier B2C-Style Category Hierarchy */}
        {categoryTree.length > 0 ? (
          <div className="ws-category-hierarchy-container">
            {/* Tier 1: Master Departments Strip */}
            <div className="ws-master-cat-strip" aria-label="Master Product Departments">
              <button
                type="button"
                className={`ws-master-cat-tab ${selectedMasterGroup === 'all' && selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => handleSelectMasterGroup('all')}
              >
                <Layers size={14} />
                <span>All Departments</span>
                <span className="ws-master-cat-count">{products.length}</span>
              </button>

              {categoryTree.map((group) => {
                const count = masterCounts.get(group.id) ?? group.totalProductCount ?? 0;
                const isGroupActive = selectedMasterGroup === group.id;

                return (
                  <button
                    key={group.id}
                    type="button"
                    className={`ws-master-cat-tab ${isGroupActive ? 'active' : ''}`}
                    onClick={() => handleSelectMasterGroup(group.id)}
                  >
                    <span>{group.name}</span>
                    <span className="ws-master-cat-count">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Tier 2: Subcategory Strip (Contextual) */}
            {availableSubcategories.length > 0 && (
              <div className="ws-subcat-strip" aria-label="Product Subcategories">
                <button
                  type="button"
                  className={`ws-subcat-chip ${selectedCategory === 'all' ? 'active' : ''}`}
                  onClick={() => handleSelectSubCategory('all')}
                >
                  <span>
                    {activeMasterGroupObj ? `All ${activeMasterGroupObj.name}` : 'All Subcategories'}
                  </span>
                </button>

                {availableSubcategories.map((sub) => {
                  const count = subCounts.get(sub.id) ?? sub.productCount ?? 0;
                  const isSubActive = selectedCategory === sub.id;

                  return (
                    <button
                      key={sub.id}
                      type="button"
                      className={`ws-subcat-chip ${isSubActive ? 'active' : ''}`}
                      onClick={() => handleSelectSubCategory(sub.id)}
                    >
                      <span>{sub.name}</span>
                      <span className="ws-subcat-count">({count})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Fallback: Flat dynamic category chips if no tree is configured */
          <div className="ws-category-chips" style={{ paddingTop: '10px', borderTop: '1px solid var(--ws-border-light)' }}>
            <button
              type="button"
              className={`ws-category-chip ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              All Categories
            </button>
            {dynamicCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`ws-category-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Active Filters Bar if any filter is active */}
        {(selectedMasterGroup !== 'all' || selectedCategory !== 'all' || selectedBrand !== 'All Brands' || search) && (
          <div className="ws-active-filters-bar">
            <span className="ws-active-filters-label">Active Filters:</span>
            {selectedMasterGroup !== 'all' && activeMasterGroupObj && (
              <button
                type="button"
                className="ws-active-filter-pill"
                onClick={() => handleSelectMasterGroup('all')}
                title="Remove department filter"
              >
                <span>Dept: {activeMasterGroupObj.name}</span>
                <X size={12} />
              </button>
            )}
            {selectedCategory !== 'all' && (
              <button
                type="button"
                className="ws-active-filter-pill"
                onClick={() => setSelectedCategory('all')}
                title="Remove subcategory filter"
              >
                <span>Subcat: {activeSubCategoryObj?.name || selectedCategory}</span>
                <X size={12} />
              </button>
            )}
            {selectedBrand !== 'All Brands' && (
              <button
                type="button"
                className="ws-active-filter-pill"
                onClick={() => setSelectedBrand('All Brands')}
                title="Remove vehicle brand filter"
              >
                <span>Brand: {selectedBrand}</span>
                <X size={12} />
              </button>
            )}
            {search && (
              <button
                type="button"
                className="ws-active-filter-pill"
                onClick={() => setSearch('')}
                title="Clear search filter"
              >
                <span>Search: &quot;{search}&quot;</span>
                <X size={12} />
              </button>
            )}
            <button
              type="button"
              className="ws-active-filters-clear-btn"
              onClick={() => {
                setSearch('');
                setSelectedMasterGroup('all');
                setSelectedCategory('all');
                setSelectedBrand('All Brands');
              }}
            >
              Reset All
            </button>
          </div>
        )}
      </div>

      {/* Quick Order Dense Matrix Table */}
      {filteredProducts.length === 0 ? (
        <div className="ws-empty-state-card">
          <div className="ws-empty-icon-wrap">
            <WholesaleIcon name="search" size={28} />
          </div>
          <h3>No matching factory parts found</h3>
          <p>We couldn't find any items matching &ldquo;{search}&rdquo;. Try clearing filters or searching by vehicle model name.</p>
          <button
            type="button"
            className="ws-btn-secondary"
            onClick={() => {
              setSearch('');
              setSelectedMasterGroup('all');
              setSelectedCategory('all');
              setSelectedBrand('All Brands');
            }}
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <>
          {/* DESKTOP MATRIX TABLE (min-width: 901px) */}
          <div className="ws-table-card ws-quick-order-desktop-table">
            <table className="ws-procurement-table ws-quick-order-table">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Product Line</th>
                  <th style={{ width: '13%' }}>SKU / Part #</th>
                  <th style={{ width: '7%' }}>MOQ</th>
                  <th style={{ width: '12%' }}>Wholesale Price</th>
                  <th style={{ width: '13%' }}>Volume Price (20+)</th>
                  <th style={{ width: '14%', minWidth: '95px', textAlign: 'center' }}>Batch Qty</th>
                  <th style={{ width: '16%', minWidth: '115px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const moq = getProductMoq(p);
                  const tiers = getWholesaleTiers(p);
                  const t1 = tiers[0]?.unitPrice || Math.round(p.p * 0.85);
                  const t2 = tiers[1]?.unitPrice || Math.round(p.p * 0.75);
                  const currentQty = draftQuantities[p.id] || wholesaleBasket[p.id] || moq;
                  const isInBasket = Boolean(wholesaleBasket[p.id]);
                  const isDraftDifferent = isInBasket && draftQuantities[p.id] && draftQuantities[p.id] !== wholesaleBasket[p.id];

                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="ws-prod-cell">
                          <Link href={`/wholesale/product/${p.id}`} className="ws-prod-art-thumb" title={`View ${p.n}`}>
                            <ProductArt product={p} />
                          </Link>
                          <div className="ws-prod-info">
                            <Link href={`/wholesale/product/${p.id}`} className="ws-prod-name" title={`View ${p.n}`}>
                              {p.n}
                            </Link>
                            <div className="ws-prod-meta">
                              {p.s && (
                                <span className="ws-prod-series-badge">
                                  {/\bseries$/i.test(p.s.trim()) ? p.s.trim() : `${p.s.trim()} Series`}
                                </span>
                              )}
                              {typeof p.fitment === 'string' && p.fitment ? (
                                <span className="ws-fitment-badge">{p.fitment}</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <Link href={`/wholesale/product/${p.id}`} className="ws-sku-badge" title={p.slug || `CX-${p.id}`}>
                          {p.slug || `CX-${p.id}`}
                        </Link>
                      </td>

                      <td>
                        <span className="ws-moq-badge">MOQ: {moq}</span>
                      </td>

                      <td>
                        <div className="ws-price-stack">
                          {p.p > t1 && (
                            <span className="ws-price-retail-strike">{formatINR(p.p)}</span>
                          )}
                          <span className="ws-price-wholesale">{formatINR(t1)}</span>
                        </div>
                      </td>

                      <td>
                        <div className="ws-price-tier2">
                          <span>{formatINR(t2)}</span>
                          <span style={{ fontSize: '11px', color: '#059669', opacity: 0.85 }}>(-25%)</span>
                        </div>
                      </td>

                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap', overflow: 'visible', paddingLeft: '4px', paddingRight: '4px' }}>
                        <div className="ws-stepper">
                          <button
                            type="button"
                            className="ws-stepper-btn"
                            onClick={() => handleQtyChange(p.id, currentQty - 1, moq)}
                            aria-label="Decrease quantity"
                            title={`Decrease (min ${moq})`}
                          >
                            <Minus size={13} />
                          </button>
                          <input
                            type="number"
                            min={moq}
                            className="ws-stepper-input"
                            value={currentQty}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              if (!isNaN(v)) {
                                handleQtyChange(p.id, v, moq);
                              }
                            }}
                            aria-label={`Batch Quantity for ${p.n}`}
                          />
                          <button
                            type="button"
                            className="ws-stepper-btn"
                            onClick={() => handleQtyChange(p.id, currentQty + 1, moq)}
                            aria-label="Increase quantity"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        {isInBasket && !isDraftDifferent ? (
                          <button
                            type="button"
                            onClick={() => handleAddRowToBasket(p)}
                            className="ws-row-action-btn in-basket"
                            title="Currently in your wholesale basket"
                          >
                            <Check size={13} />
                            <span>In Basket ({wholesaleBasket[p.id]})</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddRowToBasket(p)}
                            className="ws-row-action-btn"
                            title={isDraftDifferent ? 'Update quantity in basket' : 'Add to basket'}
                          >
                            <Plus size={13} />
                            <span>{isDraftDifferent ? `Update (${currentQty})` : `Add (${currentQty})`}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* COMPACT HIGH-DENSITY MOBILE LIST (max-width: 900px, Zero wasted white space) */}
          <div className="ws-quick-order-mobile-list">
            {filteredProducts.map((p) => {
              const moq = getProductMoq(p);
              const tiers = getWholesaleTiers(p);
              const t1 = tiers[0]?.unitPrice || Math.round(p.p * 0.85);
              const t2 = tiers[1]?.unitPrice || Math.round(p.p * 0.75);
              const currentQty = draftQuantities[p.id] || wholesaleBasket[p.id] || moq;
              const isInBasket = Boolean(wholesaleBasket[p.id]);
              const isDraftDifferent = isInBasket && draftQuantities[p.id] && draftQuantities[p.id] !== wholesaleBasket[p.id];

              return (
                <div key={p.id} className="ws-qo-card">
                  {/* Top: Thumbnail, Title & Badges in one compact group */}
                  <div className="ws-qo-top">
                    <Link href={`/wholesale/product/${p.id}`} className="ws-qo-thumb" title={`View ${p.n}`}>
                      <ProductArt product={p} />
                    </Link>
                    <div className="ws-qo-info">
                      <Link href={`/wholesale/product/${p.id}`} className="ws-qo-name" title={`View ${p.n}`}>
                        {p.n}
                      </Link>
                      <div className="ws-qo-badges">
                        {p.s && (
                          <span className="ws-prod-series-badge">
                            {/\bseries$/i.test(p.s.trim()) ? p.s.trim() : `${p.s.trim()} Series`}
                          </span>
                        )}
                        {typeof p.fitment === 'string' && p.fitment ? (
                          <span className="ws-fitment-badge">{p.fitment}</span>
                        ) : null}
                        <Link href={`/wholesale/product/${p.id}`} className="ws-sku-badge" title={p.slug || `CX-${p.id}`}>
                          {p.slug || `CX-${p.id}`}
                        </Link>
                        <span className="ws-moq-badge">MOQ: {moq}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Crisp Pricing & Volume Tier Bar */}
                  <div className="ws-qo-pricing">
                    <div className="ws-qo-price-group">
                      <span className="ws-qo-price-val">{formatINR(t1)}</span>
                      <span className="ws-qo-price-unit">/ unit</span>
                      {p.p > t1 && (
                        <span className="ws-price-retail-strike">{formatINR(p.p)}</span>
                      )}
                    </div>
                    <div className="ws-qo-tier-group">
                      <span className="ws-qo-tier-label">20+ Pcs:</span>
                      <span className="ws-qo-tier-val">{formatINR(t2)}</span>
                      <span className="ws-qo-tier-badge">-25%</span>
                    </div>
                  </div>

                  {/* Bottom: Stepper + Add to Basket on the same single row */}
                  <div className="ws-qo-bottom">
                    <div className="ws-stepper ws-qo-stepper">
                      <button
                        type="button"
                        className="ws-stepper-btn"
                        onClick={() => handleQtyChange(p.id, currentQty - 1, moq)}
                        aria-label="Decrease quantity"
                        title={`Decrease (min ${moq})`}
                      >
                        <Minus size={13} />
                      </button>
                      <input
                        type="number"
                        min={moq}
                        className="ws-stepper-input"
                        value={currentQty}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v)) {
                            handleQtyChange(p.id, v, moq);
                          }
                        }}
                        aria-label={`Batch Quantity for ${p.n}`}
                      />
                      <button
                        type="button"
                        className="ws-stepper-btn"
                        onClick={() => handleQtyChange(p.id, currentQty + 1, moq)}
                        aria-label="Increase quantity"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    {isInBasket && !isDraftDifferent ? (
                      <button
                        type="button"
                        onClick={() => handleAddRowToBasket(p)}
                        className="ws-row-action-btn in-basket ws-qo-action-btn"
                        title="Currently in your wholesale basket"
                      >
                        <Check size={14} />
                        <span>In Basket ({wholesaleBasket[p.id]})</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddRowToBasket(p)}
                        className="ws-row-action-btn ws-qo-action-btn"
                        title={isDraftDifferent ? 'Update quantity in basket' : 'Add to basket'}
                      >
                        <Plus size={14} />
                        <span>{isDraftDifferent ? `Update (${currentQty})` : `Add (${currentQty})`}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Floating Bottom Order Summary Dock */}
      {wholesaleBasketSkuCount > 0 && (
        <div className="ws-dock-bar">
          <div className="ws-dock-info">
            <div className="ws-dock-icon">
              <WholesaleIcon name="basket" size={20} />
            </div>
            <div>
              <div className="ws-dock-title">
                {wholesaleBasketSkuCount} SKUs Selected · {wholesaleBasketCount} Units
              </div>
              <div className="ws-dock-subtitle">
                Total Estimate: {formatINR(wholesaleBasketSubtotal)} · CarXen factory commercial release
              </div>
            </div>
          </div>

          <div className="ws-dock-actions">
            <Link href="/wholesale/catalog" className="ws-btn-secondary" style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}>
              Browse Catalogue
            </Link>
            <Link href="/wholesale/order-basket" className="ws-btn-primary ws-btn-brand">
              <span>Review Order Basket</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

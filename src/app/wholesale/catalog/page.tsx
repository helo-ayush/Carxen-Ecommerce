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
import { WholesaleProductCard } from '@/components/wholesale/WholesaleProductCard';
import { CatalogState } from '@/components/CatalogState';
import { Plus, Minus, X, ArrowRight, Check, LayoutGrid, TableProperties, Sparkles, Filter, Layers } from 'lucide-react';
import '../wholesale.css';

// Vehicle Brands and Models are dynamically aggregated from VEDA catalog products below.

export default function WholesaleCatalogPage() {
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
    b2bProfile,
    wholesaleBasket,
    wholesaleBasketSkuCount,
    wholesaleBasketCount,
    wholesaleBasketSubtotal,
    addToWholesaleBasket,
    showToast,
    vehicleBrands: appVehicleBrands,
    availableVehicles,
  } = useApp();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login?redirect=/wholesale/catalog');
      } else if (!isWholesaleApproved) {
        router.replace('/wholesale');
      }
    }
  }, [authLoading, isWholesaleApproved, router, user]);

  const [search, setSearch] = useState('');
  const [selectedMasterGroup, setSelectedMasterGroup] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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
    const labelToIds = new Map<string, string[]>();
    for (const product of products) {
      const label = product.categoryLabel?.trim() || categoryLabel(product.c);
      const existing = labelToIds.get(label) || [];
      if (!existing.includes(product.c)) existing.push(product.c);
      labelToIds.set(label, existing);
    }

    const uniqueCategories = [...labelToIds.entries()].map(([label, ids]) => ({
      id: ids[0],
      allIds: ids,
      label,
    }));

    uniqueCategories.sort((a, b) => compareCategories({ key: a.id, label: a.label }, { key: b.id, label: b.label }));

    return uniqueCategories;
  }, [products]);

  const handleSelectMasterGroup = (groupId: string) => {
    setSelectedMasterGroup(groupId);
    setSelectedCategory('all');
  };

  const handleSelectSubCategory = (subId: string) => {
    setSelectedCategory(subId);
  };

  // Vehicle Brands & Models aggregated dynamically from VEDA inventory & registry
  const { vehicleBrands, modelsByBrand } = useMemo(() => {
    const brandSet = new Set<string>(appVehicleBrands || []);
    const brandToModels = new Map<string, Set<string>>();

    for (const [b, models] of Object.entries(availableVehicles || {})) {
      brandSet.add(b);
      if (!brandToModels.has(b)) brandToModels.set(b, new Set());
      for (const m of models) brandToModels.get(b)!.add(m);
    }

    for (const product of products) {
      const fit = readFitment(product);
      if (fit.kind === 'vehicle' && fit.brand && fit.brand.toLowerCase() !== 'universal') {
        const b = fit.brand.trim();
        brandSet.add(b);
        if (!brandToModels.has(b)) brandToModels.set(b, new Set());
        if (fit.model && fit.model.toLowerCase() !== 'universal') {
          brandToModels.get(b)!.add(fit.model.trim());
        }
      }

      if (product.fitment && typeof product.fitment === 'object' && !Array.isArray(product.fitment)) {
        const rec = product.fitment as Record<string, any>;
        const b = typeof rec.brand === 'string' ? rec.brand.trim() : '';
        const m = typeof rec.model === 'string' ? rec.model.trim() : '';
        if (b && b.toLowerCase() !== 'universal') {
          brandSet.add(b);
          if (!brandToModels.has(b)) brandToModels.set(b, new Set());
          if (m && m.toLowerCase() !== 'universal') {
            brandToModels.get(b)!.add(m);
          }
        }
      }
    }

    const sortedBrands = ['All Brands', ...[...brandSet].sort((a, b) => a.localeCompare(b))];
    const modelsRecord: Record<string, string[]> = {};
    for (const [b, models] of brandToModels.entries()) {
      modelsRecord[b] = [...models].sort((a, b) => a.localeCompare(b));
    }

    return {
      vehicleBrands: sortedBrands,
      modelsByBrand: modelsRecord,
    };
  }, [products]);
  const [selectedBrand, setSelectedBrand] = useState<string>('All Brands');
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [rowQuantities, setRowQuantities] = useState<Record<number, number>>({});

  const getProductMoq = (p: Product) => Math.max(1, p.b2bMoq || 5);

  const getFitmentString = (p: Product): string => {
    if (!p.fitment) return 'Universal Fit / Multi-Vehicle';
    if (typeof p.fitment === 'string') return p.fitment;
    if (Array.isArray(p.fitment)) return p.fitment.join(', ');
    if (typeof p.fitment === 'object') {
      const obj = p.fitment as Record<string, any>;
      return `${obj.brand || ''} ${obj.model || ''} ${obj.year || ''}`.trim() || 'Custom-Fit';
    }
    return 'Custom-Fit Automotive';
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
        // Fallback for flat dynamic categories
        if (selectedCategory !== 'all') {
          const selectedCatObj = dynamicCategories.find((c) => c.id === selectedCategory);
          const matchingIds = selectedCatObj ? selectedCatObj.allIds : [selectedCategory];
          if (!matchingIds.includes(p.c) && p.categoryLabel !== selectedCatObj?.label) return false;
        }
      }

      const fitmentStr = getFitmentString(p).toLowerCase();
      const nameStr = p.n.toLowerCase();
      const fit = readFitment(p);

      // Brand filter (dynamically matched against VEDA product fitment)
      if (selectedBrand !== 'All Brands') {
        const brandQuery = selectedBrand.toLowerCase();
        const brandMatch =
          (fit.kind === 'vehicle' && fit.brand.toLowerCase() === brandQuery) ||
          fitmentStr.includes(brandQuery) ||
          nameStr.includes(brandQuery);
        const isUniversal = fit.kind === 'universal' || fitmentStr.includes('universal');
        if (!brandMatch && !isUniversal) return false;
      }

      // Model filter (dynamically matched against VEDA product model)
      if (selectedModel !== 'all') {
        const modelQuery = selectedModel.toLowerCase();
        const modelMatch =
          (fit.kind === 'vehicle' && fit.model.toLowerCase() === modelQuery) ||
          fitmentStr.includes(modelQuery) ||
          nameStr.includes(modelQuery);
        const isUniversal = fit.kind === 'universal' || fitmentStr.includes('universal');
        if (!modelMatch && !isUniversal) return false;
      }

      // Text Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = nameStr.includes(q);
        const matchSku = (p.slug || `CX-${p.id}`).toLowerCase().includes(q);
        const matchSeries = p.s.toLowerCase().includes(q);
        const matchFit = fitmentStr.includes(q);
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
    dynamicCategories,
    selectedBrand,
    selectedModel,
    search,
  ]);

  const handleRowQtyChange = (productId: number, val: number, moq: number, maxCustomQty: number | null = null) => {
    if (val <= 0) {
      setRowQuantities((prev) => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      return;
    }
    if (maxCustomQty !== null && maxCustomQty < moq) {
      return;
    }
    const clamped = maxCustomQty !== null ? Math.min(maxCustomQty, Math.max(val, moq)) : Math.max(val, moq);
    setRowQuantities((prev) => ({
      ...prev,
      [productId]: clamped,
    }));
  };

  const handleAddToBasket = (p: Product, customQty?: number) => {
    const moq = getProductMoq(p);
    const maxCustomQty = p.isCustomProduct ? Math.max(0, Math.floor(p.stockCount ?? 0)) : null;
    if (p.isCustomProduct && (p.inStock === false || (maxCustomQty ?? 0) <= 0)) {
      showToast(`${p.n} is currently out of stock.`);
      return;
    }
    if (maxCustomQty !== null && maxCustomQty < moq) {
      showToast(`Only ${maxCustomQty} unit(s) available for ${p.n}, below MOQ (${moq}).`);
      return;
    }
    const rawQty = customQty || rowQuantities[p.id] || moq;
    const qty = maxCustomQty !== null ? Math.min(maxCustomQty, Math.max(moq, rawQty)) : Math.max(moq, rawQty);
    addToWholesaleBasket(p.id, qty);
  };

  const handleFillAllVisibleMoqs = () => {
    const next: Record<number, number> = { ...rowQuantities };
    let filledCount = 0;
    filteredProducts.forEach((p) => {
      const moq = getProductMoq(p);
      const maxCustomQty = p.isCustomProduct ? Math.max(0, Math.floor(p.stockCount ?? 0)) : null;
      if (p.isCustomProduct && (p.inStock === false || (maxCustomQty ?? 0) < moq)) {
        return;
      }
      if (!next[p.id]) {
        next[p.id] = moq;
      }
      filledCount++;
    });
    setRowQuantities(next);
    showToast(`Filled MOQs for ${filledCount} available displayed items.`);
  };

  const handleAddAllToBasket = () => {
    let addedCount = 0;
    let skippedCount = 0;
    filteredProducts.forEach((p) => {
      const moq = getProductMoq(p);
      const maxCustomQty = p.isCustomProduct ? Math.max(0, Math.floor(p.stockCount ?? 0)) : null;
      if (p.isCustomProduct && (p.inStock === false || (maxCustomQty ?? 0) < moq)) {
        skippedCount++;
        return;
      }
      const rawQty = rowQuantities[p.id] || moq;
      const qty = maxCustomQty !== null ? Math.min(maxCustomQty, Math.max(moq, rawQty)) : Math.max(moq, rawQty);
      addToWholesaleBasket(p.id, qty);
      addedCount++;
    });
    if (addedCount === 0) {
      showToast('No visible wholesale items currently meet stock & MOQ requirements.');
      return;
    }
    showToast(
      skippedCount > 0
        ? `Added ${addedCount} available wholesale items to basket (skipped ${skippedCount} out-of-stock/below-MOQ).`
        : `Added ${addedCount} wholesale products to your Order Basket.`
    );
  };

  if (authLoading || !user || !isWholesaleApproved) {
    return null;
  }

  if (catalogStatus !== 'ready') {
    return (
      <div className="ws-page-container" style={{ padding: '40px 20px' }}>
        <CatalogState status={catalogStatus} error={catalogError} onRetry={retryCatalog} />
      </div>
    );
  }

  const availableModels = selectedBrand !== 'All Brands' ? modelsByBrand[selectedBrand] || [] : [];
  const tierName = 'Verified Wholesale Partner';

  return (
    <div className="ws-page-container">
      {/* Header Bar */}
      <div className="ws-header-bar">
        <div className="ws-header-titles">
          <div className="ws-breadcrumb-kicker">
            <WholesaleIcon name="catalogue" size={14} />
            <span>Procurement Workspace / Catalogue</span>
          </div>
          <h1>
            <WholesaleIcon name="catalogue" size={26} />
            Wholesale Procurement Catalogue
          </h1>
          <p>
            Full factory catalogue with multi-vehicle fitment filtering, commercial wholesale pricing, and instant MOQ validation.
            <strong> Direct CarXen factory fulfillment with Razorpay and COD checkout.</strong>
          </p>
        </div>

        <div className="ws-header-actions">
          {/* View Mode Toggle: Cards View vs Table View */}
          <div className="ws-view-toggle-group">
            <button
              type="button"
              className={`ws-view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Product Cards View (Like Shop Page)"
            >
              <LayoutGrid size={15} />
              <span>Cards View</span>
            </button>
            <button
              type="button"
              className={`ws-view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Procurement Table View"
            >
              <TableProperties size={15} />
              <span>Table View</span>
            </button>
          </div>

          <button type="button" onClick={handleFillAllVisibleMoqs} className="ws-btn-secondary" title="Fill MOQs for all visible products">
            <WholesaleIcon name="spark" size={15} />
            <span>Fill MOQs</span>
          </button>
          <button type="button" onClick={handleAddAllToBasket} className="ws-btn-secondary" title="Add all visible products to basket">
            <WholesaleIcon name="check" size={15} />
            <span>Add All Visible ({filteredProducts.length})</span>
          </button>
          <Link href="/wholesale/order-basket" className="ws-btn-primary ws-btn-brand">
            <WholesaleIcon name="basket" size={15} />
            <span>Review Basket ({wholesaleBasketSkuCount})</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="ws-metrics-grid">
        <div className="ws-metric-card">
          <div className="ws-metric-header">
            <span className="ws-metric-title">Matching Parts</span>
            <div className="ws-metric-icon-wrap">
              <WholesaleIcon name="catalogue" size={16} />
            </div>
          </div>
          <div className="ws-metric-value">
            {filteredProducts.length} <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>/ {products.length} SKUs</span>
          </div>
          <div className="ws-metric-subtext">Automotive OEM precision fitments</div>
        </div>

        <div className="ws-metric-card">
          <div className="ws-metric-header">
            <span className="ws-metric-title">Wholesale Margin</span>
            <div className="ws-metric-icon-wrap brand">
              <WholesaleIcon name="tier" size={16} />
            </div>
          </div>
          <div className="ws-metric-value">{tierName}</div>
          <div className="ws-metric-subtext">Commercial invoicing via CarXen</div>
        </div>

        <div className="ws-metric-card">
          <div className="ws-metric-header">
            <span className="ws-metric-title">Factory Dispatch</span>
            <div className="ws-metric-icon-wrap emerald">
              <WholesaleIcon name="truck" size={16} />
            </div>
          </div>
          <div className="ws-metric-value">24–48 Hours</div>
          <div className="ws-metric-subtext">Priority freight dispatch from CarXen</div>
        </div>

        <div className="ws-metric-card">
          <div className="ws-metric-header">
            <span className="ws-metric-title">Active Order Basket</span>
            <div className="ws-metric-icon-wrap">
              <WholesaleIcon name="basket" size={16} />
            </div>
          </div>
          <div className="ws-metric-value">
            {wholesaleBasketSkuCount} <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>SKUs ({wholesaleBasketCount} units)</span>
          </div>
          <div className="ws-metric-subtext">
            {wholesaleBasketSubtotal > 0 ? `Est. Total: ${formatINR(wholesaleBasketSubtotal)}` : 'Razorpay & COD Checkout Available'}
          </div>
        </div>
      </div>

      {/* Multi-Vehicle & Category Filter Toolbar */}
      <div className="ws-filter-toolbar">
        <div className="ws-filter-row-primary">
          <div className="ws-search-input-wrap">
            <span className="ws-search-icon">
              <WholesaleIcon name="search" size={17} />
            </span>
            <input
              type="text"
              className="ws-search-input"
              placeholder="Search by part number, title, or vehicle model (e.g. Creta, Thar, Scorpio, Nexon)…"
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

          {availableModels.length > 0 && (
            <div style={{ marginLeft: 'auto' }}>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                aria-label="Filter by Vehicle Model"
                style={{
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  padding: '0 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0f172a',
                  background: '#ffffff',
                  outline: 'none',
                }}
              >
                <option value="all">All {selectedBrand} Models</option>
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Multi-Vehicle Brand Filter Chips */}
        <div className="ws-brand-chips-row">
          <span className="ws-brand-chips-label">Vehicle Brand:</span>
          {vehicleBrands.map((b) => (
            <button
              key={b}
              type="button"
              className={`ws-category-chip ${selectedBrand === b ? 'active' : ''}`}
              style={{ fontSize: '12px', padding: '4px 12px' }}
              onClick={() => {
                setSelectedBrand(b);
                setSelectedModel('all');
              }}
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
        {(selectedMasterGroup !== 'all' || selectedCategory !== 'all' || selectedBrand !== 'All Brands' || selectedModel !== 'all' || search) && (
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
                onClick={() => {
                  setSelectedBrand('All Brands');
                  setSelectedModel('all');
                }}
                title="Remove vehicle brand filter"
              >
                <span>Brand: {selectedBrand}</span>
                <X size={12} />
              </button>
            )}
            {selectedModel !== 'all' && (
              <button
                type="button"
                className="ws-active-filter-pill"
                onClick={() => setSelectedModel('all')}
                title="Remove model filter"
              >
                <span>Model: {selectedModel}</span>
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
                setSelectedModel('all');
              }}
            >
              Reset All
            </button>
          </div>
        )}
      </div>

      {/* Main Inventory Display: Cards View vs Table View */}
      {filteredProducts.length === 0 ? (
        <div className="ws-empty-state-card">
          <div className="ws-empty-icon-wrap">
            <WholesaleIcon name="search" size={28} />
          </div>
          <h3>No matching automotive parts found</h3>
          <p>Try resetting vehicle brand filter or search term to view full inventory.</p>
          <button
            type="button"
            className="ws-btn-secondary"
            onClick={() => {
              setSearch('');
              setSelectedMasterGroup('all');
              setSelectedCategory('all');
              setSelectedBrand('All Brands');
              setSelectedModel('all');
            }}
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <>
          {/* CARDS VIEW: Product cards like Shop page (Always shown on smaller screens, and when Cards is selected on desktop) */}
          <div className={`ws-card-grid ${viewMode === 'table' ? 'ws-desktop-table-active' : ''}`}>
            {filteredProducts.map((p) => {
              const moq = getProductMoq(p);
              const inBasketQty = wholesaleBasket[p.id] || 0;
              const draftQty = rowQuantities[p.id] || (inBasketQty > 0 ? inBasketQty : moq);

              return (
                <WholesaleProductCard
                  key={p.id}
                  product={p}
                  quantity={draftQty}
                  inBasketQty={inBasketQty}
                  onQuantityChange={(prodId, val) => handleRowQtyChange(prodId, val, moq)}
                  onAddToBasket={(prod, q) => handleAddToBasket(prod, q)}
                />
              );
            })}
          </div>

          {/* TABLE VIEW: Desktop-only dense procurement spreadsheet */}
          {viewMode === 'table' && (
            <div className="ws-table-card ws-desktop-only-table">
              <table className="ws-procurement-table">
            <thead>
              <tr>
                <th style={{ width: '24%' }}>Product Details</th>
                <th style={{ width: '12%' }}>SKU / Part #</th>
                <th style={{ width: '12%' }}>Vehicle Fitment</th>
                <th style={{ width: '7%' }}>MOQ</th>
                <th style={{ width: '12%' }}>Wholesale Price</th>
                <th style={{ width: '15%', minWidth: '95px', textAlign: 'center' }}>Quantity</th>
                <th style={{ width: '18%', minWidth: '115px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const moq = getProductMoq(p);
                const tiers = getWholesaleTiers(p);
                const t1 = tiers[0]?.unitPrice || Math.round(p.p * 0.85);
                const t2 = tiers[1]?.unitPrice || Math.round(p.p * 0.75);
                const fitmentStr = getFitmentString(p);
                const isCustom = Boolean(p.isCustomProduct);
                const maxCustomQty = isCustom ? Math.max(0, Math.floor(p.stockCount ?? 0)) : null;
                const isOutOfStock = isCustom && (p.inStock === false || (maxCustomQty ?? 0) <= 0);
                const insufficientForMoq = isCustom && !isOutOfStock && maxCustomQty !== null && maxCustomQty < moq;
                const cannotOrder = isOutOfStock || insufficientForMoq;
                const rawQty = rowQuantities[p.id] || wholesaleBasket[p.id] || moq;
                const currentQty = maxCustomQty !== null && maxCustomQty >= moq ? Math.min(rawQty, maxCustomQty) : rawQty;
                const isInBasket = Boolean(wholesaleBasket[p.id]);
                const isDraftDifferent = isInBasket && rowQuantities[p.id] && rowQuantities[p.id] !== wholesaleBasket[p.id];

                return (
                  <tr key={p.id}>
                    <td>
                      <div className="ws-prod-cell">
                        <Link href={`/wholesale/product/${p.id}`} className="ws-prod-art-thumb">
                          <ProductArt product={p} />
                        </Link>
                        <div className="ws-prod-info">
                          <Link href={`/wholesale/product/${p.id}`} className="ws-prod-name">
                            {p.n}
                          </Link>
                          <div className="ws-prod-meta">
                            {p.s && (
                              <span className="ws-prod-series-badge">
                                {/\bseries$/i.test(p.s.trim()) ? p.s.trim() : `${p.s.trim()} Series`}
                              </span>
                            )}
                            {isOutOfStock ? (
                              <span
                                className="ws-stock-pill"
                                style={{ background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}
                              >
                                <span className="ws-stock-dot" style={{ background: '#dc2626' }} />
                                <span>Out of Stock</span>
                              </span>
                            ) : insufficientForMoq ? (
                              <span
                                className="ws-stock-pill"
                                style={{ background: '#fff7ed', color: '#c2410c', borderColor: '#fed7aa' }}
                              >
                                <span className="ws-stock-dot" style={{ background: '#ea580c' }} />
                                <span>Only {maxCustomQty} Left (Min MOQ {moq})</span>
                              </span>
                            ) : (
                              <span className="ws-stock-pill">
                                <span className="ws-stock-dot" />
                                <span>
                                  {isCustom && maxCustomQty !== null
                                    ? `${maxCustomQty} In Stock`
                                    : 'Ready to Dispatch'}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="ws-sku-badge" title={p.slug || `CX-${p.id}`}>
                        {p.slug || `CX-${p.id}`}
                      </span>
                    </td>

                    <td>
                      <span className="ws-fitment-badge" title={fitmentStr}>
                        {fitmentStr}
                      </span>
                    </td>

                    <td>
                      <span className="ws-moq-badge">MOQ: {moq}</span>
                      {p.unitsPerMasterCarton ? (
                        <span
                          className="ws-moq-badge"
                          style={{ display: 'inline-block', marginTop: '4px', background: '#f1f5f9', color: '#475569', fontSize: '10px' }}
                          title={`Master Carton: ${p.unitsPerMasterCarton} pcs/ctn${p.masterCartonWeightKg ? ` · ${p.masterCartonWeightKg} kg` : ''}`}
                        >
                          📦 {p.unitsPerMasterCarton}/ctn
                        </span>
                      ) : null}
                    </td>

                    <td>
                      <div className="ws-price-stack">
                        {p.p > t1 && (
                          <span className="ws-price-retail-strike">{formatINR(p.p)}</span>
                        )}
                        <span className="ws-price-wholesale">{formatINR(t1)}</span>
                        <span className="ws-price-tier2">Volume: {formatINR(t2)} (20+)</span>
                      </div>
                    </td>

                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap', overflow: 'visible', paddingLeft: '4px', paddingRight: '4px' }}>
                      <div className="ws-stepper">
                        <button
                          type="button"
                          className="ws-stepper-btn"
                          onClick={() => handleRowQtyChange(p.id, currentQty - 1, moq, maxCustomQty)}
                          disabled={cannotOrder || currentQty <= moq}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={13} />
                        </button>
                        <input
                          type="number"
                          min={moq}
                          max={maxCustomQty ?? undefined}
                          disabled={cannotOrder}
                          className="ws-stepper-input"
                          value={currentQty}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (!isNaN(v)) {
                              handleRowQtyChange(p.id, v, moq, maxCustomQty);
                            }
                          }}
                          aria-label={`Batch Quantity for ${p.n}`}
                        />
                        <button
                          type="button"
                          className="ws-stepper-btn"
                          onClick={() => handleRowQtyChange(p.id, currentQty + 1, moq, maxCustomQty)}
                          disabled={cannotOrder || (maxCustomQty !== null && currentQty >= maxCustomQty)}
                          aria-label="Increase quantity"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      {cannotOrder ? (
                        <button
                          type="button"
                          disabled
                          className="ws-row-action-btn"
                          style={{ opacity: 0.55, cursor: 'not-allowed', background: '#f1f5f9', color: '#64748b', borderColor: '#cbd5e1' }}
                          title={
                            isOutOfStock
                              ? 'Currently out of stock'
                              : `Only ${maxCustomQty} unit(s) available, below MOQ (${moq})`
                          }
                        >
                          <span>{isOutOfStock ? 'Out of Stock' : `Only ${maxCustomQty} Left (< MOQ)`}</span>
                        </button>
                      ) : isInBasket && !isDraftDifferent ? (
                        <button
                          type="button"
                          onClick={() => handleAddToBasket(p)}
                          className="ws-row-action-btn in-basket"
                          title="Currently in your wholesale basket"
                        >
                          <Check size={13} />
                          <span>In Basket ({wholesaleBasket[p.id]})</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddToBasket(p)}
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
      )}
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
                {wholesaleBasketSkuCount} SKUs in Order Basket · {wholesaleBasketCount} Total Units
              </div>
              <div className="ws-dock-subtitle">
                Commercial Estimate: {formatINR(wholesaleBasketSubtotal)} · Razorpay &amp; COD Available
              </div>
            </div>
          </div>

          <div className="ws-dock-actions">
            <Link href="/wholesale/quick-order" className="ws-btn-secondary" style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}>
              Quick Order Matrix
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

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ProductArt } from '@/components/ProductArt';
import { formatINR } from '@/data/products';
import type { Product } from '@/data/products';
import { getWholesaleTiers } from '@/lib/storefront/wholesale-pricing';
import { WholesaleIcon } from '@/components/wholesale/WholesaleIcon';
import { WholesaleProductCard } from '@/components/wholesale/WholesaleProductCard';
import { Plus, Minus, X, ArrowRight, Check, LayoutGrid, TableProperties, Sparkles, Filter } from 'lucide-react';
import '../wholesale.css';

const VEHICLE_BRANDS = [
  'All Brands',
  'Hyundai',
  'Maruti Suzuki',
  'Mahindra',
  'Tata',
  'Kia',
  'Toyota',
];

const POPULAR_MODELS: Record<string, string[]> = {
  Hyundai: ['Creta', 'Venue', 'Verna', 'i20', 'Alcazar'],
  'Maruti Suzuki': ['Swift', 'Baleno', 'Brezza', 'Grand Vitara', 'Dzire'],
  Mahindra: ['Scorpio-N', 'XUV700', 'Thar', 'XUV300', 'Bolero'],
  Tata: ['Nexon', 'Harrier', 'Safari', 'Punch', 'Altroz'],
  Kia: ['Seltos', 'Sonet', 'Carens'],
  Toyota: ['Innova Hycross', 'Fortuner', 'Urban Cruiser Hyryder'],
};

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'mats', label: '7D Floor Mats' },
  { id: 'seats', label: 'Seat Covers' },
  { id: 'steering', label: 'Steering Wraps' },
  { id: 'comfort', label: 'Comfort Cushions' },
];

export default function WholesaleCatalogPage() {
  const router = useRouter();
  const {
    user,
    isWholesaleApproved,
    authLoading,
    products,
    b2bProfile,
    wholesaleBasket,
    wholesaleBasketSkuCount,
    wholesaleBasketCount,
    wholesaleBasketSubtotal,
    addToWholesaleBasket,
    showToast,
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
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
      // Category filter
      if (selectedCategory !== 'all' && p.c !== selectedCategory) return false;

      const fitmentStr = getFitmentString(p).toLowerCase();
      const nameStr = p.n.toLowerCase();

      // Brand filter
      if (selectedBrand !== 'All Brands') {
        const brandQuery = selectedBrand.toLowerCase();
        const brandMatch = fitmentStr.includes(brandQuery) || nameStr.includes(brandQuery);
        const isUniversal = fitmentStr.includes('universal');
        if (!brandMatch && !isUniversal) return false;
      }

      // Model filter
      if (selectedModel !== 'all') {
        const modelQuery = selectedModel.toLowerCase();
        const modelMatch = fitmentStr.includes(modelQuery) || nameStr.includes(modelQuery);
        const isUniversal = fitmentStr.includes('universal');
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
  }, [products, selectedCategory, selectedBrand, selectedModel, search]);

  const handleRowQtyChange = (productId: number, val: number, moq: number) => {
    if (val <= 0) {
      setRowQuantities((prev) => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      return;
    }
    setRowQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(val, moq),
    }));
  };

  const handleAddToBasket = (p: Product, customQty?: number) => {
    const moq = getProductMoq(p);
    const qty = customQty || rowQuantities[p.id] || moq;
    addToWholesaleBasket(p.id, qty);
    showToast(`Added ${qty} units of "${p.n}" to Wholesale Order Basket.`);
  };

  const handleFillAllVisibleMoqs = () => {
    const next: Record<number, number> = { ...rowQuantities };
    filteredProducts.forEach((p) => {
      const moq = getProductMoq(p);
      if (!next[p.id]) {
        next[p.id] = moq;
      }
    });
    setRowQuantities(next);
    showToast(`Filled MOQs for all ${filteredProducts.length} displayed items.`);
  };

  const handleAddAllToBasket = () => {
    let addedCount = 0;
    filteredProducts.forEach((p) => {
      const moq = getProductMoq(p);
      const qty = rowQuantities[p.id] || moq;
      addToWholesaleBasket(p.id, qty);
      addedCount++;
    });
    showToast(`Added ${addedCount} wholesale products to your Order Basket.`);
  };

  if (authLoading || !user || !isWholesaleApproved) {
    return null;
  }

  const availableModels = selectedBrand !== 'All Brands' ? POPULAR_MODELS[selectedBrand] || [] : [];
  const tierName = b2bProfile?.wholesaleTier === 'tier2' ? 'Tier 2 (25% Margin)' : 'Tier 1 (15% Margin)';

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
            Full factory catalogue with multi-vehicle fitment filtering, commercial tier pricing, and instant MOQ validation.
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

          <div className="ws-category-chips">
            {CATEGORIES.map((cat) => (
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
          {VEHICLE_BRANDS.map((b) => (
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
              setSelectedCategory('all');
              setSelectedBrand('All Brands');
              setSelectedModel('all');
            }}
          >
            Reset All Filters
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* CARDS VIEW: Product cards like Shop page */
        <div className="ws-card-grid">
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
      ) : (
        /* TABLE VIEW: Dense procurement spreadsheet */
        <div className="ws-table-card">
          <table className="ws-procurement-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Product Details</th>
                <th style={{ width: '14%' }}>SKU / Part #</th>
                <th style={{ width: '13%' }}>Vehicle Fitment</th>
                <th style={{ width: '8%' }}>MOQ</th>
                <th style={{ width: '13%' }}>Wholesale Price</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Quantity</th>
                <th style={{ width: '14%', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const moq = getProductMoq(p);
                const tiers = getWholesaleTiers(p);
                const t1 = tiers[0]?.unitPrice || Math.round(p.p * 0.85);
                const t2 = tiers[1]?.unitPrice || Math.round(p.p * 0.75);
                const fitmentStr = getFitmentString(p);
                const currentQty = rowQuantities[p.id] || wholesaleBasket[p.id] || moq;
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
                            <span className="ws-prod-series-badge">{p.s} Series</span>
                            <span className="ws-stock-pill">
                              <span className="ws-stock-dot" />
                              <span>Ready to Dispatch</span>
                            </span>
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
                    </td>

                    <td>
                      <div className="ws-price-stack">
                        {p.p > t1 && (
                          <span className="ws-price-retail-strike">{formatINR(p.p)}</span>
                        )}
                        <span className="ws-price-wholesale">{formatINR(t1)}</span>
                        <span className="ws-price-tier2">Tier 2: {formatINR(t2)} (20+)</span>
                      </div>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <div className="ws-stepper">
                        <button
                          type="button"
                          className="ws-stepper-btn"
                          onClick={() => handleRowQtyChange(p.id, currentQty - 1, moq)}
                          aria-label="Decrease quantity"
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
                              handleRowQtyChange(p.id, v, moq);
                            }
                          }}
                          aria-label={`Batch Quantity for ${p.n}`}
                        />
                        <button
                          type="button"
                          className="ws-stepper-btn"
                          onClick={() => handleRowQtyChange(p.id, currentQty + 1, moq)}
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

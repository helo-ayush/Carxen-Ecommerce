'use client';
 
import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ProductArt } from '@/components/ProductArt';
import { formatINR } from '@/data/products';
import type { Product } from '@/data/products';
import { getWholesaleTiers } from '@/lib/storefront/wholesale-pricing';
import { categoryLabel, compareCategories } from '@/lib/storefront/categories';
import { WholesaleIcon } from '@/components/wholesale/WholesaleIcon';
import { Plus, Minus, X, ArrowRight, Check } from 'lucide-react';
import '../wholesale.css';

export default function WholesaleQuickOrderPage() {
  const router = useRouter();
  const {
    user,
    isWholesaleApproved,
    authLoading,
    products,
    wholesaleBasket,
    wholesaleBasketSkuCount,
    wholesaleBasketCount,
    wholesaleBasketSubtotal,
    addToWholesaleBasket,
    b2bProfile,
    showToast,
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

  if (authLoading || !user || !isWholesaleApproved) {
    return null;
  }

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of products) {
      map.set(product.c, product.categoryLabel?.trim() || categoryLabel(product.c));
    }
    return [
      { id: 'all', label: 'All Products' },
      ...[...map.entries()]
        .sort((a, b) => compareCategories({ key: a[0], label: a[1] }, { key: b[0], label: b[1] }))
        .map(([id, label]) => ({ id, label })),
    ];
  }, [products]);
  const [draftQuantities, setDraftQuantities] = useState<Record<number, number>>({});

  const getProductMoq = (p: Product) => Math.max(1, p.b2bMoq || 5);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'all' && p.c !== selectedCategory) return false;
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
  }, [products, selectedCategory, search]);

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

  const tierLabel = b2bProfile?.wholesaleTier === 'tier2' ? 'Tier 2 (25% Margin)' : 'Tier 1 (15% Margin)';

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
            <strong> Direct factory fulfillment via CarXen with zero online payment required.</strong>
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
          <div className="ws-metric-value">Min 2–5 Units</div>
          <div className="ws-metric-subtext">Enforced to unlock factory discounts</div>
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

          <div className="ws-category-chips">
            {categories.map((cat) => (
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
        </div>
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
              setSelectedCategory('all');
            }}
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="ws-table-card">
          <table className="ws-procurement-table">
            <thead>
              <tr>
                <th style={{ width: '27%' }}>Product Line</th>
                <th style={{ width: '14%' }}>SKU / Part #</th>
                <th style={{ width: '8%' }}>MOQ</th>
                <th style={{ width: '13%' }}>Tier 1 (Wholesale)</th>
                <th style={{ width: '14%' }}>Tier 2 (Volume 20+)</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Batch Qty</th>
                <th style={{ width: '14%', textAlign: 'right' }}>Action</th>
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
                        <div className="ws-prod-art-thumb">
                          <ProductArt product={p} />
                        </div>
                        <div className="ws-prod-info">
                          <div className="ws-prod-name">{p.n}</div>
                          <div className="ws-prod-meta">
                            <span className="ws-prod-series-badge">{p.s} Series</span>
                            {typeof p.fitment === 'string' && p.fitment ? (
                              <span className="ws-fitment-badge">{p.fitment}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="ws-sku-badge" title={p.slug || `CX-${p.id}`}>{p.slug || `CX-${p.id}`}</span>
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

                    <td style={{ textAlign: 'center' }}>
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

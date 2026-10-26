'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ProductArt } from '@/components/ProductArt';
import { formatINR } from '@/data/products';
import type { Product } from '@/data/products';
import { categoryLabel, compareCategories } from '@/lib/storefront/categories';
import {
  getWholesaleTiers,
  getEffectiveWholesaleUnitPrice,
  getActiveWholesaleTier,
  calculateItemPriceWithOfferLimit,
} from '@/lib/storefront/wholesale-pricing';
import {
  Search,
  X,
  ShoppingBag,
  Plus,
  Minus,
  Layers,
  Lock,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import '../b2b.css';

export default function QuickOrderPage() {
  const router = useRouter();
  const {
    products,
    user,
    authLoading,
    isWholesaleApproved,
    isWholesalePending,
    cart,
    addToCart,
    openCart,
    showToast,
  } = useApp();

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
  // Local quantity map for quick-order draft before adding to cart
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  useEffect(() => {
    router.replace('/wholesale/quick-order');
  }, [router]);

  // Initialize draft quantities to each product's b2bMoq
  const getProductMoq = (p: Product) => p.b2bMoq || 5;
  const getProductTiers = (p: Product) => getWholesaleTiers(p);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'all' && p.c !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = p.n.toLowerCase().includes(q);
        const matchSku = (p.slug || '').toLowerCase().includes(q);
        const matchSeries = p.s.toLowerCase().includes(q);
        const matchFit = typeof p.fitment === 'string' && p.fitment.toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchSeries && !matchFit) return false;
      }
      return true;
    });
  }, [products, selectedCategory, search]);

  const handleQtyChange = (productId: number, val: number, moq: number) => {
    if (val <= 0) {
      setQuantities((prev) => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      return;
    }
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(val, moq),
    }));
  };

  const handleFillAllMoqs = () => {
    const next: Record<number, number> = { ...quantities };
    filteredProducts.forEach((p) => {
      const moq = getProductMoq(p);
      if (!next[p.id]) {
        next[p.id] = moq;
      }
    });
    setQuantities(next);
    showToast(`Filled base MOQs for ${filteredProducts.length} visible items`);
  };

  const handleAddRowToCart = (p: Product) => {
    if (!user) {
      showToast('Please sign in to order wholesale SKUs');
      router.push('/login?redirect=/b2b/quick-order');
      return;
    }
    if (!isWholesaleApproved) {
      showToast('Wholesale partner approval required to place bulk B2B orders');
      router.push('/b2b');
      return;
    }
    const moq = getProductMoq(p);
    const qty = quantities[p.id] || moq;
    const priceResult = calculateItemPriceWithOfferLimit(p, qty, true);
    addToCart(p.id, qty);
    showToast(`Added ${qty} units (${formatINR(priceResult.totalPrice)}) of ${p.n} to order`);
  };

  const handleAddAllSelectedToCart = () => {
    if (!user) {
      showToast('Please sign in to order wholesale SKUs');
      router.push('/login?redirect=/b2b/quick-order');
      return;
    }
    if (!isWholesaleApproved) {
      showToast('Wholesale partner approval required to place bulk B2B orders');
      router.push('/b2b');
      return;
    }
    const entries = Object.entries(quantities).filter(([_, q]) => q > 0);
    if (entries.length === 0) {
      showToast('Select quantities for products first');
      return;
    }

    entries.forEach(([idStr, q]) => {
      addToCart(Number(idStr), q);
    });

    showToast(`Added ${entries.length} SKUs to cart`);
    openCart();
  };

  const totalSelectedUnits = Object.values(quantities).reduce((a, b) => a + b, 0);
  const totalSelectedValue = Object.entries(quantities).reduce((sum, [idStr, q]) => {
    const p = products.find((item) => item.id === Number(idStr));
    if (!p) return sum;
    return sum + calculateItemPriceWithOfferLimit(p, q, true).totalPrice;
  }, 0);

  // --------------------------------------------------------------------------
  // 0. AUTHENTICATION LOADING
  // --------------------------------------------------------------------------
  if (authLoading) {
    return (
      <div className="b2b-qo-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="b2b-badge active" style={{ margin: '0 auto 16px' }}>
            <span className="b2b-dot pulse" />
            <span>AUTHENTICATING</span>
          </div>
          <p style={{ color: 'var(--steel, #71717a)', fontSize: 14 }}>
            Loading wholesale quick order sheet...
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 1. UNLOGGED-IN GATE SCREEN
  // --------------------------------------------------------------------------
  if (!user) {
    return (
      <div className="b2b-qo-container">
        <div className="b2b-auth-gate-card">
          <div className="b2b-auth-icon-wrap">
            <Lock size={28} />
          </div>
          <div className="b2b-badge" style={{ margin: '0 auto 16px' }}>
            <span className="b2b-dot" />
            <span>WHOLESALE QUICK ORDER · LOGIN REQUIRED</span>
          </div>
          <h1>Wholesale Quick Order Sheet Restricted</h1>
          <p>
            The bulk quick order table, quantity-tier discount matrix, and MOQ batch sheet are reserved for registered wholesale buyers. You must be signed in to view and order bulk SKUs.
          </p>

          <div className="b2b-auth-perks-row">
            <div className="b2b-auth-perk-pill">
              <span className="icon">⚡</span>
              <span>Fast Batch Order Table</span>
            </div>
            <div className="b2b-auth-perk-pill">
              <span className="icon">📊</span>
              <span>Tier 1 & Tier 2 Breaks</span>
            </div>
            <div className="b2b-auth-perk-pill">
              <span className="icon">📑</span>
              <span>GST ITC Invoicing</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/login?redirect=/b2b/quick-order" className="b2b-btn primary">
              Sign In to Access &rarr;
            </Link>
            <Link href="/b2b" className="b2b-btn secondary">
              Apply for Wholesale Account
            </Link>
            <Link href="/shop" className="b2b-btn ghost">
              Browse Retail Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalInCart = Object.values(cart).reduce((a, b) => a + b, 0);

  return (
    <div className="b2b-qo-container">
      {/* Top Header */}
      <div className="b2b-qo-top-bar">
        <div className="b2b-qo-title-wrap">
          <div className="b2b-badge active" style={{ marginBottom: 6 }}>
            <span className="b2b-dot pulse" />
            <span>WHOLESALE QUICK ORDER SHEET</span>
          </div>
          <h1>Bulk SKU Order Table</h1>
          <p>
            Quick batch ordering for authorized dealerships and workshops. Minimum Order Quantities (MOQ) and volume discounts apply per SKU.
          </p>
        </div>

        <div className="b2b-qo-top-actions">
          <Link href="/shop" className="b2b-btn secondary">
            &larr; Standard Catalog
          </Link>
          <button
            type="button"
            className="b2b-btn primary"
            onClick={openCart}
          >
            <ShoppingBag size={15} />
            <span>View Cart ({totalInCart})</span>
          </button>
        </div>
      </div>

      {/* Non-Approved User Banner */}
      {!isWholesaleApproved && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 14,
          padding: '14px 20px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#92400e' }}>
            <AlertCircle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
            <span>
              <strong>Preview Mode:</strong> You are viewing standard wholesale rates. To unlock live batch ordering and GST tax invoices,{' '}
              <Link href="/b2b" style={{ fontWeight: 700, textDecoration: 'underline' }}>
                {isWholesalePending ? 'view your application under review' : 'apply for an approved Wholesale Account'}
              </Link>.
            </span>
          </div>
          <Link href="/b2b" className="b2b-btn primary" style={{ padding: '6px 14px', fontSize: 12 }}>
            {isWholesalePending ? 'Check Application Status' : 'Apply for Wholesale Mode'}
          </Link>
        </div>
      )}

      {/* Toolbar: Search + Categories + Convenience Actions */}
      <div className="b2b-qo-toolbar">
        {/* Search */}
        <div className="b2b-qo-search-input-wrap">
          <Search size={15} className="b2b-qo-search-icon" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU, product title, series or vehicle fitment..."
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="b2b-qo-clear-btn"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Categories */}
        <div className="b2b-qo-cat-pills">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`b2b-qo-cat-pill ${selectedCategory === cat.id ? 'active' : ''}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Quick Batch Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={handleFillAllMoqs}
            className="b2b-btn ghost"
            style={{ fontSize: 12, padding: '7px 12px' }}
            title="Auto-fill base MOQ for all filtered items"
          >
            <Sparkles size={13} style={{ color: '#e2231a' }} />
            <span>Fill All MOQs</span>
          </button>
          {totalSelectedUnits > 0 && (
            <button
              type="button"
              onClick={() => setQuantities({})}
              className="b2b-btn ghost"
              style={{ fontSize: 12, padding: '7px 12px', color: '#dc2626' }}
              title="Reset all draft quantities"
            >
              <RefreshCw size={13} />
              <span>Clear Draft</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Order Table */}
      <div className="b2b-qo-table-wrap">
        <table className="b2b-qo-table">
          <thead>
            <tr>
              <th style={{ width: '38%' }}>Product & SKU Details</th>
              <th style={{ width: '16%' }}>Retail vs B2B Price</th>
              <th style={{ width: '22%' }}>Volume Tier Breaks</th>
              <th style={{ width: '12%' }}>Base Pack (MOQ)</th>
              <th style={{ width: '12%' }}>Order Quantity</th>
              <th style={{ width: '14%' }}>Subtotal</th>
              <th style={{ width: '14%', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '60px 20px', color: '#71717a' }}>
                  <Search size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p style={{ fontWeight: 600, fontSize: 15, color: '#0e0e0f' }}>No matching products found</p>
                  <p style={{ fontSize: 13 }}>Try clearing search keywords or choosing another category.</p>
                  <button
                    type="button"
                    onClick={() => { setSearch(''); setSelectedCategory('all'); }}
                    className="b2b-btn secondary"
                    style={{ marginTop: 12 }}
                  >
                    Reset Filters
                  </button>
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                const moq = getProductMoq(p);
                const tiers = getProductTiers(p);
                const currentQty = quantities[p.id] || 0;
                const effectiveQty = currentQty > 0 ? currentQty : moq;
                const priceResult = calculateItemPriceWithOfferLimit(p, effectiveQty, true);
                const wsUnitPrice = priceResult.discountedUnitPrice;
                const retailPrice = p.o || p.p;
                const marginPercent = Math.round(((retailPrice - wsUnitPrice) / retailPrice) * 100);
                const activePriceResult = currentQty > 0 ? calculateItemPriceWithOfferLimit(p, currentQty, true) : null;
                const rowTotal = activePriceResult ? activePriceResult.totalPrice : 0;
                const basePackTotal = moq * tiers[0].unitPrice;
                const inCartQty = cart[p.id] || 0;

                const isTier1 = currentQty >= tiers[0].minQty && (!tiers[0].maxQty || currentQty <= tiers[0].maxQty);
                const isTier2 = currentQty >= tiers[1].minQty && (!tiers[1].maxQty || currentQty <= tiers[1].maxQty);
                const isTier3 = currentQty >= tiers[2].minQty;

                return (
                  <tr key={p.id} className={currentQty > 0 ? 'active-row' : ''}>
                    {/* Product & SKU Details */}
                    <td>
                      <div className="b2b-qo-product-cell">
                        <Link href={`/wholesale/product/${p.id}`} className="b2b-qo-thumb" title={`View ${p.n}`}>
                          <ProductArt product={p} />
                        </Link>
                        <div className="b2b-qo-info">
                          <Link href={`/wholesale/product/${p.id}`} className="b2b-qo-title">
                            {p.n}
                          </Link>
                          <div className="b2b-qo-meta-row">
                            <Link href={`/wholesale/product/${p.id}`} className="b2b-qo-sku-badge" title={p.slug || `CX-${String(p.id).padStart(4, '0')}`}>
                              {p.slug || `CX-${String(p.id).padStart(4, '0')}`}
                            </Link>
                            <span className="b2b-qo-cat-tag">
                              {p.categoryLabel || p.c} · {p.s} Series
                            </span>
                          </div>
                          {p.discountLimitQty && p.discountLimitQty > 0 ? (
                            <span style={{ fontSize: 10, color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: 4, width: 'fit-content', marginTop: 2, fontWeight: 600 }}>
                              ⚡ Offer Cap: Max {p.discountLimitQty} units
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    {/* Retail vs Wholesale Price */}
                    <td>
                      <div className="b2b-qo-pricing-cell">
                        <span className="b2b-qo-mrp">{formatINR(retailPrice)} MRP</span>
                        <div className="b2b-qo-price-group">
                          <span className="b2b-qo-ws-price">{formatINR(wsUnitPrice)}</span>
                          <span className="b2b-qo-margin-pill">
                            {marginPercent}% MARGIN
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Volume Tier Breaks */}
                    <td>
                      <div className="b2b-qo-tiers-wrap">
                        <span className={`b2b-tier-chip ${isTier1 ? 'active' : ''}`} title={`Tier 1: ${tiers[0].minQty}+ units`}>
                          {tiers[0].minQty}+ @ {formatINR(tiers[0].unitPrice)}
                        </span>
                        <span className={`b2b-tier-chip ${isTier2 ? 'active' : ''}`} title={`Tier 2: ${tiers[1].minQty}+ units`}>
                          {tiers[1].minQty}+ @ {formatINR(tiers[1].unitPrice)} (-{tiers[1].discountPercent}%)
                        </span>
                        <span className={`b2b-tier-chip ${isTier3 ? 'active' : ''}`} title={`Tier 3: ${tiers[2].minQty}+ units`}>
                          {tiers[2].minQty}+ @ {formatINR(tiers[2].unitPrice)} (-{tiers[2].discountPercent}%)
                        </span>
                      </div>
                    </td>

                    {/* Base Pack (MOQ) */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#18181b' }}>Pack of {moq}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>{formatINR(basePackTotal)}</span>
                        <span style={{ fontSize: 10, color: '#71717a' }}>({formatINR(tiers[0].unitPrice)}/ea)</span>
                      </div>
                    </td>

                    {/* Order Stepper */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div className="b2b-qo-stepper">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(p.id, currentQty - (currentQty > moq ? 1 : currentQty), moq)}
                            disabled={currentQty === 0}
                            className="b2b-qo-stepper-btn"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={13} />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={currentQty === 0 ? '' : currentQty}
                            placeholder={String(moq)}
                            title={`Minimum order quantity: ${moq} units`}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : Number(e.target.value);
                              handleQtyChange(p.id, val, moq);
                            }}
                            className="b2b-qo-stepper-input"
                          />
                          <button
                            type="button"
                            onClick={() => handleQtyChange(p.id, currentQty === 0 ? moq : currentQty + 1, moq)}
                            className="b2b-qo-stepper-btn"
                            aria-label="Increase quantity"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                        {currentQty === 0 ? (
                          <button
                            type="button"
                            onClick={() => handleQtyChange(p.id, moq, moq)}
                            className="b2b-qo-quick-moq-btn"
                          >
                            + Add MOQ ({moq})
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleQtyChange(p.id, currentQty + moq, moq)}
                            className="b2b-qo-quick-moq-btn"
                          >
                            + {moq} more
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Subtotal */}
                    <td>
                      {currentQty > 0 ? (
                        <div className="b2b-qo-subtotal-cell">
                          <span className="b2b-qo-row-total">{formatINR(rowTotal)}</span>
                          <span className="b2b-qo-unit-note">
                            {currentQty} units × {formatINR(wsUnitPrice)}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 13, color: '#a1a1aa' }}>—</span>
                      )}
                    </td>

                    {/* Row Action */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        {inCartQty > 0 && (
                          <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>
                            ✓ {inCartQty} in cart
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleAddRowToCart(p)}
                          className="b2b-qo-add-btn"
                        >
                          Add {currentQty > 0 ? currentQty : moq} Units
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Floating Bottom Action Dock */}
      {totalSelectedUnits > 0 && (
        <div className="b2b-floating-dock">
          <div className="b2b-dock-summary">
            <div className="b2b-dock-metric">
              <span className="lbl">Selected SKUs</span>
              <span className="val">
                {Object.keys(quantities).filter((k) => quantities[Number(k)] > 0).length} Items · {totalSelectedUnits} Units
              </span>
            </div>
            <div className="b2b-dock-metric">
              <span className="lbl">Estimated Wholesale Value</span>
              <span className="val highlight">
                {formatINR(totalSelectedValue)}{' '}
                <span style={{ fontSize: 11, color: '#a1a1aa', fontWeight: 500 }}>(Excl. GST)</span>
              </span>
            </div>
          </div>

          <div className="b2b-dock-actions">
            <button
              type="button"
              onClick={() => setQuantities({})}
              className="b2b-btn ghost"
              style={{ color: '#a1a1aa', borderColor: '#3f3f46' }}
            >
              Reset Draft
            </button>
            <button
              type="button"
              onClick={handleAddAllSelectedToCart}
              className="b2b-btn primary"
              style={{ padding: '12px 24px' }}
            >
              <span>Add All to Cart &rarr;</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

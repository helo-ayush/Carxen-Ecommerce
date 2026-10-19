'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ProductArt } from '@/components/ProductArt';
import { formatINR } from '@/data/products';
import type { Product } from '@/data/products';
import {
  getWholesaleTiers,
  getEffectiveWholesaleUnitPrice,
  getActiveWholesaleTier,
} from '@/lib/storefront/wholesale-pricing';

export default function QuickOrderPage() {
  const router = useRouter();
  const {
    products,
    isWholesaleApproved,
    isWholesalePending,
    cart,
    addToCart,
    openCart,
    showToast,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  // Local quantity map for quick-order draft before adding to cart
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  // Initialize draft quantities to each product's b2bMoq
  const getProductMoq = (p: Product) => p.b2bMoq || 5;
  const getProductTiers = (p: Product) => getWholesaleTiers(p);

  const getEffectiveWholesalePrice = (p: Product, qty: number = 0) => {
    const effectiveQty = qty > 0 ? qty : getProductMoq(p);
    return getEffectiveWholesaleUnitPrice(p, effectiveQty);
  };

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

  const handleAddRowToCart = (p: Product) => {
    const moq = getProductMoq(p);
    const qty = quantities[p.id] || moq;
    const unitPrice = getEffectiveWholesaleUnitPrice(p, qty);
    addToCart(p.id, qty);
    showToast(`Added ${qty} units (${formatINR(unitPrice * qty)}) of ${p.n} to order`);
  };

  const handleAddAllSelectedToCart = () => {
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
    return sum + getEffectiveWholesaleUnitPrice(p, q) * q;
  }, 0);

  return (
    <div className="b2b-quick-order-container">
      {/* Top Header */}
      <div className="b2b-qo-header">
        <div>
          <div className="b2b-badge active inline-flex mb-2">
            <span className="dot pulse" />
            <span>WHOLESALE QUICK ORDER SHEET</span>
          </div>
          <h1>Bulk SKU Order Table</h1>
          <p className="b2b-qo-sub">
            Add units across all SKUs in batches. Minimum Order Quantities (MOQ) apply per product.
          </p>
        </div>

        <div className="b2b-qo-header-actions">
          <Link href="/shop" className="b2b-btn secondary">
            &larr; Standard Catalog
          </Link>
          <button
            type="button"
            className="b2b-btn primary"
            onClick={openCart}
          >
            View Cart ({Object.values(cart).reduce((a, b) => a + b, 0)})
          </button>
        </div>
      </div>

      {!isWholesaleApproved && (
        <div className="b2b-warning-strip">
          <div className="warning-content">
            <strong>Preview Mode:</strong> You are viewing standard demo wholesale prices. To unlock active B2B ordering and GST invoices,{' '}
            <Link href="/b2b" className="underline font-bold">
              {isWholesalePending ? 'check your pending application' : 'apply for an approved Wholesale Account'}
            </Link>.
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="b2b-qo-controls">
        <div className="b2b-qo-search">
          <svg viewBox="0 0 24 24" className="search-icon">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU, product title, series or vehicle fitment..."
          />
          {search && (
            <button onClick={() => setSearch('')} className="clear-btn">
              ✕
            </button>
          )}
        </div>

        <div className="b2b-qo-category-pills">
          {[
            { id: 'all', label: 'All Products' },
            { id: 'seats', label: 'Seat Covers' },
            { id: 'mats', label: 'Floor Mats' },
            { id: 'steering', label: 'Steering Grips' },
            { id: 'comfort', label: 'Comfort & Cushions' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`qo-pill ${selectedCategory === cat.id ? 'active' : ''}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Order Table */}
      <div className="b2b-table-wrapper">
        <table className="b2b-table">
          <thead>
            <tr>
              <th style={{ width: '70px' }}>Thumbnail</th>
              <th>SKU / Product Details</th>
              <th>Category</th>
              <th>Retail (MRP)</th>
              <th style={{ minWidth: '220px' }}>Quantity & Price Breaks</th>
              <th>Base Pack (MOQ)</th>
              <th>Order Qty</th>
              <th>Row Subtotal</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => {
              const moq = getProductMoq(p);
              const tiers = getProductTiers(p);
              const currentQty = quantities[p.id] || 0;
              const effectiveQty = currentQty > 0 ? currentQty : moq;
              const wsUnitPrice = getEffectiveWholesaleUnitPrice(p, effectiveQty);
              const activeTier = getActiveWholesaleTier(p, effectiveQty);
              const retailPrice = p.o || p.p;
              const marginPercent = Math.round(((retailPrice - wsUnitPrice) / retailPrice) * 100);
              const rowTotal = currentQty > 0 ? currentQty * wsUnitPrice : 0;
              const basePackTotal = moq * tiers[0].unitPrice;
              const inCartQty = cart[p.id] || 0;

              return (
                <tr key={p.id} className={currentQty > 0 ? 'selected-row' : ''}>
                  {/* Thumbnail */}
                  <td>
                    <div className="b2b-thumb-box">
                      <ProductArt product={p} />
                    </div>
                  </td>

                  {/* Title & SKU */}
                  <td>
                    <div className="b2b-product-info">
                      <Link href={`/product/${p.id}`} className="b2b-product-title">
                        {p.n}
                      </Link>
                      <span className="b2b-product-sku">
                        SKU: {p.slug || `CX-${String(p.id).padStart(4, '0')}`} · {p.s} Series
                      </span>
                      {p.customFit && (
                        <span className="b2b-product-badge">Custom 3D/7D Fitment</span>
                      )}
                    </div>
                  </td>

                  {/* Category */}
                  <td>
                    <span className="b2b-cat-pill">{p.categoryLabel || p.c}</span>
                  </td>

                  {/* Retail MRP */}
                  <td>
                    <span className="b2b-retail-price">{formatINR(retailPrice)}</span>
                  </td>

                  {/* Wholesale Pricing Tiers (Quantity + Price) */}
                  <td>
                    <div className="flex flex-col gap-1 text-[11px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded font-semibold border ${
                          currentQty >= tiers[0].minQty && (!tiers[0].maxQty || currentQty <= tiers[0].maxQty)
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                        }`}>
                          {tiers[0].minQty}+ @ {formatINR(tiers[0].unitPrice)}
                        </span>
                        <span className={`px-2 py-0.5 rounded font-semibold border ${
                          currentQty >= tiers[1].minQty && (!tiers[1].maxQty || currentQty <= tiers[1].maxQty)
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                        }`}>
                          {tiers[1].minQty}+ @ {formatINR(tiers[1].unitPrice)} (-{tiers[1].discountPercent}%)
                        </span>
                        <span className={`px-2 py-0.5 rounded font-semibold border ${
                          currentQty >= tiers[2].minQty
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                        }`}>
                          {tiers[2].minQty}+ @ {formatINR(tiers[2].unitPrice)} (-{tiers[2].discountPercent}%)
                        </span>
                      </div>
                      {activeTier && currentQty >= tiers[1].minQty && (
                        <span className="text-[10px] text-emerald-400 font-medium">
                          ✓ {activeTier.badge || `${activeTier.label} active`}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Base Pack (MOQ Quantity + Price) */}
                  <td>
                    <div className="flex flex-col">
                      <span className="font-bold text-zinc-100 text-xs">Pack of {moq}</span>
                      <span className="font-semibold text-emerald-400 text-xs">{formatINR(basePackTotal)}</span>
                      <span className="text-[10px] text-zinc-400">({formatINR(tiers[0].unitPrice)}/ea)</span>
                    </div>
                  </td>

                  {/* Stepper */}
                  <td>
                    <div className="b2b-stepper">
                      <button
                        type="button"
                        onClick={() => handleQtyChange(p.id, currentQty - (currentQty > moq ? 1 : currentQty), moq)}
                        disabled={currentQty === 0}
                        className="stepper-btn"
                        aria-label="Decrease quantity"
                      >
                        –
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
                        className="stepper-input"
                      />
                      <button
                        type="button"
                        onClick={() => handleQtyChange(p.id, currentQty === 0 ? moq : currentQty + 1, moq)}
                        className="stepper-btn"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </td>

                  {/* Row Total */}
                  <td>
                    {currentQty > 0 ? (
                      <div className="flex flex-col">
                        <span className="b2b-row-total">{formatINR(rowTotal)}</span>
                        <span className="text-[10px] text-zinc-400">
                          {currentQty} units × {formatINR(wsUnitPrice)}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-semibold">
                          {marginPercent}% margin
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-500 text-xs">—</span>
                    )}
                  </td>

                  {/* Add to Cart with Quantity + Total Price */}
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex items-center justify-end gap-2">
                      {inCartQty > 0 && (
                        <span className="text-xs text-text-tertiary">
                          ({inCartQty} in cart)
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleAddRowToCart(p)}
                        className="b2b-add-row-btn"
                        title="Add to wholesale order"
                      >
                        Add {currentQty > 0 ? currentQty : moq} Units · {formatINR(currentQty > 0 ? rowTotal : basePackTotal)}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Floating Bottom Action Bar */}
      {totalSelectedUnits > 0 && (
        <div className="b2b-floating-bar">
          <div className="b2b-floating-summary">
            <div>
              <span className="lbl">Selected Items:</span>
              <span className="val font-bold">
                {Object.keys(quantities).filter((k) => quantities[Number(k)] > 0).length} SKUs · {totalSelectedUnits} Units
              </span>
            </div>
            <div>
              <span className="lbl">Estimated Wholesale Value:</span>
              <span className="val text-emerald-400 font-bold text-lg">
                {formatINR(totalSelectedValue)}{' '}
                <span className="text-xs text-zinc-400">(Excl. GST)</span>
              </span>
            </div>
          </div>

          <div className="b2b-floating-actions">
            <button
              type="button"
              onClick={() => setQuantities({})}
              className="b2b-btn ghost"
            >
              Reset Sheet
            </button>
            <button
              type="button"
              onClick={handleAddAllSelectedToCart}
              className="b2b-btn primary"
            >
              Add All Selected to Cart &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

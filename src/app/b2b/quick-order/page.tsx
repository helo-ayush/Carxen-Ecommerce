'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import type { Product } from '@/data/products';

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

  const getEffectiveWholesalePrice = (p: Product) => {
    if (typeof p.wholesalePrice === 'number' && p.wholesalePrice > 0) {
      return p.wholesalePrice;
    }
    return Math.round(p.p * 0.6);
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
    addToCart(p.id, qty);
    showToast(`Added ${qty} units of ${p.n} to order`);
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
    return sum + getEffectiveWholesalePrice(p) * q;
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
              <th style={{ width: '80px' }}>Thumbnail</th>
              <th>SKU / Product Details</th>
              <th>Category</th>
              <th>Retail (MRP)</th>
              <th>Wholesale (Excl. GST)</th>
              <th>Margin</th>
              <th>MOQ</th>
              <th>Order Qty</th>
              <th>Row Subtotal</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => {
              const moq = getProductMoq(p);
              const wsPrice = getEffectiveWholesalePrice(p);
              const retailPrice = p.o || p.p;
              const marginPercent = Math.round(((retailPrice - wsPrice) / retailPrice) * 100);
              const currentQty = quantities[p.id] || 0;
              const rowTotal = currentQty * wsPrice;
              const inCartQty = cart[p.id] || 0;

              return (
                <tr key={p.id} className={currentQty > 0 ? 'selected-row' : ''}>
                  {/* Thumbnail */}
                  <td>
                    <div className="b2b-thumb-box">
                      {p.image ? (
                        <img src={p.image} alt={p.n} className="b2b-thumb-img" />
                      ) : (
                        <div className="b2b-thumb-fallback">{p.n.slice(0, 2).toUpperCase()}</div>
                      )}
                    </div>
                  </td>

                  {/* Title & SKU */}
                  <td>
                    <div className="b2b-product-info">
                      <span className="b2b-product-title">{p.n}</span>
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
                    <span className="b2b-retail-price">₹{retailPrice.toLocaleString('en-IN')}</span>
                  </td>

                  {/* Wholesale Price */}
                  <td>
                    <div className="b2b-wholesale-cell">
                      <span className="b2b-ws-price">₹{wsPrice.toLocaleString('en-IN')}</span>
                      <span className="b2b-gst-note">+18% GST (ITC Eligible)</span>
                    </div>
                  </td>

                  {/* Margin */}
                  <td>
                    <span className="b2b-margin-badge">{marginPercent}% Margin</span>
                  </td>

                  {/* MOQ */}
                  <td>
                    <span className="b2b-moq-pill">Min. {moq} units</span>
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
                        placeholder={`Min ${moq}`}
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
                    <span className="b2b-row-total">
                      {currentQty > 0 ? `₹${rowTotal.toLocaleString('en-IN')}` : '—'}
                    </span>
                  </td>

                  {/* Add to Cart */}
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
                      >
                        Add {currentQty > 0 ? currentQty : moq}
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
              <span className="val text-success font-bold text-lg">
                ₹{totalSelectedValue.toLocaleString('en-IN')} <span className="text-xs text-text-tertiary">(Excl. GST)</span>
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

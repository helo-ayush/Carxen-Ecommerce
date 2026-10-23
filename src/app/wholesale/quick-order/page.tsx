'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { ProductArt } from '@/components/ProductArt';
import { formatINR } from '@/data/products';
import type { Product } from '@/data/products';
import {
  getWholesaleTiers,
} from '@/lib/storefront/wholesale-pricing';
import {
  Search,
  X,
  ShoppingBag,
  Plus,
  Minus,
  Zap,
  Check,
  CheckCheck,
  ArrowRight,
  Filter,
} from 'lucide-react';
import '../wholesale.css';

export default function WholesaleQuickOrderPage() {
  const {
    products,
    wholesaleBasket,
    wholesaleBasketSkuCount,
    addToWholesaleBasket,
    clearWholesaleBasket,
    showToast,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
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

  return (
    <div className="ws-page-container">
      {/* Header Bar */}
      <div className="ws-header-bar">
        <div className="ws-header-titles">
          <h1>
            <Zap size={26} color="#0f172a" />
            Quick Order Matrix
          </h1>
          <p>
            High-speed SKU batch ordering · Direct MOQ validation & fast basket replenishment.
            <strong> Zero online payment required.</strong>
          </p>
        </div>
        <div className="ws-header-actions">
          <button type="button" onClick={handleFillAllMoqs} className="ws-btn-secondary">
            Fill All MOQs
          </button>
          <button type="button" onClick={handleAddAllDraftsToBasket} className="ws-btn-secondary">
            <CheckCheck size={16} />
            <span>Add All to Basket</span>
          </button>
          <Link href="/wholesale/order-basket" className="ws-btn-primary">
            <ShoppingBag size={16} />
            <span>Order Basket ({wholesaleBasketSkuCount} SKUs)</span>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="ws-filter-toolbar">
        <div className="ws-filter-row-primary">
          <div className="ws-search-input-wrap">
            <Search size={18} />
            <input
              type="text"
              className="ws-search-input"
              placeholder="Search by SKU, title, or vehicle model…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="ws-select-wrap">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by Category"
            >
              <option value="all">All Categories</option>
              <option value="mats">7D & All-Weather Mats</option>
              <option value="seats">Leatherette Seat Covers</option>
              <option value="steering">Sport Steering Wraps</option>
              <option value="comfort">Ergonomic Comfort Cushions</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick Order Dense Matrix Table */}
      <div className="ws-table-card">
        <table className="ws-procurement-table">
          <thead>
            <tr>
              <th>Product Line</th>
              <th>SKU / Part #</th>
              <th>MOQ</th>
              <th>Tier 1 (Wholesale)</th>
              <th>Tier 2 (Volume 20+)</th>
              <th style={{ textAlign: 'center' }}>Batch Quantity</th>
              <th style={{ textAlign: 'right' }}>Add to Basket</th>
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

              return (
                <tr key={p.id}>
                  <td>
                    <div className="ws-prod-cell">
                      <div className="ws-prod-art">
                        <ProductArt product={p} />
                      </div>
                      <div>
                        <div className="ws-prod-name">{p.n}</div>
                        <div className="ws-prod-cat">{p.s} Series</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="ws-sku-badge">{p.slug || `CX-${p.id}`}</span>
                  </td>
                  <td>
                    <span className="ws-moq-pill">MOQ: {moq}</span>
                  </td>
                  <td>
                    <div className="ws-price-wholesale">{formatINR(t1)}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#059669' }}>
                      {formatINR(t2)}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="ws-qty-control">
                      <button
                        type="button"
                        className="ws-qty-btn"
                        onClick={() => handleQtyChange(p.id, currentQty - 1, moq)}
                        aria-label="Decrease quantity"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        min={moq}
                        className="ws-qty-input"
                        value={currentQty}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v)) {
                            handleQtyChange(p.id, v, moq);
                          }
                        }}
                        aria-label={`Quantity for ${p.n}`}
                      />
                      <button
                        type="button"
                        className="ws-qty-btn"
                        onClick={() => handleQtyChange(p.id, currentQty + 1, moq)}
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => handleAddRowToBasket(p)}
                      className={`ws-action-add-btn ${isInBasket ? 'in-basket' : ''}`}
                    >
                      {isInBasket ? `In Basket (${wholesaleBasket[p.id]})` : `Add ${currentQty} units`}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Floating Bottom Quick-Action Bar */}
      {wholesaleBasketSkuCount > 0 && (
        <div
          style={{
            position: 'sticky',
            bottom: '24px',
            marginTop: '32px',
            background: '#0f172a',
            borderRadius: '16px',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#ffffff',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.25)',
            zIndex: 40,
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800 }}>
              Order Basket: {wholesaleBasketSkuCount} SKUs Selected
            </div>
            <div style={{ fontSize: '12.5px', color: '#94a3b8' }}>
              Confirm wholesale order without online payment. Direct VEDA factory fulfillment.
            </div>
          </div>
          <Link href="/wholesale/order-basket" className="ws-btn-primary" style={{ background: '#e2231a' }}>
            <span>Review Order Basket &rarr;</span>
          </Link>
        </div>
      )}
    </div>
  );
}

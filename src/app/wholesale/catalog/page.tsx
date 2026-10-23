'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { ProductArt } from '@/components/ProductArt';
import { formatINR } from '@/data/products';
import type { Product } from '@/data/products';
import {
  getWholesaleTiers,
  calculateItemPriceWithOfferLimit,
} from '@/lib/storefront/wholesale-pricing';
import {
  Search,
  X,
  ShoppingBag,
  Plus,
  Minus,
  Layers,
  ArrowRight,
  Check,
  Building2,
  Filter,
  PackageCheck,
  CheckCheck,
} from 'lucide-react';
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

export default function WholesaleCatalogPage() {
  const {
    products,
    user,
    b2bProfile,
    wholesaleBasket,
    wholesaleBasketSkuCount,
    addToWholesaleBasket,
    updateWholesaleBasketQty,
    showToast,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('All Brands');
  const [selectedModel, setSelectedModel] = useState<string>('all');
  // Local row quantity map
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
        // Universal items are compatible with all brands
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

  const handleAddToBasket = (p: Product) => {
    const moq = getProductMoq(p);
    const qty = rowQuantities[p.id] || moq;
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

  const availableModels = selectedBrand !== 'All Brands' ? POPULAR_MODELS[selectedBrand] || [] : [];

  return (
    <div className="ws-page-container">
      {/* Header Bar */}
      <div className="ws-header-bar">
        <div className="ws-header-titles">
          <h1>
            <PackageCheck size={26} color="#0f172a" />
            Wholesale Procurement Catalogue
          </h1>
          <p>
            Dense automotive procurement grid · Verified MOQs, tier pricing, and direct quantity entry.
            <strong> No online payment required.</strong>
          </p>
        </div>
        <div className="ws-header-actions">
          <button type="button" onClick={handleFillAllVisibleMoqs} className="ws-btn-secondary">
            Fill All Visible MOQs
          </button>
          <button type="button" onClick={handleAddAllToBasket} className="ws-btn-secondary">
            <CheckCheck size={16} />
            <span>Add Visible to Basket</span>
          </button>
          <Link href="/wholesale/order-basket" className="ws-btn-primary">
            <ShoppingBag size={16} />
            <span>Order Basket ({wholesaleBasketSkuCount} SKUs)</span>
          </Link>
        </div>
      </div>

      {/* Multi-Vehicle & Category Filter Toolbar */}
      <div className="ws-filter-toolbar">
        <div className="ws-filter-row-primary">
          <div className="ws-search-input-wrap">
            <Search size={18} />
            <input
              type="text"
              className="ws-search-input"
              placeholder="Filter by SKU, part number, product title, or vehicle model…"
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

          {availableModels.length > 0 && (
            <div className="ws-select-wrap">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                aria-label="Filter by Vehicle Model"
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

        {/* Multi-Vehicle Brand Filter Pills */}
        <div className="ws-vehicle-pills">
          <span className="ws-vehicle-pill-label">Vehicle Brand:</span>
          {VEHICLE_BRANDS.map((b) => (
            <button
              key={b}
              type="button"
              className={`ws-vehicle-pill ${selectedBrand === b ? 'active' : ''}`}
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

      {/* Procurement Table Card */}
      <div className="ws-table-card">
        <table className="ws-procurement-table">
          <thead>
            <tr>
              <th>Product Details</th>
              <th>SKU / Part #</th>
              <th>Vehicle Fitment</th>
              <th>Factory Stock</th>
              <th>MOQ</th>
              <th>Wholesale Unit Price</th>
              <th style={{ textAlign: 'center' }}>Quantity</th>
              <th style={{ textAlign: 'right' }}>Procurement Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => {
              const moq = getProductMoq(p);
              const tiers = getWholesaleTiers(p);
              const t1 = tiers[0]?.unitPrice || Math.round(p.p * 0.85);
              const t2 = tiers[1]?.unitPrice || Math.round(p.p * 0.75);
              const currentQty = rowQuantities[p.id] || wholesaleBasket[p.id] || moq;
              const isInBasket = Boolean(wholesaleBasket[p.id]);

              return (
                <tr key={p.id}>
                  {/* Product Cell */}
                  <td>
                    <div className="ws-prod-cell">
                      <div className="ws-prod-art">
                        <ProductArt product={p} />
                      </div>
                      <div>
                        <div className="ws-prod-name">{p.n}</div>
                        <div className="ws-prod-cat">
                          {p.s} Series · {p.categoryLabel || p.c}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* SKU */}
                  <td>
                    <span className="ws-sku-badge">{p.slug || `CX-${p.id}`}</span>
                  </td>

                  {/* Fitment */}
                  <td>
                    <span className="ws-fitment-badge" title={getFitmentString(p)}>
                      {getFitmentString(p)}
                    </span>
                  </td>

                  {/* Stock / Lead Time */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="wholesale-badge-dot" />
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#047857' }}>
                        In Stock (Dispatch in 24h)
                      </span>
                    </div>
                  </td>

                  {/* MOQ */}
                  <td>
                    <span className="ws-moq-pill">MOQ: {moq}</span>
                  </td>

                  {/* Tier Pricing */}
                  <td>
                    <div>
                      <span className="ws-price-retail">{formatINR(p.p)}</span>
                      <div className="ws-price-wholesale">{formatINR(t1)}</div>
                      <div className="ws-tier2-note">Tier 2: {formatINR(t2)} (20+ units)</div>
                    </div>
                  </td>

                  {/* Direct Quantity Entry */}
                  <td style={{ textAlign: 'center' }}>
                    <div className="ws-qty-control">
                      <button
                        type="button"
                        className="ws-qty-btn"
                        onClick={() => handleRowQtyChange(p.id, currentQty - 1, moq)}
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
                            handleRowQtyChange(p.id, v, moq);
                          }
                        }}
                        aria-label={`Quantity for ${p.n}`}
                      />
                      <button
                        type="button"
                        className="ws-qty-btn"
                        onClick={() => handleRowQtyChange(p.id, currentQty + 1, moq)}
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </td>

                  {/* Procurement Action */}
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => handleAddToBasket(p)}
                      className={`ws-action-add-btn ${isInBasket ? 'in-basket' : ''}`}
                    >
                      {isInBasket ? `In Basket (${wholesaleBasket[p.id]})` : `Add ${currentQty} to Basket`}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <p style={{ fontSize: '15px', fontWeight: 600 }}>No wholesale items matched your current filters.</p>
            <button
              type="button"
              className="ws-btn-secondary"
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
                setSelectedBrand('All Brands');
                setSelectedModel('all');
              }}
              style={{ marginTop: '12px' }}
            >
              Reset All Filters
            </button>
          </div>
        )}
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
              Wholesale Order Basket: {wholesaleBasketSkuCount} SKUs Selected
            </div>
            <div style={{ fontSize: '12.5px', color: '#94a3b8' }}>
              Zero website payment required · Orders are confirmed and released directly to CarXen VEDA.
            </div>
          </div>
          <Link href="/wholesale/order-basket" className="ws-btn-primary" style={{ background: '#e2231a' }}>
            <span>Review Order Basket</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </div>
  );
}

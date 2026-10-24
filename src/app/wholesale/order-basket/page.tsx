'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ProductArt } from '@/components/ProductArt';
import { formatINR } from '@/data/products';
import type { Product } from '@/data/products';
import { calculateItemPriceWithOfferLimit } from '@/lib/storefront/wholesale-pricing';
import { WholesaleIcon } from '@/components/wholesale/WholesaleIcon';
import { Plus, Minus, Trash2, ArrowRight, Check, AlertCircle, Send, CheckCircle2 } from 'lucide-react';
import '../wholesale.css';

export default function WholesaleOrderBasketPage() {
  const router = useRouter();
  const {
    products,
    user,
    b2bProfile,
    isWholesaleApproved,
    authLoading,
    addresses,
    wholesaleBasket,
    wholesaleBasketSkuCount,
    wholesaleBasketCount,
    wholesaleBasketSubtotal,
    updateWholesaleBasketQty,
    removeFromWholesaleBasket,
    clearWholesaleBasket,
    showToast,
  } = useApp();

  // Strict B2B verification gate
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login?redirect=/wholesale/order-basket');
      } else if (!isWholesaleApproved) {
        router.replace('/wholesale');
      }
    }
  }, [authLoading, isWholesaleApproved, router, user]);

  if (authLoading || !user || !isWholesaleApproved) {
    return null;
  }

  // Confirmation form state
  const [businessName, setBusinessName] = useState(b2bProfile?.businessName || user?.name || '');
  const [tradeName, setTradeName] = useState(b2bProfile?.tradeName || '');
  const [gstin, setGstin] = useState(b2bProfile?.gstin || '');
  const [pan, setPan] = useState(b2bProfile?.pan || '');
  const [representativeName, setRepresentativeName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Shipping & Billing Address
  const [shippingLine1, setShippingLine1] = useState(b2bProfile?.businessAddress || '');
  const [shippingCity, setShippingCity] = useState(b2bProfile?.city || '');
  const [shippingState, setShippingState] = useState(b2bProfile?.state || '');
  const [shippingPincode, setShippingPincode] = useState(b2bProfile?.pincode || '');
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');

  useEffect(() => {
    if (addresses.length > 0) {
      const primary = addresses.find((a) => a.isPrimary) || addresses[0];
      setSelectedAddressId(primary.id);
      setShippingLine1(primary.addressLine1 + (primary.addressLine2 ? `, ${primary.addressLine2}` : ''));
      setShippingCity(primary.city);
      setShippingState(primary.state);
      setShippingPincode(primary.postalCode);
      if (primary.name) setRepresentativeName(primary.name);
      if (primary.phone) setPhone(primary.phone);
    }
  }, [addresses]);

  const handleSelectWarehouseAddress = (addrId: string) => {
    setSelectedAddressId(addrId);
    const target = addresses.find((a) => a.id === addrId);
    if (target) {
      setShippingLine1(target.addressLine1 + (target.addressLine2 ? `, ${target.addressLine2}` : ''));
      setShippingCity(target.city);
      setShippingState(target.state);
      setShippingPincode(target.postalCode);
      if (target.name) setRepresentativeName(target.name);
      if (target.phone) setPhone(target.phone);
    }
  };

  // PO & Factory Terms
  const [poNumber, setPoNumber] = useState('');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
  const [partialShipmentAllowed, setPartialShipmentAllowed] = useState(true);
  const [factoryNotes, setFactoryNotes] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submittedOrder, setSubmittedOrder] = useState<any | null>(null);

  // Map basket items to product objects with verified MOQs & tier pricing
  const basketLineItems = useMemo(() => {
    return Object.entries(wholesaleBasket)
      .map(([idStr, qty]) => {
        const p = products.find((x) => x.id === Number(idStr));
        if (!p) return null;
        const moq = Math.max(1, p.b2bMoq || 5);
        const priceResult = calculateItemPriceWithOfferLimit(p, qty, true);
        const lineSubtotal = priceResult.totalPrice;
        const unitPrice = Math.round(lineSubtotal / qty);
        return {
          product: p,
          quantity: qty,
          moq,
          isMoqMet: qty >= moq,
          unitPrice,
          totalPrice: lineSubtotal,
        };
      })
      .filter(Boolean) as {
      product: Product;
      quantity: number;
      moq: number;
      isMoqMet: boolean;
      unitPrice: number;
      totalPrice: number;
    }[];
  }, [wholesaleBasket, products]);

  const allMoqsMet = basketLineItems.every((item) => item.isMoqMet);
  const totalSubtotal = basketLineItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const gstAmount = Math.round(totalSubtotal * 0.18);
  const totalOrderValue = totalSubtotal + gstAmount;

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (basketLineItems.length === 0) {
      showToast('Wholesale order basket is empty.');
      return;
    }
    if (!allMoqsMet) {
      setSubmissionError('One or more items do not satisfy the minimum wholesale order quantity (MOQ).');
      return;
    }

    setSubmitting(true);
    setSubmissionError(null);

    try {
      const itemsPayload = basketLineItems.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      }));

      const res = await fetch('/api/storefront/wholesale/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsPayload,
          businessName,
          tradeName,
          gstin,
          pan,
          representativeName,
          email,
          phone,
          shippingAddress: {
            line1: shippingLine1,
            city: shippingCity,
            state: shippingState,
            postalCode: shippingPincode,
            country: 'India',
          },
          billingAddress: {
            line1: shippingLine1,
            city: shippingCity,
            state: shippingState,
            postalCode: shippingPincode,
            country: 'India',
          },
          poNumber: poNumber.trim() || undefined,
          requestedDeliveryDate: requestedDeliveryDate || undefined,
          partialShipmentAllowed,
          factoryNotes: factoryNotes.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      setSubmitting(false);

      if (!res.ok) {
        setSubmissionError(data.error || 'Failed to submit wholesale purchase order. Please verify your details.');
        return;
      }

      setSubmittedOrder(data.order || { id: 'CX-PO-' + Date.now().toString().slice(-6), totalAmount: totalOrderValue });
      clearWholesaleBasket();
      showToast('Wholesale purchase order submitted successfully to CarXen.');
    } catch (err: any) {
      setSubmitting(false);
      setSubmissionError(err?.message || 'Network error transmitting order to CarXen. Please try again.');
    }
  };

  // SUCCESS CONFIRMATION STATE
  if (submittedOrder) {
    return (
      <div className="ws-page-container">
        <div className="ws-empty-state-card" style={{ maxWidth: '640px', margin: '40px auto', padding: '48px 32px' }}>
          <div className="ws-empty-icon-wrap" style={{ background: '#ecfdf5', color: '#059669' }}>
            <CheckCircle2 size={32} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
            Wholesale Order Confirmed
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.5, marginBottom: '24px' }}>
            Your commercial purchase order for <strong>{businessName}</strong> has been transmitted directly to CarXen manufacturing operations.
          </p>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', width: '100%', marginBottom: '24px', textAlign: 'left', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>Order Reference:</span>
              <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{submittedOrder.orderNumber || submittedOrder.id}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>Commercial Total (inc. GST):</span>
              <strong style={{ color: '#0f172a' }}>{formatINR(submittedOrder.totalAmount || totalOrderValue)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Payment Mode:</span>
              <strong style={{ color: '#059669' }}>Offline Commercial Billing (No Website Payment)</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/wholesale/orders" className="ws-btn-primary ws-btn-brand">
              <span>View Wholesale Orders</span>
              <ArrowRight size={15} />
            </Link>
            <Link href="/wholesale/catalog" className="ws-btn-secondary">
              Browse More Parts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // EMPTY BASKET STATE
  if (basketLineItems.length === 0) {
    return (
      <div className="ws-page-container">
        <div className="ws-header-bar">
          <div className="ws-header-titles">
            <div className="ws-breadcrumb-kicker">
              <WholesaleIcon name="basket" size={14} />
              <span>Procurement Workspace / Order Basket</span>
            </div>
            <h1>
              <WholesaleIcon name="basket" size={26} />
              Wholesale Order Basket
            </h1>
            <p>Direct B2B procurement basket with minimum order quantity validation & zero-payment commercial confirmation.</p>
          </div>
          <div className="ws-header-actions">
            <Link href="/wholesale/catalog" className="ws-btn-primary ws-btn-brand">
              Browse Wholesale Catalogue
            </Link>
          </div>
        </div>

        <div className="ws-empty-state-card">
          <div className="ws-empty-icon-wrap">
            <WholesaleIcon name="basket" size={32} />
          </div>
          <h3>Your wholesale order basket is empty</h3>
          <p>
            Add parts from the Quick Order Matrix or Catalogue to assemble your bulk procurement request.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/wholesale/quick-order" className="ws-btn-primary ws-btn-brand">
              <WholesaleIcon name="quick-order" size={15} />
              <span>Open Quick Order Matrix</span>
            </Link>
            <Link href="/wholesale/catalog" className="ws-btn-secondary">
              <WholesaleIcon name="catalogue" size={15} />
              <span>Browse Full Catalogue</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE BASKET & ORDER CONFIRMATION
  return (
    <div className="ws-page-container">
      {/* Header Bar */}
      <div className="ws-header-bar">
        <div className="ws-header-titles">
          <div className="ws-breadcrumb-kicker">
            <WholesaleIcon name="basket" size={14} />
            <span>Procurement Workspace / Review Request</span>
          </div>
          <h1>
            <WholesaleIcon name="basket" size={26} />
            Wholesale Order Basket & PO Review
          </h1>
          <p>
            Verify wholesale SKU allocations, minimum order quantities, and delivery dispatch destination.
            <strong> Zero online payment charged on website.</strong>
          </p>
        </div>

        <div className="ws-header-actions">
          <button type="button" onClick={clearWholesaleBasket} className="ws-btn-secondary" style={{ color: '#dc2626' }}>
            <Trash2 size={15} />
            <span>Clear Basket</span>
          </button>
          <Link href="/wholesale/catalog" className="ws-btn-secondary">
            + Add More SKUs
          </Link>
        </div>
      </div>

      {submissionError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px 18px', color: '#991b1b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} />
          <span style={{ fontSize: '13.5px' }}>{submissionError}</span>
        </div>
      )}

      <form onSubmit={handleConfirmOrder}>
        <div className="ws-basket-layout">
          {/* Left Column: Basket Items Table & Delivery Info */}
          <div>
            <div className="ws-table-card" style={{ marginBottom: '24px' }}>
              <div className="ws-basket-header">
                <h2>Selected Wholesale Line Items ({basketLineItems.length} SKUs)</h2>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748b' }}>
                  Total Batch Units: {wholesaleBasketCount} pcs
                </span>
              </div>

              <table className="ws-procurement-table">
                <thead>
                  <tr>
                    <th>Product Line</th>
                    <th>Part #</th>
                    <th>MOQ Status</th>
                    <th>Wholesale Price</th>
                    <th style={{ textAlign: 'center' }}>Quantity</th>
                    <th style={{ textAlign: 'right' }}>Line Subtotal</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {basketLineItems.map(({ product: p, quantity, moq, isMoqMet, unitPrice, totalPrice }) => (
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
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="ws-sku-badge">{p.slug || `CX-${p.id}`}</span>
                      </td>

                      <td>
                        {isMoqMet ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: 700, color: '#059669', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '6px' }}>
                            <Check size={12} /> MOQ {moq} Met
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: '6px' }}>
                            Under MOQ ({moq})
                          </span>
                        )}
                      </td>

                      <td>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                          {formatINR(unitPrice)} <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>/ unit</span>
                        </div>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <div className="ws-stepper">
                          <button
                            type="button"
                            className="ws-stepper-btn"
                            onClick={() => updateWholesaleBasketQty(p.id, Math.max(1, quantity - 1))}
                            aria-label="Decrease quantity"
                          >
                            <Minus size={13} />
                          </button>
                          <input
                            type="number"
                            min={1}
                            className="ws-stepper-input"
                            value={quantity}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              if (!isNaN(v)) {
                                updateWholesaleBasketQty(p.id, v);
                              }
                            }}
                            aria-label={`Quantity for ${p.n}`}
                          />
                          <button
                            type="button"
                            className="ws-stepper-btn"
                            onClick={() => updateWholesaleBasketQty(p.id, quantity + 1)}
                            aria-label="Increase quantity"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </td>

                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                        {formatINR(totalPrice)}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => removeFromWholesaleBasket(p.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                          title="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Commercial Identity & Delivery Dispatch Destination */}
            <div className="ws-table-card" style={{ padding: '22px' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <WholesaleIcon name="account" size={18} />
                <span>Commercial Entity & Factory Dispatch Destination</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Legal Entity Name *</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13px' }}
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>GSTIN Number (for ITC Tax Credit) *</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13px', fontFamily: 'monospace' }}
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Contact Person *</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13px' }}
                    value={representativeName}
                    onChange={(e) => setRepresentativeName(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Phone / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13px' }}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Business Email *</label>
                  <input
                    type="email"
                    required
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13px' }}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {addresses.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                      Select Registered Warehouse Destination:
                    </label>
                    <Link
                      href="/wholesale/account"
                      style={{ fontSize: '11.5px', color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}
                    >
                      + Manage Warehouses
                    </Link>
                  </div>
                  <div className="ws-warehouse-selector-grid">
                    {addresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      return (
                        <div
                          key={addr.id}
                          className={`ws-warehouse-select-box ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleSelectWarehouseAddress(addr.id)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
                              {addr.label || 'Warehouse'}
                            </span>
                            {addr.isPrimary && (
                              <span style={{ fontSize: '10px', background: '#ecfdf5', color: '#059669', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                Primary
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: '11.5px', color: '#64748b', margin: '0 0 4px 0', lineHeight: 1.4 }}>
                            {addr.addressLine1}, {addr.city} - {addr.postalCode}
                          </p>
                          <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>
                            Attn: {addr.name} ({addr.phone})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Warehouse Delivery Address *</label>
                <input
                  type="text"
                  required
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13px' }}
                  placeholder="Plot/Unit, Industrial Area, Landmark"
                  value={shippingLine1}
                  onChange={(e) => setShippingLine1(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>City *</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13px' }}
                    value={shippingCity}
                    onChange={(e) => setShippingCity(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>State *</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13px' }}
                    value={shippingState}
                    onChange={(e) => setShippingState(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>PIN Code *</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13px' }}
                    value={shippingPincode}
                    onChange={(e) => setShippingPincode(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Financial Confirmation & Zero Payment Submission */}
          <div className="ws-checkout-card">
            <h3>Commercial PO Confirmation</h3>

            <div className="ws-price-row">
              <span>Selected SKUs</span>
              <strong>{basketLineItems.length}</strong>
            </div>
            <div className="ws-price-row">
              <span>Total Wholesale Units</span>
              <strong>{wholesaleBasketCount} pcs</strong>
            </div>
            <div className="ws-price-row">
              <span>Wholesale Base Subtotal</span>
              <strong>{formatINR(totalSubtotal)}</strong>
            </div>
            <div className="ws-price-row">
              <span>GST (18% ITC Eligible)</span>
              <strong>{formatINR(gstAmount)}</strong>
            </div>

            <div className="ws-price-row total">
              <span>Commercial Invoice Value</span>
              <span>{formatINR(totalOrderValue)}</span>
            </div>

            {/* Zero Payment Commercial Notice */}
            <div className="ws-trust-banner">
              <WholesaleIcon name="shield" size={20} />
              <div>
                <strong>Zero Online Payment Policy</strong>
                <span>No card or gateway charged online. CarXen issues official commercial tax invoice on batch dispatch for offline settlement.</span>
              </div>
            </div>

            {/* PO Reference */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Buyer PO Ref # (Optional)</label>
              <input
                type="text"
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '13px' }}
                placeholder="e.g. PO-2026-OCT-8841"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
              />
            </div>

            {/* Target Delivery Date */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Target Delivery Date</label>
              <input
                type="date"
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '13px' }}
                value={requestedDeliveryDate}
                onChange={(e) => setRequestedDeliveryDate(e.target.value)}
              />
            </div>

            {/* Partial Shipment */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
              <input
                type="checkbox"
                id="partialShip"
                checked={partialShipmentAllowed}
                onChange={(e) => setPartialShipmentAllowed(e.target.checked)}
              />
              <label htmlFor="partialShip" style={{ fontSize: '12px', color: '#475569', cursor: 'pointer' }}>
                Allow partial factory batch dispatch
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !allMoqsMet}
              className="ws-btn-primary ws-btn-brand"
              style={{ width: '100%', height: '44px', fontSize: '14px' }}
            >
              <Send size={16} />
              <span>{submitting ? 'Transmitting to CarXen…' : 'Submit Wholesale PO to CarXen'}</span>
            </button>

            <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: '10px' }}>
              Instant transmission to factory queue · Invoiced via CarXen
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

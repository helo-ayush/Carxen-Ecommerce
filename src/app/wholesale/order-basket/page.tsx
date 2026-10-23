'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ProductArt } from '@/components/ProductArt';
import { formatINR } from '@/data/products';
import type { Product } from '@/data/products';
import {
  calculateItemPriceWithOfferLimit,
  getWholesaleTiers,
} from '@/lib/storefront/wholesale-pricing';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
  Calendar,
  FileText,
  Truck,
  ArrowRight,
  Clock,
  Send,
  HelpCircle,
} from 'lucide-react';
import '../wholesale.css';

export default function WholesaleOrderBasketPage() {
  const router = useRouter();
  const {
    products,
    user,
    b2bProfile,
    wholesaleBasket,
    wholesaleBasketSkuCount,
    wholesaleBasketCount,
    wholesaleBasketSubtotal,
    updateWholesaleBasketQty,
    removeFromWholesaleBasket,
    clearWholesaleBasket,
    showToast,
  } = useApp();

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

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit wholesale order request.');
      }

      // Order confirmed! Clear basket and set submitted state
      clearWholesaleBasket();
      setSubmittedOrder(data);
      showToast(`Wholesale order confirmed: ${data.orderNumber}`);
    } catch (err: any) {
      setSubmissionError(err.message || 'An error occurred while confirming wholesale order.');
    } finally {
      setSubmitting(false);
    }
  };

  // SUCCESS CONFIRMATION STATE
  if (submittedOrder) {
    return (
      <div className="ws-page-container">
        <div className="ws-confirmation-card">
          <div className="ws-confirm-icon-wrap">
            <CheckCircle2 size={40} />
          </div>
          <h2>Wholesale Order Confirmed Successfully</h2>
          <p>
            Your order request has been registered in the CarXen ERP system and released to the{' '}
            <strong>VEDA Commercial & Production Desk</strong>.
          </p>

          <div className="ws-confirm-order-badge">
            <span>Order Reference:</span>
            <strong>{submittedOrder.orderNumber}</strong>
          </div>

          {/* VEDA Process Pipeline */}
          <div className="ws-pipeline-track">
            <h4>Live VEDA Factory Pipeline</h4>
            <div className="ws-pipeline-steps">
              <div className="ws-step-item active">
                <span className="ws-step-bullet">1</span>
                <span className="ws-step-title">Order Received</span>
              </div>
              <div className="ws-step-item active">
                <span className="ws-step-bullet">2</span>
                <span className="ws-step-title">VEDA Review</span>
              </div>
              <div className="ws-step-item">
                <span className="ws-step-bullet">3</span>
                <span className="ws-step-title">Commercial Accepted</span>
              </div>
              <div className="ws-step-item">
                <span className="ws-step-bullet">4</span>
                <span className="ws-step-title">In Production</span>
              </div>
              <div className="ws-step-item">
                <span className="ws-step-bullet">5</span>
                <span className="ws-step-title">Dispatched</span>
              </div>
            </div>
          </div>

          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px 20px',
              textAlign: 'left',
              marginBottom: '28px',
              fontSize: '13px',
              lineHeight: 1.6,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: '#64748b' }}>Commercial Settlement:</span>
              <strong style={{ color: '#059669' }}>Offline VEDA Terms (No Online Payment)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: '#64748b' }}>Total Order Value:</span>
              <strong style={{ color: '#0f172a' }}>{formatINR(submittedOrder.totalAmount)} (incl. 18% GST)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Items & Quantity:</span>
              <span style={{ color: '#0f172a' }}>
                {submittedOrder.skuCount} SKUs ({submittedOrder.itemCount} total units)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link href="/wholesale/orders" className="ws-btn-primary">
              Track in Wholesale Orders
            </Link>
            <Link href="/wholesale/catalog" className="ws-btn-secondary">
              Procure More SKUs
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
            <h1>
              <ShoppingBag size={26} color="#0f172a" />
              Wholesale Order Basket
            </h1>
            <p>Direct B2B procurement basket · Minimum order quantities & volume tier verification.</p>
          </div>
          <div className="ws-header-actions">
            <Link href="/wholesale/catalog" className="ws-btn-primary">
              Browse Wholesale Catalogue
            </Link>
          </div>
        </div>

        <div className="ws-table-card" style={{ padding: '64px 24px', textAlign: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#94a3b8',
            }}
          >
            <ShoppingBag size={32} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
            Your wholesale order basket is currently empty
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '520px', margin: '0 auto 24px' }}>
            Open the dense wholesale catalogue or quick-order matrix to select products, verify MOQs, and submit directly to CarXen VEDA.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link href="/wholesale/catalog" className="ws-btn-primary">
              Open Catalogue
            </Link>
            <Link href="/wholesale/quick-order" className="ws-btn-secondary">
              Open Quick Order Sheet
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE BASKET & ORDER SUBMISSION FORM
  return (
    <div className="ws-page-container">
      {/* Header Bar */}
      <div className="ws-header-bar">
        <div className="ws-header-titles">
          <h1>
            <ShoppingBag size={26} color="#0f172a" />
            Wholesale Order Basket & Request
          </h1>
          <p>
            Review bulk order SKUs, verify MOQs, and attach purchase order details.
            <strong> No payment required on website.</strong>
          </p>
        </div>
        <div className="ws-header-actions">
          <button type="button" onClick={clearWholesaleBasket} className="ws-btn-danger">
            <Trash2 size={15} />
            <span>Clear Basket</span>
          </button>
          <Link href="/wholesale/catalog" className="ws-btn-secondary">
            + Add More SKUs
          </Link>
        </div>
      </div>

      {/* Zero Payment Protocol Banner */}
      <div className="ws-notice-banner">
        <div className="ws-notice-icon">
          <ShieldCheck size={24} />
        </div>
        <div className="ws-notice-content">
          <h4>Commercial Terms: Zero Online Payment</h4>
          <p>
            This order request will be transmitted directly to CarXen VEDA manufacturing operations.
            No credit card, UPI, or payment gateway is used. Your account representative will coordinate
            commercial invoicing and offline credit/RTGS settlement according to your approved wholesale agreement.
          </p>
        </div>
      </div>

      {submissionError && (
        <div className="b2b-error-banner" role="alert" style={{ marginBottom: '24px' }}>
          <div className="b2b-error-icon-wrap">
            <AlertCircle size={18} />
          </div>
          <div className="b2b-error-content">
            <div className="b2b-error-title">Wholesale Order Notice</div>
            <div className="b2b-error-msg">{submissionError}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleConfirmOrder}>
        <div className="ws-basket-layout">
          {/* Left Column: Basket Items Table & Business Details */}
          <div>
            {/* Items Card */}
            <div className="ws-basket-items-card" style={{ marginBottom: '24px' }}>
              <div className="ws-basket-header">
                <h2>Selected Wholesale SKUs ({basketLineItems.length})</h2>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                  Total Units: {wholesaleBasketCount}
                </span>
              </div>

              {basketLineItems.map(({ product: p, quantity, moq, isMoqMet, unitPrice, totalPrice }) => (
                <div key={p.id} className="ws-basket-item-row">
                  <div className="ws-basket-item-info">
                    <div className="ws-prod-art">
                      <ProductArt product={p} />
                    </div>
                    <div className="ws-basket-item-details">
                      <h4>{p.n}</h4>
                      <div className="ws-basket-meta">
                        <span className="ws-sku-badge">{p.slug || `CX-${p.id}`}</span>
                        <span>·</span>
                        <span style={{ color: isMoqMet ? '#059669' : '#dc2626', fontWeight: 600 }}>
                          MOQ: {moq} {isMoqMet ? '✓' : `(Under MOQ)`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="ws-qty-control">
                    <button
                      type="button"
                      className="ws-qty-btn"
                      onClick={() => updateWholesaleBasketQty(p.id, Math.max(0, quantity - 1))}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      className="ws-qty-input"
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
                      className="ws-qty-btn"
                      onClick={() => updateWholesaleBasketQty(p.id, quantity + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Pricing */}
                  <div className="ws-basket-pricing">
                    <div className="ws-basket-total-price">{formatINR(totalPrice)}</div>
                    <div className="ws-basket-unit-price">{formatINR(unitPrice)} / unit</div>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeFromWholesaleBasket(p.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      padding: '6px',
                    }}
                    title="Remove item"
                    aria-label={`Remove ${p.n}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Business & Delivery Dispatch Details */}
            <div className="ws-basket-items-card">
              <div className="ws-basket-header">
                <h2>Commercial Details & Delivery Location</h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>For GST Proforma & Dispatch</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="ws-form-group">
                  <label className="ws-form-label">Legal Business Name *</label>
                  <input
                    type="text"
                    required
                    className="ws-form-input"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
                <div className="ws-form-group">
                  <label className="ws-form-label">GSTIN Number *</label>
                  <input
                    type="text"
                    required
                    className="ws-form-input"
                    placeholder="22AAAAA0000A1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="ws-form-group">
                  <label className="ws-form-label">Contact Person *</label>
                  <input
                    type="text"
                    required
                    className="ws-form-input"
                    value={representativeName}
                    onChange={(e) => setRepresentativeName(e.target.value)}
                  />
                </div>
                <div className="ws-form-group">
                  <label className="ws-form-label">Phone / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    className="ws-form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="ws-form-group">
                  <label className="ws-form-label">Business Email *</label>
                  <input
                    type="email"
                    required
                    className="ws-form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="ws-form-group">
                <label className="ws-form-label">Delivery Warehouse / Store Address *</label>
                <input
                  type="text"
                  required
                  className="ws-form-input"
                  placeholder="Street, Industrial Phase, Landmark"
                  value={shippingLine1}
                  onChange={(e) => setShippingLine1(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="ws-form-group">
                  <label className="ws-form-label">City *</label>
                  <input
                    type="text"
                    required
                    className="ws-form-input"
                    value={shippingCity}
                    onChange={(e) => setShippingCity(e.target.value)}
                  />
                </div>
                <div className="ws-form-group">
                  <label className="ws-form-label">State *</label>
                  <input
                    type="text"
                    required
                    className="ws-form-input"
                    value={shippingState}
                    onChange={(e) => setShippingState(e.target.value)}
                  />
                </div>
                <div className="ws-form-group">
                  <label className="ws-form-label">PIN Code *</label>
                  <input
                    type="text"
                    required
                    className="ws-form-input"
                    placeholder="110001"
                    value={shippingPincode}
                    onChange={(e) => setShippingPincode(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary, PO Reference, & Submit */}
          <div className="ws-order-sidebar">
            <div className="ws-order-summary-card">
              <h3>Wholesale Order Summary</h3>

              <div className="ws-summary-row">
                <span>Total SKUs</span>
                <strong>{basketLineItems.length}</strong>
              </div>
              <div className="ws-summary-row">
                <span>Total Wholesale Units</span>
                <strong>{wholesaleBasketCount} pcs</strong>
              </div>
              <div className="ws-summary-row">
                <span>Wholesale Subtotal</span>
                <strong>{formatINR(totalSubtotal)}</strong>
              </div>
              <div className="ws-summary-row">
                <span>Estimated GST (18%)</span>
                <strong>{formatINR(gstAmount)}</strong>
              </div>

              <div className="ws-summary-row total">
                <span>Expected Total Value</span>
                <span>{formatINR(totalOrderValue)}</span>
              </div>

              <div className="ws-gst-notice">
                ✓ Verified GST Input Tax Credit (ITC) applicable. Formal Tax Invoice issued upon VEDA dispatch.
              </div>

              {/* PO Number */}
              <div className="ws-form-group" style={{ marginTop: '20px' }}>
                <label className="ws-form-label">Purchase Order (PO) Ref #</label>
                <input
                  type="text"
                  className="ws-form-input"
                  placeholder="e.g. PO-2026-OCT-8841"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                />
              </div>

              {/* Requested Delivery Date */}
              <div className="ws-form-group">
                <label className="ws-form-label">Requested Target Delivery Date</label>
                <input
                  type="date"
                  className="ws-form-input"
                  value={requestedDeliveryDate}
                  onChange={(e) => setRequestedDeliveryDate(e.target.value)}
                />
              </div>

              {/* Factory Notes */}
              <div className="ws-form-group">
                <label className="ws-form-label">Special Notes for VEDA Factory</label>
                <textarea
                  className="ws-form-textarea"
                  placeholder="Custom packing, labeling, or staggered batch requests…"
                  value={factoryNotes}
                  onChange={(e) => setFactoryNotes(e.target.value)}
                />
              </div>

              {/* Partial Shipment Allowed */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="checkbox"
                  id="partialShip"
                  checked={partialShipmentAllowed}
                  onChange={(e) => setPartialShipmentAllowed(e.target.checked)}
                />
                <label htmlFor="partialShip" style={{ fontSize: '12.5px', color: '#475569', cursor: 'pointer' }}>
                  Allow partial shipments if certain SKUs finish earlier
                </label>
              </div>

              {/* Confirmation Button */}
              <button
                type="submit"
                disabled={submitting || !allMoqsMet}
                className="ws-submit-order-btn"
              >
                <Send size={18} />
                <span>
                  {submitting ? 'Transmitting to VEDA…' : 'Confirm Wholesale Order'}
                </span>
              </button>

              <div
                style={{
                  fontSize: '11.5px',
                  color: '#64748b',
                  textAlign: 'center',
                  marginTop: '12px',
                  lineHeight: 1.5,
                }}
              >
                By clicking Confirm, this wholesale order is released directly to CarXen VEDA. No online payment will be charged.
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

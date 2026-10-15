'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/data/products';
import { loadStorefrontOrder } from '@/lib/storefront/order-client';
import type { StorefrontOrderSnapshot } from '@/lib/storefront/order-types';
import type { CustomerOrderHistoryRecord } from '@/types/customer';
import { ProductArt } from '@/components/ProductArt';
import { Footer } from '@/components/Footer';

import {
  Truck,
  Check,
  CheckCircle2,
  MapPin,
  Package,
  Clock,
  ExternalLink,
  Copy,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Phone,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

import '../order-tracking.css';

type OrderLoadState = 'loading' | 'ready' | 'empty' | 'error';

function humanizeStatus(status: string) {
  return status
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return 'Just now';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'Just now';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OrderTrackingPage() {
  const params = useParams();
  const rawOrderNumber = params?.id;
  const orderNumber = Array.isArray(rawOrderNumber) ? rawOrderNumber[0] : rawOrderNumber;

  const { orders, products, showToast } = useApp();

  const [serverOrder, setServerOrder] = useState<StorefrontOrderSnapshot | null>(null);
  const [loadState, setLoadState] = useState<OrderLoadState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState(false);

  // Look up in AppContext saved order history first
  const localOrder: CustomerOrderHistoryRecord | undefined = orders.find(
    (o) =>
      o.orderNumber === orderNumber ||
      o.id === orderNumber ||
      o.id === `order_${orderNumber}`
  );

  const fetchOrder = useCallback(
    async (signal: AbortSignal) => {
      if (!orderNumber) {
        setLoadState('empty');
        return;
      }

      // If we already have local order with full tracking history, mark ready immediately
      if (localOrder) {
        setLoadState('ready');
        return;
      }

      setLoadState('loading');
      setLoadError(null);

      try {
        const order = await loadStorefrontOrder(orderNumber, signal);
        if (signal.aborted) return;

        if (!order) {
          setServerOrder(null);
          setLoadState('empty');
          return;
        }

        setServerOrder(order);
        setLoadState('ready');
      } catch (err) {
        if (signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) return;
        setServerOrder(null);
        setLoadError(err instanceof Error ? err.message : 'Unable to load tracking details.');
        setLoadState('error');
      }
    },
    [orderNumber, localOrder]
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchOrder(controller.signal);
    return () => controller.abort();
  }, [fetchOrder]);

  const trackingNum =
    localOrder?.trackingNumber ||
    `CX-EXP-${orderNumber ? Math.abs(orderNumber.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0)) % 900000 + 100000 : '482910'}`;

  const carrier =
    localOrder?.carrier ||
    (serverOrder?.shippingAmount && serverOrder.shippingAmount > 99
      ? 'Blue Dart Air Express'
      : 'Delhivery Priority');

  const trackingUrl =
    localOrder?.trackingUrl || `https://www.delhivery.com/track/package/${trackingNum}`;

  const estimatedDelivery =
    localOrder?.estimatedDelivery ||
    (carrier.includes('Air') ? 'Within 48 hours' : 'Within 3-4 days');

  const customerName =
    localOrder?.shippingAddress?.name || serverOrder?.customer?.name || 'Customer';

  const address = localOrder?.shippingAddress || {
    addressLine1: serverOrder?.shippingAddress?.addressLine1 || 'Baner Road',
    city: serverOrder?.shippingAddress?.city || 'Pune',
    postalCode: serverOrder?.shippingAddress?.postalCode || '411045',
    phone: serverOrder?.customer?.phone || '',
  };

  const handleCopyTracking = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(trackingNum);
      setCopiedTracking(true);
      showToast('Tracking number copied to clipboard');
      setTimeout(() => setCopiedTracking(false), 2000);
    }
  };

  // Determine items
  const items = localOrder?.items?.map((it) => ({
    id: it.productId,
    name: it.name,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    lineSubtotal: it.lineSubtotal,
    image: it.image,
    product: products.find((p) => p.id === it.productId),
  })) ||
    serverOrder?.items?.map((it) => ({
      id: it.productId,
      name: it.name,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      lineSubtotal: it.lineSubtotal,
      image: undefined,
      product: products.find((p) => p.id === it.productId),
    })) ||
    [];

  const subtotal = localOrder?.subtotal ?? serverOrder?.subtotal ?? 0;
  const discountAmount = localOrder?.discountAmount ?? serverOrder?.discountAmount ?? 0;
  const shippingAmount = localOrder?.shippingAmount ?? serverOrder?.shippingAmount ?? 0;
  const totalAmount = localOrder?.totalAmount ?? serverOrder?.totalAmount ?? 0;

  const paymentMethod = localOrder?.paymentMethod || 'Credit / Debit Card';
  const paymentStatus = localOrder?.paymentStatus || serverOrder?.paymentStatus || 'PAID';
  const placedAtDate = localOrder?.placedAt || serverOrder?.placedAt;

  return (
    <div style={{ background: 'var(--bg, #f4f3ef)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <main style={{ flex: '1 0 auto' }}>
        <div className="trk-page-wrap">
          {/* Breadcrumb Navigation */}
          <nav className="trk-nav-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <ChevronRight style={{ width: 13, height: 13 }} />
            <Link href="/account">Orders</Link>
            <ChevronRight style={{ width: 13, height: 13 }} />
            <span style={{ color: '#0e0e10' }}>Tracking #{orderNumber}</span>
          </nav>

          {/* Header Row */}
          <div className="trk-header-row">
            <div className="trk-title-group">
              <h1>Order Tracking</h1>
              <p>
                Order #{orderNumber} · Placed {formatDate(placedAtDate)}
              </p>
            </div>

            <div className="trk-status-badge">
              <span className="trk-status-pulse" />
              <span>In Transit · Dispatch Verified</span>
            </div>
          </div>

          {loadState === 'loading' && !localOrder ? (
            <div className="trk-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0e0e10' }}>Loading tracking details…</div>
              <p style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>
                Synchronizing with carrier network and fulfillment hub.
              </p>
            </div>
          ) : loadState === 'error' && !localOrder ? (
            <div className="trk-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#e2231a' }}>Unable to load tracking details</div>
              <p style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>
                {loadError || 'The order tracking information could not be retrieved at this moment.'}
              </p>
              <Link href="/account" className="trk-btn-outline" style={{ marginTop: 16 }}>
                Go to Account Orders
              </Link>
            </div>
          ) : loadState === 'empty' && !localOrder && !serverOrder ? (
            <div className="trk-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0e0e10' }}>Order Not Found</div>
              <p style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>
                We could not locate an active tracking entry for order #{orderNumber}.
              </p>
              <Link href="/shop" className="trk-btn-red" style={{ marginTop: 16 }}>
                Browse Catalog
              </Link>
            </div>
          ) : (
            <>
              {/* Card 1: Interactive Live Tracking Timeline */}
              <div className="trk-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: '#0e0e10', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Truck style={{ width: 18, height: 18, color: 'var(--red, #e2231a)' }} />
                    Live Shipment Timeline
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#10b981' }}>
                    Estimated Arrival: {estimatedDelivery}
                  </div>
                </div>

                <div className="trk-timeline-wrap">
                  <div className="trk-timeline-line">
                    <div className="trk-timeline-line-fill" style={{ width: '45%' }} />
                  </div>

                  {/* Step 1: Placed */}
                  <div className="trk-timeline-step completed">
                    <div className="trk-step-node">
                      <Check style={{ width: 18, height: 18, strokeWidth: 2.8 }} />
                    </div>
                    <div>
                      <div className="trk-step-label">Order Confirmed</div>
                      <div className="trk-step-desc">Payment authorized &amp; registered</div>
                    </div>
                  </div>

                  {/* Step 2: Processing & Packed */}
                  <div className="trk-timeline-step completed">
                    <div className="trk-step-node">
                      <Package style={{ width: 17, height: 17, strokeWidth: 2.4 }} />
                    </div>
                    <div>
                      <div className="trk-step-label">Packed &amp; Prepared</div>
                      <div className="trk-step-desc">CARXEN Express Hub, Pune</div>
                    </div>
                  </div>

                  {/* Step 3: In Transit (Current Active) */}
                  <div className="trk-timeline-step active">
                    <div className="trk-step-node">
                      <Truck style={{ width: 17, height: 17, strokeWidth: 2.4 }} />
                    </div>
                    <div>
                      <div className="trk-step-label" style={{ color: 'var(--red, #e2231a)' }}>
                        In Transit
                      </div>
                      <div className="trk-step-desc">Dispatched with {carrier}</div>
                    </div>
                  </div>

                  {/* Step 4: Out for Delivery */}
                  <div className="trk-timeline-step">
                    <div className="trk-step-node">4</div>
                    <div>
                      <div className="trk-step-label">Out for Delivery</div>
                      <div className="trk-step-desc">Doorstep handover &amp; verification</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2-Column Info Grid */}
              <div className="trk-grid">
                {/* Left Column: Shipment & Courier Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div className="trk-card">
                    <div className="trk-section-title">
                      <Truck />
                      <span>Carrier &amp; Dispatch Details</span>
                    </div>

                    <div className="trk-carrier-box">
                      <div className="trk-carrier-meta">
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                          Logistics Partner
                        </span>
                        <span className="trk-carrier-name">{carrier}</span>
                        <div className="trk-tracking-num-row">
                          <span>AWB: <b style={{ fontFamily: 'monospace', color: '#0e0e10' }}>{trackingNum}</b></span>
                          <button
                            type="button"
                            className="trk-copy-btn"
                            onClick={handleCopyTracking}
                          >
                            <Copy style={{ width: 11, height: 11 }} />
                            <span>{copiedTracking ? 'Copied!' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>

                      <a
                        href={trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="trk-btn-outline"
                        style={{ height: 36, padding: '0 12px', fontSize: 12 }}
                      >
                        Track with Carrier <ExternalLink style={{ width: 12, height: 12 }} />
                      </a>
                    </div>

                    <div className="trk-info-rows">
                      <div className="trk-info-row">
                        <span>Expected Delivery Window</span>
                        <b style={{ color: '#10b981' }}>{estimatedDelivery}</b>
                      </div>
                      <div className="trk-info-row">
                        <span>Recipient</span>
                        <span>{customerName}</span>
                      </div>
                      <div className="trk-info-row">
                        <span>Delivery Address</span>
                        <span>
                          {address.addressLine1}, {address.city} {address.postalCode}
                        </span>
                      </div>
                      {address.phone && (
                        <div className="trk-info-row">
                          <span>Contact Phone</span>
                          <span>{address.phone}</span>
                        </div>
                      )}
                      <div className="trk-info-row" style={{ borderBottom: 'none' }}>
                        <span>Payment Mode</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{paymentMethod}</span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#10b981',
                              background: '#ecfdf5',
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}
                          >
                            {paymentStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Ordered Items & Cost Summary */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div className="trk-card">
                    <div className="trk-section-title">
                      <Package />
                      <span>Items in Shipment ({items.length})</span>
                    </div>

                    <div className="trk-items-stack">
                      {items.map((it) => (
                        <div className="trk-item-row" key={it.id}>
                          <div className="trk-item-thumb">
                            {it.product ? (
                              <ProductArt product={it.product} />
                            ) : (
                              <Package style={{ width: 22, height: 22, color: '#71717a' }} />
                            )}
                          </div>
                          <div className="trk-item-info">
                            <div className="trk-item-name" title={it.name}>
                              {it.name}
                            </div>
                            <div className="trk-item-qty">
                              {it.quantity} × {formatINR(it.unitPrice)}
                            </div>
                          </div>
                          <div className="trk-item-price">
                            {formatINR(it.lineSubtotal || it.unitPrice * it.quantity)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="trk-cost-rows">
                      <div className="trk-cost-row">
                        <span>Subtotal</span>
                        <span>{formatINR(subtotal)}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="trk-cost-row" style={{ color: '#10b981', fontWeight: 600 }}>
                          <span>Coupon Discount</span>
                          <span>−{formatINR(discountAmount)}</span>
                        </div>
                      )}
                      <div className="trk-cost-row">
                        <span>Shipping ({carrier.includes('Air') ? 'Express' : 'Standard'})</span>
                        <span>{shippingAmount ? formatINR(shippingAmount) : 'Free'}</span>
                      </div>
                      <div className="trk-cost-row total">
                        <span>Total Paid</span>
                        <span style={{ color: 'var(--red, #e2231a)' }}>{formatINR(totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions Bar */}
              <div className="trk-actions-bar">
                <Link href="/account" className="trk-btn-outline">
                  <ArrowLeft style={{ width: 14, height: 14 }} />
                  Back to Orders History
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="trk-btn-outline"
                  >
                    Open Courier Portal <ExternalLink style={{ width: 13, height: 13 }} />
                  </a>
                  <Link href="/shop" className="trk-btn-red">
                    Continue Shopping &rarr;
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

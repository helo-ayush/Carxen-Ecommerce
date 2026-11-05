'use client';

import React, { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/data/products';
import { loadStorefrontOrder } from '@/lib/storefront/order-client';
import type { StorefrontOrderSnapshot } from '@/lib/storefront/order-types';
import {
  getOrderStatusMessage,
  normalizeOrderStatus,
  ORDER_STAGE_FLOW,
  ORDER_STAGE_LABELS,
  orderStageStep,
} from '@/lib/order-stages';
import type { CustomerOrderHistoryRecord, OrderProgressStatus } from '@/types/customer';
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
  Printer,
} from 'lucide-react';

import '../order-tracking.css';

type OrderLoadState = 'loading' | 'ready' | 'empty' | 'error';

const STAGE_DESCRIPTIONS: Record<OrderProgressStatus, string> = {
  CONFIRMED: 'Payment authorized & registered',
  PACKED: 'Packed at CARXEN fulfilment centre',
  SHIPPED: 'Handed over to the courier partner',
  OUT_FOR_DELIVERY: 'Doorstep handover & verification',
  DELIVERED: 'Received by the customer',
  CANCELLED: 'Order cancelled',
};

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

function OrderTrackingContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawOrderNumber = params?.id;
  const orderNumber = Array.isArray(rawOrderNumber) ? rawOrderNumber[0] : rawOrderNumber;
  const isConfirmed = searchParams.get('confirmed') === '1' || searchParams.get('confirmed') === 'true';

  const { orders, products, showToast } = useApp();

  const [serverOrder, setServerOrder] = useState<StorefrontOrderSnapshot | null>(null);
  const [loadState, setLoadState] = useState<OrderLoadState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState(false);

  // Confetti Canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isConfirmed && typeof window !== 'undefined') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const colors = ['#e2231a', '#ff4d4d', '#10b981', '#f59e0b', '#0e0e10', '#ffffff', '#fbbf24'];
      const particles: Array<{
        x: number;
        y: number;
        vx: number;
        vy: number;
        size: number;
        rotation: number;
        vRot: number;
        color: string;
        shape: string;
        opacity: number;
      }> = [];

      for (let i = 0; i < 140; i++) {
        particles.push({
          x: canvas.width / 2 + (Math.random() - 0.5) * 200,
          y: canvas.height * 0.35,
          vx: (Math.random() - 0.5) * 16,
          vy: -Math.random() * 14 - 4,
          size: Math.random() * 8 + 5,
          rotation: Math.random() * 360,
          vRot: (Math.random() - 0.5) * 12,
          color: colors[Math.floor(Math.random() * colors.length)],
          shape: Math.random() > 0.4 ? 'rect' : 'circle',
          opacity: 1,
        });
      }

      let frame = 0;
      let animId: number;
      const render = () => {
        frame++;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.35;
          p.vx *= 0.985;
          p.rotation += p.vRot;

          if (frame > 120) {
            p.opacity = Math.max(0, 1 - (frame - 120) / 100);
          }

          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;

          if (p.shape === 'rect') {
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        });

        if (frame < 220) {
          animId = requestAnimationFrame(render);
        }
      };

      animId = requestAnimationFrame(render);
      return () => {
        if (animId) cancelAnimationFrame(animId);
      };
    }
  }, [isConfirmed]);

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

      setLoadState(localOrder ? 'ready' : 'loading');
      setLoadError(null);

      try {
        const order = await loadStorefrontOrder(orderNumber, signal);
        if (signal.aborted) return;

        if (!order) {
          if (!localOrder) {
            setServerOrder(null);
            setLoadState('empty');
          }
          return;
        }

        setServerOrder(order);
        setLoadState('ready');
      } catch (err) {
        if (signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) return;
        if (!localOrder) {
          setServerOrder(null);
          setLoadError(err instanceof Error ? err.message : 'Unable to load tracking details.');
          setLoadState('error');
        }
      }
    },
    [orderNumber, localOrder]
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchOrder(controller.signal);
    return () => controller.abort();
  }, [fetchOrder]);

  const trackingNum = localOrder?.trackingNumber || serverOrder?.trackingNumber || '';
  const carrier = localOrder?.carrier || serverOrder?.carrier || 'CarXen Express Delivery';
  const trackingUrl = localOrder?.trackingUrl || serverOrder?.trackingUrl;
  const estimatedDelivery = localOrder?.estimatedDelivery || serverOrder?.estimatedDelivery || '';

  const customerName =
    localOrder?.shippingAddress?.name || serverOrder?.customer?.name || 'Customer';

  const address = localOrder?.shippingAddress || {
    addressLine1: serverOrder?.shippingAddress?.addressLine1 || 'Kashmere Gate',
    city: serverOrder?.shippingAddress?.city || 'Delhi',
    postalCode: serverOrder?.shippingAddress?.postalCode || '110006',
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

  const paymentMethod = localOrder?.paymentMethod || serverOrder?.paymentMethod || 'Credit / Debit Card';
  const paymentStatus = localOrder?.paymentStatus || serverOrder?.paymentStatus || 'PAID';
  const placedAtDate = localOrder?.placedAt || serverOrder?.placedAt;

  const progressStatus: OrderProgressStatus = serverOrder
    ? normalizeOrderStatus(serverOrder.fulfillmentStatus || serverOrder.status)
    : localOrder?.status || 'CONFIRMED';
  const stageStep = orderStageStep(progressStatus);

  return (
    <div style={{ background: 'var(--bg, #f4f3ef)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Confetti canvas */}
      <canvas ref={canvasRef} className="trk-confetti-canvas" />

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

          {/* CELEBRATION CONFIRMATION BANNER */}
          {isConfirmed && (
            <div
              className="trk-confirm-banner"
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#ffffff',
                borderRadius: '14px',
                padding: '22px 26px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '18px',
                flexWrap: 'wrap',
                boxShadow: '0 10px 25px -5px rgba(5, 150, 105, 0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '12px', flexShrink: 0 }}>
                  <CheckCircle2 size={30} color="#ffffff" />
                </div>
                <div>
                  <h2 style={{ fontSize: '19px', fontWeight: 800, margin: '0 0 4px 0', color: '#ffffff' }}>
                    Order Confirmed!
                  </h2>
                  <p style={{ margin: 0, fontSize: '13.5px', color: 'rgba(255,255,255,0.92)', lineHeight: 1.5 }}>
                    Thank you for choosing CARXEN, <strong>{customerName}</strong>. Your order <strong>#{orderNumber}</strong> has been received and forwarded to our fulfillment center.
                    This receipt is permanent, reloadable, and registered to your account.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    background: '#ffffff',
                    color: '#047857',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    padding: '9px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                  }}
                >
                  <Printer size={15} />
                  <span>Print Slip</span>
                </button>
                <Link
                  href="/shop"
                  style={{
                    background: 'rgba(255,255,255,0.18)',
                    color: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.3)',
                    fontWeight: 700,
                    fontSize: '13px',
                    padding: '9px 16px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Continue Shopping &rarr;</span>
                </Link>
              </div>
            </div>
          )}

          {/* Header Row */}
          <div className="trk-header-row">
            <div className="trk-title-group">
              <h1>Order Tracking &amp; Receipt</h1>
              <p>
                Order #{orderNumber} · Placed {formatDate(placedAtDate)}
              </p>
            </div>

            <div className="trk-status-badge">
              {progressStatus !== 'DELIVERED' && progressStatus !== 'CANCELLED' && (
                <span className="trk-status-pulse" />
              )}
              <span>{ORDER_STAGE_LABELS[progressStatus]} · {getOrderStatusMessage(progressStatus)}</span>
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
                  {estimatedDelivery && (
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#10b981' }}>
                      Estimated Arrival: {estimatedDelivery}
                    </div>
                  )}
                </div>

                <div className="trk-timeline-wrap">
                  <div className="trk-timeline-line">
                    <div
                      className="trk-timeline-line-fill"
                      style={{ width: `${(stageStep / ORDER_STAGE_FLOW.length) * 100}%` }}
                    />
                  </div>

                  {ORDER_STAGE_FLOW.map((stage, idx) => {
                    const reached = stageStep >= idx + 1;
                    const isCurrent = stageStep === idx + 1;
                    const StepIcon = [Check, Package, Truck, MapPin, CheckCircle2][idx];
                    return (
                      <div
                        key={stage}
                        className={`trk-timeline-step ${reached ? (isCurrent ? 'active' : 'completed') : ''}`}
                      >
                        <div className="trk-step-node">
                          {reached ? (
                            <StepIcon style={{ width: 17, height: 17, strokeWidth: 2.4 }} />
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <div>
                          <div
                            className="trk-step-label"
                            style={isCurrent ? { color: 'var(--red, #e2231a)' } : undefined}
                          >
                            {ORDER_STAGE_LABELS[stage]}
                          </div>
                          <div className="trk-step-desc">{STAGE_DESCRIPTIONS[stage]}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {progressStatus === 'CANCELLED' && (
                  <div style={{ marginTop: 10, fontSize: 12.5, color: '#71717a' }}>
                    This order was cancelled and is no longer being fulfilled.
                  </div>
                )}
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
                        {trackingNum ? (
                          <div className="trk-tracking-num-row">
                            <span>Run: <b style={{ fontFamily: 'monospace', color: '#0e0e10' }}>{trackingNum}</b></span>
                            <button
                              type="button"
                              className="trk-copy-btn"
                              onClick={handleCopyTracking}
                            >
                              <Copy style={{ width: 11, height: 11 }} />
                              <span>{copiedTracking ? 'Copied!' : 'Copy'}</span>
                            </button>
                          </div>
                        ) : (
                          <div className="trk-tracking-num-row">
                            <span style={{ color: '#71717a' }}>Awaiting dispatch</span>
                          </div>
                        )}
                      </div>

                      {trackingUrl && (
                        <a
                          href={trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="trk-btn-outline"
                          style={{ height: 36, padding: '0 12px', fontSize: 12 }}
                        >
                          Track with Carrier <ExternalLink style={{ width: 12, height: 12 }} />
                        </a>
                      )}
                    </div>

                    <div className="trk-info-rows">
                      {estimatedDelivery && (
                        <div className="trk-info-row">
                          <span>Expected Delivery Window</span>
                          <b style={{ color: '#10b981' }}>{estimatedDelivery}</b>
                        </div>
                      )}
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

                      {/* Statutory 18% GST Breakdown (Included in Retail Price) */}
                      {(() => {
                        const netProducts = Math.max(0, subtotal - (discountAmount || 0));
                        const taxable = Math.round((netProducts / 1.18) * 100) / 100;
                        const gst = Math.round((netProducts - taxable) * 100) / 100;
                        const destState = ((address as any)?.state || '').trim().toLowerCase();
                        const isInter = destState !== 'delhi' && destState !== 'dl' && destState !== 'new delhi';
                        return (
                          <>
                            <div className="trk-cost-row" style={{ fontSize: 12, color: '#64748b' }}>
                              <span>Taxable Base</span>
                              <span>{formatINR(taxable)}</span>
                            </div>
                            {isInter ? (
                              <div className="trk-cost-row" style={{ fontSize: 12, color: '#64748b' }}>
                                <span>IGST (18% Incl.)</span>
                                <span>{formatINR(gst)}</span>
                              </div>
                            ) : (
                              <>
                                <div className="trk-cost-row" style={{ fontSize: 12, color: '#64748b' }}>
                                  <span>CGST (9% Incl.)</span>
                                  <span>{formatINR(Math.round((gst / 2) * 100) / 100)}</span>
                                </div>
                                <div className="trk-cost-row" style={{ fontSize: 12, color: '#64748b' }}>
                                  <span>SGST (9% Incl.)</span>
                                  <span>{formatINR(Math.round((gst / 2) * 100) / 100)}</span>
                                </div>
                              </>
                            )}
                          </>
                        );
                      })()}

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
                  {trackingUrl && (
                    <a
                      href={trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="trk-btn-outline"
                    >
                      Open Courier Portal <ExternalLink style={{ width: 13, height: 13 }} />
                    </a>
                  )}
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

export default function OrderTrackingPage() {
  return (
    <Suspense
      fallback={
        <div style={{ background: 'var(--bg, #f4f3ef)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0e0e10' }}>Loading tracking details…</div>
        </div>
      }
    >
      <OrderTrackingContent />
    </Suspense>
  );
}

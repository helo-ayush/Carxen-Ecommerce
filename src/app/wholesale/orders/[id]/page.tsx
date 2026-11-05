'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/data/products';
import { WholesaleIcon } from '@/components/wholesale/WholesaleIcon';
import {
  CheckCircle2,
  Printer,
  RotateCcw,
  MapPin,
  Building2,
  Calendar,
  FileText,
  Truck,
  ChevronLeft,
  AlertCircle,
  Copy,
  Check,
  XCircle,
  HelpCircle,
  PackageCheck,
  ShieldCheck,
  Clock,
  ArrowRight
} from 'lucide-react';
import '../../wholesale.css';

const STAGES = [
  { id: 'CONFIRMED_BY_BUYER', label: '1. PO Placed', shortLabel: '1. Placed', order: 1 },
  { id: 'UNDER_CARXEN_REVIEW', label: '2. CarXen Review', shortLabel: '2. Review', order: 2 },
  { id: 'ACCEPTED', label: '3. Accepted', shortLabel: '3. Accepted', order: 3 },
  { id: 'IN_PRODUCTION', label: '4. Production', shortLabel: '4. Prod', order: 4 },
  { id: 'DELIVERED', label: '5. Dispatched & ITC', shortLabel: '5. Delivered', order: 5 },
];

function getStageLevel(status?: string) {
  switch (status) {
    case 'CONFIRMED':
    case 'CONFIRMED_BY_BUYER':
      return 1;
    case 'UNDER_CARXEN_REVIEW':
    case 'UNDER_VEDA_REVIEW':
      return 2;
    case 'ACCEPTED':
      return 3;
    case 'IN_PRODUCTION':
      return 4;
    case 'READY_TO_DISPATCH':
    case 'DISPATCHED':
      return 4.5;
    case 'DELIVERED':
      return 5;
    case 'CANCELLED':
      return 0;
    default:
      return 1;
  }
}

export default function WholesaleOrderDetailPage() {
  const router = useRouter();
  const rawParams = useParams();
  const searchParams = useSearchParams();
  const isConfirmedFlow = searchParams.get('confirmed') === '1';

  const orderId = useMemo(() => {
    const raw = rawParams?.id;
    if (!raw) return '';
    const val = Array.isArray(raw) ? raw[0] : raw;
    try {
      return decodeURIComponent(val);
    } catch {
      return val;
    }
  }, [rawParams]);

  const {
    user,
    isWholesaleApproved,
    authLoading,
    orders,
    addToWholesaleBasket,
    showToast,
    cancelOrder,
    openSupportModal,
    b2bProfile,
  } = useApp();

  const [serverOrder, setServerOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Authentication check
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace(`/login?redirect=/wholesale/orders/${encodeURIComponent(orderId)}`);
      } else if (!isWholesaleApproved) {
        router.replace('/wholesale');
      }
    }
  }, [authLoading, isWholesaleApproved, router, user, orderId]);

  // Find in local AppContext first for zero-latency initial render
  const localOrder = useMemo(() => {
    if (!orderId || !orders) return null;
    return (
      orders.find(
        (o) =>
          o.orderNumber.toLowerCase() === orderId.toLowerCase() ||
          o.id.toLowerCase() === orderId.toLowerCase()
      ) || null
    );
  }, [orderId, orders]);

  // Fetch full dossier from server
  useEffect(() => {
    if (!orderId || authLoading) return;

    let isMounted = true;
    const fetchDossier = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/storefront/wholesale/order?orderNumber=${encodeURIComponent(orderId)}`);
        const data = await res.json().catch(() => ({}));

        if (!isMounted) return;

        if (!res.ok) {
          if (!localOrder) {
            setError(data.error || 'Wholesale order could not be found.');
          }
        } else if (data?.order) {
          setServerOrder(data.order);
        }
      } catch (err: any) {
        if (!isMounted) return;
        if (!localOrder) {
          setError(err?.message || 'Network error retrieving order dossier.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDossier();

    return () => {
      isMounted = false;
    };
  }, [orderId, authLoading, localOrder]);

  const activeOrder = serverOrder || localOrder;

  const handleCopyOrderNumber = () => {
    if (!activeOrder?.orderNumber) return;
    navigator.clipboard.writeText(activeOrder.orderNumber);
    setCopied(true);
    showToast(`Order reference ${activeOrder.orderNumber} copied to clipboard.`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReorder = () => {
    if (!activeOrder?.items) return;
    activeOrder.items.forEach((item: any) => {
      const pid = item.productId || item.product_id;
      if (pid) addToWholesaleBasket(pid, item.quantity || 1);
    });
    showToast(`Copied ${activeOrder.items.length} SKUs to Order Basket.`);
    router.push('/wholesale/order-basket');
  };

  const handleConfirmCancel = async () => {
    if (!activeOrder) return;
    setIsCancelling(true);
    const result = await cancelOrder(activeOrder.orderNumber, 'Cancelled by wholesale client in portal');
    setIsCancelling(false);
    if (result.success) {
      setShowCancelModal(false);
      showToast(`Order #${activeOrder.orderNumber} has been cancelled.`);
      if (serverOrder) {
        setServerOrder({ ...serverOrder, status: 'CANCELLED' });
      }
    }
  };

  if (authLoading || (!user && !error)) {
    return (
      <div className="ws-page-container">
        <div className="ws-empty-state-card" style={{ maxWidth: '500px', margin: '60px auto', textAlign: 'center' }}>
          <div className="ws-empty-icon-wrap" style={{ animation: 'spin 1.5s linear infinite' }}>
            <Clock size={28} style={{ color: '#e2231a' }} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginTop: '16px' }}>Loading Order Dossier…</h2>
          <p style={{ color: '#64748b', fontSize: '13px' }}>Verifying authenticated consignment credentials.</p>
        </div>
      </div>
    );
  }

  if (error && !activeOrder) {
    return (
      <div className="ws-page-container">
        <div className="ws-empty-state-card" style={{ maxWidth: '540px', margin: '40px auto', padding: '36px 24px', textAlign: 'center' }}>
          <div className="ws-empty-icon-wrap" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <AlertCircle size={32} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '16px 0 8px 0' }}>
            Order Dossier Not Available
          </h2>
          <p style={{ color: '#64748b', fontSize: '13.5px', lineHeight: 1.5, marginBottom: '24px' }}>
            {error}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link href="/wholesale/orders" className="ws-btn-primary">
              <ChevronLeft size={16} />
              <span>Back to Wholesale Orders</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!activeOrder && loading) {
    return (
      <div className="ws-page-container">
        <div className="ws-empty-state-card" style={{ maxWidth: '500px', margin: '60px auto', textAlign: 'center' }}>
          <div className="ws-empty-icon-wrap" style={{ animation: 'spin 1.5s linear infinite' }}>
            <Clock size={28} style={{ color: '#e2231a' }} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginTop: '16px' }}>Fetching Consignment Details…</h2>
          <p style={{ color: '#64748b', fontSize: '13px' }}>Querying CarXen Factory Logistics records.</p>
        </div>
      </div>
    );
  }

  // Parse order fields
  const orderNumber = activeOrder.orderNumber || orderId;
  const poNumber =
    activeOrder.poNumber ||
    activeOrder.notes?.match(/PO Reference:\s*([^|]+)/)?.[1]?.trim() ||
    `PO-${orderNumber.replace(/[^0-9]/g, '').slice(-4) || 'AUTO'}`;
  const placedDate = activeOrder.placedAt || activeOrder.createdAt || new Date().toISOString();
  const formattedDate = new Date(placedDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const status = activeOrder.status || 'CONFIRMED_BY_BUYER';
  const currentLevel = getStageLevel(status);
  const isCancelled = status === 'CANCELLED';

  const paymentMethod = activeOrder.paymentMethod || 'Cash on delivery';
  const paymentStatus = activeOrder.paymentStatus || 'PENDING';
  const isPaid = paymentStatus === 'PAID' || paymentMethod.toLowerCase().includes('razorpay');

  const shippingAddr = activeOrder.shippingAddress || {};
  const addrText = typeof shippingAddr === 'string'
    ? shippingAddr
    : [shippingAddr.addressLine1 || shippingAddr.line1, shippingAddr.city, shippingAddr.state, shippingAddr.postalCode]
        .filter(Boolean)
        .join(', ') || 'Registered Factory Warehouse';

  const buyerBusiness =
    activeOrder.customerSnapshot?.businessName ||
    b2bProfile?.businessName ||
    b2bProfile?.tradeName ||
    'Authorized Wholesale Partner';

  const buyerGstin =
    activeOrder.customerSnapshot?.gstin ||
    b2bProfile?.gstin ||
    'Registered GSTIN Verified';

  const items = activeOrder.items || [];
  const totalAmount = activeOrder.totalAmount || 0;
  const subtotal = activeOrder.subtotal || Math.round(totalAmount / 1.18);
  const taxAmount = activeOrder.taxAmount || (totalAmount - subtotal);
  const discountAmount = activeOrder.discountAmount || 0;

  // Cancellation Relief Eligibility (within 6 hours)
  const hoursElapsed = (Date.now() - new Date(placedDate).getTime()) / (1000 * 60 * 60);
  const isWithin6h = Number.isFinite(hoursElapsed) ? hoursElapsed <= 6 : true;
  const hoursLeft = Math.max(0, Math.ceil(6 - hoursElapsed));

  return (
    <div className="ws-page-container">
      {/* Print Specific CSS */}
      <style jsx global>{`
        @media print {
          body {
            background: #fff !important;
            color: #000 !important;
          }
          nav, header, .wholesale-sidebar, .ws-header-actions, .cx-bottom-nav, .ws-action-bar-no-print {
            display: none !important;
          }
          .ws-page-container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .ws-order-card {
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Breadcrumb & Navigation */}
      <div className="ws-breadcrumb-kicker" style={{ marginBottom: '14px' }}>
        <Link href="/wholesale/orders" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#64748b', textDecoration: 'none' }}>
          <ChevronLeft size={14} />
          <span>Procurement Workspace / Wholesale Orders</span>
        </Link>
        <span style={{ color: '#cbd5e1' }}>/</span>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>{orderNumber}</span>
      </div>

      {/* CONFIRMED CELEBRATION BANNER (Shown when ?confirmed=1 or placed) */}
      {isConfirmedFlow && (
        <div
          className="ws-action-bar-no-print"
          style={{
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            color: '#ffffff',
            borderRadius: '14px',
            padding: '24px 28px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            flexWrap: 'wrap',
            boxShadow: '0 10px 25px -5px rgba(5, 150, 105, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '12px' }}>
              <CheckCircle2 size={32} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', color: '#ffffff' }}>
                Wholesale Consignment Confirmed!
              </h2>
              <p style={{ margin: 0, fontSize: '13.5px', color: 'rgba(255,255,255,0.92)', lineHeight: 1.5 }}>
                Order <strong>{orderNumber}</strong> has been transmitted directly to CarXen Factory Logistics.
                This confirmation receipt is permanent and bookmarkable.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                background: '#ffffff',
                color: '#047857',
                border: 'none',
                fontWeight: 700,
                fontSize: '13px',
                padding: '10px 18px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Printer size={16} />
              <span>Print Slip</span>
            </button>
            <Link
              href="/wholesale/catalog"
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.3)',
                fontWeight: 600,
                fontSize: '13px',
                padding: '10px 18px',
                borderRadius: '8px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Browse Catalog</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* Main Order Dossier Card */}
      <div className="ws-order-card" style={{ marginBottom: '24px' }}>
        {/* Header */}
        <div className="ws-order-header" style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <div className="ws-order-title-group" style={{ gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="ws-order-num" style={{ fontSize: '18px', fontWeight: 800 }}>
                {orderNumber}
              </span>
              <button
                type="button"
                onClick={handleCopyOrderNumber}
                title="Copy order reference"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: copied ? '#059669' : '#94a3b8',
                  padding: '2px',
                  display: 'inline-flex',
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>

            <span className="ws-order-po-ref" style={{ fontSize: '13px' }}>
              {poNumber}
            </span>

            {/* Status Badge */}
            {isCancelled ? (
              <span
                style={{
                  fontSize: '12px',
                  color: '#dc2626',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  background: '#fef2f2',
                  borderRadius: '6px',
                  border: '1px solid #fecaca',
                }}
              >
                <XCircle size={14} />
                <span>Consignment Cancelled</span>
              </span>
            ) : status === 'DELIVERED' ? (
              <span
                style={{
                  background: 'var(--ws-emerald-subtle)',
                  color: 'var(--ws-emerald)',
                  border: '1px solid #a7f3d0',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <WholesaleIcon name="check" size={13} strokeWidth={2.5} />
                <span>Delivered & Invoiced</span>
              </span>
            ) : (
              <span
                style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor' }} />
                <span>{status === 'IN_PRODUCTION' ? 'In Factory Production' : status === 'ACCEPTED' ? 'Order Accepted' : 'Under CarXen Review'}</span>
              </span>
            )}

            {/* Payment Badge */}
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px',
                background: isPaid ? '#ecfdf5' : '#f0f9ff',
                color: isPaid ? '#047857' : '#0369a1',
                border: isPaid ? '1px solid #a7f3d0' : '1px solid #bae6fd',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <ShieldCheck size={14} />
              <span>{isPaid ? 'PAID ONLINE (18% ITC)' : 'COD / PAYABLE AT HANDOVER'}</span>
            </span>
          </div>

          {/* Action Bar */}
          <div className="ws-action-bar-no-print" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => window.print()}
              className="ws-btn-secondary"
              style={{ fontSize: '12.5px', padding: '6px 14px', minHeight: '34px' }}
            >
              <Printer size={14} />
              <span>Print Slip</span>
            </button>

            {!isCancelled && isWithin6h && status !== 'DELIVERED' && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="ws-btn-secondary"
                style={{
                  fontSize: '12.5px',
                  padding: '6px 14px',
                  minHeight: '34px',
                  color: '#dc2626',
                  borderColor: '#fca5a5',
                  backgroundColor: '#fff',
                }}
              >
                <XCircle size={14} />
                <span>Cancel Order ({hoursLeft}h left)</span>
              </button>
            )}

            {!isCancelled && !isWithin6h && status !== 'DELIVERED' && (
              <button
                type="button"
                onClick={() => {
                  openSupportModal({
                    category: 'Order Cancellation Request',
                    businessName: buyerBusiness,
                    initialMessage: `I would like to request urgent cancellation for Consignment Order ${orderNumber} (PO Reference: ${poNumber}, Total: ${formatINR(totalAmount)}). Please halt production scheduling and factory dispatch in VEDA.`,
                  });
                }}
                className="ws-btn-secondary"
                style={{
                  fontSize: '12.5px',
                  padding: '6px 14px',
                  minHeight: '34px',
                  color: '#475569',
                }}
              >
                <HelpCircle size={14} />
                <span>Contact Support</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleReorder}
              className="ws-btn-secondary"
              style={{ fontSize: '12.5px', padding: '6px 14px', minHeight: '34px' }}
            >
              <RotateCcw size={14} />
              <span>Repeat Order</span>
            </button>
          </div>
        </div>

        {/* Milestone Timeline */}
        {!isCancelled && (
          <div style={{ padding: '24px 24px 16px 24px', background: '#fafaf9', borderBottom: '1px solid #f1f5f9' }}>
            <div className="ws-timeline-stepper">
              <div className="ws-timeline-track" />
              {STAGES.map((stg) => {
                const isCompleted = currentLevel > stg.order;
                const isActive = currentLevel === stg.order || (stg.order === 4 && currentLevel === 4.5);

                return (
                  <div
                    key={stg.id}
                    className={`ws-timeline-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
                  >
                    <div className="ws-timeline-bullet">
                      {isCompleted ? <Check size={14} strokeWidth={3} /> : stg.order}
                    </div>
                    <span className="ws-timeline-label ws-timeline-label-full">{stg.label}</span>
                    <span className="ws-timeline-label ws-timeline-label-short">{stg.shortLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Content Body Grid */}
        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Left Column: Line Items */}
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PackageCheck size={18} color="#e2231a" />
              <span>Consignment Batch Items ({items.length} SKUs)</span>
            </h3>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
              {items.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  No line items recorded for this consignment.
                </div>
              ) : (
                items.map((item: any, idx: number) => {
                  const unitPrice = item.unitPrice || item.unit_price || 0;
                  const qty = item.quantity || 1;
                  const lineTotal = item.lineSubtotal || item.totalPrice || item.total_price || (unitPrice * qty);
                  const sku = item.sku || `CX-SKU-${item.productId || idx + 1}`;

                  return (
                    <div
                      key={item.id || idx}
                      className="ws-order-item-strip"
                      style={{ padding: '14px 16px', borderBottom: idx === items.length - 1 ? 'none' : '1px solid #f1f5f9' }}
                    >
                      <div className="ws-order-item-left">
                        <span className="ws-order-item-name" style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                          {item.name || item.title || 'Automotive Component'}
                        </span>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
                          <span className="ws-order-item-sku">{sku}</span>
                          <span>·</span>
                          <span>{formatINR(unitPrice)} / unit (excl. GST)</span>
                        </div>
                      </div>
                      <div className="ws-order-item-right" style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12.5px', color: '#475569' }}>
                          <strong>{qty}</strong> pcs
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                          {formatINR(lineTotal)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Warehouse Destination & PO Notes */}
            <div style={{ marginTop: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                <MapPin size={18} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Warehouse Delivery Destination
                  </div>
                  <div style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: 500, marginTop: '2px' }}>
                    {addrText}
                  </div>
                </div>
              </div>

              {activeOrder.notes && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                  <FileText size={18} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Consignment & Factory Notes
                    </div>
                    <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px', lineHeight: 1.4 }}>
                      {activeOrder.notes}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Financial & Tax Breakdown */}
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#e2231a" />
              <span>Commercial Tax Invoice Breakdown</span>
            </h3>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13.5px', color: '#475569' }}>
                <span>Wholesale Base Subtotal:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatINR(subtotal)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13.5px', color: '#475569' }}>
                <span>GST (18% ITC Eligible):</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatINR(taxAmount)}</span>
              </div>

              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13.5px', color: '#059669' }}>
                  <span>Verified Campaign Discount:</span>
                  <span style={{ fontWeight: 700 }}>- {formatINR(discountAmount)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', fontSize: '13.5px', color: '#475569' }}>
                <span>Factory Dedicated Freight:</span>
                <span style={{ fontWeight: 700, color: '#059669' }}>FREE (B2B Partner)</span>
              </div>

              <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Commercial Invoice Total</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Includes 18% GST with full ITC eligibility</div>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
                  {formatINR(totalAmount)}
                </div>
              </div>
            </div>

            {/* Buyer Snapshot & Partner Verification Card */}
            <div style={{ marginTop: '20px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 12px 0' }}>
                Verified Wholesale Buyer Info
              </h4>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13.5px' }}>
                <Building2 size={16} color="#64748b" />
                <strong style={{ color: '#0f172a' }}>{buyerBusiness}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', color: '#475569' }}>
                <ShieldCheck size={16} color="#059669" />
                <span>GSTIN: <strong>{buyerGstin}</strong></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
                <Calendar size={16} color="#64748b" />
                <span>Order Placed: {formattedDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CANCELLATION MODAL */}
      {showCancelModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: '#fef2f2', padding: '10px', borderRadius: '10px', color: '#dc2626' }}>
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  Cancel Consignment {orderNumber}?
                </h3>
                <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                  Within 6-Hour Relief Window ({hoursLeft}h remaining)
                </span>
              </div>
            </div>

            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              Are you sure you want to cancel this wholesale consignment? Factory material allocation and logistics reservations will be immediately released.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="ws-btn-secondary"
                style={{ fontSize: '13px', padding: '8px 16px' }}
              >
                Keep Order Active
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                style={{
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  padding: '8px 16px',
                  cursor: isCancelling ? 'not-allowed' : 'pointer',
                  opacity: isCancelling ? 0.7 : 1,
                }}
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

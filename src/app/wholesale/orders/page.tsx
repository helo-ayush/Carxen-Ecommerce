'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/data/products';
import { WholesaleIcon } from '@/components/wholesale/WholesaleIcon';
import { RotateCcw, MapPin, Check, Plus, XCircle, AlertTriangle, HelpCircle, PackageOpen, FileText } from 'lucide-react';
import '../wholesale.css';

interface WholesaleOrderMock {
  id: string;
  orderNumber: string;
  poNumber: string;
  placedAt: string;
  notes?: string;
  status:
    | 'CONFIRMED_BY_BUYER'
    | 'UNDER_CARXEN_REVIEW'
    | 'UNDER_VEDA_REVIEW'
    | 'ACCEPTED'
    | 'IN_PRODUCTION'
    | 'READY_TO_DISPATCH'
    | 'DISPATCHED'
    | 'DELIVERED'
    | 'CANCELLED';
  statusLabel: string;
  paymentStatus: string;
  totalAmount: number;
  items: {
    productId: number;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  shippingAddress: string;
}

const STAGES = [
  { id: 'CONFIRMED_BY_BUYER', label: '1. PO Placed', shortLabel: '1. Placed', order: 1 },
  { id: 'UNDER_CARXEN_REVIEW', label: '2. CarXen Review', shortLabel: '2. Review', order: 2 },
  { id: 'ACCEPTED', label: '3. Accepted', shortLabel: '3. Accepted', order: 3 },
  { id: 'IN_PRODUCTION', label: '4. Production', shortLabel: '4. Prod', order: 4 },
  { id: 'DELIVERED', label: '5. Dispatched & ITC', shortLabel: '5. Delivered', order: 5 },
];

function getStageLevel(status: WholesaleOrderMock['status']) {
  switch (status) {
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
    default:
      return 1;
  }
}

export default function WholesaleOrdersPage() {
  const router = useRouter();
  const {
    user,
    isWholesaleApproved,
    authLoading,
    addToWholesaleBasket,
    showToast,
    orders,
    cancelOrder,
    openSupportModal,
    b2bProfile,
  } = useApp();
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all');
  const [cancelModalOrder, setCancelModalOrder] = useState<WholesaleOrderMock | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Strict B2B verification gate
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login?redirect=/wholesale/orders');
      } else if (!isWholesaleApproved) {
        router.replace('/wholesale');
      }
    }
  }, [authLoading, isWholesaleApproved, router, user]);

  if (authLoading || !user || !isWholesaleApproved) {
    return null;
  }

  const wholesaleHistoryOrders: WholesaleOrderMock[] = (orders || [])
    .filter((o) => o.orderNumber.startsWith('CX-B2B-') || (o as any).isWholesale)
    .map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      poNumber:
        (o as any).poNumber ||
        (o as any).notes?.match(/PO Reference:\s*([^|]+)/)?.[1]?.trim() ||
        `PO-${o.orderNumber.replace(/[^0-9]/g, '').slice(-4) || 'AUTO'}`,
      placedAt: o.placedAt,
      status: (o.status as any) || 'CONFIRMED_BY_BUYER',
      statusLabel: o.status === 'CANCELLED' ? 'Consignment Cancelled' : o.statusMessage || 'Order Confirmed',
      paymentStatus: o.paymentStatus || 'Pending',
      totalAmount: o.totalAmount,
      notes: (o as any).notes || undefined,
      shippingAddress: `${o.shippingAddress.addressLine1}, ${o.shippingAddress.city} - ${o.shippingAddress.postalCode}`,
      items: o.items.map((it) => ({
        productId: it.productId,
        name: it.name,
        sku: `CX-SKU-${it.productId}`,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.lineSubtotal,
      })),
    }));

  const allOrders: WholesaleOrderMock[] = wholesaleHistoryOrders;

  const filteredOrders = allOrders.filter((ord) => {
    if (activeTab === 'active') return ord.status !== 'DELIVERED' && ord.status !== 'CANCELLED';
    if (activeTab === 'completed') return ord.status === 'DELIVERED';
    return true;
  });

  const handleReorder = (order: WholesaleOrderMock) => {
    order.items.forEach((item) => {
      addToWholesaleBasket(item.productId, item.quantity);
    });
    showToast(`Copied ${order.items.length} SKUs from ${order.orderNumber} to Order Basket.`);
    router.push('/wholesale/order-basket');
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalOrder) return;
    setIsCancelling(true);
    const result = await cancelOrder(cancelModalOrder.orderNumber, 'Cancelled by wholesale client in portal');
    setIsCancelling(false);
    if (result.success) {
      showToast('Consignment order cancelled successfully.');
      setCancelModalOrder(null);
    } else {
      showToast(result.error || 'Failed to cancel order.');
    }
  };

  const getStatusBadge = (status: WholesaleOrderMock['status'], label: string) => {
    switch (status) {
      case 'CANCELLED':
        return (
          <span
            style={{
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              padding: '3px 9px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <XCircle size={12} />
            <span>Consignment Cancelled</span>
          </span>
        );
      case 'UNDER_CARXEN_REVIEW':
      case 'UNDER_VEDA_REVIEW':
        return (
          <span
            style={{
              background: 'var(--ws-amber-subtle)',
              color: 'var(--ws-amber)',
              border: '1px solid #fde68a',
              padding: '3px 9px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
            <span>Under CarXen Review</span>
          </span>
        );
      case 'DELIVERED':
        return (
          <span
            style={{
              background: 'var(--ws-emerald-subtle)',
              color: 'var(--ws-emerald)',
              border: '1px solid #a7f3d0',
              padding: '3px 9px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <WholesaleIcon name="check" size={13} strokeWidth={2.5} />
            <span>Delivered & Invoiced</span>
          </span>
        );
      default:
        return (
          <span
            style={{
              background: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              padding: '3px 9px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: 700,
            }}
          >
            {label}
          </span>
        );
    }
  };

  return (
    <div className="ws-page-container">
      {/* Header Bar */}
      <div className="ws-header-bar">
        <div className="ws-header-titles">
          <div className="ws-breadcrumb-kicker">
            <WholesaleIcon name="truck" size={13} strokeWidth={2} />
            <span>Procurement Pipeline · CarXen Live Tracking</span>
          </div>
          <h1>
            <WholesaleIcon name="orders" size={26} strokeWidth={2} />
            <span>Wholesale Orders & Factory Milestone Pipeline</span>
          </h1>
          <p>
            Track factory operations, dispatch fulfillment status, and repeat order procurement.
          </p>
        </div>
        <div className="ws-header-actions">
          <Link href="/wholesale/catalog" className="ws-btn-primary">
            <Plus size={16} />
            <span>New Wholesale Order</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="ws-tabs-container">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`ws-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
        >
          <span className="ws-tab-label-full">All Orders</span>
          <span className="ws-tab-label-short">All</span>
          <span className="ws-tab-count">{allOrders.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`ws-tab-btn ${activeTab === 'active' ? 'active' : ''}`}
        >
          <span className="ws-tab-label-full">Active in Pipeline</span>
          <span className="ws-tab-label-short">Active</span>
          <span className="ws-tab-count">
            {allOrders.filter((o) => o.status !== 'DELIVERED').length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`ws-tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
        >
          <span className="ws-tab-label-full">Delivered / Invoiced</span>
          <span className="ws-tab-label-short">Delivered</span>
          <span className="ws-tab-count">
            {allOrders.filter((o) => o.status === 'DELIVERED').length}
          </span>
        </button>
      </div>

      {/* Orders List */}
      <div>
        {filteredOrders.length === 0 ? (
          <div
            className="ws-order-card"
            style={{
              textAlign: 'center',
              padding: '64px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                color: '#64748b',
              }}
            >
              <PackageOpen size={32} strokeWidth={1.75} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              {activeTab === 'all'
                ? 'No Wholesale Orders Found'
                : activeTab === 'active'
                ? 'No Orders Active in Pipeline'
                : 'No Delivered Orders on Record'}
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '460px', margin: '0 auto 24px', lineHeight: 1.6 }}>
              {activeTab === 'all'
                ? 'Commercial procurement orders placed via the catalogue or quick order matrix will appear here with live factory production milestones.'
                : 'You do not have any orders currently matching this status filter.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/wholesale/catalog" className="ws-btn-primary">
                <WholesaleIcon name="catalogue" size={15} />
                <span>Browse Wholesale Catalogue</span>
              </Link>
              <Link href="/wholesale/quick-order" className="ws-btn-ghost">
                <WholesaleIcon name="quick-order" size={15} />
                <span>Quick Order Matrix</span>
              </Link>
            </div>
          </div>
        ) : (
          filteredOrders.map((ord) => {
          const currentLevel = getStageLevel(ord.status);

          return (
            <div key={ord.id} className="ws-order-card">
              {/* Card Header */}
              <div className="ws-order-header">
                <div className="ws-order-title-group">
                  <Link
                    href={`/wholesale/orders/${encodeURIComponent(ord.orderNumber)}`}
                    className="ws-order-num"
                    style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
                    title="View Consignment Dossier"
                  >
                    {ord.orderNumber}
                  </Link>
                  <span className="ws-order-po-ref">{ord.poNumber}</span>
                  {getStatusBadge(ord.status, ord.statusLabel)}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {ord.status === 'CANCELLED' ? (
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#dc2626',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px 10px',
                        background: '#fef2f2',
                        borderRadius: '6px',
                        border: '1px solid #fecaca',
                      }}
                    >
                      <XCircle size={13} />
                      <span>Consignment Cancelled</span>
                    </span>
                  ) : (
                    (() => {
                      const hoursElapsed = (Date.now() - new Date(ord.placedAt).getTime()) / (1000 * 60 * 60);
                      const isWithin6h = Number.isFinite(hoursElapsed) ? hoursElapsed <= 6 : true;
                      const hoursLeft = Math.max(0, Math.ceil(6 - hoursElapsed));

                      if (isWithin6h && ord.status !== 'DELIVERED') {
                        return (
                          <button
                            type="button"
                            onClick={() => setCancelModalOrder(ord)}
                            className="ws-btn-secondary"
                            style={{
                              fontSize: '12.5px',
                              padding: '6px 12px',
                              minHeight: '32px',
                              color: '#dc2626',
                              borderColor: '#fca5a5',
                              backgroundColor: '#fff',
                            }}
                          >
                            <XCircle size={13} />
                            <span>Cancel Order ({hoursLeft}h relief left)</span>
                          </button>
                        );
                      }

                      if (ord.status !== 'DELIVERED') {
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              openSupportModal({
                                category: 'Order Cancellation Request',
                                businessName: b2bProfile?.businessName || b2bProfile?.tradeName || '',
                                initialMessage: `I would like to request urgent cancellation for Consignment Order ${ord.orderNumber} (PO Reference: ${ord.poNumber || 'N/A'}, Total: ${formatINR(ord.totalAmount || 0)}). Please halt production scheduling and factory dispatch in VEDA.`,
                              });
                            }}
                            className="ws-btn-secondary"
                            style={{
                              fontSize: '12.5px',
                              padding: '6px 12px',
                              minHeight: '32px',
                              color: '#475569',
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                            title="Transmit cancellation request directly to VEDA Factory Desk"
                          >
                            <HelpCircle size={13} />
                            <span>Contact Support to Cancel</span>
                          </button>
                        );
                      }

                      return null;
                    })()
                  )}

                  <Link
                    href={`/wholesale/orders/${encodeURIComponent(ord.orderNumber)}`}
                    className="ws-btn-secondary"
                    style={{ fontSize: '12.5px', padding: '6px 12px', minHeight: '32px', color: '#0f172a', textDecoration: 'none' }}
                  >
                    <FileText size={13} />
                    <span>View Dossier</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleReorder(ord)}
                    className="ws-btn-secondary"
                    style={{ fontSize: '12.5px', padding: '6px 12px', minHeight: '32px' }}
                  >
                    <RotateCcw size={13} />
                    <span>Reorder (Copy to Basket)</span>
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="ws-order-body">
                {/* Pipeline Stepper */}
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

                {/* Line Items */}
                <div style={{ marginTop: '16px' }}>
                  {ord.items.map((item, idx) => (
                    <div key={idx} className="ws-order-item-strip">
                      <div className="ws-order-item-left">
                        <span className="ws-order-item-name">{item.name}</span>
                        <span className="ws-order-item-sku">({item.sku})</span>
                      </div>
                      <div className="ws-order-item-right">
                        <span className="ws-order-item-qty-rate">
                          {item.quantity} pcs @ {formatINR(item.unitPrice || 0)}
                        </span>
                        <strong className="ws-order-item-total">
                          {formatINR(item.totalPrice || 0)}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer */}
              <div className="ws-order-footer">
                <div className="ws-order-footer-loc">
                  <MapPin size={14} />
                  <span>Dispatch Point:</span>
                  <strong>{ord.shippingAddress}</strong>
                </div>

                {ord.notes && (
                  <div style={{ fontSize: '12px', color: '#64748b', margin: '8px 0', background: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: 700, color: '#334155' }}>Logistics &amp; PO Notes: </span>
                    <span>{ord.notes}</span>
                  </div>
                )}

                <div className="ws-order-footer-settlement-row">
                  <span className="ws-order-settlement-tag">
                    ✓ Verified Wholesale Consignment
                  </span>
                  <div className="ws-order-total-val">
                    Total: {formatINR(ord.totalAmount || 0)}
                  </div>
                </div>
              </div>
            </div>
          );
        })
        )}
      </div>
      {/* Cancellation Confirmation Modal */}
      {cancelModalOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid #fee2e2',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                  Cancel Consignment Order?
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
                  {cancelModalOrder.orderNumber} ({cancelModalOrder.poNumber})
                </p>
              </div>
            </div>

            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5, margin: '0 0 16px' }}>
              You are within the <strong>6-hour relief period</strong>. If you confirm, production and dispatch scheduling for this consignment will be halted immediately.
            </p>

            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '12px 14px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #e2e8f0',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Consignment Total:</span>
                <strong style={{ color: '#0f172a' }}>{formatINR(cancelModalOrder.totalAmount || 0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Line Items:</span>
                <span style={{ color: '#334155', fontWeight: 600 }}>{cancelModalOrder.items.length} SKUs</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setCancelModalOrder(null)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: isCancelling ? 'not-allowed' : 'pointer',
                }}
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancel}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: isCancelling ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(220, 38, 38, 0.4)',
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

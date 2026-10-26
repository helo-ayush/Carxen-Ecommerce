'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/data/products';
import { WholesaleIcon } from '@/components/wholesale/WholesaleIcon';
import { RotateCcw, MapPin, Check, Plus, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import '../wholesale.css';

interface WholesaleOrderMock {
  id: string;
  orderNumber: string;
  poNumber: string;
  placedAt: string;
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

const DEFAULT_WHOLESALE_ORDERS: WholesaleOrderMock[] = [
  {
    id: 'b2b-ord-1',
    orderNumber: 'CX-B2B-10482',
    poNumber: 'PO-2026-OCT-8841',
    placedAt: '2026-10-23T14:30:00Z',
    status: 'UNDER_CARXEN_REVIEW',
    statusLabel: 'Under CarXen Review',
    paymentStatus: 'PAID (Razorpay Online)',
    totalAmount: 141600,
    shippingAddress: 'Plot 42, Udyog Vihar Phase 4, Gurugram, Haryana - 122015',
    items: [
      {
        productId: 1,
        name: 'CarXen Obsidian Signature 7D Floor Mats',
        sku: 'CX-7D-HYU-CRT',
        quantity: 15,
        unitPrice: 5949,
        totalPrice: 89235,
      },
      {
        productId: 3,
        name: 'Apex Carbon-Grain Custom Leatherette Seat Covers',
        sku: 'CX-SC-MAH-SCP',
        quantity: 10,
        unitPrice: 5236,
        totalPrice: 52365,
      },
    ],
  },
  {
    id: 'b2b-ord-2',
    orderNumber: 'CX-B2B-09820',
    poNumber: 'PO-2026-SEP-5412',
    placedAt: '2026-09-28T11:15:00Z',
    status: 'DELIVERED',
    statusLabel: 'Delivered & ITC Settled',
    paymentStatus: 'PAID (Razorpay UPI)',
    totalAmount: 218400,
    shippingAddress: 'Plot 42, Udyog Vihar Phase 4, Gurugram, Haryana - 122015',
    items: [
      {
        productId: 2,
        name: 'Carbon-Core Performance Steering Wheel Wrap',
        sku: 'CX-SW-UNI-SP',
        quantity: 40,
        unitPrice: 1290,
        totalPrice: 51600,
      },
      {
        productId: 4,
        name: 'CarXen CloudRest Memory Foam Executive Seat Cushion',
        sku: 'CX-CF-UNI-ER',
        quantity: 50,
        unitPrice: 1690,
        totalPrice: 84500,
      },
      {
        productId: 1,
        name: 'CarXen Obsidian Signature 7D Floor Mats',
        sku: 'CX-7D-MAR-SWF',
        quantity: 14,
        unitPrice: 5878,
        totalPrice: 82300,
      },
    ],
  },
];

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
  const { user, isWholesaleApproved, authLoading, addToWholesaleBasket, showToast, orders, cancelOrder } = useApp();
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
      poNumber: `PO-${o.orderNumber.replace(/[^0-9]/g, '').slice(-4) || 'AUTO'}`,
      placedAt: o.placedAt,
      status: (o.status as any) || 'CONFIRMED_BY_BUYER',
      statusLabel: o.status === 'CANCELLED' ? 'Consignment Cancelled' : o.statusMessage || 'Order Confirmed',
      paymentStatus: o.paymentStatus || 'Pending',
      totalAmount: o.totalAmount,
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

  const allOrders: WholesaleOrderMock[] = [
    ...wholesaleHistoryOrders,
    ...DEFAULT_WHOLESALE_ORDERS.filter((d) => !wholesaleHistoryOrders.some((w) => w.orderNumber === d.orderNumber)),
  ];

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
        {filteredOrders.map((ord) => {
          const currentLevel = getStageLevel(ord.status);

          return (
            <div key={ord.id} className="ws-order-card">
              {/* Card Header */}
              <div className="ws-order-header">
                <div className="ws-order-title-group">
                  <span className="ws-order-num">{ord.orderNumber}</span>
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
                      const isWithin24h = Number.isFinite(hoursElapsed) ? hoursElapsed <= 24 : true;
                      const hoursLeft = Math.max(0, Math.ceil(24 - hoursElapsed));

                      if (isWithin24h && ord.status !== 'DELIVERED') {
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
                          <a
                            href={`mailto:b2b-support@carxen.com?subject=Cancellation%20Request%20for%20Consignment%20${encodeURIComponent(
                              ord.orderNumber
                            )}&body=Dear%20Support%20Team%2C%0A%0AI%20would%20like%20to%20request%20cancellation%20for%20consignment%20order%20${encodeURIComponent(
                              ord.orderNumber
                            )}.%0A%0AThank%20you.`}
                            className="ws-btn-secondary"
                            style={{
                              fontSize: '12.5px',
                              padding: '6px 12px',
                              minHeight: '32px',
                              color: '#475569',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <HelpCircle size={13} />
                            <span>Contact Support to Cancel</span>
                          </a>
                        );
                      }

                      return null;
                    })()
                  )}

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
        })}
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
              You are within the <strong>24-hour relief period</strong>. If you confirm, production and dispatch scheduling for this consignment will be halted immediately.
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

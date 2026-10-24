'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/data/products';
import { WholesaleIcon } from '@/components/wholesale/WholesaleIcon';
import { RotateCcw, MapPin, Check, Plus } from 'lucide-react';
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
    | 'DELIVERED';
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
    paymentStatus: 'OFFLINE_COMMERCIAL_TERMS (No Website Payment)',
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
    paymentStatus: 'OFFLINE_COMMERCIAL_TERMS (Settled via RTGS)',
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
  { id: 'CONFIRMED_BY_BUYER', label: '1. PO Placed', order: 1 },
  { id: 'UNDER_CARXEN_REVIEW', label: '2. CarXen Review', order: 2 },
  { id: 'ACCEPTED', label: '3. Accepted', order: 3 },
  { id: 'IN_PRODUCTION', label: '4. Production', order: 4 },
  { id: 'DELIVERED', label: '5. Dispatched & ITC', order: 5 },
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
  const { user, isWholesaleApproved, authLoading, addToWholesaleBasket, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all');

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

  const allOrders = DEFAULT_WHOLESALE_ORDERS;

  const filteredOrders = allOrders.filter((ord) => {
    if (activeTab === 'active') return ord.status !== 'DELIVERED';
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

  const getStatusBadge = (status: WholesaleOrderMock['status'], label: string) => {
    switch (status) {
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
            Track factory operations, commercial proforma verification, and repeat order procurement.{' '}
            <strong>No online payment required on website.</strong>
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
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`ws-btn-secondary ${activeTab === 'all' ? 'active' : ''}`}
          style={activeTab === 'all' ? { background: '#0f172a', color: '#ffffff', borderColor: '#0f172a' } : undefined}
        >
          All Orders ({allOrders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`ws-btn-secondary ${activeTab === 'active' ? 'active' : ''}`}
          style={activeTab === 'active' ? { background: '#0f172a', color: '#ffffff', borderColor: '#0f172a' } : undefined}
        >
          Active in Pipeline (1)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`ws-btn-secondary ${activeTab === 'completed' ? 'active' : ''}`}
          style={activeTab === 'completed' ? { background: '#0f172a', color: '#ffffff', borderColor: '#0f172a' } : undefined}
        >
          Delivered / Invoiced (1)
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

                <div>
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
                        <span className="ws-timeline-label">{stg.label}</span>
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
                        <span style={{ color: 'var(--ws-text-muted)' }}>
                          {item.quantity} pcs @ {formatINR(item.unitPrice || 0)}
                        </span>
                        <strong style={{ minWidth: '90px', textAlign: 'right', color: 'var(--ws-text)' }}>
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--ws-emerald)', fontWeight: 600 }}>
                    ✓ Direct Offline Commercial Settlement
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
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/data/products';
import {
  Truck,
  PackageCheck,
  Clock,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  FileText,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import '../wholesale.css';

interface WholesaleOrderMock {
  id: string;
  orderNumber: string;
  poNumber: string;
  placedAt: string;
  status:
    | 'CONFIRMED_BY_BUYER'
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
    status: 'UNDER_VEDA_REVIEW',
    statusLabel: 'Under VEDA Review',
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

export default function WholesaleOrdersPage() {
  const router = useRouter();
  const {
    user,
    orders: userOrders,
    addToWholesaleBasket,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all');

  // Convert real orders that match wholesale or combine with wholesale records
  const allOrders = DEFAULT_WHOLESALE_ORDERS;

  const filteredOrders = allOrders.filter((ord) => {
    if (activeTab === 'active') {
      return ord.status !== 'DELIVERED';
    }
    if (activeTab === 'completed') {
      return ord.status === 'DELIVERED';
    }
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
      case 'CONFIRMED_BY_BUYER':
        return <span className="ws-order-status-badge ws-status-confirmed">Confirmed by Buyer</span>;
      case 'UNDER_VEDA_REVIEW':
        return <span className="ws-order-status-badge ws-status-review">Under VEDA Review</span>;
      case 'ACCEPTED':
        return <span className="ws-order-status-badge ws-status-accepted">Accepted by CarXen</span>;
      case 'IN_PRODUCTION':
        return <span className="ws-order-status-badge ws-status-production">In Factory Production</span>;
      case 'READY_TO_DISPATCH':
      case 'DISPATCHED':
        return <span className="ws-order-status-badge ws-status-dispatched">Dispatched</span>;
      case 'DELIVERED':
        return <span className="ws-order-status-badge ws-status-delivered">Delivered</span>;
      default:
        return <span className="ws-order-status-badge">{label}</span>;
    }
  };

  return (
    <div className="ws-page-container">
      {/* Header Bar */}
      <div className="ws-header-bar">
        <div className="ws-header-titles">
          <h1>
            <Truck size={26} color="#0f172a" />
            Wholesale Order History & Live VEDA Tracking
          </h1>
          <p>
            Track factory operations, commercial proforma status, and repeat order procurement.
            <strong> No website payment is required for wholesale orders.</strong>
          </p>
        </div>
        <div className="ws-header-actions">
          <Link href="/wholesale/catalog" className="ws-btn-primary">
            + New Wholesale Order
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
          In Progress (1)
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {filteredOrders.map((ord) => (
          <div
            key={ord.id}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            }}
          >
            {/* Top row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                paddingBottom: '16px',
                borderBottom: '1px solid #f1f5f9',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                  {ord.orderNumber}
                </span>
                <span
                  style={{
                    background: '#f1f5f9',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                  }}
                >
                  Ref: {ord.poNumber}
                </span>
                {getStatusBadge(ord.status, ord.statusLabel)}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleReorder(ord)}
                  className="ws-btn-secondary"
                  style={{ fontSize: '12.5px', padding: '6px 12px' }}
                >
                  <RotateCcw size={14} />
                  <span>Reorder (Copy to Basket)</span>
                </button>
              </div>
            </div>

            {/* Pipeline Stage Bar */}
            <div className="ws-pipeline-track" style={{ marginBottom: '18px', padding: '14px 18px' }}>
              <div className="ws-pipeline-steps">
                <div className={`ws-step-item active`}>
                  <span className="ws-step-bullet">1</span>
                  <span className="ws-step-title">Confirmed by Buyer</span>
                </div>
                <div
                  className={`ws-step-item ${
                    ['UNDER_VEDA_REVIEW', 'ACCEPTED', 'IN_PRODUCTION', 'READY_TO_DISPATCH', 'DISPATCHED', 'DELIVERED'].includes(
                      ord.status
                    )
                      ? 'active'
                      : ''
                  }`}
                >
                  <span className="ws-step-bullet">2</span>
                  <span className="ws-step-title">VEDA Review</span>
                </div>
                <div
                  className={`ws-step-item ${
                    ['ACCEPTED', 'IN_PRODUCTION', 'READY_TO_DISPATCH', 'DISPATCHED', 'DELIVERED'].includes(ord.status)
                      ? 'active'
                      : ''
                  }`}
                >
                  <span className="ws-step-bullet">3</span>
                  <span className="ws-step-title">Commercial Accepted</span>
                </div>
                <div
                  className={`ws-step-item ${
                    ['IN_PRODUCTION', 'READY_TO_DISPATCH', 'DISPATCHED', 'DELIVERED'].includes(ord.status) ? 'active' : ''
                  }`}
                >
                  <span className="ws-step-bullet">4</span>
                  <span className="ws-step-title">Factory Production</span>
                </div>
                <div
                  className={`ws-step-item ${
                    ['READY_TO_DISPATCH', 'DISPATCHED', 'DELIVERED'].includes(ord.status) ? 'active' : ''
                  }`}
                >
                  <span className="ws-step-bullet">5</span>
                  <span className="ws-step-title">Dispatched & ITC</span>
                </div>
              </div>
            </div>

            {/* Line Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {ord.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '13.5px',
                    padding: '8px 12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                  }}
                >
                  <div>
                    <strong style={{ color: '#0f172a' }}>{item.name}</strong>
                    <span style={{ color: '#64748b', marginLeft: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
                      ({item.sku})
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <span style={{ color: '#475569' }}>
                      {item.quantity} pcs @ {formatINR(item.unitPrice)}
                    </span>
                    <strong style={{ color: '#0f172a', minWidth: '90px', textAlign: 'right' }}>
                      {formatINR(item.totalPrice)}
                    </strong>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Summary */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                paddingTop: '14px',
                borderTop: '1px solid #f1f5f9',
                fontSize: '13px',
              }}
            >
              <div>
                <span style={{ color: '#64748b' }}>Delivery Location: </span>
                <span style={{ color: '#334155', fontWeight: 600 }}>{ord.shippingAddress}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <span style={{ color: '#059669', fontWeight: 600 }}>{ord.paymentStatus}</span>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  Total: {formatINR(ord.totalAmount)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

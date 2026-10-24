'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/data/products';
import { WholesaleIcon } from '@/components/wholesale/WholesaleIcon';
import {
  Upload,
  ArrowRight,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import '../wholesale.css';

interface SavedProcurementList {
  id: string;
  title: string;
  description: string;
  tag: string;
  estimatedUnits: number;
  estimatedValue: number;
  items: {
    productId: number;
    name: string;
    sku: string;
    quantity: number;
  }[];
}

const PRESET_PROCUREMENT_LISTS: SavedProcurementList[] = [
  {
    id: 'list-fast-movers',
    title: 'Monthly Fast-Moving Showroom Assortment',
    description: 'Top-selling 7D custom floor mats and steering wraps across India’s best-selling car models.',
    tag: 'Recommended Stock',
    estimatedUnits: 45,
    estimatedValue: 185000,
    items: [
      { productId: 1, name: 'CarXen Obsidian Signature 7D Floor Mats', sku: 'CX-7D-HYU-CRT', quantity: 15 },
      { productId: 1, name: 'CarXen Obsidian Signature 7D Floor Mats', sku: 'CX-7D-MAR-SWF', quantity: 15 },
      { productId: 2, name: 'Carbon-Core Performance Steering Wheel Wrap', sku: 'CX-SW-UNI-SP', quantity: 15 },
    ],
  },
  {
    id: 'list-hyundai-pack',
    title: 'Hyundai Dealership Replenishment Pack',
    description: 'Dedicated procurement pack tailored for Hyundai Creta, Venue, Verna, and Alcazar accessories.',
    tag: 'Brand Pack',
    estimatedUnits: 30,
    estimatedValue: 142000,
    items: [
      { productId: 1, name: 'CarXen Obsidian Signature 7D Floor Mats', sku: 'CX-7D-HYU-CRT', quantity: 15 },
      { productId: 3, name: 'Apex Carbon-Grain Custom Leatherette Seat Covers', sku: 'CX-SC-HYU-CRT', quantity: 15 },
    ],
  },
  {
    id: 'list-suv-mahindra',
    title: 'Mahindra Scorpio-N & XUV700 Heavy-Duty Pack',
    description: 'All-weather, heavy-duty 7D mats and reinforced memory foam cushions for rugged full-size SUVs.',
    tag: 'SUV Specialists',
    estimatedUnits: 35,
    estimatedValue: 168000,
    items: [
      { productId: 1, name: 'CarXen Obsidian Signature 7D Floor Mats', sku: 'CX-7D-MAH-SCP', quantity: 20 },
      { productId: 4, name: 'CarXen CloudRest Memory Foam Executive Seat Cushion', sku: 'CX-CF-UNI-ER', quantity: 15 },
    ],
  },
  {
    id: 'list-monsoon',
    title: 'Monsoon All-Weather Protection Stock',
    description: 'Water-impermeable 7D deep-dish mats designed for rain, mud, and intense seasonal customer demand.',
    tag: 'Seasonal Rush',
    estimatedUnits: 50,
    estimatedValue: 245000,
    items: [
      { productId: 1, name: 'CarXen Obsidian Signature 7D Floor Mats', sku: 'CX-7D-HYU-CRT', quantity: 25 },
      { productId: 1, name: 'CarXen Obsidian Signature 7D Floor Mats', sku: 'CX-7D-MAR-SWF', quantity: 25 },
    ],
  },
];

export default function WholesaleQuotesPage() {
  const router = useRouter();
  const { user, isWholesaleApproved, authLoading, addToWholesaleBasket, showToast } = useApp();
  const [csvText, setCsvText] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Strict B2B verification gate
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login?redirect=/wholesale/quotes');
      } else if (!isWholesaleApproved) {
        router.replace('/wholesale');
      }
    }
  }, [authLoading, isWholesaleApproved, router, user]);

  if (authLoading || !user || !isWholesaleApproved) {
    return null;
  }

  const handleLoadListIntoBasket = (list: SavedProcurementList) => {
    list.items.forEach((item) => {
      addToWholesaleBasket(item.productId, item.quantity);
    });
    showToast(`Loaded "${list.title}" (${list.estimatedUnits} units) into Wholesale Order Basket.`);
    router.push('/wholesale/order-basket');
  };

  const handleParseCsvAndAdd = () => {
    if (!csvText.trim()) return;
    const lines = csvText.trim().split('\n');
    let added = 0;
    lines.forEach((line) => {
      const parts = line.split(',').map((s) => s.trim());
      if (parts.length >= 2) {
        const pid = parseInt(parts[0], 10);
        const qty = parseInt(parts[1], 10);
        if (!isNaN(pid) && !isNaN(qty) && qty > 0) {
          addToWholesaleBasket(pid, qty);
          added++;
        }
      }
    });
    setShowUploadModal(false);
    setCsvText('');
    showToast(`Successfully processed CSV and added ${added} SKUs to Order Basket.`);
    router.push('/wholesale/order-basket');
  };

  return (
    <div className="ws-page-container">
      {/* Header Bar */}
      <div className="ws-header-bar">
        <div className="ws-header-titles">
          <div className="ws-breadcrumb-kicker">
            <WholesaleIcon name="spark" size={13} strokeWidth={2} />
            <span>Assortments & Batch PO Templates</span>
          </div>
          <h1>
            <WholesaleIcon name="lists" size={26} strokeWidth={2} />
            <span>Saved Procurement Lists & Proforma Templates</span>
          </h1>
          <p>
            One-click reorder templates, brand assortment packs, and batch SKU sheet upload.{' '}
            <strong>Direct offline commercial settlement with CarXen.</strong>
          </p>
        </div>
        <div className="ws-header-actions">
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="ws-btn-secondary"
          >
            <Upload size={15} />
            <span>Upload SKU Sheet (CSV)</span>
          </button>
          <Link href="/wholesale/order-basket" className="ws-btn-primary">
            <WholesaleIcon name="basket" size={15} strokeWidth={2} />
            <span>View Order Basket</span>
          </Link>
        </div>
      </div>

      {/* CSV Upload Modal */}
      {showUploadModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '540px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#ecfdf5',
                    color: '#059669',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <FileSpreadsheet size={20} />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Batch SKU Quick-Import
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px', lineHeight: 1.5 }}>
              Paste your procurement rows below in <code>ProductId, Quantity</code> format:
            </p>

            <textarea
              className="ws-search-input"
              style={{
                width: '100%',
                height: '130px',
                fontFamily: 'ui-monospace, monospace',
                fontSize: '13px',
                padding: '12px',
                marginBottom: '18px',
                resize: 'none',
              }}
              placeholder={`1, 15\n2, 25\n3, 10\n4, 20`}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="ws-btn-secondary"
                onClick={() => setShowUploadModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ws-btn-primary"
                onClick={handleParseCsvAndAdd}
                disabled={!csvText.trim()}
              >
                Import into Order Basket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid of Saved Lists */}
      <div className="ws-pack-grid">
        {PRESET_PROCUREMENT_LISTS.map((list) => (
          <div key={list.id} className="ws-pack-card">
            <div>
              <div className="ws-pack-header">
                <span className="ws-pack-tag">{list.tag}</span>
                <span className="ws-pack-count">
                  {list.items.length} SKUs · {list.estimatedUnits} units
                </span>
              </div>

              <h3 className="ws-pack-title">{list.title}</h3>
              <p className="ws-pack-desc">{list.description}</p>

              {/* Items preview */}
              <div className="ws-pack-preview-box">
                {list.items.map((item, idx) => (
                  <div key={idx} className="ws-pack-item-line">
                    <span style={{ color: '#334155', fontWeight: 600 }}>{item.name}</span>
                    <span style={{ color: '#0f172a', fontWeight: 700 }}>{item.quantity} pcs</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ws-pack-footer">
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                  Est. Wholesale Value
                </span>
                <span className="ws-pack-value">
                  {formatINR(list.estimatedValue || 0)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleLoadListIntoBasket(list)}
                className="ws-btn-primary"
                style={{ fontSize: '12.5px', padding: '8px 14px' }}
              >
                <span>Load into Basket</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/data/products';
import {
  FileText,
  ShoppingBag,
  Plus,
  Check,
  ArrowRight,
  Download,
  Upload,
  Copy,
  Sparkles,
  Layers,
  FileSpreadsheet,
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
    description: 'Top-selling 7D custom floor mats and steering wraps across India’s best-selling cars.',
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
    description: 'Dedicated procurement pack for Hyundai Creta, Venue, Verna, and Alcazar accessories.',
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
    description: 'All-weather, heavy-duty 7D mats and reinforced memory foam cushions for rugged SUVs.',
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
    description: 'Water-impermeable 7D deep-dish mats designed for rain, mud, and intense showroom demand.',
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
  const { addToWholesaleBasket, showToast } = useApp();
  const [csvText, setCsvText] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

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
          <h1>
            <FileText size={26} color="#0f172a" />
            Saved Procurement Lists & Proforma Templates
          </h1>
          <p>
            One-click reorder templates, brand assortment packs, and bulk SKU sheet upload.
            <strong> Direct offline commercial settlement with VEDA.</strong>
          </p>
        </div>
        <div className="ws-header-actions">
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="ws-btn-secondary"
          >
            <Upload size={16} />
            <span>Upload SKU Sheet (CSV)</span>
          </button>
          <Link href="/wholesale/order-basket" className="ws-btn-primary">
            <ShoppingBag size={16} />
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
            background: 'rgba(0,0,0,0.5)',
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
              borderRadius: '20px',
              maxWidth: '560px',
              width: '100%',
              padding: '32px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <FileSpreadsheet size={24} color="#059669" />
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Batch SKU Sheet Quick-Import
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: 1.5 }}>
              Paste your procurement rows below in <code>ProductId, Quantity</code> format (e.g.{' '}
              <code>1, 20</code> on each line):
            </p>
            <textarea
              className="ws-form-textarea"
              style={{ minHeight: '140px', fontFamily: 'monospace', fontSize: '12.5px', marginBottom: '18px' }}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
        {PRESET_PROCUREMENT_LISTS.map((list) => (
          <div
            key={list.id}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '18px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span
                  style={{
                    background: '#ecfdf5',
                    color: '#047857',
                    border: '1px solid #a7f3d0',
                    padding: '3px 9px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {list.tag}
                </span>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748b' }}>
                  {list.items.length} SKUs · {list.estimatedUnits} units
                </span>
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                {list.title}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                {list.description}
              </p>

              {/* Items preview */}
              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px', marginBottom: '18px' }}>
                {list.items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '12.5px',
                      padding: '4px 0',
                      borderBottom: idx < list.items.length - 1 ? '1px solid #f1f5f9' : 'none',
                    }}
                  >
                    <span style={{ color: '#334155', fontWeight: 600 }}>{item.name}</span>
                    <span style={{ color: '#0f172a', fontWeight: 700 }}>{item.quantity} pcs</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '16px',
                borderTop: '1px solid #f1f5f9',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>
                  Est. Wholesale Value
                </span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  {formatINR(list.estimatedValue)}
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

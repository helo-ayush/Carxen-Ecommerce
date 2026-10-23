'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  Building2,
  ShieldCheck,
  PhoneCall,
  Mail,
  MapPin,
  ExternalLink,
  Layers,
  ArrowRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import '../wholesale.css';

export default function WholesaleAccountPage() {
  const { user, b2bProfile, setWorkspaceMode } = useApp();

  const businessName = b2bProfile?.businessName || user?.name || 'Authorized Automotive Partner';
  const isTier2 = b2bProfile?.wholesaleTier === 'tier2';

  return (
    <div className="ws-page-container">
      {/* Header Bar */}
      <div className="ws-header-bar">
        <div className="ws-header-titles">
          <h1>
            <Building2 size={26} color="#0f172a" />
            Wholesale Business Account & Commercial Terms
          </h1>
          <p>
            Enterprise profile, verified GSTIN identity, volume pricing tiers, and assigned VEDA account manager.
          </p>
        </div>
        <div className="ws-header-actions">
          <Link
            href="/shop"
            className="ws-btn-secondary"
            onClick={() => setWorkspaceMode('retail')}
          >
            Switch to Personal Shopping &rarr;
          </Link>
        </div>
      </div>

      <div className="ws-basket-layout">
        {/* Left Column: Business Details & Warehouses */}
        <div>
          {/* Business Entity Card */}
          <div className="ws-basket-items-card" style={{ marginBottom: '24px' }}>
            <div className="ws-basket-header">
              <h2>Enterprise Identity & Tax Registrations</h2>
              <span
                style={{
                  background: '#ecfdf5',
                  color: '#047857',
                  border: '1px solid #a7f3d0',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                }}
              >
                Verified Active Partner
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '13.5px' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Legal Entity Name
                </span>
                <strong style={{ color: '#0f172a', fontSize: '15px' }}>{businessName}</strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Trade / Outlet Name
                </span>
                <strong style={{ color: '#0f172a', fontSize: '15px' }}>
                  {b2bProfile?.tradeName || 'CarXen Authorized Partner'}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  GSTIN (Input Tax Credit)
                </span>
                <strong style={{ fontFamily: 'monospace', color: '#0f172a', fontSize: '14px' }}>
                  {b2bProfile?.gstin || '22AAAAA0000A1Z5'}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  PAN Number
                </span>
                <strong style={{ fontFamily: 'monospace', color: '#0f172a', fontSize: '14px' }}>
                  {b2bProfile?.pan || 'ABCDE1234F'}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Authorized Contact Person
                </span>
                <strong style={{ color: '#0f172a' }}>{user?.name || 'Authorized Buyer'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Contact Phone & WhatsApp
                </span>
                <strong style={{ color: '#0f172a' }}>{user?.phone || '+91 98765 43210'}</strong>
              </div>
            </div>
          </div>

          {/* Registered Warehouse / Delivery Locations */}
          <div className="ws-basket-items-card">
            <div className="ws-basket-header">
              <h2>Registered Delivery Locations</h2>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Primary Factory Dispatch Point</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: '16px',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <MapPin size={20} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  Central Workshop & Warehouse (Default)
                </div>
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                  {b2bProfile?.businessAddress || 'Plot 42, Udyog Vihar Phase 4'},{' '}
                  {b2bProfile?.city || 'Gurugram'}, {b2bProfile?.state || 'Haryana'} -{' '}
                  {b2bProfile?.pincode || '122015'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Commercial Tier & Assigned Account Manager */}
        <div className="ws-order-sidebar">
          {/* Active Wholesale Tier */}
          <div className="ws-order-summary-card">
            <h3>Active Commercial Tier</h3>
            <div
              style={{
                background: '#0f172a',
                borderRadius: '14px',
                padding: '18px',
                color: '#ffffff',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '11.5px', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>
                Assigned Level
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, margin: '4px 0 8px' }}>
                {isTier2 ? 'Tier 2 (Volume Commercial)' : 'Tier 1 (Wholesale Partner)'}
              </div>
              <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                {isTier2
                  ? 'Up to 25% margin across all categories for monthly volume ₹2L+'
                  : 'Up to 15% wholesale margin with minimum order quantity (MOQ) validation'}
              </div>
            </div>

            <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
              ✓ Direct VEDA factory production batch allocation.
              <br />
              ✓ Zero online payment required on website.
              <br />
              ✓ Consolidated monthly GST invoices with full ITC eligibility.
            </div>
          </div>

          {/* Dedicated VEDA Account Manager */}
          <div className="ws-order-summary-card">
            <h3>Assigned VEDA Commercial Manager</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#f1f5f9',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '16px',
                }}
              >
                RK
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Rajesh Kumar</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Head of Enterprise Procurement, CarXen VEDA</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <a
                href="tel:+919876543210"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', textDecoration: 'none' }}
              >
                <PhoneCall size={16} color="#059669" />
                <span>+91 98765 43210</span>
              </a>
              <a
                href="mailto:b2b@carxen.in"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', textDecoration: 'none' }}
              >
                <Mail size={16} color="#059669" />
                <span>b2b@carxen.in</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { WholesaleIcon } from '@/components/wholesale/WholesaleIcon';
import {
  PhoneCall,
  Mail,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Building2,
  ArrowRight,
} from 'lucide-react';
import '../wholesale.css';

export default function WholesaleAccountPage() {
  const router = useRouter();
  const { user, b2bProfile, isWholesaleApproved, authLoading, logout } = useApp();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login?redirect=/wholesale/account');
      } else if (!isWholesaleApproved) {
        router.replace('/wholesale');
      }
    }
  }, [authLoading, isWholesaleApproved, router, user]);

  if (authLoading || !user || !isWholesaleApproved) {
    return null;
  }

  const businessName = b2bProfile?.businessName || user?.name || 'Authorized Automotive Partner';
  const isTier2 = b2bProfile?.wholesaleTier === 'tier2';

  return (
    <div className="ws-page-container">
      {/* Header Bar */}
      <div className="ws-header-bar">
        <div className="ws-header-titles">
          <div className="ws-breadcrumb-kicker">
            <WholesaleIcon name="shield" size={13} strokeWidth={2} />
            <span>Enterprise Identity & Verified Commercial Terms</span>
          </div>
          <h1>
            <WholesaleIcon name="account" size={26} strokeWidth={2} />
            <span>Commercial Business Profile & Tax Registry</span>
          </h1>
          <p>
            Enterprise profile, verified GSTIN identity, active volume pricing tiers, and assigned CarXen account manager.
          </p>
        </div>
        <div className="ws-header-actions">
          <button
            type="button"
            className="ws-btn-secondary"
            onClick={async () => {
              await logout();
              router.push('/login');
            }}
          >
            Sign out
          </button>
          <Link href="/wholesale/order-basket" className="ws-btn-primary">
            <WholesaleIcon name="basket" size={15} strokeWidth={2} />
            <span>Order Basket</span>
          </Link>
        </div>
      </div>

      <div className="ws-basket-layout">
        {/* Left Column: Business Details & Warehouses */}
        <div>
          {/* Business Entity Card */}
          <div className="ws-card">
            <div className="ws-card-header">
              <h2>
                <WholesaleIcon name="invoice" size={18} strokeWidth={2} />
                <span>Enterprise Identity & Tax Registrations</span>
              </h2>
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
                  gap: '5px',
                }}
              >
                <WholesaleIcon name="check" size={13} strokeWidth={2.5} />
                <span>Verified Active Partner</span>
              </span>
            </div>

            <div className="ws-card-body">
              <div className="ws-meta-grid">
                <div className="ws-meta-item">
                  <span className="ws-meta-label">Legal Entity Name</span>
                  <div className="ws-meta-value">{businessName}</div>
                </div>
                <div className="ws-meta-item">
                  <span className="ws-meta-label">Trade / Outlet Name</span>
                  <div className="ws-meta-value">
                    {b2bProfile?.tradeName || 'CarXen Authorized Partner'}
                  </div>
                </div>
                <div className="ws-meta-item">
                  <span className="ws-meta-label">GSTIN (Input Tax Credit)</span>
                  <div className="ws-meta-value mono">
                    {b2bProfile?.gstin || '22AAAAA0000A1Z5'}
                  </div>
                </div>
                <div className="ws-meta-item">
                  <span className="ws-meta-label">PAN Number</span>
                  <div className="ws-meta-value mono">
                    {b2bProfile?.pan || 'ABCDE1234F'}
                  </div>
                </div>
                <div className="ws-meta-item">
                  <span className="ws-meta-label">Authorized Contact Person</span>
                  <div className="ws-meta-value">{user?.name || 'Authorized Buyer'}</div>
                </div>
                <div className="ws-meta-item">
                  <span className="ws-meta-label">Contact Phone & WhatsApp</span>
                  <div className="ws-meta-value">{user?.phone || '+91 98765 43210'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Registered Warehouse / Delivery Locations */}
          <div className="ws-card">
            <div className="ws-card-header">
              <h2>
                <WholesaleIcon name="warehouse" size={18} strokeWidth={2} />
                <span>Registered Dispatch & Delivery Locations</span>
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--ws-text-muted)' }}>
                Primary Factory Dispatch Point
              </span>
            </div>

            <div className="ws-card-body">
              <div className="ws-warehouse-card">
                <div className="ws-warehouse-icon">
                  <WholesaleIcon name="warehouse" size={22} strokeWidth={1.8} />
                </div>
                <div className="ws-warehouse-details">
                  <h4>Central Workshop & Warehouse (Primary Default)</h4>
                  <p>
                    {b2bProfile?.businessAddress || 'Plot 42, Udyog Vihar Phase 4'},{' '}
                    {b2bProfile?.city || 'Gurugram'}, {b2bProfile?.state || 'Haryana'} -{' '}
                    {b2bProfile?.pincode || '122015'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Commercial Tier & Assigned Account Manager */}
        <div>
          {/* Active Wholesale Tier */}
          <div className="ws-card">
            <div className="ws-card-header">
              <h3>
                <WholesaleIcon name="tier" size={18} strokeWidth={2} />
                <span>Active Commercial Tier</span>
              </h3>
            </div>
            <div className="ws-card-body">
              <div className="ws-tier-badge-card">
                <div className="ws-tier-badge-level">
                  CarXen Verified Margin Level
                </div>
                <div className="ws-tier-badge-title">
                  {isTier2 ? 'Tier 2 · Volume Commercial' : 'Tier 1 · Wholesale Partner'}
                </div>
                <div className="ws-tier-badge-desc">
                  {isTier2
                    ? 'Up to 25% wholesale margin across all catalogue categories for monthly volume ₹2L+'
                    : 'Up to 15% wholesale margin with minimum order quantity (MOQ) validation'}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '13px',
                  color: 'var(--ws-text-muted)',
                  lineHeight: 1.45,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <WholesaleIcon name="check" size={15} strokeWidth={2.5} className="text-emerald-600" />
                  <span>Direct factory production batch allocation</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <WholesaleIcon name="shield" size={15} strokeWidth={2} className="text-emerald-600" />
                  <span>Zero online payment required on website</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <WholesaleIcon name="invoice" size={15} strokeWidth={2} className="text-emerald-600" />
                  <span>Consolidated monthly GST tax invoices with ITC</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dedicated CarXen Commercial Manager */}
          <div className="ws-card">
            <div className="ws-card-header">
              <h3>
                <WholesaleIcon name="account" size={18} strokeWidth={2} />
                <span>Assigned CarXen Commercial Desk</span>
              </h3>
            </div>
            <div className="ws-card-body">
              <div className="ws-manager-profile">
                <div className="ws-manager-avatar">RK</div>
                <div className="ws-manager-info">
                  <h4>Rajesh Kumar</h4>
                  <p>Head of Commercial Procurement, CarXen Automotive</p>
                </div>
              </div>

              <div className="ws-manager-actions">
                <a href="tel:+919876543210" className="ws-manager-link">
                  <WholesaleIcon name="phone" size={16} strokeWidth={2} />
                  <span>+91 98765 43210 (Direct Line)</span>
                </a>
                <a href="mailto:b2b@carxen.in" className="ws-manager-link">
                  <Mail size={16} />
                  <span>b2b@carxen.in (PO Desk)</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

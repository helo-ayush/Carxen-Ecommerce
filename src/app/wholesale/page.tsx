'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  Building2,
  PackageCheck,
  Zap,
  ShoppingBag,
  Clock,
  FileText,
  ShieldCheck,
  Truck,
  ArrowRight,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';
import './wholesale.css';
import '../b2b/b2b.css';
import { formatUserFriendlyB2BError } from '@/lib/format-b2b-error';

export default function WholesaleDashboardPage() {
  const router = useRouter();
  const {
    user,
    authLoading,
    b2bProfile,
    isWholesaleApproved,
    isWholesalePending,
    applyForWholesale,
    wholesaleBasketSkuCount,
    wholesaleBasketCount,
    wholesaleBasketSubtotal,
    setWorkspaceMode,
    showToast,
  } = useApp();

  // Application form state if user is applying
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    businessName: b2bProfile?.businessName || '',
    tradeName: b2bProfile?.tradeName || '',
    gstin: b2bProfile?.gstin || '',
    pan: b2bProfile?.pan || '',
    businessType: b2bProfile?.businessType || 'Authorized Dealership',
    businessAddress: b2bProfile?.businessAddress || '',
    city: b2bProfile?.city || '',
    state: b2bProfile?.state || '',
    pincode: b2bProfile?.pincode || '',
    expectedMonthlyVolume: b2bProfile?.expectedMonthlyVolume || '₹50k–₹2L (Tier 1)',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    const result = await applyForWholesale({
      ...formData,
      b2bDocuments: [],
    });

    setSubmitting(false);
    if (!result.success) {
      setErrorMessage(formatUserFriendlyB2BError(result.error));
    } else {
      showToast('Wholesale application submitted for CarXen verification.');
    }
  };

  // 1. Auth Gate: Not logged in
  if (!authLoading && !user) {
    return (
      <div className="ws-page-container">
        <div className="b2b-auth-gate-card">
          <div className="b2b-auth-icon-wrap">
            <Lock size={32} />
          </div>
          <h1>CarXen Wholesale Portal</h1>
          <p>
            Welcome to the direct CarXen B2B Factory Procurement Desk. Verified wholesale dealers,
            automotive workshops, and multi-brand retailers can browse factory tiers and submit orders
            with zero online payment.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
            <Link href="/login?redirect=/wholesale" className="ws-btn-primary">
              Sign In to Wholesale Workspace
            </Link>
            <Link href="/login?redirect=/wholesale&tab=signup" className="ws-btn-secondary">
              Register New Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Application Gate: If not approved and not pending, offer 1-click B2B activation or application form
  if (!isWholesaleApproved && !isWholesalePending) {
    return (
      <div className="ws-page-container">
        <div className="ws-header-bar">
          <div className="ws-header-titles">
            <h1>
              <Building2 size={26} color="#0f172a" />
              Wholesale Partner Onboarding
            </h1>
            <p>
              Unlock direct factory procurement, tier pricing (up to 25% margin), and zero-website-payment
              commercial invoicing through VEDA.
            </p>
          </div>
          <div className="ws-header-actions">
            <Link href="/shop" className="ws-btn-secondary" onClick={() => setWorkspaceMode('retail')}>
              Back to Retail Shop
            </Link>
          </div>
        </div>

        {errorMessage && (
          <div className="b2b-error-banner" role="alert" style={{ marginBottom: '24px' }}>
            <div className="b2b-error-icon-wrap">
              <AlertCircle size={18} />
            </div>
            <div className="b2b-error-content">
              <div className="b2b-error-title">Notice</div>
              <div className="b2b-error-msg">{errorMessage}</div>
            </div>
          </div>
        )}

        <div className="ws-basket-layout">
          <div className="ws-basket-items-card">
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', color: '#0f172a' }}>
              Business Registration Details
            </h2>
            <form onSubmit={handleApply}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="ws-form-group">
                  <label className="ws-form-label">Legal Business Name *</label>
                  <input
                    type="text"
                    required
                    className="ws-form-input"
                    placeholder="e.g. ABC Auto Accessories LLP"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  />
                </div>
                <div className="ws-form-group">
                  <label className="ws-form-label">Trade / Store Name</label>
                  <input
                    type="text"
                    className="ws-form-input"
                    placeholder="e.g. ABC Car Studio"
                    value={formData.tradeName}
                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="ws-form-group">
                  <label className="ws-form-label">GSTIN Number *</label>
                  <input
                    type="text"
                    required
                    className="ws-form-input"
                    placeholder="22AAAAA0000A1Z5"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="ws-form-group">
                  <label className="ws-form-label">PAN Number</label>
                  <input
                    type="text"
                    className="ws-form-input"
                    placeholder="ABCDE1234F"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="ws-form-group">
                  <label className="ws-form-label">Contact Person Name *</label>
                  <input
                    type="text"
                    required
                    className="ws-form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="ws-form-group">
                  <label className="ws-form-label">Business Phone / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    className="ws-form-input"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="ws-form-group">
                <label className="ws-form-label">Registered Business Address *</label>
                <input
                  type="text"
                  required
                  className="ws-form-input"
                  placeholder="Street, Industrial Area, Landmark"
                  value={formData.businessAddress}
                  onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="ws-form-group">
                  <label className="ws-form-label">City *</label>
                  <input
                    type="text"
                    required
                    className="ws-form-input"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="ws-form-group">
                  <label className="ws-form-label">State *</label>
                  <input
                    type="text"
                    required
                    className="ws-form-input"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
                <div className="ws-form-group">
                  <label className="ws-form-label">PIN Code *</label>
                  <input
                    type="text"
                    required
                    className="ws-form-input"
                    placeholder="110001"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" disabled={submitting} className="ws-submit-order-btn" style={{ marginTop: '20px' }}>
                {submitting ? 'Submitting Application…' : 'Submit Wholesale Application'}
              </button>
            </form>
          </div>

          <div className="ws-order-sidebar">
            <div className="ws-order-summary-card">
              <h3>B2B Wholesale Privileges</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <ShieldCheck size={20} color="#059669" />
                  <div>
                    <strong style={{ fontSize: '13px', display: 'block', color: '#0f172a' }}>Zero Website Payment</strong>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Orders are confirmed online and released directly to VEDA for offline commercial billing.
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Layers size={20} color="#059669" />
                  <div>
                    <strong style={{ fontSize: '13px', display: 'block', color: '#0f172a' }}>Volume Tier Pricing</strong>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Automated 15% to 25% wholesale margins applied across all SKU quantities.
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Truck size={20} color="#059669" />
                  <div>
                    <strong style={{ fontSize: '13px', display: 'block', color: '#0f172a' }}>Direct Factory Dispatch</strong>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Priority manufacturing batches directly packed and dispatched from VEDA production lines.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Application Gate: Under Review
  if (isWholesalePending) {
    return (
      <div className="ws-page-container">
        <div className="ws-confirmation-card">
          <div className="ws-confirm-icon-wrap" style={{ background: '#fffbeb', borderColor: '#fde68a', color: '#d97706' }}>
            <Clock size={36} />
          </div>
          <h2>Wholesale Application Under Review</h2>
          <p>
            Your CarXen wholesale account registration for{' '}
            <strong>{b2bProfile?.businessName || user?.name || 'Applicant'}</strong> is currently being verified by our
            commercial desk (GSTIN: {b2bProfile?.gstin || 'Submitted'}).
          </p>
          <div className="ws-pipeline-track">
            <h4>Verification Timeline</h4>
            <div className="ws-pipeline-steps">
              <div className="ws-step-item active">
                <span className="ws-step-bullet">1</span>
                <span className="ws-step-title">Submitted</span>
              </div>
              <div className="ws-step-item active">
                <span className="ws-step-bullet">2</span>
                <span className="ws-step-title">GST & VEDA Review</span>
              </div>
              <div className="ws-step-item">
                <span className="ws-step-bullet">3</span>
                <span className="ws-step-title">Tier Allocation</span>
              </div>
              <div className="ws-step-item">
                <span className="ws-step-bullet">4</span>
                <span className="ws-step-title">Procurement Live</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link href="/wholesale/catalog" className="ws-btn-primary">
              Preview Wholesale Catalogue
            </Link>
            <Link href="/shop" className="ws-btn-secondary" onClick={() => setWorkspaceMode('retail')}>
              Personal Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. APPROVED WHOLESALER WORKSPACE DASHBOARD
  const businessName = b2bProfile?.businessName || user?.name || 'Verified Wholesale Partner';
  const tierName = b2bProfile?.wholesaleTier === 'tier2' ? 'Tier 2 Partner (25% Margin)' : 'Tier 1 Partner (15% Margin)';

  return (
    <div className="ws-page-container">
      {/* Top Bar */}
      <div className="ws-header-bar">
        <div className="ws-header-titles">
          <h1>
            <Building2 size={26} color="#0f172a" />
            Wholesale Procurement Workspace
          </h1>
          <p>
            Connected to CarXen VEDA Manufacturing Desk · Real-time inventory, volume tier pricing, and direct B2B order confirmation.
          </p>
        </div>
        <div className="ws-header-actions">
          {wholesaleBasketSkuCount > 0 && (
            <Link href="/wholesale/order-basket" className="ws-btn-primary">
              <ShoppingBag size={16} />
              <span>Review Order Basket ({wholesaleBasketSkuCount} SKUs)</span>
            </Link>
          )}
          <Link href="/shop" className="ws-btn-secondary" onClick={() => setWorkspaceMode('retail')}>
            Switch to Personal Shopping &rarr;
          </Link>
        </div>
      </div>

      {/* Hero Card */}
      <div className="ws-hero-card">
        <div className="ws-hero-badge">
          <span className="wholesale-badge-dot" />
          <span>Active Procurement Partner</span>
        </div>
        <h2 className="ws-hero-title">{businessName}</h2>
        <p className="ws-hero-subtitle">
          Welcome to your dedicated B2B portal. You have unlocked direct factory tier pricing across 7D Mats,
          Seat Covers, Ambient Lighting, and Lifestyle Accessories.
        </p>

        <div className="ws-hero-stats-row">
          <div className="ws-hero-stat-item">
            <span className="ws-stat-label">Active Commercial Tier</span>
            <span className="ws-stat-val">{tierName}</span>
            <span className="ws-stat-sub">Volume discount applied directly</span>
          </div>
          <div className="ws-hero-stat-item">
            <span className="ws-stat-label">Payment Mode</span>
            <span className="ws-stat-val" style={{ color: '#34d399' }}>Zero Website Payment</span>
            <span className="ws-stat-sub">Offline VEDA Commercial Settlement</span>
          </div>
          <div className="ws-hero-stat-item">
            <span className="ws-stat-label">Dispatch Lead Time</span>
            <span className="ws-stat-val">24–48 Hours</span>
            <span className="ws-stat-sub">Priority factory staging</span>
          </div>
          <div className="ws-hero-stat-item">
            <span className="ws-stat-label">Verified GSTIN</span>
            <span className="ws-stat-val" style={{ fontSize: '16px', fontFamily: 'monospace' }}>
              {b2bProfile?.gstin || '22AAAAA0000A1Z5'}
            </span>
            <span className="ws-stat-sub">Input Tax Credit Invoiced</span>
          </div>
        </div>
      </div>

      {/* Zero Online Payment Notice Banner */}
      <div className="ws-notice-banner">
        <div className="ws-notice-icon">
          <ShieldCheck size={24} />
        </div>
        <div className="ws-notice-content">
          <h4>Commercial Procurement Protocol: Zero Website Payment</h4>
          <p>
            Wholesale buyers are <strong>never asked to pay on this website</strong>. You build your order basket,
            attach your Purchase Order (PO) number and notes, and click <strong>Confirm Wholesale Order</strong>.
            Your order is instantly dispatched to CarXen VEDA for stock verification, commercial invoicing, and offline credit/RTGS settlement.
          </p>
        </div>
      </div>

      {/* Quick Launchers */}
      <div className="ws-launcher-grid">
        <Link href="/wholesale/catalog" className="ws-launcher-card">
          <div className="ws-launcher-top">
            <div className="ws-launcher-icon">
              <PackageCheck size={24} />
            </div>
            <div className="ws-launcher-info">
              <h3>Wholesale Catalogue</h3>
              <p>
                Dense B2B procurement table with multi-vehicle fitment filters (Maruti, Hyundai, Mahindra, Tata),
                SKUs, MOQs, and direct multi-row quantity entry.
              </p>
            </div>
          </div>
          <div className="ws-launcher-footer">
            <span>Browse Catalogue</span>
            <ChevronRight size={16} />
          </div>
        </Link>

        <Link href="/wholesale/quick-order" className="ws-launcher-card">
          <div className="ws-launcher-top">
            <div className="ws-launcher-icon">
              <Zap size={24} />
            </div>
            <div className="ws-launcher-info">
              <h3>Quick Order Matrix</h3>
              <p>
                High-speed SKU batch ordering. Rapidly enter quantities across product lines and fill all MOQs with one click.
              </p>
            </div>
          </div>
          <div className="ws-launcher-footer">
            <span>Open Quick Sheet</span>
            <ChevronRight size={16} />
          </div>
        </Link>

        <Link href="/wholesale/order-basket" className="ws-launcher-card">
          <div className="ws-launcher-top">
            <div className="ws-launcher-icon">
              <ShoppingBag size={24} />
            </div>
            <div className="ws-launcher-info">
              <h3>Wholesale Order Basket</h3>
              <p>
                Review selected SKUs, tier pricing, 18% GST estimate, PO reference number, and submit directly to CarXen VEDA.
              </p>
            </div>
          </div>
          <div className="ws-launcher-footer">
            <span>
              {wholesaleBasketSkuCount > 0 ? `${wholesaleBasketSkuCount} SKUs in Basket` : 'View Order Basket'}
            </span>
            <ChevronRight size={16} />
          </div>
        </Link>

        <Link href="/wholesale/orders" className="ws-launcher-card">
          <div className="ws-launcher-top">
            <div className="ws-launcher-icon">
              <Truck size={24} />
            </div>
            <div className="ws-launcher-info">
              <h3>Wholesale Orders</h3>
              <p>
                Track live VEDA order status: Confirmed &rarr; VEDA Review &rarr; Accepted &rarr; Released to Production &rarr; Dispatched.
              </p>
            </div>
          </div>
          <div className="ws-launcher-footer">
            <span>Track Orders</span>
            <ChevronRight size={16} />
          </div>
        </Link>

        <Link href="/wholesale/quotes" className="ws-launcher-card">
          <div className="ws-launcher-top">
            <div className="ws-launcher-icon">
              <FileText size={24} />
            </div>
            <div className="ws-launcher-info">
              <h3>Saved Lists & Quotes</h3>
              <p>
                Pre-curated procurement lists (Hyundai Fast-Movers, Mahindra SUV Pack, Monsoon Assortment) with 1-click basket loading.
              </p>
            </div>
          </div>
          <div className="ws-launcher-footer">
            <span>Procurement Packs</span>
            <ChevronRight size={16} />
          </div>
        </Link>

        <Link href="/wholesale/account" className="ws-launcher-card">
          <div className="ws-launcher-top">
            <div className="ws-launcher-icon">
              <Building2 size={24} />
            </div>
            <div className="ws-launcher-info">
              <h3>Business Account</h3>
              <p>
                Manage verified GSTIN, billing entities, delivery warehouse addresses, and connect with your assigned VEDA Commercial Manager.
              </p>
            </div>
          </div>
          <div className="ws-launcher-footer">
            <span>Manage Account</span>
            <ChevronRight size={16} />
          </div>
        </Link>
      </div>

      {/* Commercial Support Hotline */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PhoneCall size={22} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              CarXen VEDA Commercial Procurement Desk
            </div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Direct helpline for volume orders, custom vehicle fitments, and proforma invoices:
              <strong style={{ color: '#0f172a', marginLeft: '6px' }}>+91 98765 43210</strong> (Mon–Sat 9AM–7PM)
            </div>
          </div>
        </div>
        <a
          href="https://wa.me/919876543210"
          target="_blank"
          rel="noopener noreferrer"
          className="ws-btn-secondary"
          style={{ fontSize: '12.5px' }}
        >
          WhatsApp Commercial Rep
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}

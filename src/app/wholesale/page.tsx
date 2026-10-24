'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { WholesaleIcon } from '@/components/wholesale/WholesaleIcon';
import { 
  ArrowRight, 
  AlertCircle, 
  Send, 
  Clock, 
  Check, 
  CheckCircle2, 
  Building2, 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  ExternalLink,
  BadgeCheck
} from 'lucide-react';
import './wholesale.css';
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
    setWorkspaceMode,
    logout,
    showToast,
    refreshCustomerProfile,
  } = useApp();

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

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?redirect=/wholesale');
    }
  }, [authLoading, router, user]);

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

  // 1. Auth Gate
  if (!authLoading && !user) return null;

  // 2. Application Gate: Unregistered Partner Onboarding
  if (!isWholesaleApproved && !isWholesalePending) {
    return (
      <div className="ws-page-container">
        <div className="ws-header-bar">
          <div className="ws-header-titles">
            <div className="ws-breadcrumb-kicker">
              <WholesaleIcon name="account" size={14} />
              <span>Partner Program / Registration</span>
            </div>
            <h1>
              <WholesaleIcon name="warehouse" size={26} />
              Wholesale Partner Onboarding
            </h1>
            <p>
              Unlock factory-direct procurement, tier pricing (up to 25% margin), and zero-website-payment commercial billing through CarXen.
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
              <span>Sign out</span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px 18px', color: '#991b1b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} />
            <span style={{ fontSize: '13.5px' }}>{errorMessage}</span>
          </div>
        )}

        <div className="ws-basket-layout">
          {/* Form Card */}
          <div className="ws-table-card" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px', color: '#0f172a' }}>
              Business Registration Details
            </h2>

            <form onSubmit={handleApply}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Legal Business Name *</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px' }}
                    placeholder="e.g. Apex Auto Accessories LLP"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Trade / Store Name</label>
                  <input
                    type="text"
                    style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px' }}
                    placeholder="e.g. Apex Car Studio"
                    value={formData.tradeName}
                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>GSTIN Number *</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px', fontFamily: 'monospace' }}
                    placeholder="22AAAAA0000A1Z5"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>PAN Number</label>
                  <input
                    type="text"
                    style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px', fontFamily: 'monospace' }}
                    placeholder="ABCDE1234F"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Contact Person Name *</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px' }}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Business Phone / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px' }}
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Registered Business Address *</label>
                <input
                  type="text"
                  required
                  style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px' }}
                  placeholder="Street, Industrial Area, Landmark"
                  value={formData.businessAddress}
                  onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>City *</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px' }}
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>State *</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px' }}
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>PIN Code *</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px' }}
                    placeholder="110001"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="ws-btn-primary ws-btn-brand"
                style={{ width: '100%', height: '44px', fontSize: '14px' }}
              >
                <Send size={16} />
                <span>{submitting ? 'Submitting Application…' : 'Submit Wholesale Application'}</span>
              </button>
            </form>
          </div>

          {/* Right Trust Column */}
          <div className="ws-checkout-card">
            <h3>B2B Wholesale Privileges</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ color: '#059669', flexShrink: 0, marginTop: '2px' }}>
                  <WholesaleIcon name="shield" size={20} />
                </div>
                <div>
                  <strong style={{ fontSize: '13.5px', display: 'block', color: '#0f172a' }}>Zero Website Payment</strong>
                  <span style={{ fontSize: '12.5px', color: '#64748b', lineHeight: 1.45 }}>
                    Orders are confirmed online and released directly to CarXen for offline commercial billing and credit terms.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ color: '#059669', flexShrink: 0, marginTop: '2px' }}>
                  <WholesaleIcon name="tier" size={20} />
                </div>
                <div>
                  <strong style={{ fontSize: '13.5px', display: 'block', color: '#0f172a' }}>Volume Tier Pricing</strong>
                  <span style={{ fontSize: '12.5px', color: '#64748b', lineHeight: 1.45 }}>
                    Automated 15% to 25% wholesale margins applied across all SKU quantities once verified.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ color: '#059669', flexShrink: 0, marginTop: '2px' }}>
                  <WholesaleIcon name="truck" size={20} />
                </div>
                <div>
                  <strong style={{ fontSize: '13.5px', display: 'block', color: '#0f172a' }}>Direct Factory Dispatch</strong>
                  <span style={{ fontSize: '12.5px', color: '#64748b', lineHeight: 1.45 }}>
                    Priority manufacturing batches directly packed and dispatched from CarXen production lines.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Application Gate: Verification In Progress
  if (isWholesalePending) {
    const applicantName = b2bProfile?.businessName || user?.name || 'Apex Automotive';
    const applicantGstin = b2bProfile?.gstin || '22AAAAA0000A1Z5';
    const refCode = `CX-B2B-${(applicantGstin.replace(/[^A-Za-z0-9]/g, '').slice(-4) || '8841').toUpperCase()}`;

    return (
      <div className="ws-page-container">
        <div className="ws-review-wrapper">
          {/* Top Header Card with Reference Badge */}
          <div className="ws-review-header-card">
            <div className="ws-review-header-left">
              <div className="ws-review-status-pill">
                <span className="ws-review-pulse-dot" />
                <span>Verification In Progress · Commercial Desk Active</span>
              </div>
              <h1>Wholesale Partner Application Under Active Review</h1>
              <p>
                Your CarXen commercial partnership application for <strong>{applicantName}</strong> has been logged in our enterprise registry and assigned to our underwriting desk.
              </p>
            </div>
            <div className="ws-review-header-right">
              <div className="ws-ref-badge-card">
                <span className="ws-ref-label">Enterprise Reference</span>
                <span className="ws-ref-code">{refCode}</span>
                <span className="ws-ref-sla">Priority SLA: &lt; 4 Hours</span>
              </div>
            </div>
          </div>

          {/* 4-Step Verification Tracker */}
          <div className="ws-review-tracker-card">
            <div className="ws-review-tracker-title">
              <div className="ws-tracker-title-left">
                <Clock size={16} color="#d97706" />
                <span>Verification Milestones & Progress</span>
              </div>
              <div className="ws-review-sla-badge">
                <span>Avg Decision Time: 2–4 Business Hours</span>
              </div>
            </div>

            {/* Connecting progress bar */}
            <div className="ws-tracker-pipeline-bar">
              <div className="ws-tracker-pipeline-fill" />
            </div>

            <div className="ws-review-steps-grid">
              {/* Step 1: Completed */}
              <div className="ws-review-step completed">
                <div className="ws-step-top">
                  <div className="ws-review-step-icon">
                    <Check size={16} strokeWidth={3} />
                  </div>
                  <span className="ws-step-status-tag done">01 · Done</span>
                </div>
                <div className="ws-review-step-content">
                  <h4>Application Logged</h4>
                  <p>Corporate profile, contact info & trade authorization recorded.</p>
                </div>
              </div>

              {/* Step 2: Active */}
              <div className="ws-review-step active">
                <div className="ws-step-top">
                  <div className="ws-review-step-icon">
                    <span className="ws-step-inner-ping" />
                  </div>
                  <span className="ws-step-status-tag underway">02 · In Review</span>
                </div>
                <div className="ws-review-step-content">
                  <h4>GSTIN & Identity Check</h4>
                  <p>Verifying tax compliance, ITC eligibility & business jurisdiction.</p>
                </div>
              </div>

              {/* Step 3: Next */}
              <div className="ws-review-step pending">
                <div className="ws-step-top">
                  <div className="ws-review-step-icon">
                    <Lock size={14} />
                  </div>
                  <span className="ws-step-status-tag queued">03 · Queued</span>
                </div>
                <div className="ws-review-step-content">
                  <h4>Margin Tier Setup</h4>
                  <p>Assigning Tier 1 (15%) or Tier 2 (25%) factory procurement pricing.</p>
                </div>
              </div>

              {/* Step 4: Final */}
              <div className="ws-review-step pending">
                <div className="ws-step-top">
                  <div className="ws-review-step-icon">
                    <Sparkles size={14} />
                  </div>
                  <span className="ws-step-status-tag queued">04 · Final Step</span>
                </div>
                <div className="ws-review-step-content">
                  <h4>Procurement Unlocked</h4>
                  <p>Quick Order Matrix, volume quotes & offline tax invoice PO flow.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Symmetrical 2-Column Bento Layout */}
          <div className="ws-review-symmetrical-grid">
            {/* Left Column: Dossier Card */}
            <div className="ws-review-dossier-card">
              <div>
                <div className="ws-dossier-header">
                  <div className="ws-dossier-icon">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3>Partner Application Dossier</h3>
                    <p className="ws-dossier-subtext">Enterprise registry details submitted for underwriting</p>
                  </div>
                </div>

                {/* 2x3 Balanced Data Tiles Grid */}
                <div className="ws-dossier-tiles-grid">
                  <div className="ws-data-tile">
                    <span className="ws-data-tile-label">Legal Business Entity</span>
                    <strong className="ws-data-tile-value" title={applicantName}>{applicantName}</strong>
                  </div>

                  <div className="ws-data-tile">
                    <span className="ws-data-tile-label">GSTIN Identification</span>
                    <div className="ws-data-tile-flex">
                      <code>{applicantGstin}</code>
                      <span className="ws-gstin-valid-badge">
                        <Check size={11} strokeWidth={3} />
                        Format Verified
                      </span>
                    </div>
                  </div>

                  <div className="ws-data-tile">
                    <span className="ws-data-tile-label">Authorized Signatory</span>
                    <strong className="ws-data-tile-value">{user?.name || 'Signatory on file'}</strong>
                  </div>

                  <div className="ws-data-tile">
                    <span className="ws-data-tile-label">Assigned Desk</span>
                    <span className="ws-data-tile-value">Commercial Ops — Gurugram Hub</span>
                  </div>

                  <div className="ws-data-tile">
                    <span className="ws-data-tile-label">Turnaround Target</span>
                    <span className="ws-turnaround-pill">Same-Day Review (&lt; 4h)</span>
                  </div>

                  <div className="ws-data-tile">
                    <span className="ws-data-tile-label">Target Margin Tier</span>
                    <span className="ws-data-tile-value">Tier 1 (15% Baseline)</span>
                  </div>
                </div>
              </div>

              <div className="ws-dossier-footer-note">
                <ShieldCheck size={16} className="ws-footer-note-icon" />
                <p>
                  <strong>Automated Live Transition:</strong> When approved, your account instantly elevates to <em>Verified Wholesale Partner</em> with no re-login required.
                </p>
              </div>
            </div>

            {/* Right Column: Matched Height Perks & Fast Track */}
            <div className="ws-review-right-column">
              {/* Card 1: Unlocking Privileges */}
              <div className="ws-review-perks-card">
                <div className="ws-perks-header">
                  <div className="ws-perks-header-icon">
                    <BadgeCheck size={18} />
                  </div>
                  <div>
                    <h4>Privileges Unlocking on Approval</h4>
                    <p className="ws-perks-subtext">Commercial terms activated immediately upon approval</p>
                  </div>
                </div>

                <div className="ws-perks-list">
                  <div className="ws-perk-item">
                    <div className="ws-perk-bullet">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <strong>Direct Factory Margins (15% – 25%)</strong>
                      <span>Guaranteed bulk wholesale pricing on 7D mats, custom seat covers & wraps.</span>
                    </div>
                  </div>

                  <div className="ws-perk-item">
                    <div className="ws-perk-bullet">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <strong>Zero-Payment Online PO Flow</strong>
                      <span>Place enterprise batch orders online instantly with offline tax invoice settlement.</span>
                    </div>
                  </div>

                  <div className="ws-perk-item">
                    <div className="ws-perk-bullet">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <strong>Priority Factory Line Allocation</strong>
                      <span>Direct production batch queuing with priority 24–48h express carrier dispatch.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: WhatsApp Desk Assistance */}
              <div className="ws-review-fasttrack-card">
                <div className="ws-fasttrack-body">
                  <div className="ws-fasttrack-icon">
                    <WholesaleIcon name="phone" size={18} />
                  </div>
                  <div className="ws-fasttrack-text">
                    <strong>Need Urgent Stock for Showroom?</strong>
                    <p>Have an urgent opening or fleet order? Contact our commercial verification desk on WhatsApp for expedited review.</p>
                  </div>
                </div>

                <div className="ws-fasttrack-action-row">
                  <a
                    href={`https://wa.me/919876543210?text=Hi%20CarXen,%20I%20have%20submitted%20my%20wholesale%20partner%20application%20for%20${encodeURIComponent(applicantName)}%20(GSTIN:%20${applicantGstin}).%20Please%20expedite%20my%20review.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ws-fasttrack-wa-btn"
                  >
                    <span>Expedite via WhatsApp Desk</span>
                    <ExternalLink size={13} />
                  </a>
                  <span className="ws-desk-hours-note">Desk active Mon–Sat 9:30 AM – 7:00 PM IST</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // 4. APPROVED WHOLESALER WORKSPACE DASHBOARD
  const businessName = b2bProfile?.businessName || user?.name || 'Verified Wholesale Partner';
  const tierName = b2bProfile?.wholesaleTier === 'tier2' ? 'Tier 2 Partner (25% Margin)' : 'Tier 1 Partner (15% Margin)';

  const shortcuts = [
    {
      href: '/wholesale/catalog',
      icon: 'catalogue' as const,
      title: 'Wholesale Catalogue',
      description: 'Search SKUs, vehicle fitments, MOQ requirements, and stock across all categories.',
      action: 'Browse catalogue',
    },
    {
      href: '/wholesale/quick-order',
      icon: 'quick-order' as const,
      title: 'Quick Order Matrix',
      description: 'Rapid batch ordering sheet. Enter quantities across multiple parts and fill MOQs in one pass.',
      action: 'Open quick order',
    },
    {
      href: '/wholesale/order-basket',
      icon: 'basket' as const,
      title: 'Order Basket',
      description: 'Review drafted lines, verify GST estimate, enter PO ref number, and confirm order.',
      action: wholesaleBasketSkuCount > 0 ? `${wholesaleBasketSkuCount} SKUs ready` : 'Open basket',
    },
    {
      href: '/wholesale/orders',
      icon: 'orders' as const,
      title: 'Wholesale Orders',
      description: 'Track orders through CarXen review, production batch, packing, and dispatch milestones.',
      action: 'Track orders',
    },
    {
      href: '/wholesale/quotes',
      icon: 'lists' as const,
      title: 'Saved Assortments',
      description: 'Load pre-packaged fast movers, seasonal monsoon protection, and brand replenishment packs.',
      action: 'View lists',
    },
    {
      href: '/wholesale/account',
      icon: 'account' as const,
      title: 'Business Account',
      description: 'Manage legal entity, GSTIN registration, delivery warehouse address, and tier settings.',
      action: 'View account',
    },
  ];

  return (
    <div className="ws-page-container">
      {/* Top Welcome Bento */}
      <div className="ws-bento-grid">
        <div className="ws-hero-card-clean">
          <div>
            <span className="ws-hero-badge">
              <span className="ws-hero-badge-dot" />
              <span>Verified Partner</span>
            </span>
            <h2>{businessName}</h2>
            <p>
              Welcome back to the CarXen B2B Procurement Workspace. Bulk catalog access, volume margins, and CarXen factory fulfillment are active.
            </p>
            <div className="ws-hero-actions">
              <Link href="/wholesale/quick-order" className="ws-hero-btn-primary">
                <WholesaleIcon name="quick-order" size={16} />
                <span>Open Quick Order Matrix</span>
              </Link>
              <Link href="/wholesale/catalog" className="ws-hero-btn-catalogue">
                <WholesaleIcon name="catalogue" size={16} />
                <span>Browse Catalogue</span>
              </Link>
            </div>
          </div>
          <div className="ws-hero-logo-showcase">
            <img src="/logo.png" alt="CARXEN" className="ws-hero-logo-img" />
          </div>
        </div>

        {/* Commercial Snapshot Card */}
        <div className="ws-table-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.06em' }}>
                Account Snapshot
              </span>
              <WholesaleIcon name="shield" size={18} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Pricing Tier:</span>
                <strong style={{ color: '#0f172a' }}>{tierName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Online Payment:</span>
                <strong style={{ color: '#059669' }}>Not Required</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>GSTIN (ITC):</span>
                <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{b2bProfile?.gstin || '22AAAAA0000A1Z5'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Dispatch Window:</span>
                <strong style={{ color: '#0f172a' }}>24–48 Hours</strong>
              </div>
            </div>
          </div>

          <Link href="/wholesale/account" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: '#e2231a', textDecoration: 'none', marginTop: '16px' }}>
            <span>Manage business profile</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>



      {/* Workspace Shortcuts */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#e2231a', display: 'block' }}>
            Workspace Modules
          </span>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '4px 0 0 0' }}>
            Procurement & Management
          </h2>
        </div>
      </div>

      <div className="ws-shortcut-grid">
        {shortcuts.map((item) => (
          <Link href={item.href} key={item.href} className="ws-shortcut-card">
            <div className="ws-shortcut-top">
              <div className="ws-shortcut-icon">
                <WholesaleIcon name={item.icon} size={20} />
              </div>
              <ArrowRight size={16} color="#94a3b8" />
            </div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <div className="ws-shortcut-cta">
              <span>{item.action}</span>
              <ArrowRight size={14} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

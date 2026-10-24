'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { WholesaleIcon, WholesaleMark } from '@/components/wholesale/WholesaleIcon';
import { ArrowRight, AlertCircle, ExternalLink, Send } from 'lucide-react';
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
    return (
      <div className="ws-page-container">
        <div className="ws-empty-state-card" style={{ maxWidth: '640px', margin: '40px auto', padding: '48px 32px' }}>
          <div className="ws-empty-icon-wrap" style={{ background: '#fffbeb', color: '#d97706' }}>
            <WholesaleIcon name="shield" size={32} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
            Application Under Review
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.5, marginBottom: '24px' }}>
            Your CarXen wholesale partner account for <strong>{b2bProfile?.businessName || user?.name || 'Applicant'}</strong> is being verified by our commercial desk (GSTIN: {b2bProfile?.gstin || 'Submitted'}).
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link href="/" className="ws-btn-secondary">
              CarXen Home
            </Link>
            <button
              type="button"
              className="ws-btn-secondary"
              style={{ color: '#ef4444' }}
              onClick={async () => {
                await logout();
                router.push('/login');
              }}
            >
              Sign out
            </button>
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
            <span className="ws-hero-badge">Verified Partner</span>
            <h2>{businessName}</h2>
            <p>
              Welcome back to the CarXen B2B Procurement Workspace. Bulk catalog access, volume margins, and CarXen factory fulfillment are active.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Link href="/wholesale/quick-order" className="ws-btn-primary ws-btn-brand">
                <WholesaleIcon name="quick-order" size={15} />
                <span>Open Quick Order Matrix</span>
              </Link>
              <Link href="/wholesale/catalog" className="ws-btn-secondary" style={{ background: 'rgba(255,255,255,0.12)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.25)' }}>
                <span>Browse Catalogue</span>
              </Link>
            </div>
          </div>
          <div style={{ opacity: 0.85 }}>
            <WholesaleMark size={84} />
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

      {/* Protocol Strip */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ color: '#059669' }}>
            <WholesaleIcon name="shield" size={24} />
          </div>
          <div>
            <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>Zero Online Payment by Design</strong>
            <span style={{ fontSize: '12.5px', color: '#64748b' }}>Confirm bulk requests directly. CarXen coordinates factory allocation and offline commercial settlement.</span>
          </div>
        </div>
        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '6px' }}>
          Commercial Protocol Active
        </span>
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

      {/* Commercial Desk Support Card */}
      <div className="ws-table-card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fff1f0', color: '#e2231a', display: 'grid', placeItems: 'center' }}>
            <WholesaleIcon name="phone" size={20} />
          </div>
          <div>
            <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>CarXen Commercial Desk</strong>
            <span style={{ fontSize: '12.5px', color: '#64748b' }}>Custom vehicle orders, bulk proformas & priority allocation · <strong>+91 98765 43210</strong></span>
          </div>
        </div>

        <a
          href="https://wa.me/919876543210"
          target="_blank"
          rel="noopener noreferrer"
          className="ws-btn-secondary"
        >
          <span>WhatsApp Commercial Desk</span>
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { getAvailableCouponsForBuyer, type WholesaleBuyerContext } from '@/lib/storefront/coupons';
import {
  Building2,
  ShieldCheck,
  FileText,
  Truck,
  Lock,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Layers,
  Percent,
  X,
  RefreshCw,
  PhoneCall,
  MessageSquare,
  FileCheck,
} from 'lucide-react';
import './b2b.css';
import { formatUserFriendlyB2BError } from '@/lib/format-b2b-error';

function B2BErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="b2b-error-banner" role="alert" aria-live="assertive">
      <div className="b2b-error-icon-wrap">
        <AlertCircle size={18} />
      </div>
      <div className="b2b-error-content">
        <div className="b2b-error-title">Application Submission Notice</div>
        <div className="b2b-error-msg">{message}</div>
        <div className="b2b-error-help">
          <span>Need immediate assistance? Contact wholesale desk:</span>
          <strong>+91 98765 43210</strong>
          <span>·</span>
          <strong>b2b@carxen.in</strong>
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="b2b-error-dismiss-btn"
          title="Dismiss notification"
          aria-label="Dismiss notification"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export default function B2BWholesalePage() {
  const router = useRouter();
  const {
    user,
    authLoading,
    b2bProfile,
    isWholesaleApproved,
    isWholesalePending,
    applyForWholesale,
    refreshCustomerProfile,
    coupons,
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
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  const handleCheckLiveStatus = async () => {
    setCheckingStatus(true);
    try {
      await refreshCustomerProfile();
      showToast('Checked with Veda review desk: Application is currently under review.');
    } catch {
      showToast('Status checked: Under review by factory desk.');
    } finally {
      setTimeout(() => setCheckingStatus(false), 600);
    }
  };

  const handleCopyRef = (refId: string) => {
    void navigator.clipboard?.writeText(refId);
    setCopiedRef(true);
    showToast(`Copied reference ID: ${refId}`);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?redirect=/wholesale');
    } else if (isWholesaleApproved) {
      router.replace('/wholesale');
    }
  }, [authLoading, user, isWholesaleApproved, router]);

  useEffect(() => {
    if (user && !formData.name) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
      }));
    }
  }, [user, formData.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!user) {
      setErrorMessage('You must be signed in to submit a wholesale application.');
      router.push('/login?redirect=/b2b');
      return;
    }

    if (!formData.name.trim()) {
      setErrorMessage('Please enter the Representative / Applicant Full Name.');
      window.scrollTo({ top: 180, behavior: 'smooth' });
      return;
    }

    if (!formData.businessName.trim()) {
      setErrorMessage('Please enter your registered Legal Business Name.');
      window.scrollTo({ top: 180, behavior: 'smooth' });
      return;
    }

    if (!formData.email.trim() && !formData.phone.trim()) {
      setErrorMessage('Please provide either a business email or mobile number for account verification.');
      window.scrollTo({ top: 180, behavior: 'smooth' });
      return;
    }

    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        setErrorMessage('Please enter a valid business email address (e.g. name@company.com).');
        window.scrollTo({ top: 180, behavior: 'smooth' });
        return;
      }
    }

    if (formData.phone.trim()) {
      const cleanedPhone = formData.phone.replace(/[\s\-\(\)\+]/g, '');
      if (cleanedPhone.length < 8 || cleanedPhone.length > 15) {
        setErrorMessage('Please enter a valid contact phone or WhatsApp number (8–15 digits).');
        window.scrollTo({ top: 180, behavior: 'smooth' });
        return;
      }
    }

    if (formData.gstin.trim()) {
      const cleanedGst = formData.gstin.trim().toUpperCase();
      if (cleanedGst.length !== 15) {
        setErrorMessage('GSTIN must be 15 alphanumeric characters (e.g. 22AAAAA0000A1Z5), or leave blank if unregistered.');
        window.scrollTo({ top: 180, behavior: 'smooth' });
        return;
      }
    }

    if (formData.pan.trim()) {
      const cleanedPan = formData.pan.trim().toUpperCase();
      if (cleanedPan.length !== 10) {
        setErrorMessage('PAN must be 10 alphanumeric characters (e.g. ABCDE1234F), or leave blank.');
        window.scrollTo({ top: 180, behavior: 'smooth' });
        return;
      }
    }

    if (formData.pincode.trim()) {
      const cleanedPin = formData.pincode.trim();
      if (!/^\d{6}$/.test(cleanedPin)) {
        setErrorMessage('Postal PIN code must be a 6-digit number.');
        window.scrollTo({ top: 180, behavior: 'smooth' });
        return;
      }
    }

    setSubmitting(true);
    const res = await applyForWholesale(formData);
    setSubmitting(false);

    if (res.success) {
      setJustSubmitted(true);
      void refreshCustomerProfile();
    } else {
      setErrorMessage(formatUserFriendlyB2BError(res.error || 'Failed to submit application. Please review your details and try again.'));
      window.scrollTo({ top: 180, behavior: 'smooth' });
    }
  };

  const handleCopyCode = (code: string) => {
    void navigator.clipboard?.writeText(code);
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(null), 2500);
  };

  const buyerContext: WholesaleBuyerContext = useMemo(
    () => ({
      isWholesaleApproved,
      businessName: b2bProfile?.businessName,
      tradeName: b2bProfile?.tradeName,
      email: user?.email,
      userId: user?.id,
    }),
    [isWholesaleApproved, b2bProfile?.businessName, b2bProfile?.tradeName, user?.email, user?.id]
  );

  const availableCoupons = useMemo(() => {
    return getAvailableCouponsForBuyer(buyerContext, coupons);
  }, [buyerContext, coupons]);

  const assignedCoupons = availableCoupons.filter(
    (c) =>
      c.audience === 'Wholesale buyers' ||
      c.audience === 'Individual Wholesale Buyer' ||
      c.audience === 'Dealer accounts'
  );

  // --------------------------------------------------------------------------
  // 0. AUTHENTICATION LOADING
  // --------------------------------------------------------------------------
  if (authLoading) {
    return (
      <div className="b2b-page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="b2b-badge active" style={{ margin: '0 auto 16px' }}>
            <span className="b2b-dot pulse" />
            <span>VERIFYING ACCOUNT</span>
          </div>
          <p style={{ color: 'var(--steel, #71717a)', fontSize: 14 }}>
            Checking wholesale partner authentication...
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 1. UNLOADED / UNLOGGED-IN GATE SCREEN
  // --------------------------------------------------------------------------
  if (!user) {
    return (
      <div className="b2b-page-container">
        <div className="b2b-auth-gate-card">
          <div className="b2b-auth-icon-wrap">
            <Lock size={28} />
          </div>
          <div className="b2b-badge" style={{ margin: '0 auto 16px' }}>
            <span className="b2b-dot" />
            <span>WHOLESALE PORTAL · LOGIN REQUIRED</span>
          </div>
          <h1>CarXen B2B Wholesale Portal</h1>
          <p>
            Direct factory wholesale pricing, minimum order quantity (MOQ) batch rules, and GST Input Tax Credit (ITC) invoicing are reserved for registered automotive partners.
          </p>

          <div className="b2b-auth-perks-row">
            <div className="b2b-auth-perk-pill">
              <span className="icon">🏷️</span>
              <span>40%–55% Resale Margin</span>
            </div>
            <div className="b2b-auth-perk-pill">
              <span className="icon">📦</span>
              <span>Low MOQ Batch Packs</span>
            </div>
            <div className="b2b-auth-perk-pill">
              <span className="icon">📑</span>
              <span>Full GSTIN Tax Invoices</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/login?redirect=/b2b" className="b2b-btn primary">
              Sign In to Your Account &rarr;
            </Link>
            <Link href="/login?mode=signup&redirect=/b2b" className="b2b-btn secondary">
              Register New Account
            </Link>
            <Link href="/" className="b2b-btn ghost">
              CarXen Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 2. APPROVED WHOLESALER DASHBOARD
  // --------------------------------------------------------------------------
  if (isWholesaleApproved) {
    return (
      <div className="b2b-page-container">
        <div className="b2b-approved-hero">
          <div className="b2b-badge active" style={{ marginBottom: 16 }}>
            <span className="b2b-dot pulse" />
            <span>WHOLESALE PARTNER · ACTIVE ({b2bProfile?.wholesaleTier === 'tier2' ? 'TIER 2 VIP' : 'TIER 1 STANDARD'})</span>
          </div>

          <h1>Welcome, {b2bProfile?.businessName || user?.name || 'Wholesale Partner'}</h1>
          <p className="sub">
            Your B2B Wholesale account is fully active. You have factory-direct wholesale pricing unlocked across the entire catalog, MOQ batch order rules, and direct Quick Order sheet access.
          </p>

          <div className="b2b-approved-actions">
            <Link href="/b2b/quick-order" className="b2b-btn primary">
              Open Bulk Quick Order Sheet &rarr;
            </Link>
            <Link href="/shop" className="b2b-btn secondary" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>
              Browse Storefront with B2B Rates
            </Link>
            <Link href="/account" className="b2b-btn ghost" style={{ color: '#a1a1aa', borderColor: 'rgba(255,255,255,0.1)' }}>
              View Account Profile
            </Link>
          </div>

          <div className="b2b-metrics-grid">
            <div className="b2b-metric-item">
              <span className="lbl">Legal Business Entity</span>
              <span className="val">{b2bProfile?.businessName || '—'}</span>
            </div>
            <div className="b2b-metric-item">
              <span className="lbl">GSTIN Registered</span>
              <span className="val" style={{ fontFamily: 'monospace' }}>{b2bProfile?.gstin || '—'}</span>
            </div>
            <div className="b2b-metric-item">
              <span className="lbl">Assigned Wholesale Tier</span>
              <span className="val green">{b2bProfile?.wholesaleTier === 'tier2' ? 'Tier 2 (High Volume)' : 'Tier 1 (Standard)'}</span>
            </div>
            <div className="b2b-metric-item">
              <span className="lbl">Tax Invoicing</span>
              <span className="val green">GST ITC Eligible</span>
            </div>
          </div>
        </div>

        {/* Exclusive Wholesale Coupons */}
        {assignedCoupons.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0e0e0f' }}>
                  🏷️ Your Assigned Wholesale Discounts & Coupons
                </h3>
                <p style={{ fontSize: 12, color: '#71717a', margin: '2px 0 0' }}>
                  Exclusive dealer codes assigned to {b2bProfile?.businessName || 'your dealership'} by the factory desk.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
              {assignedCoupons.map((c) => (
                <div
                  key={c.code}
                  style={{
                    background: '#ffffff',
                    border: '1px dashed #f59e0b',
                    borderRadius: 14,
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.05)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: '#b45309', background: '#fef3c7', padding: '3px 8px', borderRadius: 6 }}>
                        {c.code}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>
                        {c.type === 'Percentage' ? `${c.value}% OFF` : `₹${c.value.toLocaleString('en-IN')} OFF`}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, margin: '10px 0 3px', color: '#18181b' }}>
                      {c.name}
                    </p>
                    <p style={{ fontSize: 11.5, margin: 0, color: '#71717a', lineHeight: 1.4 }}>
                      {c.description || (c.minimumOrder ? `Valid on wholesale orders above ₹${c.minimumOrder.toLocaleString('en-IN')}` : 'Valid on wholesale orders')}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingTop: 10, borderTop: '1px solid #f4f4f5' }}>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(c.code)}
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid #d4d4d8',
                        background: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {copiedCoupon === c.code ? (
                        <>
                          <Check size={13} style={{ color: '#059669' }} />
                          <span style={{ color: '#059669' }}>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                    <Link
                      href="/checkout"
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        padding: '6px 14px',
                        borderRadius: 8,
                        background: '#f59e0b',
                        color: '#ffffff',
                        textDecoration: 'none',
                      }}
                    >
                      Use at Checkout &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 3. PENDING REVIEW VIEW
  // --------------------------------------------------------------------------
  if (isWholesalePending || justSubmitted) {
    const activeBusiness = b2bProfile?.businessName || formData.businessName || 'Your Dealership';
    const referenceId = `CX-B2B-${(user?.id || 'APEX').slice(-6).toUpperCase()}`;
    const appliedDate = b2bProfile?.appliedAt
      ? new Date(b2bProfile.appliedAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

    return (
      <div className="b2b-page-container">
        <div className="b2b-pending-wrap">
          {/* Main Hero Status Card */}
          <div className="b2b-pending-hero">
            <div className="b2b-status-live-badge">
              <span className="b2b-live-dot" />
              <span>Verification In Progress · Estimated 24–48 Hours</span>
            </div>

            <h1>Application Submitted for Review</h1>
            <p className="sub">
              Thank you for partnering with CarXen. Your wholesale dealership application for{' '}
              <strong>{activeBusiness}</strong> has been received and prioritized at our factory verification desk.
            </p>

            {/* Application Meta Strip */}
            <div className="b2b-pending-meta-strip">
              <div className="b2b-meta-item">
                <span>Application ID:</span>
                <span className="b2b-meta-tag">{referenceId}</span>
                <button
                  type="button"
                  onClick={() => handleCopyRef(referenceId)}
                  className="b2b-meta-copy-btn"
                  title="Copy Reference ID"
                >
                  {copiedRef ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
                </button>
              </div>
              <div className="b2b-meta-item">
                <Clock size={14} style={{ color: '#f59e0b' }} />
                <span>Submitted:</span>
                <strong>{appliedDate}</strong>
              </div>
              <div className="b2b-meta-item">
                <ShieldCheck size={14} style={{ color: '#10b981' }} />
                <span>Verification Desk:</span>
                <strong>CarXen Veda Factory Desk</strong>
              </div>
            </div>

            {/* Visual Connected Stepper */}
            <div className="b2b-pending-steps-grid">
              <div className="b2b-pending-step-card done">
                <div className="b2b-pending-step-num">✓</div>
                <div className="b2b-pending-step-content">
                  <div className="b2b-step-header-row">
                    <strong>1. Application Filed</strong>
                    <span className="b2b-step-status-chip done">Completed</span>
                  </div>
                  <span>Entity details & tax identifiers recorded</span>
                </div>
              </div>

              <div className="b2b-pending-step-card active">
                <div className="b2b-pending-step-num">2</div>
                <div className="b2b-pending-step-content">
                  <div className="b2b-step-header-row">
                    <strong>2. Veda Owner Desk Review</strong>
                    <span className="b2b-step-status-chip active">In Review</span>
                  </div>
                  <span>GSTIN & wholesale tier matching (24–48h)</span>
                </div>
              </div>

              <div className="b2b-pending-step-card">
                <div className="b2b-pending-step-num">3</div>
                <div className="b2b-pending-step-content">
                  <div className="b2b-step-header-row">
                    <strong>3. Wholesale Unlocked</strong>
                    <span className="b2b-step-status-chip upcoming">Upcoming</span>
                  </div>
                  <span>Instant bulk table ordering & GST ITC invoices</span>
                </div>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleCheckLiveStatus}
                disabled={checkingStatus}
                className="b2b-btn secondary"
                style={{ minWidth: 170 }}
              >
                <RefreshCw size={15} style={{ animation: checkingStatus ? 'spin 1s linear infinite' : 'none' }} />
                <span>{checkingStatus ? 'Checking Status...' : 'Check Status Now'}</span>
              </button>

              <Link href="/b2b/quick-order" className="b2b-btn primary">
                <Layers size={15} />
                <span>Preview Wholesale Catalog</span>
              </Link>

              <Link href="/shop" className="b2b-btn ghost">
                <span>Browse Storefront (Retail)</span>
              </Link>
            </div>
          </div>

          {/* Submitted Information Record Card */}
          <div className="b2b-app-spec-card">
            <div className="b2b-spec-header">
              <div className="b2b-spec-title-wrap">
                <h3>Submitted Application Record</h3>
                <p>Verify the information submitted for wholesale tier approval and invoicing.</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '4px 10px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle2 size={13} />
                <span>Details on Record</span>
              </span>
            </div>

            <div className="b2b-spec-grid">
              <div className="b2b-spec-item">
                <div className="b2b-spec-label">
                  <Building2 size={12} />
                  <span>Legal Entity Name</span>
                </div>
                <div className="b2b-spec-val">{activeBusiness}</div>
                {b2bProfile?.tradeName || formData.tradeName ? (
                  <div style={{ fontSize: 11.5, color: '#71717a', marginTop: 2 }}>
                    Trade: {b2bProfile?.tradeName || formData.tradeName}
                  </div>
                ) : null}
              </div>

              <div className="b2b-spec-item">
                <div className="b2b-spec-label">
                  <FileText size={12} />
                  <span>Tax Registration (GSTIN)</span>
                </div>
                <div className="b2b-spec-val" style={{ fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.04em' }}>
                  {b2bProfile?.gstin || formData.gstin || 'Not Provided / Sole Proprietor'}
                </div>
                {b2bProfile?.pan || formData.pan ? (
                  <div style={{ fontSize: 11.5, color: '#71717a', marginTop: 2 }}>
                    PAN: {b2bProfile?.pan || formData.pan}
                  </div>
                ) : null}
              </div>

              <div className="b2b-spec-item">
                <div className="b2b-spec-label">
                  <Mail size={12} />
                  <span>Contact Representative</span>
                </div>
                <div className="b2b-spec-val">{formData.name || user?.name || 'Authorized Buyer'}</div>
                <div style={{ fontSize: 11.5, color: '#71717a', marginTop: 2 }}>
                  {formData.email || user?.email || formData.phone || user?.phone || 'Verified contact'}
                </div>
              </div>

              <div className="b2b-spec-item">
                <div className="b2b-spec-label">
                  <Percent size={12} />
                  <span>Business Category</span>
                </div>
                <div className="b2b-spec-val">
                  {b2bProfile?.businessType || formData.businessType || 'Automotive Dealer / Workshop'}
                </div>
              </div>

              <div className="b2b-spec-item">
                <div className="b2b-spec-label">
                  <Layers size={12} />
                  <span>Projected Order Volume</span>
                </div>
                <div className="b2b-spec-val">
                  {b2bProfile?.expectedMonthlyVolume || formData.expectedMonthlyVolume || '₹50k–₹2L (Tier 1)'}
                </div>
              </div>

              <div className="b2b-spec-item">
                <div className="b2b-spec-label">
                  <MapPin size={12} />
                  <span>Dispatch Location</span>
                </div>
                <div className="b2b-spec-val">
                  {b2bProfile?.city || formData.city
                    ? `${b2bProfile?.city || formData.city}, ${b2bProfile?.state || formData.state || ''} ${b2bProfile?.pincode || formData.pincode ? `(${b2bProfile?.pincode || formData.pincode})` : ''}`
                    : 'Registered Workshop Address'}
                </div>
              </div>
            </div>
          </div>

          {/* What to Expect Next (3 Value Tiles) */}
          <div className="b2b-expect-grid">
            <div className="b2b-expect-card">
              <div className="b2b-expect-icon">
                <Mail size={18} style={{ color: '#e2231a' }} />
              </div>
              <h4>Realtime Notification</h4>
              <p>You will receive an automated email and SMS notification the moment your wholesale tier is approved.</p>
            </div>

            <div className="b2b-expect-card">
              <div className="b2b-expect-icon">
                <Percent size={18} style={{ color: '#16a34a' }} />
              </div>
              <h4>Automatic Price Toggle</h4>
              <p>Upon approval, the storefront automatically unlocks wholesale dealer rates and MOQ bulk order tables.</p>
            </div>

            <div className="b2b-expect-card">
              <div className="b2b-expect-icon">
                <FileCheck size={18} style={{ color: '#2563eb' }} />
              </div>
              <h4>Full GST ITC Invoices</h4>
              <p>Every shipment comes with an official GST invoice matching your GSTIN for instant input tax credit.</p>
            </div>
          </div>

          {/* Fast-Track Desk Box */}
          <div className="b2b-fasttrack-card">
            <div className="b2b-fasttrack-content">
              <h4>
                <Sparkles size={16} style={{ color: '#f59e0b' }} />
                <span>Need Expedited Approval for an Active Order?</span>
              </h4>
              <p>
                If you have an active garage job or urgent bulk purchase order waiting, contact our factory wholesale desk to prioritize verification immediately.
              </p>
            </div>
            <div className="b2b-fasttrack-actions">
              <a href="tel:+919876543210" className="b2b-hotline-btn">
                <PhoneCall size={14} />
                <span>+91 98765 43210</span>
              </a>
              <a
                href={`https://wa.me/919876543210?text=${encodeURIComponent(
                  `Hi CarXen Wholesale Desk, I have submitted a wholesale application for ${activeBusiness} (Ref: ${referenceId}) and would like to expedite verification.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="b2b-hotline-btn whatsapp"
              >
                <MessageSquare size={14} />
                <span>WhatsApp Desk</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 4. INQUIRY / INFORMATION REQUESTED
  // --------------------------------------------------------------------------
  if (b2bProfile?.status === 'INQUIRY') {
    return (
      <div className="b2b-page-container">
        <div className="b2b-pending-hero" style={{ borderColor: '#bae6fd' }}>
          <div className="b2b-badge inquiry" style={{ margin: '0 auto 16px' }}>
            <span className="b2b-dot pulse" />
            <span>ACTION REQUIRED · CLARIFICATION REQUESTED</span>
          </div>
          <h1>Additional Verification Details Needed</h1>
          <p className="sub">
            The review team reviewed your application for <strong>{b2bProfile?.businessName || formData.businessName || 'your business'}</strong> and requested clarification:
          </p>

          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 14, padding: '16px 20px', maxWidth: 640, margin: '0 auto 24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', marginBottom: 6 }}>
              <AlertCircle size={15} />
              <span>Review Desk Note:</span>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: '#0f172a', lineHeight: 1.5 }}>
              {b2bProfile.inquiryMessage || b2bProfile.rejectionReason || 'Please clarify business registration details or provide your GST certificate link.'}
            </p>
          </div>
        </div>

        {/* Prefilled Form */}
        <div className="b2b-form-card" style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0e0e0f', marginBottom: 4 }}>Respond to Inquiry & Update Information</h2>
          <p style={{ fontSize: 13, color: '#71717a', marginBottom: 24 }}>Update requested fields and submit your response directly back to the Veda review table.</p>

          {errorMessage && (
            <B2BErrorBanner
              message={errorMessage}
              onDismiss={() => setErrorMessage(null)}
            />
          )}

          <form onSubmit={handleSubmit}>
            <div className="b2b-form-section">
              <div className="b2b-section-header">
                <div className="b2b-section-num">1</div>
                <div className="b2b-section-title-wrap">
                  <h3>Response & Documents</h3>
                  <p>Provide the explanation or document drive link requested by the reviewer.</p>
                </div>
              </div>
              <div className="b2b-field full">
                <label>Clarification / Notes *</label>
                <textarea
                  rows={3}
                  required
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Explain requested details, document Google Drive links, or trade verification..."
                />
              </div>
            </div>

            <div className="b2b-submit-block">
              <button type="submit" disabled={submitting} className="b2b-submit-btn">
                {submitting ? 'Submitting Clarification...' : 'Submit Inquiry Response & Re-verify'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 5. DECLINED / RE-APPLY VIEW
  // --------------------------------------------------------------------------
  if (b2bProfile?.status === 'REJECTED') {
    return (
      <div className="b2b-page-container">
        <div className="b2b-pending-hero" style={{ borderColor: '#fecaca' }}>
          <div className="b2b-badge rejected" style={{ margin: '0 auto 16px' }}>
            <span>APPLICATION DECLINED</span>
          </div>
          <h1>Application Update Needed</h1>
          <p className="sub">
            The review team could not approve the application at this time:
          </p>
          {b2bProfile.rejectionReason && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 12, padding: '14px 18px', fontSize: 13, maxWidth: 600, margin: '0 auto 20px', textAlign: 'left' }}>
              <strong>Decline Note:</strong> {b2bProfile.rejectionReason}
            </div>
          )}
          <p style={{ fontSize: 13, color: '#71717a' }}>
            You may correct any business or tax information below and resubmit for verification.
          </p>
        </div>

        {/* Re-application form */}
        <div className="b2b-form-card" style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0e0e0f', marginBottom: 4 }}>Revise & Resubmit Application</h2>
          <p style={{ fontSize: 13, color: '#71717a', marginBottom: 24 }}>Ensure your GSTIN, Legal Name, and Workshop Address are accurate.</p>

          {errorMessage && (
            <B2BErrorBanner
              message={errorMessage}
              onDismiss={() => setErrorMessage(null)}
            />
          )}

          <form onSubmit={handleSubmit}>
            <div className="b2b-form-section">
              <div className="b2b-section-header">
                <div className="b2b-section-num">1</div>
                <div className="b2b-section-title-wrap">
                  <h3>Legal Business Details</h3>
                </div>
              </div>
              <div className="b2b-field-grid">
                <div className="b2b-field">
                  <label>Legal Business Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  />
                </div>
                <div className="b2b-field">
                  <label>GSTIN (15 Digits)</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>
            </div>

            <div className="b2b-form-section">
              <div className="b2b-section-header">
                <div className="b2b-section-num">2</div>
                <div className="b2b-section-title-wrap">
                  <h3>Corrections & Additional Notes</h3>
                </div>
              </div>
              <div className="b2b-field full">
                <label>Notes / Proof Link</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Explain corrections or updated business proofs..."
                />
              </div>
            </div>

            <div className="b2b-submit-block">
              <button type="submit" disabled={submitting} className="b2b-submit-btn">
                {submitting ? 'Resubmitting Application...' : 'Resubmit Wholesale Application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 6. DEFAULT APPLICATION FORM (LOGGED-IN USER APPLYING FOR B2B)
  // --------------------------------------------------------------------------
  return (
    <div className="b2b-page-container">
      {/* Page Header */}
      <div className="b2b-apply-header">
        <div className="b2b-apply-header-top">
          <div className="b2b-badge">
            <span className="b2b-dot" />
            <span>CARXEN B2B WHOLESALE PROGRAM</span>
          </div>
          <span style={{ fontSize: 12, color: '#71717a', fontWeight: 600 }}>
            Fast Verification in 24–48 Hours
          </span>
        </div>
        <h1>Direct Factory Sourcing for Dealerships & Garages</h1>
        <p>
          Apply for a CarXen Wholesale Account. Once verified by our factory desk, unlock wholesale pricing across all product SKUs, MOQ batch ordering, and GST Input Tax Credit (ITC) tax invoicing.
        </p>
      </div>

      {/* Main Two-Column Layout */}
      <div className="b2b-apply-grid">
        {/* Left Sidebar: Value Pillars & Timeline */}
        <div className="b2b-sidebar">
          <div className="b2b-sidebar-card">
            <h3>
              <Sparkles size={16} style={{ color: '#e2231a' }} />
              <span>Wholesale Partner Perks</span>
            </h3>

            <div className="b2b-perks-list">
              <div className="b2b-perk-item">
                <div className="b2b-perk-icon">
                  <Percent size={16} />
                </div>
                <div className="b2b-perk-content">
                  <strong>40%–55% Resale Margin</strong>
                  <span>Direct SKU wholesale pricing set straight from our manufacturing facility.</span>
                </div>
              </div>

              <div className="b2b-perk-item">
                <div className="b2b-perk-icon">
                  <Layers size={16} />
                </div>
                <div className="b2b-perk-content">
                  <strong>Minimum Order Units (MOQ)</strong>
                  <span>Low minimums per item (e.g. 5 units) so you can stock exactly what moves.</span>
                </div>
              </div>

              <div className="b2b-perk-item">
                <div className="b2b-perk-icon">
                  <FileText size={16} />
                </div>
                <div className="b2b-perk-content">
                  <strong>Full GSTIN Invoicing</strong>
                  <span>B2B invoices with complete GST breakdown, fully eligible for ITC credit.</span>
                </div>
              </div>

              <div className="b2b-perk-item">
                <div className="b2b-perk-icon">
                  <Truck size={16} />
                </div>
                <div className="b2b-perk-content">
                  <strong>Priority Factory Dispatch</strong>
                  <span>Bulk batch orders move through our dedicated dispatch line.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Card */}
          <div className="b2b-sidebar-card">
            <h3>
              <Clock size={16} style={{ color: '#0e0e0f' }} />
              <span>How Approval Works</span>
            </h3>

            <div className="b2b-timeline">
              <div className="b2b-timeline-step active">
                <div className="b2b-timeline-dot">1</div>
                <div className="b2b-timeline-content">
                  <strong>Submit Application</strong>
                  <span>Provide business entity and GSTIN details.</span>
                </div>
              </div>

              <div className="b2b-timeline-step">
                <div className="b2b-timeline-dot">2</div>
                <div className="b2b-timeline-content">
                  <strong>Factory Review</strong>
                  <span>Reviewed in CarXen Veda within 24–48 hours.</span>
                </div>
              </div>

              <div className="b2b-timeline-step">
                <div className="b2b-timeline-dot">3</div>
                <div className="b2b-timeline-content">
                  <strong>Wholesale Portal Unlocked</strong>
                  <span>Instant bulk table ordering & tier rates.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Support Box */}
          <div className="b2b-support-box">
            <strong>Need Bulk Assistance?</strong>
            <span>Contact our dealership team directly:</span>
            <div style={{ marginTop: 6, fontWeight: 700, color: '#0e0e0f' }}>
              +91 98765 43210 · b2b@carxen.in
            </div>
          </div>
        </div>

        {/* Right Column: Structured Application Form */}
        <div className="b2b-form-card">
          {/* User Account Strip */}
          <div className="b2b-user-badge-strip">
            <div className="b2b-user-badge-left">
              <div className="b2b-user-avatar">
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="b2b-user-info-text">
                <strong>Signed in as {user.name}</strong>
                <span>{user.email || 'Verified Account'} · Account ID: {user.id ? user.id.slice(0, 12) + '...' : 'Active'}</span>
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '3px 8px', borderRadius: 6 }}>
              ✓ Verified User
            </span>
          </div>

          {errorMessage && (
            <B2BErrorBanner
              message={errorMessage}
              onDismiss={() => setErrorMessage(null)}
            />
          )}

          <form onSubmit={handleSubmit}>
            {/* Section 1: Contact Representative */}
            <div className="b2b-form-section">
              <div className="b2b-section-header">
                <div className="b2b-section-num">1</div>
                <div className="b2b-section-title-wrap">
                  <h3>Contact Representative</h3>
                  <p>Primary point of contact for purchase orders and dispatch coordination.</p>
                </div>
              </div>

              <div className="b2b-field-grid">
                <div className="b2b-field">
                  <label>Representative Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Rajesh Sharma"
                  />
                </div>

                <div className="b2b-field">
                  <label>Business Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. rajesh@apexmotors.in"
                  />
                </div>

                <div className="b2b-field full">
                  <label>Mobile / WhatsApp Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                  />
                  <span className="b2b-field-hint">Used for dispatch tracking updates and order confirmations.</span>
                </div>
              </div>
            </div>

            {/* Section 2: Business & Tax Identification */}
            <div className="b2b-form-section">
              <div className="b2b-section-header">
                <div className="b2b-section-num">2</div>
                <div className="b2b-section-title-wrap">
                  <h3>Business Identification & Tax</h3>
                  <p>Registered dealership, workshop, or retailer entity.</p>
                </div>
              </div>

              <div className="b2b-field-grid">
                <div className="b2b-field">
                  <label>Legal Business Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="e.g. Apex Auto Components Pvt Ltd"
                  />
                </div>

                <div className="b2b-field">
                  <label>
                    <span>Trade / Workshop Name</span>
                    <span className="opt">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.tradeName}
                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                    placeholder="e.g. Apex Car Accessories"
                  />
                </div>

                <div className="b2b-field">
                  <label>
                    <span>GSTIN (GST Number)</span>
                    <span className="opt">(Recommended for ITC)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    placeholder="e.g. 27AAAAA0000A1Z5"
                    style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                  />
                </div>

                <div className="b2b-field">
                  <label>
                    <span>Business PAN</span>
                    <span className="opt">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                    placeholder="e.g. ABCDE1234F"
                    style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                  />
                </div>

                <div className="b2b-field">
                  <label>Business Category</label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                  >
                    <option value="Authorized Dealership">Authorized Dealership</option>
                    <option value="Multi-Brand Workshop">Multi-Brand Workshop / Garage</option>
                    <option value="Aftermarket Retailer / Distributor">Aftermarket Retailer / Distributor</option>
                    <option value="Fleet Operator / Commercial">Fleet Operator / Commercial</option>
                    <option value="Detailing & Custom Studio">Detailing & Custom Studio</option>
                  </select>
                </div>

                <div className="b2b-field">
                  <label>Expected Monthly Order Volume</label>
                  <select
                    value={formData.expectedMonthlyVolume}
                    onChange={(e) => setFormData({ ...formData, expectedMonthlyVolume: e.target.value })}
                  >
                    <option value="Under ₹50k">Under ₹50,000 / month</option>
                    <option value="₹50k–₹2L (Tier 1)">₹50,000 – ₹2,00,000 / month (Tier 1 Standard)</option>
                    <option value="₹2L–₹5L (Tier 2)">₹2,00,000 – ₹5,00,000 / month (Tier 2 High Volume)</option>
                    <option value="Above ₹5L (Enterprise)">Above ₹5,00,000 / month (Enterprise VIP)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Registered Address */}
            <div className="b2b-form-section">
              <div className="b2b-section-header">
                <div className="b2b-section-num">3</div>
                <div className="b2b-section-title-wrap">
                  <h3>Workshop Location & Delivery</h3>
                  <p>Primary commercial address for bulk dispatch and freight delivery.</p>
                </div>
              </div>

              <div className="b2b-field-grid">
                <div className="b2b-field full">
                  <label>Street Address / Workshop Facility</label>
                  <input
                    type="text"
                    value={formData.businessAddress}
                    onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                    placeholder="e.g. Plot 42, Auto Ancillary Zone, MIDC Phase II"
                  />
                </div>

                <div className="b2b-field">
                  <label>City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Pune"
                  />
                </div>

                <div className="b2b-field">
                  <label>State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="e.g. Maharashtra"
                  />
                </div>

                <div className="b2b-field full">
                  <label>PIN Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    placeholder="e.g. 411019"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Notes / Certifications */}
            <div className="b2b-form-section">
              <div className="b2b-section-header">
                <div className="b2b-section-num">4</div>
                <div className="b2b-section-title-wrap">
                  <h3>Special Requirements / Certifications</h3>
                  <p>Optional notes or drive links to GST certification / store photos.</p>
                </div>
              </div>

              <div className="b2b-field full">
                <label>
                  <span>Verification Notes</span>
                  <span className="opt">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Mention OEM affiliations, vehicle brands serviced, or special logistics requirements..."
                />
              </div>
            </div>

            {/* Submit Block */}
            <div className="b2b-submit-block">
              <button type="submit" disabled={submitting} className="b2b-submit-btn">
                {submitting ? (
                  <span>Submitting Wholesale Application...</span>
                ) : (
                  <>
                    <span>Submit Wholesale Application</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
              <p className="b2b-terms-notice">
                By submitting, you confirm you are a registered dealership, garage, or commercial retailer. Reviewed within 24–48 business hours.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

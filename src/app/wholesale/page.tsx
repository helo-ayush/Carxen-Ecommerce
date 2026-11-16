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
  BadgeCheck,
  MessageSquare,
  XCircle,
  RotateCcw,
  Edit3,
  HelpCircle,
  CreditCard,
  UploadCloud,
  Trash2,
  Eye,
  Camera,
  X,
  FileText,
  ShoppingBag,
  Store,
  ChevronRight
} from 'lucide-react';
import './wholesale.css';
import { formatUserFriendlyB2BError } from '@/lib/format-b2b-error';

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const sanitizePan = (val: string) => {
  return val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
};

const sanitizeGstin = (val: string) => {
  return val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
};

const sanitizePhone = (val: string) => {
  let cleaned = val.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = '+' + cleaned.slice(1).replace(/\+/g, '');
    return cleaned.slice(0, 14);
  }
  return cleaned.replace(/\+/g, '').slice(0, 10);
};

const sanitizePincode = (val: string) => {
  return val.replace(/\D/g, '').slice(0, 6);
};

const isValidPhone = (val: string) => {
  const digits = val.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 12 && digits.startsWith('91'));
};

function extractVisitingCard(b2bDocuments: unknown): { url: string; name: string; size?: number } | null {
  if (!b2bDocuments) return null;
  if (typeof b2bDocuments === 'string') {
    if (b2bDocuments.startsWith('data:image/') || b2bDocuments.startsWith('http://') || b2bDocuments.startsWith('https://')) {
      return { url: b2bDocuments, name: 'visiting-card.webp' };
    }
    try {
      return extractVisitingCard(JSON.parse(b2bDocuments));
    } catch {
      return null;
    }
  }
  if (Array.isArray(b2bDocuments)) {
    const cardDoc = b2bDocuments.find((d: any) => d && (d.type === 'visiting_card' || d.category === 'visiting_card' || d.type === 'business_card'));
    if (cardDoc && (cardDoc.url || cardDoc.dataUrl)) {
      return { url: cardDoc.url || cardDoc.dataUrl, name: cardDoc.name || 'visiting-card.webp', size: cardDoc.size };
    }
    const anyImg = b2bDocuments.find((d: any) => d && (d.url || d.dataUrl) && typeof (d.url || d.dataUrl) === 'string' && ((d.url || d.dataUrl).startsWith('data:image/') || (d.url || d.dataUrl).startsWith('http')));
    if (anyImg) {
      return { url: anyImg.url || anyImg.dataUrl, name: anyImg.name || 'visiting-card.webp', size: anyImg.size };
    }
  } else if (typeof b2bDocuments === 'object') {
    const obj = b2bDocuments as any;
    if (obj.url || obj.dataUrl) {
      return { url: obj.url || obj.dataUrl, name: obj.name || 'visiting-card.webp', size: obj.size };
    }
  }
  return null;
}

function compressVisitingCardImage(file: File): Promise<{ url: string; name: string; size: number }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select an image file (JPG, PNG, or WebP).'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image preview.'));
      img.onload = () => {
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ url: e.target?.result as string, name: file.name, size: file.size });
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = canvas.toDataURL('image/webp', 0.85);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        }
        const approximateSize = Math.round((dataUrl.length * 3) / 4);
        resolve({ url: dataUrl, name: file.name, size: approximateSize });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function WholesaleDashboardPage() {
  const router = useRouter();
  const {
    user,
    authLoading,
    b2bProfile,
    isWholesaleApproved,
    isWholesalePending,
    isWholesaleInquiry,
    isWholesaleRejected,
    applyForWholesale,
    wholesaleBasketSkuCount,
    setWorkspaceMode,
    logout,
    showToast,
    refreshCustomerProfile,
    openSupportModal,
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
    expectedMonthlyVolume: b2bProfile?.expectedMonthlyVolume ? b2bProfile.expectedMonthlyVolume.replace(/\s*\(Tier\s*\d+\)/gi, '').trim() : '₹50k–₹2L',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditingApplication, setIsEditingApplication] = useState(false);
  const [hasConfirmedTradeEligibility, setHasConfirmedTradeEligibility] = useState(false);

  // Business / Visiting Card Upload State
  const [visitingCard, setVisitingCard] = useState<{
    url: string;
    name: string;
    size?: number;
  } | null>(null);
  const [cardUploadLoading, setCardUploadLoading] = useState(false);
  const [cardUploadError, setCardUploadError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [previewLightboxOpen, setPreviewLightboxOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (b2bProfile) {
      if (b2bProfile.b2bDocuments) {
        const existingCard = extractVisitingCard(b2bProfile.b2bDocuments);
        if (existingCard) {
          setVisitingCard((prev) => prev || existingCard);
        }
      }
      setFormData((prev) => ({
        ...prev,
        businessName: b2bProfile.businessName || prev.businessName,
        tradeName: b2bProfile.tradeName || prev.tradeName,
        gstin: b2bProfile.gstin || prev.gstin,
        pan: b2bProfile.pan || prev.pan,
        businessType: b2bProfile.businessType || prev.businessType,
        businessAddress: b2bProfile.businessAddress || prev.businessAddress,
        city: b2bProfile.city || prev.city,
        state: b2bProfile.state || prev.state,
        pincode: b2bProfile.pincode || prev.pincode,
        expectedMonthlyVolume: b2bProfile.expectedMonthlyVolume ? b2bProfile.expectedMonthlyVolume.replace(/\s*\(Tier\s*\d+\)/gi, '').trim() : prev.expectedMonthlyVolume,
      }));
    }
  }, [b2bProfile]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?redirect=/wholesale');
    }
  }, [authLoading, router, user]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Legal Name
    if (!formData.businessName.trim()) {
      setErrorMessage('Please enter your registered Legal Business Name.');
      return;
    }

    // 2. Contact Name
    if (!formData.name.trim()) {
      setErrorMessage('Please enter the contact person name.');
      return;
    }

    // 3. Phone validation
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile or WhatsApp number.');
      return;
    }

    // 4. PAN validation (if provided)
    if (formData.pan.trim()) {
      const cleanPan = formData.pan.trim().toUpperCase();
      if (cleanPan.length !== 10) {
        setErrorMessage('PAN number must be exactly 10 alphanumeric characters (e.g. ABCDE1234F).');
        return;
      }
      if (!PAN_REGEX.test(cleanPan)) {
        setErrorMessage('Invalid PAN format. It must be 5 letters, 4 digits, and 1 letter (e.g. ABCDE1234F).');
        return;
      }
    }

    // 5. GSTIN validation (if provided)
    if (formData.gstin.trim()) {
      const cleanGst = formData.gstin.trim().toUpperCase();
      if (cleanGst.length !== 15) {
        setErrorMessage('GSTIN must be exactly 15 alphanumeric characters (e.g. 07AAAAA0000A1Z5), or leave blank.');
        return;
      }
    }

    // 6. Address & PIN Code
    if (!formData.businessAddress.trim()) {
      setErrorMessage('Please enter your registered business address.');
      return;
    }
    if (!formData.city.trim() || !formData.state.trim()) {
      setErrorMessage('Please enter city and state.');
      return;
    }
    if (!/^\d{6}$/.test(formData.pincode.trim())) {
      setErrorMessage('Postal PIN code must be a 6-digit number (e.g. 110001).');
      return;
    }

    // 7. Compulsory Visiting Card
    if (!visitingCard?.url) {
      setErrorMessage('Please upload a clear photo or copy of your business or visiting card (compulsory).');
      const uploadAnchor = document.getElementById('ws-card-upload-anchor');
      if (uploadAnchor) {
        uploadAnchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmitting(true);
    const result = await applyForWholesale({
      ...formData,
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      pan: formData.pan.trim().toUpperCase(),
      gstin: formData.gstin.trim().toUpperCase(),
      pincode: formData.pincode.trim(),
      b2bDocuments: [
        {
          type: 'visiting_card',
          category: 'visiting_card',
          name: visitingCard.name || 'visiting-card.webp',
          url: visitingCard.url,
          size: visitingCard.size,
          uploadedAt: new Date().toISOString(),
        },
      ],
    });

    setSubmitting(false);
    if (!result.success) {
      setErrorMessage(formatUserFriendlyB2BError(result.error));
    } else {
      setIsEditingApplication(false);
      showToast('Dealership application submitted for CarXen verification.');
    }
  };

  // 1. Auth Gate
  if (!authLoading && !user) return null;

  const isUnderInquiry = isWholesaleInquiry && !isEditingApplication;
  const isDeclined = isWholesaleRejected && !isEditingApplication;

  // 1.5 Pre-Screening Commercial Trade Qualification Gate
  if (
    !isWholesaleApproved &&
    !isWholesalePending &&
    !isUnderInquiry &&
    !isDeclined &&
    !hasConfirmedTradeEligibility &&
    !isEditingApplication
  ) {
    return (
      <div className="ws-page-container">
        <div className="ws-gate-wrapper">
          {/* Header Bar with Commercial Badge and Sign Out */}
          <div className="ws-gate-topbar">
            <div className="ws-gate-badge">
              <ShieldCheck size={13} color="#e2231a" />
              <span>CARXEN COMMERCIAL PARTNER NETWORK</span>
            </div>

            <button
              type="button"
              className="ws-gate-signout-btn"
              onClick={async () => {
                await logout();
                router.push('/login');
              }}
              title="Sign out of account"
            >
              <span>Sign out</span>
            </button>
          </div>

          {/* Main Elevated Glass Card */}
          <div className="ws-gate-card">
            <div className="ws-gate-card-stripe" />

            <div className="ws-gate-header">
              <div className="ws-gate-badge-row">
                <span className="ws-gate-kicker">
                  <span className="ws-gate-kicker-dot" />
                  Commercial Access Gate
                </span>
                <span className="ws-gate-tag">B2B Trade Only</span>
              </div>

              <h1>Authorized Dealership Application</h1>
              <p>
                This commercial procurement portal is strictly reserved for verified automotive retail shops, distributors, detailing studios, and workshop owners.
              </p>
            </div>

            {/* Structured Criteria Checklist */}
            <div className="ws-gate-requirements">
              {/* Req 1: Business Type */}
              <div className="ws-gate-req-item">
                <div className="ws-gate-req-icon-wrap emerald">
                  <Building2 size={18} />
                </div>
                <div className="ws-gate-req-text">
                  <div className="ws-gate-req-header">
                    <strong>Registered Automotive Businesses Only</strong>
                    <span className="ws-req-chip emerald">Verified Trade</span>
                  </div>
                  <p>Open strictly to automotive accessory retailers, multi-brand garages, detailing studios, and spare parts distributors.</p>
                </div>
              </div>

              {/* Req 2: MOQ */}
              <div className="ws-gate-req-item">
                <div className="ws-gate-req-icon-wrap amber">
                  <ShoppingBag size={18} />
                </div>
                <div className="ws-gate-req-text">
                  <div className="ws-gate-req-header">
                    <strong>Commercial Minimum Order Volume (MOQ)</strong>
                    <span className="ws-req-chip amber">Min. ₹25,000 / 10 Cartons</span>
                  </div>
                  <p>Commercial dispatches require a minimum consignment value of ₹25,000 / 10 Master Cartons. Single-piece retail orders are not accepted.</p>
                </div>
              </div>

              {/* Req 3: Documents */}
              <div className="ws-gate-req-item">
                <div className="ws-gate-req-icon-wrap blue">
                  <CreditCard size={18} />
                </div>
                <div className="ws-gate-req-text">
                  <div className="ws-gate-req-header">
                    <strong>Mandatory Business Documentation</strong>
                    <span className="ws-req-chip blue">Active GSTIN + Card</span>
                  </div>
                  <p>Active GSTIN identification and a genuine Visiting / Business Card upload are compulsory for trade underwriting approval.</p>
                </div>
              </div>
            </div>

            {/* Consumer Redirection Callout */}
            <div className="ws-gate-consumer-callout">
              <div className="ws-gate-consumer-left">
                <div className="ws-gate-consumer-icon">
                  <Store size={18} />
                </div>
                <div>
                  <strong>Looking for accessories for your personal car?</strong>
                  <p>Individual consumer purchases are fulfilled with instant free delivery via our standard Retail Store.</p>
                </div>
              </div>
              <button
                type="button"
                className="ws-gate-consumer-pill-btn"
                onClick={() => router.push('/shop')}
              >
                <span>Shop Retail</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Primary Action Button */}
            <div className="ws-gate-actions">
              <button
                type="button"
                className="ws-gate-confirm-btn"
                onClick={() => setHasConfirmedTradeEligibility(true)}
              >
                <div className="ws-gate-btn-left">
                  <CheckCircle2 size={18} className="ws-gate-btn-check" />
                  <span>I am an Automotive Business Owner / Dealer</span>
                </div>
                <span className="ws-gate-btn-arrow">
                  Continue to Application <ArrowRight size={15} />
                </span>
              </button>

              <button
                type="button"
                className="ws-gate-retail-btn"
                onClick={() => router.push('/shop')}
              >
                <span>I am shopping for my personal vehicle — Browse Retail Store</span>
                <ExternalLink size={13} style={{ opacity: 0.6 }} />
              </button>
            </div>

            {/* Discrete Trust Micro-Footer */}
            <div className="ws-gate-footer-trust">
              <div className="ws-gate-trust-item">
                <Lock size={12} />
                <span>256-Bit Encrypted Review</span>
              </div>
              <span className="ws-gate-trust-sep">•</span>
              <div className="ws-gate-trust-item">
                <Clock size={12} />
                <span>&lt; 4-Hour SLA</span>
              </div>
              <span className="ws-gate-trust-sep">•</span>
              <div className="ws-gate-trust-item">
                <FileText size={12} />
                <span>Direct GST Input Invoicing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Application Gate: Unregistered Partner Onboarding or Editing
  if ((!isWholesaleApproved && !isWholesalePending && !isUnderInquiry && !isDeclined) || isEditingApplication) {
    return (
      <div className="ws-page-container">
        <div className="ws-header-bar">
          <div className="ws-header-titles">
            <div className="ws-breadcrumb-kicker">
              <WholesaleIcon name="account" size={14} />
              <span>Dealer Program / Commercial Registration</span>
            </div>
            <h1>
              <WholesaleIcon name="warehouse" size={26} />
              Authorized Dealership Registration
            </h1>
            <p>
              Unlock factory-direct procurement, dealer pricing, and zero-website-payment commercial billing through CarXen.
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

        {isEditingApplication && (
          <div className="ws-editing-alert-banner">
            <div>
              <strong>Updating Dealership Application ({b2bProfile?.referenceNumber || 'Revision'})</strong>
              <p>Make necessary revisions to your trade name, GSTIN, business type, or address and submit to update your desk review.</p>
            </div>
            <button
              type="button"
              className="ws-btn-secondary"
              onClick={() => setIsEditingApplication(false)}
              style={{ fontSize: '12px', padding: '6px 14px', whiteSpace: 'nowrap', cursor: 'pointer' }}
            >
              Cancel Revision
            </button>
          </div>
        )}

        {errorMessage && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px 18px', color: '#991b1b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} />
            <span style={{ fontSize: '13.5px' }}>{errorMessage}</span>
          </div>
        )}

        <div className="ws-apply-layout">
          {/* Form Card */}
          <div className="ws-form-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '19px', fontWeight: 800, margin: '0 0 4px 0', color: '#0f172a' }}>
                  Business Registration Details
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  Enter verified commercial details for CarXen dealership onboarding.
                </p>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', background: '#f1f5f9', color: '#475569' }}>
                Fields with * are mandatory
              </span>
            </div>

            <form onSubmit={handleApply} style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
              {/* Section 1: Business Profile */}
              <div className="ws-form-section-title">
                <Building2 size={15} />
                <span>1. Business Entity Details</span>
              </div>

              <div className="ws-responsive-grid-2">
                <div className="ws-field-group">
                  <div className="ws-field-header">
                    <label className="ws-field-label">
                      Legal Business Name <span className="ws-field-req">*</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    required
                    className="ws-input-text"
                    placeholder="e.g. Apex Auto Accessories LLP"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  />
                </div>

                <div className="ws-field-group">
                  <div className="ws-field-header">
                    <label className="ws-field-label">Trade / Store Front Name</label>
                    <span className="ws-field-subtext">(Optional)</span>
                  </div>
                  <input
                    type="text"
                    className="ws-input-text"
                    placeholder="e.g. Apex Car Studio"
                    value={formData.tradeName}
                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                  />
                </div>
              </div>

              {/* Section 2: Business Type & Expected Volume */}
              <div className="ws-responsive-grid-2">
                <div className="ws-field-group">
                  <div className="ws-field-header">
                    <label className="ws-field-label">
                      Business Type <span className="ws-field-req">*</span>
                    </label>
                  </div>
                  <select
                    className="ws-input-text"
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="Authorized Dealership">Authorized Dealership / Showroom</option>
                    <option value="Car Accessories Retailer">Car Accessories &amp; Audio Retailer</option>
                    <option value="Multi-Brand Workshop">Multi-Brand Workshop / Garage</option>
                    <option value="Auto Parts Wholesaler">Auto Parts Wholesaler / Distributor</option>
                    <option value="Detailing Studio">Car Detailing / PPF Studio</option>
                    <option value="Fleet Operator">Fleet Operator / Commercial Transport</option>
                    <option value="Other Commercial Partner">Other Commercial Automotive Business</option>
                  </select>
                </div>

                <div className="ws-field-group">
                  <div className="ws-field-header">
                    <label className="ws-field-label">
                      Expected Monthly Volume <span className="ws-field-req">*</span>
                    </label>
                  </div>
                  <select
                    className="ws-input-text"
                    value={formData.expectedMonthlyVolume}
                    onChange={(e) => setFormData({ ...formData, expectedMonthlyVolume: e.target.value })}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="₹25k–₹50k">₹25,000 – ₹50,000 / month</option>
                    <option value="₹50k–₹2L">₹50,000 – ₹2,00,000 / month</option>
                    <option value="₹2L–₹5L">₹2,00,000 – ₹5,00,000 / month</option>
                    <option value="₹5L–₹10L">₹5,00,000 – ₹10,00,000 / month</option>
                    <option value="₹10L+">₹10,00,000+ / month (Enterprise)</option>
                  </select>
                </div>
              </div>

              {/* Section 3: Tax Identification */}
              <div className="ws-form-section-title">
                <FileText size={15} />
                <span>2. Tax &amp; Compliance Identifiers</span>
              </div>

              <div className="ws-responsive-grid-2">
                <div className="ws-field-group">
                  <div className="ws-field-header">
                    <label className="ws-field-label">
                      GSTIN Number <span className="ws-field-subtext">(Optional — for Tax Invoice &amp; ITC)</span>
                    </label>
                    {formData.gstin ? (
                      <span style={{ fontSize: '11px', color: formData.gstin.length === 15 ? '#059669' : '#d97706', fontWeight: 600 }}>
                        {formData.gstin.length}/15
                      </span>
                    ) : null}
                  </div>
                  <input
                    type="text"
                    maxLength={15}
                    className="ws-input-text mono"
                    style={{
                      border: formData.gstin && formData.gstin.length > 0 && formData.gstin.length < 15 ? '1px solid #f59e0b' : undefined,
                    }}
                    placeholder="e.g. 07AAAAA0000A1Z5"
                    value={formData.gstin}
                    onChange={(e) => {
                      const clean = sanitizeGstin(e.target.value);
                      const prevGst = formData.gstin;
                      setFormData((prev) => {
                        const next = { ...prev, gstin: clean };
                        if (clean.length >= 12 && /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]/.test(clean)) {
                          const extractedPan = clean.slice(2, 12);
                          if (!prev.pan || prev.pan === prevGst.slice(2, 12)) {
                            next.pan = extractedPan;
                          }
                        }
                        return next;
                      });
                    }}
                  />
                  {formData.gstin.length > 0 && formData.gstin.length < 15 && (
                    <span style={{ display: 'block', fontSize: '11px', color: '#d97706', marginTop: '4px' }}>
                      GSTIN must be 15 alphanumeric characters ({formData.gstin.length}/15)
                    </span>
                  )}
                  {formData.gstin.length === 15 && (
                    <span style={{ display: 'block', fontSize: '11px', color: '#059669', marginTop: '4px' }}>
                      ✓ 15-character GSTIN verified format
                    </span>
                  )}
                </div>

                <div className="ws-field-group">
                  <div className="ws-field-header">
                    <label className="ws-field-label">
                      PAN Number <span className="ws-field-subtext">(Optional)</span>
                    </label>
                    {formData.pan ? (
                      <span style={{ fontSize: '11px', color: formData.pan.length === 10 && PAN_REGEX.test(formData.pan) ? '#059669' : '#d97706', fontWeight: 600 }}>
                        {formData.pan.length}/10
                      </span>
                    ) : null}
                  </div>
                  <input
                    type="text"
                    maxLength={10}
                    className="ws-input-text mono"
                    style={{
                      border: formData.pan && formData.pan.length > 0 && (formData.pan.length < 10 || !PAN_REGEX.test(formData.pan)) ? '1px solid #f59e0b' : undefined,
                    }}
                    placeholder="ABCDE1234F"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: sanitizePan(e.target.value) })}
                  />
                  {formData.pan.length > 0 && formData.pan.length < 10 && (
                    <span style={{ display: 'block', fontSize: '11px', color: '#d97706', marginTop: '4px' }}>
                      PAN must be 10 characters ({formData.pan.length}/10)
                    </span>
                  )}
                  {formData.pan.length === 10 && !PAN_REGEX.test(formData.pan) && (
                    <span style={{ display: 'block', fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>
                      Format: 5 letters, 4 numbers, 1 letter (e.g. ABCDE1234F)
                    </span>
                  )}
                  {formData.pan.length === 10 && PAN_REGEX.test(formData.pan) && (
                    <span style={{ display: 'block', fontSize: '11px', color: '#059669', marginTop: '4px' }}>
                      ✓ Valid PAN format
                    </span>
                  )}
                </div>
              </div>

              {/* Section 4: Authorized Contact */}
              <div className="ws-form-section-title">
                <WholesaleIcon name="account" size={15} />
                <span>3. Authorized Representative Contact</span>
              </div>

              <div className="ws-responsive-grid-2">
                <div className="ws-field-group">
                  <div className="ws-field-header">
                    <label className="ws-field-label">
                      Contact Person Full Name <span className="ws-field-req">*</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    required
                    className="ws-input-text"
                    placeholder="e.g. Ramesh Kumar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="ws-field-group">
                  <div className="ws-field-header">
                    <label className="ws-field-label">
                      Business Phone / WhatsApp <span className="ws-field-req">*</span>
                    </label>
                    {formData.phone ? (
                      <span style={{ fontSize: '11px', color: isValidPhone(formData.phone) ? '#059669' : '#d97706', fontWeight: 600 }}>
                        {formData.phone.replace(/\D/g, '').length} digits
                      </span>
                    ) : null}
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={14}
                    className="ws-input-text"
                    style={{
                      border: formData.phone && !isValidPhone(formData.phone) ? '1px solid #f59e0b' : undefined,
                    }}
                    placeholder="+91 9876543210 or 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: sanitizePhone(e.target.value) })}
                  />
                  {formData.phone && !isValidPhone(formData.phone) && (
                    <span style={{ display: 'block', fontSize: '11px', color: '#d97706', marginTop: '4px' }}>
                      Please enter a valid 10-digit mobile number
                    </span>
                  )}
                  {formData.phone && isValidPhone(formData.phone) && (
                    <span style={{ display: 'block', fontSize: '11px', color: '#059669', marginTop: '4px' }}>
                      ✓ Valid mobile number
                    </span>
                  )}
                </div>
              </div>

              {/* Section 5: Workshop / Registered Location */}
              <div className="ws-form-section-title">
                <WholesaleIcon name="warehouse" size={15} />
                <span>4. Commercial Workshop / Delivery Address</span>
              </div>

              <div className="ws-field-group">
                <div className="ws-field-header">
                  <label className="ws-field-label">
                    Registered Business Address <span className="ws-field-req">*</span>
                  </label>
                </div>
                <input
                  type="text"
                  required
                  className="ws-input-text"
                  placeholder="Plot/Shop No., Street, Industrial Area, Landmark"
                  value={formData.businessAddress}
                  onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                />
              </div>

              <div className="ws-responsive-grid-3">
                <div className="ws-field-group">
                  <div className="ws-field-header">
                    <label className="ws-field-label">
                      City <span className="ws-field-req">*</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    required
                    className="ws-input-text"
                    placeholder="e.g. New Delhi"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>

                <div className="ws-field-group">
                  <div className="ws-field-header">
                    <label className="ws-field-label">
                      State <span className="ws-field-req">*</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    required
                    className="ws-input-text"
                    placeholder="e.g. Delhi"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>

                <div className="ws-field-group">
                  <div className="ws-field-header">
                    <label className="ws-field-label">
                      PIN Code <span className="ws-field-req">*</span>
                    </label>
                    {formData.pincode ? (
                      <span style={{ fontSize: '11px', color: formData.pincode.length === 6 ? '#059669' : '#d97706', fontWeight: 600 }}>
                        {formData.pincode.length}/6
                      </span>
                    ) : null}
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    className="ws-input-text mono"
                    style={{
                      border: formData.pincode && formData.pincode.length < 6 ? '1px solid #f59e0b' : undefined,
                    }}
                    placeholder="110001"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: sanitizePincode(e.target.value) })}
                  />
                  {formData.pincode && formData.pincode.length < 6 && (
                    <span style={{ display: 'block', fontSize: '11px', color: '#d97706', marginTop: '4px' }}>
                      6-digit postal code required
                    </span>
                  )}
                  {formData.pincode && formData.pincode.length === 6 && (
                    <span style={{ display: 'block', fontSize: '11px', color: '#059669', marginTop: '4px' }}>
                      ✓ Valid PIN code
                    </span>
                  )}
                </div>
              </div>

              {/* Section 6: Business / Visiting Card Upload (COMPULSORY) */}
              <div id="ws-card-upload-anchor" className="ws-form-section-title" style={{ marginTop: '26px' }}>
                <CreditCard size={15} color="#e2231a" />
                <span style={{ color: '#0f172a' }}>5. Business / Visiting Card Document</span>
                <span style={{ marginLeft: 'auto', fontSize: '10.5px', background: '#fee2e2', color: '#dc2626', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                  Compulsory *
                </span>
              </div>

              <div style={{ marginBottom: '22px' }}>
                {/* Hidden File Input with camera / gallery picker */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      setCardUploadLoading(true);
                      setCardUploadError(null);
                      compressVisitingCardImage(file)
                        .then((res) => {
                          setVisitingCard(res);
                          setErrorMessage(null);
                        })
                        .catch((err) => {
                          setCardUploadError(err.message || 'Failed to process card image');
                        })
                        .finally(() => {
                          setCardUploadLoading(false);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        });
                    }
                  }}
                />

                {!visitingCard ? (
                  <div
                    className={`ws-card-upload-container ${isDraggingOver ? 'drag-over' : ''} ${errorMessage && !visitingCard ? 'has-error' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingOver(true);
                    }}
                    onDragLeave={() => setIsDraggingOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        const file = e.dataTransfer.files[0];
                        setCardUploadLoading(true);
                        setCardUploadError(null);
                        compressVisitingCardImage(file)
                          .then((res) => {
                            setVisitingCard(res);
                            setErrorMessage(null);
                          })
                          .catch((err) => {
                            setCardUploadError(err.message || 'Failed to process card image');
                          })
                          .finally(() => {
                            setCardUploadLoading(false);
                          });
                      }
                    }}
                  >
                    <div className="ws-card-upload-inner">
                      <div className="ws-card-upload-icon">
                        {cardUploadLoading ? (
                          <div style={{ width: '22px', height: '22px', border: '2px solid #cbd5e1', borderTopColor: '#0f172a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        ) : (
                          <UploadCloud size={26} color="#0f172a" />
                        )}
                      </div>
                      <div>
                        <p className="ws-card-upload-title">
                          {cardUploadLoading ? 'Optimizing & Compressing Card Photo…' : 'Upload Business / Visiting Card'}
                        </p>
                        <p className="ws-card-upload-desc">
                          Tap to take a photo with your mobile camera or browse from gallery/files. Clear photo of your business visiting card or workshop sign board is required for desk verification.
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="ws-btn-secondary"
                          style={{ pointerEvents: 'none', fontSize: '12.5px', padding: '6px 14px' }}
                        >
                          <Camera size={14} />
                          <span>Select Card Photo (JPG, PNG, WebP)</span>
                        </button>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Max 10MB · Auto-compressed</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="ws-card-preview-card">
                    {/* Thumbnail with Zoom overlay */}
                    <div
                      className="ws-card-thumb-wrap"
                      onClick={() => setPreviewLightboxOpen(true)}
                      title="Click to zoom visiting card"
                    >
                      <img src={visitingCard.url} alt="Business visiting card" />
                      <div className="ws-card-thumb-zoom-badge">
                        <Eye size={14} />
                        <span>Zoom</span>
                      </div>
                    </div>

                    {/* File Details */}
                    <div className="ws-card-preview-details">
                      <div className="ws-card-preview-badges">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                          <CheckCircle2 size={12} /> Card Attached
                        </span>
                        {visitingCard.size ? (
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                            ~{Math.round(visitingCard.size / 1024)} KB
                          </span>
                        ) : null}
                      </div>

                      <h4 className="ws-card-preview-name" title={visitingCard.name}>
                        {visitingCard.name || 'visiting-card.webp'}
                      </h4>
                      <p className="ws-card-preview-size">
                        Ready for CarXen desk review. Tap thumbnail or &ldquo;View Full Card&rdquo; to preview details.
                      </p>

                      <div className="ws-card-preview-actions" style={{ marginTop: '10px' }}>
                        <button
                          type="button"
                          className="ws-btn-secondary"
                          onClick={() => setPreviewLightboxOpen(true)}
                          style={{ fontSize: '12px', padding: '5px 12px', minHeight: '32px' }}
                        >
                          <Eye size={13} />
                          <span>View Full Card</span>
                        </button>

                        <button
                          type="button"
                          className="ws-btn-secondary"
                          onClick={() => fileInputRef.current?.click()}
                          style={{ fontSize: '12px', padding: '5px 12px', minHeight: '32px' }}
                        >
                          <Camera size={13} />
                          <span>Replace</span>
                        </button>

                        <button
                          type="button"
                          className="ws-btn-secondary"
                          onClick={() => setVisitingCard(null)}
                          style={{ fontSize: '12px', padding: '5px 12px', minHeight: '32px', color: '#dc2626', borderColor: '#fecaca' }}
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {cardUploadError && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={14} />
                    <span>{cardUploadError}</span>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div style={{ marginTop: '28px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="ws-btn-primary ws-btn-brand"
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    minHeight: '46px',
                    height: 'auto',
                    padding: '10px 16px',
                    fontSize: '14px',
                    fontWeight: 700,
                    whiteSpace: 'normal',
                    boxSizing: 'border-box',
                    textAlign: 'center',
                    lineHeight: 1.35,
                  }}
                >
                  <Send size={17} style={{ flexShrink: 0 }} />
                  <span>{submitting ? 'Verifying & Submitting Application…' : 'Submit Dealership Application'}</span>
                </button>
                <p style={{ textAlign: 'center', fontSize: '11.5px', color: '#64748b', marginTop: '10px', marginBottom: 0 }}>
                  By submitting, you confirm that the entered trade details and visiting card are authentic representations of your automotive business.
                </p>
              </div>
            </form>
          </div>

          {/* Right Trust Column */}
          <div className="ws-checkout-card">
            <h3>Authorized Dealer Privileges</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ color: '#059669', flexShrink: 0, marginTop: '2px' }}>
                  <WholesaleIcon name="shield" size={20} />
                </div>
                <div>
                  <strong style={{ fontSize: '13.5px', display: 'block', color: '#0f172a' }}>Instant Checkout &amp; COD</strong>
                  <span style={{ fontSize: '12.5px', color: '#64748b', lineHeight: 1.45 }}>
                    Seamless checkout with Razorpay online payment (UPI, cards, NetBanking) and Cash on Delivery at your warehouse.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ color: '#059669', flexShrink: 0, marginTop: '2px' }}>
                  <WholesaleIcon name="tier" size={20} />
                </div>
                <div>
                  <strong style={{ fontSize: '13.5px', display: 'block', color: '#0f172a' }}>Dealer Pricing</strong>
                  <span style={{ fontSize: '12.5px', color: '#64748b', lineHeight: 1.45 }}>
                    Direct dealer bulk rates applied across all catalogue SKUs once approved.
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

        {/* Visiting Card Lightbox Modal */}
        {previewLightboxOpen && visitingCard && (
          <div className="ws-card-lightbox-overlay" onClick={() => setPreviewLightboxOpen(false)}>
            <div className="ws-card-lightbox-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ws-card-lightbox-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={18} color="#e2231a" />
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                    Business / Visiting Card Preview
                  </strong>
                </div>
                <button
                  type="button"
                  className="ws-btn-ghost"
                  onClick={() => setPreviewLightboxOpen(false)}
                  style={{ padding: '4px 8px' }}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="ws-card-lightbox-body">
                <img src={visitingCard.url} alt={visitingCard.name || 'Visiting card'} />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Application Gate: Under Review, Inquiry, or Declined
  if (isWholesalePending || isUnderInquiry || isDeclined) {
    const applicantName = b2bProfile?.businessName || user?.name || 'Apex Automotive';
    const applicantGstin = b2bProfile?.gstin || '';
    const refCode = b2bProfile?.referenceNumber || `CX-B2B-${(applicantGstin ? applicantGstin.replace(/[^A-Za-z0-9]/g, '').slice(-4) : (user?.id ? user.id.replace(/[^A-Za-z0-9]/g, '').slice(-4) : '8841')).toUpperCase()}`;
    const inquiryText = b2bProfile?.inquiryMessage || b2bProfile?.rejectionReason || 'Please provide additional trade documentation or confirm your commercial workshop / showroom address to finalize account approval.';
    const declineReason = b2bProfile?.rejectionReason || 'Application did not meet wholesale partner eligibility requirements or trade details could not be validated.';

    return (
      <div className="ws-page-container">
        <div className="ws-review-wrapper">
          {/* Top Header Card with Reference Badge */}
          <div className="ws-review-header-card">
            <div className="ws-review-header-left">
              {isUnderInquiry ? (
                <div className="ws-review-status-pill inquiry">
                  <span className="ws-pulse-dot-inquiry" />
                  <span>Action Required · Commercial Desk Inquired</span>
                </div>
              ) : isDeclined ? (
                <div className="ws-review-status-pill rejected">
                  <span className="ws-pulse-dot-rejected" />
                  <span>Application Declined · Revision or Appeal Required</span>
                </div>
              ) : (
                <div className="ws-review-status-pill">
                  <span className="ws-review-pulse-dot" />
                  <span>Verification In Progress · Commercial Desk Active</span>
                </div>
              )}

              <h1>
                {isUnderInquiry
                  ? 'Dealer Application Under Commercial Inquiry'
                  : isDeclined
                    ? 'Dealership Application Declined by Commercial Desk'
                    : 'Authorized Dealership Application Under Active Review'}
              </h1>
              <p>
                {isUnderInquiry
                  ? `The CarXen commercial underwriting desk has reviewed the application for ${applicantName} and requested additional details before dealership privileges can be activated.`
                  : isDeclined
                    ? `Your dealership application for ${applicantName} could not be approved with the submitted details. You may revise and re-apply or submit an appeal.`
                    : `Your CarXen authorized dealership application for ${applicantName} has been logged in our enterprise registry and assigned to our underwriting desk.`}
              </p>
            </div>
            <div className="ws-review-header-right">
              <div className="ws-ref-badge-card">
                <span className="ws-ref-label">Enterprise Reference</span>
                <span className="ws-ref-code">{refCode}</span>
                <span className="ws-ref-sla">
                  {isUnderInquiry
                    ? 'Action Needed: Respond'
                    : isDeclined
                      ? 'Decision: Declined'
                      : 'Priority SLA: < 4 Hours'}
                </span>
              </div>
            </div>
          </div>

          {/* Attention-Grabbing Hero Alert for Inquiry */}
          {isUnderInquiry && (
            <div className="ws-inquiry-highlight-card">
              <div className="ws-inquiry-header">
                <div className="ws-inquiry-icon-wrap">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h4>Action Required: Clarification Requested by Underwriting Desk</h4>
                  <span className="ws-inquiry-meta">Reference: {refCode} · Awaiting Applicant Response</span>
                </div>
              </div>

              <div className="ws-inquiry-body">
                <p>&ldquo;{inquiryText}&rdquo;</p>
              </div>

              <div className="ws-inquiry-actions">
                <button
                  type="button"
                  className="ws-btn-primary ws-btn-brand"
                  onClick={() => setIsEditingApplication(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <Edit3 size={15} />
                  <span>Update &amp; Resubmit Details</span>
                </button>

                <button
                  type="button"
                  className="ws-btn-secondary"
                  onClick={() => openSupportModal({
                    category: 'Dealer Application Inquiry Response',
                    businessName: applicantName,
                    initialMessage: `Response regarding Inquiry on Application ${refCode} (${applicantName}): `,
                  })}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <MessageSquare size={15} />
                  <span>Reply via Commercial Support Desk</span>
                </button>
              </div>
            </div>
          )}

          {/* Attention-Grabbing Hero Alert for Declined */}
          {isDeclined && (
            <div className="ws-rejected-highlight-card">
              <div className="ws-rejected-header">
                <div className="ws-rejected-icon-wrap">
                  <XCircle size={20} />
                </div>
                <div>
                  <h4>Dealership Application Declined</h4>
                  <span className="ws-rejected-meta">Reference: {refCode} · Underwriting Decision</span>
                </div>
              </div>

              <div className="ws-rejected-body">
                <p>&ldquo;{declineReason}&rdquo;</p>
              </div>

              <div className="ws-rejected-actions">
                <button
                  type="button"
                  className="ws-btn-primary ws-btn-brand"
                  onClick={() => setIsEditingApplication(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <RotateCcw size={15} />
                  <span>Revise Application &amp; Re-apply</span>
                </button>

                <button
                  type="button"
                  className="ws-btn-secondary"
                  onClick={() => openSupportModal({
                    category: 'Dealer Application Appeal',
                    businessName: applicantName,
                    initialMessage: `Requesting review / appeal for declined Application ${refCode} (${applicantName}). Reason given: "${declineReason}".`,
                  })}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <HelpCircle size={15} />
                  <span>Appeal Decision / Contact Commercial Desk</span>
                </button>
              </div>
            </div>
          )}

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

              {/* Step 2: Dynamic State */}
              {isUnderInquiry ? (
                <div className="ws-review-step active" style={{ borderColor: '#7dd3fc', background: '#f0f9ff' }}>
                  <div className="ws-step-top">
                    <div className="ws-review-step-icon" style={{ background: '#0284c7', color: '#fff' }}>
                      <MessageSquare size={16} />
                    </div>
                    <span className="ws-step-status-tag" style={{ background: 'rgba(2, 132, 199, 0.15)', color: '#0284c7', borderColor: 'rgba(56, 189, 248, 0.4)' }}>
                      02 · Clarification Needed
                    </span>
                  </div>
                  <div className="ws-review-step-content">
                    <h4>Commercial Inquiry</h4>
                    <p>Desk requested additional documentation or clarification before approval.</p>
                  </div>
                </div>
              ) : isDeclined ? (
                <div className="ws-review-step active" style={{ borderColor: '#fecdd3', background: '#fff1f2' }}>
                  <div className="ws-step-top">
                    <div className="ws-review-step-icon" style={{ background: '#e11d48', color: '#fff' }}>
                      <XCircle size={16} />
                    </div>
                    <span className="ws-step-status-tag" style={{ background: 'rgba(225, 29, 72, 0.12)', color: '#e11d48', borderColor: 'rgba(253, 164, 175, 0.5)' }}>
                      02 · Declined
                    </span>
                  </div>
                  <div className="ws-review-step-content">
                    <h4>Application Declined</h4>
                    <p>Underwriting criteria not met. Revise your application or file an appeal.</p>
                  </div>
                </div>
              ) : (
                <div className="ws-review-step active">
                  <div className="ws-step-top">
                    <div className="ws-review-step-icon">
                      <span className="ws-step-inner-ping" />
                    </div>
                    <span className="ws-step-status-tag underway">02 · In Review</span>
                  </div>
                  <div className="ws-review-step-content">
                    <h4>{applicantGstin ? 'GSTIN & Identity Check' : 'Business Identity Check'}</h4>
                    <p>{applicantGstin ? 'Verifying tax compliance, ITC eligibility & business jurisdiction.' : 'Verifying trade identity & business jurisdiction.'}</p>
                  </div>
                </div>
              )}

              {/* Step 3: Next */}
              <div className="ws-review-step pending">
                <div className="ws-step-top">
                  <div className="ws-review-step-icon">
                    <Lock size={14} />
                  </div>
                  <span className="ws-step-status-tag queued">03 · Queued</span>
                </div>
                <div className="ws-review-step-content">
                  <h4>Commercial Access Setup</h4>
                  <p>Configuring direct dealer procurement and commercial catalogue access.</p>
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
                  <p>Quick Order Matrix, volume quotes &amp; instant online checkout.</p>
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
                    <h3>Dealer Application Dossier</h3>
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
                      {applicantGstin ? (
                        <>
                          <code>{applicantGstin}</code>
                          <span className="ws-gstin-valid-badge">
                            <Check size={11} strokeWidth={3} />
                            Format Verified
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: '12.5px', color: '#64748b' }}>Unregistered / Sole Proprietor</span>
                      )}
                    </div>
                  </div>

                  <div className="ws-data-tile">
                    <span className="ws-data-tile-label">Authorized Signatory</span>
                    <strong className="ws-data-tile-value">{user?.name || 'Signatory on file'}</strong>
                  </div>

                  <div className="ws-data-tile">
                    <span className="ws-data-tile-label">Assigned Desk</span>
                    <span className="ws-data-tile-value">Commercial Ops — Kashmere Gate Hub, Delhi</span>
                  </div>

                  <div className="ws-data-tile">
                    <span className="ws-data-tile-label">Turnaround Target</span>
                    <span className="ws-turnaround-pill">Same-Day Review (&lt; 4h)</span>
                  </div>

                  <div className="ws-data-tile">
                    <span className="ws-data-tile-label">Dealer Access</span>
                    <span className="ws-data-tile-value">
                      {isUnderInquiry ? (
                        <span style={{ color: '#0284c7', fontWeight: 600 }}>Clarification Required</span>
                      ) : isDeclined ? (
                        <span style={{ color: '#e11d48', fontWeight: 600 }}>Declined (Revision Allowed)</span>
                      ) : (
                        'Full Catalogue Access (Pending)'
                      )}
                    </span>
                  </div>

                  {/* Business / Visiting Card Dossier Tile */}
                  {(() => {
                    const dossierCard = extractVisitingCard(b2bProfile?.b2bDocuments) || visitingCard;
                    return (
                      <div className="ws-data-tile" style={{ gridColumn: 'span 2' }}>
                        <span className="ws-data-tile-label">Verified Business / Visiting Card</span>
                        {dossierCard ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <img
                                src={dossierCard.url}
                                alt="Visiting card"
                                style={{ width: '56px', height: '36px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', background: '#0f172a' }}
                                onClick={() => {
                                  setVisitingCard(dossierCard);
                                  setPreviewLightboxOpen(true);
                                }}
                              />
                              <div>
                                <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#059669' }}>
                                  ✓ Business Card on File
                                </span>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                  {dossierCard.name || 'visiting-card.webp'}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="ws-btn-secondary"
                              style={{ fontSize: '11.5px', padding: '4px 12px', minHeight: '30px' }}
                              onClick={() => {
                                setVisitingCard(dossierCard);
                                setPreviewLightboxOpen(true);
                              }}
                            >
                              <Eye size={13} />
                              <span>View Card</span>
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                            No card attached
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="ws-dossier-footer-note">
                <ShieldCheck size={16} className="ws-footer-note-icon" />
                <p>
                  <strong>Automated Live Transition:</strong> When approved, your account instantly elevates to <em>Verified Dealer Partner</em> with no re-login required.
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
                    <p className="ws-perks-subtext">Dealer benefits activated immediately upon approval</p>
                  </div>
                </div>

                <div className="ws-perks-list">
                  <div className="ws-perk-item">
                    <div className="ws-perk-bullet">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <strong>Direct Dealer Pricing</strong>
                      <span>Guaranteed commercial pricing on 7D mats, custom seat covers & wraps.</span>
                    </div>
                  </div>

                  <div className="ws-perk-item">
                    <div className="ws-perk-bullet">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <strong>Online Payment &amp; COD Checkout</strong>
                      <span>Checkout seamlessly online via Razorpay (UPI/Cards) or Cash on Delivery for all dealer commercial orders.</span>
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

              {/* Card 2: Commercial Desk Support Assistance */}
              <div className="ws-review-fasttrack-card">
                <div className="ws-fasttrack-body">
                  <div className="ws-fasttrack-icon">
                    <WholesaleIcon name="invoice" size={18} />
                  </div>
                  <div className="ws-fasttrack-text">
                    <strong>Need Urgent Stock for Showroom?</strong>
                    <p>Have an urgent opening or fleet order? Contact our commercial support desk for expedited verification.</p>
                  </div>
                </div>

                <div className="ws-fasttrack-action-row">
                  <button
                    type="button"
                    onClick={() => openSupportModal({
                      category: 'Dealer Verification & Fast-Track Approval',
                      businessName: applicantName,
                      initialMessage: `Requesting expedited verification for applicant ${applicantName} (GSTIN: ${applicantGstin || 'Pending'}). Urgent showroom order pending review.`,
                    })}
                    className="ws-fasttrack-wa-btn"
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    <span>Contact Commercial Support Desk</span>
                    <ExternalLink size={13} />
                  </button>
                  <span className="ws-desk-hours-note">Queries route directly to CARXEN Support Desk</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Visiting Card Lightbox Modal */}
        {previewLightboxOpen && visitingCard && (
          <div className="ws-card-lightbox-overlay" onClick={() => setPreviewLightboxOpen(false)}>
            <div className="ws-card-lightbox-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ws-card-lightbox-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={18} color="#e2231a" />
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                    Business / Visiting Card Preview
                  </strong>
                </div>
                <button
                  type="button"
                  className="ws-btn-ghost"
                  onClick={() => setPreviewLightboxOpen(false)}
                  style={{ padding: '4px 8px' }}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="ws-card-lightbox-body">
                <img src={visitingCard.url} alt={visitingCard.name || 'Visiting card'} />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 4. APPROVED WHOLESALER WORKSPACE DASHBOARD
  const businessName = b2bProfile?.businessName || user?.name || 'Verified Wholesale Partner';
  const tierName = 'Verified Wholesale Partner';

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
      description: 'Manage legal entity, GSTIN registration, delivery warehouse address, and account settings.',
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
                <span style={{ color: '#64748b' }}>Account Privilege:</span>
                <strong style={{ color: '#0f172a' }}>{tierName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Online Payment:</span>
                <strong style={{ color: '#059669' }}>Not Required</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>GSTIN (ITC):</span>
                <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{b2bProfile?.gstin || 'Unregistered / Not Provided'}</strong>
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

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export default function B2BWholesalePage() {
  const router = useRouter();
  const {
    user,
    b2bProfile,
    isWholesaleApproved,
    isWholesalePending,
    applyForWholesale,
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
    businessType: b2bProfile?.businessType || 'Dealership / Multi-Brand Workshop',
    businessAddress: b2bProfile?.businessAddress || '',
    city: b2bProfile?.city || '',
    state: b2bProfile?.state || '',
    pincode: b2bProfile?.pincode || '',
    expectedMonthlyVolume: b2bProfile?.expectedMonthlyVolume || '₹50k–₹2L',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);

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

    if (!formData.name.trim() || !formData.businessName.trim()) {
      setErrorMessage('Applicant Name and Legal Business Name are required.');
      return;
    }

    if (!formData.email.trim() && !formData.phone.trim()) {
      setErrorMessage('Please provide either an email or phone number for verification.');
      return;
    }

    setSubmitting(true);
    const res = await applyForWholesale(formData);
    setSubmitting(false);

    if (res.success) {
      setJustSubmitted(true);
      void refreshCustomerProfile();
    } else {
      setErrorMessage(res.error || 'Failed to submit application. Please try again.');
    }
  };

  // 1. APPROVED WHOLESALER VIEW
  if (isWholesaleApproved) {
    return (
      <div className="b2b-page-container">
        <div className="b2b-hero-banner approved">
          <div className="b2b-badge active">
            <span className="dot pulse" />
            <span>WHOLESALE PARTNER · ACTIVE ({b2bProfile?.wholesaleTier === 'tier2' ? 'TIER 2' : 'TIER 1'})</span>
          </div>
          <h1>Welcome, {b2bProfile?.businessName || user?.name || 'Wholesale Partner'}</h1>
          <p className="b2b-hero-sub">
            Your B2B Wholesale account is approved. You have full access to SKU wholesale pricing,
            minimum order quantity (MOQ) rules, and fast bulk ordering.
          </p>

          <div className="b2b-action-row">
            <Link href="/b2b/quick-order" className="b2b-btn primary">
              Open Quick Order Sheet &rarr;
            </Link>
            <Link href="/shop" className="b2b-btn secondary">
              Browse Storefront with B2B Prices
            </Link>
          </div>

          <div className="b2b-account-summary-card">
            <div className="b2b-summary-item">
              <span className="lbl">Legal Business</span>
              <span className="val">{b2bProfile?.businessName || '—'}</span>
            </div>
            <div className="b2b-summary-item">
              <span className="lbl">GSTIN</span>
              <span className="val font-mono">{b2bProfile?.gstin || '—'}</span>
            </div>
            <div className="b2b-summary-item">
              <span className="lbl">Assigned Tier</span>
              <span className="val">{b2bProfile?.wholesaleTier === 'tier2' ? 'Tier 2 (High Volume)' : 'Tier 1 (Standard)'}</span>
            </div>
            <div className="b2b-summary-item">
              <span className="lbl">Tax Invoicing</span>
              <span className="val text-success">GST ITC Eligible</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. PENDING REVIEW VIEW
  if (isWholesalePending || justSubmitted) {
    return (
      <div className="b2b-page-container">
        <div className="b2b-hero-banner pending">
          <div className="b2b-badge pending">
            <span className="dot pulse-amber" />
            <span>APPLICATION UNDER REVIEW</span>
          </div>
          <h1>Wholesale Application Received</h1>
          <p className="b2b-hero-sub">
            Thank you for applying. Your application for <strong>{b2bProfile?.businessName || formData.businessName || 'your dealership'}</strong> has been submitted to the CarXen Veda Owner Review Table.
          </p>

          <div className="b2b-pending-steps">
            <div className="step done">
              <div className="step-num">1</div>
              <div className="step-text">
                <strong>Application Submitted</strong>
                <span>Details & GSTIN recorded</span>
              </div>
            </div>
            <div className="step active">
              <div className="step-num">2</div>
              <div className="step-text">
                <strong>Owner Review in Carxen Veda</strong>
                <span>Verification of business & GSTIN</span>
              </div>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <div className="step-text">
                <strong>Wholesale Mode Unlocked</strong>
                <span>Direct wholesale prices & bulk order sheet</span>
              </div>
            </div>
          </div>

          <div className="b2b-action-row">
            <Link href="/shop" className="b2b-btn secondary">
              Browse Storefront (Retail Mode)
            </Link>
            <Link href="/account" className="b2b-btn ghost">
              View Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. INQUIRY / INFORMATION REQUESTED VIEW
  if (b2bProfile?.status === 'INQUIRY') {
    return (
      <div className="b2b-page-container">
        <div className="b2b-hero-banner inquiry">
          <div className="b2b-badge inquiry">
            <span className="dot pulse-sky" />
            <span>INFORMATION REQUESTED BY VEDA FACTORY</span>
          </div>
          <h1>Action Required: Additional Verification Details Needed</h1>
          <p className="b2b-hero-sub">
            The CarXen Veda review team has reviewed your application for <strong>{b2bProfile?.businessName || formData.businessName || 'your business'}</strong> and requested clarification:
          </p>

          <div className="b2b-inquiry-box">
            <div className="b2b-inquiry-header">
              <span className="icon">💬</span>
              <strong>Inquiry Request from Veda:</strong>
            </div>
            <p className="b2b-inquiry-text">
              {b2bProfile.inquiryMessage || b2bProfile.rejectionReason || 'Please provide GST certificate copy, valid trade license, or clarify monthly order volume.'}
            </p>
          </div>

          <p className="b2b-rejection-help">
            Update your business details or add clarifying notes in the form below and click <strong>Submit Response & Re-verify</strong>.
          </p>
        </div>

        {/* Application Form pre-filled for easy update */}
        <div className="b2b-form-card">
          <div className="b2b-form-header">
            <h2>Respond to Inquiry & Update Details</h2>
            <p>Modify any details requested by the factory review team to expedite approval.</p>
          </div>

          {errorMessage && (
            <div className="b2b-error-banner">
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="b2b-form">
            {/* Section 1: Contact Details */}
            <div className="b2b-form-section">
              <h3 className="b2b-section-title">1. Contact Representative</h3>
              <div className="b2b-field-grid">
                <div className="b2b-field">
                  <label>Contact Person Name *</label>
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
                <div className="b2b-field">
                  <label>Mobile / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Business & Legal Details */}
            <div className="b2b-form-section">
              <h3 className="b2b-section-title">2. Business Legal Entity</h3>
              <div className="b2b-field-grid">
                <div className="b2b-field">
                  <label>Legal Business Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="e.g. Apex Auto Spares LLP"
                  />
                </div>
                <div className="b2b-field">
                  <label>Trade Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.tradeName}
                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                    placeholder="e.g. Apex Performance Garage"
                  />
                </div>
                <div className="b2b-field">
                  <label>GSTIN (Goods & Service Tax Number)</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    placeholder="22AAAAA0000A1Z5"
                    maxLength={15}
                  />
                </div>
                <div className="b2b-field">
                  <label>PAN Number</label>
                  <input
                    type="text"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                </div>
                <div className="b2b-field">
                  <label>Business Type</label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                  >
                    <option value="Dealership / Multi-Brand Workshop">Dealership / Multi-Brand Workshop</option>
                    <option value="Auto Accessories Retailer">Auto Accessories Retailer</option>
                    <option value="Fleet Operator / Commercial">Fleet Operator / Commercial</option>
                    <option value="Independent Garage / Detailer">Independent Garage / Detailer</option>
                    <option value="Ecommerce Reseller">Ecommerce Reseller</option>
                  </select>
                </div>
                <div className="b2b-field">
                  <label>Expected Monthly Order Volume</label>
                  <select
                    value={formData.expectedMonthlyVolume}
                    onChange={(e) => setFormData({ ...formData, expectedMonthlyVolume: e.target.value })}
                  >
                    <option value="Under ₹50k">Under ₹50,000 / mo</option>
                    <option value="₹50k–₹2L">₹50,000 – ₹2,00,000 / mo (Standard Tier 1)</option>
                    <option value="₹2L–₹5L">₹2,00,000 – ₹5,00,000 / mo (High Volume Tier 2)</option>
                    <option value="Above ₹5L">Above ₹5,00,000 / mo (Enterprise VIP)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Registered Address */}
            <div className="b2b-form-section">
              <h3 className="b2b-section-title">3. Business Address & Logistics</h3>
              <div className="b2b-field-grid">
                <div className="b2b-field full-width">
                  <label>Street Address / Workshop Location</label>
                  <input
                    type="text"
                    value={formData.businessAddress}
                    onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                    placeholder="e.g. Plot 42, Auto Ancillary Zone, MIDC"
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
                <div className="b2b-field">
                  <label>PIN Code</label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    placeholder="e.g. 411019"
                    maxLength={6}
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Notes / Documents */}
            <div className="b2b-form-section">
              <h3 className="b2b-section-title">4. Response to Inquiry & Documents</h3>
              <div className="b2b-field full-width">
                <label>Clarification / Document Link / Additional Details *</label>
                <textarea
                  rows={3}
                  required
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Provide clarification, drive link to GST cert / electricity bill, or details requested above..."
                />
              </div>
            </div>

            <div className="b2b-submit-row">
              <button type="submit" disabled={submitting} className="b2b-submit-btn">
                {submitting ? 'Submitting Response...' : 'Submit Inquiry Response & Re-verify'}
              </button>
              <p className="b2b-terms-notice">
                Your response will update your application record in CarXen Veda for prompt review.
              </p>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 4. DECLINED VIEW (WITH OPTION TO RE-APPLY)
  if (b2bProfile?.status === 'REJECTED') {
    return (
      <div className="b2b-page-container">
        <div className="b2b-hero-banner rejected">
          <div className="b2b-badge rejected">
            <span>APPLICATION DECLINED</span>
          </div>
          <h1>Application Update Needed</h1>
          <p className="b2b-hero-sub">
            The factory review team could not approve the application at this time:
          </p>
          {b2bProfile.rejectionReason && (
            <div className="b2b-rejection-box">
              <strong>Decline Reason:</strong> {b2bProfile.rejectionReason}
            </div>
          )}
          <p className="b2b-rejection-help">
            You may revise your business or tax information in the form below and resubmit for verification.
          </p>
        </div>

        {/* Application Form pre-filled for revision */}
        <div className="b2b-form-card">
          <div className="b2b-form-header">
            <h2>Revise & Resubmit Application</h2>
            <p>Update any incorrect details or provide supplementary verification documents.</p>
          </div>

          {errorMessage && (
            <div className="b2b-error-banner">
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="b2b-form">
            <div className="b2b-form-section">
              <h3 className="b2b-section-title">1. Contact Representative</h3>
              <div className="b2b-field-grid">
                <div className="b2b-field">
                  <label>Contact Person Name *</label>
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
                <div className="b2b-field">
                  <label>Mobile / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>
              </div>
            </div>

            <div className="b2b-form-section">
              <h3 className="b2b-section-title">2. Business Legal Entity</h3>
              <div className="b2b-field-grid">
                <div className="b2b-field">
                  <label>Legal Business Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="e.g. Apex Auto Spares LLP"
                  />
                </div>
                <div className="b2b-field">
                  <label>Trade Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.tradeName}
                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                    placeholder="e.g. Apex Performance Garage"
                  />
                </div>
                <div className="b2b-field">
                  <label>GSTIN (Goods & Service Tax Number)</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    placeholder="22AAAAA0000A1Z5"
                    maxLength={15}
                  />
                </div>
                <div className="b2b-field">
                  <label>PAN Number</label>
                  <input
                    type="text"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                </div>
                <div className="b2b-field">
                  <label>Business Type</label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                  >
                    <option value="Dealership / Multi-Brand Workshop">Dealership / Multi-Brand Workshop</option>
                    <option value="Auto Accessories Retailer">Auto Accessories Retailer</option>
                    <option value="Fleet Operator / Commercial">Fleet Operator / Commercial</option>
                    <option value="Independent Garage / Detailer">Independent Garage / Detailer</option>
                    <option value="Ecommerce Reseller">Ecommerce Reseller</option>
                  </select>
                </div>
                <div className="b2b-field">
                  <label>Expected Monthly Order Volume</label>
                  <select
                    value={formData.expectedMonthlyVolume}
                    onChange={(e) => setFormData({ ...formData, expectedMonthlyVolume: e.target.value })}
                  >
                    <option value="Under ₹50k">Under ₹50,000 / mo</option>
                    <option value="₹50k–₹2L">₹50,000 – ₹2,00,000 / mo (Standard Tier 1)</option>
                    <option value="₹2L–₹5L">₹2,00,000 – ₹5,00,000 / mo (High Volume Tier 2)</option>
                    <option value="Above ₹5L">Above ₹5,00,000 / mo (Enterprise VIP)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="b2b-form-section">
              <h3 className="b2b-section-title">3. Business Address & Logistics</h3>
              <div className="b2b-field-grid">
                <div className="b2b-field full-width">
                  <label>Street Address / Workshop Location</label>
                  <input
                    type="text"
                    value={formData.businessAddress}
                    onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                    placeholder="e.g. Plot 42, Auto Ancillary Zone, MIDC"
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
                <div className="b2b-field">
                  <label>PIN Code</label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    placeholder="e.g. 411019"
                    maxLength={6}
                  />
                </div>
              </div>
            </div>

            <div className="b2b-form-section">
              <h3 className="b2b-section-title">4. Verification Notes</h3>
              <div className="b2b-field full-width">
                <label>Correction Explanation or Clarification</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Explain corrections or updated business proofs..."
                />
              </div>
            </div>

            <div className="b2b-submit-row">
              <button type="submit" disabled={submitting} className="b2b-submit-btn">
                {submitting ? 'Resubmitting Application...' : 'Resubmit Wholesale Application'}
              </button>
              <p className="b2b-terms-notice">
                Your revised application will be reviewed in CarXen Veda.
              </p>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 4. ONBOARDING & APPLICATION FORM
  return (
    <div className="b2b-page-container">
      {/* Hero Section */}
      <div className="b2b-hero-banner">
        <div className="b2b-badge">
          <span>B2B WHOLESALE PORTAL</span>
        </div>
        <h1>Direct Factory Sourcing for Dealers & Workshops</h1>
        <p className="b2b-hero-sub">
          Apply for a CarXen Wholesale Account. Once reviewed and approved in Carxen Veda, your
          account switches to wholesale mode with individual SKU wholesale pricing, MOQ batch
          rules, and GST Input Tax Credit (ITC) invoices.
        </p>

        {/* Benefits Grid */}
        <div className="b2b-benefits-grid">
          <div className="b2b-benefit-card">
            <div className="b2b-benefit-icon">₹</div>
            <h3>40%–55% Resale Margin</h3>
            <p>Individual wholesale prices set per SKU directly from our factory floor.</p>
          </div>
          <div className="b2b-benefit-card">
            <div className="b2b-benefit-icon">📦</div>
            <h3>Minimum Order Units (MOQ)</h3>
            <p>Enforced minimums per item (e.g. 5 units) so you can stock exactly what moves.</p>
          </div>
          <div className="b2b-benefit-card">
            <div className="b2b-benefit-icon">⚡</div>
            <h3>Quick Order Sheet</h3>
            <p>Single-page bulk order table with SKU thumbnails and quantity steppers.</p>
          </div>
          <div className="b2b-benefit-card">
            <div className="b2b-benefit-icon">📑</div>
            <h3>B2B Tax Invoicing</h3>
            <p>Full GSTIN tax invoices eligible for Input Tax Credit (ITC) with transfer instructions.</p>
          </div>
        </div>
      </div>

      {/* Application Form */}
      <div className="b2b-form-card">
        <div className="b2b-form-header">
          <h2>Wholesale Partner Application</h2>
          <p>Please enter your legal business and contact information for Veda review.</p>
        </div>

        {errorMessage && (
          <div className="b2b-error-banner">
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="b2b-form">
          {/* Section 1: Contact Details */}
          <div className="b2b-form-section">
            <h3 className="b2b-section-title">1. Contact Representative</h3>
            <div className="b2b-field-grid">
              <div className="b2b-field">
                <label>Contact Person Name *</label>
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
              <div className="b2b-field">
                <label>Mobile / WhatsApp *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Business & Legal Details */}
          <div className="b2b-form-section">
            <h3 className="b2b-section-title">2. Business Identification</h3>
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
                <label>Trade / Workshop Name (Optional)</label>
                <input
                  type="text"
                  value={formData.tradeName}
                  onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                  placeholder="e.g. Apex Car Accessories"
                />
              </div>
              <div className="b2b-field">
                <label>GSTIN (Recommended for ITC)</label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  maxLength={15}
                />
              </div>
              <div className="b2b-field">
                <label>Business PAN</label>
                <input
                  type="text"
                  value={formData.pan}
                  onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                  placeholder="e.g. ABCDE1234F"
                  maxLength={10}
                />
              </div>
              <div className="b2b-field">
                <label>Business Type</label>
                <select
                  value={formData.businessType}
                  onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                >
                  <option>Authorized Dealership</option>
                  <option>Multi-Brand Workshop</option>
                  <option>Aftermarket Retailer / Distributor</option>
                  <option>Fleet Operator</option>
                  <option>Detailing & Custom Studio</option>
                </select>
              </div>
              <div className="b2b-field">
                <label>Expected Monthly Volume</label>
                <select
                  value={formData.expectedMonthlyVolume}
                  onChange={(e) => setFormData({ ...formData, expectedMonthlyVolume: e.target.value })}
                >
                  <option>₹50k – ₹2 Lakhs</option>
                  <option>₹2 Lakhs – ₹5 Lakhs</option>
                  <option>₹5 Lakhs+ (Tier 2 High Volume)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Business Address */}
          <div className="b2b-form-section">
            <h3 className="b2b-section-title">3. Business Location</h3>
            <div className="b2b-field-grid">
              <div className="b2b-field full-width">
                <label>Street Address / Workshop Location</label>
                <input
                  type="text"
                  value={formData.businessAddress}
                  onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                  placeholder="e.g. Plot 42, Auto Ancillary Zone, MIDC"
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
              <div className="b2b-field">
                <label>PIN Code</label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder="e.g. 411019"
                  maxLength={6}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Notes / Documents */}
          <div className="b2b-form-section">
            <h3 className="b2b-section-title">4. Verification Notes (Optional)</h3>
            <div className="b2b-field full-width">
              <label>Additional Notes or Certifications</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Mention any OEM affiliations, brands serviced, or special requirements..."
              />
            </div>
          </div>

          <div className="b2b-submit-row">
            <button type="submit" disabled={submitting} className="b2b-submit-btn">
              {submitting ? 'Submitting Application...' : 'Submit Wholesale Application'}
            </button>
            <p className="b2b-terms-notice">
              By submitting, you confirm you are a registered business or dealership. Approval is reviewed inside Carxen Veda within 24-48 business hours.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

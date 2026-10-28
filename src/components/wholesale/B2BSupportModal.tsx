'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import {
  X,
  Send,
  Building2,
  Mail,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import './b2b-support-modal.css';

const CATEGORIES = [
  'Wholesale Verification & Fast-Track Approval',
  'Bulk Procurement & Factory Batch Quotation',
  'Custom Showroom / Dealership Allocation',
  'Dispatch, Logistics & Invoicing Query',
  'General Commercial Support',
] as const;

export function B2BSupportModal() {
  const {
    isSupportModalOpen,
    supportModalOptions,
    closeSupportModal,
    user,
    b2bProfile,
  } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [message, setMessage] = useState('');
  const [botCheck, setBotCheck] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Sync initial values when modal opens
  useEffect(() => {
    if (isSupportModalOpen) {
      setName(user?.name || '');
      setEmail(user?.email || '');
      setCompany(
        supportModalOptions?.businessName ||
        b2bProfile?.businessName ||
        ''
      );
      if (supportModalOptions?.category) {
        setCategory(supportModalOptions.category);
      } else {
        setCategory(CATEGORIES[0]);
      }
      if (supportModalOptions?.initialMessage) {
        setMessage(supportModalOptions.initialMessage);
      } else {
        setMessage('');
      }
      setBotCheck('');
      setError(null);
      setSubmitted(false);

      // Lock body scroll
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isSupportModalOpen, supportModalOptions, user, b2bProfile]);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSupportModal();
      }
    },
    [closeSupportModal]
  );

  useEffect(() => {
    if (isSupportModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isSupportModalOpen, handleKeyDown]);

  if (!isSupportModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanMsg = message.trim();

    if (cleanName.length < 2) {
      setError('Please provide your authorized full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      setError('Please enter a valid work email address.');
      return;
    }
    if (cleanMsg.length < 10) {
      setError('Please provide at least 10 characters describing your inquiry.');
      return;
    }

    setLoading(true);

    try {
      const formattedMessage = `[Topic: ${category}]\n\n${cleanMsg}`;

      const res = await fetch('/api/storefront/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          company: company.trim(),
          message: formattedMessage,
          bot_check: botCheck,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Could not submit your query. Please try again.');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong while sending your inquiry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="b2b-support-title"
      className="b2b-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeSupportModal();
        }
      }}
    >
      {/* Modal Card */}
      <div className="b2b-modal-card">
        {/* Header Ribbon */}
        <div className="b2b-modal-header">
          <div className="b2b-modal-header-left">
            <div className="b2b-modal-icon-badge">
              <Building2 size={20} strokeWidth={2} />
            </div>
            <div className="b2b-modal-header-text">
              <div className="b2b-modal-title-row">
                <h3 id="b2b-support-title" className="b2b-modal-title">
                  Commercial Customer Support
                </h3>
                <span className="b2b-modal-sync-badge">
                  Veda Direct Sync
                </span>
              </div>
              <p className="b2b-modal-subtitle">
                Direct inquiry channel for wholesale buyers and commercial partners
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeSupportModal}
            className="b2b-modal-close-btn"
            aria-label="Close support modal"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="b2b-modal-body">
          {submitted ? (
            <div className="b2b-success-container">
              <div className="b2b-success-icon-wrap">
                <CheckCircle2 size={32} strokeWidth={2.2} />
              </div>
              <h4 className="b2b-success-title">
                Inquiry Dispatched to Commercial Desk
              </h4>
              <p className="b2b-success-desc">
                Your query has been logged directly into the factory support inbox. Our commercial team will review your account dossier and reply to <strong>{email}</strong> shortly.
              </p>
              <button
                type="button"
                onClick={closeSupportModal}
                className="b2b-btn-done"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {error && (
                <div className="b2b-modal-error">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Business Name */}
              <div className="b2b-form-group">
                <label className="b2b-form-label">
                  Business / Dealership Name
                </label>
                <div className="b2b-input-wrapper">
                  <span className="b2b-input-icon">
                    <Building2 size={16} />
                  </span>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Apex Auto Spares Ltd."
                    className="b2b-input"
                  />
                </div>
              </div>

              {/* Grid: Name & Email */}
              <div className="b2b-grid-2col">
                <div className="b2b-form-group">
                  <label className="b2b-form-label">
                    Authorized Contact <span className="b2b-form-required">*</span>
                  </label>
                  <div className="b2b-input-wrapper">
                    <span className="b2b-input-icon">
                      <UserIcon size={16} />
                    </span>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Full Name"
                      className="b2b-input"
                    />
                  </div>
                </div>

                <div className="b2b-form-group">
                  <label className="b2b-form-label">
                    Work Email <span className="b2b-form-required">*</span>
                  </label>
                  <div className="b2b-input-wrapper">
                    <span className="b2b-input-icon">
                      <Mail size={16} />
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="buyer@dealership.com"
                      className="b2b-input"
                    />
                  </div>
                </div>
              </div>

              {/* Topic Category */}
              <div className="b2b-form-group">
                <label className="b2b-form-label">
                  Inquiry Topic
                </label>
                <div className="b2b-select-wrapper">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="b2b-select"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <span className="b2b-select-chevron">
                    <ChevronDown size={16} />
                  </span>
                </div>
              </div>

              {/* Query Message */}
              <div className="b2b-form-group">
                <label className="b2b-form-label">
                  Query Details <span className="b2b-form-required">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Specify your reference number, verification details, or volume requirement..."
                  className="b2b-textarea"
                />
              </div>

              {/* Honeypot field (hidden from real users) */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={botCheck}
                onChange={(e) => setBotCheck(e.target.value)}
                className="b2b-honeypot"
              />

              {/* Actions */}
              <div className="b2b-modal-footer">
                <span className="b2b-modal-note">
                  Replies are dispatched to your work email inbox.
                </span>

                <div className="b2b-modal-actions">
                  <button
                    type="button"
                    onClick={closeSupportModal}
                    className="b2b-btn-cancel"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="b2b-btn-submit"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={14} className="ws-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Submit Query</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

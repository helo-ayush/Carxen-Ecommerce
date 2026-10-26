'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  X,
  Send,
  Building2,
  Mail,
  User as UserIcon,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';

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
    }
  }, [isSupportModalOpen, supportModalOptions, user, b2bProfile]);

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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={closeSupportModal}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xl transition-all dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/70 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-800/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-[#e2231a]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                  Commercial Support Desk
                </h3>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Veda Direct Sync
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Direct inquiry channel for wholesale buyers and commercial partners
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeSupportModal}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Close support modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6">
          {submitted ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Inquiry Dispatched to Commercial Desk
              </h4>
              <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Your query has been logged directly into the factory support inbox. Our commercial team will review your account dossier and reply to <strong>{email}</strong> shortly.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={closeSupportModal}
                  className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Business Name */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Business / Dealership Name
                </label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Apex Auto Spares Ltd."
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-9 pr-3 text-xs text-zinc-900 transition focus:border-[#e2231a] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#e2231a] dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-50 dark:focus:bg-zinc-900"
                  />
                </div>
              </div>

              {/* Grid: Name & Email */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Authorized Contact <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Full Name"
                      className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-9 pr-3 text-xs text-zinc-900 transition focus:border-[#e2231a] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#e2231a] dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-50 dark:focus:bg-zinc-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Work Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="buyer@dealership.com"
                      className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-9 pr-3 text-xs text-zinc-900 transition focus:border-[#e2231a] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#e2231a] dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-50 dark:focus:bg-zinc-900"
                    />
                  </div>
                </div>
              </div>

              {/* Topic Category */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Inquiry Topic
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-xs text-zinc-900 transition focus:border-[#e2231a] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#e2231a] dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-50 dark:focus:bg-zinc-900"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Query Message */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Query Details <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <textarea
                    rows={3}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Specify your reference number, verification details, or volume requirement..."
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 text-xs text-zinc-900 transition placeholder:text-zinc-400 focus:border-[#e2231a] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#e2231a] dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-50 dark:focus:bg-zinc-900"
                  />
                </div>
              </div>

              {/* Honeypot field (hidden from real users) */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={botCheck}
                onChange={(e) => setBotCheck(e.target.value)}
                className="pointer-events-none absolute -left-[9999px] h-0 w-0 opacity-0"
              />

              {/* Actions */}
              <div className="mt-2 flex items-center justify-between gap-3 pt-2">
                <span className="text-[11px] text-zinc-400">
                  Replies are dispatched to your email inbox.
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeSupportModal}
                    className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#e2231a] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#c81e16] disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
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

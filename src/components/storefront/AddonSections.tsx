'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  Sparkles,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import './addon-sections.css';

export type SpecialOfferData = {
  enabled?: boolean;
  badge?: string;
  title?: string;
  subtitle?: string;
  discountText?: string;
  couponCode?: string;
  endsAtNote?: string;
  ctaText?: string;
  ctaLink?: string;
  image?: string;
  alt?: string;
};

export type NewLaunchHighlight = {
  id: string;
  label: string;
  value: string;
};

export type NewLaunchData = {
  enabled?: boolean;
  badge?: string;
  title?: string;
  tagline?: string;
  description?: string;
  priceText?: string;
  originalPriceText?: string;
  image?: string;
  alt?: string;
  ctaText?: string;
  ctaLink?: string;
  highlights?: NewLaunchHighlight[];
};

export type BundleItemData = {
  id: string;
  name: string;
  category: string;
  image: string;
};

export type BundleDealData = {
  enabled?: boolean;
  badge?: string;
  title?: string;
  subtitle?: string;
  savingsBadge?: string;
  bundlePrice?: string;
  originalPrice?: string;
  ctaText?: string;
  ctaLink?: string;
  items?: BundleItemData[];
};

export type BillboardStatData = {
  id: string;
  value: string;
  label: string;
};

export type BillboardData = {
  enabled?: boolean;
  badge?: string;
  title?: string;
  description?: string;
  image?: string;
  ctaText?: string;
  ctaLink?: string;
  stats?: BillboardStatData[];
};

export type AddonSectionsProps = {
  addons?: {
    specialOffer?: SpecialOfferData;
    newLaunch?: NewLaunchData;
    bundleDeal?: BundleDealData;
    billboard?: BillboardData;
  };
};

export function AddonSections({ addons }: AddonSectionsProps) {
  const router = useRouter();
  const { showToast } = useApp();
  const [copiedCode, setCopiedCode] = useState(false);

  const handleSmoothNav = useCallback((href: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!href) return;
    if (href.startsWith('#')) {
      const el = document.querySelector(href);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    router.push(href);
  }, [router]);

  const handleCopyCoupon = useCallback((code: string) => {
    if (!code) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopiedCode(true);
    showToast(`Coupon code ${code} copied to clipboard!`);
    setTimeout(() => {
      setCopiedCode(false);
    }, 2800);
  }, [showToast]);

  const specialOffer = addons?.specialOffer;
  const newLaunch = addons?.newLaunch;
  const bundleDeal = addons?.bundleDeal;
  const billboard = addons?.billboard;

  const showOffer = Boolean(specialOffer?.enabled);
  const showLaunch = Boolean(newLaunch?.enabled);
  const showBundle = Boolean(bundleDeal?.enabled);
  const showBillboard = Boolean(billboard?.enabled);

  if (!showOffer && !showLaunch && !showBundle && !showBillboard) {
    return null;
  }

  return (
    <div className="storefront-addons-container" aria-label="Featured Promotions & New Drops">
      {/* 1. SPECIAL OFFER / FESTIVE DROP */}
      {showOffer && (
        <section className="sec addon-sec-wrap" id="special-offer">
          <div className="wrap">
            <div className="sec-head rv in">
              <span className="no">PROMO</span>
              <span className="t">Promotional Drop</span>
              <span className="rule" />
              <span className="note">Limited Window</span>
            </div>

            <div className="addon-card-shell rv in">
              <div className="addon-card-content">
                <div className="addon-offer-grid">
                  <div className="addon-offer-left">
                    <div className="addon-top-indicator">
                      <span className="addon-pulse-dot" />
                      <span>{specialOffer?.badge || 'Festive Flash Drop'}</span>
                    </div>

                    <h2 className="addon-offer-title disp">
                      {specialOffer?.title || 'Diwali Interior Upgrade Sale'}
                      <span className="red">.</span>
                    </h2>

                    <p className="addon-offer-subtitle">
                      {specialOffer?.subtitle ||
                        'Complete cabin styling packages with bespoke diamond quilting and custom fitment.'}
                    </p>

                    <div className="addon-voucher-box">
                      <div className="addon-voucher-label">
                        <span>Campaign Advantage</span>
                        <div className="addon-voucher-discount red">
                          {specialOffer?.discountText || 'Flat 30% OFF'}
                        </div>
                      </div>

                      {specialOffer?.couponCode && (
                        <button
                          type="button"
                          className="addon-coupon-code-pill"
                          onClick={() => handleCopyCoupon(specialOffer.couponCode!)}
                          title="Click to copy voucher code"
                        >
                          <span>{specialOffer.couponCode}</span>
                          <span className="addon-coupon-copy-btn">
                            {copiedCode ? (
                              <>
                                <Check size={13} className="text-emerald-400" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={13} />
                                <span>Copy</span>
                              </>
                            )}
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="addon-actions-row">
                      <button
                        type="button"
                        className="btn"
                        onClick={(e) => handleSmoothNav(specialOffer?.ctaLink || '#shop', e)}
                      >
                        <span>{specialOffer?.ctaText || 'Claim 30% Off Drop'}</span>
                        <ArrowRight />
                      </button>

                      {specialOffer?.endsAtNote && (
                        <span className="mono text-xs" style={{ color: '#888892' }}>
                          {specialOffer.endsAtNote}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="addon-offer-right">
                    <div className="addon-offer-img-frame">
                      <img
                        src={
                          specialOffer?.image ||
                          'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80'
                        }
                        alt={specialOffer?.alt || 'Festive CarXen Drop'}
                        className="addon-offer-img"
                        loading="lazy"
                      />
                      <div className="addon-img-floating-tag">
                        <span className="flex items-center gap-2">
                          <ShieldCheck size={14} className="text-red-500" />
                          <span>Certified OEM Fitment</span>
                        </span>
                        <span className="text-red-400 font-bold">100+ Models</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. NEWLY LAUNCHED PRODUCT */}
      {showLaunch && (
        <section className="sec addon-sec-wrap" id="new-launch">
          <div className="wrap">
            <div className="sec-head rv in">
              <span className="no">NEW</span>
              <span className="t">Apex Drop</span>
              <span className="rule" />
              <span className="note">Just Released</span>
            </div>

            <div className="addon-card-shell rv in">
              <div className="addon-card-content">
                <div className="addon-launch-grid">
                  <div className="addon-launch-img-stage">
                    <img
                      src={newLaunch?.image || 'https://images.unsplash.com/photo-1625690180114-5530b1304127?auto=format&fit=crop&w=1000&q=85'}
                      alt={newLaunch?.alt || 'Newly Launched Product'}
                      className="addon-launch-img"
                      loading="lazy"
                    />
                  </div>

                  <div className="addon-launch-details">
                    <div className="addon-top-indicator">
                      <Sparkles size={12} className="text-red-500" />
                      <span>{newLaunch?.badge || 'New Release — Apex Series'}</span>
                    </div>

                    <h2 className="addon-offer-title disp">
                      {newLaunch?.title || 'Carbon Pro Steering Wrap & Grip'}
                    </h2>

                    <p className="font-medium text-sm text-neutral-300 mb-2">
                      {newLaunch?.tagline ||
                        'Micro-perforated Italian Nappa leather with racing red 12 o\'clock center stripe.'}
                    </p>

                    <p className="addon-offer-subtitle">
                      {newLaunch?.description ||
                        'Engineered for pure control with dual-density foam core, sweat-resistant matte finish, and laser-stitched seam tension.'}
                    </p>

                    <div className="addon-price-strip">
                      <span className="addon-active-price">
                        {newLaunch?.priceText || '₹2,499'}
                      </span>
                      {newLaunch?.originalPriceText && (
                        <span className="addon-original-price">
                          {newLaunch.originalPriceText}
                        </span>
                      )}
                      <span className="mono text-xs px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
                        Introductory Drop
                      </span>
                    </div>

                    {newLaunch?.highlights && newLaunch.highlights.length > 0 && (
                      <div className="addon-launch-highlights">
                        {newLaunch.highlights.map((h) => (
                          <div key={h.id} className="addon-spec-pill">
                            <div className="addon-spec-label">{h.label}</div>
                            <div className="addon-spec-value">{h.value}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="addon-actions-row">
                      <button
                        type="button"
                        className="btn"
                        onClick={(e) => handleSmoothNav(newLaunch?.ctaLink || '#shop', e)}
                      >
                        <span>{newLaunch?.ctaText || 'Explore New Launch'}</span>
                        <ArrowRight />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. COCKPIT SUITE BUNDLE DEAL */}
      {showBundle && (
        <section className="sec addon-sec-wrap" id="bundle-deal">
          <div className="wrap">
            <div className="sec-head rv in">
              <span className="no">SUITE</span>
              <span className="t">Cockpit Synergy</span>
              <span className="rule" />
              <span className="note">Curated Trio</span>
            </div>

            <div className="addon-card-shell rv in">
              <div className="addon-card-content">
                <div className="addon-bundle-header">
                  <div>
                    <div className="addon-top-indicator">
                      <Zap size={12} className="text-red-500" />
                      <span>{bundleDeal?.badge || 'Complete Cockpit Suite'}</span>
                    </div>
                    <h2 className="addon-offer-title disp" style={{ marginBottom: 6 }}>
                      {bundleDeal?.title || 'The All-Weather Commuter Bundle'}
                    </h2>
                    <p className="addon-offer-subtitle" style={{ marginBottom: 0 }}>
                      {bundleDeal?.subtitle ||
                        'Pair our flagship quilted seats with 7D deep-dish floor mats and center armrest cushion.'}
                    </p>
                  </div>

                  <div className="mono text-xs font-semibold px-4 py-2 rounded-xl bg-red-950/40 text-red-400 border border-red-800/50">
                    {bundleDeal?.savingsBadge || 'Save ₹2,400 Combined'}
                  </div>
                </div>

                <div className="addon-bundle-chain">
                  {bundleDeal?.items?.map((item, idx) => (
                    <React.Fragment key={item.id}>
                      <div className="addon-bundle-item-card">
                        <div className="addon-bundle-item-thumb">
                          <img src={item.image} alt={item.name} loading="lazy" />
                        </div>
                        <div className="addon-bundle-item-cat">{item.category}</div>
                        <div className="addon-bundle-item-name">{item.name}</div>
                      </div>
                      {idx < (bundleDeal.items?.length || 0) - 1 ? (
                        <div className="addon-bundle-node">+</div>
                      ) : (
                        <div className="addon-bundle-node">=</div>
                      )}
                    </React.Fragment>
                  ))}

                  <div className="addon-bundle-total-card">
                    <div className="mono text-xs text-neutral-400 uppercase tracking-widest mb-1">
                      Bundle Advantage
                    </div>
                    <div className="addon-bundle-price-box">
                      <span className="addon-bundle-total-price">
                        {bundleDeal?.bundlePrice || '₹8,999'}
                      </span>
                      {bundleDeal?.originalPrice && (
                        <span className="addon-bundle-old-price">
                          {bundleDeal.originalPrice}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn w-full justify-center"
                      style={{ height: 46 }}
                      onClick={(e) => handleSmoothNav(bundleDeal?.ctaLink || '#shop', e)}
                    >
                      <span>{bundleDeal?.ctaText || 'Shop The Suite'}</span>
                      <ArrowRight size={14} />
                    </button>
                    <div className="mono text-[10px] text-neutral-400 mt-2">
                      Free Express Shipping Included
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. ENGINEERING BILLBOARD STRIP */}
      {showBillboard && (
        <section className="sec addon-sec-wrap" id="billboard">
          <div className="wrap">
            <div className="addon-billboard-shell rv in">
              <img
                src={
                  billboard?.image ||
                  'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1400&q=80'
                }
                alt="CarXen Highway Engineering"
                className="addon-billboard-bg-img"
                loading="lazy"
              />
              <div className="addon-billboard-overlay" />

              <div className="addon-billboard-inner">
                <div className="addon-top-indicator">
                  <ShieldCheck size={12} className="text-red-500" />
                  <span>{billboard?.badge || 'Crafted in India · World-Class Standards'}</span>
                </div>

                <div className="max-w-3xl">
                  <h2 className="addon-offer-title disp">
                    {billboard?.title || 'Precision Engineering for Every Indian Highway.'}
                    <span className="red">.</span>
                  </h2>
                  <p className="addon-offer-subtitle">
                    {billboard?.description ||
                      'Tested across 50°C summer heat, monsoon deluges, and mountain dirt trails. Built with zero-compromise materials.'}
                  </p>

                  <button
                    type="button"
                    className="btn"
                    onClick={(e) => handleSmoothNav(billboard?.ctaLink || '#craft', e)}
                  >
                    <span>{billboard?.ctaText || 'Discover Our Testing Standards'}</span>
                    <ArrowRight />
                  </button>
                </div>

                {billboard?.stats && billboard.stats.length > 0 && (
                  <div className="addon-stats-matrix">
                    {billboard.stats.map((st) => (
                      <div key={st.id} className="addon-stat-box">
                        <div className="addon-stat-num">{st.value}</div>
                        <div className="addon-stat-text">{st.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default AddonSections;

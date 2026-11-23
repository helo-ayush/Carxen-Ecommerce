'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { categoryLabel, compareCategories } from '@/lib/storefront/categories';

export function Footer() {
  const { products, storefrontConfig } = useApp();
  const footerConfig = storefrontConfig?.footer;

  const categoryLinks = React.useMemo(() => {
    const categories = new Map<string, string>();
    for (const product of products) {
      categories.set(product.c, product.categoryLabel?.trim() || categoryLabel(product.c));
    }
    return [...categories.entries()]
      .sort((a, b) => compareCategories({ key: a[0], label: a[1] }, { key: b[0], label: b[1] }))
      .slice(0, 4);
  }, [products]);

  if (footerConfig && footerConfig.enabled === false) {
    return null;
  }

  const brandDescription =
    footerConfig?.description ||
    footerConfig?.tagline ||
    "Built for drivers. Designed for what's next.";

  const copyrightText =
    footerConfig?.copyright ||
    "© 2026 CarXen — Engineered Car Accessories";

  const bottomNote =
    footerConfig?.bottomNote ||
    "Precision / Protection / Comfort";

  // Dynamic social links from config or fallback
  const socialLinks =
    Array.isArray(footerConfig?.socialLinks) && footerConfig.socialLinks.length > 0
      ? footerConfig.socialLinks.filter((s: any) => s.enabled !== false && s.url)
      : [
          { platform: 'instagram', url: 'https://instagram.com/carxen.in' },
          { platform: 'youtube', url: 'https://youtube.com/@carxen' },
          { platform: 'x', url: 'https://x.com/carxen' },
        ];

  // Dynamic columns from config or fallback
  const hasCustomColumns =
    Array.isArray(footerConfig?.columns) && footerConfig.columns.length > 0;

  const renderSocialIcon = (platform: string) => {
    switch ((platform || '').toLowerCase()) {
      case 'instagram':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
          </svg>
        );
      case 'youtube':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2.5" y="6" width="19" height="12" rx="3" />
            <path d="M10.5 9.5l4.5 2.5-4.5 2.5z" fill="currentColor" />
          </svg>
        );
      case 'x':
      case 'twitter':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4l16 16M20 4L4 20" />
          </svg>
        );
      case 'facebook':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
          </svg>
        );
      case 'linkedin':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
            <circle cx="4" cy="4" r="2" />
          </svg>
        );
      case 'whatsapp':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        );
      case 'pinterest':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 21l3-10M11 11a3 3 0 1 1 5 3c0 2-1 4-3 4-1 0-1.5-.5-1.5-.5" />
          </svg>
        );
      case 'tiktok':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
          </svg>
        );
      case 'threads':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12a7 7 0 1 1-2.4-5.2M12 8a4 4 0 1 1-4 4c0-1.5 1-2.5 2.5-2.5 2 0 2.5 2 2.5 3.5 0 2-1.5 3-3 3" />
          </svg>
        );
      case 'telegram':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2L2 9.5l7 2.5 2 6 3.5-3.5 5 4L21.5 2z" />
            <path d="M9 12l8-7-6 8" />
          </svg>
        );
      case 'discord':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6a14.5 14.5 0 0 0-4-1.2 11.5 11.5 0 0 0-.5 1.2 13.5 13.5 0 0 0-3 0 11.5 11.5 0 0 0-.5-1.2A14.5 14.5 0 0 0 6 6 16.5 16.5 0 0 0 3 17a14.5 14.5 0 0 0 4.5 2.3 11 11 0 0 0 1-1.6 9.5 9.5 0 0 1-1.5-.7l.4-.3a10.5 10.5 0 0 0 10.2 0l.4.3a9.5 9.5 0 0 1-1.5.7 11 11 0 0 0 1 1.6A14.5 14.5 0 0 0 21 17a16.5 16.5 0 0 0-3-11z" />
          </svg>
        );
      case 'github':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20M2 12h20" />
          </svg>
        );
    }
  };

  const columnCount = hasCustomColumns ? footerConfig.columns.length : 3;

  return (
    <footer>
      <div className="wrap">
        <div className="ft-g" style={{ ['--ft-cols' as any]: columnCount }}>
          <div>
            <Link href="/" className="logo logo-link" aria-label="CARXEN Homepage">
              <img src="/logo.png" alt="CARXEN" className="logo-img" style={{ height: '44px', width: 'auto' }} />
            </Link>
            <p>{brandDescription}</p>
            {socialLinks.length > 0 && (
              <div className="soc">
                {socialLinks.map((soc: any, i: number) => (
                  <a
                    key={soc.id || `${soc.platform}-${i}`}
                    href={soc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={soc.label || soc.platform}
                    title={soc.label || soc.platform}
                  >
                    {renderSocialIcon(soc.platform)}
                  </a>
                ))}
              </div>
            )}
          </div>

          {hasCustomColumns ? (
            footerConfig.columns.map((col: any) => (
              <div key={col.id}>
                <h6>{col.title}</h6>
                {Array.isArray(col.links) &&
                  col.links.map((link: any) => {
                    const isExternal =
                      link.url.startsWith('http://') ||
                      link.url.startsWith('https://') ||
                      link.url.startsWith('//');

                    if (isExternal) {
                      return (
                        <a
                          key={link.id}
                          href={link.url}
                          target={link.openInNewTab ? '_blank' : undefined}
                          rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                        >
                          {link.label}
                        </a>
                      );
                    }

                    return (
                      <Link
                        key={link.id}
                        href={link.url}
                        target={link.openInNewTab ? '_blank' : undefined}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
              </div>
            ))
          ) : (
            <>
              <div>
                <h6>Shop</h6>
                <Link href="/shop">All products</Link>
                {categoryLinks.map(([key, label]) => (
                  <Link key={key} href={`/shop?cat=${encodeURIComponent(key)}`}>{label}</Link>
                ))}
              </div>
              <div>
                <h6>Support</h6>
                <Link href="/#fitment">Fitment guide</Link>
                <Link href="/#top">Shipping</Link>
                <Link href="/#top">Warranty</Link>
                <Link href="/wholesale">Authorized Dealer Portal</Link>
              </div>
              <div>
                <h6>Legal & Policy</h6>
                <Link href="/privacy">Privacy Policy</Link>
                <Link href="/terms">Terms of Service</Link>
                <Link href="/#craft">Craftsmanship</Link>
                <Link href="/#reviews">Reviews</Link>
                <Link href="/#top">Contact</Link>
              </div>
            </>
          )}
        </div>

        <div className="fb">
          <span className="mono">{copyrightText}</span>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href="/privacy" className="mono" style={{ textDecoration: 'underline' }}>Privacy Policy</Link>
            <span className="mono" style={{ opacity: 0.4 }}>•</span>
            <Link href="/terms" className="mono" style={{ textDecoration: 'underline' }}>Terms of Service</Link>
          </div>
          <span className="mono">{bottomNote}</span>
        </div>
      </div>
    </footer>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { categoryLabel, compareCategories } from '@/lib/storefront/categories';

export function Footer() {
  const { products } = useApp();
  const categoryLinks = React.useMemo(() => {
    const categories = new Map<string, string>();
    for (const product of products) {
      categories.set(product.c, product.categoryLabel?.trim() || categoryLabel(product.c));
    }
    return [...categories.entries()]
      .sort((a, b) => compareCategories({ key: a[0], label: a[1] }, { key: b[0], label: b[1] }))
      .slice(0, 4);
  }, [products]);

  return (
    <footer>
      <div className="wrap">
        <div className="ft-g">
          <div>
            <Link href="/" className="logo logo-link" aria-label="CARXEN Homepage">
              <img src="/logo.png" alt="CARXEN" className="logo-img" style={{ height: '44px', width: 'auto' }} />
            </Link>
            <p>Built for drivers. Designed for what&apos;s next.</p>
            <div className="soc">
              <a href="#" aria-label="Instagram">
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
              </a>
              <a href="#" aria-label="YouTube">
                <svg viewBox="0 0 24 24">
                  <rect x="2.5" y="6" width="19" height="12" rx="3" />
                  <path d="M10.5 9.5l4.5 2.5-4.5 2.5z" />
                </svg>
              </a>
              <a href="#" aria-label="X">
                <svg viewBox="0 0 24 24">
                  <path d="M4 4l16 16M20 4L4 20" />
                </svg>
              </a>
            </div>
          </div>
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
            <Link href="/#top">Returns</Link>
            <Link href="/#top">Warranty</Link>
          </div>
          <div>
            <h6>Legal & Policy</h6>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/#craft">Craftsmanship</Link>
            <Link href="/#reviews">Reviews</Link>
            <Link href="/#top">Contact</Link>
          </div>
        </div>
        <div className="fb">
          <span className="mono">© 2026 CarXen — Engineered Car Accessories</span>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href="/privacy" className="mono" style={{ textDecoration: 'underline' }}>Privacy Policy</Link>
            <span className="mono" style={{ opacity: 0.4 }}>•</span>
            <Link href="/terms" className="mono" style={{ textDecoration: 'underline' }}>Terms of Service</Link>
          </div>
          <span className="mono">Precision / Protection / Comfort</span>
        </div>
      </div>
    </footer>
  );
}

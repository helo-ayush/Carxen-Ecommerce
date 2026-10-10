'use client';

import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer>
      <div className="fw in" id="fw">
        <span>
          CAR<b>X</b>EN
        </span>
      </div>
      <div className="wrap">
        <div className="ft-g">
          <div>
            <Link href="/" className="logo" style={{ fontSize: '34px' }}>
              CAR<b>X</b>EN
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
            <Link href="/shop?cat=seats">Seat covers</Link>
            <Link href="/shop?cat=mats">Floor mats</Link>
            <Link href="/shop?cat=steering">Steering covers</Link>
            <Link href="/shop?cat=comfort">Comfort</Link>
          </div>
          <div>
            <h6>Support</h6>
            <Link href="/#fitment">Fitment guide</Link>
            <Link href="/#top">Shipping</Link>
            <Link href="/#top">Returns</Link>
            <Link href="/#top">Warranty</Link>
          </div>
          <div>
            <h6>Company</h6>
            <Link href="/#craft">Craftsmanship</Link>
            <Link href="/#why">Why CarXen</Link>
            <Link href="/#reviews">Reviews</Link>
            <Link href="/#top">Contact</Link>
          </div>
        </div>
        <div className="fb">
          <span className="mono">© 2026 CarXen — Engineered Car Accessories</span>
          <span className="mono">Precision / Protection / Comfort</span>
        </div>
      </div>
    </footer>
  );
}

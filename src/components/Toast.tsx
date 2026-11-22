'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/context/AppContext';

export function Toast() {
  const { toastMessage } = useApp();

  const { iconType, shortText } = useMemo(() => {
    if (!toastMessage) return { iconType: 'check', shortText: '' };

    const lower = toastMessage.toLowerCase();

    // Short and crisp notifications for favorites
    if (
      lower.includes('saved to favourites') ||
      lower.includes('added to favourites') ||
      lower.includes('saved to wishlist') ||
      lower.includes('added to wishlist')
    ) {
      return { iconType: 'heart', shortText: 'Saved to Wishlist' };
    }
    if (
      lower.includes('removed from favourites') ||
      lower.includes('removed from wishlist')
    ) {
      return { iconType: 'heart-off', shortText: 'Removed from Wishlist' };
    }

    // Short and crisp notifications for cart
    if (lower.includes('added to cart')) {
      return { iconType: 'cart', shortText: 'Added to Cart' };
    }
    if (lower.includes('removed from cart')) {
      return { iconType: 'cart-off', shortText: 'Removed from Cart' };
    }

    // Short and crisp notifications for wholesale / B2B basket
    if (lower.includes('wholesale basket') || lower.includes('wholesale order basket')) {
      if (lower.includes('added')) {
        return { iconType: 'cart', shortText: 'Added to B2B Basket' };
      }
      return { iconType: 'cart-off', shortText: 'Removed from B2B Basket' };
    }

    // Clean up other messages with product title separators
    let clean = toastMessage;
    if (clean.includes(' — ') && clean.length > 32) {
      const parts = clean.split(' — ');
      clean = parts[0] + (parts[1] ? ` · ${parts[1].slice(0, 18)}…` : '');
    } else if (clean.length > 46) {
      clean = clean.slice(0, 44) + '…';
    }

    return { iconType: 'check', shortText: clean };
  }, [toastMessage]);

  if (!toastMessage) return null;

  return (
    <div className={`toast ${toastMessage ? 'on' : ''}`} id="toast" role="status" aria-live="polite">
      {iconType === 'heart' && (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="#e2231a" stroke="#e2231a" strokeWidth="2">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      )}
      {iconType === 'heart-off' && (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth="2">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      )}
      {iconType === 'cart' && (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#22c55e" strokeWidth="2">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      )}
      {iconType === 'cart-off' && (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth="2">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      )}
      {iconType === 'check' && (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#22c55e" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      <span className="toast-text">{shortText}</span>
    </div>
  );
}

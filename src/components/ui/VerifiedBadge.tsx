'use client';

import React from 'react';

interface VerifiedBadgeProps {
  size?: number;
  className?: string;
  showTooltip?: boolean;
  tooltipText?: string;
}

export function VerifiedBadge({
  size = 18,
  className = '',
  showTooltip = true,
  tooltipText = 'Verified User · Purchased 3+ products',
}: VerifiedBadgeProps) {
  return (
    <span
      className={`cx-verified-badge-wrap ${className}`}
      title={tooltipText}
      aria-label="Verified User"
      role="img"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="cx-verified-badge-svg"
      >
        {/* Twitter-style scalloped verified badge */}
        <path
          d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.13-.39.2-.81.2-1.25 0-2.12-1.72-3.84-3.84-3.84-.44 0-.86.07-1.25.2C14.5 2.46 13.26 1.58 11.83 1.58s-2.67.88-3.34 2.19c-.39-.13-.81-.2-1.25-.2-2.12 0-3.84 1.72-3.84 3.84 0 .44.07.86.2 1.25C2.29 9.33 1.41 10.57 1.41 12s.88 2.67 2.19 3.34c-.13.39-.2.81-.2 1.25 0 2.12 1.72 3.84 3.84 3.84.44 0 .86-.07 1.25-.2.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c.39.13.81.2 1.25.2 2.12 0 3.84-1.72 3.84-3.84 0-.44-.07-.86-.2-1.25 1.31-.67 2.19-1.91 2.19-3.34z"
          fill="#1d9bf0"
        />
        {/* Crisp checkmark */}
        <path
          d="M9.86 16.32l-3.41-3.41a.996.996 0 111.41-1.41l2 2 5.86-5.86a.996.996 0 111.41 1.41l-7.27 7.27z"
          fill="#ffffff"
        />
      </svg>
      {showTooltip && (
        <span className="cx-verified-badge-tooltip" role="tooltip">
          <span className="cx-tooltip-title">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#38bdf8" style={{ marginRight: '4px' }}>
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            Verified User
          </span>
          <span className="cx-tooltip-desc">Purchased 3+ products from CARXEN</span>
        </span>
      )}
    </span>
  );
}

export default VerifiedBadge;

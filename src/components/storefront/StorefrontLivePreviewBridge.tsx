'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/context/AppContext';

export function StorefrontLivePreviewBridge() {
  const { isPreviewMode } = useApp();

  useEffect(() => {
    if (!isPreviewMode) return;

    // Prevent external link clicks from breaking the preview iframe
    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href) return;

      // Allow hash links and internal relative links
      if (href.startsWith('#')) return;

      // If user clicks an external link, open in a new tab so preview isn't destroyed
      if (href.startsWith('http://') || href.startsWith('https://')) {
        const isCarxenDomain =
          href.includes('carxen.in') || href.includes('localhost');
        if (!isCarxenDomain) {
          e.preventDefault();
          window.open(href, '_blank', 'noopener,noreferrer');
        }
      }
    };

    document.addEventListener('click', handleLinkClick, true);

    return () => {
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, [isPreviewMode]);

  // Completely invisible — does not render any blocking DOM banner over the real website
  return null;
}

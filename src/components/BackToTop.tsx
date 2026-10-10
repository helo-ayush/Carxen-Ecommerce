'use client';

import React, { useEffect, useState } from 'react';

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 700);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      className={`totop ${visible ? 'on' : ''}`}
      id="tt"
      onClick={scrollToTop}
      aria-label="Back to top"
    >
      <svg viewBox="0 0 24 24">
        <path d="M12 19V5M6 11l6-6 6 6" />
      </svg>
    </button>
  );
}

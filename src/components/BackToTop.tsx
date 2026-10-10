'use client';

import React, { useEffect, useState } from 'react';

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const [inHero, setInHero] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 700);
    };

    const handleHeroScroll = (e: Event) => {
      setInHero((e as CustomEvent<{ inHero: boolean }>).detail.inHero);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('hero-scroll', handleHeroScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('hero-scroll', handleHeroScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      className={`totop ${visible && !inHero ? 'on' : ''}`}
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

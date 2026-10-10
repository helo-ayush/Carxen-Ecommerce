'use client';

import React, { useEffect, useState } from 'react';

export function ScrollProgress() {
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setScale(h > 0 ? y / h : 0);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="prog">
      <i id="prog" style={{ transform: `scaleX(${scale})` }} />
    </div>
  );
}

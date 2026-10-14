'use client';

import React, { useEffect, useState } from 'react';

export function Preloader() {
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // Check if preloader already ran in this session
    const hasLoaded = sessionStorage.getItem('cx_loaded');
    if (hasLoaded) {
      setIsDone(true);
      document.body.classList.add('ready');
      return;
    }

    let p = 0;
    const interval = setInterval(() => {
      p = Math.min(100, p + Math.random() * 20);
      setProgress(Math.floor(p));
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsDone(true);
          document.body.classList.add('ready');
          sessionStorage.setItem('cx_loaded', '1');
        }, 300);
      }
    }, 80);

    const fallback = setTimeout(() => {
      setIsDone(true);
      document.body.classList.add('ready');
      sessionStorage.setItem('cx_loaded', '1');
    }, 2800);

    return () => {
      clearInterval(interval);
      clearTimeout(fallback);
    };
  }, []);

  if (isDone) return null;

  return (
    <div className={`pre ${isDone ? 'done' : ''}`} id="pre">
      <small className="mono">CarXen — Precision interiors</small>
      <div className="pre-logo">
        <img src="/logo.png" alt="CARXEN" className="pre-logo-img" />
      </div>
      <div className="pre-row">
        <div className="pre-n" id="preN">
          {String(progress).padStart(2, '0')}
        </div>
        <div className="pre-bar">
          <i id="preB" style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
        <small className="mono">Loading</small>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export function Preloader() {
  const pathname = usePathname();
  const { catalogStatus } = useApp();
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [isUnmounted, setIsUnmounted] = useState(false);

  // If on wholesale procurement workspace, bypass preloader for instant B2B productivity
  const isWholesale = pathname?.startsWith('/wholesale');

  // Keep fresh ref to data readiness so timer interval sees current state
  const isDataReadyRef = useRef(false);
  isDataReadyRef.current = catalogStatus !== 'loading';

  useEffect(() => {
    if (isWholesale) {
      document.body.classList.add('ready');
      document.body.style.overflow = '';
      return;
    }

    // Clear any previous session flag so preloader runs consistently on page load/refresh
    try {
      sessionStorage.removeItem('cx_loaded');
    } catch {}

    // Lock page scroll while preloader is active
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, 0);

    const startTime = Date.now();
    // Minimum presentation time (1600ms) for a premium, calm brand introduction
    const MIN_LOADING_TIME = 1600;
    let currentProgress = 0;
    let completed = false;

    const interval = setInterval(() => {
      if (completed) return;

      const elapsed = Date.now() - startTime;
      const dataReady = isDataReadyRef.current;

      if (!dataReady) {
        // While waiting for Supabase catalog and storefront config, smoothly advance to 88%
        if (currentProgress < 88) {
          const increment = Math.max(1, (88 - currentProgress) * 0.12);
          currentProgress = Math.min(88, currentProgress + increment);
          setProgress(Math.floor(currentProgress));
        }
      } else {
        // Data is ready! Ensure minimum brand presentation time has elapsed
        if (elapsed < MIN_LOADING_TIME) {
          if (currentProgress < 92) {
            currentProgress = Math.min(92, currentProgress + 2.5);
            setProgress(Math.floor(currentProgress));
          }
        } else {
          // Both data and time are ready: charge to 100%
          currentProgress = Math.min(100, currentProgress + 5);
          setProgress(Math.floor(currentProgress));

          if (currentProgress >= 100) {
            completed = true;
            clearInterval(interval);

            // Hold 100% briefly, then slide up curtain
            setTimeout(() => {
              document.body.classList.add('ready');
              document.body.style.overflow = '';
              setIsExiting(true);

              // Unmount after 1s CSS transition (transform: translateY(-101%))
              setTimeout(() => {
                setIsUnmounted(true);
              }, 1050);
            }, 220);
          }
        }
      }
    }, 35);

    // Fallback timer: ensure user is never blocked indefinitely
    const fallback = setTimeout(() => {
      if (!completed) {
        completed = true;
        clearInterval(interval);
        setProgress(100);
        document.body.classList.add('ready');
        document.body.style.overflow = '';
        setIsExiting(true);
        setTimeout(() => setIsUnmounted(true), 1050);
      }
    }, 4500);

    return () => {
      clearInterval(interval);
      clearTimeout(fallback);
      document.body.style.overflow = '';
    };
  }, [isWholesale]);

  if (isWholesale || isUnmounted) return null;

  return (
    <div
      className={`pre ${isExiting ? 'done' : ''}`}
      id="pre"
      aria-hidden={isExiting}
    >
      <small className="mono">CarXen — Precision interiors</small>
      <div className="pre-logo">
        <img src="/logo.png" alt="CARXEN" className="pre-logo-img" />
      </div>
      <div className="pre-row">
        <div className="pre-n" id="preN">
          {String(progress).padStart(2, '0')}
        </div>
        <div className="pre-bar">
          <i
            id="preB"
            style={{
              transform: `scaleX(${progress / 100})`,
              transition: 'transform 0.08s ease-out',
            }}
          />
        </div>
        <small className="mono">Loading</small>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';

export function MobileMenu() {
  const { isMobileMenuOpen, closeMobileMenu, user } = useApp();

  return (
    <div className={`menu ${isMobileMenuOpen ? 'on' : ''}`} id="menu">
      <div className="wrap menu-top" style={{ width: '100%', display: 'flex' }}>
        <Link href="/" onClick={closeMobileMenu} className="logo logo-link" aria-label="CARXEN Homepage">
          <img src="/logo.png" alt="CARXEN" className="logo-img" style={{ height: '36px', width: 'auto' }} />
        </Link>
        <button className="xb" id="menuX" onClick={closeMobileMenu} aria-label="Close">
          <svg viewBox="0 0 24 24" style={{ stroke: '#fff' }}>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <nav className="wrap">
        <Link href="/#categories" onClick={closeMobileMenu} style={{ transitionDelay: '.1s' }}>
          <i>01</i>Product
        </Link>
        <Link href="/#craft" onClick={closeMobileMenu} style={{ transitionDelay: '.17s' }}>
          <i>02</i>Craft
        </Link>
        <Link href="/#shop" onClick={closeMobileMenu} style={{ transitionDelay: '.24s' }}>
          <i>03</i>Explore
        </Link>
        <Link href="/#fitment" onClick={closeMobileMenu} style={{ transitionDelay: '.31s' }}>
          <i>04</i>Vehicles
        </Link>
        <Link href="/#reviews" onClick={closeMobileMenu} style={{ transitionDelay: '.38s' }}>
          <i>05</i>Reviews
        </Link>
        <Link href="/shop" onClick={closeMobileMenu} style={{ transitionDelay: '.45s' }}>
          <i>06</i>Shop now
        </Link>
        <Link href={user ? '/account' : '/login'} onClick={closeMobileMenu} style={{ transitionDelay: '.52s' }}>
          <i>07</i>Account
        </Link>
      </nav>
    </div>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export function MobileMenu() {
  const router = useRouter();
  const { isMobileMenuOpen, closeMobileMenu, user, car, logout } = useApp();
  const pathname = usePathname();
  const isLandingPage = pathname === '/';
  const activeCar = car || { b: 'Hyundai', m: 'Creta', y: '2024', f: 'Petrol' };

  const isWholesaleMode = pathname.startsWith('/wholesale') || pathname.startsWith('/b2b');

  return (
    <div className={`menu ${isMobileMenuOpen ? 'on' : ''}`} id="menu">
      <div className="wrap menu-top" style={{ width: '100%', display: 'flex' }}>
        <Link
          href="/"
          onClick={closeMobileMenu}
          className="logo logo-link"
          aria-label="CARXEN Homepage"
        >
          <img src="/logo.png" alt="CARXEN" className="logo-img" style={{ height: '36px', width: 'auto' }} />
        </Link>
        <button className="xb" id="menuX" onClick={closeMobileMenu} aria-label="Close">
          <svg viewBox="0 0 24 24" style={{ stroke: '#fff' }}>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <nav className="wrap">
        {isWholesaleMode ? (
          <>
            <Link href="/wholesale" onClick={closeMobileMenu} style={{ transitionDelay: '.1s' }}>
              <i>01</i>Wholesale Dashboard
            </Link>
            <Link href="/wholesale/catalog" onClick={closeMobileMenu} style={{ transitionDelay: '.16s' }}>
              <i>02</i>Wholesale Catalogue
            </Link>
            <Link href="/wholesale/quick-order" onClick={closeMobileMenu} style={{ transitionDelay: '.22s' }}>
              <i>03</i>Quick Order Matrix
            </Link>
            <Link href="/wholesale/order-basket" onClick={closeMobileMenu} style={{ transitionDelay: '.28s' }}>
              <i>04</i>Order Basket
            </Link>
            <Link href="/wholesale/orders" onClick={closeMobileMenu} style={{ transitionDelay: '.34s' }}>
              <i>05</i>Wholesale Orders
            </Link>
            <Link href="/wholesale/quotes" onClick={closeMobileMenu} style={{ transitionDelay: '.40s' }}>
              <i>06</i>Saved Lists & Quotes
            </Link>
            <Link href="/wholesale/account" onClick={closeMobileMenu} style={{ transitionDelay: '.46s' }}>
              <i>07</i>Business Account
            </Link>
            <button
              type="button"
              onClick={async () => {
                closeMobileMenu();
                await logout();
                router.push('/login');
              }}
              style={{
                transitionDelay: '.52s',
                background: 'none',
                border: 'none',
                color: '#ef4444',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                cursor: 'pointer',
                font: 'inherit',
                padding: '12px 0'
              }}
            >
              <i style={{ color: '#ef4444' }}>08</i>Sign out
            </button>
          </>
        ) : isLandingPage ? (
          <>
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
            <Link href="/wholesale" onClick={closeMobileMenu} style={{ transitionDelay: '.45s' }}>
              <i>06</i>Wholesale Portal
            </Link>
            <Link href="/shop" onClick={closeMobileMenu} style={{ transitionDelay: '.52s' }}>
              <i>07</i>Shop now
            </Link>
          </>
        ) : (
          <>
            <Link href="/shop" onClick={closeMobileMenu} style={{ transitionDelay: '.1s' }}>
              <i>01</i>All Parts
            </Link>
            <Link href="/garage" onClick={closeMobileMenu} style={{ transitionDelay: '.18s' }}>
              <i>02</i>My Garage ({activeCar.m})
            </Link>
            <Link href="/account?tab=orders" onClick={closeMobileMenu} style={{ transitionDelay: '.26s' }}>
              <i>03</i>Track Order
            </Link>
            <Link href="/wishlist" onClick={closeMobileMenu} style={{ transitionDelay: '.34s' }}>
              <i>04</i>Wishlist
            </Link>
            <Link href={user ? '/account' : '/login'} onClick={closeMobileMenu} style={{ transitionDelay: '.42s' }}>
              <i>05</i>{user ? 'My Account' : 'Log in'}
            </Link>
            <Link href="/" onClick={closeMobileMenu} style={{ transitionDelay: '.50s' }}>
              <i>06</i>Back to Home
            </Link>
          </>
        )}
      </nav>
    </div>
  );
}

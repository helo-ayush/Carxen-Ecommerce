'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export function Header() {
  const { user, fav, cartCount, openCart, openMobileMenu, storefrontConfig } = useApp();
  const announcementConfig = storefrontConfig?.announcement;
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [cartBump, setCartBump] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (cartCount > 0) {
      setCartBump(true);
      const timer = setTimeout(() => setCartBump(false), 450);
      return () => clearTimeout(timer);
    }
  }, [cartCount]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      router.push(`/shop?q=${encodeURIComponent(searchVal.trim())}`);
    } else {
      router.push('/shop');
    }
  };

    const showAnnouncement = announcementConfig ? announcementConfig.enabled !== false : true;

  return (
    <div className="top-nav-shell">
      {showAnnouncement && (
        <div className="ann">
          <div className="ann-inner">
            {announcementConfig?.badge ? (
              <span className="ann-badge">{announcementConfig.badge}</span>
            ) : (
              <span className="ann-badge">LIMITED OFFER</span>
            )}
            <span className="ann-text">
              {announcementConfig?.text ||
                '2-Year Warranty & Free Express Shipping Across India on all orders'}
            </span>
            {announcementConfig?.linkUrl && (
              <Link href={announcementConfig.linkUrl} className="ann-link">
                <span>Explore</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            )}
          </div>
        </div>
      )}
      <header id="hdr" className={isScrolled ? 'sc' : ''}>
        <div className="wrap hd">
          <Link href="/" className="logo logo-link" aria-label="CARXEN Homepage">
            <img src="/logo.png" alt="CARXEN" className="logo-img" />
          </Link>
          <nav className="main">
            <Link href="/#categories">Product</Link>
            <Link href="/#craft">Craft</Link>
            <Link href="/#shop">Explore</Link>
            <Link href="/#fitment">Vehicles</Link>
            <Link href="/#reviews">Reviews</Link>
          </nav>
          <form className="hd-search" onSubmit={handleSearchSubmit}>
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4-4" />
            </svg>
            <input
              type="search"
              placeholder="Search products…"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              aria-label="Search products"
            />
          </form>
          <div className="hd-tools">
            <Link href="/wishlist" className="tool fav" id="favBtn" aria-label="Favourites">
              <svg viewBox="0 0 24 24">
                <path d="M12 20s-7-4.6-9-9A5.2 5.2 0 0 1 12 6.4 5.2 5.2 0 0 1 21 11c-2 4.4-9 9-9 9z" />
              </svg>
              <span className="lbl">Favourites</span>
              <span className={`badge-n ${fav.length > 0 ? 'on' : ''}`} id="favN">
                {fav.length}
              </span>
            </Link>
            <button className="tool" id="cartBtn" onClick={openCart} aria-label="Open cart">
              <svg viewBox="0 0 24 24">
                <path d="M6 8h12l1 12H5L6 8z" />
                <path d="M9 8V6a3 3 0 0 1 6 0v2" />
              </svg>
              <span className="lbl">Cart</span>
              <span className={`badge-n ${cartCount > 0 ? 'on' : ''} ${cartBump ? 'bump' : ''}`} id="cartN">
                {cartCount}
              </span>
            </button>
            <Link
              href={user ? '/account' : '/login'}
              className={`tool ${user ? 'on' : ''}`}
              id="acct"
              title={user ? `${user.name} — My account` : 'Log in'}
              aria-label="Account"
              style={{ overflow: 'hidden' }}
            >
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
                </svg>
              )}
            </Link>
            <Link href="/shop" className="sn">
              Shop now
            </Link>
            <button className="tool burger" id="burger" onClick={openMobileMenu} aria-label="Menu">
              <svg viewBox="0 0 24 24">
                <path d="M3 7h18M3 12h18M3 17h18" />
              </svg>
            </button>
          </div>
        </div>
      </header>
    </div>
  );
}

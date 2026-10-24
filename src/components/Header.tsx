'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { WholesaleIcon, WholesaleMark } from '@/components/wholesale/WholesaleIcon';
import { RefreshCw } from 'lucide-react';

function HeaderContent() {
  const {
    user,
    authLoading,
    fav,
    cartCount,
    openCart,
    openMobileMenu,
    storefrontConfig,
    car,
    isWholesaleApproved,
    isWholesalePending,
    b2bProfile,
    wholesaleBasketSkuCount,
    setWorkspaceMode,
    logout,
    showToast,
    refreshCustomerProfile,
  } = useApp();
  const announcementConfig = storefrontConfig?.announcement;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isLandingPage = pathname === '/';
  const isShopPage = pathname === '/shop' || pathname.startsWith('/shop/');
  const currentQuery = searchParams.get('q') || '';
  const activeCar = car || { b: 'Hyundai', m: 'Creta', y: '2024', f: 'Petrol' };

  const [isScrolled, setIsScrolled] = useState(false);
  const [isRibbonHidden, setIsRibbonHidden] = useState(false);
  const [searchVal, setSearchVal] = useState(currentQuery);
  const [cartBump, setCartBump] = useState(false);
  const [favBump, setFavBump] = useState(false);
  const [checkingWholesaleStatus, setCheckingWholesaleStatus] = useState(false);

  const handleCheckWholesaleStatus = async () => {
    if (checkingWholesaleStatus) return;
    setCheckingWholesaleStatus(true);
    try {
      await refreshCustomerProfile();
      showToast('Application status checked: Commercial review is currently in progress.');
    } catch {
      showToast('Application is currently under commercial review.');
    } finally {
      setTimeout(() => setCheckingWholesaleStatus(false), 600);
    }
  };

  useEffect(() => {
    setSearchVal(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let accumulatedDelta = 0;
    let isHidden = false;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          setIsScrolled(currentScrollY > 20);

          // On mobile screens (<= 768px), keep the offer strip static and stable.
          // Disabling auto-hide on mobile completely eliminates touch-scroll layout jitter,
          // scroll anchoring feedback loops, and height bouncing.
          if (window.innerWidth <= 768) {
            if (isHidden) {
              isHidden = false;
              setIsRibbonHidden(false);
            }
            accumulatedDelta = 0;
            lastScrollY = currentScrollY;
            ticking = false;
            return;
          }

          // 1. Safe zone near the top: always keep the ribbon visible
          if (currentScrollY <= 80) {
            if (isHidden) {
              isHidden = false;
              setIsRibbonHidden(false);
            }
            accumulatedDelta = 0;
            lastScrollY = currentScrollY;
            ticking = false;
            return;
          }

          const diff = currentScrollY - lastScrollY;

          // If scroll direction reversed, reset delta accumulator
          if ((diff > 0 && accumulatedDelta < 0) || (diff < 0 && accumulatedDelta > 0)) {
            accumulatedDelta = 0;
          }
          accumulatedDelta += diff;

          // 2. Downward scroll: require at least 50px continuous downward scroll past 120px
          if (accumulatedDelta > 50 && currentScrollY > 120 && !isHidden) {
            isHidden = true;
            setIsRibbonHidden(true);
            accumulatedDelta = 0;
          }
          // 3. Upward scroll: require at least 40px continuous upward scroll to reveal
          else if (accumulatedDelta < -40 && isHidden) {
            isHidden = false;
            setIsRibbonHidden(false);
            accumulatedDelta = 0;
          }

          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    const handleResize = () => {
      if (window.innerWidth <= 768 && isHidden) {
        isHidden = false;
        setIsRibbonHidden(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (cartCount > 0) {
      setCartBump(true);
      const timer = setTimeout(() => setCartBump(false), 450);
      return () => clearTimeout(timer);
    }
  }, [cartCount]);

  useEffect(() => {
    if (fav.length > 0) {
      setFavBump(true);
      const timer = setTimeout(() => setFavBump(false), 450);
      return () => clearTimeout(timer);
    }
  }, [fav.length]);

  // Real-time synchronization when user is on the Shop page
  useEffect(() => {
    if (!isShopPage) return;
    const timer = setTimeout(() => {
      const trimmed = searchVal.trim();
      const currentParam = searchParams.get('q') || '';
      if (trimmed !== currentParam) {
        const params = new URLSearchParams(searchParams.toString());
        if (trimmed) {
          params.set('q', trimmed);
        } else {
          params.delete('q');
        }
        const qs = params.toString();
        router.replace(`/shop${qs ? `?${qs}` : ''}`, { scroll: false });
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchVal, isShopPage, searchParams, router]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchVal.trim();
    const params = new URLSearchParams(searchParams.toString());
    if (trimmed) {
      params.set('q', trimmed);
    } else {
      params.delete('q');
    }
    const qs = params.toString();
    router.push(`/shop${qs ? `?${qs}` : ''}`);
  };

  const showAnnouncement = announcementConfig ? announcementConfig.enabled !== false : true;
  const isWholesaleMode = pathname.startsWith('/wholesale');

  useEffect(() => {
    if (isWholesaleMode && !authLoading) {
      if (!user) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname || '/wholesale')}`);
      } else if (pathname !== '/wholesale' && !isWholesaleApproved) {
        router.replace('/wholesale');
      }
    }
  }, [authLoading, isWholesaleApproved, isWholesaleMode, pathname, router, user]);

  /* ==========================================================================
     DEDICATED WHOLESALE MODE
     No redundant top navbar duplicating the sidebar; sidebar is full-height
     anchored from top: 0 with the original CARXEN logo.
     ========================================================================== */
  if (isWholesaleMode) {
    return (
      <>
        {/* Mobile Header (Hidden on Desktop, only shown on screens <= 768px) */}
        <header className="wholesale-mobile-header" aria-label="Wholesale Navigation">
          <Link href="/" className="logo logo-link" aria-label="CARXEN Homepage">
            <img src="/logo.png" alt="CARXEN" className="logo-img" />
          </Link>
          <span className="wholesale-brand-tag" style={{ marginLeft: '4px' }}>B2B</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isWholesaleApproved && (
              <Link
                href="/wholesale/order-basket"
                className="wholesale-mobile-basket-btn"
                aria-label={`Order Basket with ${wholesaleBasketSkuCount} items`}
              >
                <WholesaleIcon name="basket" size={20} />
                {wholesaleBasketSkuCount > 0 && (
                  <span className="ws-sidebar-count">{wholesaleBasketSkuCount}</span>
                )}
              </Link>
            )}
            <button className="tool burger" id="burger" onClick={openMobileMenu} aria-label="Menu">
              <svg viewBox="0 0 24 24">
                <path d="M3 7h18M3 12h18M3 17h18" />
              </svg>
            </button>
          </div>
        </header>

        {/* Full-Height Left Rail Sidebar (top: 0 to bottom: 0) */}
        <aside className="wholesale-sidebar" aria-label="Wholesale workspace navigation">
          {/* Brand Area with ORIGINAL CARXEN LOGO */}
          <div className="wholesale-sidebar-brand">
            <Link href="/" className="wholesale-sidebar-brand-link" aria-label="CARXEN Homepage">
              <img src="/logo.png" alt="CARXEN" className="wholesale-sidebar-logo-img" />
            </Link>
            <span className="wholesale-sidebar-b2b-badge">B2B PORTAL</span>
          </div>

          <div className={`wholesale-sidebar-status ${isWholesaleApproved ? 'status-approved' : 'status-pending'}`}>
            <span className="wholesale-status-ping" />
            <span className="wholesale-status-text">
              {isWholesaleApproved
                ? (b2bProfile?.wholesaleTier === 'tier2' ? 'Tier 2 · 25% Margin' : 'Tier 1 · 15% Margin')
                : (isWholesalePending ? 'Verification Pending' : 'Registration Required')}
            </span>
          </div>

          {!isWholesaleApproved && (
            <button
              type="button"
              className="wholesale-sidebar-check-status-btn"
              disabled={checkingWholesaleStatus}
              onClick={handleCheckWholesaleStatus}
              title="Check wholesale verification status"
            >
              <RefreshCw size={13} className={checkingWholesaleStatus ? 'ws-spin' : ''} />
              <span>{checkingWholesaleStatus ? 'Checking Status...' : 'Check Status'}</span>
            </button>
          )}

          <div className="wholesale-nav-group">
            <div className="wholesale-sidebar-label">Procurement</div>
            {[
              ['/wholesale', 'Overview', 'warehouse'],
              ['/wholesale/catalog', 'Catalogue', 'catalogue'],
              ['/wholesale/quick-order', 'Quick Order Matrix', 'quick-order'],
              ['/wholesale/order-basket', 'Order Basket', 'basket'],
            ].map(([href, label, icon]) => {
              const active = href === '/wholesale' ? pathname === href : pathname.startsWith(href);
              const isLocked = !isWholesaleApproved && href !== '/wholesale';

              if (isLocked) {
                return (
                  <button
                    type="button"
                    key={href}
                    onClick={() => {
                      router.push('/wholesale');
                      showToast('Wholesale procurement is strictly restricted to verified commercial partners.');
                    }}
                    className="wholesale-sidebar-link locked"
                    title="Commercial partner verification required"
                  >
                    <WholesaleIcon name={icon as any} size={18} />
                    <span>{label}</span>
                    <span className="ws-locked-badge">🔒</span>
                  </button>
                );
              }

              return (
                <Link href={href} key={href} className={`wholesale-sidebar-link ${active ? 'active' : ''}`}>
                  <WholesaleIcon name={icon as any} size={18} />
                  <span>{label}</span>
                  {href === '/wholesale/order-basket' && wholesaleBasketSkuCount > 0 ? (
                    <span className="ws-sidebar-count">{wholesaleBasketSkuCount}</span>
                  ) : null}
                </Link>
              );
            })}
          </div>

          <div className="wholesale-nav-group">
            <div className="wholesale-sidebar-label">Management</div>
            {[
              ['/wholesale/orders', 'Wholesale Orders', 'orders'],
              ['/wholesale/quotes', 'Saved Assortments', 'lists'],
              ['/wholesale/account', 'Business Account', 'account'],
            ].map(([href, label, icon]) => {
              const active = pathname.startsWith(href);
              const isLocked = !isWholesaleApproved;

              if (isLocked) {
                return (
                  <button
                    type="button"
                    key={href}
                    onClick={() => {
                      router.push('/wholesale');
                      showToast('Wholesale management is strictly restricted to verified commercial partners.');
                    }}
                    className="wholesale-sidebar-link locked"
                    title="Commercial partner verification required"
                  >
                    <WholesaleIcon name={icon as any} size={18} />
                    <span>{label}</span>
                    <span className="ws-locked-badge">🔒</span>
                  </button>
                );
              }

              return (
                <Link href={href} key={href} className={`wholesale-sidebar-link ${active ? 'active' : ''}`}>
                  <WholesaleIcon name={icon as any} size={18} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          <div className="wholesale-sidebar-spacer" />

          {/* CarXen Commercial Desk in Sidebar */}
          <div className="wholesale-sidebar-card ws-sidebar-commercial-desk">
            <div className="ws-sidebar-card-header">
              <WholesaleIcon name="phone" size={14} />
              <span>CarXen Commercial Desk</span>
            </div>
            <p className="ws-sidebar-desk-desc">
              Custom vehicle orders, bulk proformas & priority allocation
            </p>
            <div className="ws-sidebar-desk-phone">
              +91 98765 43210
            </div>
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noopener noreferrer"
              className="ws-sidebar-desk-wa-btn"
            >
              <span>WhatsApp Commercial Desk</span>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>

          {/* Clean Logout button replacing Personal Shopping */}
          <button
            type="button"
            className="wholesale-sidebar-logout-btn"
            onClick={async () => {
              await logout();
              router.push('/login');
            }}
            aria-label="Sign out of Wholesale Workspace"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign out</span>
          </button>
        </aside>
      </>
    );
  }

  return (
    <div className={`top-nav-shell ${isRibbonHidden ? 'ribbon-hidden' : 'ribbon-visible'}`}>
      {/* RETAIL BANNER */}
      {showAnnouncement && (
        <div className={`ann ${isRibbonHidden ? 'ann-hidden' : ''}`}>
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

            {/* LANDING PAGE: Section Anchor Navigation */}
            {isLandingPage ? (
              <nav className="main">
                <Link href="/#categories">Product</Link>
                <Link href="/#craft">Craft</Link>
                <Link href="/#shop">Explore</Link>
                <Link href="/#fitment">Vehicles</Link>
                <Link href="/#reviews">Reviews</Link>
              </nav>
            ) : (
              /* SHOP / STORE PAGES: Centered Search Bar */
              <div className="hd-center-search">
                <form className="hd-search hd-search-expanded" onSubmit={handleSearchSubmit}>
                  <svg viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-4-4" />
                  </svg>
                  <input
                    type="search"
                    placeholder={`Search parts for your ${activeCar.m}…`}
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                    aria-label={`Search parts for ${activeCar.m}`}
                  />
                  {searchVal && (
                    <button
                      type="button"
                      className="hd-search-clear"
                      onClick={() => {
                        setSearchVal('');
                        if (isShopPage) {
                          router.push('/shop');
                        }
                      }}
                      aria-label="Clear search"
                    >
                      <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  )}
                </form>
              </div>
            )}

            {/* Retail Tools */}
            <div className="hd-tools" style={isLandingPage ? { marginLeft: 'auto' } : undefined}>

              {isLandingPage && (
                <Link href="/shop" className="tool mobile-search-access" aria-label="Search products">
                  <svg viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-4-4" />
                  </svg>
                </Link>
              )}
              {!isLandingPage && (
                <>
                  <Link
                    href="/account?tab=garage"
                    className="tool vehicle-tool"
                    id="vehBtn"
                    aria-label={`Change vehicle: ${activeCar.y} ${activeCar.b} ${activeCar.m}`}
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                      <circle cx="7" cy="17" r="2" />
                      <path d="M9 17h6" />
                      <circle cx="17" cy="17" r="2" />
                    </svg>
                    <span className="veh-status-dot" />
                    <div className="veh-hover-tooltip" role="tooltip">
                      <span className="veh-tt-title">Change Vehicle</span>
                      <span className="veh-tt-sub">
                        <span className="veh-tt-dot" />
                        <span>{activeCar.y} {activeCar.b} {activeCar.m}</span>
                      </span>
                    </div>
                  </Link>
                  <Link href="/wishlist" className={`tool fav ${favBump ? 'bump' : ''}`} id="favBtn" aria-label="Favourites">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 20s-7-4.6-9-9A5.2 5.2 0 0 1 12 6.4 5.2 5.2 0 0 1 21 11c-2 4.4-9 9-9 9z" />
                    </svg>
                    <span className="lbl">Favourites</span>
                    <span className={`badge-n ${fav.length > 0 ? 'on' : ''} ${favBump ? 'bump' : ''}`} id="favN">
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
                </>
              )}

              {/* 'Shop now' button: only on landing page; removed on shop page */}
              {isLandingPage && (
                <Link href="/shop" className="sn">
                  Shop now
                </Link>
              )}

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

export function Header() {
  return (
    <Suspense
      fallback={
        <div className="top-nav-shell ribbon-visible">
          <header id="hdr" style={{ height: '72px' }}>
            <div className="wrap hd">
              <Link href="/" className="logo logo-link" aria-label="CARXEN Homepage">
                <img src="/logo.png" alt="CARXEN" className="logo-img" />
              </Link>
            </div>
          </header>
        </div>
      }
    >
      <HeaderContent />
    </Suspense>
  );
}

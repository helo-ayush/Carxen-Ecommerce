'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { WholesaleIcon } from '@/components/wholesale/WholesaleIcon';
import {
  RefreshCw,
  LayoutDashboard,
  Grid,
  Zap,
  ShoppingBag,
  Package,
  Bookmark,
  Building2,
  ExternalLink,
  Store,
  LogOut,
  ShieldCheck,
  Clock,
  ChevronRight,
  PhoneCall,
} from 'lucide-react';

export function MobileMenu() {
  const router = useRouter();
  const {
    isMobileMenuOpen,
    closeMobileMenu,
    user,
    car,
    logout,
    isWholesaleApproved,
    isWholesalePending,
    b2bProfile,
    wholesaleBasketSkuCount,
    refreshCustomerProfile,
    showToast,
  } = useApp();
  const pathname = usePathname();
  const isLandingPage = pathname === '/';
  const activeCar = car || { b: 'Hyundai', m: 'Creta', y: '2024', f: 'Petrol' };

  const isWholesaleMode = pathname.startsWith('/wholesale') || pathname.startsWith('/b2b');

  const partnerName = b2bProfile?.businessName || user?.name || 'Verified Wholesale Partner';
  const tierName = 'Verified Wholesale Partner';

  return (
    <div className={`menu ${isWholesaleMode ? 'b2b-mobile-drawer' : ''} ${isMobileMenuOpen ? 'on' : ''}`} id="menu">
      <div className="wrap menu-top" style={{ width: '100%', display: 'flex' }}>
        <Link
          href="/"
          onClick={closeMobileMenu}
          className="logo logo-link"
          aria-label="CARXEN Homepage"
        >
          <img src="/logo.png" alt="CARXEN" className="logo-img" style={{ height: '34px', width: 'auto' }} />
        </Link>
        {isWholesaleMode && (
          <span className="wholesale-brand-tag" style={{ marginLeft: '6px' }}>
            B2B PORTAL
          </span>
        )}
        <button className="xb" id="menuX" onClick={closeMobileMenu} aria-label="Close menu">
          <svg viewBox="0 0 24 24" style={{ stroke: '#fff' }}>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {isWholesaleMode ? (
        <div className="b2b-drawer-body">
          {/* Partner Status Card */}
          <div className="b2b-drawer-partner-card">
            <div className="b2b-drawer-partner-header">
              <div className="b2b-drawer-partner-avatar">
                <Building2 size={20} />
              </div>
              <div className="b2b-drawer-partner-info">
                <div className="b2b-drawer-partner-title">{partnerName}</div>
                <div className="b2b-drawer-partner-subtitle">
                  {b2bProfile?.gstin ? `GSTIN: ${b2bProfile.gstin}` : user?.email || 'Commercial Account'}
                </div>
              </div>
            </div>

            <div className={`b2b-drawer-tier-pill ${isWholesaleApproved ? 'approved' : 'pending'}`}>
              <span className="b2b-drawer-tier-dot" />
              <span>
                {isWholesaleApproved
                  ? tierName
                  : isWholesalePending
                  ? 'Verification Under Review'
                  : 'Wholesale Application Required'}
              </span>
            </div>

            {!isWholesaleApproved && (
              <button
                type="button"
                className="b2b-drawer-check-status-btn"
                onClick={async () => {
                  try {
                    await refreshCustomerProfile();
                    showToast('Application status checked: Commercial review is currently in progress.');
                  } catch {
                    showToast('Application is currently under commercial review.');
                  }
                }}
              >
                <RefreshCw size={14} />
                <span>Check Live Status</span>
              </button>
            )}
          </div>

          {/* Section 1: Procurement Matrix */}
          <div className="b2b-drawer-section">
            <div className="b2b-drawer-section-label">Procurement Workspace</div>

            <Link
              href="/wholesale"
              onClick={closeMobileMenu}
              className={`b2b-drawer-item ${pathname === '/wholesale' ? 'active' : ''}`}
            >
              <div className="b2b-drawer-item-icon">
                <LayoutDashboard size={18} />
              </div>
              <div className="b2b-drawer-item-text">
                <strong>Dashboard Overview</strong>
                <span>Metrics, stock updates & desk notifications</span>
              </div>
              <ChevronRight size={16} className="b2b-drawer-arrow" />
            </Link>

            <Link
              href="/wholesale/catalog"
              onClick={closeMobileMenu}
              className={`b2b-drawer-item ${pathname.startsWith('/wholesale/catalog') || pathname.startsWith('/wholesale/product') ? 'active' : ''}`}
            >
              <div className="b2b-drawer-item-icon">
                <Grid size={18} />
              </div>
              <div className="b2b-drawer-item-text">
                <strong>Wholesale Catalogue</strong>
                <span>All vehicle fitments & tiered MOQ prices</span>
              </div>
              <ChevronRight size={16} className="b2b-drawer-arrow" />
            </Link>

            <Link
              href="/wholesale/quick-order"
              onClick={closeMobileMenu}
              className={`b2b-drawer-item ${pathname.startsWith('/wholesale/quick-order') ? 'active' : ''}`}
            >
              <div className="b2b-drawer-item-icon">
                <Zap size={18} />
              </div>
              <div className="b2b-drawer-item-text">
                <strong>Quick Order Matrix</strong>
                <span>Rapid bulk SKU entry & one-click MOQ fill</span>
              </div>
              <span className="b2b-drawer-badge-pill">Rapid</span>
            </Link>

            <Link
              href="/wholesale/order-basket"
              onClick={closeMobileMenu}
              className={`b2b-drawer-item ${pathname.startsWith('/wholesale/order-basket') ? 'active' : ''}`}
            >
              <div className="b2b-drawer-item-icon">
                <ShoppingBag size={18} />
              </div>
              <div className="b2b-drawer-item-text">
                <strong>Order Basket</strong>
                <span>Review drafted lines & confirm PO</span>
              </div>
              {wholesaleBasketSkuCount > 0 ? (
                <span className="b2b-drawer-count-badge">{wholesaleBasketSkuCount}</span>
              ) : (
                <ChevronRight size={16} className="b2b-drawer-arrow" />
              )}
            </Link>
          </div>

          {/* Section 2: Management & Commercial */}
          <div className="b2b-drawer-section">
            <div className="b2b-drawer-section-label">Management & Pipeline</div>

            <Link
              href="/wholesale/orders"
              onClick={closeMobileMenu}
              className={`b2b-drawer-item ${pathname.startsWith('/wholesale/orders') ? 'active' : ''}`}
            >
              <div className="b2b-drawer-item-icon">
                <Package size={18} />
              </div>
              <div className="b2b-drawer-item-text">
                <strong>Wholesale Orders</strong>
                <span>Factory pipeline milestones & dispatch tracking</span>
              </div>
              <ChevronRight size={16} className="b2b-drawer-arrow" />
            </Link>

            <Link
              href="/wholesale/quotes"
              onClick={closeMobileMenu}
              className={`b2b-drawer-item ${pathname.startsWith('/wholesale/quotes') ? 'active' : ''}`}
            >
              <div className="b2b-drawer-item-icon">
                <Bookmark size={18} />
              </div>
              <div className="b2b-drawer-item-text">
                <strong>Saved Assortments & Quotes</strong>
                <span>Fast movers & pre-packaged replenishment</span>
              </div>
              <ChevronRight size={16} className="b2b-drawer-arrow" />
            </Link>

            <Link
              href="/wholesale/account"
              onClick={closeMobileMenu}
              className={`b2b-drawer-item ${pathname.startsWith('/wholesale/account') ? 'active' : ''}`}
            >
              <div className="b2b-drawer-item-icon">
                <Building2 size={18} />
              </div>
              <div className="b2b-drawer-item-text">
                <strong>Business Account</strong>
                <span>Warehouse addresses, GSTIN & commercial terms</span>
              </div>
              <ChevronRight size={16} className="b2b-drawer-arrow" />
            </Link>
          </div>

          {/* Section 3: Commercial Assistance */}
          <div className="b2b-drawer-section">
            <div className="b2b-drawer-section-label">Commercial Support Desk</div>

            <a
              href="https://wa.me/919876543210?text=Hi%20CarXen%20Commercial%20Desk,%20I%20have%20an%20inquiry%20regarding%20wholesale%20procurement."
              target="_blank"
              rel="noopener noreferrer"
              className="b2b-drawer-support-card"
            >
              <div className="b2b-drawer-support-icon">
                <PhoneCall size={18} />
              </div>
              <div className="b2b-drawer-support-text">
                <strong>Wholesale WhatsApp Verification Desk</strong>
                <span>Mon–Sat 9:30 AM – 7:00 PM IST · +91 98765 43210</span>
              </div>
              <ExternalLink size={15} />
            </a>
          </div>

          {/* Bottom Actions: Switch to Retail & Sign out */}
          <div className="b2b-drawer-footer">
            <Link
              href="/shop"
              onClick={closeMobileMenu}
              className="b2b-drawer-switch-retail-btn"
            >
              <Store size={17} />
              <span>Switch to Retail Storefront</span>
            </Link>

            <button
              type="button"
              className="b2b-drawer-signout-btn"
              onClick={async () => {
                closeMobileMenu();
                await logout();
                router.push('/login');
              }}
            >
              <LogOut size={17} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      ) : (
        <nav className="wrap">
          {isLandingPage ? (
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
      )}
    </div>
  );
}


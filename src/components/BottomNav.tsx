'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';

const items = [
  { href: '/', label: 'Home', icon: <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z" /> },
  { href: '/shop', label: 'Shop', icon: <path d="M6 8h12l1 12H5L6 8Z M9 8V6a3 3 0 0 1 6 0v2" /> },
  { href: '/garage', label: 'Garage', icon: <path d="M4 17v-5l2-5h12l2 5v5M4 17h16M7 17v2m10-2v2M7 12h10" /> },
  { href: '/wishlist', label: 'Wishlist', icon: <path d="M12 20s-7-4.6-9-9A5.2 5.2 0 0 1 12 6.4 5.2 5.2 0 0 1 21 11c-2 4.4-9 9-9 9Z" /> },
  { href: '/account', label: 'Account', icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></> },
];

export function BottomNav() {
  const pathname = usePathname();
  const { fav, cartCount, car, user } = useApp();

  // Checkout has its own fixed payment action and should never be covered.
  if (pathname === '/checkout' || pathname.startsWith('/login') || pathname.startsWith('/auth')) return null;

  return (
    <nav className="cx-bottom-nav" aria-label="Primary mobile navigation">
      {items.map((item) => {
        const href = item.href === '/account' && !user ? '/login' : item.href;
        const active = item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const count = item.label === 'Wishlist' ? fav.length : item.label === 'Shop' ? cartCount : 0;
        const label = item.label === 'Garage' && car ? car.m : item.label;

        return (
          <Link key={item.label} href={href} className={`cx-bottom-nav-item ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
            <span className="cx-bottom-nav-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">{item.icon}</svg>
              {count > 0 && <span className="cx-bottom-nav-badge">{count > 99 ? '99+' : count}</span>}
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

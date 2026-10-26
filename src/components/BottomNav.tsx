'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';

const b2cItems = [
  { href: '/', label: 'Home', icon: <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z" /> },
  { href: '/shop', label: 'Shop', icon: <path d="M6 8h12l1 12H5L6 8Z M9 8V6a3 3 0 0 1 6 0v2" /> },
  { href: '/garage', label: 'Garage', icon: <path d="M4 17v-5l2-5h12l2 5v5M4 17h16M7 17v2m10-2v2M7 12h10" /> },
  { href: '/wishlist', label: 'Wishlist', icon: <path d="M12 20s-7-4.6-9-9A5.2 5.2 0 0 1 12 6.4 5.2 5.2 0 0 1 21 11c-2 4.4-9 9-9 9Z" /> },
  { href: '/account', label: 'Account', icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></> },
];

export function BottomNav() {
  const pathname = usePathname();
  const { fav, cartCount, car, user, wholesaleBasketSkuCount } = useApp();

  // Retail checkout and auth pages have dedicated fixed actions
  if (pathname === '/checkout' || pathname.startsWith('/login') || pathname.startsWith('/auth')) return null;

  const isWholesaleMode = pathname.startsWith('/wholesale') || pathname.startsWith('/b2b');

  if (isWholesaleMode) {
    const isAccountActive = pathname.startsWith('/wholesale/account');
    const isOrdersActive = pathname.startsWith('/wholesale/orders') || pathname.startsWith('/wholesale/quotes');

    const b2bItems = [
      {
        href: '/wholesale',
        label: 'Dashboard',
        active: pathname === '/wholesale' || pathname === '/b2b',
        count: 0,
        icon: <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5Z" />,
      },
      {
        href: '/wholesale/catalog',
        label: 'Catalogue',
        active: pathname.startsWith('/wholesale/catalog') || pathname.startsWith('/wholesale/product'),
        count: 0,
        icon: (
          <>
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
          </>
        ),
      },
      {
        href: '/wholesale/quick-order',
        label: 'Quick Order',
        active: pathname.startsWith('/wholesale/quick-order') || pathname.startsWith('/b2b/quick-order'),
        count: 0,
        icon: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
      },
      {
        href: '/wholesale/order-basket',
        label: 'Basket',
        active: pathname.startsWith('/wholesale/order-basket'),
        count: wholesaleBasketSkuCount,
        icon: (
          <>
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </>
        ),
      },
      {
        href: isAccountActive ? '/wholesale/account' : '/wholesale/orders',
        label: isAccountActive ? 'Account' : 'Orders',
        active: isAccountActive || isOrdersActive,
        count: 0,
        icon: isAccountActive ? (
          <>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
          </>
        ) : (
          <>
            <rect x="1" y="3" width="15" height="13" rx="1" />
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </>
        ),
      },
    ];

    return (
      <nav className="cx-bottom-nav cx-bottom-nav-b2b" aria-label="Wholesale mobile procurement navigation">
        {b2bItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`cx-bottom-nav-item ${item.active ? 'active' : ''}`}
            aria-current={item.active ? 'page' : undefined}
          >
            <span className="cx-bottom-nav-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {item.icon}
              </svg>
              {item.count > 0 && (
                <span className="cx-bottom-nav-badge">{item.count > 99 ? '99+' : item.count}</span>
              )}
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="cx-bottom-nav" aria-label="Primary mobile navigation">
      {b2cItems.map((item) => {
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


'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { PRODUCTS, formatINR } from '@/data/products';
import { Footer } from '@/components/Footer';

export default function AccountPage() {
  const router = useRouter();
  const { user, car, orders, logout } = useApp();

  const name = user?.name || 'Driver';

  const handleSignOut = () => {
    logout();
    router.push('/');
  };

  const reversedOrders = [...orders].reverse();

  return (
    <div className="in-shop">
      <section className="pp on" id="v-pg">
        <div className="wrap" id="pgIn">
          <h1 className="disp pg-t">Hi, {name}</h1>
          <div className="ac-g">
            {/* Left side: Profile & Garage */}
            <div>
              <div className="ck-b">
                <div className="ac-av">{name[0].toUpperCase()}</div>
                <h3 style={{ marginTop: '14px' }}>{name}</h3>
                <p className="gr-s">CARXEN Member</p>
                <button
                  className="btn dark"
                  onClick={handleSignOut}
                  style={{ marginTop: '14px' }}
                >
                  Sign out
                </button>
              </div>

              <div className="ck-b">
                <h3>My garage</h3>
                <p className="gr-s">
                  {car
                    ? `${car.y} ${car.b} ${car.m} · ${car.f}`
                    : 'No vehicle saved'}
                </p>
                <Link
                  className="btn"
                  href="/garage"
                  style={{ marginTop: '14px' }}
                >
                  {car ? 'Change vehicle' : 'Add vehicle'}
                </Link>
              </div>
            </div>

            {/* Right side: Orders */}
            <div>
              <h2 className="disp" style={{ fontSize: '2rem', marginBottom: '14px' }}>
                Orders
              </h2>
              {reversedOrders.length > 0 ? (
                reversedOrders.map((o) => (
                  <div className="pp-rc" key={o.id}>
                    <div className="pp-rh">
                      <b>#{o.id}</b>
                      <span>Confirmed</span>
                    </div>
                    <p className="gr-s" style={{ margin: '6px 0' }}>
                      {o.date} ·{' '}
                      {o.items
                        .map(([id, q]) => {
                          const p = PRODUCTS.find((x) => x.id === id);
                          return p ? `${p.n} × ${q}` : '';
                        })
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    <b>{formatINR(o.total)}</b>
                  </div>
                ))
              ) : (
                <div className="empty on">
                  <b>No orders yet</b>
                  Your orders will show up here once placed.
                  <br />
                  <br />
                  <Link className="btn dark" href="/shop">
                    Explore collection
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

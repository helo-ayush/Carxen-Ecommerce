'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Footer } from '@/components/Footer';

export default function AccountPage() {
  const router = useRouter();
  const { user, car, logout } = useApp();

  const name = user?.name || 'Driver';
  const email = user?.email;

  const handleSignOut = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="in-shop">
      <section className="pp on" id="v-pg">
        <div className="wrap" id="pgIn">
          <h1 className="disp pg-t">Hi, {name}</h1>
          <div className="ac-g">
            {/* Left side: Profile & Garage */}
            <div>
              <div className="ck-b">
                <div className="ac-av">{(name[0] || 'D').toUpperCase()}</div>
                <h3 style={{ marginTop: '14px' }}>{name}</h3>
                {email && (
                  <p className="gr-s" style={{ wordBreak: 'break-all', marginTop: '4px' }}>
                    {email}
                  </p>
                )}
                <p className="gr-s" style={{ marginTop: '4px' }}>
                  {user ? 'CARXEN Member' : 'Guest'}
                </p>
                {user ? (
                  <button
                    className="btn dark"
                    onClick={handleSignOut}
                    style={{ marginTop: '14px' }}
                  >
                    Sign out
                  </button>
                ) : (
                  <Link
                    className="btn dark"
                    href="/login"
                    style={{ marginTop: '14px' }}
                  >
                    Log in / Sign up
                  </Link>
                )}
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
              <div className="empty on">
                <b>No orders yet</b>
                Order history will appear here when authenticated customer order listing is connected.
                <br />
                <br />
                <Link className="btn dark" href="/shop">
                  Explore collection
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

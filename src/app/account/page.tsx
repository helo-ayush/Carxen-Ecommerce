'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Footer } from '@/components/Footer';

export default function AccountPage() {
  const router = useRouter();
  const { user, authLoading, car, logout } = useApp();

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
          {authLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <p className="gr-s">Loading account...</p>
            </div>
          ) : !user ? (
            <div
              style={{
                maxWidth: '520px',
                margin: '40px auto',
                background: 'var(--bg2, #f5f5f7)',
                border: '1px solid var(--line, #e5e5ea)',
                borderRadius: '24px',
                padding: '36px 30px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#e2231a',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '28px',
                  margin: '0 auto 18px',
                }}
              >
                🔒
              </div>
              <h1 className="disp" style={{ fontSize: '1.8rem', marginBottom: '8px' }}>
                Account access required
              </h1>
              <p style={{ color: 'var(--mute, #666)', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>
                Sign in to view your profile, manage your garage vehicles, and track your orders.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Link
                  className="btn dark"
                  href="/login?redirect=/account"
                  style={{ height: '48px', fontSize: '15px' }}
                >
                  Sign in with Email
                </Link>
                <Link
                  className="btn"
                  href="/shop"
                  style={{ height: '48px', fontSize: '15px' }}
                >
                  Continue browsing catalog
                </Link>
              </div>
            </div>
          ) : (
            <>
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
                    <p className="gr-s" style={{ marginTop: '4px', color: '#16a34a', fontWeight: 600 }}>
                      ✓ CARXEN Member
                    </p>
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
                  <div className="empty on">
                    <b>No past orders</b>
                    Orders placed with this account will appear here.
                    <br />
                    <br />
                    <Link className="btn dark" href="/shop">
                      Explore collection
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}

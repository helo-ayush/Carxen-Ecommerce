'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useApp();

  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [fullName, setFullName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = (nameVal?: string) => {
    login(nameVal || fullName.trim() || 'Driver');
    router.push('/shop');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSignIn(fullName);
  };

  return (
    <div className="ov on" id="v-login" role="dialog" aria-label="Log in">
      <div className="lg-w">
        <div className="lg-l">
          <Link href="/" className="logo">
            CAR<b>X</b>EN
          </Link>
          <div className="lg-ghost">X</div>
          <div className="lg-sw">
            <div className="lg-st">
              <div className="lg-art">
                <svg viewBox="0 0 320 400">
                  <use href="#a-seat" />
                </svg>
              </div>
              <span className="lg-b" style={{ top: '6%', left: '-22%' }}>
                <i style={{ background: '#e2231a' }}>AR</i>4.9/5{' '}
                <u style={{ color: '#f5a623', textDecoration: 'none' }}>★</u>
              </span>
              <span
                className="lg-b"
                style={{ top: '40%', right: '-26%', animationDelay: '-2s' }}
              >
                <i style={{ background: '#5d5d64' }}>PK</i>4.8/5{' '}
                <u style={{ color: '#f5a623', textDecoration: 'none' }}>★</u>
              </span>
              <span
                className="lg-b"
                style={{ bottom: '12%', left: '-18%', animationDelay: '-3.4s' }}
              >
                <i style={{ background: '#1b1b1e' }}>VM</i>5/5{' '}
                <u style={{ color: '#f5a623', textDecoration: 'none' }}>★</u>
              </span>
            </div>
          </div>
          <div>
            <h2 className="disp">
              Parts that fit
              <br />
              your car<span className="red">.</span>
            </h2>
            <p>Free shipping over ₹1,499 · 2-year warranty · 30-day returns</p>
          </div>
        </div>

        <div className="lg-r">
          <button
            className="xb lg-x"
            onClick={() => router.push('/')}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          <form className="lg-f" onSubmit={handleSubmit}>
            <h2 className="disp">
              {mode === 'up' ? 'Join CARXEN' : 'Welcome back'}
            </h2>
            <div className="lg-tabs">
              <button
                type="button"
                className={mode === 'in' ? 'on' : ''}
                onClick={() => setMode('in')}
              >
                Log in
              </button>
              <button
                type="button"
                className={mode === 'up' ? 'on' : ''}
                onClick={() => setMode('up')}
              >
                Sign up
              </button>
            </div>

            {mode === 'up' && (
              <input
                className="lg-in"
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="off"
              />
            )}
            <input
              className="lg-in"
              placeholder="Phone number or email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="off"
            />
            <input
              className="lg-in"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
            />

            <button className="lg-go" type="submit">
              {mode === 'up' ? 'Create account' : 'Log in'}
            </button>

            <div className="lg-or">or</div>

            <button
              className="lg-alt"
              type="button"
              onClick={() => handleSignIn('Aarav Mehta')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.6a4.8 4.8 0 0 1-2 3.1v2.6h3.3c2-1.8 3.1-4.4 3.1-7.5z"
                />
                <path
                  fill="#34A853"
                  d="M12 22c2.7 0 5-.9 6.6-2.4l-3.3-2.6c-.9.6-2 1-3.3 1-2.6 0-4.7-1.7-5.5-4.1H3.1v2.6A10 10 0 0 0 12 22z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.5 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.5 14z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.5 10c.8-2.4 2.9-4.1 5.5-4.1z"
                />
              </svg>
              Continue with Google
            </button>

            <p className="lg-note">
              Demo mode — tap the button, no details needed.{' '}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleSignIn('Guest');
                }}
              >
                Continue as guest
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loginWithEmail, signUpWithEmail, logout, showToast, signInWithGoogle, login } = useApp();

  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const redirectUrl = searchParams.get('redirect') || searchParams.get('next') || '/account';

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      const errorMap: Record<string, string> = {
        auth_failed: 'Authentication could not be completed. Please try again.',
        unverified_email: 'Your Google email is not verified. Please verify your Google account before signing in.',
        no_code: 'No authorization code returned from Google. Please try again.',
      };
      setErrorMessage(errorMap[errorParam] || decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      router.push(redirectUrl);
    }
  }, [user, redirectUrl, router]);

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setIsGoogleLoading(true);

    try {
      const res = await signInWithGoogle(redirectUrl);
      if (res?.error) {
        setErrorMessage(res.error);
        setIsGoogleLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to initialize Google sign-in.');
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (mode === 'up') {
      if (!fullName.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (confirmPassword && password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }

      setLoading(true);
      const res = await signUpWithEmail(trimmedEmail, password, fullName.trim());
      setLoading(false);

      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.requiresEmailConfirmation) {
        setInfoMessage('Verification email sent! Check your inbox to confirm your account.');
      } else {
        router.push(redirectUrl);
      }
    } else {
      setLoading(true);
      const res = await loginWithEmail(trimmedEmail, password);
      setLoading(false);

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        router.push(redirectUrl);
      }
    }
  };

  return (
    <div className="ov on" id="v-login" role="dialog" aria-label="Log in">
      <div className="lg-w">
        <div className="lg-l">
          <Link href="/" className="logo logo-link" aria-label="CARXEN Homepage">
            <img src="/logo.png" alt="CARXEN" className="logo-img" style={{ height: '42px', width: 'auto' }} />
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
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                router.push('/');
              }
            }}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          <div className="lg-f">
            {user ? (
              <div
                style={{
                  background: 'var(--bg2, #f5f5f7)',
                  border: '1px solid var(--line, #e5e5ea)',
                  borderRadius: '20px',
                  padding: '24px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'var(--ink, #111)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 700,
                    margin: '0 auto 16px',
                  }}
                >
                  {(user.name[0] || 'D').toUpperCase()}
                </div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '6px' }}>
                  Already signed in
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--mute, #777)', marginBottom: '6px' }}>
                  Signed in as <strong>{user.name}</strong>
                </p>
                {user.email && (
                  <p style={{ fontSize: '13px', color: 'var(--mute, #777)', marginBottom: '18px' }}>
                    {user.email}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button
                    className="btn dark"
                    onClick={() => router.push(redirectUrl)}
                    style={{ flex: 1, height: '46px' }}
                  >
                    Continue to {redirectUrl.includes('checkout') ? 'Checkout' : 'Account'}
                  </button>
                  <button
                    className="btn"
                    onClick={() => logout()}
                    style={{ flex: 1, height: '46px' }}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {redirectUrl.includes('checkout') && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      background: '#fee2e2',
                      color: '#b91c1c',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: 600,
                      marginBottom: '10px',
                    }}
                  >
                    <span>🔒 Sign in required to place order</span>
                  </div>
                )}
                {redirectUrl.includes('ppRv') && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      background: '#fef3c7',
                      color: '#92400e',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: 600,
                      marginBottom: '10px',
                    }}
                  >
                    <span>✍️ Sign in required to write a review</span>
                  </div>
                )}
                <h2 className="disp">
                  {mode === 'up' ? 'Join CARXEN' : 'Welcome back'}
                </h2>
                <div className="lg-tabs">
                  <button
                    type="button"
                    className={mode === 'in' ? 'on' : ''}
                    onClick={() => {
                      setMode('in');
                      setErrorMessage(null);
                      setInfoMessage(null);
                    }}
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    className={mode === 'up' ? 'on' : ''}
                    onClick={() => {
                      setMode('up');
                      setErrorMessage(null);
                      setInfoMessage(null);
                    }}
                  >
                    Sign up
                  </button>
                </div>

                {errorMessage && (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: '#fef2f2',
                      border: '1px solid #fee2e2',
                      color: '#b91c1c',
                      fontSize: '13px',
                      lineHeight: '1.4',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flexShrink: 0, marginTop: '2px' }}
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{errorMessage}</span>
                  </div>
                )}

                {infoMessage && (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: '#ecfdf5',
                      border: '1px solid #d1fae5',
                      color: '#065f46',
                      fontSize: '13px',
                      lineHeight: '1.4',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flexShrink: 0, marginTop: '2px' }}
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span>{infoMessage}</span>
                  </div>
                )}

                {mode === 'up' && (
                  <input
                    className="lg-in"
                    type="text"
                    placeholder="Full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                )}

                <input
                  className="lg-in"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />

                <input
                  className="lg-in"
                  type="password"
                  placeholder={mode === 'up' ? 'Password (min. 6 characters)' : 'Password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
                  required
                />

                {mode === 'up' && (
                  <input
                    className="lg-in"
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                )}

                <button
                  className="lg-go"
                  type="submit"
                  disabled={loading}
                  style={{
                    opacity: loading ? 0.75 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {loading ? (
                    <>
                      <span
                        style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: '#fff',
                          borderRadius: '50%',
                          display: 'inline-block',
                          animation: 'spin 0.8s linear infinite',
                        }}
                      />
                      <span>{mode === 'up' ? 'Creating account...' : 'Logging in...'}</span>
                    </>
                  ) : mode === 'up' ? (
                    'Create account'
                  ) : (
                    'Log in'
                  )}
                </button>

                <div className="lg-or">or</div>

                <button
                  className="lg-alt"
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading || isGoogleLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    position: 'relative',
                    cursor: isGoogleLoading ? 'wait' : 'pointer',
                    opacity: isGoogleLoading ? 0.75 : 1,
                  }}
                >
                  {isGoogleLoading ? (
                    <span
                      style={{
                        width: '18px',
                        height: '18px',
                        border: '2px solid rgba(0,0,0,0.15)',
                        borderTopColor: '#e2231a',
                        borderRadius: '50%',
                        display: 'inline-block',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                  ) : (
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
                  )}
                  <span>
                    {isGoogleLoading
                      ? 'Connecting to Google...'
                      : mode === 'up'
                      ? 'Sign up with Google'
                      : 'Continue with Google'}
                  </span>
                </button>

                <p className="lg-note">
                  Want to explore first?{' '}
                  <Link href="/shop" style={{ textDecoration: 'underline' }}>
                    Browse catalog without signing in
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="ov on" style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}

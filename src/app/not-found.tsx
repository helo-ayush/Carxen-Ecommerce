import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <p className="mono" style={{ color: 'var(--red, #e2231a)', letterSpacing: '0.2em' }}>
        404
      </p>
      <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', margin: 0 }}>
        Page not found
      </h1>
      <p style={{ maxWidth: '32rem', color: '#5d5d64', margin: 0 }}>
        The page you are looking for does not exist or has moved.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
        <Link href="/" className="btn-primary">
          Go home
        </Link>
        <Link href="/shop" className="btn-outline">
          Browse products
        </Link>
      </div>
    </main>
  );
}

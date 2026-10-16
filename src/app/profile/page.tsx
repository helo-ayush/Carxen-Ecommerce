'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ProfileRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(`/account${qs ? `?${qs}` : ''}`);
  }, [router, searchParams]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <p style={{ color: '#71717a', fontSize: '14px', fontFamily: 'monospace' }}>
        Loading your profile &amp; garage...
      </p>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
      <ProfileRedirectContent />
    </Suspense>
  );
}

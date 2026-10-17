'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function PwaSupport() {
  const pathname = usePathname();
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

    let interactions = 0;
    let timer: number | undefined;
    const engage = () => {
      interactions += 1;
      if (interactions < 2 || timer !== undefined) return;
      timer = window.setTimeout(() => {
        const dismissedUntil = Number(localStorage.getItem('cx_pwa_dismissed_until') || 0);
        const supportedIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandalone();
        if (!isStandalone() && Date.now() > dismissedUntil && (supportedIos || installEvent)) setShowPrompt(true);
      }, 1200);
    };

    document.addEventListener('click', engage, { passive: true });
    document.addEventListener('touchstart', engage, { passive: true });
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      document.removeEventListener('click', engage);
      document.removeEventListener('touchstart', engage);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [installEvent]);

  useEffect(() => {
    // Never interrupt authentication or payment flows.
    if (pathname === '/checkout' || pathname.startsWith('/login') || pathname.startsWith('/auth')) {
      setShowPrompt(false);
    }
  }, [pathname]);

  const dismiss = () => {
    localStorage.setItem('cx_pwa_dismissed_until', String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    setShowPrompt(false);
    setIosHelp(false);
  };

  const install = async () => {
    if (!installEvent) {
      setIosHelp(true);
      return;
    }
    await installEvent.prompt();
    const result = await installEvent.userChoice;
    if (result.outcome === 'accepted') setShowPrompt(false);
    setInstallEvent(null);
  };

  if (!showPrompt || pathname === '/checkout' || pathname.startsWith('/login') || pathname.startsWith('/auth')) return null;

  return (
    <aside className="cx-install-prompt" role="dialog" aria-label="Install CARXEN app">
      <div className="cx-install-icon"><Download size={18} aria-hidden="true" /></div>
      <div className="cx-install-copy">
        <strong>Shop CARXEN like an app</strong>
        {iosHelp ? (
          <span>In Safari, tap Share, then <b>Add to Home Screen</b>.</span>
        ) : (
          <span>Access your Garage, saved accessories, and cart directly from your home screen.</span>
        )}
      </div>
      <div className="cx-install-actions">
        <button type="button" className="cx-install-button" onClick={install}>{iosHelp ? 'Got it' : 'Install App'}</button>
        <button type="button" className="cx-install-dismiss" onClick={dismiss} aria-label="Not now"><X size={16} aria-hidden="true" /></button>
      </div>
    </aside>
  );
}

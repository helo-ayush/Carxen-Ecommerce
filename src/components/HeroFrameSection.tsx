'use client';

import { useEffect, useRef, useState } from 'react';
import { HERO_FRAME_FPS, HERO_FRAMES } from '@/data/heroFrames';

const HERO_MOBILE_VIDEO = '/hero-mobile.mp4';
const ANCHOR_STEP = 16;
const MAX_CONCURRENT_FETCHES = 6;
const MAX_ACTIVE_BITMAPS = 72;

const DEFAULT_SCENES = [
  {
    tag: '01 / Steering Grip',
    title: 'Grip Redefined',
    desc: 'Micro-perforated sport leather with slip-resistant inner lining. Feel every curve, command every turn.',
    start: 0.00,
    peakStart: 0.00,
    peakEnd: 0.13,
    end: 0.19,
  },
  {
    tag: '02 / Seat Covers',
    title: 'Quilted Perfection',
    desc: 'Diamond-stitched leatherette that wraps every contour. Airbag-safe, sweat-proof, zero-compromise.',
    start: 0.17,
    peakStart: 0.22,
    peakEnd: 0.42,
    end: 0.47,
  },
  {
    tag: '03 / Floor Mats',
    title: 'All-Weather Guard',
    desc: 'Deep-channel multi-layer mats cut to OEM tolerance. Mud, rain, and chai spills wiped clean in seconds.',
    start: 0.45,
    peakStart: 0.50,
    peakEnd: 0.72,
    end: 0.77,
  },
  {
    tag: '04 / Dashboard & Console',
    title: 'Detail-Driven Craft',
    desc: 'Armrest cushions, console trims and organisers for the interior enthusiast. Premium, purposeful, precise.',
    start: 0.75,
    peakStart: 0.79,
    peakEnd: 0.86,
    end: 0.90,
  },
  {
    tag: '05 / Car Care & Boot',
    title: 'Showroom Finish',
    desc: 'All-in-one boot organisers and ceramic detailing products. Protect every surface, drive in pride.',
    start: 0.88,
    peakStart: 0.91,
    peakEnd: 0.95,
    end: 0.98,
  },
] as const;

export type HeroSectionProps = {
  heroConfig?: {
    eyebrow?: string;
    title?: string;
    slogan?: string;
    preTitle?: string;
    sub?: string;
    scrollHint?: string;
    scenes?: Array<{
      tag: string;
      title: string;
      desc?: string;
      description?: string;
    }>;
  };
};

type CachedFrame = ImageBitmap | HTMLImageElement;

function getFrameDimensions(frame: CachedFrame): { w: number; h: number } {
  if ('naturalWidth' in frame) {
    return { w: frame.naturalWidth || 1, h: frame.naturalHeight || 1 };
  }
  return { w: frame.width || 1, h: frame.height || 1 };
}

function releaseFrame(frame: CachedFrame) {
  if ('close' in frame && typeof frame.close === 'function') {
    try {
      frame.close();
    } catch {}
  }
}

function buildProgressiveFrameOrder(total: number): number[] {
  const order: number[] = [];
  const seen = new Set<number>();
  const push = (idx: number) => {
    if (idx >= 0 && idx < total && !seen.has(idx)) {
      seen.add(idx);
      order.push(idx);
    }
  };

  push(0);
  push(1);
  push(total - 1);

  for (const step of [ANCHOR_STEP, 8, 4, 2, 1]) {
    for (let i = 0; i < total; i += step) {
      push(i);
    }
  }
  return order;
}

export function HeroFrameSection({ heroConfig }: HeroSectionProps = {}) {
  const activeScenes = (heroConfig?.scenes && heroConfig.scenes.length > 0)
    ? heroConfig.scenes.map((s, idx) => {
        const fallback = DEFAULT_SCENES[idx] || DEFAULT_SCENES[DEFAULT_SCENES.length - 1];
        return {
          ...fallback,
          tag: s.tag || fallback.tag,
          title: s.title || fallback.title,
          desc: s.desc || s.description || fallback.desc,
        };
      })
    : DEFAULT_SCENES;

  const activeScenesRef = useRef(activeScenes);
  activeScenesRef.current = activeScenes;

  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sceneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const finaleRef = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);

  const [isMobileMode, setIsMobileMode] = useState(false);
  const [mobileVideoFailed, setMobileVideoFailed] = useState(false);

  const useNativeMobileVideo = isMobileMode && !mobileVideoFailed;

  // Keep mobile media query synced cleanly after hydration
  useEffect(() => {
    const mobileMedia = window.matchMedia('(max-width: 768px), (pointer: coarse)');
    const syncMode = () => {
      setIsMobileMode(mobileMedia.matches);
    };
    syncMode();
    if (typeof mobileMedia.addEventListener === 'function') {
      mobileMedia.addEventListener('change', syncMode);
      return () => mobileMedia.removeEventListener('change', syncMode);
    }
    mobileMedia.addListener(syncMode);
    return () => mobileMedia.removeListener(syncMode);
  }, []);

  // Toggle mobile section class and keep header offset / scroll visibility synced
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    section.classList.toggle('hero-video-mobile', isMobileMode);

    const syncHeroOffset = () => {
      const announcement = document.querySelector<HTMLElement>('.ann');
      const header = document.querySelector<HTMLElement>('#hdr');
      const headerPosition = header ? getComputedStyle(header).position : '';
      const headerInFlow = headerPosition !== 'fixed' && headerPosition !== 'absolute';
      const offset = (announcement?.offsetHeight ?? 0)
        + (headerInFlow ? (header?.offsetHeight ?? 0) : 0);
      section.style.setProperty('--hero-header-offset', `${offset}px`);
    };

    const dispatchHeroVisibility = () => {
      const rect = section.getBoundingClientRect();
      const sectionHeight = Math.max(1, section.offsetHeight - window.innerHeight);
      const scrolled = -rect.top;
      window.dispatchEvent(new CustomEvent('hero-scroll', {
        detail: {
          inHero: isMobileMode
            ? rect.bottom > 0 && rect.top < window.innerHeight
            : scrolled >= 0 && scrolled < sectionHeight,
        },
      }));
    };

    syncHeroOffset();
    dispatchHeroVisibility();
    window.addEventListener('scroll', dispatchHeroVisibility, { passive: true });
    window.addEventListener('resize', syncHeroOffset, { passive: true });
    window.addEventListener('resize', dispatchHeroVisibility, { passive: true });

    return () => {
      window.removeEventListener('scroll', dispatchHeroVisibility);
      window.removeEventListener('resize', syncHeroOffset);
      window.removeEventListener('resize', dispatchHeroVisibility);
      section.style.removeProperty('--hero-header-offset');
    };
  }, [isMobileMode]);

  const updateOverlays = (progress: number) => {
    activeScenesRef.current.forEach((scene, index) => {
      const element = sceneRefs.current[index];
      if (!element) return;

      let opacity = 0;
      let translateY = 24;
      if (progress < scene.start) {
        opacity = 0;
      } else if (progress > scene.end) {
        translateY = -24;
      } else if (progress >= scene.peakStart && progress <= scene.peakEnd) {
        opacity = 1;
        translateY = 0;
      } else if (progress < scene.peakStart) {
        const range = Math.max(0.001, scene.peakStart - scene.start);
        const t = Math.max(0, Math.min(1, (progress - scene.start) / range));
        const ease = t * (2 - t);
        opacity = ease;
        translateY = (1 - ease) * 24;
      } else {
        const range = Math.max(0.001, scene.end - scene.peakEnd);
        const t = Math.max(0, Math.min(1, (scene.end - progress) / range));
        const ease = t * (2 - t);
        opacity = ease;
        translateY = -(1 - ease) * 24;
      }

      element.style.opacity = opacity.toFixed(3);
      element.style.transform = `translate3d(0, ${translateY.toFixed(2)}px, 0)`;
      element.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
    });

    const finale = finaleRef.current;
    if (finale) {
      const finaleProgress = Math.max(0, Math.min(1, (progress - 0.96) / 0.035));
      const ease = finaleProgress * (2 - finaleProgress);
      finale.style.opacity = ease.toFixed(3);
      finale.style.pointerEvents = ease > 0.5 ? 'auto' : 'none';
    }

    const hint = scrollHintRef.current;
    if (hint) hint.style.opacity = Math.max(0, 1 - progress / 0.04).toFixed(3);
  };

  // Mode 1: Hardware-accelerated streaming MP4 playback on mobile
  useEffect(() => {
    if (!useNativeMobileVideo) return;
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    let heroVisible = true;
    let disposed = false;
    let overlayRafId = 0;

    const isPreloaderDone = () =>
      document.body.classList.contains('ready') || !document.getElementById('pre');

    const syncFromVideo = () => {
      overlayRafId = 0;
      if (disposed || !video) return;
      const progress = video.duration > 0 ? Math.min(1, video.currentTime / video.duration) : 0;
      updateOverlays(video.ended ? 1 : progress);
      if (!video.paused && !video.ended && heroVisible) {
        overlayRafId = requestAnimationFrame(syncFromVideo);
      }
    };

    const startSyncLoop = () => {
      if (!overlayRafId && !disposed) {
        overlayRafId = requestAnimationFrame(syncFromVideo);
      }
    };

    const tryPlay = () => {
      if (disposed || !heroVisible || video.ended || !isPreloaderDone()) return;
      if (!video.paused) {
        startSyncLoop();
        return;
      }
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((err: unknown) => {
          if (disposed) return;
          const name = err && typeof err === 'object' && 'name' in err ? String((err as { name?: string }).name) : '';
          if (name !== 'AbortError') {
            setMobileVideoFailed(true);
          }
        });
      }
    };

    const onPlay = () => startSyncLoop();
    const onTimeUpdate = () => {
      const progress = video.duration > 0 ? Math.min(1, video.currentTime / video.duration) : 0;
      updateOverlays(video.ended ? 1 : progress);
    };
    const onEnded = () => {
      updateOverlays(1);
      if (overlayRafId) {
        cancelAnimationFrame(overlayRafId);
        overlayRafId = 0;
      }
    };
    const onError = () => {
      if (!disposed) setMobileVideoFailed(true);
    };

    updateOverlays(0);
    video.addEventListener('play', onPlay);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      if (heroVisible) {
        tryPlay();
      } else if (!video.paused) {
        video.pause();
      }
    }, { threshold: 0.1 });
    visibilityObserver.observe(section);

    // Wait for Preloader exit ('ready') so mobile doesn't waste playback behind the curtain
    const bodyObserver = new MutationObserver(() => {
      if (isPreloaderDone()) {
        tryPlay();
      }
    });
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    const readySafetyTimer = window.setTimeout(() => {
      tryPlay();
    }, 3200);

    tryPlay();

    return () => {
      disposed = true;
      window.clearTimeout(readySafetyTimer);
      bodyObserver.disconnect();
      visibilityObserver.disconnect();
      video.removeEventListener('play', onPlay);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
      if (overlayRafId) cancelAnimationFrame(overlayRafId);
    };
  }, [useNativeMobileVideo]);

  // Mode 2: Desktop scroll-scrubbing (and fallback mobile player) via off-thread decoded WebP cache
  useEffect(() => {
    if (useNativeMobileVideo) return;

    const section = sectionRef.current;
    const canvas = canvasRef.current;
    const sticky = canvas?.parentElement;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!section || !canvas || !sticky || !ctx) return;

    let disposed = false;
    let heroVisible = true;
    let targetProgress = 0;
    let currentProgress = 0;
    let desiredIndex = 0;
    let paintedIndex = -1;
    let desktopRafId = 0;

    // Fallback mobile player timing (only runs when mobile & video element fallback triggered)
    let mobileRafId = 0;
    let mobileProgress = 0;
    let mobileLastTickAt = 0;
    const mobileDuration = Math.max(1, ((HERO_FRAMES.length - 1) / HERO_FRAME_FPS) * 1000);

    const blobCache = new Map<number, Blob>();
    const activeFetches = new Map<number, Promise<Blob | null>>();
    const decodedBitmaps = new Map<number, CachedFrame>();
    const anchorBitmaps = new Map<number, CachedFrame>();
    const decodePromises = new Map<number, Promise<CachedFrame | null>>();
    const fetchAbort = new AbortController();

    const orderedQueue = buildProgressiveFrameOrder(HERO_FRAMES.length);
    const pendingQueue: number[] = [...orderedQueue];
    const pendingSet = new Set<number>(orderedQueue);
    let inFlightCount = 0;
    let canvasSize = { width: 0, height: 0 };

    const isPreloaderDone = () =>
      document.body.classList.contains('ready') || !document.getElementById('pre');

    const syncCanvasSize = (rect?: DOMRectReadOnly | DOMRect) => {
      const box = rect ?? sticky.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(box.width * dpr));
      const height = Math.max(1, Math.round(box.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        canvasSize = { width, height };
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        return true;
      }
      return false;
    };

    const getCachedFrame = (idx: number): CachedFrame | undefined =>
      decodedBitmaps.get(idx) ?? anchorBitmaps.get(idx);

    const findNearestCachedIndex = (targetIdx: number): number => {
      if (getCachedFrame(targetIdx)) return targetIdx;
      for (let delta = 1; delta < HERO_FRAMES.length; delta += 1) {
        if (targetIdx - delta >= 0 && getCachedFrame(targetIdx - delta)) return targetIdx - delta;
        if (targetIdx + delta < HERO_FRAMES.length && getCachedFrame(targetIdx + delta)) return targetIdx + delta;
      }
      return -1;
    };

    const drawIndex = (idx: number): boolean => {
      const frame = getCachedFrame(idx);
      if (!frame || canvasSize.width === 0 || canvasSize.height === 0) return false;

      const { w: natW, h: natH } = getFrameDimensions(frame);
      const scale = Math.max(canvasSize.width / natW, canvasSize.height / natH);
      const drawW = natW * scale;
      const drawH = natH * scale;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
      ctx.drawImage(frame, (canvasSize.width - drawW) / 2, (canvasSize.height - drawH) / 2, drawW, drawH);

      if (paintedIndex === -1) {
        canvas.style.opacity = '1';
      }
      paintedIndex = idx;
      return true;
    };

    const evictFurthestBitmapIfNeeded = () => {
      while (decodedBitmaps.size > MAX_ACTIVE_BITMAPS) {
        let furthestKey = -1;
        let maxDist = -1;
        for (const key of decodedBitmaps.keys()) {
          if (key === paintedIndex || key === desiredIndex) continue;
          const dist = Math.abs(key - desiredIndex);
          if (dist > maxDist) {
            maxDist = dist;
            furthestKey = key;
          }
        }
        if (furthestKey === -1) break;
        const evicted = decodedBitmaps.get(furthestKey);
        decodedBitmaps.delete(furthestKey);
        if (evicted && !anchorBitmaps.has(furthestKey)) {
          releaseFrame(evicted);
        }
      }
    };

    const fetchFrameBlob = (idx: number): Promise<Blob | null> => {
      const cachedBlob = blobCache.get(idx);
      if (cachedBlob) return Promise.resolve(cachedBlob);
      const existing = activeFetches.get(idx);
      if (existing) return existing;

      const p = fetch(HERO_FRAMES[idx], { cache: 'force-cache', signal: fetchAbort.signal })
        .then((res) => (res.ok ? res.blob() : null))
        .then((blob) => {
          if (blob && !disposed) {
            blobCache.set(idx, blob);
          }
          return blob;
        })
        .catch(() => null)
        .finally(() => {
          activeFetches.delete(idx);
        });

      activeFetches.set(idx, p);
      return p;
    };

    const decodeFrame = (idx: number): Promise<CachedFrame | null> => {
      const ready = getCachedFrame(idx);
      if (ready) return Promise.resolve(ready);
      const inDecode = decodePromises.get(idx);
      if (inDecode) return inDecode;

      const p = fetchFrameBlob(idx)
        .then(async (blob): Promise<CachedFrame | null> => {
          if (!blob || disposed) return null;
          if (typeof createImageBitmap === 'function') {
            return await createImageBitmap(blob);
          }
          const img = new Image();
          const url = URL.createObjectURL(blob);
          img.decoding = 'async';
          img.src = url;
          try {
            if (typeof img.decode === 'function') await img.decode();
            else {
              await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject();
              });
            }
            return img;
          } finally {
            URL.revokeObjectURL(url);
          }
        })
        .then((bitmap) => {
          if (!bitmap) return null;
          if (disposed) {
            releaseFrame(bitmap);
            return null;
          }
          if (idx % ANCHOR_STEP === 0 || idx === 0 || idx === HERO_FRAMES.length - 1) {
            anchorBitmaps.set(idx, bitmap);
          } else {
            decodedBitmaps.set(idx, bitmap);
            evictFurthestBitmapIfNeeded();
          }

          if (
            idx === desiredIndex ||
            paintedIndex === -1 ||
            Math.abs(idx - desiredIndex) < Math.abs(paintedIndex - desiredIndex)
          ) {
            drawIndex(idx);
          }
          return bitmap;
        })
        .catch(() => null)
        .finally(() => {
          decodePromises.delete(idx);
        });

      decodePromises.set(idx, p);
      return p;
    };

    const pumpNetworkQueue = () => {
      while (!disposed && inFlightCount < MAX_CONCURRENT_FETCHES && pendingQueue.length > 0) {
        const nextIdx = pendingQueue.shift()!;
        pendingSet.delete(nextIdx);
        if (blobCache.has(nextIdx)) continue;

        inFlightCount += 1;
        fetchFrameBlob(nextIdx)
          .then((blob) => {
            if (!blob || disposed) return;
            const isAnchor = nextIdx % ANCHOR_STEP === 0 || nextIdx === 0 || nextIdx === HERO_FRAMES.length - 1;
            if (isAnchor || Math.abs(nextIdx - desiredIndex) <= 18) {
              void decodeFrame(nextIdx);
            }
          })
          .finally(() => {
            inFlightCount -= 1;
            if (!disposed) pumpNetworkQueue();
          });
      }
    };

    const prioritizeWindow = (center: number, prevCenter: number) => {
      const dir = center >= prevCenter ? 1 : -1;
      const priorityTargets: number[] = [];
      for (let d = 14; d >= 0; d -= 1) {
        const forward = center + dir * d;
        if (forward >= 0 && forward < HERO_FRAMES.length) priorityTargets.push(forward);
      }
      for (let d = 1; d <= 4; d += 1) {
        const backward = center - dir * d;
        if (backward >= 0 && backward < HERO_FRAMES.length) priorityTargets.push(backward);
      }

      for (const idx of priorityTargets) {
        if (!blobCache.has(idx)) {
          if (pendingSet.has(idx)) {
            const pos = pendingQueue.indexOf(idx);
            if (pos > -1) pendingQueue.splice(pos, 1);
          } else {
            pendingSet.add(idx);
          }
          pendingQueue.unshift(idx);
        }
      }
      pumpNetworkQueue();
    };

    const warmDecodeAround = (center: number) => {
      const start = Math.max(0, center - 8);
      const end = Math.min(HERO_FRAMES.length - 1, center + 16);
      for (let i = start; i <= end; i += 1) {
        if (blobCache.has(i) && !getCachedFrame(i)) {
          void decodeFrame(i);
        }
      }
    };

    const renderAtProgress = (progress: number, force = false) => {
      const clamped = Math.max(0, Math.min(1, progress));
      updateOverlays(clamped);

      const nextIndex = Math.round(clamped * (HERO_FRAMES.length - 1));
      const prevDesired = desiredIndex;
      desiredIndex = nextIndex;

      prioritizeWindow(nextIndex, prevDesired);
      warmDecodeAround(nextIndex);

      if (getCachedFrame(nextIndex)) {
        if (force || paintedIndex !== nextIndex) {
          drawIndex(nextIndex);
        }
        return;
      }

      const nearestIdx = findNearestCachedIndex(nextIndex);
      if (
        nearestIdx !== -1 &&
        (paintedIndex === -1 || Math.abs(nearestIdx - nextIndex) < Math.abs(paintedIndex - nextIndex))
      ) {
        drawIndex(nearestIdx);
      }
      void decodeFrame(nextIndex);
    };

    const smoothingTime = 160;
    const desktopTick = () => {
      desktopRafId = 0;
      if (disposed || isMobileMode) return;
      const difference = targetProgress - currentProgress;
      const amount = 1 - Math.exp(-16.67 / smoothingTime);
      if (Math.abs(difference) < 0.0002) {
        currentProgress = targetProgress;
        renderAtProgress(currentProgress);
        return;
      }
      currentProgress += difference * amount;
      renderAtProgress(currentProgress);
      desktopRafId = requestAnimationFrame(desktopTick);
    };

    const scheduleDesktopTick = () => {
      if (!desktopRafId && !disposed && !isMobileMode) {
        desktopRafId = requestAnimationFrame(desktopTick);
      }
    };

    const onScroll = () => {
      if (isMobileMode) return;
      const rect = section.getBoundingClientRect();
      const sectionHeight = Math.max(1, section.offsetHeight - window.innerHeight);
      const scrolled = -rect.top;
      const nextTarget = Math.max(0, Math.min(1, scrolled / sectionHeight));
      if (Math.abs(nextTarget - targetProgress) > 0.0001) {
        targetProgress = nextTarget;
        scheduleDesktopTick();
      }
    };

    const mobileFallbackTick = (now: number) => {
      mobileRafId = 0;
      if (disposed || !isMobileMode || !heroVisible || mobileProgress >= 1) return;
      if (!isPreloaderDone()) {
        mobileLastTickAt = now;
        mobileRafId = requestAnimationFrame(mobileFallbackTick);
        return;
      }
      const nextIdxCandidate = Math.round(mobileProgress * (HERO_FRAMES.length - 1));
      // Hold playhead briefly if exact target and neighbors are still downloading so mobile never skips blindly
      const targetReady = getCachedFrame(nextIdxCandidate) || blobCache.has(nextIdxCandidate);
      if (!targetReady && paintedIndex === -1) {
        mobileLastTickAt = now;
        mobileRafId = requestAnimationFrame(mobileFallbackTick);
        return;
      }
      const dt = Math.min(50, Math.max(0, now - mobileLastTickAt));
      mobileLastTickAt = now;
      if (targetReady || Math.abs(nextIdxCandidate - paintedIndex) <= 3) {
        mobileProgress = Math.min(1, mobileProgress + dt / mobileDuration);
      }
      currentProgress = mobileProgress;
      targetProgress = mobileProgress;
      renderAtProgress(mobileProgress);
      if (mobileProgress < 1) {
        mobileRafId = requestAnimationFrame(mobileFallbackTick);
      }
    };

    const startMobileFallback = () => {
      if (!isMobileMode || !heroVisible || mobileProgress >= 1 || mobileRafId || disposed) return;
      mobileLastTickAt = performance.now();
      mobileRafId = requestAnimationFrame(mobileFallbackTick);
    };

    const stopMobileFallback = () => {
      if (mobileRafId) {
        cancelAnimationFrame(mobileRafId);
        mobileRafId = 0;
      }
    };

    const resizeObserver = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (syncCanvasSize(rect ? new DOMRect(0, 0, rect.width, rect.height) : undefined)) {
        // Resizing canvas clears its backing store, so reset paintedIndex before redrawing
        paintedIndex = -1;
        renderAtProgress(isMobileMode ? mobileProgress : currentProgress, true);
      }
    });
    resizeObserver.observe(sticky);

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      if (!isMobileMode) return;
      if (heroVisible) startMobileFallback();
      else stopMobileFallback();
    }, { threshold: 0.1 });
    visibilityObserver.observe(section);

    canvas.style.transition = 'opacity 0.12s ease';
    canvas.style.opacity = '0';
    syncCanvasSize();
    updateOverlays(0);
    // Start progressive prefill immediately while Preloader is up
    pumpNetworkQueue();
    if (!isMobileMode) {
      onScroll();
      currentProgress = targetProgress;
      renderAtProgress(currentProgress, true);
    } else {
      renderAtProgress(0, true);
      startMobileFallback();
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      disposed = true;
      fetchAbort.abort();
      window.removeEventListener('scroll', onScroll);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      stopMobileFallback();
      if (desktopRafId) cancelAnimationFrame(desktopRafId);

      for (const bmp of decodedBitmaps.values()) releaseFrame(bmp);
      for (const bmp of anchorBitmaps.values()) releaseFrame(bmp);
      decodedBitmaps.clear();
      anchorBitmaps.clear();
      blobCache.clear();
      activeFetches.clear();
      decodePromises.clear();
    };
  }, [useNativeMobileVideo, isMobileMode]);

  return (
    <section className="hero-video-section" ref={sectionRef} aria-label="Hero">
      <div className="hero-video-sticky">
        {/* Immediate crisp first-frame fallback (never flashes black while canvas/video buffers) */}
        <img
          src={HERO_FRAMES[0]}
          alt=""
          aria-hidden="true"
          className="hero-video-canvas"
          fetchPriority="high"
          decoding="sync"
        />

        {useNativeMobileVideo ? (
          <video
            ref={videoRef}
            className="hero-video-canvas"
            src={HERO_MOBILE_VIDEO}
            poster={HERO_FRAMES[0]}
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
          />
        ) : (
          <canvas
            ref={canvasRef}
            className="hero-video-canvas"
            aria-hidden="true"
          />
        )}

        <div className="hero-video-vignette" />

        {activeScenes.map((scene, index) => (
          <div
            key={scene.tag}
            className="hv-scene"
            ref={(element) => { sceneRefs.current[index] = element; }}
          >
            <p className="hv-scene-tag mono">{scene.tag}</p>
            <h2 className="hv-scene-title disp">{scene.title}</h2>
            <p className="hv-scene-desc">{scene.desc}</p>
          </div>
        ))}

        <div className="hv-finale" ref={finaleRef}>
          <div className="hv-finale-inner">
            <p className="hv-finale-pre mono">{heroConfig?.preTitle || 'The complete car accessories brand'}</p>
            <h1 className="hv-finale-logo disp">
              <img src="/logo.png" alt="CARXEN Car Accessories" className="hv-finale-logo-img" />
              <span
                style={{
                  position: 'absolute',
                  width: '1px',
                  height: '1px',
                  padding: 0,
                  margin: '-1px',
                  overflow: 'hidden',
                  clip: 'rect(0 0 0 0)',
                  whiteSpace: 'nowrap',
                  border: 0,
                }}
              >
                Carxen — Premium Car Accessories Online: Seat Covers, Floor Mats &amp; Steering Covers
              </span>
            </h1>
            <p className="hv-finale-slogan">{heroConfig?.slogan || 'Engineered for every drive.'}</p>
            <div className="hv-finale-line" />
            <p className="hv-finale-sub mono">{heroConfig?.sub || '100+ Vehicle Models · 2-Year Warranty · Free Shipping'}</p>
          </div>
        </div>

        <div className="hero-video-scroll-hint-wrap" ref={scrollHintRef}>
          <p className="hero-video-label mono">{heroConfig?.scrollHint || 'Scroll to explore'}</p>
          <div
            className="hero-video-scroll-hint"
            role="button"
            tabIndex={0}
            aria-label="Scroll down to explore products"
            onClick={() => {
              const target = document.getElementById('shop') || document.querySelector('.sec');
              if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
              } else {
                window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                const target = document.getElementById('shop') || document.querySelector('.sec');
                if (target) target.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            <div className="hero-mouse-icon">
              <span className="hero-mouse-wheel" />
            </div>
            <span className="hero-mouse-arrow" />
          </div>
        </div>

        <div className="hero-video-bottom-curve" aria-hidden="true">
          <svg viewBox="0 0 1000 120" preserveAspectRatio="none" focusable="false">
            <path d="M0 18C18 18 20 54 56 54H944C980 54 982 18 1000 18V120H0Z" />
          </svg>
        </div>
      </div>
    </section>
  );
}

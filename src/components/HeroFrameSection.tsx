'use client';

import { useEffect, useRef } from 'react';
import { HERO_FRAME_FPS, HERO_FRAMES } from '@/data/heroFrames';

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
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const finaleRef = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    const sticky = canvas?.parentElement;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!section || !canvas || !sticky || !ctx) return;

    const mobileMedia = window.matchMedia('(max-width: 768px), (pointer: coarse)');
    let isMobileHero = mobileMedia.matches;
    let mobileHeroVisible = true;
    let targetProgress = 0;
    let currentProgress = 0;
    let mobileProgress = 0;
    let mobileStartedAt = 0;
    let animationFrameId = 0;
    let mobileAnimationFrameId: number | null = null;
    let lastRequestedFrame = -1;
    let frameRequestId = 0;
    const loadedFrames = new Map<number, HTMLImageElement>();
    const loadingFrames = new Map<number, Promise<HTMLImageElement>>();
    const smoothingTime = 180;
    const mobileDuration = Math.max(1, ((HERO_FRAMES.length - 1) / HERO_FRAME_FPS) * 1000);

    section.classList.toggle('hero-video-mobile', isMobileHero);

    const syncHeroOffset = () => {
      const announcement = document.querySelector<HTMLElement>('.ann');
      const header = document.querySelector<HTMLElement>('#hdr');
      const headerPosition = header ? getComputedStyle(header).position : '';
      const headerInFlow = headerPosition !== 'fixed' && headerPosition !== 'absolute';
      const offset = (announcement?.offsetHeight ?? 0)
        + (headerInFlow ? (header?.offsetHeight ?? 0) : 0);
      section.style.setProperty('--hero-header-offset', `${offset}px`);
    };

    const syncCanvasSize = () => {
      const rect = sticky.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      }
    };

    const loadFrame = (index: number) => {
      const frameIndex = Math.max(0, Math.min(HERO_FRAMES.length - 1, index));
      const loaded = loadedFrames.get(frameIndex);
      if (loaded) return Promise.resolve(loaded);
      const pending = loadingFrames.get(frameIndex);
      if (pending) return pending;

      const image = new Image();
      image.decoding = 'async';
      const promise = new Promise<HTMLImageElement>((resolve, reject) => {
        image.onload = () => {
          loadedFrames.set(frameIndex, image);
          resolve(image);
        };
        image.onerror = () => reject(new Error(`Unable to load hero frame ${frameIndex + 1}`));
      });
      loadingFrames.set(frameIndex, promise);
      image.src = HERO_FRAMES[frameIndex];
      promise.finally(() => loadingFrames.delete(frameIndex)).catch(() => undefined);
      return promise;
    };

    const preloadAround = (center: number, radius: number) => {
      for (
        let index = Math.max(0, center - radius);
        index <= Math.min(HERO_FRAMES.length - 1, center + radius);
        index += 1
      ) {
        loadFrame(index).catch(() => undefined);
      }
    };

    const updateOverlays = (progress: number) => {
      activeScenes.forEach((scene, index) => {
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

    const paintFrame = (index: number) => {
      const image = loadedFrames.get(index);
      if (!image) return;
      syncCanvasSize();
      const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
      updateOverlays(index / (HERO_FRAMES.length - 1));
    };

    const requestFrame = (progress: number, force = false) => {
      const clamped = Math.max(0, Math.min(1, progress));
      const index = Math.round(clamped * (HERO_FRAMES.length - 1));
      if (!force && index === lastRequestedFrame) return;
      lastRequestedFrame = index;
      const requestId = ++frameRequestId;
      preloadAround(index, isMobileHero ? 8 : 3);
      if (loadedFrames.has(index)) {
        paintFrame(index);
        return;
      }
      loadFrame(index).then(() => {
        if (requestId === frameRequestId) paintFrame(index);
      }).catch(() => undefined);
    };

    const stopMobilePlayback = () => {
      if (mobileAnimationFrameId !== null) {
        cancelAnimationFrame(mobileAnimationFrameId);
        mobileAnimationFrameId = null;
      }
      if (mobileStartedAt) {
        mobileProgress = Math.max(
          mobileProgress,
          Math.min(1, (performance.now() - mobileStartedAt) / mobileDuration)
        );
      }
    };

    const mobileTick = (now: number) => {
      mobileAnimationFrameId = null;
      if (!isMobileHero || !mobileHeroVisible) return;
      mobileProgress = Math.min(1, (now - mobileStartedAt) / mobileDuration);
      targetProgress = mobileProgress;
      currentProgress = mobileProgress;
      requestFrame(mobileProgress);
      if (mobileProgress < 1) mobileAnimationFrameId = requestAnimationFrame(mobileTick);
    };

    const startMobilePlayback = () => {
      if (!isMobileHero || !mobileHeroVisible || mobileProgress >= 1 || mobileAnimationFrameId !== null) return;
      mobileStartedAt = performance.now() - mobileProgress * mobileDuration;
      mobileAnimationFrameId = requestAnimationFrame(mobileTick);
    };

    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const sectionHeight = Math.max(1, section.offsetHeight - window.innerHeight);
      const scrolled = -rect.top;
      if (!isMobileHero) targetProgress = Math.max(0, Math.min(1, scrolled / sectionHeight));
      window.dispatchEvent(new CustomEvent('hero-scroll', {
        detail: {
          inHero: isMobileHero
            ? rect.bottom > 0 && rect.top < window.innerHeight
            : scrolled >= 0 && scrolled < sectionHeight,
        },
      }));
    };

    const tick = () => {
      if (!isMobileHero) {
        const difference = targetProgress - currentProgress;
        const amount = 1 - Math.exp(-16.67 / smoothingTime);
        currentProgress = Math.abs(difference) < 0.0001
          ? targetProgress
          : currentProgress + difference * amount;
        requestFrame(currentProgress);
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    const applyHeroMode = () => {
      const nextIsMobile = mobileMedia.matches;
      if (nextIsMobile === isMobileHero) return;
      isMobileHero = nextIsMobile;
      section.classList.toggle('hero-video-mobile', isMobileHero);
      lastRequestedFrame = -1;
      frameRequestId += 1;
      if (isMobileHero) {
        targetProgress = mobileProgress;
        currentProgress = mobileProgress;
        requestFrame(mobileProgress, true);
        startMobilePlayback();
      } else {
        stopMobilePlayback();
        onScroll();
        requestFrame(currentProgress, true);
      }
    };

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      mobileHeroVisible = entry.isIntersecting;
      if (!isMobileHero) return;
      if (mobileHeroVisible) startMobilePlayback();
      else stopMobilePlayback();
    }, { threshold: 0.1 });
    visibilityObserver.observe(section);

    const onResize = () => {
      syncHeroOffset();
      requestFrame(isMobileHero ? mobileProgress : currentProgress, true);
    };

    syncHeroOffset();
    onScroll();
    syncCanvasSize();
    updateOverlays(0);
    requestFrame(0, true);
    startMobilePlayback();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    if (typeof mobileMedia.addEventListener === 'function') mobileMedia.addEventListener('change', applyHeroMode);
    else mobileMedia.addListener(applyHeroMode);
    animationFrameId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (typeof mobileMedia.removeEventListener === 'function') mobileMedia.removeEventListener('change', applyHeroMode);
      else mobileMedia.removeListener(applyHeroMode);
      visibilityObserver.disconnect();
      stopMobilePlayback();
      cancelAnimationFrame(animationFrameId);
      section.style.removeProperty('--hero-header-offset');
    };
  }, []);

  return (
    <section className="hero-video-section" ref={sectionRef} aria-label="Hero">
      <div className="hero-video-sticky">
        <canvas ref={canvasRef} className="hero-video-canvas" aria-hidden="true" />
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
            </h1>
            <p className="hv-finale-slogan">{heroConfig?.slogan || 'Engineered for every drive.'}</p>
            <div className="hv-finale-line" />
            <p className="hv-finale-sub mono">{heroConfig?.sub || '100+ Vehicle Models · 2-Year Warranty · Free Shipping'}</p>
          </div>
        </div>

        <div className="hero-video-scroll-hint-wrap" ref={scrollHintRef}>
          <p className="hero-video-label mono">{heroConfig?.scrollHint || 'Scroll to explore'}</p>
          <div className="hero-video-scroll-hint"><span /></div>
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

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

export type AccordionGalleryItem = {
  image: string;
  label?: string;
  link?: string;
  alt?: string;
};

type AccordionGalleryProps = {
  items: AccordionGalleryItem[];
  defaultIndex?: number;
  accentColor?: string;
  overlayColor?: string;
  textColor?: string;
  height?: number;
  gap?: number;
  radius?: number;
  expandRatio?: number;
  orientation?: 'horizontal' | 'vertical';
  duration?: number;
  ease?: string;
  parallax?: number;
  tilt?: number;
  stagger?: number;
  trigger?: 'hover' | 'click';
  showLabels?: boolean;
  grayscale?: boolean;
  className?: string;
};

type GalleryStyle = React.CSSProperties & Record<`--${string}`, string | number>;

export default function AccordionGallery({
  items,
  defaultIndex = 2,
  accentColor = '#e2231a',
  overlayColor = '#06070b',
  textColor = '#ffffff',
  height = 470,
  gap = 10,
  radius = 18,
  expandRatio = 0.52,
  orientation = 'horizontal',
  duration = 0.6,
  ease = 'power3.out',
  parallax = 0.5,
  tilt = 5,
  stagger = 0.06,
  trigger = 'hover',
  showLabels = true,
  grayscale = true,
  className = '',
}: AccordionGalleryProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mediaRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const textRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const firstRunRef = useRef(true);
  const mediaSizeRef = useRef(320);
  const [isNarrow, setIsNarrow] = useState(false);
  const [active, setActive] = useState(
    Math.min(Math.max(defaultIndex, 0), Math.max(items.length - 1, 0)),
  );

  const vertical = orientation === 'vertical' || isNarrow;
  const count = items.length;
  const prefersReduced =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 520px)');
    const update = () => setIsNarrow(mediaQuery.matches);
    update();
    mediaQuery.addEventListener?.('change', update);
    return () => mediaQuery.removeEventListener?.('change', update);
  }, []);

  const applyLayout = useCallback(
    (animate: boolean) => {
      const panels = panelRefs.current;
      if (!panels.length || !count) return;

      const ratio = Math.min(Math.max(expandRatio, 0.2), 0.9);
      const grow = count > 1 ? (ratio * (count - 1)) / (1 - ratio) : 1;
      const mediaSize = mediaSizeRef.current;
      const dur = animate && !prefersReduced ? duration : 0;
      const timeline = gsap.timeline();

      timelineRef.current?.kill();

      panels.forEach((panel, index) => {
        if (!panel) return;
        const isActive = index === active;
        const media = mediaRefs.current[index];
        const bar = barRefs.current[index];
        const text = textRefs.current[index];
        const rotation = isActive ? 0 : index < active ? tilt : -tilt;

        timeline.to(
          panel,
          {
            flexGrow: isActive ? grow : 1,
            ...(vertical ? { rotateX: -rotation } : { rotateY: rotation }),
            duration: dur,
            ease,
          },
          0,
        );

        if (media) {
          const drift = Math.max(-1.5, Math.min(1.5, active - index));
          const shift = drift * parallax * mediaSize * 0.06;
          timeline.to(
            media,
            {
              xPercent: -50,
              yPercent: -50,
              x: vertical ? 0 : isActive ? 0 : shift,
              y: vertical ? (isActive ? 0 : shift) : 0,
              '--ag-gray': grayscale && !isActive ? 1 : 0,
              '--ag-dim': isActive ? 0 : 0.34,
              duration: dur,
              ease,
            },
            0,
          );
        }

        if (showLabels && bar && text) {
          timeline.to(
            [bar, text],
            isActive
              ? { opacity: 1, x: 0, duration: dur, ease, stagger: prefersReduced ? 0 : stagger }
              : { opacity: 0, x: -14, duration: dur * 0.6, ease },
            0,
          );
        }
      });

      timelineRef.current = timeline;
    },
    [active, count, duration, ease, expandRatio, grayscale, parallax, prefersReduced, stagger, tilt, vertical, showLabels],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const measure = () => {
      const rect = root.getBoundingClientRect();
      const total = vertical ? rect.height : rect.width;
      const usable = Math.max(total - gap * (count - 1), 120);
      const size = Math.max(140, usable * Math.min(Math.max(expandRatio, 0.2), 0.9) * 1.22);
      mediaSizeRef.current = size;
      root.style.setProperty('--ag-media-size', `${size}px`);
      applyLayout(!firstRunRef.current);
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(root);

    return () => {
      resizeObserver.disconnect();
      timelineRef.current?.kill();
    };
  }, [applyLayout, count, expandRatio, gap, vertical]);

  useEffect(() => {
    applyLayout(!firstRunRef.current);
    firstRunRef.current = false;
  }, [applyLayout]);

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index + 1) % count);
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index - 1 + count) % count);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`accordion-gallery ${vertical ? 'accordion-gallery-vertical' : ''} ${className}`}
      style={{
        gap: `${gap}px`,
        height: vertical ? `${Math.round(height * 1.5)}px` : `${height}px`,
      }}
      role="list"
      aria-label="CarXen interior systems"
    >
      {items.map((item, index) => {
        const isActive = index === active;
        return (
          <button
            key={`${item.image}-${index}`}
            ref={(element) => { panelRefs.current[index] = element; }}
            type="button"
            className="accordion-gallery-panel"
            style={{
              borderRadius: `${radius}px`,
              '--ag-accent': accentColor,
              '--ag-text': textColor,
              '--ag-overlay': overlayColor,
            } as GalleryStyle}
            onMouseEnter={() => trigger === 'hover' && setActive(index)}
            onFocus={() => setActive(index)}
            onClick={() => setActive(index)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            role="listitem"
            aria-current={isActive ? 'true' : undefined}
            aria-label={item.label || item.alt || `Gallery panel ${index + 1}`}
          >
            <span className="accordion-gallery-media-shell">
              <span
                ref={(element) => { mediaRefs.current[index] = element; }}
                className="accordion-gallery-media"
                style={{
                  width: vertical ? '100%' : 'var(--ag-media-size, 320px)',
                  height: vertical ? 'var(--ag-media-size, 320px)' : '100%',
                }}
              >
                <img src={item.image} alt={item.alt || item.label || ''} draggable="false" />
              </span>
              <span className="accordion-gallery-overlay" aria-hidden="true" />
            </span>
            {showLabels && (
              <span className="accordion-gallery-caption" aria-hidden="true">
                <span ref={(element) => { barRefs.current[index] = element; }} className="accordion-gallery-bar" />
                <span ref={(element) => { textRefs.current[index] = element; }} className="accordion-gallery-label">
                  {item.label}
                </span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

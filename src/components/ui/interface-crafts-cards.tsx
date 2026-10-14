'use client';

import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import './interface-crafts-cards.css';

export type CraftCardItem = {
  title: string;
  tag?: string;
  description: string;
  skeleton: React.ReactNode;
  className?: string;
  config: {
    y: number;
    x?: number;
    rotate: number;
    zIndex: number;
  };
};

type SpringConfig = {
  type: 'spring';
  bounce?: number;
  visualDuration?: number;
  stiffness?: number;
  damping?: number;
  mass?: number;
};

export interface CardsProps {
  spring?: SpringConfig;
  activeScale?: number;
  cardSpacing?: number;
  className?: string;
  customCards?: Array<{
    title: string;
    tag?: string;
    badge?: string;
    description: string;
    image: string;
  }>;
}

const defaultSpring: SpringConfig = {
  type: 'spring',
  visualDuration: 0.6,
  bounce: 0.25,
};

export const controls = {
  spring: defaultSpring,
  activeScale: [1.15, 1, 1.6, 0.01],
  cardSpacing: [74, 40, 320, 5],
};

export const CAR_INTERIOR_CARDS: CraftCardItem[] = [
  {
    title: 'Cockpit Ergonomics',
    tag: '01 — Lateral Support',
    description:
      'Precision-molded bolster contouring and high-density memory foam for aggressive cornering stability.',
    skeleton: (
      <div className="craft-card-skeleton">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1549064233-945d7063292f?auto=format&fit=crop&w=800&q=80"
          alt="Driver Cockpit"
          className="craft-card-img"
          loading="lazy"
        />
        <span className="craft-card-badge">Cockpit</span>
        <div className="craft-card-overlay" />
      </div>
    ),
    className: 'craft-card-dark',
    config: {
      y: -18,
      x: 0,
      rotate: -12,
      zIndex: 2,
    },
  },
  {
    title: 'Quilted Nappa',
    tag: '02 — Diamond Stitch',
    description:
      'Hand-finished diamond-quilted panels with micro-perforated cooling channels and scarlet contrast stitching.',
    skeleton: (
      <div className="craft-card-skeleton">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1625690180114-5530b1304127?auto=format&fit=crop&w=800&q=80"
          alt="Quilted Leather Interior"
          className="craft-card-img"
          loading="lazy"
        />
        <span className="craft-card-badge">Upholstery</span>
        <div className="craft-card-overlay" />
      </div>
    ),
    className: 'craft-card-dark',
    config: {
      y: 16,
      x: 180,
      rotate: 6,
      zIndex: 3,
    },
  },
  {
    title: 'Ambient Luminescence',
    tag: '03 — 64-Color LED',
    description:
      'Sub-surface fiber-optic atmospheric illumination synchronizing dashboard lines, footwells, and door cascades.',
    skeleton: (
      <div className="craft-card-skeleton">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1583573278124-e8d4fd3edf3c?auto=format&fit=crop&w=800&q=80"
          alt="Ambient Night Cockpit"
          className="craft-card-img"
          loading="lazy"
        />
        <span className="craft-card-badge">Ambient LED</span>
        <div className="craft-card-overlay" />
      </div>
    ),
    className: 'craft-card-dark',
    config: {
      y: -24,
      x: 360,
      rotate: -4,
      zIndex: 4,
    },
  },
  {
    title: 'Carbon Weave',
    tag: '04 — 3K Dry Composite',
    description:
      'Autoclave-cured matte carbon fiber instrument cowls, paddle shifters, and central transmission bridge inserts.',
    skeleton: (
      <div className="craft-card-skeleton">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1533630217389-3a5e4dff5683?auto=format&fit=crop&w=800&q=80"
          alt="Carbon Fiber Dashboard"
          className="craft-card-img"
          loading="lazy"
        />
        <span className="craft-card-badge">Composite</span>
        <div className="craft-card-overlay" />
      </div>
    ),
    className: 'craft-card-dark',
    config: {
      y: 18,
      x: 540,
      rotate: 10,
      zIndex: 5,
    },
  },
  {
    title: 'Command Console',
    tag: '05 — Tactile Control',
    description:
      'Weighted knurled aluminum rotary selectors and magnetic storage modules calibrated for immediate tactile response.',
    skeleton: (
      <div className="craft-card-skeleton">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1629280878139-038999084e23?auto=format&fit=crop&w=800&q=80"
          alt="Command Console"
          className="craft-card-img"
          loading="lazy"
        />
        <span className="craft-card-badge">Console</span>
        <div className="craft-card-overlay" />
      </div>
    ),
    className: 'craft-card-dark',
    config: {
      y: -8,
      x: 720,
      rotate: -6,
      zIndex: 6,
    },
  },
];

export const Cards = ({
  spring = defaultSpring,
  activeScale = 1.15,
  cardSpacing = 74,
  className,
  customCards,
}: CardsProps = {}) => {
  const cards = useMemo(() => {
    if (customCards && customCards.length > 0) {
      return customCards.map((c, i) => {
        const fallbackConfig = CAR_INTERIOR_CARDS[i]?.config || {
          y: (i % 2 === 0 ? -1 : 1) * 15,
          x: i * 180,
          rotate: (i % 2 === 0 ? -1 : 1) * 6,
          zIndex: i + 2,
        };
        return {
          title: c.title,
          tag: c.tag,
          description: c.description,
          className: 'craft-card-dark',
          config: fallbackConfig,
          skeleton: (
            <div className="craft-card-skeleton">
              <img src={c.image} alt={c.title} className="craft-card-img" loading="lazy" />
              {c.badge && <span className="craft-card-badge">{c.badge}</span>}
              <div className="craft-card-overlay" />
            </div>
          ),
        };
      });
    }
    return CAR_INTERIOR_CARDS;
  }, [customCards]);
  const [active, setActive] = useState<CraftCardItem | null>(null);
  const [spacing, setSpacing] = useState(cardSpacing);

  const ref = useRef<HTMLDivElement>(null);
  const cardSpring = spring;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setActive(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const updateSpacing = () => {
      const w = window.innerWidth;
      if (w >= 1280) {
        setSpacing(cardSpacing);
      } else if (w >= 1024) {
        setSpacing(Math.round(cardSpacing * 0.85));
      } else if (w >= 768) {
        setSpacing(Math.round(cardSpacing * 0.65));
      } else if (w >= 540) {
        setSpacing(Math.round(cardSpacing * 0.48));
      } else {
        setSpacing(Math.round(cardSpacing * 0.32));
      }
    };
    updateSpacing();
    window.addEventListener('resize', updateSpacing);
    return () => window.removeEventListener('resize', updateSpacing);
  }, [cardSpacing]);

  const middle = (cards.length - 1) / 2;
  const isMobile = spacing <= 35;
  const currentActiveScale = isMobile ? 1.08 : activeScale;

  const isAnyCardActive = () => {
    return !!active?.title;
  };

  const isCurrentActive = (card: CraftCardItem) => {
    return active?.title === card.title;
  };

  return (
    <div
      className={cn('craft-cards-wrapper', className)}
      aria-label="Car interior craft gallery"
    >
      <motion.div
        ref={ref}
        onClick={() => setActive(null)}
        className="craft-cards-inner"
      >
        {cards.map((card, index) => {
          const offsetX = (index - middle) * spacing;
          const isActive = isCurrentActive(card);
          const hasAnyActive = isAnyCardActive();
          const cardRotate = isMobile
            ? Math.round(card.config.rotate * 0.6)
            : card.config.rotate;

          return (
            <motion.div key={card.title}>
              <motion.button
                type="button"
                initial={{
                  x: 0,
                  scale: 0,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActive(isActive ? null : card);
                }}
                animate={{
                  y: isActive
                    ? 0
                    : hasAnyActive
                      ? (isMobile ? 240 : 360)
                      : card.config.y,
                  x: isActive
                    ? 0
                    : hasAnyActive
                      ? offsetX * 0.35
                      : offsetX,
                  rotate: isActive
                    ? 0
                    : hasAnyActive
                      ? 0
                      : cardRotate,
                  scale: isActive
                    ? currentActiveScale
                    : hasAnyActive
                      ? 0.7
                      : 1,
                  opacity: isActive
                    ? 1
                    : hasAnyActive
                      ? 0
                      : 1,
                }}
                whileHover={{
                  scale: isActive
                    ? currentActiveScale
                    : hasAnyActive
                      ? 0.7
                      : 1.05,
                }}
                transition={cardSpring}
                style={{
                  width: `var(--width)`,
                  height: `var(--height)`,
                  marginLeft: `calc(var(--width) / -2)`,
                  marginTop: `calc(var(--height) / -2)`,
                  zIndex: isActive ? 50 : card.config.zIndex,
                  pointerEvents: hasAnyActive && !isActive ? 'none' : 'auto',
                }}
                className={cn('craft-card-btn', card.className, isActive && 'is-active')}
              >
                {card.skeleton}
                <div className="craft-card-body">
                  <motion.h3
                    layoutId={card.title + 'title'}
                    className="craft-card-title"
                  >
                    {card.title}
                  </motion.h3>
                  {card.tag && (
                    <span className="craft-card-tag">{card.tag}</span>
                  )}
                  <AnimatePresence mode="popLayout">
                    {isActive && (
                      <motion.p
                        layoutId={card.title + 'description'}
                        initial={{ opacity: 0, x: 14, y: 14, height: 0 }}
                        animate={{ opacity: 1, x: 0, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, x: 20, y: 20, height: 0 }}
                        transition={cardSpring}
                        className="craft-card-desc"
                      >
                        {card.description}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.button>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default Cards;

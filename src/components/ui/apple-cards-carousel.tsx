'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  IconArrowNarrowLeft,
  IconArrowNarrowRight,
  IconX,
} from '@tabler/icons-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useOutsideClick } from '@/hooks/use-outside-click';

export type AppleCardData = {
  src: string;
  title: string;
  category: string;
  number: string;
  description: string;
  alt: string;
  content: React.ReactNode;
};

interface CarouselProps {
  items: React.ReactElement[];
  initialScroll?: number;
}

export const CarouselContext = createContext<{
  onCardClose: (index: number) => void;
  currentIndex: number;
}>({
  onCardClose: () => undefined,
  currentIndex: 0,
});

export const Carousel = ({ items, initialScroll = 0 }: CarouselProps) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const checkScrollability = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  };

  useEffect(() => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollLeft = initialScroll;
    checkScrollability();
  }, [initialScroll]);

  useEffect(() => {
    window.addEventListener('resize', checkScrollability);
    return () => window.removeEventListener('resize', checkScrollability);
  }, []);

  const scrollByCards = (direction: number) => {
    const amount = Math.min(390, window.innerWidth * 0.72);
    carouselRef.current?.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  const handleCardClose = (index: number) => {
    if (carouselRef.current) {
      const cardWidth = window.innerWidth < 768 ? 270 : 384;
      carouselRef.current.scrollTo({
        left: (cardWidth + 18) * Math.min(index, items.length - 1),
        behavior: 'smooth',
      });
    }
    setCurrentIndex(index);
  };

  return (
    <CarouselContext.Provider value={{ onCardClose: handleCardClose, currentIndex }}>
      <div className="apple-carousel relative w-full">
        <div
          ref={carouselRef}
          className={cn('cats apple-carousel-viewport')}
          onScroll={checkScrollability}
          aria-label="Featured product categories"
        >
          {items.map((item, index) => (
            <motion.div
              key={`apple-card-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: index * 0.08, ease: 'easeOut' }}
              className="apple-carousel-item"
            >
              {item}
            </motion.div>
          ))}
        </div>
        <div className="apple-carousel-actions">
          <button
            type="button"
            className="featured-arrow"
            onClick={() => scrollByCards(-1)}
            disabled={!canScrollLeft}
            aria-label="Previous category"
          >
            <IconArrowNarrowLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            className="featured-arrow featured-arrow-next"
            onClick={() => scrollByCards(1)}
            disabled={!canScrollRight}
            aria-label="Next category"
          >
            <IconArrowNarrowRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </CarouselContext.Provider>
  );
};

export const Card = ({
  card,
  index,
  layout = true,
}: {
  card: AppleCardData;
  index: number;
  layout?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { onCardClose } = useContext(CarouselContext);

  const handleClose = () => {
    setOpen(false);
    onCardClose(index);
  };

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useOutsideClick(containerRef, handleClose);

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="category-dialog-backdrop">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="category-dialog-overlay"
              aria-hidden="true"
            />
            <motion.div
              ref={containerRef}
              initial={{ opacity: 0, y: 24, scale: .97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: .97 }}
              transition={{ duration: .35, ease: 'easeOut' }}
              className="category-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby={`category-title-${index}`}
            >
              <button type="button" className="category-dialog-close" onClick={handleClose} aria-label="Close category details">
                <IconX aria-hidden="true" />
              </button>
              <img className="category-dialog-image" src={card.src} alt={card.alt} />
              <div className="category-dialog-copy">
                <p className="category-dialog-kicker">{card.category}</p>
                <h2 id={`category-title-${index}`}>{card.title}</h2>
                <p className="category-dialog-description">{card.description}</p>
                <div
                  className="category-dialog-content"
                  onClick={(event) => {
                    if ((event.target as HTMLElement).closest('.category-dialog-action')) {
                      handleClose();
                    }
                  }}
                >
                  {card.content}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        layoutId={layout ? `apple-card-${card.title}` : undefined}
        onClick={() => setOpen(true)}
        className="cat apple-card"
        aria-label={`Open ${card.title} details`}
      >
        <img className="cat-photo" src={card.src} alt={card.alt} loading="lazy" />
        <div className="cat-shade" />
        <div className="cat-topline">
          <span className="n">{card.number}</span>
          <span className="cat-category">{card.category}</span>
        </div>
        <div className="ft">
          <div>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
          </div>
          <span className="go" aria-hidden="true">↗</span>
        </div>
      </motion.button>
    </>
  );
};

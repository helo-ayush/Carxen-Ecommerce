'use client';

import React from 'react';
import { Card, Carousel, type AppleCardData } from '@/components/ui/apple-cards-carousel';

type AppleCardsCarouselDemoProps = {
  onCategorySelect?: (filter: string) => void;
};

const categories = [
  {
    number: '01',
    category: 'Comfort / Interior',
    title: 'Seat covers',
    description: 'Custom fit. Premium finish.',
    detail: 'Diamond-stitched comfort, tailored for the way you drive.',
    filter: 'seats',
    src: '/head-rest.jpg',
    alt: 'Quilted car seat covers',
  },
  {
    number: '02',
    category: 'Protection / All-weather',
    title: 'Floor mats',
    description: 'Built for real-world roads.',
    detail: 'Deep channels and a precision fit keep every drive cleaner.',
    filter: 'mats',
    src: '/floor-mat.jpg',
    alt: 'All-weather car floor mat',
  },
  {
    number: '03',
    category: 'Control / Driver focus',
    title: 'Steering covers',
    description: 'Control meets comfort.',
    detail: 'A better grip, a sharper feel, and a more considered cockpit.',
    filter: 'steering',
    src: '/steering.jpg',
    alt: 'Car steering wheel and dashboard',
  },
  {
    number: '04',
    category: 'Comfort / Console',
    title: 'Armrest comfort',
    description: 'Soft touch. Long-drive ease.',
    detail: 'Refined cushioning that makes every kilometre feel more relaxed.',
    filter: 'comfort',
    src: '/hand-rest.jpg',
    alt: 'Car centre armrest',
  },
  {
    number: '05',
    category: 'Sport / Bucket seats',
    title: 'Performance interiors',
    description: 'Hold the line in style.',
    detail: 'Sport-inspired support and finish for a more confident cabin.',
    filter: 'seats',
    src: '/sports-bucket.jpg',
    alt: 'Sport bucket car seat',
  },
] as const;

const CategoryContent = ({
  filter,
  onCategorySelect,
}: {
  filter: string;
  onCategorySelect?: (filter: string) => void;
}) => (
  <button
    type="button"
    className="btn dark category-dialog-action"
    onClick={() => onCategorySelect?.(filter)}
  >
    Explore collection <span aria-hidden="true">→</span>
  </button>
);

export default function AppleCardsCarouselDemo({ onCategorySelect }: AppleCardsCarouselDemoProps) {
  const cards = categories.map((category, index) => {
    const card: AppleCardData = {
      ...category,
      content: (
        <>
          <p>{category.detail}</p>
          <CategoryContent
            filter={category.filter}
            onCategorySelect={onCategorySelect}
          />
        </>
      ),
    };

    return <Card key={card.src} card={card} index={index} />;
  });

  return (
    <div className="apple-cards-demo">
      <div className="featured-heading">
        <div className="featured-heading-copy">
          <div className="sec-head rv in">
            <span className="no">02</span>
            <span className="t">Featured categories</span>
          </div>
          <h2 className="featured-title rv in">Find your <span>fit.</span></h2>
          <p className="featured-intro rv in">
            Thoughtful upgrades for every seat, surface and drive.
          </p>
        </div>
        <div className="featured-controls">
          <span className="featured-note">Explore our signature collection</span>
        </div>
      </div>
      <Carousel items={cards} />
      <p className="featured-swipe-hint">Swipe to explore <span>→</span></p>
    </div>
  );
}

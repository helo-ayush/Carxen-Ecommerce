'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatINR, isCustomFit } from '@/data/products';
import { CatalogState } from '@/components/CatalogState';
import { ProductArt } from '@/components/ProductArt';
import { ProductCard } from '@/components/ProductCard';
import { Footer } from '@/components/Footer';

export default function WishlistPage() {
  const router = useRouter();
  const {
    fav, toggleFav, isFav, addToCart, openCart, car,
    products, catalogStatus, catalogError, retryCatalog,
  } = useApp();

  const activeCar = car || { b: 'Hyundai', m: 'Creta', y: '2024', f: 'Petrol' };
  const favProducts = products.filter((p) => fav.includes(p.id));

  return (
    <div className="in-shop">
      <section className="pp on" id="v-pg">
        <div className="wrap" id="pgIn">
          <h1 className="disp pg-t">Your favourites</h1>

          {catalogStatus !== 'ready' ? (
            <CatalogState
              status={catalogStatus}
              error={catalogError}
              onRetry={retryCatalog}
            />
          ) : favProducts.length > 0 ? (
            <div className="grid">
              {favProducts.map((p) => {
                const custom = isCustomFit(p);
                return (
                  <ProductCard
                    key={p.id}
                    product={p}
                    isFav={isFav(p.id)}
                    onToggleFav={toggleFav}
                    onAddToCart={addToCart}
                    onOpenCart={openCart}
                    fitText={custom ? `✓ Fits ${activeCar.m}` : 'Universal fit'}
                    isCustomFitBadge={custom}
                  />
                );
              })}
            </div>
          ) : (
            <div className="empty on">
              <b>Nothing saved yet</b>
              Tap the heart on any part to keep it here.
              <br />
              <br />
              <Link className="btn dark" href="/shop">
                Browse parts
              </Link>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}

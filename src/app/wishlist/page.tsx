'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatINR, isCustomFit } from '@/data/products';
import { CatalogState } from '@/components/CatalogState';
import { ProductArt } from '@/components/ProductArt';
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
                  <article key={p.id} className="pc">
                    <div
                      className="pm"
                      onClick={() => router.push(`/product/${p.id}`)}
                    >
                      <ProductArt product={p} />
                      <span className={`fitb ${custom ? '' : 'u'}`}>
                        {custom ? `✓ Fits your ${activeCar.m}` : 'Universal fit'}
                      </span>
                      <span className="qv">View details</span>
                      {p.top && <span className="top-b">Top item</span>}
                      {p.nw && <span className="top-b new-b">New</span>}
                    </div>

                    <button
                      className={`hrt ${isFav(p.id) ? 'on' : ''}`}
                      onClick={() => toggleFav(p.id)}
                      aria-label="Favourite"
                    >
                      <svg viewBox="0 0 24 24">
                        <path d="M12 20s-7-4.6-9-9A5.2 5.2 0 0 1 12 6.4 5.2 5.2 0 0 1 21 11c-2 4.4-9 9-9 9z" />
                      </svg>
                    </button>

                    <div className="pi">
                      <h3 onClick={() => router.push(`/product/${p.id}`)}>
                        {p.n}
                      </h3>
                      <div className="rt">
                        <b>★</b> {p.r} · {p.rv} reviews
                      </div>
                      <div className="pr">
                        {p.o && <s>{formatINR(p.o)}</s>}
                        <button
                          className="buy"
                          onClick={() => {
                            addToCart(p.id, 1);
                            openCart();
                          }}
                        >
                          <svg viewBox="0 0 24 24">
                            <path d="M6 8h12l1 12H5L6 8z" />
                            <path d="M9 8V6a3 3 0 0 1 6 0v2" />
                          </svg>
                          {formatINR(p.p)}
                        </button>
                      </div>
                    </div>
                  </article>
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

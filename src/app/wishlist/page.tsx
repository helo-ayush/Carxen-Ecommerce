'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatINR, isCustomFit } from '@/data/products';
import { fitBadgeText } from '@/lib/storefront/fitment';
import { CatalogState } from '@/components/CatalogState';
import { ProductCard } from '@/components/ProductCard';
import { Footer } from '@/components/Footer';
import {
  Heart,
  ShoppingBag,
  Trash2,
  ArrowRight,
  CarFront,
} from 'lucide-react';
import './wishlist.css';

export default function WishlistPage() {
  const router = useRouter();
  const {
    fav,
    toggleFav,
    isFav,
    addToCart,
    openCart,
    car,
    products,
    catalogStatus,
    catalogError,
    retryCatalog,
    showToast,
  } = useApp();

  const activeCar = car || { b: 'Hyundai', m: 'Creta', y: '2024', f: 'Petrol' };
  const favProducts = useMemo(() => {
    return products.filter((p) => fav.includes(p.id));
  }, [products, fav]);

  const totalValuation = useMemo(() => {
    return favProducts.reduce((sum, p) => sum + (p.p || 0), 0);
  }, [favProducts]);

  const recommendedProducts = useMemo(() => {
    return products.filter((p) => !fav.includes(p.id)).slice(0, 4);
  }, [products, fav]);

  const handleMoveAllToCart = () => {
    if (favProducts.length === 0) return;
    favProducts.forEach((p) => addToCart(p.id, 1));
    openCart();
    showToast(`Added ${favProducts.length} items to your cart`);
  };

  const handleClearAll = () => {
    if (fav.length === 0) return;
    fav.forEach((id) => toggleFav(id));
    showToast('Cleared all saved items');
  };

  return (
    <div className="in-shop" style={{ minHeight: '100vh', background: 'var(--bg, #f4f3ef)' }}>
      <section className="pp on" id="v-pg" style={{ paddingTop: '28px' }}>
        <div className="wl-page-wrap" id="pgIn">
          
          {/* Top Back Navigation Button */}
          <div className="wl-top-nav">
            <Link href="/shop" className="cx-back-btn" aria-label="Back to shop">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Back to shop</span>
            </Link>
          </div>

          {/* Subtle Heading Text & Header Bar */}
          <div className="wl-header-bar">
            <div>
              <div className="wl-eyebrow">
                <Heart size={13} />
                <span>Personal Garage · Saved Collection</span>
              </div>
              <div className="wl-title-row">
                <h1 className="wl-title">
                  Saved Favourites
                </h1>
                <span className="wl-count-badge">
                  {favProducts.length} {favProducts.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <p className="wl-subtitle">
                Precision components curated for your <strong>{activeCar.y} {activeCar.b} {activeCar.m}</strong>. Ready for your build whenever you are.
              </p>
            </div>

            {/* Quick Actions (when items exist) */}
            {favProducts.length > 0 && (
              <div className="wl-actions-group">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="wl-btn-clear"
                >
                  <Trash2 size={13} />
                  <span>Clear all</span>
                </button>
                <button
                  type="button"
                  onClick={handleMoveAllToCart}
                  className="wl-btn-move-all"
                >
                  <ShoppingBag size={14} />
                  <span>Move all to cart</span>
                </button>
              </div>
            )}
          </div>

          <div className="wl-separator" />

          {catalogStatus !== 'ready' ? (
            <CatalogState
              status={catalogStatus}
              error={catalogError}
              onRetry={retryCatalog}
            />
          ) : favProducts.length > 0 ? (
            <>
              {/* Garage Vehicle Compatibility & Valuation Card */}
              <div className="wl-info-card">
                <div className="wl-fitment-col">
                  <div className="wl-car-icon-box">
                    <CarFront size={18} />
                  </div>
                  <div>
                    <div className="wl-fitment-title">
                      <span className="wl-green-dot" />
                      <span>Fitment verified for {activeCar.y} {activeCar.b} {activeCar.m}</span>
                    </div>
                    <div className="wl-fitment-desc">
                      All saved products match your active vehicle specification ·{' '}
                      <Link href="/account?tab=garage">
                        Change vehicle
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="wl-valuation-col">
                  <span className="wl-val-eyebrow">Total Valuation</span>
                  <span className="wl-val-price">{formatINR(totalValuation)}</span>
                </div>
              </div>

              {/* Grid of Product Cards */}
              <div className="wl-grid">
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
                      fitText={fitBadgeText(p, activeCar)}
                      isCustomFitBadge={custom}
                    />
                  );
                })}
              </div>
            </>
          ) : (
            <div>
              {/* Empty State Card */}
              <div className="wl-empty-card">
                <div className="wl-empty-icon-wrap">
                  <Heart size={28} className="stroke-[1.8]" />
                </div>
                <h2 className="wl-empty-title">
                  Your Wishlist is Empty
                </h2>
                <p className="wl-empty-text">
                  You haven&apos;t saved any parts for your <strong>{activeCar.y} {activeCar.b} {activeCar.m}</strong> yet. Tap the heart on any component to keep it here for your build.
                </p>
                <div className="wl-empty-actions">
                  <Link href="/shop" className="wl-btn-primary">
                    <ShoppingBag size={14} />
                    <span>Browse Catalog</span>
                  </Link>
                  <Link href="/account?tab=garage" className="wl-btn-secondary">
                    <CarFront size={14} />
                    <span>Manage Garage</span>
                  </Link>
                </div>
              </div>

              {/* Recommended Upgrades Section for Active Car */}
              {recommendedProducts.length > 0 && (
                <div className="wl-recom-wrap">
                  <div className="wl-recom-head">
                    <div>
                      <div className="wl-recom-eyebrow">
                        Recommended Upgrades
                      </div>
                      <h3 className="wl-recom-title">
                        Trending Parts for your {activeCar.m}
                      </h3>
                    </div>
                    <Link href="/shop" className="wl-recom-link">
                      <span>View catalog</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>

                  <div className="wl-grid">
                    {recommendedProducts.map((p) => {
                      const custom = isCustomFit(p);
                      return (
                        <ProductCard
                          key={p.id}
                          product={p}
                          isFav={isFav(p.id)}
                          onToggleFav={toggleFav}
                          onAddToCart={addToCart}
                          onOpenCart={openCart}
                          fitText={fitBadgeText(p, activeCar)}
                          isCustomFitBadge={custom}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}

'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/data/products';
import { CatalogState } from './CatalogState';
import { ProductArt } from './ProductArt';
import {
  ShoppingBag,
  X,
  Trash2,
  Plus,
  Minus,
  Truck,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import '@/components/storefront/cart-drawer.css';

export function CartDrawer() {
  const {
    user,
    isCartOpen,
    closeCart,
    cart,
    cartCount,
    cartSubtotal,
    products,
    catalogStatus,
    catalogError,
    retryCatalog,
    updateCartQty,
    removeFromCart,
    addToCart,
    showToast,
    isWholesaleApproved,
    b2bProfile,
  } = useApp();
  const router = useRouter();

  const cartEntries = useMemo(() => {
    return Object.entries(cart)
      .map(([idStr, qty]) => ({
        product: products.find((p) => p.id === Number(idStr))!,
        qty,
      }))
      .filter((item) => !!item.product);
  }, [cart, products]);

  const freeShippingThreshold = 1499;
  const amountLeft = Math.max(0, freeShippingThreshold - cartSubtotal);
  const shippingPercent = Math.min(100, (cartSubtotal / freeShippingThreshold) * 100);
  const hasFreeShipping = cartSubtotal >= freeShippingThreshold && cartSubtotal > 0;

  // Curated quick add-ons (products not currently in cart)
  const upsellProducts = useMemo(() => {
    if (cartEntries.length === 0) return [];
    return products
      .filter((p) => !cart[p.id] && p.p <= 4000)
      .slice(0, 2);
  }, [products, cart, cartEntries]);

  const handleCheckout = () => {
    if (cartCount > 0 && catalogStatus !== 'ready') {
      showToast('Waiting for the catalog to load');
      return;
    }
    if (cartEntries.length === 0) {
      showToast('Your cart is empty');
      return;
    }
    closeCart();
    if (!user) {
      showToast('Please sign in to proceed to checkout');
      router.push('/login?redirect=/checkout');
      return;
    }
    router.push('/checkout');
  };

  return (
    <>
      {/* Dim Backdrop Scrim */}
      <div
        className={`scrim cx-cart-scrim ${isCartOpen ? 'on open' : ''}`}
        id="scrim"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Slide-out Cart Drawer */}
      <aside
        className={`drawer cx-cart-drawer ${isCartOpen ? 'on open' : ''}`}
        id="drawer"
        aria-label="Shopping Cart Drawer"
      >
        {/* Header */}
        <div className="cx-cart-header" id="dh">
          <div className="cx-cart-header-title-row">
            <ShoppingBag className="w-5 h-5 text-[#e2231a]" strokeWidth={2.2} />
            <h2 className="cx-cart-header-title">
              Your Cart
            </h2>
            <span className="cx-cart-badge">
              {cartCount} {cartCount === 1 ? 'item' : 'items'}
            </span>
          </div>
          <button
            className="cx-cart-close-btn"
            id="dx"
            onClick={closeCart}
            aria-label="Close cart"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Free Shipping Progress Banner */}
        <div className="cx-cart-shipping-banner" id="ship">
          <div className="cx-cart-shipping-status">
            <div className="cx-cart-shipping-icon-text">
              {hasFreeShipping ? (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>
                    You unlocked <span className="cx-cart-shipping-highlight">Free Express Shipping</span>
                  </span>
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4 text-[#e2231a]" />
                  <span>
                    Add <span className="cx-cart-shipping-highlight">{formatINR(amountLeft)}</span> more for Free Shipping
                  </span>
                </>
              )}
            </div>
            {hasFreeShipping && (
              <span className="cx-cart-shipping-unlocked-tag">UNLOCKED</span>
            )}
          </div>
          <div className="cx-cart-progress-track">
            <div
              className={`cx-cart-progress-fill ${hasFreeShipping ? 'unlocked' : ''}`}
              style={{ width: `${shippingPercent}%` }}
            />
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="cx-cart-body" id="dl">
          {cartCount > 0 && catalogStatus !== 'ready' ? (
            <CatalogState
              status={catalogStatus}
              error={catalogError}
              onRetry={retryCatalog}
              title="Cart items unavailable"
              message="Your saved cart items need the storefront catalog to load."
            />
          ) : cartEntries.length > 0 ? (
            <>
              {/* Product Cards List */}
              {cartEntries.map(({ product, qty }) => {
                const itemTotal = product.p * qty;

                return (
                  <div className="cx-cart-card" key={product.id}>
                    {/* Thumbnail */}
                    <Link
                      href={`/product/${product.id}`}
                      onClick={closeCart}
                      className="cx-cart-card-thumb"
                    >
                      <ProductArt product={product} />
                    </Link>

                    {/* Card Content */}
                    <div className="cx-cart-card-content">
                      <div>
                        <div className="cx-cart-card-top-row">
                          <Link
                            href={`/product/${product.id}`}
                            onClick={closeCart}
                            className="cx-cart-card-title"
                          >
                            {product.n}
                          </Link>
                          <span className="cx-cart-card-item-total">
                            {formatINR(itemTotal)}
                          </span>
                        </div>

                        <div className="cx-cart-card-meta">
                          <span>{product.c || 'Precision Fit'}</span>
                          <span>·</span>
                          <span>{formatINR(product.p)} each</span>
                        </div>
                      </div>

                    {/* Stepper + Remove row */}
                    <div className="cx-cart-card-actions-row">
                      <div className="cx-cart-stepper">
                        <button
                          type="button"
                          className="cx-cart-stepper-btn"
                          onClick={() => updateCartQty(product.id, -1)}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="cx-cart-stepper-value">{qty}</span>
                        <button
                          type="button"
                          className="cx-cart-stepper-btn"
                          onClick={() => updateCartQty(product.id, 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        className="cx-cart-remove-btn"
                        onClick={() => removeFromCart(product.id)}
                        aria-label={`Remove ${product.n} from cart`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

              {/* Frequently Added Accessories (Upsell) */}
              {upsellProducts.length > 0 && (
                <div className="cx-cart-upsells">
                  <div className="cx-cart-upsells-header">
                    <Sparkles className="w-3.5 h-3.5 text-[#e2231a]" />
                    <span>Frequently Added Accessories</span>
                  </div>
                  <div className="cx-cart-upsells-list">
                    {upsellProducts.map((addon) => (
                      <div className="cx-cart-upsell-item" key={addon.id}>
                        <Link
                          href={`/product/${addon.id}`}
                          onClick={closeCart}
                          className="cx-cart-upsell-thumb"
                          title={`View ${addon.n}`}
                        >
                          <ProductArt product={addon} />
                        </Link>
                        <div className="cx-cart-upsell-info">
                          <Link
                            href={`/product/${addon.id}`}
                            onClick={closeCart}
                            className="cx-cart-upsell-name"
                            title={`View ${addon.n}`}
                          >
                            {addon.n}
                          </Link>
                          <div className="cx-cart-upsell-price">{formatINR(addon.p)}</div>
                        </div>
                        <button
                          type="button"
                          className="cx-cart-upsell-add-btn"
                          onClick={() => addToCart(addon.id, 1)}
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Empty State */
            <div className="cx-cart-empty-state">
              <div className="cx-cart-empty-icon-wrap">
                <ShoppingBag className="w-9 h-9 text-[#a1a1aa]" strokeWidth={1.5} />
              </div>
              <h3 className="cx-cart-empty-title">Your cart is empty</h3>
              <p className="cx-cart-empty-desc">
                Explore handcrafted seat covers, custom floor mats, and cabin accessories engineered for your car.
              </p>
              <Link
                href="/shop"
                onClick={closeCart}
                className="cx-cart-empty-btn"
              >
                <span>Browse Products</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Footer & Checkout */}
        {cartEntries.length > 0 && (
          <div className="cx-cart-footer" id="df">
            <div className="cx-cart-summary-table">
              <div className="cx-cart-summary-row">
                <span>Subtotal</span>
                <span id="sub" className="font-semibold text-[#0e0e0f]">
                  {formatINR(cartSubtotal)}
                </span>
              </div>
              <div className="cx-cart-summary-row">
                <span>Estimated Shipping</span>
                <span className={hasFreeShipping ? 'font-bold text-emerald-600' : 'text-[#0e0e0f]'}>
                  {hasFreeShipping ? 'FREE' : formatINR(99)}
                </span>
              </div>
              <div className="cx-cart-summary-row total">
                <span>Total</span>
                <span>{formatINR(cartSubtotal + (hasFreeShipping ? 0 : 99))}</span>
              </div>
            </div>

            <button
              type="button"
              className="cx-cart-checkout-btn"
              id="co"
              onClick={handleCheckout}
            >
              <span>PROCEED TO CHECKOUT</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="cx-cart-trust-row">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>256-Bit SSL Encrypted · 100% Secure Checkout</span>
            </div>

            <div className="cx-cart-payment-methods">
              <span className="cx-cart-payment-pill">UPI</span>
              <span className="cx-cart-payment-pill">Cards</span>
              <span className="cx-cart-payment-pill">NetBanking</span>
              <span className="cx-cart-payment-pill">COD</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

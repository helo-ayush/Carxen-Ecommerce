'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/data/products';
import { CatalogState } from './CatalogState';
import { ProductArt } from './ProductArt';

export function CartDrawer() {
  const {
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
    showToast,
  } = useApp();
  const router = useRouter();

  const cartEntries = Object.entries(cart).map(([idStr, qty]) => ({
    product: products.find((p) => p.id === Number(idStr))!,
    qty,
  })).filter((item) => !!item.product);

  const freeShippingThreshold = 1499;
  const amountLeft = Math.max(0, freeShippingThreshold - cartSubtotal);
  const shippingPercent = Math.min(100, (cartSubtotal / freeShippingThreshold) * 100);

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
    router.push('/checkout');
  };

  return (
    <>
      <div
        className={`scrim ${isCartOpen ? 'on' : ''}`}
        id="scrim"
        onClick={closeCart}
      />
      <aside className={`drawer ${isCartOpen ? 'on' : ''}`} id="drawer" aria-label="Cart">
        <div className="dh">
          <h3>Your cart</h3>
          <button className="xb" id="dx" onClick={closeCart} aria-label="Close">
            <svg viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="ship" id="ship">
          {amountLeft > 0 ? (
            <>
              Add <b>{formatINR(amountLeft)}</b> more for free shipping
            </>
          ) : (
            <>
              🎉 You unlocked <b>free shipping</b>
            </>
          )}
          <div className="bar">
            <i style={{ width: `${shippingPercent}%` }} />
          </div>
        </div>

        <div className="dl" id="dl">
          {cartCount > 0 && catalogStatus !== 'ready' ? (
            <CatalogState
              status={catalogStatus}
              error={catalogError}
              onRetry={retryCatalog}
              title="Cart items unavailable"
              message="Your saved cart items need the storefront catalog to load."
            />
          ) : cartEntries.length > 0 ? (
            cartEntries.map(({ product, qty }) => (
              <div className="bi" key={product.id}>
                <div className="th">
                  <ProductArt product={product} />
                </div>
                <div>
                  <h4>{product.n}</h4>
                  <div className="q">
                    <button
                      onClick={() => updateCartQty(product.id, -1)}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span>{qty}</span>
                    <button
                      onClick={() => updateCartQty(product.id, 1)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="pr2">
                  {formatINR(product.p * qty)}
                  <button
                    className="rm"
                    onClick={() => removeFromCart(product.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="dempty">
              Your cart is empty.
              <br />
              Add something engineered.
            </div>
          )}
        </div>

        <div className="df">
          <div className="tot">
            <span>Subtotal</span>
            <span id="sub">{formatINR(cartSubtotal)}</span>
          </div>
          <button className="btn" id="co" onClick={handleCheckout}>
            Checkout
            <svg viewBox="0 0 24 24">
              <path d="M4 12h16M13 5l7 7-7 7" />
            </svg>
          </button>
          <small>Demo storefront — no payment is processed.</small>
        </div>
      </aside>
    </>
  );
}

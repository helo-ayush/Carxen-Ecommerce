'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/data/products';
import { CatalogState } from '@/components/CatalogState';
import { ProductArt } from '@/components/ProductArt';
import { Footer } from '@/components/Footer';
import { createStorefrontOrder } from '@/lib/storefront/order-client';
import type {
  StorefrontCheckoutRequest,
  StorefrontPaymentMethod,
  StorefrontShippingAddressSnapshot,
} from '@/lib/storefront/order-types';

export default function CheckoutPage() {
  const router = useRouter();
  const {
    user,
    cart,
    cartSubtotal,
    products,
    catalogStatus,
    catalogError,
    retryCatalog,
    updateCartQty,
    clearCart,
    showToast,
  } = useApp();

  const userName = user?.name && user.name !== 'Driver' && user.name !== 'Guest' ? user.name : 'Aarav Mehta';
  const [addressIndex, setAddressIndex] = useState(0);
  const [shippingSpeed, setShippingSpeed] = useState<'std' | 'exp'>('std');
  const [paymentMethod, setPaymentMethod] = useState<StorefrontPaymentMethod>('UPI');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [newAddress, setNewAddress] = useState({
    name: '',
    phone: '',
    postalCode: '',
    city: '',
    addressLine1: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Interactive Card Form State
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');

  const cartEntries = Object.entries(cart)
    .map(([idStr, qty]) => ({
      product: products.find((p) => p.id === Number(idStr))!,
      qty,
    }))
    .filter((x) => !!x.product);

  const couponDiscount = appliedCoupon === 'CARXEN10' ? Math.round(cartSubtotal * 0.1) : 0;
  const isEligibleForFreeStandard = cartSubtotal - couponDiscount >= 1499;

  const shippingCost =
    shippingSpeed === 'exp'
      ? 199
      : isEligibleForFreeStandard
      ? 0
      : 99;

  const finalTotal = cartSubtotal - couponDiscount + shippingCost;

  const originalSavings = cartEntries.reduce((acc, { product, qty }) => {
    return acc + (product.o ? (product.o - product.p) * qty : 0);
  }, 0);
  const totalSavings = couponDiscount + originalSavings;

  const formatDateOffset = (days: number) => {
    const d = new Date(Date.now() + days * 864e5);
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const handleApplyCoupon = (codeToApply?: string) => {
    const code = (codeToApply || couponCode).trim().toUpperCase();
    if (code === 'CARXEN10') {
      setAppliedCoupon('CARXEN10');
      setCouponCode('CARXEN10');
      showToast('Coupon applied — 10% off');
    } else {
      setAppliedCoupon('');
      showToast('Invalid code — try CARXEN10');
    }
  };

  const handlePlaceOrder = async () => {
    if (isSubmitting) return;

    if (cartEntries.length === 0) {
      showToast('Your cart is empty');
      return;
    }

    const selectedAddress: StorefrontShippingAddressSnapshot =
      addressIndex === 0
        ? {
            name: userName,
            addressLine1: '12, Lake View Road, Koregaon Park',
            city: 'Pune',
            state: 'Maharashtra',
            postalCode: '411001',
            country: 'IN',
          }
        : addressIndex === 1
        ? {
            name: userName,
            addressLine1: 'Tower B, Hinjewadi Phase 2',
            city: 'Pune',
            state: 'Maharashtra',
            postalCode: '411057',
            country: 'IN',
          }
        : {
            ...newAddress,
            country: 'IN',
          };

    if (
      addressIndex === 2 &&
      (!newAddress.name.trim() ||
        !newAddress.phone.trim() ||
        !newAddress.postalCode.trim() ||
        !newAddress.city.trim() ||
        !newAddress.addressLine1.trim())
    ) {
      const message = 'Complete the new delivery address before placing your order.';
      setSubmitError(message);
      showToast(message);
      return;
    }

    const checkout: StorefrontCheckoutRequest = {
      customer: {
        name: selectedAddress.name || userName,
        ...(selectedAddress.phone ? { phone: selectedAddress.phone } : {}),
      },
      shippingAddress: selectedAddress,
      items: cartEntries.map(({ product, qty }) => ({
        productId: product.id,
        quantity: qty,
      })),
      shippingSpeed,
      paymentMethod,
      couponCode: appliedCoupon || null,
    };

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // The server/RPC result owns the order number and all final amounts.
      const order = await createStorefrontOrder(checkout);
      clearCart();
      showToast('Order placed — payment remains pending');
      router.push(`/order/${encodeURIComponent(order.orderNumber)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The order could not be placed.';
      setSubmitError(message);
      showToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCardNumberChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  const handleCardExpiryChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    const formatted =
      digits.length > 2 ? digits.slice(0, 2) + '/' + digits.slice(2) : digits;
    setCardExpiry(formatted);
  };

  return (
    <div className="in-shop">
      <section className="pp on" id="v-pg">
        <div className="wrap" id="pgIn">
          <div className="ck-hd">
            <h1 className="disp pg-t">Checkout</h1>
            <div className="ck-steps">
              <span className="done">
                <b>✓</b>Cart
              </span>
              <i />
              <span className="on">
                <b>2</b>Details
              </span>
              <i />
              <span>
                <b>3</b>Done
              </span>
            </div>
          </div>

          {catalogStatus !== 'ready' ? (
            <CatalogState
              status={catalogStatus}
              error={catalogError}
              onRetry={retryCatalog}
            />
          ) : cartEntries.length === 0 ? (
            <div className="empty on">
              <b>Your cart is empty</b>
              Add a few parts first.
              <br />
              <br />
              <Link className="btn dark" href="/shop">
                Browse parts
              </Link>
            </div>
          ) : (
            <div className="ck-g">
              {/* Left Column: Details */}
              <div>
                {/* 1. Address */}
                <div className="ck-b">
                  <h3>
                    <b className="ck-n">1</b>Delivery address
                  </h3>
                  <div className="ck-ads" style={{ marginTop: '14px' }}>
                    <button
                      className={`ck-ad ${addressIndex === 0 ? 'on' : ''}`}
                      onClick={() => setAddressIndex(0)}
                    >
                      <i />
                      <span className="tg">Home</span>
                      <b>{userName}</b>
                      <small>12, Lake View Road, Koregaon Park, Pune 411001</small>
                    </button>

                    <button
                      className={`ck-ad ${addressIndex === 1 ? 'on' : ''}`}
                      onClick={() => setAddressIndex(1)}
                    >
                      <i />
                      <span className="tg">Work</span>
                      <b>{userName}</b>
                      <small>Tower B, Hinjewadi Phase 2, Pune 411057</small>
                    </button>

                    <button
                      className={`ck-ad nw ${addressIndex === 2 ? 'on' : ''}`}
                      onClick={() => setAddressIndex(2)}
                    >
                      <i />
                      <b>+ New address</b>
                      <small>Deliver somewhere else</small>
                    </button>

                    {addressIndex === 2 && (
                      <div className="ck-2 ck-fm" style={{ marginTop: '10px' }}>
                        <input
                          className="lg-in"
                          placeholder="Full name"
                          value={newAddress.name}
                          onChange={(e) => setNewAddress((current) => ({ ...current, name: e.target.value }))}
                        />
                        <input
                          className="lg-in"
                          placeholder="Phone number"
                          value={newAddress.phone}
                          onChange={(e) => setNewAddress((current) => ({ ...current, phone: e.target.value }))}
                        />
                        <input
                          className="lg-in"
                          placeholder="Pincode"
                          inputMode="numeric"
                          value={newAddress.postalCode}
                          onChange={(e) =>
                            setNewAddress((current) => ({ ...current, postalCode: e.target.value }))
                          }
                        />
                        <input
                          className="lg-in"
                          placeholder="City"
                          value={newAddress.city}
                          onChange={(e) => setNewAddress((current) => ({ ...current, city: e.target.value }))}
                        />
                        <input
                          className="lg-in"
                          style={{ gridColumn: '1/-1' }}
                          placeholder="House no., street, area"
                          value={newAddress.addressLine1}
                          onChange={(e) =>
                            setNewAddress((current) => ({ ...current, addressLine1: e.target.value }))
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Delivery Speed */}
                <div className="ck-b">
                  <h3>
                    <b className="ck-n">2</b>Delivery speed
                  </h3>
                  <div className="ck-opts" style={{ marginTop: '14px' }}>
                    <button
                      className={`ck-op ${shippingSpeed === 'std' ? 'on' : ''}`}
                      onClick={() => setShippingSpeed('std')}
                    >
                      <span className="ck-ic">
                        <svg viewBox="0 0 24 24">
                          <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" />
                        </svg>
                      </span>
                      <b>Standard</b>
                      <small>Arrives {formatDateOffset(4)}</small>
                      <em>{isEligibleForFreeStandard ? 'Free' : '₹99'}</em>
                    </button>

                    <button
                      className={`ck-op ${shippingSpeed === 'exp' ? 'on' : ''}`}
                      onClick={() => setShippingSpeed('exp')}
                    >
                      <span className="ck-ic">
                        <svg viewBox="0 0 24 24">
                          <path d="M13 3L5 14h6l-1 7 8-11h-6z" />
                        </svg>
                      </span>
                      <b>Express</b>
                      <small>Arrives {formatDateOffset(2)}</small>
                      <em>₹199</em>
                    </button>
                  </div>
                </div>

                {/* 3. Payment */}
                <div className="ck-b">
                  <h3>
                    <b className="ck-n">3</b>Payment · demo / pending
                  </h3>
                  <p className="gr-s" style={{ margin: '0 0 12px' }}>
                    Demo payment selection — no card or UPI is captured. Payment remains pending until a gateway is connected.
                  </p>
                  <div className="ck-opts ck-pms" style={{ marginTop: '14px' }}>
                    {[
                      {
                        key: 'UPI',
                        label: 'UPI (demo)',
                        icon: (
                          <svg viewBox="0 0 24 24">
                            <rect x="7" y="3" width="10" height="18" rx="2" />
                            <path d="M11 18h2" />
                          </svg>
                        ),
                      },
                      {
                        key: 'Card',
                        label: 'Card (demo)',
                        icon: (
                          <svg viewBox="0 0 24 24">
                            <rect x="3" y="6" width="18" height="13" rx="2" />
                            <path d="M3 10h18" />
                          </svg>
                        ),
                      },
                      {
                        key: 'Net banking',
                        label: 'Net banking (demo)',
                        icon: (
                          <svg viewBox="0 0 24 24">
                            <path d="M3 10l9-6 9 6M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18" />
                          </svg>
                        ),
                      },
                      {
                        key: 'Cash on delivery',
                        label: 'Cash on delivery (pending)',
                        icon: (
                          <svg viewBox="0 0 24 24">
                            <rect x="3" y="7" width="18" height="11" rx="2" />
                            <circle cx="12" cy="12.5" r="2.5" />
                          </svg>
                        ),
                      },
                    ].map(({ key, label, icon }) => (
                      <button
                        key={key}
                        className={`ck-op ${paymentMethod === key ? 'on' : ''}`}
                        onClick={() => setPaymentMethod(key as StorefrontPaymentMethod)}
                      >
                        <span className="ck-ic">{icon}</span>
                        <b>{label}</b>
                      </button>
                    ))}
                  </div>

                  {/* Payment Panel */}
                  <div className="ck-pn">
                    {paymentMethod === 'UPI' && (
                      <div>
                        <input className="lg-in" placeholder="Enter UPI ID (name@upi)" />
                        <div className="sp-cs">
                          <span className="pill">Google Pay</span>
                          <span className="pill">PhonePe</span>
                          <span className="pill">Paytm</span>
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'Card' && (
                      <div>
                        <div className="ck-cd" style={{ marginBottom: '14px' }}>
                          <span>CARXEN</span>
                          <b>
                            {cardNumber || '•••• •••• •••• ••••'}
                          </b>
                          <div>
                            <small>
                              Card holder
                              <br />
                              <em>{cardHolder.toUpperCase() || 'FULL NAME'}</em>
                            </small>
                            <small>
                              Expires
                              <br />
                              <em>{cardExpiry || 'MM/YY'}</em>
                            </small>
                          </div>
                        </div>

                        <div className="ck-2">
                          <input
                            className="lg-in"
                            inputMode="numeric"
                            placeholder="Card number (demo only)"
                            style={{ gridColumn: '1/-1' }}
                            value={cardNumber}
                            onChange={(e) => handleCardNumberChange(e.target.value)}
                          />
                          <input
                            className="lg-in"
                            placeholder="Name on card"
                            value={cardHolder}
                            onChange={(e) => setCardHolder(e.target.value)}
                          />
                          <input
                            className="lg-in"
                            inputMode="numeric"
                            placeholder="MM/YY"
                            value={cardExpiry}
                            onChange={(e) => handleCardExpiryChange(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'Net banking' && (
                      <div className="sp-cs">
                        {['HDFC Bank', 'SBI', 'ICICI Bank', 'Axis Bank', 'Kotak'].map((b) => (
                          <button
                            key={b}
                            className={`pill ${selectedBank === b ? 'on' : ''}`}
                            onClick={() => setSelectedBank(b)}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    )}

                    {paymentMethod === 'Cash on delivery' && (
                      <p className="gr-s">
                        Pay {formatINR(finalTotal)} in cash or UPI when your order arrives.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Order Summary */}
              <div className="ck-s">
                <h3>Order summary</h3>
                {cartEntries.map(({ product, qty }) => (
                  <div className="ck-si" key={product.id}>
                    <div className="th">
                      <ProductArt product={product} />
                    </div>
                    <div className="nm">
                      {product.n}
                      <small>{formatINR(product.p)} each</small>
                      <div className="qs">
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
                    <b>{formatINR(product.p * qty)}</b>
                  </div>
                ))}

                <div className="ck-c">
                  <input
                    placeholder="Coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                  <button onClick={() => handleApplyCoupon()}>Apply</button>
                </div>

                {appliedCoupon ? (
                  <p className="ck-ap">✓ {appliedCoupon} applied</p>
                ) : (
                  <button
                    className="ck-cpn"
                    onClick={() => handleApplyCoupon('CARXEN10')}
                  >
                    Tap to use CARXEN10 · 10% off
                  </button>
                )}

                <div className="ck-r">
                  <span>Subtotal</span>
                  <span>{formatINR(cartSubtotal)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="ck-r g">
                    <span>Coupon discount</span>
                    <span>−{formatINR(couponDiscount)}</span>
                  </div>
                )}
                <div className="ck-r">
                  <span>Shipping</span>
                  <span>{shippingCost ? formatINR(shippingCost) : 'Free'}</span>
                </div>
                <div className="ck-r t">
                  <span>Total</span>
                  <b>{formatINR(finalTotal)}</b>
                </div>

                {totalSavings > 0 && (
                  <p className="ck-sv">
                    You&apos;re saving {formatINR(totalSavings)} on this order
                  </p>
                )}

                {submitError && (
                  <p className="ck-sv" role="alert" style={{ background: '#e2231a22', color: '#ff8d86' }}>
                    {submitError}
                  </p>
                )}

                <p className="gr-s" style={{ color: '#8d8d93', fontSize: '11px', margin: '4px 0 10px', textAlign: 'center' }}>
                  Final total is calculated by the storefront server. Payment is still pending in this demo checkout.
                </p>

                <button
                  className="ck-pl"
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                  style={isSubmitting ? { opacity: 0.7, cursor: 'wait' } : undefined}
                >
                  {isSubmitting ? 'Saving order…' : `Place order · ${formatINR(finalTotal)}`}
                </button>

                <div className="ck-tr">
                  <span>
                    <svg viewBox="0 0 24 24">
                      <rect x="5" y="11" width="14" height="9" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                    Secure checkout
                  </span>
                  <span>2-year warranty</span>
                  <span>30-day returns</span>
                </div>
                <p className="gr-s" style={{ color: '#8d8d93', fontSize: '11px', margin: '10px 0 0', textAlign: 'center' }}>
                  Cart sync is a pending backend step; the saved order is server-backed.
                </p>
              </div>
            </div>
          )}

          {/* Sticky Mobile Bar */}
          {catalogStatus === 'ready' && cartEntries.length > 0 && (
            <div className="ck-bar">
              <div>
                <small>Total</small>
                <b>{formatINR(finalTotal)}</b>
              </div>
              <button
                className="ck-pl"
                onClick={handlePlaceOrder}
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                style={isSubmitting ? { opacity: 0.7, cursor: 'wait' } : undefined}
              >
                {isSubmitting ? 'Saving…' : 'Place order'}
              </button>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

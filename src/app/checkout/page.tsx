'use client';

import React, { useState, useEffect, useRef } from 'react';
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

import {
  CreditCard,
  ShoppingBag,
  Gift,
  ReceiptText,
  ChevronRight,
  HelpCircle,
  Truck,
  Zap,
  MapPin,
  Lock,
  Plus,
  X,
  Check,
  CheckCircle2,
  Package,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

import '@/components/storefront/checkout-infinite.css';

// Confetti Particle System
interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  vRot: number;
  color: string;
  shape: 'rect' | 'circle';
  opacity: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const {
    user,
    authLoading,
    cart,
    cartSubtotal,
    products,
    catalogStatus,
    catalogError,
    retryCatalog,
    updateCartQty,
    clearCart,
    showToast,
    addresses,
    saveOrderToHistory,
    addAddress,
  } = useApp();

  const userName =
    user?.name && user.name !== 'Driver' && user.name !== 'Guest'
      ? user.name
      : user?.email?.split('@')[0] || '';

  const [activeStep, setActiveStep] = useState<'shipping' | 'payment' | 'confirmation'>('payment');
  const [placedOrderData, setPlacedOrderData] = useState<{
    orderNumber: string;
    finalTotal: number;
    carrier: string;
    trackingNumber: string;
    estimatedDelivery: string;
    address: StorefrontShippingAddressSnapshot;
    items: { id: number; name: string; qty: number; price: number; image?: string; c?: string }[];
    paymentMethod: string;
    placedAt: string;
  } | null>(null);

  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    addresses.find((a) => a.isPrimary)?.id || addresses[0]?.id || 'new'
  );
  const [shippingSpeed, setShippingSpeed] = useState<'std' | 'exp'>('std');
  const [paymentOption, setPaymentOption] = useState<'paypal' | 'card' | 'bnpl' | 'cod'>('card');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [saveInfo, setSaveInfo] = useState(true);
  const [cvv, setCvv] = useState('');

  // Interactive Card fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');

  // New Address form
  const [newAddress, setNewAddress] = useState({
    name: '',
    phone: '',
    postalCode: '',
    city: '',
    state: '',
    addressLine1: '',
    addressLine2: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Confetti Canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiAnimRef = useRef<number | null>(null);

  const triggerConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#e2231a', '#ff4d4d', '#10b981', '#f59e0b', '#0e0e10', '#ffffff', '#fbbf24'];
    const particles: ConfettiParticle[] = [];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height * 0.35,
        vx: (Math.random() - 0.5) * 16,
        vy: -Math.random() * 14 - 4,
        size: Math.random() * 8 + 5,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: Math.random() > 0.4 ? 'rect' : 'circle',
        opacity: 1,
      });
    }

    let frame = 0;
    const maxFrames = 220;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.vx *= 0.985; // friction
        p.rotation += p.vRot;

        if (frame > 120) {
          p.opacity = Math.max(0, 1 - (frame - 120) / 100);
        }

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      if (frame < maxFrames) {
        confettiAnimRef.current = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    render();
  };

  useEffect(() => {
    return () => {
      if (confettiAnimRef.current) cancelAnimationFrame(confettiAnimRef.current);
    };
  }, []);

  useEffect(() => {
    if (selectedAddressId !== 'new' && !addresses.some((a) => a.id === selectedAddressId)) {
      setSelectedAddressId(addresses.find((a) => a.isPrimary)?.id || addresses[0]?.id || 'new');
    }
  }, [addresses, selectedAddressId]);

  const cartEntries = Object.entries(cart)
    .map(([idStr, qty]) => ({
      product: products.find((p) => p.id === Number(idStr))!,
      qty,
    }))
    .filter((x) => !!x.product);

  const totalItemCount = cartEntries.reduce((acc, curr) => acc + curr.qty, 0);

  const couponDiscount = appliedCoupon === 'CARXEN10' ? Math.round(cartSubtotal * 0.1) : 0;
  const isEligibleForFreeStandard = cartSubtotal - couponDiscount >= 1499;

  const shippingCost =
    shippingSpeed === 'exp'
      ? 199
      : isEligibleForFreeStandard
      ? 0
      : 99;

  const finalTotal = cartSubtotal - couponDiscount + shippingCost;

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

  const handleCardNumberChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  const handleCardExpiryChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    const formatted =
      digits.length > 2 ? digits.slice(0, 2) + ' / ' + digits.slice(2) : digits;
    setCardExpiry(formatted);
  };

  const handlePlaceOrder = async () => {
    if (isSubmitting) return;

    if (!user) {
      const message = 'Please sign in to complete and place your order.';
      setSubmitError(message);
      showToast(message);
      router.push('/login?redirect=/checkout');
      return;
    }

    if (cartEntries.length === 0) {
      showToast('Your cart is empty');
      return;
    }

    let selectedAddress: StorefrontShippingAddressSnapshot;
    const existingAddress = addresses.find((a) => a.id === selectedAddressId);

    if (selectedAddressId !== 'new' && existingAddress) {
      selectedAddress = {
        name: existingAddress.name || userName,
        phone: existingAddress.phone || user?.phone || '',
        addressLine1: existingAddress.addressLine1,
        addressLine2: existingAddress.addressLine2,
        city: existingAddress.city,
        state: existingAddress.state,
        postalCode: existingAddress.postalCode,
        country: 'IN',
      };
    } else {
      if (
        !newAddress.name.trim() ||
        !newAddress.phone.trim() ||
        !newAddress.postalCode.trim() ||
        !newAddress.city.trim() ||
        !newAddress.addressLine1.trim()
      ) {
        const message = 'Complete the delivery address before placing your order.';
        setSubmitError(message);
        showToast(message);
        setActiveStep('shipping');
        return;
      }

      selectedAddress = {
        name: newAddress.name.trim(),
        phone: newAddress.phone.trim(),
        addressLine1: newAddress.addressLine1.trim(),
        addressLine2: newAddress.addressLine2.trim() || undefined,
        city: newAddress.city.trim(),
        state: newAddress.state.trim() || 'Maharashtra',
        postalCode: newAddress.postalCode.trim(),
        country: 'IN',
      };

      if (saveInfo) {
        addAddress({
          label: 'Saved Address',
          name: newAddress.name.trim(),
          phone: newAddress.phone.trim(),
          addressLine1: newAddress.addressLine1.trim(),
          addressLine2: newAddress.addressLine2.trim() || undefined,
          city: newAddress.city.trim(),
          state: newAddress.state.trim() || 'Maharashtra',
          postalCode: newAddress.postalCode.trim(),
          country: 'India',
          isPrimary: addresses.length === 0,
        });
      }
    }

    const paymentMethodMap: Record<string, StorefrontPaymentMethod> = {
      card: 'Card',
      paypal: 'UPI',
      bnpl: 'Net banking',
      cod: 'Cash on delivery',
    };

    const checkout: StorefrontCheckoutRequest = {
      customer: {
        name: selectedAddress.name || userName,
        ...(user?.email ? { email: user.email } : {}),
        ...(selectedAddress.phone ? { phone: selectedAddress.phone } : (user?.phone ? { phone: user.phone } : {})),
      },
      shippingAddress: selectedAddress,
      items: cartEntries.map(({ product, qty }) => ({
        productId: product.id,
        quantity: qty,
      })),
      shippingSpeed,
      paymentMethod: paymentMethodMap[paymentOption] || 'Card',
      couponCode: appliedCoupon || null,
    };

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const order = await createStorefrontOrder(checkout);
      const trackingNumber = `CX-EXP-${Math.floor(100000 + Math.random() * 900000)}`;
      const carrier = shippingSpeed === 'exp' ? 'Blue Dart Air Express' : 'Delhivery Priority';
      const estimatedDelivery = shippingSpeed === 'exp' ? 'Within 48 hours' : 'Within 3-4 days';

      saveOrderToHistory({
        id: `order_${order.orderNumber}`,
        orderNumber: order.orderNumber,
        placedAt: new Date().toISOString(),
        status: 'CONFIRMED',
        statusMessage: 'Order confirmed and registered at CARXEN fulfillment center',
        paymentStatus: paymentOption === 'cod' ? 'PENDING' : 'PAID',
        paymentMethod: paymentMethodMap[paymentOption] || 'Card',
        trackingNumber,
        carrier,
        trackingUrl: `https://www.delhivery.com/track/package/${trackingNumber}`,
        estimatedDelivery,
        shippingAddress: {
          name: selectedAddress.name || userName,
          phone: selectedAddress.phone || user?.phone || '',
          addressLine1: selectedAddress.addressLine1 || '',
          addressLine2: selectedAddress.addressLine2 || '',
          city: selectedAddress.city || '',
          state: selectedAddress.state || '',
          postalCode: selectedAddress.postalCode || '',
          country: selectedAddress.country || 'India',
        },
        items: cartEntries.map(({ product, qty }) => ({
          productId: product.id,
          name: product.n,
          quantity: qty,
          unitPrice: product.p,
          lineSubtotal: product.p * qty,
          category: product.c,
          image: product.image || product.images?.[0],
        })),
        subtotal: cartSubtotal,
        discountAmount: couponDiscount,
        shippingAmount: shippingCost,
        totalAmount: finalTotal,
        currency: 'INR',
      });

      // Save order info for the confirmation view
      setPlacedOrderData({
        orderNumber: order.orderNumber,
        finalTotal,
        carrier,
        trackingNumber,
        estimatedDelivery,
        address: selectedAddress,
        items: cartEntries.map(({ product, qty }) => ({
          id: product.id,
          name: product.n,
          qty,
          price: product.p,
          image: product.image || product.images?.[0],
          c: product.c,
        })),
        paymentMethod: paymentMethodMap[paymentOption] || 'Card',
        placedAt: new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      });

      clearCart();
      showToast('Order placed successfully!');
      setActiveStep('confirmation');

      // Trigger celebratory confetti animation
      setTimeout(() => {
        triggerConfetti();
      }, 100);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The order could not be placed.';
      setSubmitError(message);
      showToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeAddress = addresses.find((a) => a.id === selectedAddressId) || addresses[0];

  return (
    <div className="inf-ck-page-bg">
      {/* Confetti Canvas for Order Placement */}
      <canvas ref={canvasRef} className="inf-ck-confetti-canvas" />

      <main className="inf-ck-main">
        <div className="inf-ck-shell">
          {/* Top Bar: CARXEN Logo & 3-Step Stepper */}
          <div className="inf-ck-top-bar">
          <Link href="/" className="inf-ck-logo" title="Back to CARXEN">
            <img src="/logo.png" alt="CARXEN" />
          </Link>

          {/* Stepper matching reference */}
          <nav className="inf-ck-stepper" aria-label="Checkout Progress">
            <button
              type="button"
              className={`inf-ck-step ${
                activeStep === 'shipping'
                  ? 'active'
                  : activeStep === 'payment' || activeStep === 'confirmation'
                  ? 'done'
                  : ''
              }`}
              onClick={() => {
                if (activeStep !== 'confirmation') setActiveStep('shipping');
              }}
              disabled={activeStep === 'confirmation'}
            >
              <span className="inf-ck-step-badge">
                {activeStep === 'payment' || activeStep === 'confirmation' ? '✓' : '1'}
              </span>
              <span>Shipping Details</span>
            </button>

            <ChevronRight className="inf-ck-step-chevron" />

            <button
              type="button"
              className={`inf-ck-step ${
                activeStep === 'payment'
                  ? 'active'
                  : activeStep === 'confirmation'
                  ? 'done'
                  : ''
              }`}
              onClick={() => {
                if (activeStep !== 'confirmation') setActiveStep('payment');
              }}
              disabled={activeStep === 'confirmation'}
            >
              <span className="inf-ck-step-badge">
                {activeStep === 'confirmation' ? '✓' : '2'}
              </span>
              <span>Payment Method</span>
            </button>

            <ChevronRight className="inf-ck-step-chevron" />

            <div
              className={`inf-ck-step ${activeStep === 'confirmation' ? 'active done' : ''}`}
              style={{ cursor: 'default' }}
            >
              <span className="inf-ck-step-badge">
                {activeStep === 'confirmation' ? '✓' : '3'}
              </span>
              <span>Confirmation</span>
            </div>
          </nav>
        </div>

        {/* STEP 3: CONFIRMATION VIEW */}
        {activeStep === 'confirmation' && placedOrderData && (
          <div className="inf-ck-confirm-box">
            <div className="inf-ck-confirm-icon-wrap">
              <CheckCircle2 style={{ width: 34, height: 34 }} />
            </div>

            <h2 className="inf-ck-confirm-title">Order Confirmed!</h2>
            <p className="inf-ck-confirm-subtitle">
              Thank you for choosing CARXEN, <b>{placedOrderData.address.name || userName || 'Customer'}</b>.
              Your order <b>#{placedOrderData.orderNumber}</b> has been received and forwarded to our express fulfillment facility.
            </p>

            <div className="inf-ck-confirm-grid">
              {/* Delivery Details Card */}
              <div className="inf-ck-confirm-card">
                <h4>
                  <Truck style={{ width: 16, height: 16, color: 'var(--red, #e2231a)' }} />
                  Fulfillment &amp; Shipping
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#5d5d64' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #eeede8' }}>
                    <span>Courier Partner</span>
                    <b style={{ color: '#0e0e10' }}>{placedOrderData.carrier}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #eeede8' }}>
                    <span>Estimated Delivery</span>
                    <b style={{ color: '#10b981' }}>{placedOrderData.estimatedDelivery}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #eeede8' }}>
                    <span>Tracking Number</span>
                    <b style={{ color: '#0e0e10', fontFamily: 'monospace' }}>{placedOrderData.trackingNumber}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Payment Mode</span>
                    <b style={{ color: '#0e0e10' }}>{placedOrderData.paymentMethod}</b>
                  </div>

                  <div style={{ marginTop: 8, paddingTop: 10, borderTop: '1px dashed #e7e6e0' }}>
                    <div style={{ fontWeight: 600, color: '#0e0e10', marginBottom: 2 }}>Delivery Address</div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>
                      {placedOrderData.address.addressLine1}, {placedOrderData.address.city} {placedOrderData.address.postalCode}
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Summary Card */}
              <div className="inf-ck-confirm-card">
                <h4>
                  <Package style={{ width: 16, height: 16, color: 'var(--red, #e2231a)' }} />
                  Order Summary
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 180, overflowY: 'auto', marginBottom: 12, paddingRight: 4 }}>
                  {placedOrderData.items.map((it) => (
                    <div key={it.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span style={{ fontWeight: 700, color: '#0e0e10', background: '#f4f3ef', borderRadius: 6, padding: '2px 6px', fontSize: 11 }}>
                          {it.qty}×
                        </span>
                        <span style={{ color: '#0e0e10', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
                          {it.name}
                        </span>
                      </div>
                      <b style={{ color: '#0e0e10', whiteSpace: 'nowrap' }}>{formatINR(it.price * it.qty)}</b>
                    </div>
                  ))}
                </div>

                <div style={{ paddingTop: 10, borderTop: '1px solid #eeede8', display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, color: '#0e0e10' }}>
                  <span>Total Amount Paid</span>
                  <span style={{ color: 'var(--red, #e2231a)' }}>{formatINR(placedOrderData.finalTotal)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="inf-ck-confirm-actions">
              <Link
                href={`/order/${encodeURIComponent(placedOrderData.orderNumber)}`}
                className="inf-ck-btn-primary"
              >
                Track Order <ExternalLink style={{ width: 15, height: 15 }} />
              </Link>
              <Link href="/shop" className="inf-ck-btn-secondary">
                Continue Shopping &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* Guest sign-in reminder banner (steps 1 & 2 only) */}
        {activeStep !== 'confirmation' && !authLoading && !user && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              padding: '12px 18px',
              background: '#faf9f6',
              border: '1px solid #e7e6e0',
              borderRadius: 12,
              marginBottom: 24,
              fontSize: 13,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#3f3f46' }}>
              <Lock style={{ width: 16, height: 16, color: 'var(--red, #e2231a)' }} />
              <span>You are checking out as a guest. Sign in to link this order to your CARXEN account.</span>
            </div>
            <Link
              href="/login?redirect=/checkout"
              style={{
                color: 'var(--red, #e2231a)',
                fontWeight: 700,
                fontSize: 13,
                textDecoration: 'none',
              }}
            >
              Sign In &rarr;
            </Link>
          </div>
        )}

        {/* STEP 1 & 2: CART EMPTY / CATALOG STATE / MAIN FLOW */}
        {activeStep !== 'confirmation' && (
          <>
            {catalogStatus !== 'ready' ? (
              <CatalogState status={catalogStatus} error={catalogError} onRetry={retryCatalog} />
            ) : cartEntries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 20px' }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0e0e10', marginBottom: 8 }}>
                  Your cart is empty
                </h2>
                <p style={{ fontSize: 13, color: '#5d5d64', marginBottom: 20 }}>
                  Add a few parts or accessories before checking out.
                </p>
                <Link
                  href="/shop"
                  style={{
                    display: 'inline-block',
                    background: 'var(--red, #e2231a)',
                    color: '#fff',
                    padding: '10px 24px',
                    borderRadius: 10,
                    fontSize: 13.5,
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  Browse Shop
                </Link>
              </div>
            ) : (
              <div className="inf-ck-grid">
                {/* Left Column */}
                <div className="inf-ck-left-col">
                  {/* Shipping Overview / Address Card */}
                  {activeStep === 'payment' ? (
                    <div className="inf-ck-ship-summary">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 9,
                            background: 'rgba(226, 35, 26, 0.08)',
                            color: 'var(--red, #e2231a)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <MapPin style={{ width: 18, height: 18 }} />
                        </div>
                        <div className="inf-ck-ship-info">
                          <div className="inf-ck-ship-name">
                            Shipping to {activeAddress?.name || userName || 'Guest Customer'}
                          </div>
                          <div className="inf-ck-ship-addr">
                            {activeAddress?.addressLine1 || 'Baner Road'}, {activeAddress?.city || 'Pune'} ·{' '}
                            {shippingSpeed === 'exp' ? 'Express Priority Air (₹199)' : 'Standard (Free)'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="inf-ck-text-btn"
                        onClick={() => setActiveStep('shipping')}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    /* Step 1: Address selection screen */
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e7e6e0',
                        borderRadius: 14,
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                      }}
                    >
                      <div className="inf-ck-sec-header" style={{ margin: 0 }}>
                        <div className="inf-ck-sec-title">
                          <MapPin style={{ width: 16, height: 16 }} />
                          <span>Select Delivery Address</span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                        {addresses.map((addr) => (
                          <div
                            key={addr.id}
                            onClick={() => setSelectedAddressId(addr.id)}
                            style={{
                              border: `1.5px solid ${selectedAddressId === addr.id ? 'var(--red, #e2231a)' : '#e7e6e0'}`,
                              borderRadius: 12,
                              padding: '12px 14px',
                              background: selectedAddressId === addr.id ? '#faf9f6' : '#ffffff',
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--red, #e2231a)', textTransform: 'uppercase' }}>
                                {addr.label || 'Address'}
                              </span>
                              {selectedAddressId === addr.id && (
                                <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>✓ Selected</span>
                              )}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0e0e10' }}>{addr.name}</div>
                            <div style={{ fontSize: 12, color: '#5d5d64', marginTop: 2, lineHeight: 1.35 }}>
                              {addr.addressLine1}, {addr.city} {addr.postalCode}
                            </div>
                          </div>
                        ))}

                        <div
                          onClick={() => setSelectedAddressId('new')}
                          style={{
                            border: `1.5px dashed ${selectedAddressId === 'new' ? 'var(--red, #e2231a)' : '#d4d4d8'}`,
                            borderRadius: 12,
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            background: '#faf9f6',
                          }}
                        >
                          <Plus style={{ width: 18, height: 18, color: '#71717a', marginBottom: 4 }} />
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#0e0e10' }}>+ Add New Address</span>
                        </div>
                      </div>

                      {selectedAddressId === 'new' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
                          <div className="inf-ck-form-row">
                            <input
                              className="inf-ck-input"
                              placeholder="Recipient Full Name"
                              value={newAddress.name}
                              onChange={(e) => setNewAddress((c) => ({ ...c, name: e.target.value }))}
                            />
                            <input
                              className="inf-ck-input"
                              placeholder="Phone Number"
                              value={newAddress.phone}
                              onChange={(e) => setNewAddress((c) => ({ ...c, phone: e.target.value }))}
                            />
                          </div>
                          <div className="inf-ck-form-row">
                            <input
                              className="inf-ck-input"
                              placeholder="Postal Code / Pincode"
                              value={newAddress.postalCode}
                              onChange={(e) => setNewAddress((c) => ({ ...c, postalCode: e.target.value }))}
                            />
                            <input
                              className="inf-ck-input"
                              placeholder="City"
                              value={newAddress.city}
                              onChange={(e) => setNewAddress((c) => ({ ...c, city: e.target.value }))}
                            />
                            <input
                              className="inf-ck-input"
                              placeholder="State / Region"
                              value={newAddress.state}
                              onChange={(e) => setNewAddress((c) => ({ ...c, state: e.target.value }))}
                            />
                          </div>
                          <input
                            className="inf-ck-input"
                            placeholder="Street Address, Flat, House No."
                            value={newAddress.addressLine1}
                            onChange={(e) => setNewAddress((c) => ({ ...c, addressLine1: e.target.value }))}
                          />
                          <input
                            className="inf-ck-input"
                            placeholder="Apartment, suite, unit, landmark (optional)"
                            value={newAddress.addressLine2}
                            onChange={(e) => setNewAddress((c) => ({ ...c, addressLine2: e.target.value }))}
                          />
                        </div>
                      )}

                      {/* Shipping Speed Selection */}
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#3f3f46', marginBottom: 8 }}>
                          Shipping Speed
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div
                            onClick={() => setShippingSpeed('std')}
                            style={{
                              border: `1.5px solid ${shippingSpeed === 'std' ? 'var(--red, #e2231a)' : '#e7e6e0'}`,
                              borderRadius: 12,
                              padding: '12px 14px',
                              cursor: 'pointer',
                              background: shippingSpeed === 'std' ? 'rgba(226, 35, 26, 0.04)' : '#ffffff',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#0e0e10' }}>
                              <Truck style={{ width: 14, height: 14 }} /> Standard (3-4 Days)
                            </div>
                            <div style={{ fontSize: 12, color: '#5d5d64', marginTop: 2 }}>
                              {isEligibleForFreeStandard ? 'Free Delivery' : '₹99'}
                            </div>
                          </div>

                          <div
                            onClick={() => setShippingSpeed('exp')}
                            style={{
                              border: `1.5px solid ${shippingSpeed === 'exp' ? 'var(--red, #e2231a)' : '#e7e6e0'}`,
                              borderRadius: 12,
                              padding: '12px 14px',
                              cursor: 'pointer',
                              background: shippingSpeed === 'exp' ? 'rgba(226, 35, 26, 0.04)' : '#ffffff',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#0e0e10' }}>
                              <Zap style={{ width: 14, height: 14, color: 'var(--red, #e2231a)' }} /> Express Air (48h)
                            </div>
                            <div style={{ fontSize: 12, color: '#5d5d64', marginTop: 2 }}>₹199</div>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="inf-ck-pay-btn"
                        style={{ height: 42, marginTop: 4 }}
                        onClick={() => setActiveStep('payment')}
                      >
                        Proceed to Payment Method &rarr;
                      </button>
                    </div>
                  )}

                  {/* Payment Section */}
                  <div>
                    <div className="inf-ck-sec-header">
                      <div className="inf-ck-sec-title">
                        <CreditCard />
                        <span>Select Payment Option</span>
                      </div>
                    </div>

                    <div className="inf-ck-pay-stack">
                      {/* 1. UPI / Instant Pay */}
                      <div
                        className={`inf-ck-pay-card ${paymentOption === 'paypal' ? 'active' : ''}`}
                      >
                        <div
                          className="inf-ck-pay-card-header"
                          onClick={() => setPaymentOption('paypal')}
                        >
                          <div className="inf-ck-radio-label">
                            <span className="inf-ck-radio-circle" />
                            <span>UPI / Instant Pay</span>
                          </div>
                          <div className="inf-ck-badge-pill">
                            <span style={{ color: '#0e0e10', fontWeight: 800 }}>GPay</span>
                            <span style={{ color: '#5d5d64', margin: '0 4px' }}>·</span>
                            <span style={{ color: '#0e0e10', fontWeight: 800 }}>PhonePe</span>
                            <span style={{ color: '#5d5d64', margin: '0 4px' }}>·</span>
                            <span style={{ color: 'var(--red, #e2231a)', fontWeight: 800 }}>Paytm</span>
                          </div>
                        </div>

                        {paymentOption === 'paypal' && (
                          <div className="inf-ck-card-body">
                            <div className="inf-ck-field">
                              <label>Enter Virtual Payment Address (VPA / UPI ID)</label>
                              <input
                                className="inf-ck-input"
                                placeholder="username@okhdfcbank or yourname@upi"
                                defaultValue="driver@carxen"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 2. Credit / Debit Card (Active & Expanded) */}
                      <div
                        className={`inf-ck-pay-card ${paymentOption === 'card' ? 'active' : ''}`}
                      >
                        <div
                          className="inf-ck-pay-card-header"
                          onClick={() => setPaymentOption('card')}
                        >
                          <div className="inf-ck-radio-label">
                            <span className="inf-ck-radio-circle" />
                            <span>Credit / Debit Card</span>
                          </div>

                          {/* Card Network Badges */}
                          <div className="inf-ck-badges">
                            <span className="inf-ck-badge-visa">VISA</span>
                            <span className="inf-ck-badge-mc">
                              <span className="inf-ck-mc-circle-red" />
                              <span className="inf-ck-mc-circle-orange" />
                            </span>
                            <span className="inf-ck-badge-amex">AMEX</span>
                            <span className="inf-ck-badge-count">+4</span>
                          </div>
                        </div>

                        {paymentOption === 'card' && (
                          <div className="inf-ck-card-body">
                            {/* Card Number */}
                            <div className="inf-ck-field">
                              <label>Card Number</label>
                              <div className="inf-ck-input-wrap">
                                <CreditCard />
                                <input
                                  className="inf-ck-input has-icon"
                                  inputMode="numeric"
                                  placeholder="0000 0000 0000 0000"
                                  value={cardNumber}
                                  onChange={(e) => handleCardNumberChange(e.target.value)}
                                />
                              </div>
                            </div>

                            {/* Expiry Date & CVV */}
                            <div className="inf-ck-form-row">
                              <div className="inf-ck-field">
                                <label>Expiry Date</label>
                                <input
                                  className="inf-ck-input"
                                  inputMode="numeric"
                                  placeholder="MM / YYYY"
                                  value={cardExpiry}
                                  onChange={(e) => handleCardExpiryChange(e.target.value)}
                                />
                              </div>

                              <div className="inf-ck-field">
                                <label>CVV/CVC</label>
                                <div className="inf-ck-input-wrap">
                                  <input
                                    className="inf-ck-input"
                                    type="password"
                                    maxLength={4}
                                    placeholder="***"
                                    value={cvv}
                                    onChange={(e) => setCvv(e.target.value)}
                                  />
                                  <span title="3 or 4 digit security code on the back of your card" className="inf-ck-help-icon">
                                    <HelpCircle style={{ width: 14, height: 14 }} />
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Cardholder Name */}
                            <div className="inf-ck-field">
                              <label>Cardholder Name</label>
                              <input
                                className="inf-ck-input"
                                placeholder="Cardholder Name"
                                value={cardHolder}
                                onChange={(e) => setCardHolder(e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 3. Buy Now, Pay Later / Net Banking */}
                      <div
                        className={`inf-ck-pay-card ${paymentOption === 'bnpl' ? 'active' : ''}`}
                      >
                        <div
                          className="inf-ck-pay-card-header"
                          onClick={() => setPaymentOption('bnpl')}
                        >
                          <div className="inf-ck-radio-label">
                            <span className="inf-ck-radio-circle" />
                            <span>Net Banking / Pay Later</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                color: '#0e0e10',
                                background: '#f4f3ef',
                                border: '1px solid #e7e6e0',
                                padding: '2px 8px',
                                borderRadius: 4,
                              }}
                            >
                              HDFC · ICICI · SBI
                            </span>
                          </div>
                        </div>

                        {paymentOption === 'bnpl' && (
                          <div className="inf-ck-card-body">
                            <div style={{ fontSize: 12.5, color: '#5d5d64' }}>
                              Split into monthly installments or choose Net Banking from 40+ supported Indian banking portals.
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 4. Cash on Delivery */}
                      <div
                        className={`inf-ck-pay-card ${paymentOption === 'cod' ? 'active' : ''}`}
                      >
                        <div
                          className="inf-ck-pay-card-header"
                          onClick={() => setPaymentOption('cod')}
                        >
                          <div className="inf-ck-radio-label">
                            <span className="inf-ck-radio-circle" />
                            <span>Cash on Delivery</span>
                          </div>
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: '#ecfdf5',
                              border: '1px solid #a7f3d0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#10b981',
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            ₹
                          </div>
                        </div>

                        {paymentOption === 'cod' && (
                          <div className="inf-ck-card-body">
                            <div style={{ fontSize: 12.5, color: '#5d5d64' }}>
                              Pay {formatINR(finalTotal)} in cash or scan the courier&apos;s dynamic QR code on doorstep handover.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Save my info checkbox */}
                    <label className="inf-ck-checkbox-row">
                      <input
                        type="checkbox"
                        checked={saveInfo}
                        onChange={(e) => setSaveInfo(e.target.checked)}
                      />
                      <span>Save my information for a faster checkout with a CARXEN account</span>
                    </label>

                    {/* Submit Error Banner */}
                    {submitError && (
                      <div
                        role="alert"
                        style={{
                          marginTop: 12,
                          padding: '10px 14px',
                          background: 'rgba(226, 35, 26, 0.08)',
                          border: '1px solid rgba(226, 35, 26, 0.25)',
                          color: 'var(--red, #e2231a)',
                          borderRadius: 10,
                          fontSize: 12.5,
                        }}
                      >
                        {submitError}
                      </div>
                    )}

                    {/* Main Red Brand Pay CTA Button */}
                    <button
                      type="button"
                      className="inf-ck-pay-btn"
                      style={{ marginTop: 16 }}
                      onClick={handlePlaceOrder}
                      disabled={isSubmitting}
                      aria-busy={isSubmitting}
                    >
                      <Lock style={{ width: 15, height: 15 }} />
                      {isSubmitting
                        ? 'Confirming Order…'
                        : `Pay | ${formatINR(finalTotal)}`}
                    </button>
                  </div>
                </div>

                {/* Right Column (3 Rounded Cards) */}
                <div className="inf-ck-right-col">
                  {/* Card 1: Your Cart (n) */}
                  <div className="inf-ck-card">
                    <div className="inf-ck-card-hdr">
                      <div className="inf-ck-card-t">
                        <ShoppingBag />
                        <span>Your Cart ({totalItemCount})</span>
                      </div>
                    </div>

                    <div className="inf-ck-items-list">
                      {cartEntries.map(({ product, qty }) => (
                        <div className="inf-ck-item" key={product.id}>
                          <div className="inf-ck-item-thumb-wrap">
                            <ProductArt product={product} />
                            <button
                              type="button"
                              className="inf-ck-item-remove-btn"
                              onClick={() => updateCartQty(product.id, -qty)}
                              title="Remove item"
                            >
                              <X style={{ width: 10, height: 10 }} />
                            </button>
                          </div>

                          <div className="inf-ck-item-name" title={product.n}>
                            {product.n}
                          </div>

                          <div className="inf-ck-item-stepper">
                            <button
                              type="button"
                              onClick={() => updateCartQty(product.id, -1)}
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <span>{qty}</span>
                            <button
                              type="button"
                              onClick={() => updateCartQty(product.id, 1)}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>

                          <div className="inf-ck-item-price">
                            {formatINR(product.p * qty)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 2: Promo Code of Gift Card */}
                  <div className="inf-ck-card">
                    <div className="inf-ck-card-hdr">
                      <div className="inf-ck-card-t">
                        <Gift />
                        <span>Promo Code of Gift Card</span>
                      </div>
                    </div>

                    <div className="inf-ck-promo-row">
                      <input
                        className="inf-ck-input"
                        placeholder="Enter number"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                      />
                      <button
                        type="button"
                        className="inf-ck-promo-btn"
                        onClick={() => handleApplyCoupon()}
                      >
                        Apply
                      </button>
                    </div>

                    {appliedCoupon ? (
                      <div className="inf-ck-promo-tag">
                        <span>✓ &ldquo;{appliedCoupon}&rdquo; active (10% off)</span>
                        <button
                          type="button"
                          onClick={() => {
                            setAppliedCoupon('');
                            setCouponCode('');
                          }}
                          style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: 11 }}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="inf-ck-quick-promo"
                        onClick={() => handleApplyCoupon('CARXEN10')}
                      >
                        Tap to use CARXEN10 for 10% off
                      </button>
                    )}
                  </div>

                  {/* Card 3: Summary */}
                  <div className="inf-ck-card">
                    <div className="inf-ck-card-hdr">
                      <div className="inf-ck-card-t">
                        <ReceiptText />
                        <span>Summary</span>
                      </div>
                    </div>

                    <div className="inf-ck-summary-rows">
                      <div className="inf-ck-summary-row">
                        <span>Subtotal</span>
                        <span>{formatINR(cartSubtotal)}</span>
                      </div>

                      {couponDiscount > 0 && (
                        <div className="inf-ck-summary-row discount">
                          <span>Discount (10%)</span>
                          <span>−{formatINR(couponDiscount)}</span>
                        </div>
                      )}

                      <div className="inf-ck-summary-row">
                        <span>Tax</span>
                        <span>Included</span>
                      </div>

                      <div className="inf-ck-summary-row">
                        <span>Delivery</span>
                        <span>{shippingCost ? formatINR(shippingCost) : 'Free'}</span>
                      </div>

                      <div className="inf-ck-summary-row total">
                        <span>Total</span>
                        <span>{formatINR(finalTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>

    <Footer />
  </div>
);
}

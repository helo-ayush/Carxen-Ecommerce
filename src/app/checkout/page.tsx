'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/data/products';
import { CatalogState } from '@/components/CatalogState';
import { ProductArt } from '@/components/ProductArt';
import { Footer } from '@/components/Footer';
import { supabase } from '@/lib/supabase/client';
import { createStorefrontOrder } from '@/lib/storefront/order-client';
import {
  calculateItemPriceWithOfferLimit,
} from '@/lib/storefront/wholesale-pricing';
import type {
  StorefrontCheckoutRequest,
  StorefrontPaymentMethod,
  StorefrontShippingAddressSnapshot,
} from '@/lib/storefront/order-types';
import {
  validateCoupon,
  getAvailableCouponsForBuyer,
  getAssignedCouponForBuyer,
  type WholesaleBuyerContext,
  type StorefrontCoupon,
} from '@/lib/storefront/coupons';

import {
  CreditCard,
  ShoppingBag,
  Gift,
  ReceiptText,
  ChevronRight,
  Truck,
  Zap,
  MapPin,
  Lock,
  Plus,
  X,
  CheckCircle2,
  Package,
  ExternalLink,
  Building2,
  Tag,
  ShieldCheck,
  Smartphone,
  QrCode,
  AlertCircle,
  Sparkles,
  Banknote,
  Check,
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

// Helper to dynamically load the official Razorpay checkout script if needed
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

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
    isWholesaleApproved,
    b2bProfile,
    isVerifiedBuyer,
    orders,
    coupons,
  } = useApp();

  const userName =
    user?.name && user.name !== 'Driver' && user.name !== 'Guest'
      ? user.name
      : user?.email?.split('@')[0] || '';

  // Step 1: shipping -> Step 2: payment -> Step 3: confirmation
  const [activeStep, setActiveStep] = useState<'shipping' | 'payment' | 'confirmation'>('shipping');

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
  const [paymentOption, setPaymentOption] = useState<'razorpay' | 'cod'>('razorpay');
  const [buyerGstin, setBuyerGstin] = useState(b2bProfile?.gstin || '');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [saveInfo, setSaveInfo] = useState(true);

  // New Address form state
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

  // Razorpay Sandbox / Mock Simulation state
  const [mockModalOpen, setMockModalOpen] = useState(false);
  const [mockOrderDetails, setMockOrderDetails] = useState<{
    razorpayOrderId: string;
    amountInPaise: number;
    finalTotal: number;
    selectedAddress: StorefrontShippingAddressSnapshot;
  } | null>(null);

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

    for (let i = 0; i < 140; i++) {
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
        p.vy += 0.35;
        p.vx *= 0.985;
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

  const verifiedOrderCount = useMemo(() => {
    if (!user || !user.email) return 0;
    return (orders || []).filter((o) => {
      const status = (o.status || '').toLowerCase();
      return status !== 'cancelled' && status !== 'refunded';
    }).length;
  }, [user, orders]);

  const verifiedStatus = useMemo(() => {
    return Boolean(user && user.email && verifiedOrderCount >= 3);
  }, [user, verifiedOrderCount]);

  const buyerContext: WholesaleBuyerContext = useMemo(
    () => ({
      isWholesaleApproved,
      businessName: b2bProfile?.businessName,
      tradeName: b2bProfile?.tradeName,
      email: user?.email,
      userId: user?.id,
      orderCount: verifiedOrderCount,
      isVerifiedBuyer: verifiedStatus,
    }),
    [isWholesaleApproved, b2bProfile?.businessName, b2bProfile?.tradeName, user?.email, user?.id, verifiedOrderCount, verifiedStatus]
  );

  const couponValidation = useMemo(() => {
    if (!appliedCoupon) return null;
    return validateCoupon(appliedCoupon, cartSubtotal, buyerContext, coupons);
  }, [appliedCoupon, cartSubtotal, buyerContext, coupons]);

  const couponDiscount = couponValidation?.valid ? couponValidation.discountAmount : 0;
  const isEligibleForFreeStandard = cartSubtotal - couponDiscount >= 1499;

  const shippingCost =
    shippingSpeed === 'exp'
      ? 199
      : isEligibleForFreeStandard
      ? 0
      : 99;

  const finalTotal = cartSubtotal - couponDiscount + shippingCost;

  const assignedCoupon: StorefrontCoupon | null = useMemo(() => {
    const candidate = getAssignedCouponForBuyer(buyerContext, coupons);
    if (!candidate) return null;
    // Check if the current user and cart are actually eligible for this coupon right now
    const validation = validateCoupon(candidate.code, cartSubtotal, buyerContext, coupons);
    if (!validation.valid) return null;
    return candidate;
  }, [buyerContext, coupons, cartSubtotal]);

  const handleApplyCoupon = (codeToApply?: string) => {
    const code = (codeToApply || couponCode).trim().toUpperCase();
    if (!code) {
      setCouponError('Please enter a coupon code.');
      showToast('Please enter a coupon code.');
      return;
    }
    const result = validateCoupon(code, cartSubtotal, buyerContext, coupons);
    if (result.valid && result.coupon) {
      setAppliedCoupon(code);
      setCouponCode(code);
      setCouponError(null);
      setSubmitError(null);
      showToast(result.message || `Coupon ${code} applied!`);
    } else {
      setAppliedCoupon('');
      const err = result.error || `Coupon "${code}" is invalid or ineligible.`;
      setCouponError(err);
      showToast(err);
    }
  };

  // Helper to validate and resolve chosen shipping address
  const resolveShippingAddress = (): StorefrontShippingAddressSnapshot | null => {
    const existingAddress = addresses.find((a) => a.id === selectedAddressId);
    if (selectedAddressId !== 'new' && existingAddress) {
      return {
        name: existingAddress.name || userName,
        phone: existingAddress.phone || user?.phone || '',
        addressLine1: existingAddress.addressLine1,
        addressLine2: existingAddress.addressLine2,
        city: existingAddress.city,
        state: existingAddress.state,
        postalCode: existingAddress.postalCode,
        country: 'IN',
      };
    }

    if (
      !newAddress.name.trim() ||
      !newAddress.phone.trim() ||
      !newAddress.postalCode.trim() ||
      !newAddress.city.trim() ||
      !newAddress.addressLine1.trim()
    ) {
      return null;
    }

    return {
      name: newAddress.name.trim(),
      phone: newAddress.phone.trim(),
      addressLine1: newAddress.addressLine1.trim(),
      addressLine2: newAddress.addressLine2.trim() || undefined,
      city: newAddress.city.trim(),
      state: newAddress.state.trim() || 'Maharashtra',
      postalCode: newAddress.postalCode.trim(),
      country: 'IN',
    };
  };

  // Handler for Step 1 -> Step 2 button
  const handleProceedToPayment = () => {
    const address = resolveShippingAddress();
    if (!address) {
      const msg = 'Please enter your recipient name, phone, postal code, city, and street address.';
      setSubmitError(msg);
      showToast(msg);
      return;
    }

    if (selectedAddressId === 'new' && saveInfo) {
      addAddress({
        label: 'Delivery Address',
        name: address.name || userName || 'Customer',
        phone: address.phone || user?.phone || '',
        addressLine1: address.addressLine1 || '',
        addressLine2: address.addressLine2 || undefined,
        city: address.city || '',
        state: address.state || 'Maharashtra',
        postalCode: address.postalCode || '',
        country: 'India',
        isPrimary: addresses.length === 0,
      });
    }

    setSubmitError(null);
    setActiveStep('payment');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper to attach Supabase session and demo credentials to requests
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        headers['Authorization'] = `Bearer ${data.session.access_token}`;
      }
    } catch {}

    if (typeof window !== 'undefined') {
      try {
        const demoUser = localStorage.getItem('cx_demo_user');
        if (demoUser) {
          const parsed = JSON.parse(demoUser);
          if (parsed.id) headers['x-demo-user-id'] = parsed.id;
          if (parsed.email) headers['x-demo-user-email'] = parsed.email;
        }
      } catch {}
    }
    return headers;
  };

  // Server verification and order placement after Razorpay completion
  const handleVerifyAndPlaceOrder = async (params: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    selectedAddress: StorefrontShippingAddressSnapshot;
  }) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const headers = await getAuthHeaders();
      const checkoutPayload: StorefrontCheckoutRequest = {
        customer: {
          name: params.selectedAddress.name || userName,
          ...(user?.email ? { email: user.email } : {}),
          ...(params.selectedAddress.phone ? { phone: params.selectedAddress.phone } : (user?.phone ? { phone: user.phone } : {})),
        },
        shippingAddress: params.selectedAddress,
        items: cartEntries.map(({ product, qty }) => ({
          productId: product.id,
          quantity: qty,
        })),
        shippingSpeed,
        paymentMethod: 'UPI',
        couponCode: appliedCoupon || null,
      };

      const res = await fetch('/api/storefront/payment/verify-and-place', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          razorpay_order_id: params.razorpay_order_id,
          razorpay_payment_id: params.razorpay_payment_id,
          razorpay_signature: params.razorpay_signature,
          checkout: checkoutPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Payment verification failed on server.');
      }

      const verifiedOrder = data.order;
      const trackingNumber = data.trackingNumber || `CX-EXP-${Math.floor(100000 + Math.random() * 900000)}`;
      const carrier = data.carrier || (shippingSpeed === 'exp' ? 'Blue Dart Air Express' : 'Delhivery Priority');
      const estimatedDelivery = data.estimatedDelivery || (shippingSpeed === 'exp' ? 'Within 48 hours' : 'Within 3-4 days');

      // Save to client order history
      saveOrderToHistory({
        id: `order_${verifiedOrder.orderNumber}`,
        orderNumber: verifiedOrder.orderNumber,
        placedAt: new Date().toISOString(),
        status: 'CONFIRMED',
        statusMessage: 'Order confirmed and verified via Razorpay Gateway',
        paymentStatus: 'PAID',
        paymentMethod: 'Card',
        trackingNumber,
        carrier,
        trackingUrl: `https://www.delhivery.com/track/package/${trackingNumber}`,
        estimatedDelivery,
        shippingAddress: {
          name: params.selectedAddress.name || userName,
          phone: params.selectedAddress.phone || user?.phone || '',
          addressLine1: params.selectedAddress.addressLine1 || '',
          addressLine2: params.selectedAddress.addressLine2 || '',
          city: params.selectedAddress.city || '',
          state: params.selectedAddress.state || '',
          postalCode: params.selectedAddress.postalCode || '',
          country: params.selectedAddress.country || 'India',
        },
        items: cartEntries.map(({ product, qty }) => {
          const priceResult = calculateItemPriceWithOfferLimit(product, qty, isWholesaleApproved);
          return {
            productId: product.id,
            name: product.n,
            quantity: qty,
            unitPrice: priceResult.discountedUnitPrice,
            lineSubtotal: priceResult.totalPrice,
            category: product.c,
            image: product.image || product.images?.[0],
          };
        }),
        subtotal: cartSubtotal,
        discountAmount: couponDiscount,
        shippingAmount: shippingCost,
        totalAmount: finalTotal,
        currency: 'INR',
      });

      // Update placed order confirmation view
      setPlacedOrderData({
        orderNumber: verifiedOrder.orderNumber,
        finalTotal,
        carrier,
        trackingNumber,
        estimatedDelivery,
        address: params.selectedAddress,
        items: cartEntries.map(({ product, qty }) => ({
          id: product.id,
          name: product.n,
          qty,
          price: product.p,
          image: product.image || product.images?.[0],
          c: product.c,
        })),
        paymentMethod: 'Razorpay Secure (UPI / Cards)',
        placedAt: new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      });

      setMockModalOpen(false);
      clearCart();
      showToast('Payment verified & order placed successfully!');
      setActiveStep('confirmation');

      setTimeout(() => {
        triggerConfetti();
      }, 100);
    } catch (err: any) {
      console.error('Order placement error:', err);
      const msg = err?.message || 'Payment verification could not be completed.';
      setSubmitError(msg);
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Main payment submission dispatcher
  const handlePlaceOrder = async () => {
    if (isSubmitting) return;

    // Guest and authenticated checkouts both supported

    if (cartEntries.length === 0) {
      showToast('Your cart is empty');
      return;
    }

    const selectedAddress = resolveShippingAddress();
    if (!selectedAddress) {
      const message = 'Complete the delivery address before placing your order.';
      setSubmitError(message);
      showToast(message);
      setActiveStep('shipping');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    // RAZORPAY PAYMENT FLOW
    if (paymentOption === 'razorpay') {
      try {
        const headers = await getAuthHeaders();
        const createOrderRes = await fetch('/api/storefront/payment/create-order', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            items: cartEntries.map(({ product, qty }) => ({
              productId: product.id,
              quantity: qty,
            })),
            shippingSpeed,
            couponCode: appliedCoupon || null,
            customer: {
              name: selectedAddress.name || userName,
              email: user?.email,
              phone: selectedAddress.phone || user?.phone,
            },
            shippingAddress: selectedAddress,
            b2bGstin: buyerGstin || undefined,
          }),
        });

        const orderData = await createOrderRes.json();
        if (!createOrderRes.ok || !orderData.success) {
          throw new Error(orderData.error || 'Failed to initialize Razorpay checkout order.');
        }

        // Check if environment is in mock test mode (placeholder keys)
        if (orderData.isMock) {
          setMockOrderDetails({
            razorpayOrderId: orderData.razorpayOrderId,
            amountInPaise: orderData.amount,
            finalTotal,
            selectedAddress,
          });
          setMockModalOpen(true);
          setIsSubmitting(false);
          return;
        }

        // Live Razorpay Mode: Ensure script is ready
        const scriptReady = await loadRazorpayScript();
        if (!scriptReady || !(window as any).Razorpay) {
          throw new Error('Unable to load Razorpay checkout gateway. Please verify your connection.');
        }

        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'CARXEN',
          description: `CarXen Order Payment (${cartEntries.length} items)`,
          image: '/logo.png',
          order_id: orderData.razorpayOrderId,
          prefill: {
            name: selectedAddress.name || userName,
            email: user?.email || '',
            contact: selectedAddress.phone || user?.phone || '',
          },
          notes: {
            address: `${selectedAddress.addressLine1}, ${selectedAddress.city}`,
            pincode: selectedAddress.postalCode,
          },
          theme: {
            color: '#e2231a',
          },
          modal: {
            ondismiss: () => {
              setIsSubmitting(false);
              showToast('Payment window closed. Your cart is preserved.');
            },
            escape: true,
            backdropclose: false,
          },
          handler: async (resp: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) => {
            await handleVerifyAndPlaceOrder({
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
              selectedAddress,
            });
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (errResp: any) => {
          setIsSubmitting(false);
          const errDesc = errResp?.error?.description || 'Payment was declined or cancelled.';
          setSubmitError(errDesc);
          showToast(errDesc);
        });
        rzp.open();
      } catch (err: any) {
        console.error('Razorpay initialization failed:', err);
        const msg = err?.message || 'Failed to start payment gateway. Please try again.';
        setSubmitError(msg);
        showToast(msg);
        setIsSubmitting(false);
      }
      return;
    }

    // CASH ON DELIVERY FALLBACK
    try {
      const paymentMethodMap: Record<string, StorefrontPaymentMethod> = {
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
        paymentMethod: paymentMethodMap[paymentOption] || 'Cash on delivery',
        couponCode: appliedCoupon || null,
      };

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
        paymentMethod: paymentMethodMap[paymentOption] || 'Cash on delivery',
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
        items: cartEntries.map(({ product, qty }) => {
          const priceResult = calculateItemPriceWithOfferLimit(product, qty, isWholesaleApproved);
          return {
            productId: product.id,
            name: product.n,
            quantity: qty,
            unitPrice: priceResult.discountedUnitPrice,
            lineSubtotal: priceResult.totalPrice,
            category: product.c,
            image: product.image || product.images?.[0],
          };
        }),
        subtotal: cartSubtotal,
        discountAmount: couponDiscount,
        shippingAmount: shippingCost,
        totalAmount: finalTotal,
        currency: 'INR',
      });

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
        paymentMethod: paymentMethodMap[paymentOption] || 'Cash on delivery',
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
      {/* Official Razorpay Checkout Script */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

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
                  if (activeStep === 'shipping') {
                    handleProceedToPayment();
                  } else if (activeStep !== 'confirmation') {
                    setActiveStep('payment');
                  }
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
                      <span>Payment Status</span>
                      <b style={{ color: '#10b981' }}>PAID &bull; {placedOrderData.paymentMethod}</b>
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

          {/* STEP 1 & 2: CART / CATALOG / CHECKOUT GRID */}
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
                    Add a few genuine parts or accessories before checking out.
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
                  {/* Left Column: Step 1 Shipping OR Step 2 Payment */}
                  <div className="inf-ck-left-col">
                    {activeStep === 'shipping' ? (
                      /* STEP 1: SHIPPING DETAILS */
                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e7e6e0',
                          borderRadius: 16,
                          padding: '24px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 20,
                        }}
                      >
                        <div className="inf-ck-sec-header" style={{ margin: 0 }}>
                          <div className="inf-ck-sec-title">
                            <MapPin style={{ width: 18, height: 18, color: 'var(--red, #e2231a)' }} />
                            <span>1. Shipping &amp; Delivery Address</span>
                          </div>
                        </div>

                        {/* Existing Saved Addresses */}
                        {addresses.length > 0 && (
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

                            {/* Option to Add New Address */}
                            <div
                              onClick={() => setSelectedAddressId('new')}
                              style={{
                                border: `1.5px dashed ${selectedAddressId === 'new' ? 'var(--red, #e2231a)' : '#d4d4d8'}`,
                                borderRadius: 12,
                                padding: '12px 14px',
                                background: selectedAddressId === 'new' ? '#faf9f6' : '#ffffff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                fontSize: 13,
                                fontWeight: 600,
                                color: selectedAddressId === 'new' ? 'var(--red, #e2231a)' : '#71717a',
                              }}
                            >
                              <Plus style={{ width: 16, height: 16 }} />
                              Add New Address
                            </div>
                          </div>
                        )}

                        {/* New Address Input Form */}
                        {(selectedAddressId === 'new' || addresses.length === 0) && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0e0e10' }}>
                              Enter Recipient &amp; Delivery Details
                            </div>
                            <div className="inf-ck-form-row">
                              <input
                                className="inf-ck-input"
                                placeholder="Full Name / Recipient"
                                value={newAddress.name}
                                onChange={(e) => setNewAddress((c) => ({ ...c, name: e.target.value }))}
                              />
                              <input
                                className="inf-ck-input"
                                placeholder="Mobile Phone (10-digit)"
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
                                placeholder="State"
                                value={newAddress.state}
                                onChange={(e) => setNewAddress((c) => ({ ...c, state: e.target.value }))}
                              />
                            </div>
                            <input
                              className="inf-ck-input"
                              placeholder="Flat, House no., Building, Company, Apartment"
                              value={newAddress.addressLine1}
                              onChange={(e) => setNewAddress((c) => ({ ...c, addressLine1: e.target.value }))}
                            />
                            <input
                              className="inf-ck-input"
                              placeholder="Area, Street, Sector, Village, Landmark (Optional)"
                              value={newAddress.addressLine2}
                              onChange={(e) => setNewAddress((c) => ({ ...c, addressLine2: e.target.value }))}
                            />
                          </div>
                        )}

                        {/* Shipping Speed Selection */}
                        <div style={{ marginTop: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0e0e10', marginBottom: 10 }}>
                            Choose Delivery Speed
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div
                              onClick={() => setShippingSpeed('std')}
                              style={{
                                border: `1.5px solid ${shippingSpeed === 'std' ? 'var(--red, #e2231a)' : '#e7e6e0'}`,
                                borderRadius: 12,
                                padding: '14px',
                                cursor: 'pointer',
                                background: shippingSpeed === 'std' ? 'rgba(226, 35, 26, 0.04)' : '#ffffff',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13.5, color: '#0e0e10' }}>
                                <Truck style={{ width: 16, height: 16, color: '#10b981' }} /> Standard (3-4 Days)
                              </div>
                              <div style={{ fontSize: 12, color: '#5d5d64', marginTop: 4 }}>
                                {isEligibleForFreeStandard ? (
                                  <span style={{ color: '#10b981', fontWeight: 700 }}>FREE Shipping</span>
                                ) : (
                                  '₹99'
                                )}
                              </div>
                            </div>

                            <div
                              onClick={() => setShippingSpeed('exp')}
                              style={{
                                border: `1.5px solid ${shippingSpeed === 'exp' ? 'var(--red, #e2231a)' : '#e7e6e0'}`,
                                borderRadius: 12,
                                padding: '14px',
                                cursor: 'pointer',
                                background: shippingSpeed === 'exp' ? 'rgba(226, 35, 26, 0.04)' : '#ffffff',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13.5, color: '#0e0e10' }}>
                                <Zap style={{ width: 16, height: 16, color: 'var(--red, #e2231a)' }} /> Express Air (48h)
                              </div>
                              <div style={{ fontSize: 12, color: '#5d5d64', marginTop: 4 }}>₹199 &bull; Priority Dispatch</div>
                            </div>
                          </div>
                        </div>

                        {submitError && (
                          <div
                            role="alert"
                            style={{
                              padding: '10px 14px',
                              background: 'rgba(226, 35, 26, 0.08)',
                              border: '1px solid rgba(226, 35, 26, 0.25)',
                              color: 'var(--red, #e2231a)',
                              borderRadius: 10,
                              fontSize: 12.5,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                            <span>{submitError}</span>
                          </div>
                        )}

                        <button
                          type="button"
                          className="inf-ck-pay-btn"
                          style={{ height: 46, marginTop: 4 }}
                          onClick={handleProceedToPayment}
                        >
                          Proceed to Payment &rarr;
                        </button>
                      </div>
                    ) : (
                      /* STEP 2: PAYMENT METHOD */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Shipping Overview / Edit Card */}
                        <div className="inf-ck-ship-summary">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 10,
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
                                Shipping to {activeAddress?.name || newAddress.name || userName || 'Customer'}
                              </div>
                              <div className="inf-ck-ship-addr">
                                {activeAddress?.addressLine1 || newAddress.addressLine1}, {activeAddress?.city || newAddress.city} &bull;{' '}
                                {shippingSpeed === 'exp' ? 'Express Priority Air (₹199)' : isEligibleForFreeStandard ? 'Standard Delivery (Free)' : 'Standard Delivery (₹99)'}
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

                        {/* Payment Selection Header */}
                        <div className="inf-ck-sec-header" style={{ margin: 0 }}>
                          <div className="inf-ck-sec-title">
                            <CreditCard style={{ width: 18, height: 18, color: 'var(--red, #e2231a)' }} />
                            <span>2. Select Payment Method</span>
                          </div>
                        </div>

                        {/* B2B GSTIN Tax Invoice Notice */}
                        {isWholesaleApproved && (
                          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-emerald-800 dark:text-emerald-400">
                                B2B Wholesaler Tax Invoice (ITC Eligible)
                              </span>
                              <span className="font-semibold text-text-tertiary">
                                Verified B2B Account
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <label className="text-text-secondary font-medium">Buyer GSTIN:</label>
                              <input
                                type="text"
                                value={buyerGstin}
                                onChange={(e) => setBuyerGstin(e.target.value.toUpperCase())}
                                placeholder="Enter 15-digit GSTIN"
                                className="rounded-lg border border-border bg-surface px-2 py-1 font-mono uppercase text-xs"
                                maxLength={15}
                              />
                            </div>
                          </div>
                        )}

                        <div className="inf-ck-pay-stack">
                          {/* 1. RAZORPAY GATEWAY (OFFICIAL RECOMMENDED) */}
                          <div
                            className={`inf-ck-pay-card ${paymentOption === 'razorpay' ? 'active' : ''}`}
                          >
                            <div
                              className="inf-ck-pay-card-header"
                              onClick={() => setPaymentOption('razorpay')}
                            >
                              <div className="inf-ck-radio-label">
                                <span className="inf-ck-radio-circle" />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 800, fontSize: 15, color: '#09090b', letterSpacing: '-0.2px' }}>
                                      Razorpay Secure Gateway
                                    </span>
                                    <span className="inf-ck-badge-recommend">
                                      <Zap size={11} style={{ fill: '#ffffff' }} /> Instant &bull; Zero Surcharge
                                    </span>
                                  </div>
                                  <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.4 }}>
                                    Instant UPI (GPay, PhonePe, Paytm, QR) &bull; Credit &amp; Debit Cards &bull; NetBanking &bull; EMI
                                  </div>
                                </div>
                              </div>

                              <div className="inf-ck-header-badges">
                                <div className="inf-ck-payment-brand-cluster">
                                  <span className="inf-ck-mini-brand-tag upi">UPI</span>
                                  <span className="inf-ck-mini-brand-tag visa">VISA</span>
                                  <span className="inf-ck-mini-brand-tag mc">MC</span>
                                  <span className="inf-ck-mini-brand-tag rupay">RuPay</span>
                                </div>
                                <div className="inf-ck-verified-shield">
                                  <ShieldCheck size={18} style={{ color: '#10b981' }} />
                                </div>
                              </div>
                            </div>

                            {paymentOption === 'razorpay' && (
                              <div className="inf-ck-card-body" style={{ padding: '0 20px 20px' }}>
                                <div className="inf-ck-pay-detail-container">
                                  {/* Clean Supported Methods Strip */}
                                  <div className="inf-ck-methods-strip">
                                    <div className="inf-ck-method-item">
                                      <div className="inf-ck-method-meta">
                                        <Smartphone size={15} className="inf-ck-icon-upi" style={{ flexShrink: 0 }} />
                                        <span>UPI &amp; QR</span>
                                      </div>
                                      <div className="inf-ck-method-tags-grid">
                                        <span className="inf-ck-tag">GPay</span>
                                        <span className="inf-ck-tag">PhonePe</span>
                                        <span className="inf-ck-tag">Paytm</span>
                                        <span className="inf-ck-tag">CRED</span>
                                      </div>
                                    </div>

                                    <div className="inf-ck-strip-divider" />

                                    <div className="inf-ck-method-item">
                                      <div className="inf-ck-method-meta">
                                        <CreditCard size={15} className="inf-ck-icon-card" style={{ flexShrink: 0 }} />
                                        <span>Cards &amp; Banks</span>
                                      </div>
                                      <div className="inf-ck-method-tags-grid">
                                        <span className="inf-ck-tag">Visa</span>
                                        <span className="inf-ck-tag">Mastercard</span>
                                        <span className="inf-ck-tag">RuPay</span>
                                        <span className="inf-ck-tag">50+ Banks</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Refined Context Note */}
                                  <div className="inf-ck-gateway-note">
                                    <ShieldCheck size={16} className="inf-ck-note-shield" />
                                    <span>
                                      Click <strong>&ldquo;Pay with Razorpay&rdquo;</strong> to launch the official secure overlay. Card and UPI credentials never touch our servers.
                                    </span>
                                  </div>

                                  {/* Trust Badges Strip */}
                                  <div className="inf-ck-trust-bar">
                                    <div className="inf-ck-trust-item">
                                      <Lock size={13} style={{ color: '#10b981' }} />
                                      <span>256-Bit SSL Encrypted</span>
                                    </div>
                                    <div className="inf-ck-trust-item">
                                      <ShieldCheck size={13} style={{ color: '#10b981' }} />
                                      <span>PCI-DSS Level 1</span>
                                    </div>
                                    <div className="inf-ck-trust-item">
                                      <Sparkles size={13} style={{ color: '#f59e0b' }} />
                                      <span>Zero Convenience Fee</span>
                                    </div>
                                    <div className="inf-ck-trust-item">
                                      <Zap size={13} style={{ color: '#3b82f6' }} />
                                      <span>Instant Refunds</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 2. CASH ON DELIVERY */}
                          <div
                            className={`inf-ck-pay-card ${paymentOption === 'cod' ? 'cod-active' : ''}`}
                          >
                            <div
                              className="inf-ck-pay-card-header"
                              onClick={() => setPaymentOption('cod')}
                            >
                              <div className="inf-ck-radio-label">
                                <span className="inf-ck-radio-circle" />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 800, fontSize: 15, color: '#09090b', letterSpacing: '-0.2px' }}>
                                      Cash on Delivery (Doorstep)
                                    </span>
                                    <span className="inf-ck-badge-available">
                                      <Check size={11} /> Available at Your Pincode
                                    </span>
                                  </div>
                                  <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.4 }}>
                                    Pay via physical Cash or dynamic UPI QR on delivery handover
                                  </div>
                                </div>
                              </div>

                              <div className="inf-ck-header-badges">
                                <div className="inf-ck-cod-badge-icon">
                                  <Banknote size={20} style={{ color: '#059669' }} />
                                </div>
                              </div>
                            </div>

                            {paymentOption === 'cod' && (
                              <div className="inf-ck-card-body" style={{ padding: '0 20px 20px' }}>
                                <div className="inf-ck-cod-container">
                                  {/* 3-Step Doorstep Timeline */}
                                  <div className="inf-ck-cod-timeline">
                                    <div className="inf-ck-cod-step">
                                      <div className="inf-ck-cod-step-num">1</div>
                                      <div>
                                        <div className="inf-ck-cod-step-title">Insured Transit</div>
                                        <div className="inf-ck-cod-step-desc">Sealed packaging from fulfillment hub.</div>
                                      </div>
                                    </div>

                                    <div className="inf-ck-cod-step">
                                      <div className="inf-ck-cod-step-num">2</div>
                                      <div>
                                        <div className="inf-ck-cod-step-title">Delivery OTP</div>
                                        <div className="inf-ck-cod-step-desc">SMS &amp; WhatsApp OTP on arrival.</div>
                                      </div>
                                    </div>

                                    <div className="inf-ck-cod-step">
                                      <div className="inf-ck-cod-step-num">3</div>
                                      <div>
                                        <div className="inf-ck-cod-step-title">Cash or QR Scan</div>
                                        <div className="inf-ck-cod-step-desc">Pay {formatINR(finalTotal)} cash or UPI QR.</div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Tip Box */}
                                  <div className="inf-ck-cod-tip">
                                    <QrCode size={16} style={{ color: '#059669', flexShrink: 0, marginTop: 1 }} />
                                    <div>
                                      <strong>Contactless Handover:</strong> You can scan the courier partner&apos;s dynamic UPI QR code with any UPI app on your phone upon arrival if you prefer not to carry physical cash.
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Security Guarantee Footer Bar */}
                        <div className="inf-ck-security-guarantee-bar">
                          <div className="inf-ck-security-item">
                            <ShieldCheck size={18} style={{ color: '#10b981', flexShrink: 0 }} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 12, color: '#09090b' }}>100% Buyer Protection</div>
                              <div style={{ fontSize: 11, color: '#71717a' }}>Genuine CarXen products guaranteed</div>
                            </div>
                          </div>
                          <div className="inf-ck-security-item">
                            <Lock size={18} style={{ color: '#2563eb', flexShrink: 0 }} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 12, color: '#09090b' }}>Bank-Grade Security</div>
                              <div style={{ fontSize: 11, color: '#71717a' }}>RBI authorized Razorpay gateway</div>
                            </div>
                          </div>
                          <div className="inf-ck-security-item">
                            <Truck size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 12, color: '#09090b' }}>Insured Transit</div>
                              <div style={{ fontSize: 11, color: '#71717a' }}>Instant replacement on damage</div>
                            </div>
                          </div>
                        </div>

                        {/* Save info checkbox */}
                        <label className="inf-ck-checkbox-row">
                          <input
                            type="checkbox"
                            checked={saveInfo}
                            onChange={(e) => setSaveInfo(e.target.checked)}
                          />
                          <span>Save my delivery preferences for faster future checkouts</span>
                        </label>

                        {/* Submit Error Banner */}
                        {submitError && (
                          <div
                            role="alert"
                            style={{
                              padding: '12px 16px',
                              background: 'rgba(226, 35, 26, 0.08)',
                              border: '1px solid rgba(226, 35, 26, 0.25)',
                              color: 'var(--red, #e2231a)',
                              borderRadius: 10,
                              fontSize: 12.5,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                            <span>{submitError}</span>
                          </div>
                        )}

                        {/* Main Red Brand Pay CTA Button */}
                        <button
                          type="button"
                          className="inf-ck-pay-btn"
                          style={{ marginTop: 8 }}
                          onClick={handlePlaceOrder}
                          disabled={isSubmitting}
                          aria-busy={isSubmitting}
                        >
                          <Lock style={{ width: 15, height: 15 }} />
                          {isSubmitting
                            ? 'Processing Payment...'
                            : paymentOption === 'razorpay'
                            ? `Pay with Razorpay | ${formatINR(finalTotal)}`
                            : paymentOption === 'cod'
                            ? `Confirm Cash on Delivery | ${formatINR(finalTotal)}`
                            : `Place Wholesaler Order | ${formatINR(finalTotal)}`}
                        </button>

                        <div style={{ textAlign: 'center', fontSize: 11.5, color: '#71717a', marginTop: -8 }}>
                          🔒 100% Cryptographically Verified &bull; Direct Carrier Tracking &bull; Hassle-Free Returns
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column (Cart, Promo, Summary) */}
                  <div className="inf-ck-right-col">
                    {/* Card 1: Your Cart */}
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
                                -
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
                              {formatINR(calculateItemPriceWithOfferLimit(product, qty, isWholesaleApproved).totalPrice)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Card 2: Promo Code / Wholesale Offers */}
                    <div className="inf-ck-card">
                      <div className="inf-ck-card-hdr">
                        <div className="inf-ck-card-t">
                          <Gift />
                          <span>Promo Code &amp; Offers</span>
                        </div>
                      </div>

                      <div className="inf-ck-promo-row">
                        <input
                          className="inf-ck-input"
                          placeholder="Enter coupon code"
                          value={couponCode}
                          onChange={(e) => {
                            setCouponCode(e.target.value);
                            if (couponError) setCouponError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleApplyCoupon();
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="inf-ck-promo-btn"
                          onClick={() => handleApplyCoupon()}
                        >
                          Apply
                        </button>
                      </div>

                      {couponError ? (
                        <div
                          style={{
                            marginTop: 10,
                            padding: '10px 14px',
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: 8,
                            color: '#dc2626',
                            fontSize: 12,
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                            lineHeight: 1.45,
                          }}
                        >
                          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2, color: '#dc2626' }} />
                          <span>{couponError}</span>
                        </div>
                      ) : null}

                      {appliedCoupon && couponValidation?.valid ? (
                        <div className="inf-ck-promo-tag" style={{ marginTop: 10 }}>
                          <span>
                            ✓ &ldquo;{appliedCoupon}&rdquo; active ({couponValidation.coupon?.name || (couponValidation.coupon?.type === 'Percentage' ? `${couponValidation.coupon.value}% off` : `${formatINR(couponDiscount)} off`)})
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setAppliedCoupon('');
                              setCouponCode('');
                              setCouponError(null);
                            }}
                            style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                          >
                            Remove
                          </button>
                        </div>
                      ) : null}

                      {appliedCoupon && !couponValidation?.valid ? (
                        <div
                          style={{
                            marginTop: 10,
                            padding: '10px 14px',
                            backgroundColor: '#fffbeb',
                            border: '1px solid #fde68a',
                            borderRadius: 8,
                            color: '#b45309',
                            fontSize: 12,
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                            lineHeight: 1.45,
                          }}
                        >
                          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2, color: '#b45309' }} />
                          <div style={{ flex: 1 }}>
                            <span>{couponValidation?.error || `Coupon "${appliedCoupon}" is no longer applicable.`}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAppliedCoupon('');
                              setCouponCode('');
                              setCouponError(null);
                            }}
                            style={{ background: 'none', border: 'none', color: '#b45309', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                          >
                            Remove
                          </button>
                        </div>
                      ) : null}

{/* Only Show Assigned Coupon by Owner (if available for this customer and not already applied) */}
                      {assignedCoupon && assignedCoupon.code !== appliedCoupon ? (
                        <div className="inf-ck-promo-suggestions">
                          <div className="inf-ck-wholesale-promo-banner">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {assignedCoupon.audience === 'Verified customers (3+ orders)' ? (
                                <CheckCircle2 size={15} style={{ color: '#2563eb', flexShrink: 0 }} />
                              ) : (
                                <Building2 size={15} style={{ color: '#d97706', flexShrink: 0 }} />
                              )}
                              <div>
                                <span style={{ fontWeight: 700, color: assignedCoupon.audience === 'Verified customers (3+ orders)' ? '#1e40af' : '#92400e' }}>
                                  {assignedCoupon.audience === 'Verified customers (3+ orders)'
                                    ? 'Verified Buyer Exclusive:'
                                    : `Exclusive for ${b2bProfile?.businessName || 'Your Business'}:`}
                                </span>{' '}
                                <span style={{ color: assignedCoupon.audience === 'Verified customers (3+ orders)' ? '#1e3a8a' : '#78350f' }}>
                                  Use <strong>{assignedCoupon.code}</strong> ({assignedCoupon.type === 'Percentage' ? `${assignedCoupon.value}% off` : formatINR(assignedCoupon.value) + ' off'})
                                  {assignedCoupon.minimumOrder ? ` (min ${formatINR(assignedCoupon.minimumOrder)})` : ''}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="inf-ck-wholesale-promo-btn"
                              onClick={() => handleApplyCoupon(assignedCoupon.code)}
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Card 3: Summary */}
                    <div className="inf-ck-card">
                      <div className="inf-ck-card-hdr">
                        <div className="inf-ck-card-t">
                          <ReceiptText />
                          <span>Order Summary</span>
                        </div>
                      </div>

                      <div className="inf-ck-summary-rows">
                        <div className="inf-ck-summary-row">
                          <span>Subtotal</span>
                          <span>{formatINR(cartSubtotal)}</span>
                        </div>

                        {couponDiscount > 0 && (
                          <div className="inf-ck-summary-row discount">
                            <span>
                              Discount{' '}
                              {couponValidation?.coupon?.type === 'Percentage'
                                ? `(${couponValidation.coupon.value}%)`
                                : `(${couponValidation?.coupon?.code || 'Coupon'})`}
                            </span>
                            <span>-{formatINR(couponDiscount)}</span>
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

      {/* RAZORPAY TEST ENVIRONMENT SIMULATOR MODAL (When placeholder keys are active) */}
      {mockModalOpen && mockOrderDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(14, 14, 16, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 480,
              boxShadow: '0 20px 48px rgba(0, 0, 0, 0.28)',
              overflow: 'hidden',
              border: '1px solid #eeede8',
              animation: 'modalSlideIn 0.25s ease-out',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: '#0e0e10',
                color: '#ffffff',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    background: 'var(--red, #e2231a)',
                    color: '#ffffff',
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: 15,
                  }}
                >
                  CX
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '0.3px' }}>CARXEN CHECKOUT</div>
                  <div style={{ fontSize: 11, color: '#a1a1aa' }}>Razorpay Test Gateway (Sandbox)</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMockModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#a1a1aa',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Notice Pill */}
              <div
                style={{
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: 10,
                  padding: '12px 14px',
                  fontSize: 12,
                  color: '#92400e',
                  lineHeight: 1.45,
                }}
              >
                <strong>🔑 Sandbox Mode Active:</strong> Your <code>.env.local</code> currently has placeholder Razorpay keys. Once you add your live Razorpay Key ID &amp; Secret, this modal will seamlessly open the real Razorpay popup directly.
              </div>

              {/* Order Info */}
              <div
                style={{
                  background: '#faf9f6',
                  borderRadius: 12,
                  border: '1px solid #eeede8',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#5d5d64' }}>
                  <span>Razorpay Order ID</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0e0e10' }}>
                    {mockOrderDetails.razorpayOrderId}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#5d5d64' }}>
                  <span>Customer</span>
                  <span style={{ fontWeight: 600, color: '#0e0e10' }}>
                    {mockOrderDetails.selectedAddress.name} ({mockOrderDetails.selectedAddress.phone})
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: 8,
                    borderTop: '1px solid #eeede8',
                    fontSize: 15,
                    fontWeight: 800,
                    color: '#0e0e10',
                  }}
                >
                  <span>Amount to Pay</span>
                  <span style={{ color: 'var(--red, #e2231a)' }}>{formatINR(mockOrderDetails.finalTotal)}</span>
                </div>
              </div>

              {/* Supported simulated payment methods */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                  Simulated Payment Modes:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 12 }}>
                  <div style={{ background: '#f4f3ef', borderRadius: 8, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    <Smartphone style={{ width: 14, height: 14, color: 'var(--red, #e2231a)' }} /> UPI (PhonePe / GPay)
                  </div>
                  <div style={{ background: '#f4f3ef', borderRadius: 8, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    <CreditCard style={{ width: 14, height: 14, color: '#2563eb' }} /> Visa &bull; Mastercard
                  </div>
                  <div style={{ background: '#f4f3ef', borderRadius: 8, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    <Building2 style={{ width: 14, height: 14, color: '#059669' }} /> NetBanking
                  </div>
                  <div style={{ background: '#f4f3ef', borderRadius: 8, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    <QrCode style={{ width: 14, height: 14, color: '#7c3aed' }} /> Dynamic UPI QR
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px 18px',
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 13.5,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                  }}
                  disabled={isSubmitting}
                  onClick={async () => {
                    const mockPaymentId = `pay_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                    const mockSignature = `mock_sig_${Math.random().toString(36).slice(2, 12)}`;
                    await handleVerifyAndPlaceOrder({
                      razorpay_order_id: mockOrderDetails.razorpayOrderId,
                      razorpay_payment_id: mockPaymentId,
                      razorpay_signature: mockSignature,
                      selectedAddress: mockOrderDetails.selectedAddress,
                    });
                  }}
                >
                  <ShieldCheck style={{ width: 16, height: 16 }} />
                  {isSubmitting ? 'Verifying with Backend...' : '✓ Approve Test Payment (Simulate Success)'}
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    style={{
                      background: '#ffffff',
                      color: 'var(--red, #e2231a)',
                      border: '1px solid rgba(226, 35, 26, 0.3)',
                      padding: '10px 14px',
                      borderRadius: 10,
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setMockModalOpen(false);
                      setSubmitError('Simulated payment failure: Transaction was cancelled or declined by user.');
                      showToast('Payment declined (Test Simulation)');
                    }}
                  >
                    Simulate Decline
                  </button>
                  <button
                    type="button"
                    style={{
                      background: '#f4f3ef',
                      color: '#5d5d64',
                      border: '1px solid #e7e6e0',
                      padding: '10px 14px',
                      borderRadius: 10,
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                    onClick={() => setMockModalOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

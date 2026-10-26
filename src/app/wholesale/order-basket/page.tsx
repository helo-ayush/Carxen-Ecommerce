'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/data/products';
import type { Product } from '@/data/products';
import { calculateItemPriceWithOfferLimit } from '@/lib/storefront/wholesale-pricing';
import { WholesaleIcon } from '@/components/wholesale/WholesaleIcon';
import { ProductArt } from '@/components/ProductArt';
import { CatalogState } from '@/components/CatalogState';
import {
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Check,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Banknote,
  Lock,
  ShieldCheck,
  Smartphone,
  QrCode,
  Building2,
  Truck,
  Package,
  ShoppingBag,
  ExternalLink,
  Calendar,
  RefreshCw,
  X,
} from 'lucide-react';
import '../wholesale.css';

// Helper to dynamically load Razorpay checkout script
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

export default function WholesaleOrderBasketPage() {
  const router = useRouter();
  const {
    products,
    catalogStatus,
    catalogError,
    retryCatalog,
    user,
    b2bProfile,
    isWholesaleApproved,
    authLoading,
    addresses,
    wholesaleBasket,
    wholesaleBasketCount,
    wholesaleBasketSkuCount,
    updateWholesaleBasketQty,
    removeFromWholesaleBasket,
    clearWholesaleBasket,
    saveOrderToHistory,
    showToast,
  } = useApp();

  // Strict B2B verification gate
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login?redirect=/wholesale/order-basket');
      } else if (!isWholesaleApproved) {
        router.replace('/wholesale');
      }
    }
  }, [authLoading, isWholesaleApproved, router, user]);

  // Confirmation form state
  const [businessName, setBusinessName] = useState(b2bProfile?.businessName || user?.name || '');
  const [tradeName, setTradeName] = useState(b2bProfile?.tradeName || '');
  const [gstin, setGstin] = useState(b2bProfile?.gstin || '');
  const [pan, setPan] = useState(b2bProfile?.pan || '');
  const [representativeName, setRepresentativeName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Shipping & Billing Address
  const [shippingLine1, setShippingLine1] = useState(b2bProfile?.businessAddress || '');
  const [shippingCity, setShippingCity] = useState(b2bProfile?.city || '');
  const [shippingState, setShippingState] = useState(b2bProfile?.state || '');
  const [shippingPincode, setShippingPincode] = useState(b2bProfile?.pincode || '');
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');

  useEffect(() => {
    if (addresses.length > 0) {
      const primary = addresses.find((a) => a.isPrimary) || addresses[0];
      setSelectedAddressId(primary.id);
      setShippingLine1(primary.addressLine1 + (primary.addressLine2 ? `, ${primary.addressLine2}` : ''));
      setShippingCity(primary.city);
      setShippingState(primary.state);
      setShippingPincode(primary.postalCode);
      if (primary.name) setRepresentativeName(primary.name);
      if (primary.phone) setPhone(primary.phone);
    }
  }, [addresses]);

  const handleSelectWarehouseAddress = (addrId: string) => {
    setSelectedAddressId(addrId);
    const target = addresses.find((a) => a.id === addrId);
    if (target) {
      setShippingLine1(target.addressLine1 + (target.addressLine2 ? `, ${target.addressLine2}` : ''));
      setShippingCity(target.city);
      setShippingState(target.state);
      setShippingPincode(target.postalCode);
      if (target.name) setRepresentativeName(target.name);
      if (target.phone) setPhone(target.phone);
    }
  };

  // Delivery preferences & PO Reference
  const [poNumber, setPoNumber] = useState('');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
  const [partialShipmentAllowed, setPartialShipmentAllowed] = useState(true);
  const [factoryNotes, setFactoryNotes] = useState('');

  // Payment method selection: Razorpay or COD (just like B2C)
  const [paymentOption, setPaymentOption] = useState<'razorpay' | 'cod'>('razorpay');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submittedOrder, setSubmittedOrder] = useState<any | null>(null);

  // Critical decision warning modals (e.g. COD order placement, clearing basket)
  const [showCodWarningModal, setShowCodWarningModal] = useState(false);
  const [showClearBasketModal, setShowClearBasketModal] = useState(false);

  // Mock simulation modal state
  const [mockModalOpen, setMockModalOpen] = useState(false);
  const [mockOrderDetails, setMockOrderDetails] = useState<{
    razorpayOrderId: string;
    amountInPaise: number;
    finalTotal: number;
  } | null>(null);

  // Map basket items to product objects with verified MOQs & tier pricing
  const basketLineItems = useMemo(() => {
    return Object.entries(wholesaleBasket)
      .map(([idStr, qty]) => {
        const p = products.find((x) => x.id === Number(idStr));
        if (!p) return null;
        const moq = Math.max(1, p.b2bMoq || 5);
        const priceResult = calculateItemPriceWithOfferLimit(p, qty, true);
        const lineSubtotal = priceResult.totalPrice;
        const unitPrice = Math.round(lineSubtotal / qty);
        return {
          product: p,
          quantity: qty,
          moq,
          isMoqMet: qty >= moq,
          unitPrice,
          totalPrice: lineSubtotal,
        };
      })
      .filter(Boolean) as {
      product: Product;
      quantity: number;
      moq: number;
      isMoqMet: boolean;
      unitPrice: number;
      totalPrice: number;
    }[];
  }, [wholesaleBasket, products]);

  const allMoqsMet = basketLineItems.every((item) => item.isMoqMet);
  const totalSubtotal = basketLineItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const gstAmount = Math.round(totalSubtotal * 0.18);
  const totalOrderValue = totalSubtotal + gstAmount;

  if (authLoading || !user || !isWholesaleApproved) {
    return null;
  }

  const buildItemsPayload = () =>
    basketLineItems.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
    }));

  const buildOrderPayload = (extra: Record<string, any> = {}) => ({
    items: buildItemsPayload(),
    businessName,
    tradeName,
    gstin,
    pan,
    representativeName,
    email,
    phone,
    shippingAddress: {
      line1: shippingLine1,
      city: shippingCity,
      state: shippingState,
      postalCode: shippingPincode,
      country: 'India',
    },
    billingAddress: {
      line1: shippingLine1,
      city: shippingCity,
      state: shippingState,
      postalCode: shippingPincode,
      country: 'India',
    },
    poNumber: poNumber.trim() || undefined,
    requestedDeliveryDate: requestedDeliveryDate || undefined,
    partialShipmentAllowed,
    factoryNotes: factoryNotes.trim() || undefined,
    ...extra,
  });

  const completeWholesaleOrderPlacement = (placedOrder: any, methodLabel: string) => {
    setSubmittedOrder(placedOrder);
    clearWholesaleBasket();

    // Save to user account history
    try {
      if (typeof saveOrderToHistory === 'function') {
        const trackingNum = `CX-B2B-EXP-${Math.floor(100000 + Math.random() * 900000)}`;
        saveOrderToHistory({
          id: `order_${placedOrder.orderNumber}`,
          orderNumber: placedOrder.orderNumber,
          placedAt: new Date().toISOString(),
          status: 'CONFIRMED',
          statusMessage: 'Wholesale batch order confirmed and scheduled for factory dispatch',
          paymentStatus: placedOrder.paymentStatus === 'PAID' ? 'PAID' : 'PENDING',
          paymentMethod: methodLabel,
          trackingNumber: trackingNum,
          carrier: 'CarXen Factory Dedicated Line',
          trackingUrl: `https://www.delhivery.com/track/package/${trackingNum}`,
          estimatedDelivery: requestedDeliveryDate || 'Within 3-5 days',
          shippingAddress: {
            name: representativeName || businessName,
            phone: phone || '',
            addressLine1: shippingLine1,
            city: shippingCity,
            state: shippingState,
            postalCode: shippingPincode,
            country: 'India',
          },
          items: basketLineItems.map((it) => ({
            productId: it.product.id,
            name: it.product.n,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            lineSubtotal: it.totalPrice,
            category: it.product.c,
            image: it.product.image || it.product.images?.[0],
          })),
          subtotal: totalSubtotal,
          discountAmount: 0,
          shippingAmount: 0,
          totalAmount: placedOrder.totalAmount || totalOrderValue,
          currency: 'INR',
        });
      }
    } catch (e) {
      console.warn('Could not save wholesale order to client history:', e);
    }

    showToast(`Wholesale order ${placedOrder.orderNumber} placed successfully!`);
  };

  const executeCodOrderPlacement = async () => {
    setSubmitting(true);
    setSubmissionError(null);

    try {
      const payload = buildOrderPayload({ paymentMethod: 'Cash on delivery' });
      const res = await fetch('/api/storefront/wholesale/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      setSubmitting(false);

      if (!res.ok) {
        setShowCodWarningModal(false);
        setSubmissionError(data.error || 'Failed to place wholesale order. Please verify your details.');
        return;
      }

      setShowCodWarningModal(false);
      const placed = data.order || {
        orderNumber: `CX-B2B-${Math.floor(10000 + Math.random() * 90000)}`,
        totalAmount: totalOrderValue,
        paymentMethod: 'Cash on delivery',
        paymentStatus: 'PENDING',
      };
      completeWholesaleOrderPlacement(placed, 'Cash on delivery');
    } catch (err: any) {
      setSubmitting(false);
      setShowCodWarningModal(false);
      setSubmissionError(err?.message || 'Network error transmitting order to CarXen. Please try again.');
    }
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (basketLineItems.length === 0) {
      showToast('Wholesale order basket is empty.');
      return;
    }
    if (!allMoqsMet) {
      setSubmissionError('One or more items do not satisfy the minimum wholesale order quantity (MOQ).');
      return;
    }
    if (!shippingLine1 || !shippingCity || !shippingPincode) {
      setSubmissionError('Please provide a complete warehouse delivery address.');
      return;
    }

    setSubmissionError(null);

    // CASH ON DELIVERY (COD) FLOW - Intercept with critical confirmation dialog
    if (paymentOption === 'cod') {
      setShowCodWarningModal(true);
      return;
    }

    setSubmitting(true);

    // RAZORPAY ONLINE PAYMENT FLOW
    try {
      const createRes = await fetch('/api/storefront/wholesale/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildOrderPayload({ action: 'create-razorpay-order' })),
      });

      const orderData = await createRes.json().catch(() => ({}));
      if (!createRes.ok || !orderData.success) {
        throw new Error(orderData.error || 'Failed to initialize Razorpay checkout order.');
      }

      // Check if mock test mode is active
      if (orderData.isMock) {
        setMockOrderDetails({
          razorpayOrderId: orderData.razorpayOrderId,
          amountInPaise: orderData.amount,
          finalTotal: totalOrderValue,
        });
        setMockModalOpen(true);
        setSubmitting(false);
        return;
      }

      // Live Razorpay Mode
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady || !(window as any).Razorpay) {
        throw new Error('Unable to load Razorpay checkout gateway. Please verify your connection.');
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'CarXen Wholesale',
        description: `B2B Order Payment (${basketLineItems.length} SKUs, ${wholesaleBasketCount} units)`,
        image: '/logo.png',
        order_id: orderData.razorpayOrderId,
        prefill: {
          name: representativeName || businessName,
          email: email || '',
          contact: phone || '',
        },
        notes: {
          businessName,
          gstin,
          warehouse: `${shippingLine1}, ${shippingCity} - ${shippingPincode}`,
        },
        theme: {
          color: '#e2231a',
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            showToast('Payment window closed. Your wholesale basket is preserved.');
          },
          escape: true,
          backdropclose: false,
        },
        handler: async (resp: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          await verifyAndFinalizeWholesaleOrder({
            razorpayOrderId: resp.razorpay_order_id,
            razorpayPaymentId: resp.razorpay_payment_id,
            razorpaySignature: resp.razorpay_signature,
          });
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (errResp: any) => {
        setSubmitting(false);
        const errDesc = errResp?.error?.description || 'Payment was declined or cancelled.';
        setSubmissionError(errDesc);
        showToast(errDesc);
      });
      rzp.open();
    } catch (err: any) {
      console.error('Razorpay wholesale initialization failed:', err);
      const msg = err?.message || 'Failed to start payment gateway. Please try again.';
      setSubmissionError(msg);
      showToast(msg);
      setSubmitting(false);
    }
  };

  const verifyAndFinalizeWholesaleOrder = async (paymentDetails: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => {
    try {
      setSubmitting(true);
      const payload = buildOrderPayload({
        paymentMethod: 'Razorpay',
        ...paymentDetails,
      });

      const res = await fetch('/api/storefront/wholesale/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      setSubmitting(false);

      if (!res.ok) {
        throw new Error(data.error || 'Payment recorded but order registration failed.');
      }

      setMockModalOpen(false);
      const placed = data.order || {
        orderNumber: `CX-B2B-${Math.floor(10000 + Math.random() * 90000)}`,
        totalAmount: totalOrderValue,
        paymentMethod: 'Razorpay Secure (UPI / Cards / NetBanking)',
        paymentStatus: 'PAID',
      };
      completeWholesaleOrderPlacement(placed, 'Razorpay Secure (UPI / Cards)');
    } catch (err: any) {
      setSubmitting(false);
      setSubmissionError(err?.message || 'Payment verification could not be completed.');
      showToast(err?.message || 'Payment verification failed.');
    }
  };

  // SUCCESS CONFIRMATION STATE
  if (submittedOrder) {
    const isPaidOnline = submittedOrder.paymentStatus === 'PAID' || submittedOrder.paymentMethod?.toLowerCase().includes('razorpay');
    return (
      <div className="ws-page-container">
        <div className="ws-empty-state-card" style={{ maxWidth: '640px', width: '100%', boxSizing: 'border-box', margin: '30px auto', padding: '36px 20px' }}>
          <div className="ws-empty-icon-wrap" style={{ background: '#ecfdf5', color: '#059669' }}>
            <CheckCircle2 size={32} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
            Wholesale Order Confirmed
          </h2>
          <p style={{ color: '#64748b', fontSize: '13.5px', lineHeight: 1.5, marginBottom: '24px' }}>
            Your wholesale consignment order for <strong>{businessName}</strong> has been confirmed and scheduled for factory dispatch.
          </p>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', width: '100%', boxSizing: 'border-box', marginBottom: '24px', textAlign: 'left', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ color: '#64748b' }}>Order Reference:</span>
              <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{submittedOrder.orderNumber || submittedOrder.id}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ color: '#64748b' }}>Total Value (inc. 18% GST):</span>
              <strong style={{ color: '#0f172a' }}>{formatINR(submittedOrder.totalAmount || totalOrderValue)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ color: '#64748b' }}>Payment Method:</span>
              <strong style={{ color: isPaidOnline ? '#059669' : '#0284c7' }}>
                {isPaidOnline ? 'Razorpay Secure Online (PAID)' : 'Cash on Delivery (Pay at Handover)'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ color: '#64748b' }}>Warehouse Destination:</span>
              <strong style={{ color: '#0f172a', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>
                {shippingLine1}, {shippingCity} - {shippingPincode}
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/wholesale/orders" className="ws-btn-primary ws-btn-brand">
              <span>View Wholesale Orders</span>
              <ArrowRight size={15} />
            </Link>
            <Link href="/wholesale/catalog" className="ws-btn-secondary">
              Browse More Parts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // SERVER CATALOG LOADING STATE - Wait for products to be fetched live from server
  if (catalogStatus === 'loading' || (products.length === 0 && catalogStatus !== 'empty' && catalogStatus !== 'error')) {
    return (
      <div className="ws-page-container">
        <div className="ws-empty-state-card" style={{ maxWidth: '540px', width: '100%', boxSizing: 'border-box', margin: '40px auto', padding: '48px 24px' }}>
          <div className="ws-empty-icon-wrap" style={{ animation: 'spin 1.5s linear infinite' }}>
            <RefreshCw size={28} style={{ color: '#e2231a' }} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '16px 0 8px 0' }}>
            Fetching Wholesale Products from Server…
          </h2>
          <p style={{ color: '#64748b', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
            Verifying product allocations, verified MOQs, and tier pricing from the CarXen database.
          </p>
        </div>
      </div>
    );
  }

  // SERVER CATALOG ERROR STATE
  if (catalogStatus === 'error') {
    return (
      <div className="ws-page-container" style={{ padding: '40px 20px' }}>
        <CatalogState status={catalogStatus} error={catalogError} onRetry={retryCatalog} />
      </div>
    );
  }

  // EMPTY BASKET STATE
  if (basketLineItems.length === 0) {
    return (
      <div className="ws-page-container">
        <div className="ws-empty-state-card" style={{ maxWidth: '540px', width: '100%', boxSizing: 'border-box', margin: '30px auto', padding: '36px 20px' }}>
          <div className="ws-empty-icon-wrap">
            <WholesaleIcon name="basket" size={32} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
            Wholesale Basket is Empty
          </h2>
          <p style={{ color: '#64748b', fontSize: '13.5px', lineHeight: 1.5, marginBottom: '24px' }}>
            Select automotive parts from the procurement catalogue or use the Quick Order Matrix to build your batch order.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/wholesale/catalog" className="ws-btn-primary ws-btn-brand">
              <span>Open Catalogue</span>
              <ArrowRight size={15} />
            </Link>
            <Link href="/wholesale/quick-order" className="ws-btn-secondary">
              Quick Order Matrix
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ws-page-container">
      {/* Header Bar */}
      <div className="ws-header-bar">
        <div className="ws-header-titles">
          <div className="ws-breadcrumb-kicker">
            <WholesaleIcon name="basket" size={14} />
            <span>Procurement Workspace / Checkout</span>
          </div>
          <h1>
            <WholesaleIcon name="basket" size={26} />
            Wholesale Order Basket &amp; Checkout
          </h1>
          <p>
            Verify wholesale SKU allocations, minimum order quantities, delivery destination, and checkout seamlessly via Razorpay or Cash on Delivery.
          </p>
        </div>

        <div className="ws-header-actions">
          <button type="button" onClick={() => setShowClearBasketModal(true)} className="ws-btn-secondary" style={{ color: '#dc2626' }}>
            <Trash2 size={15} />
            <span>Clear Basket</span>
          </button>
          <Link href="/wholesale/catalog" className="ws-btn-secondary">
            + Add More SKUs
          </Link>
        </div>
      </div>

      {submissionError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px 18px', color: '#991b1b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} />
          <span style={{ fontSize: '13px', fontWeight: 600 }}>{submissionError}</span>
        </div>
      )}

      {/* Main 2-Column Checkout Layout */}
      <form onSubmit={handleConfirmOrder}>
        <div className="ws-order-layout">
          {/* Left Column: Basket Items Table & Delivery Destination */}
          <div className="ws-order-main">
            {/* Table Card */}
            <div className="ws-basket-card">
              <div className="ws-basket-card-header">
                <div className="ws-basket-card-title">
                  <Package size={18} style={{ color: '#e2231a' }} />
                  <span>Procurement Batch Items ({basketLineItems.length} SKUs, {wholesaleBasketCount} Units)</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Auto-applied tier margins based on quantity
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="ws-basket-desktop-table">
                <div className="ws-basket-table-wrap">
                  <table className="ws-basket-table">
                    <thead>
                      <tr>
                        <th style={{ width: '42%' }}>Part &amp; Specifications</th>
                        <th style={{ width: '13%', textAlign: 'center' }}>MOQ Status</th>
                        <th style={{ width: '15%', textAlign: 'right' }}>Wholesale Price</th>
                        <th style={{ width: '15%', textAlign: 'center' }}>Batch Quantity</th>
                        <th style={{ width: '11%', textAlign: 'right' }}>Line Total</th>
                        <th style={{ width: '4%', textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {basketLineItems.map(({ product: p, quantity, moq, isMoqMet, unitPrice, totalPrice }) => (
                        <tr key={p.id}>
                          <td>
                            <div className="ws-item-cell">
                              <Link href={`/wholesale/product/${p.id}`} className="ws-item-thumb" title={`View ${p.n}`}>
                                <ProductArt product={p} />
                              </Link>
                              <div className="ws-item-details">
                                <Link href={`/wholesale/product/${p.id}`} className="ws-item-name">
                                  {p.n}
                                </Link>
                                <div className="ws-item-meta">
                                  <Link href={`/wholesale/product/${p.id}`} className="ws-item-sku-badge" title={p.slug || `CX-${p.id}`}>
                                    Part #{p.slug || `CX-${p.id}`}
                                  </Link>
                                  <span>•</span>
                                  <span>{p.c || 'Accessories'}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            <span className={`ws-moq-pill ${isMoqMet ? 'valid' : 'invalid'}`}>
                              {isMoqMet ? <Check size={11} strokeWidth={3} /> : <AlertCircle size={11} />}
                              <span>MOQ: {moq}</span>
                            </span>
                            {!isMoqMet && (
                              <div style={{ fontSize: '10.5px', color: '#dc2626', marginTop: '3px', fontWeight: 600 }}>
                                Min {moq} req.
                              </div>
                            )}
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                              {formatINR(unitPrice)}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>/ unit (excl. GST)</div>
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            <div className="ws-stepper-wrap" style={{ margin: '0 auto' }}>
                              <button
                                type="button"
                                className="ws-stepper-btn"
                                onClick={() => updateWholesaleBasketQty(p.id, Math.max(1, quantity - 1))}
                                aria-label="Decrease quantity"
                              >
                                <Minus size={13} />
                              </button>
                              <input
                                type="number"
                                min={1}
                                className="ws-stepper-input"
                                value={quantity}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value, 10);
                                  if (!isNaN(v)) {
                                    updateWholesaleBasketQty(p.id, v);
                                  }
                                }}
                                aria-label={`Quantity for ${p.n}`}
                              />
                              <button
                                type="button"
                                className="ws-stepper-btn"
                                onClick={() => updateWholesaleBasketQty(p.id, quantity + 1)}
                                aria-label="Increase quantity"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                              {formatINR(totalPrice)}
                            </div>
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => removeFromWholesaleBasket(p.id)}
                              className="ws-item-remove-btn"
                              title="Remove item"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card List View (No horizontal scrolling on phone screens) */}
              <div className="ws-basket-mobile-list">
                {basketLineItems.map(({ product: p, quantity, moq, isMoqMet, unitPrice, totalPrice }) => (
                  <div key={p.id} className="ws-mobile-item-card">
                    <div className="ws-mobile-item-top">
                      <Link href={`/wholesale/product/${p.id}`} className="ws-mobile-item-thumb" title={`View ${p.n}`}>
                        <ProductArt product={p} />
                      </Link>
                      <div className="ws-mobile-item-info">
                        <Link href={`/wholesale/product/${p.id}`} className="ws-mobile-item-name">
                          {p.n}
                        </Link>
                        <div className="ws-mobile-item-meta">
                          <Link href={`/wholesale/product/${p.id}`} className="ws-item-sku-badge" title={p.slug || `CX-${p.id}`}>
                            Part #{p.slug || `CX-${p.id}`}
                          </Link>
                          <span className={`ws-moq-pill ${isMoqMet ? 'valid' : 'invalid'}`}>
                            {isMoqMet ? <Check size={10} strokeWidth={3} /> : <AlertCircle size={10} />}
                            <span>MOQ: {moq}</span>
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromWholesaleBasket(p.id)}
                        className="ws-item-remove-btn ws-mobile-remove-btn"
                        title="Remove item"
                        aria-label={`Remove ${p.n}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {!isMoqMet && (
                      <div className="ws-mobile-moq-warning">
                        <AlertCircle size={12} />
                        <span>Minimum batch quantity of {moq} units required for wholesale dispatch.</span>
                      </div>
                    )}

                    <div className="ws-mobile-item-bottom">
                      <div className="ws-mobile-pricing">
                        <span className="ws-mobile-unit-price">{formatINR(unitPrice)}</span>
                        <span className="ws-mobile-unit-label">/ unit (excl. GST)</span>
                      </div>

                      <div className="ws-mobile-actions-right">
                        <div className="ws-stepper-wrap">
                          <button
                            type="button"
                            className="ws-stepper-btn"
                            onClick={() => updateWholesaleBasketQty(p.id, Math.max(1, quantity - 1))}
                            aria-label="Decrease quantity"
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            min={1}
                            className="ws-stepper-input"
                            value={quantity}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              if (!isNaN(v)) {
                                updateWholesaleBasketQty(p.id, v);
                              }
                            }}
                            aria-label={`Quantity for ${p.n}`}
                          />
                          <button
                            type="button"
                            className="ws-stepper-btn"
                            onClick={() => updateWholesaleBasketQty(p.id, quantity + 1)}
                            aria-label="Increase quantity"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        <div className="ws-mobile-line-total">
                          <span className="ws-mobile-total-label">Subtotal</span>
                          <span className="ws-mobile-total-val">{formatINR(totalPrice)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Commercial Identity & Delivery Dispatch Destination */}
            <div className="ws-basket-card">
              <div className="ws-basket-card-header">
                <div className="ws-basket-card-title">
                  <Building2 size={18} style={{ color: '#2563eb' }} />
                  <span>Commercial Entity &amp; Warehouse Dispatch Destination</span>
                </div>
                <div style={{ fontSize: '11px', background: '#ecfdf5', color: '#059669', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                  ✓ 100% ITC Eligible GST Tax Invoice
                </div>
              </div>

              <div className="ws-basket-card-body">
                <div className="ws-form-grid ws-form-grid-2" style={{ marginBottom: '14px' }}>
                  <div className="ws-form-group">
                    <label className="ws-form-label">Legal Business Entity Name *</label>
                    <input
                      type="text"
                      required
                      className="ws-form-input"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />
                  </div>
                  <div className="ws-form-group">
                    <label className="ws-form-label">GSTIN Number (for GST Input Tax Credit) *</label>
                    <input
                      type="text"
                      required
                      className="ws-form-input"
                      style={{ fontFamily: 'monospace' }}
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                <div className="ws-form-grid ws-form-grid-3" style={{ marginBottom: '16px' }}>
                  <div className="ws-form-group">
                    <label className="ws-form-label">Contact Person *</label>
                    <input
                      type="text"
                      required
                      className="ws-form-input"
                      value={representativeName}
                      onChange={(e) => setRepresentativeName(e.target.value)}
                    />
                  </div>
                  <div className="ws-form-group">
                    <label className="ws-form-label">Phone / WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      className="ws-form-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="ws-form-group">
                    <label className="ws-form-label">Business Email *</label>
                    <input
                      type="email"
                      required
                      className="ws-form-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {addresses.length > 0 && (
                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                        Select Registered Warehouse Destination:
                      </label>
                      <Link
                        href="/wholesale/account"
                        style={{ fontSize: '12px', color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}
                      >
                        + Manage Warehouses
                      </Link>
                    </div>
                    <div className="ws-warehouse-grid">
                      {addresses.map((addr) => {
                        const isSelected = selectedAddressId === addr.id;
                        return (
                          <div
                            key={addr.id}
                            className={`ws-warehouse-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleSelectWarehouseAddress(addr.id)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                {addr.label || 'Warehouse'}
                              </span>
                              {addr.isPrimary && (
                                <span style={{ fontSize: '10px', background: '#ecfdf5', color: '#059669', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                  Primary
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                              {addr.addressLine1}, {addr.city} - {addr.postalCode}
                            </p>
                            <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>
                              Attn: {addr.name} ({addr.phone})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="ws-form-group">
                  <label className="ws-form-label">Warehouse Delivery Address *</label>
                  <input
                    type="text"
                    required
                    className="ws-form-input"
                    placeholder="Plot / Industrial Area / Landmark"
                    value={shippingLine1}
                    onChange={(e) => setShippingLine1(e.target.value)}
                  />
                </div>

                <div className="ws-form-grid ws-form-grid-3">
                  <div className="ws-form-group">
                    <label className="ws-form-label">City *</label>
                    <input
                      type="text"
                      required
                      className="ws-form-input"
                      value={shippingCity}
                      onChange={(e) => setShippingCity(e.target.value)}
                    />
                  </div>
                  <div className="ws-form-group">
                    <label className="ws-form-label">State *</label>
                    <input
                      type="text"
                      required
                      className="ws-form-input"
                      value={shippingState}
                      onChange={(e) => setShippingState(e.target.value)}
                    />
                  </div>
                  <div className="ws-form-group">
                    <label className="ws-form-label">PIN Code *</label>
                    <input
                      type="text"
                      required
                      className="ws-form-input"
                      value={shippingPincode}
                      onChange={(e) => setShippingPincode(e.target.value)}
                    />
                  </div>
                </div>

                {/* Delivery Reference & Dispatch Notes */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '12px' }}>
                    Delivery Schedule &amp; Consignment Notes (Optional)
                  </div>
                  <div className="ws-form-grid ws-form-grid-2" style={{ marginBottom: '14px' }}>
                    <div className="ws-form-group">
                      <label className="ws-form-label">Buyer PO Reference #</label>
                      <input
                        type="text"
                        className="ws-form-input"
                        placeholder="e.g. PO-2026-OCT-8841"
                        value={poNumber}
                        onChange={(e) => setPoNumber(e.target.value)}
                      />
                    </div>
                    <div className="ws-form-group">
                      <label className="ws-form-label">Target Delivery Date</label>
                      <input
                        type="date"
                        className="ws-form-input"
                        value={requestedDeliveryDate}
                        onChange={(e) => setRequestedDeliveryDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="partialShip"
                      checked={partialShipmentAllowed}
                      onChange={(e) => setPartialShipmentAllowed(e.target.checked)}
                    />
                    <label htmlFor="partialShip" style={{ fontSize: '12.5px', color: '#475569', cursor: 'pointer' }}>
                      Allow partial batch consignment dispatch
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Payment Checkout */}
          <div className="ws-checkout-card">
            <h3>Wholesale Order Checkout</h3>

            <div className="ws-price-row">
              <span>Selected SKUs</span>
              <strong>{basketLineItems.length} SKUs</strong>
            </div>
            <div className="ws-price-row">
              <span>Total Batch Units</span>
              <strong>{wholesaleBasketCount} pcs</strong>
            </div>
            <div className="ws-price-row">
              <span>Wholesale Base Subtotal</span>
              <strong>{formatINR(totalSubtotal)}</strong>
            </div>
            <div className="ws-price-row">
              <span>GST (18% ITC Eligible)</span>
              <strong>{formatINR(gstAmount)}</strong>
            </div>
            <div className="ws-price-row">
              <span>Factory Logistics</span>
              <strong style={{ color: '#059669', fontSize: '12px' }}>FREE (Enterprise Tier)</strong>
            </div>

            <div className="ws-price-row total">
              <span>Commercial Invoice Value</span>
              <span style={{ color: '#0f172a' }}>{formatINR(totalOrderValue)}</span>
            </div>

            {/* PAYMENT METHOD SELECTION (COD & RAZORPAY JUST LIKE B2C) */}
            <div className="ws-payment-section">
              <div className="ws-payment-section-title">Select Payment Method</div>

              {/* 1. Razorpay Secure Online Payment */}
              <div
                className={`ws-pay-card ${paymentOption === 'razorpay' ? 'active' : ''}`}
                onClick={() => setPaymentOption('razorpay')}
              >
                <div className="ws-pay-card-header">
                  <div className="ws-radio-label">
                    <span className="ws-radio-circle" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>
                        Razorpay Secure Online
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Instant UPI, Cards, NetBanking, QR
                      </div>
                    </div>
                  </div>
                  <span className="ws-pay-badge online">Instant • 100% Secure</span>
                </div>

                {paymentOption === 'razorpay' && (
                  <div className="ws-pay-card-details">
                    <p style={{ margin: 0 }}>
                      Pay instantly via dynamic UPI (GPay, PhonePe, Paytm, QR), Credit &amp; Debit Cards, NetBanking, or EMI. Immediate factory release.
                    </p>
                  </div>
                )}
              </div>

              {/* 2. Cash on Delivery (COD) */}
              <div
                className={`ws-pay-card ${paymentOption === 'cod' ? 'active' : ''}`}
                onClick={() => setPaymentOption('cod')}
              >
                <div className="ws-pay-card-header">
                  <div className="ws-radio-label">
                    <span className="ws-radio-circle" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>
                        Cash on Delivery (COD)
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Pay upon warehouse arrival
                      </div>
                    </div>
                  </div>
                  <span className="ws-pay-badge cod">Available</span>
                </div>

                {paymentOption === 'cod' && (
                  <div className="ws-pay-card-details">
                    <p style={{ margin: 0 }}>
                      Pay via physical cash or courier dynamic UPI QR code scan upon consignment handover at your warehouse.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Security Guarantee Box */}
            <div className="ws-security-guarantee-box">
              <div className="ws-security-row">
                <ShieldCheck size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>100% Genuine CarXen automotive products</span>
              </div>
              <div className="ws-security-row">
                <Lock size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
                <span>RBI authorized secure Razorpay gateway</span>
              </div>
              <div className="ws-security-row">
                <Truck size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
                <span>Transit-insured factory batch delivery</span>
              </div>
            </div>

            {/* Submit / Pay Button */}
            <button
              type="submit"
              disabled={submitting || !allMoqsMet}
              className="ws-btn-primary ws-btn-brand"
              style={{ width: '100%', height: '48px', fontSize: '14.5px', marginTop: '18px', fontWeight: 700 }}
            >
              {submitting ? (
                <span>Processing Order…</span>
              ) : paymentOption === 'razorpay' ? (
                <>
                  <Lock size={16} />
                  <span>Pay {formatINR(totalOrderValue)} via Razorpay</span>
                </>
              ) : (
                <>
                  <Banknote size={16} />
                  <span>Place Wholesale Order with COD</span>
                </>
              )}
            </button>

            <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: '10px' }}>
              Official Tax Invoice with 18% GST issued on fulfillment
            </div>
          </div>
        </div>
      </form>

      {/* RAZORPAY TEST SIMULATION MODAL (When Test/Mock Key is Active) */}
      {mockModalOpen && mockOrderDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 460,
              width: '100%',
              padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e2231a' }}>
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Razorpay Test Gateway</h3>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Wholesale B2B Online Simulation</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMockModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Order ID:</span>
                <strong style={{ fontFamily: 'monospace' }}>{mockOrderDetails.razorpayOrderId}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Legal Entity:</span>
                <strong>{businessName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Commercial Total:</span>
                <strong style={{ color: '#e2231a', fontSize: 15 }}>{formatINR(mockOrderDetails.finalTotal)}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Payment Methods Simulated:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                <div style={{ background: '#f1f5f9', borderRadius: 6, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Smartphone size={13} style={{ color: '#e2231a' }} /> UPI / QR
                </div>
                <div style={{ background: '#f1f5f9', borderRadius: 6, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CreditCard size={13} style={{ color: '#2563eb' }} /> Visa / RuPay
                </div>
                <div style={{ background: '#f1f5f9', borderRadius: 6, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={13} style={{ color: '#059669' }} /> NetBanking
                </div>
                <div style={{ background: '#f1f5f9', borderRadius: 6, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <QrCode size={13} style={{ color: '#7c3aed' }} /> Dynamic QR
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                disabled={submitting}
                style={{
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                onClick={async () => {
                  const mockPaymentId = `pay_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                  const mockSignature = `mock_sig_${Math.random().toString(36).slice(2, 12)}`;
                  await verifyAndFinalizeWholesaleOrder({
                    razorpayOrderId: mockOrderDetails.razorpayOrderId,
                    razorpayPaymentId: mockPaymentId,
                    razorpaySignature: mockSignature,
                  });
                }}
              >
                <ShieldCheck size={16} />
                {submitting ? 'Verifying with Backend…' : '✓ Approve Test Payment (Simulate Success)'}
              </button>

              <button
                type="button"
                style={{
                  background: '#ffffff',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  padding: '10px',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 12.5,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setMockModalOpen(false);
                  setSubmissionError('Simulated payment was cancelled or declined.');
                  showToast('Payment declined (Test Simulation)');
                }}
              >
                Simulate Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CRITICAL DECISION: COD ORDER CONFIRMATION WARNING MODAL */}
      {showCodWarningModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: '28px 24px',
              maxWidth: 520,
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #fde047',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                  Confirm Wholesale Order Booking
                </h3>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                  Are you sure you want to place this wholesale consignment under Cash on Delivery?
                </p>
              </div>
            </div>

            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: 12.5,
                color: '#92400e',
                lineHeight: 1.5,
                marginBottom: 16,
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2, color: '#b45309' }} />
              <div>
                <strong>Factory Commitment Notice:</strong> Confirming this wholesale consignment immediately routes the order to the CarXen factory floor for production staging and transport allocation. Please ensure your receiving facility is prepared for delivery handover.
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '14px 16px',
                fontSize: 12.5,
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: '#64748b' }}>Buyer Entity:</span>
                <strong style={{ color: '#0f172a' }}>{businessName} {gstin ? `(${gstin})` : ''}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: '#64748b' }}>Consignment Batch:</span>
                <strong style={{ color: '#0f172a' }}>{basketLineItems.length} SKUs &bull; {wholesaleBasketCount} Total Units</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: '#64748b' }}>Warehouse Destination:</span>
                <strong style={{ color: '#0f172a', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>
                  {shippingLine1}, {shippingCity} ({shippingPincode})
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: '#64748b' }}>Payment Mode:</span>
                <strong style={{ color: '#0284c7' }}>Cash on Delivery (Pay at Handover)</strong>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: 10,
                  borderTop: '1px solid #e2e8f0',
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                <span style={{ color: '#0f172a' }}>Total Amount Due (inc. 18% GST):</span>
                <span style={{ color: '#e2231a' }}>{formatINR(totalOrderValue)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowCodWarningModal(false)}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Review &amp; Edit Basket
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={executeCodOrderPlacement}
                style={{
                  background: '#e2231a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {submitting ? 'Transmitting Order…' : 'Yes, Confirm & Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CRITICAL DECISION: CLEAR BASKET CONFIRMATION MODAL */}
      {showClearBasketModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: '24px',
              maxWidth: 420,
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0' }}>
                  Clear Wholesale Basket?
                </h3>
                <p style={{ fontSize: 12.5, color: '#64748b', margin: 0 }}>
                  Are you sure you want to remove all {wholesaleBasketCount} units from your basket? This action cannot be undone.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setShowClearBasketModal(false)}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 15px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Keep Items
              </button>
              <button
                type="button"
                onClick={() => {
                  clearWholesaleBasket();
                  setShowClearBasketModal(false);
                  showToast('Wholesale order basket cleared.');
                }}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 16px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Yes, Clear Basket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

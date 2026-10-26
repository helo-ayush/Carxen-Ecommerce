'use client';

import React, { useState, useRef, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp, type GarageVehicle } from '@/context/AppContext';
import { formatINR } from '@/data/products';
import {
  ACTIVE_ORDER_STATUSES,
  ORDER_STAGE_FLOW,
  ORDER_STAGE_LABELS,
  orderStageStep,
} from '@/lib/order-stages';
import type { CustomerAddress, CustomerOrderHistoryRecord } from '@/types/customer';
import { Footer } from '@/components/Footer';
import { supabase } from '@/lib/supabase/client';
import {
  Package,
  MapPin,
  CarFront,
  CreditCard,
  Settings2,
  Camera,
  Check,
  Truck,
  FileText,
  RotateCcw,
  Plus,
  Trash2,
  Pencil,
  Copy,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  Lock,
  Printer,
  X,
  Star,
  Download,
} from 'lucide-react';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import './account.css';

type AccountTab = 'orders' | 'addresses' | 'garage' | 'payments' | 'security';
type OrderFilter = 'ALL' | 'ACTIVE' | 'DELIVERED';

function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'D';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function AccountContent() {
  const router = useRouter();
  const {
    user,
    authLoading,
    car,
    setVehicle,
    logout,
    login,
    updateUserProfile,
    addresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setPrimaryAddress,
    orders,
    savedPayments,
    addSavedPayment,
    deleteSavedPayment,
    setDefaultPayment,
    communicationPrefs,
    updateCommunicationPrefs,
    gstBilling,
    updateGstBilling,
    addToCart,
    openCart,
    showToast,
    isVerifiedBuyer,
    totalProductsBought,
    garageVehicles,
    addGarageVehicle,
    updateGarageVehicle,
    deleteGarageVehicle,
  } = useApp();

  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<AccountTab>(
    (tabParam as AccountTab) || 'orders'
  );
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('ALL');
  const [orderSearch, setOrderSearch] = useState('');
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  useEffect(() => {
    if (
      tabParam === 'garage' ||
      tabParam === 'orders' ||
      tabParam === 'addresses' ||
      tabParam === 'payments' ||
      tabParam === 'security'
    ) {
      setActiveTab(tabParam as AccountTab);
    }
  }, [tabParam]);

  // Vehicle Add / Edit Modal state
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<GarageVehicle | null>(null);
  const [vehicleForm, setVehicleForm] = useState({
    b: 'Porsche',
    m: '',
    y: '2024',
    f: 'Petrol',
    isDefault: false,
  });
  const [isCustomBrand, setIsCustomBrand] = useState(false);

  // Modals
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [trackingModalOrder, setTrackingModalOrder] = useState<CustomerOrderHistoryRecord | null>(null);
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<CustomerOrderHistoryRecord | null>(null);

  // Customer Product Reviews state (productId -> review record)
  const [customerReviews, setCustomerReviews] = useState<Record<number, any>>({});
  const [reviewModalData, setReviewModalData] = useState<{
    productId: number;
    productName: string;
    productImage?: string;
    orderNumber: string;
    existingReview?: any;
  } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverReviewRating, setHoverReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');

  // Hidden file input for direct photo upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Address Form state
  const [addressForm, setAddressForm] = useState({
    label: 'Home',
    name: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    city: 'Pune',
    state: 'Maharashtra',
    postalCode: '',
    isPrimary: false,
  });

  // Payment Form state
  const [paymentType, setPaymentType] = useState<'card' | 'upi'>('card');
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardName, setNewCardName] = useState('');
  const [newCardExpiry, setNewCardExpiry] = useState('');
  const [newUpiId, setNewUpiId] = useState('');

  // Password update form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  // GST Form state
  const [gstForm, setGstForm] = useState({
    enabled: gstBilling.enabled,
    companyName: gstBilling.companyName,
    gstin: gstBilling.gstin,
  });

  const name = user?.name || 'Driver';
  const email = user?.email || '';
  const phone = user?.phone || '';
  const avatarUrl = user?.avatarUrl;
  const tier = user?.tier && user.tier !== 'Apex Gold Member' ? user.tier : null;
  const points = user?.rewardPoints ?? 250;
  const initials = getInitials(name);

  const primaryAddress = addresses.find((a) => a.isPrimary) || addresses[0];
  const secondaryAddresses = addresses.filter((a) => a.id !== primaryAddress?.id);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (orderFilter === 'ACTIVE') {
        if (!ACTIVE_ORDER_STATUSES.includes(order.status)) {
          return false;
        }
      } else if (orderFilter === 'DELIVERED') {
        if (order.status !== 'DELIVERED') return false;
      }

      if (orderSearch.trim()) {
        const query = orderSearch.toLowerCase();
        const matchesOrder = order.orderNumber.toLowerCase().includes(query);
        const matchesItem = order.items.some((it) => it.name.toLowerCase().includes(query));
        const matchesCarrier = order.carrier.toLowerCase().includes(query);
        return matchesOrder || matchesItem || matchesCarrier;
      }

      return true;
    });
  }, [orders, orderFilter, orderSearch]);

  const activeOrdersCount = orders.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status)).length;

  const handleSignOut = async () => {
    await logout();
    router.push('/');
  };

  // Direct Profile Image Upload handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image size should be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        await updateUserProfile({ avatarUrl: reader.result });
        showToast('Profile photo updated successfully');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhoto = async () => {
    await updateUserProfile({ avatarUrl: '' });
    showToast('Profile picture reset to initials');
  };

  const openEditProfile = () => {
    setEditName(name);
    setEditPhone(phone);
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      showToast('Name is required');
      return;
    }
    await updateUserProfile({
      name: editName.trim(),
      phone: editPhone.trim(),
    });
    setIsProfileModalOpen(false);
  };

  // Copy tracking number with animated feedback
  const handleCopyTracking = (awb: string) => {
    navigator.clipboard.writeText(awb);
    setCopiedTracking(awb);
    showToast(`Copied tracking number: ${awb}`);
    setTimeout(() => {
      setCopiedTracking(null);
    }, 2000);
  };

  // Address Handlers
  const handleOpenAddAddress = () => {
    setEditingAddress(null);
    setAddressForm({
      label: 'Home',
      name: name || '',
      phone: phone || '',
      addressLine1: '',
      addressLine2: '',
      landmark: '',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '',
      isPrimary: addresses.length === 0,
    });
    setIsAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr: CustomerAddress) => {
    setEditingAddress(addr);
    setAddressForm({
      label: addr.label,
      name: addr.name,
      phone: addr.phone,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || '',
      landmark: addr.landmark || '',
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      isPrimary: addr.isPrimary,
    });
    setIsAddressModalOpen(true);
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.name.trim() || !addressForm.phone.trim() || !addressForm.addressLine1.trim() || !addressForm.postalCode.trim()) {
      showToast('Please fill all required address fields');
      return;
    }

    if (editingAddress) {
      updateAddress(editingAddress.id, {
        label: addressForm.label,
        name: addressForm.name.trim(),
        phone: addressForm.phone.trim(),
        addressLine1: addressForm.addressLine1.trim(),
        addressLine2: addressForm.addressLine2.trim() || undefined,
        landmark: addressForm.landmark.trim() || undefined,
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        postalCode: addressForm.postalCode.trim(),
        country: 'India',
        isPrimary: addressForm.isPrimary,
      });
    } else {
      addAddress({
        label: addressForm.label,
        name: addressForm.name.trim(),
        phone: addressForm.phone.trim(),
        addressLine1: addressForm.addressLine1.trim(),
        addressLine2: addressForm.addressLine2.trim() || undefined,
        landmark: addressForm.landmark.trim() || undefined,
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        postalCode: addressForm.postalCode.trim(),
        country: 'India',
        isPrimary: addressForm.isPrimary,
      });
    }

    setIsAddressModalOpen(false);
  };

  // Reorder
  const handleReorder = (order: CustomerOrderHistoryRecord) => {
    order.items.forEach((item) => {
      addToCart(item.productId, item.quantity);
    });
    showToast(`Items from #${order.orderNumber} added to cart`);
    openCart();
  };

  // Sync customer product reviews from localStorage across all purchased products
  const loadCustomerReviews = React.useCallback(() => {
    const map: Record<number, any> = {};
    if (orders && orders.length > 0) {
      orders.forEach((order) => {
        order.items?.forEach((it) => {
          try {
            const raw = localStorage.getItem(`cx_product_reviews_${it.productId}`);
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                const found = list.find((r: any) =>
                  (user?.name && r.name && r.name.toLowerCase() === user.name.toLowerCase()) ||
                  (r.id && String(r.id).startsWith('user-'))
                );
                if (found) {
                  map[it.productId] = found;
                }
              }
            }
          } catch {}
        });
      });
    }
    setCustomerReviews(map);
  }, [orders, user?.name]);

  React.useEffect(() => {
    loadCustomerReviews();
  }, [loadCustomerReviews]);

  // Open review modal for writing or editing
  const handleOpenReviewModal = (item: { productId: number; name: string; image?: string }, order: CustomerOrderHistoryRecord) => {
    const existing = customerReviews[item.productId];
    if (existing) {
      setReviewRating(existing.rating || 5);
      setReviewTitle(existing.title || '');
      setReviewComment(existing.comment || '');
    } else {
      setReviewRating(5);
      setReviewTitle('');
      setReviewComment('');
    }
    setHoverReviewRating(0);
    setReviewModalData({
      productId: item.productId,
      productName: item.name,
      productImage: item.image,
      orderNumber: order.orderNumber,
      existingReview: existing || null,
    });
  };

  // Submit or update a verified customer review
  const handleSubmitCustomerReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalData) return;
    if (!reviewTitle.trim() || !reviewComment.trim()) {
      showToast('Please provide a review headline and comment');
      return;
    }

    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const prodId = reviewModalData.productId;
    let reviewsList: any[] = [];
    try {
      const stored = localStorage.getItem(`cx_product_reviews_${prodId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) reviewsList = parsed;
      }
    } catch {}

    const reviewId = reviewModalData.existingReview?.id || `user-${Date.now()}`;
    const newRecord = {
      id: reviewId,
      name: user?.name || 'Verified Driver',
      rating: reviewRating,
      date: today,
      title: reviewTitle.trim(),
      comment: reviewComment.trim(),
      avatarUrl: user?.avatarUrl || '',
      isVerified: true,
      replies: reviewModalData.existingReview?.replies || [],
    };

    const existingIdx = reviewsList.findIndex((r: any) => r.id === reviewId);
    if (existingIdx >= 0) {
      reviewsList[existingIdx] = newRecord;
    } else {
      reviewsList = [newRecord, ...reviewsList];
    }

    try {
      localStorage.setItem(`cx_product_reviews_${prodId}`, JSON.stringify(reviewsList));
    } catch {}

    loadCustomerReviews();
    setReviewModalData(null);
    showToast(reviewModalData.existingReview ? 'Review updated successfully!' : 'Verified review published!');
  };

  // Delete an existing customer review
  const handleDeleteCustomerReview = (productId: number, productName: string) => {
    if (typeof window !== 'undefined' && !window.confirm(`Are you sure you want to delete your review for "${productName}"?`)) {
      return;
    }

    try {
      const stored = localStorage.getItem(`cx_product_reviews_${productId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((r: any) => {
            const isUserReview = (user?.name && r.name && r.name.toLowerCase() === user.name.toLowerCase()) ||
              (r.id && String(r.id).startsWith('user-'));
            return !isUserReview;
          });
          localStorage.setItem(`cx_product_reviews_${productId}`, JSON.stringify(filtered));
        }
      }
    } catch {}

    loadCustomerReviews();
    showToast(`Your review for "${productName}" has been deleted.`);
  };

  // Download official formatted tax invoice HTML/PDF document
  const handleDownloadInvoice = (order: CustomerOrderHistoryRecord) => {
    const invoiceHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice - ${order.orderNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #0e0e0f; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2231a; padding-bottom: 16px; margin-bottom: 24px; }
    .logo-text { font-size: 26px; font-weight: 900; letter-spacing: -0.02em; color: #0e0e0f; }
    .logo-accent { color: #e2231a; }
    .tagline { font-size: 11px; color: #5d5d64; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
    .inv-title { font-size: 20px; font-weight: 800; color: #0e0e0f; text-align: right; }
    .inv-meta { font-size: 12px; color: #5d5d64; text-align: right; margin-top: 4px; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; font-size: 13px; }
    .details-box { background: #f4f3ef; border: 1px solid #dcdbd5; border-radius: 8px; padding: 14px; }
    .details-box b { display: block; margin-bottom: 6px; font-size: 13.5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
    th { background: #0e0e0f; color: #ffffff; text-align: left; padding: 10px 12px; font-weight: 600; }
    th.right, td.right { text-align: right; }
    th.center, td.center { text-align: center; }
    td { padding: 10px 12px; border-bottom: 1px solid #dcdbd5; }
    .totals { width: 260px; margin-left: auto; font-size: 13px; }
    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals-row.grand { border-top: 2px solid #0e0e0f; font-weight: 800; font-size: 16px; color: #e2231a; margin-top: 6px; padding-top: 6px; }
    .footer { margin-top: 48px; border-top: 1px dashed #dcdbd5; padding-top: 16px; font-size: 11.5px; color: #8d8d93; text-align: center; }
    .print-btn { display: inline-block; padding: 10px 20px; background: #e2231a; color: #fff; font-weight: 700; border-radius: 6px; text-decoration: none; margin-bottom: 24px; cursor: pointer; border: none; font-size: 13px; }
    @media print { .print-btn { display: none; } body { margin: 0; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  <div class="header">
    <div>
      <div class="logo-text">CARXEN<span class="logo-accent">.</span></div>
      <div class="tagline">Engineered for Every Drive · Premium Automotive Accessories</div>
      <div style="font-size: 12px; color: #5d5d64; margin-top: 6px;">
        GSTIN: 27AABCC8920D1ZE<br>
        Baner Highway Link Road, Pune, Maharashtra 411045
      </div>
    </div>
    <div>
      <div class="inv-title">TAX INVOICE</div>
      <div class="inv-meta">
        <b>Invoice #:</b> INV-${order.orderNumber}<br>
        <b>Order Date:</b> ${new Date(order.placedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}<br>
        <b>Payment Status:</b> ${order.paymentStatus} (${order.paymentMethod})
      </div>
    </div>
  </div>

  <div class="details-grid">
    <div class="details-box">
      <b>Billed & Shipped To:</b>
      <div>${order.shippingAddress.name}</div>
      <div>${order.shippingAddress.addressLine1}${order.shippingAddress.addressLine2 ? ', ' + order.shippingAddress.addressLine2 : ''}</div>
      <div>${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.postalCode}</div>
      <div>Phone: ${order.shippingAddress.phone || user?.phone || 'On file'}</div>
    </div>
    <div class="details-box">
      <b>Dispatch & Tracking Details:</b>
      <div>Carrier: <b>${order.carrier}</b></div>
      <div>AWB / Tracking #: <b>${order.trackingNumber}</b></div>
      <div>Status: <b>${ORDER_STAGE_LABELS[order.status]}</b></div>
      <div>Estimated / Delivery: ${order.estimatedDelivery}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Product Description</th>
        <th class="center">Qty</th>
        <th class="right">Unit Price</th>
        <th class="right">Amount (INR)</th>
      </tr>
    </thead>
    <tbody>
      ${order.items.map((it) => `
        <tr>
          <td><b>${it.name}</b>${it.category ? ' <span style="font-size:11px;color:#8d8d93">[' + it.category + ']</span>' : ''}</td>
          <td class="center">${it.quantity}</td>
          <td class="right">${formatINR(it.unitPrice)}</td>
          <td class="right"><b>${formatINR(it.lineSubtotal)}</b></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span>Subtotal:</span><span>${formatINR(order.subtotal)}</span></div>
    ${order.discountAmount > 0 ? `<div class="totals-row" style="color:#16a34a"><span>Discount:</span><span>- ${formatINR(order.discountAmount)}</span></div>` : ''}
    <div class="totals-row"><span>Shipping & Handling:</span><span>FREE</span></div>
    <div class="totals-row grand"><span>Total Amount:</span><span>${formatINR(order.totalAmount)}</span></div>
  </div>

  <div class="footer">
    Thank you for choosing CARXEN. Backed by CARXEN 2-Year Comprehensive Warranty and 30-Day Hassle-Free Returns.<br>
    For support or inquiries, email care@carxen.io or call 1800-209-8899.
  </div>
</body>
</html>`;

    const blob = new Blob([invoiceHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice-${order.orderNumber}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Invoice for order #${order.orderNumber} downloaded!`);
  };

  // Payment Add
  const handleSavePaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentType === 'card') {
      const cleanDigits = newCardNumber.replace(/\D/g, '');
      if (cleanDigits.length < 15) {
        showToast('Please enter a valid card number');
        return;
      }
      addSavedPayment({
        type: 'card',
        title: `${newCardName.trim() || 'Credit'} Card`,
        last4OrVpa: cleanDigits.slice(-4),
        expiry: newCardExpiry.trim() || '12/28',
        brand: cleanDigits.startsWith('4') ? 'Visa' : 'Mastercard',
        isDefault: savedPayments.length === 0,
      });
    } else {
      if (!newUpiId.includes('@')) {
        showToast('Please enter a valid UPI VPA (e.g. name@bank)');
        return;
      }
      addSavedPayment({
        type: 'upi',
        title: 'UPI Payment',
        last4OrVpa: newUpiId.trim(),
        brand: 'UPI',
        isDefault: savedPayments.length === 0,
      });
    }
    setNewCardNumber('');
    setNewCardName('');
    setNewCardExpiry('');
    setNewUpiId('');
    setIsPaymentModalOpen(false);
  };

  // Garage Vehicle Handlers
  const handleOpenAddVehicle = () => {
    setEditingVehicle(null);
    setIsCustomBrand(false);
    setVehicleForm({
      b: 'Porsche',
      m: '',
      y: '2024',
      f: 'Petrol',
      isDefault: false,
    });
    setIsVehicleModalOpen(true);
  };

  const handleOpenEditVehicle = (veh: GarageVehicle, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingVehicle(veh);
    const standardBrands = [
      'Porsche',
      'BMW',
      'Mercedes-Benz',
      'Audi',
      'Toyota',
      'Maruti Suzuki',
      'Hyundai',
      'Tata',
      'Mahindra',
      'Kia',
      'Honda',
      'Ford',
      'Ferrari',
      'Lamborghini',
      'Volkswagen',
    ];
    setIsCustomBrand(!standardBrands.includes(veh.b));
    setVehicleForm({
      b: veh.b,
      m: veh.m,
      y: veh.y,
      f: veh.f || 'Petrol',
      isDefault: Boolean(car && car.m === veh.m && car.y === veh.y),
    });
    setIsVehicleModalOpen(true);
  };

  const handleDeleteVehicle = async (id: string, name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (garageVehicles.length <= 1) {
      showToast('You must keep at least 1 vehicle in your garage.');
      return;
    }
    if (window.confirm(`Are you sure you want to remove "${name}" from your garage?`)) {
      await deleteGarageVehicle(id);
    }
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const brand = vehicleForm.b.trim();
    const model = vehicleForm.m.trim();
    const year = vehicleForm.y.trim();
    const fuel = vehicleForm.f.trim() || 'Petrol';

    if (!brand || !model || !year) {
      showToast('Please fill in Brand, Model, and Year.');
      return;
    }

    if (editingVehicle) {
      await updateGarageVehicle({
        id: editingVehicle.id,
        b: brand,
        m: model,
        y: year,
        f: fuel,
        isDefault: vehicleForm.isDefault,
      });
    } else {
      await addGarageVehicle({
        b: brand,
        m: model,
        y: year,
        f: fuel,
        isDefault: vehicleForm.isDefault,
      });
    }
    setIsVehicleModalOpen(false);
  };

  // Password update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match');
      return;
    }

    setIsPasswordSubmitting(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        const sessionRes = await supabase.auth.getSession();
        const token = sessionRes.data?.session?.access_token;
        const res = await fetch('/api/storefront/customer/password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ newPassword }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || error.message);
        }
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to update password');
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  // GST save
  const handleSaveGst = (e: React.FormEvent) => {
    e.preventDefault();
    updateGstBilling(gstForm);
  };

  return (
    <div className="in-shop" style={{ minHeight: '100vh', background: 'var(--bg, #f4f3ef)' }}>
      {/* Hidden File Input for Native Photo Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoUpload}
        accept="image/*"
        style={{ display: 'none' }}
      />

      <section className="pp on" id="v-pg">
        <div className="ac-portal-wrap">
          <div style={{ marginBottom: '20px' }}>
            <Link href="/shop" className="cx-back-btn" aria-label="Back to shop">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Back to shop</span>
            </Link>
          </div>

          {authLoading ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <p style={{ color: '#71717a', fontSize: '15px' }}>Loading driver profile...</p>
            </div>
          ) : !user ? (
            /* Unauthenticated State */
            <div
              style={{
                maxWidth: '480px',
                margin: '50px auto',
                background: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: '16px',
                padding: '36px 30px',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: '#fef2f2',
                  color: '#e2231a',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '22px',
                  margin: '0 auto 16px',
                  border: '1px solid #fecaca',
                }}
              >
                <Lock size={22} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '8px', color: '#09090b' }}>
                Account Access
              </h2>
              <p style={{ color: '#71717a', fontSize: '13.5px', lineHeight: '1.5', marginBottom: '24px' }}>
                Sign in to view your order tracking history, customize your profile photo, and manage your delivery addresses.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Link
                  className="ac-btn-dark"
                  href="/login?redirect=/account"
                  style={{ height: '42px', fontSize: '14px' }}
                >
                  Sign in with Email
                </Link>
                <button
                  type="button"
                  className="ac-btn-outline"
                  onClick={() => login('Aarav Sharma')}
                  style={{ height: '42px', fontSize: '14px' }}
                >
                  Instant Demo Sign-in (Aarav Sharma)
                </button>
                <Link
                  className="ac-btn-outline"
                  href="/shop"
                  style={{ height: '42px', fontSize: '14px' }}
                >
                  Browse catalog
                </Link>
              </div>
            </div>
          ) : (
            /* Authenticated Customer Profile */
            <>
              {/* Profile Overview Card (Clean, subtle with tasteful motorsport red accents) */}
              <div className="ac-profile-card">
                <div className="ac-profile-header">
                  <div className="ac-user-cluster">
                    {/* Avatar Ring with subtle CARXEN Red Accent */}
                    <div
                      className="ac-avatar-ring"
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload profile photo"
                    >
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt={name} className="ac-avatar-photo" />
                      ) : (
                        <div className="ac-avatar-initials">{initials}</div>
                      )}
                      <div className="ac-avatar-upload-btn" title="Upload new photo">
                        <Camera size={13} />
                      </div>
                    </div>

                    <div>
                      <div className="ac-user-heading">
                        <span className="ac-user-name">{name}</span>
                        {isVerifiedBuyer && (
                          <VerifiedBadge
                            size={20}
                            tooltipText="Verified User · Purchased 3+ products from CARXEN"
                          />
                        )}
                        {tier && (
                          <span className="ac-member-pill">
                            <Sparkles size={12} color="#e2231a" />
                            {tier}
                          </span>
                        )}
                        {isVerifiedBuyer ? (
                          <span className="ac-verified-buyer-tag">
                            Verified Buyer ({totalProductsBought} products)
                          </span>
                        ) : (
                          <span
                            className="ac-buyer-progress-tag"
                            title={`${Math.max(0, 3 - totalProductsBought)} more item(s) needed to unlock Verified User badge`}
                          >
                            {totalProductsBought}/3 to Verified
                          </span>
                        )}
                      </div>
                      <div className="ac-user-subtext">
                        <span>
                          <Mail size={13} style={{ color: '#71717a' }} />
                          {email}
                        </span>
                        <span>•</span>
                        <span>
                          <Phone size={13} style={{ color: '#71717a' }} />
                          {phone ? (
                            <>
                              {phone}{' '}
                              <button
                                type="button"
                                onClick={openEditProfile}
                                style={{
                                  color: '#e2231a',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  marginLeft: '2px',
                                  textDecoration: 'underline',
                                }}
                              >
                                Edit
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={openEditProfile}
                              style={{
                                color: '#e2231a',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textDecoration: 'underline',
                              }}
                            >
                              Add Phone Number
                            </button>
                          )}
                        </span>
                      </div>

                      {/* Photo upload action triggers */}
                      <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            fontSize: '12px',
                            color: '#09090b',
                            cursor: 'pointer',
                            fontWeight: 500,
                            padding: '3px 9px',
                            borderRadius: '5px',
                            background: '#f4f4f5',
                            border: '1px solid #e4e4e7',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Camera size={12} color="#e2231a" />
                          Upload Photo
                        </button>
                        {avatarUrl && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            style={{
                              fontSize: '12px',
                              color: '#dc2626',
                              cursor: 'pointer',
                              fontWeight: 500,
                              background: 'transparent',
                            }}
                          >
                            Reset to initials
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="ac-btn-outline"
                      onClick={openEditProfile}
                      style={{ height: '36px', fontSize: '13px' }}
                    >
                      <Pencil size={13} />
                      Edit Profile
                    </button>
                    <button
                      type="button"
                      className="ac-btn-outline"
                      onClick={handleSignOut}
                      style={{ height: '36px', fontSize: '13px', color: '#dc2626' }}
                    >
                      Sign out
                    </button>
                  </div>
                </div>

                {/* Subtle Stats Row */}
                <div className="ac-stats-row">
                  <div
                    className="ac-stat-box"
                    onClick={() => { setActiveTab('orders'); setOrderFilter('ALL'); }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="ac-stat-number" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      {orders.length}
                      {isVerifiedBuyer && (
                        <VerifiedBadge size={16} tooltipText="Verified User · Purchased 3+ products" />
                      )}
                    </div>
                    <div className="ac-stat-tag">
                      <Package size={12} />
                      {isVerifiedBuyer ? `${totalProductsBought} Items (Verified)` : `${orders.length} Orders (${totalProductsBought} Items)`}
                    </div>
                  </div>

                  <div
                    className="ac-stat-box"
                    onClick={() => { setActiveTab('orders'); setOrderFilter('ACTIVE'); }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="ac-stat-number" style={{ color: '#e2231a' }}>{activeOrdersCount}</div>
                    <div className="ac-stat-tag">
                      <Truck size={12} color="#e2231a" />
                      Active Shipments
                    </div>
                  </div>

                  <div
                    className="ac-stat-box"
                    onClick={() => setActiveTab('addresses')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="ac-stat-number">{addresses.length}</div>
                    <div className="ac-stat-tag">
                      <MapPin size={12} />
                      Saved Addresses
                    </div>
                  </div>

                  <div
                    className="ac-stat-box"
                    onClick={() => setActiveTab('garage')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div
                      className="ac-stat-number"
                      style={{ fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                      {car ? `${car.b} ${car.m}` : 'Porsche 911 GT3'}
                    </div>
                    <div className="ac-stat-tag">
                      <CarFront size={12} />
                      Active Garage Car
                    </div>
                  </div>
                </div>
              </div>

              {/* Segmented Tabs Navigation (Shadcn aesthetic) */}
              <div className="ac-tab-track">
                <button
                  type="button"
                  className={`ac-tab-item ${activeTab === 'orders' ? 'active' : ''}`}
                  onClick={() => setActiveTab('orders')}
                >
                  <Package size={15} />
                  Orders
                  <span className="ac-tab-badge">{orders.length}</span>
                </button>
                <button
                  type="button"
                  className={`ac-tab-item ${activeTab === 'addresses' ? 'active' : ''}`}
                  onClick={() => setActiveTab('addresses')}
                >
                  <MapPin size={15} />
                  Addresses
                  <span className="ac-tab-badge">{addresses.length}</span>
                </button>
                <button
                  type="button"
                  className={`ac-tab-item ${activeTab === 'garage' ? 'active' : ''}`}
                  onClick={() => setActiveTab('garage')}
                >
                  <CarFront size={15} />
                  My Garage
                </button>
                <button
                  type="button"
                  className={`ac-tab-item ${activeTab === 'payments' ? 'active' : ''}`}
                  onClick={() => setActiveTab('payments')}
                >
                  <CreditCard size={15} />
                  Payment & Billing
                </button>
                <button
                  type="button"
                  className={`ac-tab-item ${activeTab === 'security' ? 'active' : ''}`}
                  onClick={() => setActiveTab('security')}
                >
                  <Settings2 size={15} />
                  Settings
                </button>
              </div>

              {/* ========================================================= */}
              {/* TAB 1: ORDERS & TRACKING                                  */}
              {/* ========================================================= */}
              {activeTab === 'orders' && (
                <div>
                  {/* Toolbar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                      marginBottom: '18px',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setOrderFilter('ALL')}
                        className={`ac-btn-outline ${orderFilter === 'ALL' ? 'ac-btn-dark' : ''}`}
                        style={{ height: '34px', fontSize: '12.5px', padding: '0 12px' }}
                      >
                        All ({orders.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderFilter('ACTIVE')}
                        className={`ac-btn-outline ${orderFilter === 'ACTIVE' ? 'ac-btn-dark' : ''}`}
                        style={{ height: '34px', fontSize: '12.5px', padding: '0 12px' }}
                      >
                        In Transit ({activeOrdersCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderFilter('DELIVERED')}
                        className={`ac-btn-outline ac-delivered-filter-chip ${orderFilter === 'DELIVERED' ? 'active' : ''}`}
                        style={{ height: '34px', fontSize: '12.5px', padding: '0 12px' }}
                      >
                        <Check size={14} />
                        <span>Delivered ({orders.filter((o) => o.status === 'DELIVERED').length})</span>
                        <span className="ac-delivered-badge-pill">Verified</span>
                      </button>
                    </div>

                    <div style={{ minWidth: '240px' }}>
                      <input
                        type="search"
                        placeholder="Search orders or parts…"
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        style={{
                          width: '100%',
                          height: '36px',
                          padding: '0 12px',
                          borderRadius: '8px',
                          border: '1px solid #d4d4d8',
                          fontSize: '13px',
                          background: '#fff',
                        }}
                      />
                    </div>
                  </div>

                  {/* Highlighted Delivered Spotlight Banner */}
                  {orders.some((o) => o.status === 'DELIVERED') && (
                    <div className="ac-delivered-spotlight-bar">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="ac-delivered-icon-badge">
                          <Check size={16} color="#ffffff" strokeWidth={3} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#14532d' }}>
                            Delivered Purchases & Reviews Center ({orders.filter((o) => o.status === 'DELIVERED').length})
                          </div>
                          <div style={{ fontSize: '12px', color: '#166534' }}>
                            These items have arrived safely. You can review your products, manage ratings, see full specifications, and download tax invoices.
                          </div>
                        </div>
                      </div>
                      {orderFilter !== 'DELIVERED' && (
                        <button
                          type="button"
                          onClick={() => setOrderFilter('DELIVERED')}
                          className="ac-btn-outline"
                          style={{ height: '30px', fontSize: '12px', padding: '0 10px', background: '#ffffff', borderColor: '#86efac', color: '#15803d' }}
                        >
                          View Delivered Orders Only
                        </button>
                      )}
                    </div>
                  )}

                  {filteredOrders.length === 0 ? (
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e4e4e7',
                        borderRadius: '12px',
                        padding: '40px 20px',
                        textAlign: 'center',
                      }}
                    >
                      <Package size={32} style={{ color: '#a1a1aa', margin: '0 auto 10px' }} />
                      <p style={{ color: '#09090b', fontWeight: 600, fontSize: '15px', marginBottom: '6px' }}>
                        No orders found
                      </p>
                      <p style={{ color: '#71717a', fontSize: '13px', marginBottom: '16px' }}>
                        {orderSearch ? 'Try adjusting your search terms.' : 'Orders you place will appear here.'}
                      </p>
                      <Link className="ac-btn-dark" href="/shop" style={{ height: '38px', fontSize: '13px' }}>
                        Browse Catalog
                      </Link>
                    </div>
                  ) : (
                    filteredOrders.map((order) => {
                      const isDelivered = order.status === 'DELIVERED';
                      const isOutForDelivery = order.status === 'OUT_FOR_DELIVERY';
                      const isShipped = order.status === 'SHIPPED';
                      const stepIndex = orderStageStep(order.status);

                      return (
                        <div key={order.id} className={`ac-order-tile ${isDelivered ? 'is-delivered' : ''}`}>
                          {/* Order Top Bar */}
                          <div className="ac-order-top-bar">
                            <div>
                              {isDelivered && (
                                <div style={{ marginBottom: '6px' }}>
                                  <span className="ac-delivered-ribbon">
                                    <Check size={12} strokeWidth={3} />
                                    <span>Delivered · Verified for Reviews</span>
                                  </span>
                                </div>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="ac-order-num">#{order.orderNumber}</span>
                                <span style={{ color: '#a1a1aa', fontSize: '12px' }}>•</span>
                                <span style={{ color: '#71717a', fontSize: '12.5px' }}>
                                  {new Date(order.placedAt).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                              <div style={{ color: '#71717a', fontSize: '12px', marginTop: '2px' }}>
                                Destination: {order.shippingAddress.addressLine1}, {order.shippingAddress.city}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span className={`ac-status-pill ${order.status.toLowerCase()}`}>
                                {(isOutForDelivery || isShipped) && <span className="ac-pulse-dot" />}
                                {ORDER_STAGE_LABELS[order.status]}
                              </span>
                              <span style={{ fontSize: '15px', fontWeight: 700, color: '#09090b' }}>
                                {formatINR(order.totalAmount)}
                              </span>
                            </div>
                          </div>

                          {/* Subtle Tracker Progress with red indicator */}
                          <div className="ac-tracker-line">
                            {ORDER_STAGE_FLOW.map((stage, idx) => (
                              <div key={stage} className={`ac-tracker-node ${stepIndex >= idx + 1 ? 'filled' : ''}`}>
                                <div className="ac-node-bar" />
                                <span className="ac-node-lbl">
                                  {idx + 1}. {ORDER_STAGE_LABELS[stage]}
                                </span>
                              </div>
                            ))}
                          </div>
                          {order.status === 'CANCELLED' && (
                            <div style={{ marginTop: '6px', fontSize: '12px', color: '#71717a' }}>
                              This order was cancelled and is no longer being fulfilled.
                            </div>
                          )}

                          {/* Courier Mini Strip with Copy button */}
                          <div className="ac-courier-mini">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <Truck size={14} color="#e2231a" />
                              <span style={{ fontWeight: 600, color: '#09090b' }}>{order.carrier}</span> · AWB:{' '}
                              <span style={{ fontFamily: 'var(--mono, monospace)', fontWeight: 600 }}>{order.trackingNumber}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyTracking(order.trackingNumber)}
                                title="Copy tracking number"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  color: copiedTracking === order.trackingNumber ? '#16a34a' : '#71717a',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                              >
                                {copiedTracking === order.trackingNumber ? <Check size={13} /> : <Copy size={13} />}
                              </button>
                              <span style={{ color: '#71717a', marginLeft: '4px' }}>({order.estimatedDelivery})</span>
                            </div>
                            <button
                              type="button"
                              className="ac-btn-outline"
                              onClick={() => setTrackingModalOrder(order)}
                              style={{ height: '28px', padding: '0 10px', fontSize: '12px' }}
                            >
                              Live Status
                            </button>
                          </div>

                          {/* Items List with See Product & Review Actions */}
                          <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: '10px' }}>
                            {order.items.map((it, idx) => {
                              const existingRev = customerReviews[it.productId];
                              return (
                                <div
                                  key={idx}
                                  style={{
                                    padding: '10px 0',
                                    borderBottom: idx < order.items.length - 1 ? '1px solid #f4f4f5' : 'none',
                                  }}
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '12px',
                                    }}
                                  >
                                    <Link
                                      href={`/product/${it.productId}`}
                                      style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}
                                      title="Click to see product details"
                                    >
                                      <div
                                        style={{
                                          width: '42px',
                                          height: '42px',
                                          borderRadius: '8px',
                                          background: '#f4f4f5',
                                          overflow: 'hidden',
                                          flexShrink: 0,
                                          display: 'grid',
                                          placeItems: 'center',
                                          border: '1px solid #e4e4e7',
                                        }}
                                      >
                                        {it.image ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={it.image} alt={it.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                          <CarFront size={20} style={{ color: '#71717a' }} />
                                        )}
                                      </div>
                                      <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#09090b', lineHeight: '1.3' }}>
                                          {it.name}
                                        </div>
                                        <div style={{ fontSize: '11.5px', color: '#71717a', marginTop: '2px' }}>
                                          Qty: {it.quantity} · {formatINR(it.unitPrice)}
                                        </div>
                                      </div>
                                    </Link>
                                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#09090b', whiteSpace: 'nowrap' }}>
                                      {formatINR(it.lineSubtotal)}
                                    </div>
                                  </div>

                                  {/* Item Actions Row: See Product + Write/Edit/Delete Review */}
                                  <div className="ac-item-actions-row">
                                    <Link
                                      href={`/product/${it.productId}`}
                                      className="ac-btn-outline"
                                      style={{ height: '28px', fontSize: '11.5px', padding: '0 10px', textDecoration: 'none' }}
                                    >
                                      <ExternalLink size={12} />
                                      <span>See Product</span>
                                    </Link>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                      {existingRev ? (
                                        <>
                                          <span className="ac-review-status-pill" title={existingRev.title}>
                                            <Star size={11} fill="#16a34a" color="#16a34a" />
                                            <span>{existingRev.rating}/5 Rated</span>
                                          </span>
                                          <button
                                            type="button"
                                            className="ac-btn-outline"
                                            onClick={() => handleOpenReviewModal(it, order)}
                                            style={{ height: '28px', fontSize: '11.5px', padding: '0 8px' }}
                                            title="Edit your review"
                                          >
                                            <Pencil size={11} />
                                            <span>Edit Review</span>
                                          </button>
                                          <button
                                            type="button"
                                            className="ac-btn-danger"
                                            onClick={() => handleDeleteCustomerReview(it.productId, it.name)}
                                            style={{ height: '28px', fontSize: '11.5px', padding: '0 8px' }}
                                            title="Delete your review"
                                          >
                                            <Trash2 size={11} />
                                            <span>Delete</span>
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          type="button"
                                          className="ac-btn-outline"
                                          onClick={() => handleOpenReviewModal(it, order)}
                                          style={{
                                            height: '28px',
                                            fontSize: '11.5px',
                                            padding: '0 10px',
                                            borderColor: '#86efac',
                                            color: '#15803d',
                                            background: '#f0fdf4',
                                            fontWeight: 600,
                                          }}
                                        >
                                          <Star size={12} color="#16a34a" fill="#16a34a" />
                                          <span>Write a Review</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Card Footer Actions (Download Invoice, View Invoice, Re-order) */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: '8px',
                              marginTop: '14px',
                              paddingTop: '12px',
                              borderTop: '1px solid #f4f4f5',
                              flexWrap: 'wrap',
                            }}
                          >
                            <button
                              type="button"
                              className="ac-btn-outline"
                              onClick={() => handleDownloadInvoice(order)}
                              style={{ height: '32px', fontSize: '12.5px', padding: '0 12px' }}
                            >
                              <Download size={13} />
                              Download Invoice
                            </button>
                            <button
                              type="button"
                              className="ac-btn-outline"
                              onClick={() => setInvoiceModalOrder(order)}
                              style={{ height: '32px', fontSize: '12.5px', padding: '0 12px' }}
                            >
                              <FileText size={13} />
                              View Invoice
                            </button>
                            <button
                              type="button"
                              className="ac-btn-red"
                              onClick={() => handleReorder(order)}
                              style={{ height: '32px', fontSize: '12.5px', padding: '0 14px' }}
                            >
                              <RotateCcw size={13} />
                              Re-order
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 2: ADDRESSES                                          */}
              {/* ========================================================= */}
              {activeTab === 'addresses' && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '18px',
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#09090b' }}>
                        Delivery Addresses
                      </h3>
                      <p style={{ color: '#71717a', fontSize: '13px' }}>
                        Manage primary delivery location and secondary workshop drop points.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="ac-btn-red"
                      onClick={handleOpenAddAddress}
                      style={{ height: '36px', fontSize: '13px' }}
                    >
                      <Plus size={14} />
                      Add Address
                    </button>
                  </div>

                  {/* Primary Address */}
                  {primaryAddress ? (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#e2231a', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} />
                        Primary Delivery Address
                      </div>
                      <div className="ac-address-box is-default">
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, background: '#fef2f2', color: '#b91a12', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: '4px' }}>
                              ★ {primaryAddress.label} · Default
                            </span>
                            <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Check size={12} /> Auto-selected
                            </span>
                          </div>
                          <div style={{ fontSize: '15px', fontWeight: 600, color: '#09090b', marginBottom: '2px' }}>
                            {primaryAddress.name}
                          </div>
                          <div style={{ fontSize: '12.5px', color: '#71717a', marginBottom: '6px' }}>
                            📞 {primaryAddress.phone}
                          </div>
                          <p style={{ fontSize: '13px', color: '#3f3f46', lineHeight: '1.45' }}>
                            {primaryAddress.addressLine1}
                            {primaryAddress.addressLine2 ? `, ${primaryAddress.addressLine2}` : ''}
                            {primaryAddress.landmark ? ` (${primaryAddress.landmark})` : ''}
                            <br />
                            {primaryAddress.city}, {primaryAddress.state} — {primaryAddress.postalCode}
                          </p>
                        </div>

                        <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f4f4f5' }}>
                          <button
                            type="button"
                            className="ac-btn-outline"
                            onClick={() => handleOpenEditAddress(primaryAddress)}
                            style={{ height: '30px', fontSize: '12px', padding: '0 10px' }}
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: '#fff',
                        border: '1px dashed #d4d4d8',
                        borderRadius: '12px',
                        padding: '32px 20px',
                        textAlign: 'center',
                        marginBottom: '24px',
                      }}
                    >
                      <MapPin size={32} style={{ color: '#a1a1aa', margin: '0 auto 10px' }} />
                      <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#09090b', marginBottom: '4px' }}>
                        No Delivery Addresses Saved
                      </h4>
                      <p style={{ fontSize: '13px', color: '#71717a', marginBottom: '16px', maxWidth: '420px', margin: '0 auto 16px' }}>
                        Add your primary delivery location to ensure precision shipping on all your automotive orders.
                      </p>
                      <button
                        type="button"
                        className="ac-btn-red"
                        onClick={handleOpenAddAddress}
                        style={{ height: '36px', fontSize: '13px', margin: '0 auto' }}
                      >
                        <Plus size={14} /> Add Primary Address
                      </button>
                    </div>
                  )}

                  {/* Secondary Addresses */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Secondary Addresses ({secondaryAddresses.length})
                    </div>

                    {secondaryAddresses.length === 0 ? (
                      <div
                        style={{
                          background: '#fff',
                          border: '1px dashed #d4d4d8',
                          borderRadius: '12px',
                          padding: '28px',
                          textAlign: 'center',
                        }}
                      >
                        <MapPin size={28} style={{ color: '#a1a1aa', margin: '0 auto 8px' }} />
                        <p style={{ fontSize: '13px', color: '#71717a', marginBottom: '12px' }}>
                          No secondary addresses added yet. Add your tuning workshop or office address.
                        </p>
                        <button
                          type="button"
                          className="ac-btn-outline"
                          onClick={handleOpenAddAddress}
                          style={{ height: '34px', fontSize: '13px' }}
                        >
                          <Plus size={13} />
                          Add Secondary Address
                        </button>
                      </div>
                    ) : (
                      <div className="ac-address-grid">
                        {secondaryAddresses.map((addr) => (
                          <div key={addr.id} className="ac-address-box">
                            <div>
                              <div style={{ marginBottom: '6px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, background: '#f4f4f5', color: '#52525b', padding: '2px 8px', borderRadius: '4px' }}>
                                  {addr.label}
                                </span>
                              </div>
                              <div style={{ fontSize: '14.5px', fontWeight: 600, color: '#09090b' }}>
                                {addr.name}
                              </div>
                              <div style={{ fontSize: '12px', color: '#71717a', marginBottom: '6px' }}>
                                📞 {addr.phone}
                              </div>
                              <p style={{ fontSize: '13px', color: '#3f3f46', lineHeight: '1.45' }}>
                                {addr.addressLine1}
                                {addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
                                {addr.landmark ? ` (${addr.landmark})` : ''}
                                <br />
                                {addr.city}, {addr.state} — {addr.postalCode}
                              </p>
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginTop: '14px',
                                paddingTop: '10px',
                                borderTop: '1px solid #f4f4f5',
                                flexWrap: 'wrap',
                              }}
                            >
                              <button
                                type="button"
                                className="ac-btn-subtle-red"
                                onClick={() => setPrimaryAddress(addr.id)}
                              >
                                <Check size={12} />
                                Set as Default
                              </button>
                              <button
                                type="button"
                                className="ac-btn-outline"
                                onClick={() => handleOpenEditAddress(addr)}
                                style={{ height: '28px', fontSize: '12px', padding: '0 8px' }}
                              >
                                <Pencil size={12} />
                                Edit
                              </button>
                              <button
                                type="button"
                                className="ac-btn-danger"
                                onClick={() => deleteAddress(addr.id)}
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 3: GARAGE & FITMENT                                   */}
              {/* ========================================================= */}
              {activeTab === 'garage' && (
                <div style={{ maxWidth: '820px' }}>
                  {/* Active Vehicle & Fitment Guarantee */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e4e4e7',
                      borderRadius: '14px',
                      padding: '22px',
                      marginBottom: '20px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ShieldCheck size={13} color="#16a34a" />
                          ACTIVE VEHICLE &amp; FITMENT GUARANTEE
                        </div>
                        <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#09090b', margin: '4px 0 2px' }}>
                          {car ? `${car.y} ${car.b} ${car.m}` : '2023 Porsche 911 GT3 (992)'}
                        </h3>
                        <div style={{ fontSize: '13px', color: '#71717a' }}>
                          Trim / Engine: {car?.f || 'Petrol'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="ac-btn-red"
                          onClick={handleOpenAddVehicle}
                          style={{ height: '36px', fontSize: '13px' }}
                        >
                          <Plus size={14} />
                          Add New Vehicle
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* My Garage Vehicles Grid */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e4e4e7',
                      borderRadius: '14px',
                      padding: '20px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#09090b' }}>
                          Quick Switch Vehicle ({garageVehicles.length})
                        </div>
                        <div style={{ fontSize: '12px', color: '#71717a' }}>
                          Click any vehicle to switch or edit its details. All changes are saved to your customer profile.
                        </div>
                      </div>
                    </div>

                    <div className="ac-garage-grid">
                      {garageVehicles.map((veh) => {
                        const isActive =
                          Boolean(car && car.m === veh.m && car.y === veh.y) ||
                          (!car && veh.isDefault);

                        return (
                          <div
                            key={veh.id}
                            className={`ac-vehicle-card ${isActive ? 'is-active' : ''}`}
                            onClick={() => setVehicle({ b: veh.b, m: veh.m, y: veh.y, f: veh.f })}
                            title="Click to set as active vehicle"
                          >
                            <div>
                              <div className="ac-vehicle-card-header">
                                <span className="ac-vehicle-card-title">
                                  {veh.b} {veh.m}
                                </span>
                                {isActive && (
                                  <span className="ac-vehicle-active-tag">
                                    <Check size={11} /> Active
                                  </span>
                                )}
                              </div>
                              <div className="ac-vehicle-card-sub">
                                {veh.y} · {veh.f || 'Petrol'}
                              </div>
                            </div>

                            <div className="ac-vehicle-actions" onClick={(e) => e.stopPropagation()}>
                              {!isActive ? (
                                <button
                                  type="button"
                                  className="ac-btn-subtle-red"
                                  onClick={() => setVehicle({ b: veh.b, m: veh.m, y: veh.y, f: veh.f })}
                                  style={{ height: '26px', fontSize: '11.5px', padding: '0 8px' }}
                                >
                                  Select
                                </button>
                              ) : (
                                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <Check size={12} /> In Use
                                </span>
                              )}

                              <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                                <button
                                  type="button"
                                  className="ac-btn-outline"
                                  onClick={(e) => handleOpenEditVehicle(veh, e)}
                                  title="Edit Vehicle"
                                  style={{ height: '26px', width: '28px', padding: 0, display: 'grid', placeItems: 'center' }}
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  type="button"
                                  className="ac-btn-danger"
                                  onClick={(e) => handleDeleteVehicle(veh.id, `${veh.y} ${veh.b} ${veh.m}`, e)}
                                  title="Delete Vehicle"
                                  style={{ height: '26px', width: '28px', padding: 0, display: 'grid', placeItems: 'center' }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* 4th Box / Add New Vehicle Box (Always present alongside saved vehicles) */}
                      <button
                        type="button"
                        className="ac-add-vehicle-card"
                        onClick={handleOpenAddVehicle}
                        title="Add a new vehicle to your garage"
                      >
                        <div className="ac-add-vehicle-icon">
                          <Plus size={18} />
                        </div>
                        <b style={{ fontSize: '13px', color: '#09090b', display: 'block', marginBottom: '2px' }}>
                          Add New Vehicle
                        </b>
                        <small style={{ color: '#71717a', fontSize: '11px' }}>
                          Register another car
                        </small>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 4: PAYMENT & BILLING                                  */}
              {/* ========================================================= */}
              {activeTab === 'payments' && (
                <div style={{ maxWidth: '680px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#09090b' }}>
                        Saved Payment Methods
                      </h3>
                      <p style={{ color: '#71717a', fontSize: '13px' }}>
                        Quick checkout methods saved to your account.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="ac-btn-dark"
                      onClick={() => setIsPaymentModalOpen(true)}
                      style={{ height: '36px', fontSize: '13px' }}
                    >
                      <Plus size={14} />
                      Add Method
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                    {savedPayments.map((pm) => (
                      <div
                        key={pm.id}
                        style={{
                          background: '#fff',
                          border: pm.isDefault ? '1.5px solid #18181b' : '1px solid #e4e4e7',
                          borderRadius: '12px',
                          padding: '16px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase' }}>
                            {pm.type === 'upi' ? 'UPI' : pm.brand || 'Card'}
                          </span>
                          {pm.isDefault && (
                            <span style={{ fontSize: '11px', fontWeight: 600, background: '#fef2f2', color: '#b91a12', border: '1px solid #fecaca', padding: '2px 6px', borderRadius: '4px' }}>
                              Default
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#09090b' }}>
                          {pm.type === 'card' ? `•••• •••• •••• ${pm.last4OrVpa}` : pm.last4OrVpa}
                        </div>
                        {pm.expiry && (
                          <div style={{ fontSize: '12px', color: '#71717a', marginTop: '2px' }}>
                            Expires {pm.expiry}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f4f4f5' }}>
                          {!pm.isDefault && (
                            <button
                              type="button"
                              className="ac-btn-outline"
                              onClick={() => setDefaultPayment(pm.id)}
                              style={{ height: '28px', fontSize: '12px', padding: '0 8px' }}
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            type="button"
                            className="ac-btn-danger"
                            onClick={() => deleteSavedPayment(pm.id)}
                          >
                            <Trash2 size={12} />
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* GST Billing */}
                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid #e4e4e7',
                      borderRadius: '14px',
                      padding: '20px',
                    }}
                  >
                    <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px', color: '#09090b' }}>
                      Business GST Details
                    </h3>
                    <p style={{ color: '#71717a', fontSize: '13px', marginBottom: '14px' }}>
                      Enable to automatically include your company name and GSTIN on orders.
                    </p>

                    <form onSubmit={handleSaveGst}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={gstForm.enabled}
                          onChange={(e) => setGstForm({ ...gstForm, enabled: e.target.checked })}
                          style={{ width: '16px', height: '16px', accentColor: '#e2231a' }}
                        />
                        <span style={{ fontSize: '13.5px', fontWeight: 500 }}>
                          I require GST tax invoices for my business
                        </span>
                      </label>

                      {gstForm.enabled && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                          <div className="ac-field" style={{ margin: 0 }}>
                            <label>Company Name</label>
                            <input
                              type="text"
                              value={gstForm.companyName}
                              onChange={(e) => setGstForm({ ...gstForm, companyName: e.target.value })}
                              placeholder="e.g. Apex Motoring Pvt Ltd"
                              required
                            />
                          </div>
                          <div className="ac-field" style={{ margin: 0 }}>
                            <label>15-Digit GSTIN</label>
                            <input
                              type="text"
                              value={gstForm.gstin}
                              onChange={(e) => setGstForm({ ...gstForm, gstin: e.target.value.toUpperCase() })}
                              placeholder="e.g. 27AAAAA0000A1Z5"
                              maxLength={15}
                              required
                            />
                          </div>
                        </div>
                      )}

                      <button type="submit" className="ac-btn-dark" style={{ height: '36px', fontSize: '13px' }}>
                        Save GST Information
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 5: SETTINGS & SECURITY                                */}
              {/* ========================================================= */}
              {activeTab === 'security' && (
                <div style={{ maxWidth: '680px' }}>
                  {/* Preferences */}
                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid #e4e4e7',
                      borderRadius: '14px',
                      padding: '20px',
                      marginBottom: '16px',
                    }}
                  >
                    <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px', color: '#09090b' }}>
                      Notification Preferences
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 500 }}>WhatsApp Delivery Updates</div>
                          <div style={{ fontSize: '12px', color: '#71717a' }}>Receive order dispatch and live delivery notifications</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={communicationPrefs.whatsappUpdates}
                          onChange={(e) => updateCommunicationPrefs({ whatsappUpdates: e.target.checked })}
                          style={{ width: '18px', height: '18px', accentColor: '#e2231a' }}
                        />
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 500 }}>SMS Order Alerts</div>
                          <div style={{ fontSize: '12px', color: '#71717a' }}>Receive OTP and delivery verification via SMS</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={communicationPrefs.smsAlerts}
                          onChange={(e) => updateCommunicationPrefs({ smsAlerts: e.target.checked })}
                          style={{ width: '18px', height: '18px', accentColor: '#e2231a' }}
                        />
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 500 }}>Vehicle Maintenance Reminders</div>
                          <div style={{ fontSize: '12px', color: '#71717a' }}>Periodic brake fluid, pad wear, and seasonal alerts</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={communicationPrefs.garageFitmentAlerts}
                          onChange={(e) => updateCommunicationPrefs({ garageFitmentAlerts: e.target.checked })}
                          style={{ width: '18px', height: '18px', accentColor: '#e2231a' }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Password Form */}
                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid #e4e4e7',
                      borderRadius: '14px',
                      padding: '20px',
                    }}
                  >
                    <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px', color: '#09090b' }}>
                      Change Password
                    </h3>
                    <p style={{ color: '#71717a', fontSize: '13px', marginBottom: '14px' }}>
                      Update your account security password.
                    </p>

                    <form onSubmit={handleUpdatePassword}>
                      <div className="ac-field">
                        <label>Current Password</label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="ac-field">
                          <label>New Password</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                          />
                        </div>
                        <div className="ac-field">
                          <label>Confirm Password</label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="ac-btn-dark"
                        disabled={isPasswordSubmitting}
                        style={{ height: '36px', fontSize: '13px' }}
                      >
                        {isPasswordSubmitting ? 'Updating...' : 'Update Password'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ================================================================= */}
      {/* MODAL: EDIT PROFILE MODAL (Name & Phone)                          */}
      {/* ================================================================= */}
      {isProfileModalOpen && (
        <div className="ac-dialog-overlay" onClick={() => setIsProfileModalOpen(false)}>
          <div className="ac-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#09090b' }}>Edit Profile</h3>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                style={{ fontSize: '18px', cursor: 'pointer', color: '#71717a', background: 'transparent', border: 'none' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile}>
              <div className="ac-field">
                <label>Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="ac-field">
                <label>Contact Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+91 98201 44829"
                  required
                />
              </div>

              <div className="ac-field">
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  style={{ opacity: 0.6, cursor: 'not-allowed', background: '#f4f4f5' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="ac-btn-outline"
                  onClick={() => setIsProfileModalOpen(false)}
                  style={{ height: '36px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ac-btn-red"
                  style={{ height: '36px', fontSize: '13px' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: ADD / EDIT ADDRESS MODAL                                   */}
      {/* ================================================================= */}
      {isAddressModalOpen && (
        <div className="ac-dialog-overlay" onClick={() => setIsAddressModalOpen(false)}>
          <div className="ac-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#09090b' }}>
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                style={{ fontSize: '18px', cursor: 'pointer', color: '#71717a', background: 'transparent', border: 'none' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAddress}>
              {/* Label selector */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: '6px' }}>
                  Address Type
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['Home', 'Office', 'Workshop', 'Other'].map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setAddressForm({ ...addressForm, label: lbl })}
                      className={addressForm.label === lbl ? 'ac-btn-dark' : 'ac-btn-outline'}
                      style={{ height: '30px', fontSize: '12px', padding: '0 10px' }}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="ac-field" style={{ margin: 0 }}>
                  <label>Recipient Name</label>
                  <input
                    type="text"
                    value={addressForm.name}
                    onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="ac-field" style={{ margin: 0 }}>
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="ac-field" style={{ marginTop: '10px' }}>
                <label>Address (House, Building, Street)</label>
                <input
                  type="text"
                  value={addressForm.addressLine1}
                  onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="ac-field" style={{ margin: 0 }}>
                  <label>Locality / Area</label>
                  <input
                    type="text"
                    value={addressForm.addressLine2}
                    onChange={(e) => setAddressForm({ ...addressForm, addressLine2: e.target.value })}
                  />
                </div>
                <div className="ac-field" style={{ margin: 0 }}>
                  <label>Landmark</label>
                  <input
                    type="text"
                    value={addressForm.landmark}
                    onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
                <div className="ac-field" style={{ margin: 0 }}>
                  <label>City</label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    required
                  />
                </div>
                <div className="ac-field" style={{ margin: 0 }}>
                  <label>State</label>
                  <input
                    type="text"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    required
                  />
                </div>
                <div className="ac-field" style={{ margin: 0 }}>
                  <label>Pincode</label>
                  <input
                    type="text"
                    value={addressForm.postalCode}
                    onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                    maxLength={6}
                    required
                  />
                </div>
              </div>

              <div style={{ margin: '14px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={addressForm.isPrimary}
                    onChange={(e) => setAddressForm({ ...addressForm, isPrimary: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#e2231a' }}
                  />
                  <span style={{ fontSize: '13px', color: '#09090b' }}>Set as default primary delivery address</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="ac-btn-outline"
                  onClick={() => setIsAddressModalOpen(false)}
                  style={{ height: '36px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ac-btn-red"
                  style={{ height: '36px', fontSize: '13px' }}
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: ADD PAYMENT METHOD MODAL                                   */}
      {/* ================================================================= */}
      {isPaymentModalOpen && (
        <div className="ac-dialog-overlay" onClick={() => setIsPaymentModalOpen(false)}>
          <div className="ac-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#09090b' }}>Add Payment Method</h3>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                style={{ fontSize: '18px', cursor: 'pointer', color: '#71717a', background: 'transparent', border: 'none' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => setPaymentType('card')}
                className={paymentType === 'card' ? 'ac-btn-dark' : 'ac-btn-outline'}
                style={{ flex: 1, height: '34px', fontSize: '13px' }}
              >
                <CreditCard size={13} />
                Credit / Debit Card
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('upi')}
                className={paymentType === 'upi' ? 'ac-btn-dark' : 'ac-btn-outline'}
                style={{ flex: 1, height: '34px', fontSize: '13px' }}
              >
                ⚡ UPI ID (VPA)
              </button>
            </div>

            <form onSubmit={handleSavePaymentMethod}>
              {paymentType === 'card' ? (
                <>
                  <div className="ac-field">
                    <label>Card Number</label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      value={newCardNumber}
                      onChange={(e) => setNewCardNumber(e.target.value)}
                      maxLength={19}
                      required
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="ac-field" style={{ margin: 0 }}>
                      <label>Cardholder Name</label>
                      <input
                        type="text"
                        placeholder="Driver Name"
                        value={newCardName}
                        onChange={(e) => setNewCardName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="ac-field" style={{ margin: 0 }}>
                      <label>Expiry (MM/YY)</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={newCardExpiry}
                        onChange={(e) => setNewCardExpiry(e.target.value)}
                        maxLength={5}
                        required
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="ac-field">
                  <label>UPI Virtual Payment Address</label>
                  <input
                    type="text"
                    placeholder="e.g. driver@okhdfcbank"
                    value={newUpiId}
                    onChange={(e) => setNewUpiId(e.target.value)}
                    required
                  />
                  <small style={{ fontSize: '11.5px', color: '#71717a', marginTop: '2px' }}>
                    Supports Google Pay, PhonePe, Paytm, BHIM and all banks.
                  </small>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="ac-btn-outline"
                  onClick={() => setIsPaymentModalOpen(false)}
                  style={{ height: '36px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ac-btn-dark"
                  style={{ height: '36px', fontSize: '13px' }}
                >
                  Save Method
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: LIVE TRACKING TIMELINE                                     */}
      {/* ================================================================= */}
      {trackingModalOrder && (
        <div className="ac-dialog-overlay" onClick={() => setTrackingModalOrder(null)}>
          <div className="ac-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#09090b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Truck size={17} color="#e2231a" />
                  Tracking Details
                </h3>
                <span style={{ fontSize: '12px', color: '#71717a' }}>
                  #{trackingModalOrder.orderNumber} · {trackingModalOrder.carrier}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTrackingModalOrder(null)}
                style={{ fontSize: '18px', cursor: 'pointer', color: '#71717a', background: 'transparent', border: 'none' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#b91a12', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span className="ac-pulse-dot" />
                {trackingModalOrder.statusMessage || 'In Transit'}
              </div>
              <div style={{ fontSize: '12px', color: '#71717a', marginTop: '2px' }}>
                Estimated Delivery: {trackingModalOrder.estimatedDelivery}
              </div>
            </div>

            <div style={{ borderLeft: '2px solid #e2231a', paddingLeft: '14px', marginLeft: '6px' }}>
              {trackingModalOrder.status === 'CANCELLED' ? (
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#09090b' }}>Order cancelled</div>
                  <div style={{ fontSize: '11.5px', color: '#71717a' }}>
                    Placed on{' '}
                    {new Date(trackingModalOrder.placedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              ) : (
                ORDER_STAGE_FLOW.map((stage, idx) => {
                  const reached = orderStageStep(trackingModalOrder.status) >= idx + 1;
                  const isCurrent = orderStageStep(trackingModalOrder.status) === idx + 1;
                  return (
                    <div key={stage} style={{ marginBottom: idx === ORDER_STAGE_FLOW.length - 1 ? 0 : '14px' }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '13px',
                          color: reached ? '#09090b' : '#a1a1aa',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {reached && <Check size={13} strokeWidth={3} color="#16a34a" />}
                        {ORDER_STAGE_LABELS[stage]}
                        {isCurrent && (
                          <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#b91a12', textTransform: 'uppercase' }}>
                            Current
                          </span>
                        )}
                      </div>
                      {idx === 0 && reached && (
                        <div style={{ fontSize: '11.5px', color: '#71717a' }}>
                          {new Date(trackingModalOrder.placedAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                type="button"
                className="ac-btn-dark"
                onClick={() => setTrackingModalOrder(null)}
                style={{ height: '34px', fontSize: '13px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: TAX INVOICE PRINTABLE                                      */}
      {/* ================================================================= */}
      {invoiceModalOrder && (
        <div className="ac-dialog-overlay" onClick={() => setInvoiceModalOrder(null)}>
          <div
            className="ac-dialog-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '600px', padding: '28px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e4e4e7', paddingBottom: '14px' }}>
              <div>
                <img src="/logo.png" alt="CARXEN" style={{ height: '34px', width: 'auto', display: 'block', marginBottom: '6px' }} />
                <div style={{ fontSize: '11px', color: '#71717a', lineHeight: '1.4' }}>
                  GSTIN: 27AABCC8920D1ZE<br />
                  Baner, Pune, MH 411045
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#e2231a', textTransform: 'uppercase' }}>
                  TAX INVOICE
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 600 }}>
                  INV-{invoiceModalOrder.orderNumber}
                </div>
                <div style={{ fontSize: '11.5px', color: '#71717a' }}>
                  Date: {new Date(invoiceModalOrder.placedAt).toLocaleDateString('en-IN')}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', margin: '14px 0', fontSize: '12.5px' }}>
              <div>
                <b style={{ color: '#09090b' }}>Deliver To:</b>
                <div style={{ color: '#3f3f46' }}>{invoiceModalOrder.shippingAddress.name}</div>
                <div style={{ color: '#71717a' }}>{invoiceModalOrder.shippingAddress.addressLine1}</div>
                <div style={{ color: '#71717a' }}>{invoiceModalOrder.shippingAddress.city} {invoiceModalOrder.shippingAddress.postalCode}</div>
              </div>
              <div>
                <b style={{ color: '#09090b' }}>Payment Details:</b>
                <div style={{ color: '#3f3f46' }}>Method: {invoiceModalOrder.paymentMethod}</div>
                <div style={{ color: '#71717a' }}>Status: {invoiceModalOrder.paymentStatus}</div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '12px 0', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: '#f4f4f5', borderBottom: '1px solid #e4e4e7' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>Item</th>
                  <th style={{ textAlign: 'center', padding: '6px' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>Price</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {invoiceModalOrder.items.map((it, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td style={{ padding: '6px 8px' }}>{it.name}</td>
                    <td style={{ textAlign: 'center', padding: '6px' }}>{it.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '6px 8px' }}>{formatINR(it.unitPrice)}</td>
                    <td style={{ textAlign: 'right', padding: '6px 8px' }}>{formatINR(it.lineSubtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <div style={{ width: '200px', fontSize: '12.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span style={{ color: '#71717a' }}>Subtotal:</span>
                  <span>{formatINR(invoiceModalOrder.subtotal)}</span>
                </div>
                {invoiceModalOrder.discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#16a34a' }}>
                    <span>Discount:</span>
                    <span>- {formatINR(invoiceModalOrder.discountAmount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px solid #e4e4e7', fontWeight: 700, fontSize: '14px' }}>
                  <span>Total:</span>
                  <span>{formatINR(invoiceModalOrder.totalAmount)}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', paddingTop: '12px', borderTop: '1px solid #f4f4f5', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="ac-btn-dark"
                  onClick={() => handleDownloadInvoice(invoiceModalOrder)}
                  style={{ height: '34px', fontSize: '12.5px' }}
                >
                  <Download size={13} />
                  Download Invoice
                </button>
                <button
                  type="button"
                  className="ac-btn-outline"
                  onClick={() => window.print()}
                  style={{ height: '34px', fontSize: '12.5px' }}
                >
                  <Printer size={13} />
                  Print
                </button>
              </div>
              <button
                type="button"
                className="ac-btn-outline"
                onClick={() => setInvoiceModalOrder(null)}
                style={{ height: '34px', fontSize: '12.5px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: WRITE / EDIT PRODUCT REVIEW                                */}
      {/* ================================================================= */}
      {reviewModalData && (
        <div className="ac-dialog-overlay" onClick={() => setReviewModalData(null)}>
          <div
            className="ac-dialog-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px', padding: '24px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f4f4f5', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#09090b' }}>
                  {reviewModalData.existingReview ? 'Edit Your Review' : 'Write a Product Review'}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#71717a' }}>
                  Order #{reviewModalData.orderNumber} · <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Verified Purchase</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalData(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: '#71717a' }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: '#fafaf8', borderRadius: '10px', border: '1px solid #e4e4e7', marginBottom: '16px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '6px', background: '#fff', overflow: 'hidden', flexShrink: 0, display: 'grid', placeItems: 'center', border: '1px solid #e4e4e7' }}>
                {reviewModalData.productImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={reviewModalData.productImage} alt={reviewModalData.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <CarFront size={20} color="#71717a" />
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#09090b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {reviewModalData.productName}
                </div>
                <Link
                  href={`/product/${reviewModalData.productId}`}
                  target="_blank"
                  style={{ fontSize: '11.5px', color: '#e2231a', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}
                >
                  <span>See product details</span>
                  <ExternalLink size={11} />
                </Link>
              </div>
            </div>

            <form onSubmit={handleSubmitCustomerReview}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#3f3f46', marginBottom: '6px' }}>
                  Overall Rating:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoverReviewRating || reviewRating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        className="ac-star-picker-btn"
                        onMouseEnter={() => setHoverReviewRating(star)}
                        onMouseLeave={() => setHoverReviewRating(0)}
                        onClick={() => setReviewRating(star)}
                        style={{ color: isFilled ? '#f5a623' : '#d4d4d8' }}
                      >
                        ★
                      </button>
                    );
                  })}
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#f5a623', marginLeft: '6px' }}>
                    {reviewRating} of 5 Stars
                  </span>
                </div>
              </div>

              <div className="ac-field">
                <label>Review Headline</label>
                <input
                  type="text"
                  placeholder="e.g., Flawless fitment and luxurious feel"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  required
                />
              </div>

              <div className="ac-field">
                <label>Your Feedback</label>
                <textarea
                  placeholder="Share specific details about the quality, installation ease, and fitment on your car..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d4d4d8',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="ac-btn-outline"
                  onClick={() => setReviewModalData(null)}
                  style={{ height: '36px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ac-btn-dark"
                  style={{ height: '36px', fontSize: '13px', background: '#0e0e0f' }}
                >
                  {reviewModalData.existingReview ? 'Update Review' : 'Publish Verified Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: ADD / EDIT VEHICLE MODAL                                  */}
      {/* ================================================================= */}
      {isVehicleModalOpen && (
        <div className="ac-dialog-overlay" onClick={() => setIsVehicleModalOpen(false)}>
          <div className="ac-dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fee2e2', color: '#e2231a', display: 'grid', placeItems: 'center' }}>
                  <CarFront size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#09090b', margin: 0 }}>
                    {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#71717a' }}>
                    Saved to customer profile in database
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVehicleModalOpen(false)}
                style={{ fontSize: '18px', cursor: 'pointer', color: '#71717a', background: 'transparent', border: 'none' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle}>
              {/* Brand Selector */}
              <div className="ac-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ margin: 0 }}>Make / Brand</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomBrand(!isCustomBrand)}
                    style={{ fontSize: '11.5px', color: '#e2231a', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {isCustomBrand ? 'Choose from list' : '+ Enter custom brand'}
                  </button>
                </div>
                {isCustomBrand ? (
                  <input
                    type="text"
                    value={vehicleForm.b}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, b: e.target.value })}
                    placeholder="e.g. Aston Martin, Ferrari, Volvo"
                    required
                  />
                ) : (
                  <select
                    value={vehicleForm.b}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, b: e.target.value })}
                    style={{
                      width: '100%',
                      height: '38px',
                      borderRadius: '8px',
                      border: '1px solid #d4d4d8',
                      padding: '0 10px',
                      fontSize: '13.5px',
                      background: '#fff',
                    }}
                  >
                    {[
                      'Porsche',
                      'BMW',
                      'Mercedes-Benz',
                      'Audi',
                      'Toyota',
                      'Maruti Suzuki',
                      'Hyundai',
                      'Tata',
                      'Mahindra',
                      'Kia',
                      'Honda',
                      'Ford',
                      'Ferrari',
                      'Lamborghini',
                      'Volkswagen',
                    ].map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Model */}
              <div className="ac-field">
                <label>Model &amp; Generation</label>
                <input
                  type="text"
                  value={vehicleForm.m}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, m: e.target.value })}
                  placeholder="e.g. 911 GT3 (992), M3 Competition, Fortuner"
                  required
                />
              </div>

              {/* Year & Fuel */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="ac-field" style={{ margin: 0 }}>
                  <label>Model Year</label>
                  <select
                    value={vehicleForm.y}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, y: e.target.value })}
                    style={{
                      width: '100%',
                      height: '38px',
                      borderRadius: '8px',
                      border: '1px solid #d4d4d8',
                      padding: '0 10px',
                      fontSize: '13.5px',
                      background: '#fff',
                    }}
                  >
                    {['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016'].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ac-field" style={{ margin: 0 }}>
                  <label>Fuel / Engine</label>
                  <select
                    value={vehicleForm.f}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, f: e.target.value })}
                    style={{
                      width: '100%',
                      height: '38px',
                      borderRadius: '8px',
                      border: '1px solid #d4d4d8',
                      padding: '0 10px',
                      fontSize: '13.5px',
                      background: '#fff',
                    }}
                  >
                    {['Petrol', 'Diesel', 'Hybrid', 'Electric', 'Turbo Petrol', 'V8 Twin-Turbo'].map((fuel) => (
                      <option key={fuel} value={fuel}>
                        {fuel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Set as active toggle */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '14px',
                  marginBottom: '18px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#3f3f46',
                }}
              >
                <input
                  type="checkbox"
                  checked={vehicleForm.isDefault}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, isDefault: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: '#e2231a' }}
                />
                <span>Set as active vehicle for part fitment guarantee</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="ac-btn-outline"
                  onClick={() => setIsVehicleModalOpen(false)}
                  style={{ height: '36px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ac-btn-red"
                  style={{ height: '36px', fontSize: '13px' }}
                >
                  {editingVehicle ? 'Update Vehicle' : 'Add to Garage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div
          className="ac-portal-wrap"
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: '#71717a',
          }}
        >
          Loading Garage &amp; Account...
        </div>
      }
    >
      <AccountContent />
    </Suspense>
  );
}

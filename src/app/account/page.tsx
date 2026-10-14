'use client';

import React, { useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/data/products';
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
} from 'lucide-react';
import './account.css';

type AccountTab = 'orders' | 'addresses' | 'garage' | 'payments' | 'security';
type OrderFilter = 'ALL' | 'ACTIVE' | 'DELIVERED';

function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'D';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AccountPage() {
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
  } = useApp();

  const [activeTab, setActiveTab] = useState<AccountTab>('orders');
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('ALL');
  const [orderSearch, setOrderSearch] = useState('');
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  // Modals
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [trackingModalOrder, setTrackingModalOrder] = useState<CustomerOrderHistoryRecord | null>(null);
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<CustomerOrderHistoryRecord | null>(null);

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
  const email = user?.email || 'driver@carxen.io';
  const phone = user?.phone || '+91 98201 44829';
  const avatarUrl = user?.avatarUrl;
  const tier = user?.tier || 'Apex Gold Member';
  const points = user?.rewardPoints ?? 1450;
  const initials = getInitials(name);

  const primaryAddress = addresses.find((a) => a.isPrimary) || addresses[0];
  const secondaryAddresses = addresses.filter((a) => a.id !== primaryAddress?.id);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (orderFilter === 'ACTIVE') {
        if (!['CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(order.status)) {
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

  const activeOrdersCount = orders.filter((o) =>
    ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(o.status)
  ).length;

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
                        <span className="ac-member-pill">
                          <Sparkles size={12} color="#e2231a" />
                          {tier}
                        </span>
                      </div>
                      <div className="ac-user-subtext">
                        <span>
                          <Mail size={13} style={{ color: '#71717a' }} />
                          {email}
                        </span>
                        <span>•</span>
                        <span>
                          <Phone size={13} style={{ color: '#71717a' }} />
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
                    <div className="ac-stat-number">{orders.length}</div>
                    <div className="ac-stat-tag">
                      <Package size={12} />
                      Total Orders
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
                    <div style={{ display: 'flex', gap: '6px' }}>
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
                        className={`ac-btn-outline ${orderFilter === 'DELIVERED' ? 'ac-btn-dark' : ''}`}
                        style={{ height: '34px', fontSize: '12.5px', padding: '0 12px' }}
                      >
                        Delivered ({orders.filter((o) => o.status === 'DELIVERED').length})
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
                      const stepIndex = isDelivered ? 4 : isOutForDelivery ? 3 : isShipped ? 2 : 1;

                      return (
                        <div key={order.id} className="ac-order-tile">
                          {/* Order Top Bar */}
                          <div className="ac-order-top-bar">
                            <div>
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
                                {order.status.replace(/_/g, ' ')}
                              </span>
                              <span style={{ fontSize: '15px', fontWeight: 700, color: '#09090b' }}>
                                {formatINR(order.totalAmount)}
                              </span>
                            </div>
                          </div>

                          {/* Subtle Tracker Progress with red indicator */}
                          <div className="ac-tracker-line">
                            <div className={`ac-tracker-node ${stepIndex >= 1 ? 'filled' : ''}`}>
                              <div className="ac-node-bar" />
                              <span className="ac-node-lbl">1. Placed</span>
                            </div>
                            <div className={`ac-tracker-node ${stepIndex >= 2 ? 'filled' : ''}`}>
                              <div className="ac-node-bar" />
                              <span className="ac-node-lbl">2. Dispatched</span>
                            </div>
                            <div className={`ac-tracker-node ${stepIndex >= 3 ? 'filled' : ''}`}>
                              <div className="ac-node-bar" />
                              <span className="ac-node-lbl">3. Out for delivery</span>
                            </div>
                            <div className={`ac-tracker-node ${stepIndex >= 4 ? 'filled' : ''}`}>
                              <div className="ac-node-bar" />
                              <span className="ac-node-lbl">4. Delivered</span>
                            </div>
                          </div>

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

                          {/* Items List */}
                          <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: '10px' }}>
                            {order.items.map((it, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '6px 0',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div
                                    style={{
                                      width: '38px',
                                      height: '38px',
                                      borderRadius: '6px',
                                      background: '#f4f4f5',
                                      overflow: 'hidden',
                                      flexShrink: 0,
                                      display: 'grid',
                                      placeItems: 'center',
                                    }}
                                  >
                                    {it.image ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={it.image} alt={it.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                      <CarFront size={18} style={{ color: '#71717a' }} />
                                    )}
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#09090b' }}>
                                      {it.name}
                                    </div>
                                    <div style={{ fontSize: '11.5px', color: '#71717a' }}>
                                      Qty: {it.quantity} · {formatINR(it.unitPrice)}
                                    </div>
                                  </div>
                                </div>
                                <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#09090b' }}>
                                  {formatINR(it.lineSubtotal)}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Card Footer Actions (Re-order in Signature Red!) */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: '8px',
                              marginTop: '14px',
                              paddingTop: '12px',
                              borderTop: '1px solid #f4f4f5',
                            }}
                          >
                            <button
                              type="button"
                              className="ac-btn-outline"
                              onClick={() => setInvoiceModalOrder(order)}
                              style={{ height: '32px', fontSize: '12.5px', padding: '0 12px' }}
                            >
                              <FileText size={13} />
                              Invoice
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
                  {primaryAddress && (
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
                <div style={{ maxWidth: '680px' }}>
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e4e4e7',
                      borderRadius: '14px',
                      padding: '22px',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ShieldCheck size={13} color="#16a34a" />
                          Active Vehicle & Fitment Guarantee
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#09090b', margin: '2px 0' }}>
                          {car ? `${car.y} ${car.b} ${car.m}` : '2023 Porsche 911 GT3 (992)'}
                        </h3>
                        <div style={{ fontSize: '13px', color: '#71717a' }}>
                          Trim / Engine: {car?.f || '4.0L Naturally Aspirated Flat-6 (502 HP)'}
                        </div>
                      </div>

                      <Link className="ac-btn-red" href="/garage" style={{ height: '36px', fontSize: '13px' }}>
                        <CarFront size={14} />
                        Change Vehicle
                      </Link>
                    </div>
                  </div>

                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e4e4e7',
                      borderRadius: '14px',
                      padding: '20px',
                    }}
                  >
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#09090b', marginBottom: '10px' }}>
                      Quick Switch Vehicle
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                      <button
                        type="button"
                        className="ac-btn-outline"
                        onClick={() => setVehicle({ b: 'Porsche', m: '911 GT3 (992)', y: '2023', f: 'Petrol' })}
                        style={{ textAlign: 'left', padding: '10px', height: 'auto', display: 'block' }}
                      >
                        <b style={{ display: 'block', fontSize: '13px' }}>Porsche 911 GT3</b>
                        <small style={{ color: '#71717a', fontSize: '11.5px' }}>2023 · Petrol</small>
                      </button>

                      <button
                        type="button"
                        className="ac-btn-outline"
                        onClick={() => setVehicle({ b: 'BMW', m: 'M3 Competition', y: '2024', f: 'Petrol' })}
                        style={{ textAlign: 'left', padding: '10px', height: 'auto', display: 'block' }}
                      >
                        <b style={{ display: 'block', fontSize: '13px' }}>BMW M3 Competition</b>
                        <small style={{ color: '#71717a', fontSize: '11.5px' }}>2024 · Petrol</small>
                      </button>

                      <button
                        type="button"
                        className="ac-btn-outline"
                        onClick={() => setVehicle({ b: 'Toyota', m: 'GR Supra 3.0', y: '2022', f: 'Petrol' })}
                        style={{ textAlign: 'left', padding: '10px', height: 'auto', display: 'block' }}
                      >
                        <b style={{ display: 'block', fontSize: '13px' }}>Toyota GR Supra 3.0</b>
                        <small style={{ color: '#71717a', fontSize: '11.5px' }}>2022 · Petrol</small>
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
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#09090b' }}>Out for Delivery with Courier Agent</div>
                <div style={{ fontSize: '11.5px', color: '#71717a' }}>Baner Hub · Today, 08:30 AM</div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#09090b' }}>Arrived at Destination City Facility</div>
                <div style={{ fontSize: '11.5px', color: '#71717a' }}>Pune Air Cargo Hub · Yesterday, 09:45 PM</div>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#09090b' }}>Dispatched from Central Warehouse</div>
                <div style={{ fontSize: '11.5px', color: '#71717a' }}>CARXEN Hub 01, Mumbai · Oct 12, 02:15 PM</div>
              </div>
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
                <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#09090b' }}>CARXEN</h3>
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

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18px', paddingTop: '12px', borderTop: '1px solid #f4f4f5' }}>
              <button
                type="button"
                className="ac-btn-dark"
                onClick={() => window.print()}
                style={{ height: '34px', fontSize: '12.5px' }}
              >
                <Printer size={13} />
                Print Invoice
              </button>
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

      <Footer />
    </div>
  );
}

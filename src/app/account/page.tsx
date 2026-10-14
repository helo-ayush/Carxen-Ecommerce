'use client';

import React, { useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/data/products';
import { AVATAR_PRESETS } from '@/data/customer-defaults';
import type { CustomerAddress, CustomerOrderHistoryRecord } from '@/types/customer';
import { Footer } from '@/components/Footer';
import './account.css';

type AccountTab = 'orders' | 'addresses' | 'garage' | 'payments' | 'security';
type OrderFilter = 'ALL' | 'ACTIVE' | 'DELIVERED';

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

  // Modals state
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [trackingModalOrder, setTrackingModalOrder] = useState<CustomerOrderHistoryRecord | null>(null);
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<CustomerOrderHistoryRecord | null>(null);

  // Form states
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [avatarCustomUrl, setAvatarCustomUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Address form
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

  // Payment form
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardName, setNewCardName] = useState('');
  const [newCardExpiry, setNewCardExpiry] = useState('');
  const [newUpiId, setNewUpiId] = useState('');
  const [paymentType, setPaymentType] = useState<'card' | 'upi'>('card');

  // Password update form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  // GST Form
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
  const joinedDate = user?.joinedDate || 'Oct 2024';

  const primaryAddress = addresses.find((a) => a.isPrimary) || addresses[0];
  const secondaryAddresses = addresses.filter((a) => a.id !== primaryAddress?.id);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Status filter
      if (orderFilter === 'ACTIVE') {
        if (order.status !== 'CONFIRMED' && order.status !== 'PROCESSING' && order.status !== 'SHIPPED' && order.status !== 'OUT_FOR_DELIVERY') {
          return false;
        }
      } else if (orderFilter === 'DELIVERED') {
        if (order.status !== 'DELIVERED') return false;
      }

      // Search filter
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

  // Avatar file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image size should be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        await updateUserProfile({ avatarUrl: reader.result });
        setIsAvatarModalOpen(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPresetAvatar = async (presetUrl: string) => {
    await updateUserProfile({ avatarUrl: presetUrl });
    setIsAvatarModalOpen(false);
  };

  const handleSaveCustomAvatarUrl = async () => {
    if (!avatarCustomUrl.trim()) return;
    await updateUserProfile({ avatarUrl: avatarCustomUrl.trim() });
    setAvatarCustomUrl('');
    setIsAvatarModalOpen(false);
  };

  const handleRemoveAvatar = async () => {
    await updateUserProfile({ avatarUrl: '' });
    setIsAvatarModalOpen(false);
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

  // Reorder order items
  const handleReorder = (order: CustomerOrderHistoryRecord) => {
    order.items.forEach((item) => {
      addToCart(item.productId, item.quantity);
    });
    showToast(`Items from Order #${order.orderNumber} added to cart`);
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

  // Password update simulation
  const handleUpdatePassword = (e: React.FormEvent) => {
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
    setTimeout(() => {
      setIsPasswordSubmitting(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated successfully');
    }, 800);
  };

  // GST save
  const handleSaveGst = (e: React.FormEvent) => {
    e.preventDefault();
    updateGstBilling(gstForm);
  };

  return (
    <div className="in-shop" style={{ minHeight: '100vh', background: 'var(--bg, #f4f3ef)' }}>
      <section className="pp on" id="v-pg">
        <div className="wrap" id="pgIn" style={{ maxWidth: '1240px', padding: '36px 20px 80px' }}>
          {authLoading ? (
            <div style={{ textAlign: 'center', padding: '90px 0' }}>
              <p className="gr-s" style={{ fontSize: '16px' }}>Loading driver profile...</p>
            </div>
          ) : !user ? (
            /* Unauthenticated / Sign-in state */
            <div
              style={{
                maxWidth: '540px',
                margin: '50px auto',
                background: '#fff',
                border: '1px solid var(--line, #e5e5ea)',
                borderRadius: '24px',
                padding: '42px 36px',
                textAlign: 'center',
                boxShadow: '0 12px 36px rgba(0,0,0,0.06)',
              }}
            >
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: '#e2231a',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '30px',
                  margin: '0 auto 20px',
                  boxShadow: '0 8px 24px rgba(226, 35, 26, 0.35)',
                }}
              >
                🔒
              </div>
              <h1 className="disp" style={{ fontSize: '2rem', marginBottom: '10px' }}>
                Driver Portal Access
              </h1>
              <p style={{ color: 'var(--steel, #5d5d64)', fontSize: '14.5px', lineHeight: '1.6', marginBottom: '28px' }}>
                Sign in to view your detailed order tracking history, customize your profile image, manage primary & secondary delivery addresses, and tune your garage vehicle.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Link
                  className="btn dark"
                  href="/login?redirect=/account"
                  style={{ height: '48px', fontSize: '15px', fontWeight: 600 }}
                >
                  Sign In with Email
                </Link>
                <button
                  type="button"
                  className="btn"
                  onClick={() => login('Aarav Sharma')}
                  style={{
                    height: '48px',
                    fontSize: '15px',
                    fontWeight: 600,
                    background: '#18181b',
                    color: '#fff',
                    border: '1px solid #27272a',
                  }}
                >
                  ⚡ Instant Demo Sign-In (Aarav Sharma)
                </button>
                <Link
                  className="btn"
                  href="/shop"
                  style={{ height: '48px', fontSize: '15px' }}
                >
                  Continue browsing catalog
                </Link>
              </div>
            </div>
          ) : (
            /* Authenticated Customer Profile Portal */
            <>
              {/* Profile Hero Banner */}
              <div className="ac-hero-banner">
                <div className="ac-hero-top">
                  <div className="ac-profile-meta">
                    <div
                      className="ac-avatar-box"
                      onClick={() => setIsAvatarModalOpen(true)}
                      title="Click to edit profile photo"
                    >
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt={name} className="ac-avatar-media" />
                      ) : (
                        <div className="ac-avatar-initial">{(name[0] || 'D').toUpperCase()}</div>
                      )}
                      <div className="ac-avatar-badge" title="Change Avatar Photo">
                        📷
                      </div>
                    </div>

                    <div className="ac-user-info">
                      <h1>
                        {name}
                        <span className="ac-gold-badge">★ {tier}</span>
                      </h1>
                      <div className="ac-user-tags">
                        <span>✉ {email}</span>
                        <span>•</span>
                        <span>
                          📞 {phone}{' '}
                          <button
                            type="button"
                            onClick={openEditProfile}
                            style={{
                              color: '#f87171',
                              textDecoration: 'underline',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: '12px',
                              marginLeft: '4px',
                            }}
                          >
                            Edit
                          </button>
                        </span>
                        <span>•</span>
                        <span>🗓 Joined {joinedDate}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={openEditProfile}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        height: '40px',
                        fontSize: '13px',
                        fontWeight: 600,
                        padding: '0 16px',
                      }}
                    >
                      ✎ Edit Profile
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={handleSignOut}
                      style={{
                        background: 'rgba(226, 35, 26, 0.2)',
                        color: '#fca5a5',
                        border: '1px solid rgba(226, 35, 26, 0.4)',
                        height: '40px',
                        fontSize: '13px',
                        fontWeight: 600,
                        padding: '0 16px',
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                </div>

                {/* Quick Stats Row */}
                <div className="ac-stats-strip">
                  <div className="ac-stat-cell" onClick={() => { setActiveTab('orders'); setOrderFilter('ALL'); }} style={{ cursor: 'pointer' }}>
                    <div className="ac-stat-val">{orders.length}</div>
                    <div className="ac-stat-lbl">Total Orders</div>
                  </div>
                  <div className="ac-stat-cell" onClick={() => { setActiveTab('orders'); setOrderFilter('ACTIVE'); }} style={{ cursor: 'pointer' }}>
                    <div className="ac-stat-val" style={{ color: '#60a5fa' }}>{activeOrdersCount}</div>
                    <div className="ac-stat-lbl">Active Shipments</div>
                  </div>
                  <div className="ac-stat-cell" onClick={() => setActiveTab('addresses')} style={{ cursor: 'pointer' }}>
                    <div className="ac-stat-val">{addresses.length}</div>
                    <div className="ac-stat-lbl">Saved Addresses</div>
                  </div>
                  <div className="ac-stat-cell" style={{ cursor: 'pointer' }}>
                    <div className="ac-stat-val" style={{ color: '#fbbf24' }}>{points.toLocaleString()} PTS</div>
                    <div className="ac-stat-lbl">SpeedPoints (₹{points})</div>
                  </div>
                  <div className="ac-stat-cell" onClick={() => setActiveTab('garage')} style={{ cursor: 'pointer' }}>
                    <div className="ac-stat-val" style={{ fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {car ? `${car.b} ${car.m}` : 'Porsche 911 GT3'}
                    </div>
                    <div className="ac-stat-lbl">Active Garage Car</div>
                  </div>
                </div>
              </div>

              {/* Tabs Navigation Bar */}
              <div className="ac-tabs-bar">
                <button
                  type="button"
                  className={`ac-tab-pill ${activeTab === 'orders' ? 'active' : ''}`}
                  onClick={() => setActiveTab('orders')}
                >
                  📦 Working History & Orders
                  <span className="ac-tab-count">{orders.length}</span>
                </button>
                <button
                  type="button"
                  className={`ac-tab-pill ${activeTab === 'addresses' ? 'active' : ''}`}
                  onClick={() => setActiveTab('addresses')}
                >
                  📍 Delivery Addresses
                  <span className="ac-tab-count">{addresses.length}</span>
                </button>
                <button
                  type="button"
                  className={`ac-tab-pill ${activeTab === 'garage' ? 'active' : ''}`}
                  onClick={() => setActiveTab('garage')}
                >
                  🏎 My Garage & Fitment
                </button>
                <button
                  type="button"
                  className={`ac-tab-pill ${activeTab === 'payments' ? 'active' : ''}`}
                  onClick={() => setActiveTab('payments')}
                >
                  💳 Payment & Billing
                </button>
                <button
                  type="button"
                  className={`ac-tab-pill ${activeTab === 'security' ? 'active' : ''}`}
                  onClick={() => setActiveTab('security')}
                >
                  ⚙ Settings & Security
                </button>
              </div>

              {/* ========================================================= */}
              {/* TAB 1: WORKING HISTORY & ORDERS                           */}
              {/* ========================================================= */}
              {activeTab === 'orders' && (
                <div>
                  {/* Order Filter & Search Toolbar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '14px',
                      marginBottom: '20px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setOrderFilter('ALL')}
                        className={`ac-tab-pill ${orderFilter === 'ALL' ? 'active' : ''}`}
                        style={{ height: '38px', padding: '0 14px', fontSize: '13px' }}
                      >
                        All ({orders.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderFilter('ACTIVE')}
                        className={`ac-tab-pill ${orderFilter === 'ACTIVE' ? 'active' : ''}`}
                        style={{ height: '38px', padding: '0 14px', fontSize: '13px' }}
                      >
                        Active / In Transit ({activeOrdersCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderFilter('DELIVERED')}
                        className={`ac-tab-pill ${orderFilter === 'DELIVERED' ? 'active' : ''}`}
                        style={{ height: '38px', padding: '0 14px', fontSize: '13px' }}
                      >
                        Delivered ({orders.filter((o) => o.status === 'DELIVERED').length})
                      </button>
                    </div>

                    <div style={{ position: 'relative', minWidth: '260px' }}>
                      <input
                        type="search"
                        placeholder="Search by Order # or Part…"
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        className="ac-input-control"
                        style={{ height: '38px', paddingLeft: '32px' }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          left: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#8e8e93',
                          fontSize: '14px',
                        }}
                      >
                        🔍
                      </span>
                    </div>
                  </div>

                  {/* Orders List */}
                  {filteredOrders.length === 0 ? (
                    <div
                      className="empty on"
                      style={{
                        background: '#fff',
                        borderRadius: '18px',
                        padding: '48px 24px',
                        border: '1px solid var(--line, #e2e1db)',
                        textAlign: 'center',
                      }}
                    >
                      <b style={{ fontSize: '18px', display: 'block', marginBottom: '8px' }}>
                        No orders match your filter
                      </b>
                      {orderSearch ? 'Try a different search keyword.' : 'You have not placed any orders yet.'}
                      <br />
                      <br />
                      <Link className="btn dark" href="/shop">
                        Explore Performance Catalog
                      </Link>
                    </div>
                  ) : (
                    filteredOrders.map((order) => {
                      const isDelivered = order.status === 'DELIVERED';
                      const isOutForDelivery = order.status === 'OUT_FOR_DELIVERY';
                      const isShipped = order.status === 'SHIPPED';
                      const isProcessing = order.status === 'PROCESSING';
                      const isConfirmed = order.status === 'CONFIRMED';

                      // Step mapping for 5-stage tracker
                      const stepIndex = isDelivered
                        ? 5
                        : isOutForDelivery
                        ? 4
                        : isShipped
                        ? 3
                        : isProcessing
                        ? 2
                        : 1;

                      return (
                        <div key={order.id} className="ac-order-card">
                          {/* Order Header */}
                          <div className="ac-order-header">
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <span className="mono" style={{ fontSize: '13px', fontWeight: 700 }}>
                                  #{order.orderNumber}
                                </span>
                                <span className="gr-s" style={{ fontSize: '12px' }}>
                                  Placed {new Date(order.placedAt).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                                <span className="gr-s">•</span>
                                <span className="gr-s" style={{ fontSize: '12px' }}>
                                  Payment: {order.paymentMethod} ({order.paymentStatus})
                                </span>
                              </div>
                              <div style={{ fontSize: '13px', color: 'var(--steel, #5d5d64)', marginTop: '4px' }}>
                                Destination: {order.shippingAddress.addressLine1}, {order.shippingAddress.city}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span
                                className={`ac-status-badge ${order.status.toLowerCase()}`}
                              >
                                <span
                                  className={`status-dot ${isOutForDelivery || isShipped ? 'pulse' : ''}`}
                                />
                                {order.status.replace(/_/g, ' ')}
                              </span>
                              <div className="disp" style={{ fontSize: '1.4rem' }}>
                                {formatINR(order.totalAmount)}
                              </div>
                            </div>
                          </div>

                          {/* Interactive Visual Order Tracking Stepper */}
                          <div className="ac-timeline">
                            {/* Step 1: Confirmed */}
                            <div className={`ac-timeline-step ${stepIndex >= 1 ? 'done' : ''} ${stepIndex === 1 ? 'active' : ''}`}>
                              <div className="ac-timeline-circle">{stepIndex > 1 ? '✓' : '1'}</div>
                              <div className="ac-timeline-bar" />
                              <span className="ac-timeline-label">Order Placed</span>
                            </div>

                            {/* Step 2: Processing */}
                            <div className={`ac-timeline-step ${stepIndex >= 2 ? 'done' : ''} ${stepIndex === 2 ? 'active' : ''}`}>
                              <div className="ac-timeline-circle">{stepIndex > 2 ? '✓' : '2'}</div>
                              <div className="ac-timeline-bar" />
                              <span className="ac-timeline-label">Hub Processing</span>
                            </div>

                            {/* Step 3: Shipped */}
                            <div className={`ac-timeline-step ${stepIndex >= 3 ? 'done' : ''} ${stepIndex === 3 ? 'active' : ''}`}>
                              <div className="ac-timeline-circle">{stepIndex > 3 ? '✓' : '3'}</div>
                              <div className="ac-timeline-bar" />
                              <span className="ac-timeline-label">Dispatched</span>
                            </div>

                            {/* Step 4: Out for Delivery */}
                            <div className={`ac-timeline-step ${stepIndex >= 4 ? 'done' : ''} ${stepIndex === 4 ? 'active' : ''}`}>
                              <div className="ac-timeline-circle">{stepIndex > 4 ? '✓' : '4'}</div>
                              <div className="ac-timeline-bar" />
                              <span className="ac-timeline-label">Out for Delivery</span>
                            </div>

                            {/* Step 5: Delivered */}
                            <div className={`ac-timeline-step ${stepIndex >= 5 ? 'done' : ''} ${stepIndex === 5 ? 'active' : ''}`}>
                              <div className="ac-timeline-circle">✓</div>
                              <span className="ac-timeline-label">Delivered</span>
                            </div>
                          </div>

                          {/* Carrier Tracking Box */}
                          <div className="ac-carrier-box">
                            <div>
                              <b>Carrier: {order.carrier}</b> · Tracking AWB:{' '}
                              <span className="mono" style={{ fontWeight: 600 }}>{order.trackingNumber}</span>
                              <div style={{ color: 'var(--steel, #5d5d64)', fontSize: '12px', marginTop: '2px' }}>
                                {order.statusMessage || `Estimated Arrival: ${order.estimatedDelivery}`}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                className="btn"
                                onClick={() => setTrackingModalOrder(order)}
                                style={{
                                  height: '32px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  background: '#fff',
                                  border: '1px solid #dcdbd5',
                                  padding: '0 12px',
                                }}
                              >
                                🗺 Live Tracking
                              </button>
                            </div>
                          </div>

                          {/* Order Items List */}
                          <div style={{ marginTop: '14px', borderTop: '1px solid #f0efe9', paddingTop: '14px' }}>
                            {order.items.map((item, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '12px',
                                  padding: '8px 0',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                  <div
                                    style={{
                                      width: '48px',
                                      height: '48px',
                                      borderRadius: '10px',
                                      background: '#f4f3ef',
                                      border: '1px solid #e2e1db',
                                      overflow: 'hidden',
                                      display: 'grid',
                                      placeItems: 'center',
                                      flexShrink: 0,
                                    }}
                                  >
                                    {item.image ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={item.image}
                                        alt={item.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      />
                                    ) : (
                                      <span style={{ fontSize: '20px' }}>🏎</span>
                                    )}
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink, #0e0e0f)' }}>
                                      {item.name}
                                    </div>
                                    <div className="gr-s" style={{ fontSize: '12px' }}>
                                      Qty: {item.quantity} · {formatINR(item.unitPrice)} each
                                      {item.category && (
                                        <span
                                          style={{
                                            marginLeft: '8px',
                                            padding: '1px 6px',
                                            background: '#f0efe9',
                                            borderRadius: '4px',
                                            fontSize: '10px',
                                            fontFamily: 'var(--mono)',
                                          }}
                                        >
                                          {item.category}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div style={{ fontWeight: 600, fontSize: '14px' }}>
                                  {formatINR(item.lineSubtotal)}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Action Footer */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: '10px',
                              marginTop: '16px',
                              paddingTop: '14px',
                              borderTop: '1px solid #f0efe9',
                              flexWrap: 'wrap',
                            }}
                          >
                            <button
                              type="button"
                              className="btn"
                              onClick={() => setInvoiceModalOrder(order)}
                              style={{ height: '36px', fontSize: '13px', padding: '0 14px' }}
                            >
                              📄 Download Tax Invoice
                            </button>
                            <button
                              type="button"
                              className="btn dark"
                              onClick={() => handleReorder(order)}
                              style={{ height: '36px', fontSize: '13px', padding: '0 16px', fontWeight: 600 }}
                            >
                              ↻ Re-Order Items
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 2: SAVED ADDRESSES (PRIMARY & SECONDARY)              */}
              {/* ========================================================= */}
              {activeTab === 'addresses' && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '14px',
                      marginBottom: '22px',
                    }}
                  >
                    <div>
                      <h2 className="disp" style={{ fontSize: '1.8rem' }}>
                        Shipping Addresses
                      </h2>
                      <p className="gr-s" style={{ fontSize: '13.5px' }}>
                        Manage primary delivery location and secondary workshop/office drop points.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn dark"
                      onClick={handleOpenAddAddress}
                      style={{ height: '42px', fontSize: '14px', fontWeight: 600 }}
                    >
                      + Add Secondary Address
                    </button>
                  </div>

                  {/* Primary Address Highlight */}
                  {primaryAddress && (
                    <div style={{ marginBottom: '24px' }}>
                      <div className="mono" style={{ fontSize: '11px', color: '#e2231a', fontWeight: 700, marginBottom: '8px' }}>
                        ★ PRIMARY / DEFAULT DELIVERY ADDRESS
                      </div>
                      <div className="ac-addr-card is-primary">
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span className="ac-addr-tag primary">{primaryAddress.label} · Default</span>
                            <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>✓ Auto-selected at Checkout</span>
                          </div>
                          <h3 style={{ fontSize: '17px', margin: '6px 0 2px' }}>{primaryAddress.name}</h3>
                          <div style={{ fontSize: '13px', color: 'var(--steel, #5d5d64)', marginBottom: '8px' }}>
                            📞 {primaryAddress.phone}
                          </div>
                          <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--ink, #0e0e0f)' }}>
                            {primaryAddress.addressLine1}
                            {primaryAddress.addressLine2 ? `, ${primaryAddress.addressLine2}` : ''}
                            {primaryAddress.landmark ? ` (Landmark: ${primaryAddress.landmark})` : ''}
                            <br />
                            {primaryAddress.city}, {primaryAddress.state} — <b>{primaryAddress.postalCode}</b>
                          </p>
                        </div>

                        <div className="ac-addr-actions">
                          <button
                            type="button"
                            className="btn"
                            onClick={() => handleOpenEditAddress(primaryAddress)}
                            style={{ height: '34px', fontSize: '13px', padding: '0 14px' }}
                          >
                            ✎ Edit Primary Address
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Secondary Addresses Section */}
                  <div>
                    <h3 className="mono" style={{ fontSize: '12px', letterSpacing: '0.1em', color: 'var(--steel, #5d5d64)', marginBottom: '14px' }}>
                      SECONDARY & SAVED ADDRESSES ({secondaryAddresses.length})
                    </h3>

                    {secondaryAddresses.length === 0 ? (
                      <div
                        style={{
                          background: '#fff',
                          border: '1px dashed var(--line, #dcdbd5)',
                          borderRadius: '16px',
                          padding: '36px 20px',
                          textAlign: 'center',
                        }}
                      >
                        <p style={{ color: 'var(--steel, #5d5d64)', fontSize: '14px', marginBottom: '14px' }}>
                          No secondary addresses added yet. Add your tuning workshop, studio, or trackside garage address.
                        </p>
                        <button
                          type="button"
                          className="btn"
                          onClick={handleOpenAddAddress}
                          style={{ height: '38px', fontSize: '13px' }}
                        >
                          + Add Address
                        </button>
                      </div>
                    ) : (
                      <div className="ac-addresses-grid">
                        {secondaryAddresses.map((addr) => (
                          <div key={addr.id} className="ac-addr-card">
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span className="ac-addr-tag">{addr.label}</span>
                              </div>
                              <h3 style={{ fontSize: '16px', margin: '4px 0 2px' }}>{addr.name}</h3>
                              <div style={{ fontSize: '13px', color: 'var(--steel, #5d5d64)', marginBottom: '8px' }}>
                                📞 {addr.phone}
                              </div>
                              <p style={{ fontSize: '13.5px', lineHeight: '1.5', color: 'var(--ink, #0e0e0f)' }}>
                                {addr.addressLine1}
                                {addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
                                {addr.landmark ? ` (${addr.landmark})` : ''}
                                <br />
                                {addr.city}, {addr.state} — <b>{addr.postalCode}</b>
                              </p>
                            </div>

                            <div className="ac-addr-actions">
                              <button
                                type="button"
                                className="btn"
                                onClick={() => setPrimaryAddress(addr.id)}
                                style={{
                                  height: '32px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  background: '#fff',
                                  border: '1px solid #dcdbd5',
                                  color: '#e2231a',
                                }}
                              >
                                ★ Set as Primary
                              </button>
                              <button
                                type="button"
                                className="btn"
                                onClick={() => handleOpenEditAddress(addr)}
                                style={{ height: '32px', fontSize: '12px', padding: '0 12px' }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn"
                                onClick={() => deleteAddress(addr.id)}
                                style={{ height: '32px', fontSize: '12px', padding: '0 12px', color: '#dc2626' }}
                              >
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
              {/* TAB 3: GARAGE & VEHICLE FITMENT                           */}
              {/* ========================================================= */}
              {activeTab === 'garage' && (
                <div style={{ maxWidth: '800px' }}>
                  <h2 className="disp" style={{ fontSize: '1.8rem', marginBottom: '6px' }}>
                    My Garage & Compatibility
                  </h2>
                  <p className="gr-s" style={{ fontSize: '14px', marginBottom: '24px' }}>
                    Every part on CARXEN is verified against your active garage vehicle for 100% bolt-on compatibility.
                  </p>

                  <div className="ac-card" style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '14px',
                            background: '#18181b',
                            color: '#fff',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: '24px',
                          }}
                        >
                          🏎
                        </div>
                        <div>
                          <div className="mono" style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>
                            ✓ ACTIVE VEHICLE
                          </div>
                          <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--disp)', margin: '2px 0' }}>
                            {car ? `${car.y} ${car.b} ${car.m}` : '2023 Porsche 911 GT3 (992)'}
                          </h3>
                          <div className="gr-s" style={{ fontSize: '13px' }}>
                            Engine/Trim: {car?.f || '4.0L Naturally Aspirated Flat-6 (502 HP)'}
                          </div>
                        </div>
                      </div>

                      <Link className="btn dark" href="/garage" style={{ height: '40px', fontSize: '13px' }}>
                        Change Vehicle
                      </Link>
                    </div>

                    <div
                      style={{
                        marginTop: '20px',
                        paddingTop: '16px',
                        borderTop: '1px solid #f0efe9',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '13px',
                        color: 'var(--steel, #5d5d64)',
                      }}
                    >
                      <span>🛡 CARXEN Fitment Guarantee:</span>
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>Active for this chassis</span>
                    </div>
                  </div>

                  {/* Quick Preset Garage Switches */}
                  <div className="ac-card">
                    <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Quick Switch Garage Vehicle</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setVehicle({ b: 'Porsche', m: '911 GT3 (992)', y: '2023', f: 'Petrol' })}
                        style={{ textAlign: 'left', padding: '12px 14px', height: 'auto', display: 'block' }}
                      >
                        <b>Porsche 911 GT3</b>
                        <small style={{ display: 'block', color: '#71717a' }}>2023 · Track Edition</small>
                      </button>

                      <button
                        type="button"
                        className="btn"
                        onClick={() => setVehicle({ b: 'BMW', m: 'M3 Competition (G80)', y: '2024', f: 'Petrol' })}
                        style={{ textAlign: 'left', padding: '12px 14px', height: 'auto', display: 'block' }}
                      >
                        <b>BMW M3 Competition</b>
                        <small style={{ display: 'block', color: '#71717a' }}>2024 · S58 Twin-Turbo</small>
                      </button>

                      <button
                        type="button"
                        className="btn"
                        onClick={() => setVehicle({ b: 'Toyota', m: 'GR Supra 3.0', y: '2022', f: 'Petrol' })}
                        style={{ textAlign: 'left', padding: '12px 14px', height: 'auto', display: 'block' }}
                      >
                        <b>Toyota GR Supra 3.0</b>
                        <small style={{ display: 'block', color: '#71717a' }}>2022 · B58 Inline-6</small>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 4: PAYMENT & BILLING                                  */}
              {/* ========================================================= */}
              {activeTab === 'payments' && (
                <div style={{ maxWidth: '820px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
                    <div>
                      <h2 className="disp" style={{ fontSize: '1.8rem' }}>
                        Payment Methods & Invoicing
                      </h2>
                      <p className="gr-s" style={{ fontSize: '13.5px' }}>
                        Saved UPI VPAs, cards, and tax billing details for 1-click checkout.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn dark"
                      onClick={() => setIsPaymentModalOpen(true)}
                      style={{ height: '40px', fontSize: '13px', fontWeight: 600 }}
                    >
                      + Add Payment Method
                    </button>
                  </div>

                  {/* Saved Payment Methods List */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                    {savedPayments.map((pm) => (
                      <div
                        key={pm.id}
                        className="ac-card"
                        style={{
                          border: pm.isDefault ? '2px solid #e2231a' : '1px solid var(--line, #e2e1db)',
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span className="mono" style={{ fontSize: '11px', fontWeight: 700, color: '#333' }}>
                            {pm.type === 'upi' ? '⚡ UPI ID' : `💳 ${pm.brand || 'CARD'}`}
                          </span>
                          {pm.isDefault && (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#e2231a', background: '#fee2e2', padding: '2px 8px', borderRadius: '4px' }}>
                              DEFAULT
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink, #0e0e0f)' }}>
                          {pm.type === 'card' ? `•••• •••• •••• ${pm.last4OrVpa}` : pm.last4OrVpa}
                        </div>
                        {pm.expiry && (
                          <div className="gr-s" style={{ fontSize: '12px', marginTop: '2px' }}>
                            Expires: {pm.expiry}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f0efe9' }}>
                          {!pm.isDefault && (
                            <button
                              type="button"
                              className="btn"
                              onClick={() => setDefaultPayment(pm.id)}
                              style={{ height: '30px', fontSize: '12px', padding: '0 10px' }}
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn"
                            onClick={() => deleteSavedPayment(pm.id)}
                            style={{ height: '30px', fontSize: '12px', padding: '0 10px', color: '#dc2626' }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* GST & Business Billing Preferences */}
                  <div className="ac-card">
                    <h3 style={{ fontSize: '17px', marginBottom: '6px' }}>Business GST Invoicing</h3>
                    <p className="gr-s" style={{ fontSize: '13px', marginBottom: '16px' }}>
                      Enable this to automatically generate compliant B2B tax invoices with your business GSTIN for tax credits.
                    </p>

                    <form onSubmit={handleSaveGst}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={gstForm.enabled}
                          onChange={(e) => setGstForm({ ...gstForm, enabled: e.target.checked })}
                          style={{ width: '18px', height: '18px', accentColor: '#e2231a' }}
                        />
                        <span style={{ fontSize: '14px', fontWeight: 600 }}>
                          I require GST tax invoices for my business/company
                        </span>
                      </label>

                      {gstForm.enabled && (
                        <div className="ac-form-grid" style={{ marginBottom: '16px' }}>
                          <div className="ac-input-group">
                            <label>Registered Company Name</label>
                            <input
                              type="text"
                              value={gstForm.companyName}
                              onChange={(e) => setGstForm({ ...gstForm, companyName: e.target.value })}
                              placeholder="e.g. Apex Motoring Pvt Ltd"
                              className="ac-input-control"
                              required
                            />
                          </div>

                          <div className="ac-input-group">
                            <label>15-Digit GSTIN Number</label>
                            <input
                              type="text"
                              value={gstForm.gstin}
                              onChange={(e) => setGstForm({ ...gstForm, gstin: e.target.value.toUpperCase() })}
                              placeholder="e.g. 27AAAAA0000A1Z5"
                              maxLength={15}
                              className="ac-input-control"
                              required
                            />
                          </div>
                        </div>
                      )}

                      <button type="submit" className="btn dark" style={{ height: '38px', fontSize: '13px' }}>
                        Save GST Billing Details
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 5: SETTINGS & SECURITY                                */}
              {/* ========================================================= */}
              {activeTab === 'security' && (
                <div style={{ maxWidth: '780px' }}>
                  <h2 className="disp" style={{ fontSize: '1.8rem', marginBottom: '6px' }}>
                    Account Settings & Security
                  </h2>
                  <p className="gr-s" style={{ fontSize: '13.5px', marginBottom: '24px' }}>
                    Configure communication alerts, update your security password, and manage active device sessions.
                  </p>

                  {/* Communication Preferences */}
                  <div className="ac-card" style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '17px', marginBottom: '14px' }}>Notification & Tracking Preferences</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600 }}>WhatsApp Delivery Alerts</div>
                          <div className="gr-s" style={{ fontSize: '12px' }}>Receive instant dispatch and out-for-delivery alerts via WhatsApp</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={communicationPrefs.whatsappUpdates}
                          onChange={(e) => updateCommunicationPrefs({ whatsappUpdates: e.target.checked })}
                          style={{ width: '20px', height: '20px', accentColor: '#e2231a' }}
                        />
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600 }}>SMS Order Tracking</div>
                          <div className="gr-s" style={{ fontSize: '12px' }}>Receive critical courier OTP and delivery arrival SMS</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={communicationPrefs.smsAlerts}
                          onChange={(e) => updateCommunicationPrefs({ smsAlerts: e.target.checked })}
                          style={{ width: '20px', height: '20px', accentColor: '#e2231a' }}
                        />
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600 }}>Garage Fitment & Maintenance Reminders</div>
                          <div className="gr-s" style={{ fontSize: '12px' }}>Periodic brake fluid, pad wear, and seasonal tire tune notifications</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={communicationPrefs.garageFitmentAlerts}
                          onChange={(e) => updateCommunicationPrefs({ garageFitmentAlerts: e.target.checked })}
                          style={{ width: '20px', height: '20px', accentColor: '#e2231a' }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Password Change Form */}
                  <div className="ac-card" style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '17px', marginBottom: '4px' }}>Change Account Password</h3>
                    <p className="gr-s" style={{ fontSize: '13px', marginBottom: '16px' }}>
                      Ensure your password has at least 6 characters and mixed letters/digits.
                    </p>

                    <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div className="ac-input-group">
                        <label>Current Password</label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          className="ac-input-control"
                          required
                        />
                      </div>

                      <div className="ac-form-grid" style={{ margin: 0 }}>
                        <div className="ac-input-group">
                          <label>New Password</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            className="ac-input-control"
                            required
                          />
                        </div>
                        <div className="ac-input-group">
                          <label>Confirm New Password</label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="ac-input-control"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <button
                          type="submit"
                          className="btn dark"
                          disabled={isPasswordSubmitting}
                          style={{ height: '40px', fontSize: '13px', fontWeight: 600 }}
                        >
                          {isPasswordSubmitting ? 'Updating...' : 'Update Password'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Active Device Session */}
                  <div className="ac-card">
                    <h3 style={{ fontSize: '17px', marginBottom: '12px' }}>Active Sessions</h3>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>💻</span>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600 }}>Current Browser Session</div>
                          <div className="gr-s" style={{ fontSize: '12px' }}>Windows 11 · Pune, India · Active Now</div>
                        </div>
                      </div>
                      <span style={{ color: '#16a34a', fontSize: '12px', fontWeight: 700 }}>● ONLINE</span>
                    </div>

                    <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f0efe9' }}>
                      <button
                        type="button"
                        className="btn"
                        onClick={handleSignOut}
                        style={{ color: '#dc2626', height: '36px', fontSize: '13px' }}
                      >
                        Sign out of all devices
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ================================================================= */}
      {/* MODAL 1: EDIT PROFILE IMAGE / AVATAR MODAL                         */}
      {/* ================================================================= */}
      {isAvatarModalOpen && (
        <div className="ac-modal-overlay" onClick={() => setIsAvatarModalOpen(false)}>
          <div className="ac-modal-window" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 className="disp" style={{ fontSize: '1.6rem' }}>
                Change Profile Image
              </h3>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                style={{ fontSize: '20px', cursor: 'pointer', color: '#888' }}
              >
                ✕
              </button>
            </div>

            <p className="gr-s" style={{ fontSize: '13.5px', marginBottom: '18px' }}>
              Upload your personal photo or select from curated CARXEN motorsport driver avatars.
            </p>

            {/* Custom File Upload Option */}
            <div style={{ marginBottom: '22px' }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="btn dark"
                onClick={() => fileInputRef.current?.click()}
                style={{ width: '100%', height: '44px', fontSize: '14px', fontWeight: 600 }}
              >
                📁 Upload Custom Image from Device
              </button>
            </div>

            {/* Motorsport Avatar Presets */}
            <div style={{ marginBottom: '20px' }}>
              <div className="mono" style={{ fontSize: '11px', color: '#555', marginBottom: '10px' }}>
                SELECT DRIVER AVATAR PRESET
              </div>
              <div className="ac-avatar-pick-grid">
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`ac-avatar-preset-btn ${avatarUrl === preset.url ? 'selected' : ''}`}
                    onClick={() => handleSelectPresetAvatar(preset.url)}
                    title={preset.label}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preset.url}
                      alt={preset.label}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Image URL input */}
            <div style={{ marginBottom: '20px' }}>
              <div className="mono" style={{ fontSize: '11px', color: '#555', marginBottom: '8px' }}>
                OR ENTER IMAGE URL
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="url"
                  placeholder="https://..."
                  value={avatarCustomUrl}
                  onChange={(e) => setAvatarCustomUrl(e.target.value)}
                  className="ac-input-control"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn"
                  onClick={handleSaveCustomAvatarUrl}
                  style={{ height: '44px', padding: '0 16px' }}
                >
                  Save
                </button>
              </div>
            </div>

            {avatarUrl && (
              <div style={{ textAlign: 'center', paddingTop: '10px', borderTop: '1px solid #f0efe9' }}>
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  style={{ color: '#dc2626', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Remove current photo & reset to monogram
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 2: EDIT PROFILE / PHONE NUMBER MODAL                        */}
      {/* ================================================================= */}
      {isProfileModalOpen && (
        <div className="ac-modal-overlay" onClick={() => setIsProfileModalOpen(false)}>
          <div className="ac-modal-window" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 className="disp" style={{ fontSize: '1.6rem' }}>
                Edit Driver Profile
              </h3>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                style={{ fontSize: '20px', cursor: 'pointer', color: '#888' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile}>
              <div className="ac-input-group" style={{ marginBottom: '14px' }}>
                <label>Driver Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="ac-input-control"
                  required
                />
              </div>

              <div className="ac-input-group" style={{ marginBottom: '14px' }}>
                <label>Contact Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+91 98201 44829"
                  className="ac-input-control"
                  required
                />
                <small className="gr-s" style={{ fontSize: '11px', display: 'block', marginTop: '4px' }}>
                  Used for order delivery confirmations & WhatsApp courier alerts.
                </small>
              </div>

              <div className="ac-input-group" style={{ marginBottom: '20px' }}>
                <label>Account Email (Read-Only)</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="ac-input-control"
                  style={{ opacity: 0.65, cursor: 'not-allowed' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setIsProfileModalOpen(false)}
                  style={{ height: '42px', padding: '0 18px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn dark"
                  style={{ height: '42px', padding: '0 22px', fontWeight: 600 }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 3: ADD / EDIT ADDRESS MODAL                                 */}
      {/* ================================================================= */}
      {isAddressModalOpen && (
        <div className="ac-modal-overlay" onClick={() => setIsAddressModalOpen(false)}>
          <div className="ac-modal-window" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 className="disp" style={{ fontSize: '1.6rem' }}>
                {editingAddress ? 'Edit Delivery Address' : 'Add New Address'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                style={{ fontSize: '20px', cursor: 'pointer', color: '#888' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAddress}>
              {/* Address Tag Selector */}
              <div style={{ marginBottom: '14px' }}>
                <label className="mono" style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '6px' }}>
                  ADDRESS LABEL / TYPE
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['Home', 'Office', 'Garage & Workshop', 'Other'].map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setAddressForm({ ...addressForm, label: lbl })}
                      className={`btn ${addressForm.label === lbl ? 'dark' : ''}`}
                      style={{ height: '34px', fontSize: '12px', padding: '0 12px' }}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ac-form-grid">
                <div className="ac-input-group">
                  <label>Recipient Name</label>
                  <input
                    type="text"
                    value={addressForm.name}
                    onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                    className="ac-input-control"
                    required
                  />
                </div>

                <div className="ac-input-group">
                  <label>10-Digit Mobile Number</label>
                  <input
                    type="tel"
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    className="ac-input-control"
                    required
                  />
                </div>

                <div className="ac-input-group ac-form-full">
                  <label>Address Line 1 (Flat, House no., Building, Street)</label>
                  <input
                    type="text"
                    value={addressForm.addressLine1}
                    onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
                    className="ac-input-control"
                    required
                  />
                </div>

                <div className="ac-input-group">
                  <label>Area / Locality</label>
                  <input
                    type="text"
                    value={addressForm.addressLine2}
                    onChange={(e) => setAddressForm({ ...addressForm, addressLine2: e.target.value })}
                    className="ac-input-control"
                  />
                </div>

                <div className="ac-input-group">
                  <label>Landmark (Optional)</label>
                  <input
                    type="text"
                    value={addressForm.landmark}
                    onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                    className="ac-input-control"
                  />
                </div>

                <div className="ac-input-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="ac-input-control"
                    required
                  />
                </div>

                <div className="ac-input-group">
                  <label>State</label>
                  <input
                    type="text"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    className="ac-input-control"
                    required
                  />
                </div>

                <div className="ac-input-group ac-form-full">
                  <label>6-Digit Pincode</label>
                  <input
                    type="text"
                    value={addressForm.postalCode}
                    onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                    maxLength={6}
                    className="ac-input-control"
                    required
                  />
                </div>
              </div>

              <div style={{ margin: '18px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={addressForm.isPrimary}
                    onChange={(e) => setAddressForm({ ...addressForm, isPrimary: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#e2231a' }}
                  />
                  <span style={{ fontSize: '13.5px', fontWeight: 600 }}>Set as default primary delivery address</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setIsAddressModalOpen(false)}
                  style={{ height: '42px', padding: '0 18px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn dark"
                  style={{ height: '42px', padding: '0 22px', fontWeight: 600 }}
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 4: ADD PAYMENT METHOD MODAL                                 */}
      {/* ================================================================= */}
      {isPaymentModalOpen && (
        <div className="ac-modal-overlay" onClick={() => setIsPaymentModalOpen(false)}>
          <div className="ac-modal-window" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 className="disp" style={{ fontSize: '1.6rem' }}>
                Add Payment Method
              </h3>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                style={{ fontSize: '20px', cursor: 'pointer', color: '#888' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
              <button
                type="button"
                onClick={() => setPaymentType('card')}
                className={`btn ${paymentType === 'card' ? 'dark' : ''}`}
                style={{ flex: 1, height: '40px' }}
              >
                💳 Credit / Debit Card
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('upi')}
                className={`btn ${paymentType === 'upi' ? 'dark' : ''}`}
                style={{ flex: 1, height: '40px' }}
              >
                ⚡ UPI ID (VPA)
              </button>
            </div>

            <form onSubmit={handleSavePaymentMethod}>
              {paymentType === 'card' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="ac-input-group">
                    <label>Card Number</label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      value={newCardNumber}
                      onChange={(e) => setNewCardNumber(e.target.value)}
                      maxLength={19}
                      className="ac-input-control"
                      required
                    />
                  </div>
                  <div className="ac-form-grid" style={{ margin: 0 }}>
                    <div className="ac-input-group">
                      <label>Cardholder Name</label>
                      <input
                        type="text"
                        placeholder="Driver Name"
                        value={newCardName}
                        onChange={(e) => setNewCardName(e.target.value)}
                        className="ac-input-control"
                        required
                      />
                    </div>
                    <div className="ac-input-group">
                      <label>Expiry (MM/YY)</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={newCardExpiry}
                        onChange={(e) => setNewCardExpiry(e.target.value)}
                        maxLength={5}
                        className="ac-input-control"
                        required
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="ac-input-group">
                  <label>UPI Virtual Payment Address (VPA)</label>
                  <input
                    type="text"
                    placeholder="e.g. driver@okhdfcbank"
                    value={newUpiId}
                    onChange={(e) => setNewUpiId(e.target.value)}
                    className="ac-input-control"
                    required
                  />
                  <small className="gr-s" style={{ fontSize: '11px', display: 'block', marginTop: '4px' }}>
                    Supports Google Pay, PhonePe, Paytm, BHIM and all major bank UPI IDs.
                  </small>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setIsPaymentModalOpen(false)}
                  style={{ height: '42px', padding: '0 18px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn dark"
                  style={{ height: '42px', padding: '0 22px', fontWeight: 600 }}
                >
                  Save Method
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 5: SHIPMENT TRACKING ACTIVITY MODAL                         */}
      {/* ================================================================= */}
      {trackingModalOrder && (
        <div className="ac-modal-overlay" onClick={() => setTrackingModalOrder(null)}>
          <div className="ac-modal-window" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 className="disp" style={{ fontSize: '1.6rem' }}>
                  Live Shipment Tracking
                </h3>
                <span className="mono" style={{ fontSize: '12px', color: '#e2231a' }}>
                  AWB: {trackingModalOrder.trackingNumber} · {trackingModalOrder.carrier}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTrackingModalOrder(null)}
                style={{ fontSize: '20px', cursor: 'pointer', color: '#888' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#f8f8f6', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', color: 'var(--steel, #5d5d64)' }}>Current Status:</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink, #0e0e0f)', marginTop: '2px' }}>
                {trackingModalOrder.statusMessage || 'In Transit to Destination'}
              </div>
              <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, marginTop: '4px' }}>
                {trackingModalOrder.estimatedDelivery}
              </div>
            </div>

            {/* Event Log */}
            <div style={{ borderLeft: '2px solid #e2231a', paddingLeft: '18px', marginLeft: '8px' }}>
              <div style={{ position: 'relative', marginBottom: '18px' }}>
                <div style={{ position: 'absolute', left: '-24px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', background: '#e2231a' }} />
                <div style={{ fontWeight: 600, fontSize: '13.5px' }}>Out for Delivery with Courier Agent</div>
                <div className="gr-s" style={{ fontSize: '12px' }}>Baner Distribution Facility · Today, 08:30 AM</div>
              </div>

              <div style={{ position: 'relative', marginBottom: '18px' }}>
                <div style={{ position: 'absolute', left: '-24px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                <div style={{ fontWeight: 600, fontSize: '13.5px' }}>Arrived at Destination City Hub</div>
                <div className="gr-s" style={{ fontSize: '12px' }}>Pune Air Cargo Terminal · Yesterday, 09:45 PM</div>
              </div>

              <div style={{ position: 'relative', marginBottom: '18px' }}>
                <div style={{ position: 'absolute', left: '-24px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                <div style={{ fontWeight: 600, fontSize: '13.5px' }}>Quality Check Passed & Dispatched from Central Warehouse</div>
                <div className="gr-s" style={{ fontSize: '12px' }}>CARXEN Fulfillment Hub 01, Mumbai · Oct 12, 02:15 PM</div>
              </div>

              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-24px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                <div style={{ fontWeight: 600, fontSize: '13.5px' }}>Order Placed & Payment Verified</div>
                <div className="gr-s" style={{ fontSize: '12px' }}>CARXEN Online Storefront · Oct 12, 11:20 AM</div>
              </div>
            </div>

            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <button
                type="button"
                className="btn dark"
                onClick={() => setTrackingModalOrder(null)}
                style={{ height: '38px', padding: '0 20px' }}
              >
                Close Tracking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 6: TAX INVOICE PRINTABLE MODAL                              */}
      {/* ================================================================= */}
      {invoiceModalOrder && (
        <div className="ac-modal-overlay" onClick={() => setInvoiceModalOrder(null)}>
          <div
            className="ac-modal-window"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '680px', padding: '36px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: '16px' }}>
              <div>
                <h2 className="disp" style={{ fontSize: '2rem', letterSpacing: '0.04em' }}>CARXEN</h2>
                <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: '#444' }}>
                  PERFORMANCE AUTOMOTIVE ENGINEERING<br />
                  GSTIN: 27AABCC8920D1ZE · TAN: PNE091823<br />
                  Baner, Pune, MH 411045, India
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: '11px', fontWeight: 700, color: '#e2231a' }}>
                  TAX INVOICE
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>
                  INV-2026-{invoiceModalOrder.orderNumber}
                </div>
                <div className="gr-s" style={{ fontSize: '12px' }}>
                  Date: {new Date(invoiceModalOrder.placedAt).toLocaleDateString('en-IN')}
                </div>
              </div>
            </div>

            {/* Bill To / Ship To */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', margin: '18px 0', fontSize: '13px' }}>
              <div>
                <b>Billed To:</b>
                <div>{invoiceModalOrder.shippingAddress.name}</div>
                <div>{invoiceModalOrder.shippingAddress.addressLine1}</div>
                <div>{invoiceModalOrder.shippingAddress.city}, {invoiceModalOrder.shippingAddress.postalCode}</div>
                <div>Phone: {invoiceModalOrder.shippingAddress.phone}</div>
              </div>
              <div>
                <b>Order Details:</b>
                <div>Order Ref: #{invoiceModalOrder.orderNumber}</div>
                <div>Payment Method: {invoiceModalOrder.paymentMethod}</div>
                <div>Payment Status: {invoiceModalOrder.paymentStatus}</div>
                <div>Carrier: {invoiceModalOrder.carrier}</div>
              </div>
            </div>

            {/* Line items table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '16px 0', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f5f5f7', borderBottom: '1px solid #ddd' }}>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Item Description</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>HSN</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Unit Price</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {invoiceModalOrder.items.map((it, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px' }}>{it.name}</td>
                    <td style={{ textAlign: 'center', padding: '8px', fontFamily: 'var(--mono)', fontSize: '11px' }}>8708.29</td>
                    <td style={{ textAlign: 'center', padding: '8px' }}>{it.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '8px' }}>{formatINR(it.unitPrice)}</td>
                    <td style={{ textAlign: 'right', padding: '8px' }}>{formatINR(it.lineSubtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
              <div style={{ width: '240px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>Subtotal:</span>
                  <span>{formatINR(invoiceModalOrder.subtotal)}</span>
                </div>
                {invoiceModalOrder.discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#16a34a' }}>
                    <span>Savings / Discount:</span>
                    <span>- {formatINR(invoiceModalOrder.discountAmount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>Shipping & Delivery:</span>
                  <span>{invoiceModalOrder.shippingAmount === 0 ? 'FREE' : formatINR(invoiceModalOrder.shippingAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid #000', fontWeight: 700, fontSize: '15px' }}>
                  <span>Grand Total (INR):</span>
                  <span>{formatINR(invoiceModalOrder.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e5ea' }}>
              <button
                type="button"
                className="btn dark"
                onClick={() => window.print()}
                style={{ height: '38px', fontSize: '13px', fontWeight: 600 }}
              >
                🖨 Print / Save PDF
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setInvoiceModalOrder(null)}
                style={{ height: '38px', fontSize: '13px' }}
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

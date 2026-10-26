'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { WholesaleIcon } from '@/components/wholesale/WholesaleIcon';
import type { CustomerAddress } from '@/types/customer';
import {
  PhoneCall,
  Mail,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Building2,
  ArrowRight,
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
  Check,
  Warehouse,
  ExternalLink,
} from 'lucide-react';
import '../wholesale.css';

const WAREHOUSE_LABEL_PRESETS = [
  'Central Workshop & Warehouse',
  'Regional Distribution Hub',
  'Secondary Fitting Studio',
  'Showroom Fitting Depot',
  'Assembly & Logistics Unit',
  'Branch Workshop 2',
];

export default function WholesaleAccountPage() {
  const router = useRouter();
  const {
    user,
    b2bProfile,
    isWholesaleApproved,
    authLoading,
    logout,
    updateB2bProfile,
    addresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setPrimaryAddress,
    showToast,
    openSupportModal,
  } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Business Profile Form Data
  const [formData, setFormData] = useState({
    businessName: '',
    tradeName: '',
    gstin: '',
    pan: '',
    contactPerson: '',
    phone: '',
    businessType: 'Automotive Accessories Wholesaler / Dealer',
    businessAddress: '',
    city: '',
    state: '',
    pincode: '',
  });

  // Warehouse Address Modal State
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [addrForm, setAddrForm] = useState({
    label: 'Central Workshop & Warehouse',
    name: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    city: '',
    state: '',
    postalCode: '',
    isPrimary: false,
  });

  // Strict B2B verification gate
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login?redirect=/wholesale/account');
      } else if (!isWholesaleApproved) {
        router.replace('/wholesale');
      }
    }
  }, [authLoading, isWholesaleApproved, router, user]);

  // Sync state from profile
  useEffect(() => {
    if (b2bProfile || user) {
      setFormData({
        businessName: b2bProfile?.businessName || user?.name || '',
        tradeName: b2bProfile?.tradeName || '',
        gstin: b2bProfile?.gstin || '',
        pan: b2bProfile?.pan || '',
        contactPerson: user?.name || '',
        phone: user?.phone || '',
        businessType: b2bProfile?.businessType || 'Automotive Accessories Wholesaler / Dealer',
        businessAddress: b2bProfile?.businessAddress || '',
        city: b2bProfile?.city || '',
        state: b2bProfile?.state || '',
        pincode: b2bProfile?.pincode || '',
      });
    }
  }, [b2bProfile, user]);

  if (authLoading || !user || !isWholesaleApproved) {
    return null;
  }

  const businessName = b2bProfile?.businessName || user?.name || 'Authorized Automotive Partner';

  // Save Business Profile changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.businessName.trim()) {
      showToast('Please enter the Legal Entity Name');
      return;
    }
    setIsSaving(true);
    await updateB2bProfile({
      businessName: formData.businessName.trim(),
      tradeName: formData.tradeName.trim(),
      gstin: formData.gstin.trim().toUpperCase(),
      pan: formData.pan.trim().toUpperCase(),
      name: formData.contactPerson.trim(),
      phone: formData.phone.trim(),
      businessType: formData.businessType,
      businessAddress: formData.businessAddress.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
    });
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      businessName: b2bProfile?.businessName || user?.name || '',
      tradeName: b2bProfile?.tradeName || '',
      gstin: b2bProfile?.gstin || '',
      pan: b2bProfile?.pan || '',
      contactPerson: user?.name || '',
      phone: user?.phone || '',
      businessType: b2bProfile?.businessType || 'Automotive Accessories Wholesaler / Dealer',
      businessAddress: b2bProfile?.businessAddress || '',
      city: b2bProfile?.city || '',
      state: b2bProfile?.state || '',
      pincode: b2bProfile?.pincode || '',
    });
    setIsEditing(false);
  };

  // Open Add Warehouse Modal
  const handleOpenAddAddress = () => {
    setEditingAddress(null);
    setAddrForm({
      label: addresses.length === 0 ? 'Central Workshop & Warehouse' : 'Regional Distribution Hub',
      name: user?.name || 'Warehouse Manager',
      phone: user?.phone || '+91 98765 43210',
      addressLine1: '',
      addressLine2: '',
      landmark: '',
      city: b2bProfile?.city || '',
      state: b2bProfile?.state || '',
      postalCode: b2bProfile?.pincode || '',
      isPrimary: addresses.length === 0,
    });
    setShowAddressModal(true);
  };

  // Open Edit Warehouse Modal
  const handleOpenEditAddress = (addr: CustomerAddress) => {
    setEditingAddress(addr);
    setAddrForm({
      label: addr.label || 'Central Workshop & Warehouse',
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
    setShowAddressModal(true);
  };

  // Save Warehouse Modal
  const handleSaveAddressModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrForm.addressLine1.trim() || !addrForm.city.trim() || !addrForm.postalCode.trim()) {
      showToast('Address Line 1, City, and PIN Code are required');
      return;
    }

    if (editingAddress) {
      updateAddress(editingAddress.id, {
        label: addrForm.label.trim(),
        name: addrForm.name.trim() || (user?.name || 'Warehouse Manager'),
        phone: addrForm.phone.trim() || (user?.phone || ''),
        addressLine1: addrForm.addressLine1.trim(),
        addressLine2: addrForm.addressLine2.trim() || undefined,
        landmark: addrForm.landmark.trim() || undefined,
        city: addrForm.city.trim(),
        state: addrForm.state.trim(),
        postalCode: addrForm.postalCode.trim(),
        isPrimary: addrForm.isPrimary,
      });

      if (addrForm.isPrimary) {
        setPrimaryAddress(editingAddress.id);
        void updateB2bProfile({
          businessAddress: addrForm.addressLine1.trim(),
          city: addrForm.city.trim(),
          state: addrForm.state.trim(),
          pincode: addrForm.postalCode.trim(),
        });
      }
      showToast(`Updated "${addrForm.label.trim()}"`);
    } else {
      const willBePrimary = addrForm.isPrimary || addresses.length === 0;
      addAddress({
        label: addrForm.label.trim(),
        name: addrForm.name.trim() || (user?.name || 'Warehouse Manager'),
        phone: addrForm.phone.trim() || (user?.phone || ''),
        addressLine1: addrForm.addressLine1.trim(),
        addressLine2: addrForm.addressLine2.trim() || undefined,
        landmark: addrForm.landmark.trim() || undefined,
        city: addrForm.city.trim(),
        state: addrForm.state.trim(),
        postalCode: addrForm.postalCode.trim(),
        country: 'India',
        isPrimary: willBePrimary,
      });

      if (willBePrimary) {
        void updateB2bProfile({
          businessAddress: addrForm.addressLine1.trim(),
          city: addrForm.city.trim(),
          state: addrForm.state.trim(),
          pincode: addrForm.postalCode.trim(),
        });
      }
      showToast(`Added new warehouse "${addrForm.label.trim()}"`);
    }

    setShowAddressModal(false);
  };

  // Delete Warehouse Address
  const handleDeleteAddress = (id: string, label: string) => {
    if (addresses.length <= 1) {
      showToast('At least one warehouse dispatch address must be registered');
      return;
    }
    deleteAddress(id);
    showToast(`Removed warehouse "${label}"`);
  };

  // Set Address as Primary
  const handleSetPrimary = (addr: CustomerAddress) => {
    setPrimaryAddress(addr.id);
    void updateB2bProfile({
      businessAddress: addr.addressLine1,
      city: addr.city,
      state: addr.state,
      pincode: addr.postalCode,
    });
    showToast(`"${addr.label}" set as Primary Factory Dispatch Point`);
  };

  return (
    <div className="ws-page-container">
      {/* Header Bar */}
      <div className="ws-header-bar">
        <div className="ws-header-titles">
          <div className="ws-breadcrumb-kicker">
            <WholesaleIcon name="shield" size={13} strokeWidth={2} />
            <span>Enterprise Identity &amp; Verified Wholesale Account</span>
          </div>
          <h1>
            <WholesaleIcon name="account" size={26} strokeWidth={2} />
            <span>Commercial Business Profile & Tax Registry</span>
          </h1>
          <p>
            Enterprise profile, verified GSTIN identity, multi-warehouse dispatch locations, active volume pricing tiers, and assigned CarXen account manager.
          </p>
        </div>
        <div className="ws-header-actions">
          {!isEditing ? (
            <button
              type="button"
              className="ws-btn-secondary"
              onClick={() => setIsEditing(true)}
              style={{ gap: '7px' }}
            >
              <Edit3 size={15} />
              <span>Edit Business Profile</span>
            </button>
          ) : (
            <button
              type="button"
              className="ws-btn-secondary"
              onClick={handleCancel}
              style={{ gap: '7px' }}
            >
              <X size={15} />
              <span>Cancel Editing</span>
            </button>
          )}

          <button
            type="button"
            className="ws-btn-secondary"
            onClick={async () => {
              await logout();
              router.push('/login');
            }}
          >
            Sign out
          </button>
          <Link href="/wholesale/order-basket" className="ws-btn-primary">
            <WholesaleIcon name="basket" size={15} strokeWidth={2} />
            <span>Order Basket</span>
          </Link>
        </div>
      </div>

      <div className="ws-basket-layout">
        {/* Left Column: Business Details & Multi-Warehouse List OR Edit Form */}
        <div>
          {isEditing ? (
            /* Editable Business Profile Form */
            <form onSubmit={handleSaveProfile} className="ws-edit-form-card">
              <div className="ws-card-header">
                <h2>
                  <Edit3 size={18} />
                  <span>Edit Enterprise Profile & Tax Records</span>
                </h2>
                <span
                  style={{
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                  }}
                >
                  Modifying Commercial Details
                </span>
              </div>

              <div className="ws-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                {/* Section 1: Entity & Tax Information */}
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', marginBottom: '14px' }}>
                    1. Enterprise Legal Identity & Tax Registrations
                  </h4>
                  <div className="ws-form-grid-2">
                    <div className="ws-form-group">
                      <label className="ws-form-label">
                        <span>Legal Entity Name</span>
                        <span className="ws-form-label-req">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="ws-form-control"
                        placeholder="e.g. Apex Auto Enterprises Pvt Ltd"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      />
                    </div>

                    <div className="ws-form-group">
                      <label className="ws-form-label">
                        <span>Trade / Outlet / Brand Name</span>
                      </label>
                      <input
                        type="text"
                        className="ws-form-control"
                        placeholder="e.g. Apex Motor Hub"
                        value={formData.tradeName}
                        onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                      />
                    </div>

                    <div className="ws-form-group">
                      <label className="ws-form-label">
                        <span>GSTIN (For 100% Input Tax Credit)</span>
                      </label>
                      <input
                        type="text"
                        maxLength={15}
                        className="ws-form-control mono"
                        placeholder="22AAAAA0000A1Z5"
                        value={formData.gstin}
                        onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                      />
                    </div>

                    <div className="ws-form-group">
                      <label className="ws-form-label">
                        <span>Company / Proprietor PAN</span>
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        className="ws-form-control mono"
                        placeholder="ABCDE1234F"
                        value={formData.pan}
                        onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                      />
                    </div>

                    <div className="ws-form-group full-width">
                      <label className="ws-form-label">
                        <span>Commercial Business Category</span>
                      </label>
                      <select
                        className="ws-form-control"
                        value={formData.businessType}
                        onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                      >
                        <option value="Automotive Accessories Wholesaler / Dealer">Automotive Accessories Wholesaler / Dealer</option>
                        <option value="Authorized OEM Car Dealership">Authorized OEM Car Dealership</option>
                        <option value="Vehicle Customization & Styling Studio">Vehicle Customization & Styling Studio</option>
                        <option value="Detailing, Tint & PPF Center">Detailing, Tint & PPF Center</option>
                        <option value="Fleet Operator / Commercial Procurement">Fleet Operator / Commercial Procurement</option>
                        <option value="Multi-Brand Service Workshop">Multi-Brand Service Workshop</option>
                        <option value="Other">Other Enterprise Commercial</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Authorized Representative */}
                <div style={{ paddingTop: '16px', borderTop: '1px solid var(--ws-border-light)' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', marginBottom: '14px' }}>
                    2. Authorized Representative & PO Desk
                  </h4>
                  <div className="ws-form-grid-2">
                    <div className="ws-form-group">
                      <label className="ws-form-label">
                        <span>Authorized Buyer Name</span>
                        <span className="ws-form-label-req">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="ws-form-control"
                        placeholder="Full name of representative"
                        value={formData.contactPerson}
                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      />
                    </div>

                    <div className="ws-form-group">
                      <label className="ws-form-label">
                        <span>Direct Phone & WhatsApp</span>
                        <span className="ws-form-label-req">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        className="ws-form-control"
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Central Warehouse Dispatch Address */}
                <div style={{ paddingTop: '16px', borderTop: '1px solid var(--ws-border-light)' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', marginBottom: '14px' }}>
                    3. Central Workshop & Warehouse Dispatch Address
                  </h4>
                  <div className="ws-form-grid-2">
                    <div className="ws-form-group full-width">
                      <label className="ws-form-label">
                        <span>Registered Street Address / Plot / Unit</span>
                        <span className="ws-form-label-req">*</span>
                      </label>
                      <textarea
                        required
                        className="ws-form-control"
                        placeholder="Plot number, industrial area, road name"
                        value={formData.businessAddress}
                        onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                      />
                    </div>

                    <div className="ws-form-group">
                      <label className="ws-form-label">
                        <span>City / District</span>
                        <span className="ws-form-label-req">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="ws-form-control"
                        placeholder="e.g. Gurugram"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>

                    <div className="ws-form-group">
                      <label className="ws-form-label">
                        <span>State</span>
                        <span className="ws-form-label-req">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="ws-form-control"
                        placeholder="e.g. Haryana"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      />
                    </div>

                    <div className="ws-form-group">
                      <label className="ws-form-label">
                        <span>Postal PIN Code</span>
                        <span className="ws-form-label-req">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        className="ws-form-control mono"
                        placeholder="122015"
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="ws-form-actions-bar">
                <button
                  type="button"
                  className="ws-btn-secondary"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ws-btn-primary"
                  disabled={isSaving}
                  style={{ minWidth: '150px' }}
                >
                  {isSaving ? (
                    <span>Saving Changes...</span>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>Save Business Profile</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Business Entity Card */}
              <div className="ws-card">
                <div className="ws-card-header">
                  <h2>
                    <WholesaleIcon name="invoice" size={18} strokeWidth={2} />
                    <span>Enterprise Identity & Tax Registrations</span>
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        background: 'var(--ws-emerald-subtle)',
                        color: 'var(--ws-emerald)',
                        border: '1px solid #a7f3d0',
                        padding: '3px 9px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <WholesaleIcon name="check" size={13} strokeWidth={2.5} />
                      <span>Verified Active Partner</span>
                    </span>
                    <button
                      type="button"
                      className="ws-btn-secondary"
                      onClick={() => setIsEditing(true)}
                      style={{ padding: '4px 10px', fontSize: '11.5px', minHeight: '30px', gap: '5px' }}
                    >
                      <Edit3 size={13} />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>

                <div className="ws-card-body">
                  <div className="ws-meta-grid">
                    <div className="ws-meta-item">
                      <span className="ws-meta-label">Legal Entity Name</span>
                      <div className="ws-meta-value">{businessName}</div>
                    </div>
                    <div className="ws-meta-item">
                      <span className="ws-meta-label">Trade / Outlet Name</span>
                      <div className="ws-meta-value">
                        {b2bProfile?.tradeName || 'CarXen Authorized Partner'}
                      </div>
                    </div>
                    <div className="ws-meta-item">
                      <span className="ws-meta-label">GSTIN (Input Tax Credit)</span>
                      <div className="ws-meta-value mono">
                        {b2bProfile?.gstin || '22AAAAA0000A1Z5'}
                      </div>
                    </div>
                    <div className="ws-meta-item">
                      <span className="ws-meta-label">PAN Number</span>
                      <div className="ws-meta-value mono">
                        {b2bProfile?.pan || 'ABCDE1234F'}
                      </div>
                    </div>
                    <div className="ws-meta-item">
                      <span className="ws-meta-label">Authorized Contact Person</span>
                      <div className="ws-meta-value">{user?.name || 'Authorized Buyer'}</div>
                    </div>
                    <div className="ws-meta-item">
                      <span className="ws-meta-label">Contact Phone & WhatsApp</span>
                      <div className="ws-meta-value">{user?.phone || '+91 98765 43210'}</div>
                    </div>
                    <div className="ws-meta-item">
                      <span className="ws-meta-label">Business Type</span>
                      <div className="ws-meta-value">
                        {b2bProfile?.businessType || 'Automotive Accessories Wholesaler / Dealer'}
                      </div>
                    </div>
                    <div className="ws-meta-item">
                      <span className="ws-meta-label">Account Dossier Ref</span>
                      <div className="ws-meta-value mono">
                        {b2bProfile?.referenceNumber || 'CX-B2B-8841'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Registered Warehouse / Delivery Locations (Multi-Address Support) */}
              <div className="ws-card">
                <div className="ws-card-header">
                  <div>
                    <h2 style={{ marginBottom: '2px' }}>
                      <WholesaleIcon name="warehouse" size={18} strokeWidth={2} />
                      <span>Registered Dispatch & Warehouse Locations</span>
                    </h2>
                    <span style={{ fontSize: '12px', color: 'var(--ws-text-muted)' }}>
                      Manage factory delivery points and select primary dispatch destinations
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        background: '#f1f5f9',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        padding: '3px 9px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                      }}
                    >
                      {addresses.length} Registered {addresses.length === 1 ? 'Location' : 'Locations'}
                    </span>
                    <button
                      type="button"
                      className="ws-btn-primary"
                      onClick={handleOpenAddAddress}
                      style={{ padding: '6px 12px', fontSize: '12px', minHeight: '32px', gap: '6px' }}
                    >
                      <Plus size={14} />
                      <span>Add Location</span>
                    </button>
                  </div>
                </div>

                <div className="ws-card-body">
                  {addresses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                      <Warehouse size={32} style={{ color: '#94a3b8', margin: '0 auto 10px' }} />
                      <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
                        No Registered Warehouses Yet
                      </h4>
                      <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
                        Add your primary central workshop or regional distribution points to direct factory shipments accurately.
                      </p>
                      <button
                        type="button"
                        className="ws-btn-primary"
                        onClick={handleOpenAddAddress}
                      >
                        <Plus size={15} />
                        <span>Add Primary Warehouse</span>
                      </button>
                    </div>
                  ) : (
                    <div className="ws-warehouse-list">
                      {addresses.map((addr) => (
                        <div
                          key={addr.id}
                          className={`ws-warehouse-card-interactive ${addr.isPrimary ? 'is-primary' : ''}`}
                        >
                          <div className="ws-warehouse-left">
                            <div className="ws-warehouse-icon" style={{ background: addr.isPrimary ? '#ecfdf5' : '#f1f5f9', color: addr.isPrimary ? '#059669' : '#475569' }}>
                              <WholesaleIcon name="warehouse" size={22} strokeWidth={1.8} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="ws-warehouse-header-row">
                                <h4 className="ws-warehouse-title">{addr.label || 'Central Warehouse'}</h4>
                                {addr.isPrimary ? (
                                  <span className="ws-warehouse-primary-pill">
                                    <Check size={11} strokeWidth={3} />
                                    <span>Primary Factory Dispatch Point</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleSetPrimary(addr)}
                                    style={{
                                      background: '#ffffff',
                                      border: '1px solid #cbd5e1',
                                      color: '#475569',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    <Check size={11} />
                                    <span>Set as Primary</span>
                                  </button>
                                )}
                              </div>

                              <p className="ws-warehouse-text">
                                {addr.addressLine1}
                                {addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
                                {addr.landmark ? ` (Near ${addr.landmark})` : ''},{' '}
                                {addr.city}, {addr.state} - {addr.postalCode}
                              </p>

                              <div className="ws-warehouse-contact-pill">
                                <span><strong>Manager:</strong> {addr.name}</span>
                                <span style={{ color: '#cbd5e1' }}>•</span>
                                <span><strong>Direct Line:</strong> {addr.phone}</span>
                              </div>
                            </div>
                          </div>

                          <div className="ws-warehouse-actions-col">
                            <button
                              type="button"
                              className="ws-icon-btn"
                              onClick={() => handleOpenEditAddress(addr)}
                              title="Edit warehouse details"
                            >
                              <Edit3 size={14} />
                            </button>
                            {addresses.length > 1 && (
                              <button
                                type="button"
                                className="ws-icon-btn danger"
                                onClick={() => handleDeleteAddress(addr.id, addr.label || 'Warehouse')}
                                title="Remove warehouse location"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Column: Commercial Tier & Assigned Account Manager */}
        <div>
          {/* Active Wholesale Commercial Status */}
          <div className="ws-card">
            <div className="ws-card-header">
              <h3>
                <WholesaleIcon name="tier" size={18} strokeWidth={2} />
                <span>Commercial Account Status</span>
              </h3>
            </div>
            <div className="ws-card-body">
              <div className="ws-tier-badge-card">
                <div className="ws-tier-badge-level">
                  CarXen Verified B2B Partner
                </div>
                <div className="ws-tier-badge-title">
                  Verified Wholesale Partner
                </div>
                <div className="ws-tier-badge-desc">
                  Direct manufacturer pricing with GST tax invoicing. Extra tiered discounts and volume pricing are automatically applied via promotions and batch orders.
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '13px',
                  color: 'var(--ws-text-muted)',
                  lineHeight: 1.45,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <WholesaleIcon name="check" size={15} strokeWidth={2.5} className="text-emerald-600" />
                  <span>Direct factory production batch allocation</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <WholesaleIcon name="shield" size={15} strokeWidth={2} className="text-emerald-600" />
                  <span>Multi-location split logistics & consolidated invoicing</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <WholesaleIcon name="invoice" size={15} strokeWidth={2} className="text-emerald-600" />
                  <span>Consolidated monthly GST tax invoices with ITC</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dedicated CarXen Commercial Manager */}
          <div className="ws-card">
            <div className="ws-card-header">
              <h3>
                <WholesaleIcon name="account" size={18} strokeWidth={2} />
                <span>Assigned CarXen Commercial Desk</span>
              </h3>
            </div>
            <div className="ws-card-body">
              <div className="ws-manager-profile">
                <div className="ws-manager-avatar">RK</div>
                <div className="ws-manager-info">
                  <h4>Rajesh Kumar</h4>
                  <p>Head of Commercial Procurement, CarXen Automotive</p>
                </div>
              </div>

              <div className="ws-manager-actions">
                <button
                  type="button"
                  onClick={() => openSupportModal({
                    category: 'Custom Showroom / Dealership Allocation',
                    initialMessage: 'Commercial query regarding assigned account manager and procurement dossier.',
                  })}
                  className="ws-manager-link"
                  style={{ border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit' }}
                >
                  <WholesaleIcon name="invoice" size={16} strokeWidth={2} />
                  <span>Submit Commercial Query</span>
                </button>
                <a href="mailto:b2b@carxen.in" className="ws-manager-link">
                  <Mail size={16} />
                  <span>b2b@carxen.in (PO Desk)</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Warehouse Location Modal */}
      {showAddressModal && (
        <div className="ws-modal-overlay">
          <div className="ws-modal-card" style={{ maxWidth: '620px' }}>
            <div className="ws-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#ecfdf5',
                    color: '#059669',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Warehouse size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    {editingAddress ? 'Edit Warehouse Location' : 'Register New Warehouse / Dispatch Point'}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                    Add another delivery destination for CarXen factory batches
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddressModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAddressModal} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="ws-modal-body">
                {/* Location Presets */}
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                    Quick Location Name Presets:
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {WAREHOUSE_LABEL_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAddrForm({ ...addrForm, label: preset })}
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid',
                          borderColor: addrForm.label === preset ? '#0284c7' : '#cbd5e1',
                          background: addrForm.label === preset ? '#f0f9ff' : '#ffffff',
                          color: addrForm.label === preset ? '#0369a1' : '#475569',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Warehouse Name & Manager */}
                <div className="ws-form-grid-2">
                  <div className="ws-form-group">
                    <label className="ws-form-label">
                      <span>Location / Warehouse Label</span>
                      <span className="ws-form-label-req">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="ws-form-control"
                      placeholder="e.g. Central Workshop & Warehouse"
                      value={addrForm.label}
                      onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })}
                    />
                  </div>

                  <div className="ws-form-group">
                    <label className="ws-form-label">
                      <span>Warehouse Manager / Receiving Contact</span>
                      <span className="ws-form-label-req">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="ws-form-control"
                      placeholder="Name of contact person"
                      value={addrForm.name}
                      onChange={(e) => setAddrForm({ ...addrForm, name: e.target.value })}
                    />
                  </div>
                </div>

                {/* Phone & Landmark */}
                <div className="ws-form-grid-2">
                  <div className="ws-form-group">
                    <label className="ws-form-label">
                      <span>Warehouse Phone & WhatsApp</span>
                      <span className="ws-form-label-req">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      className="ws-form-control"
                      placeholder="+91 98765 43210"
                      value={addrForm.phone}
                      onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })}
                    />
                  </div>

                  <div className="ws-form-group">
                    <label className="ws-form-label">
                      <span>Nearby Landmark</span>
                    </label>
                    <input
                      type="text"
                      className="ws-form-control"
                      placeholder="e.g. Near Toll Gate / Industrial Gate 3"
                      value={addrForm.landmark}
                      onChange={(e) => setAddrForm({ ...addrForm, landmark: e.target.value })}
                    />
                  </div>
                </div>

                {/* Street Addresses */}
                <div className="ws-form-group">
                  <label className="ws-form-label">
                    <span>Street Address Line 1 (Plot, Unit, Building)</span>
                    <span className="ws-form-label-req">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="ws-form-control"
                    placeholder="Plot 42, Sector 18, Udyog Vihar"
                    value={addrForm.addressLine1}
                    onChange={(e) => setAddrForm({ ...addrForm, addressLine1: e.target.value })}
                  />
                </div>

                <div className="ws-form-group">
                  <label className="ws-form-label">
                    <span>Address Line 2 (Area, Sector, Phase)</span>
                  </label>
                  <input
                    type="text"
                    className="ws-form-control"
                    placeholder="Phase 4, Electronic City"
                    value={addrForm.addressLine2}
                    onChange={(e) => setAddrForm({ ...addrForm, addressLine2: e.target.value })}
                  />
                </div>

                {/* City, State, PIN */}
                <div className="ws-form-grid-3">
                  <div className="ws-form-group">
                    <label className="ws-form-label">
                      <span>City / District</span>
                      <span className="ws-form-label-req">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="ws-form-control"
                      placeholder="e.g. Gurugram"
                      value={addrForm.city}
                      onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                    />
                  </div>

                  <div className="ws-form-group">
                    <label className="ws-form-label">
                      <span>State</span>
                      <span className="ws-form-label-req">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="ws-form-control"
                      placeholder="e.g. Haryana"
                      value={addrForm.state}
                      onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })}
                    />
                  </div>

                  <div className="ws-form-group">
                    <label className="ws-form-label">
                      <span>PIN Code</span>
                      <span className="ws-form-label-req">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      className="ws-form-control mono"
                      placeholder="122015"
                      value={addrForm.postalCode}
                      onChange={(e) => setAddrForm({ ...addrForm, postalCode: e.target.value })}
                    />
                  </div>
                </div>

                {/* Primary Destination Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <input
                    type="checkbox"
                    id="setAsPrimaryCheck"
                    style={{ width: '16px', height: '16px', accentColor: '#059669', cursor: 'pointer' }}
                    checked={addrForm.isPrimary}
                    onChange={(e) => setAddrForm({ ...addrForm, isPrimary: e.target.checked })}
                  />
                  <label htmlFor="setAsPrimaryCheck" style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}>
                    Make this location the Primary Factory Dispatch Destination
                  </label>
                </div>
              </div>

              <div className="ws-modal-footer">
                <button
                  type="button"
                  className="ws-btn-secondary"
                  onClick={() => setShowAddressModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ws-btn-primary"
                >
                  <Save size={15} />
                  <span>{editingAddress ? 'Save Location Changes' : 'Register Location'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

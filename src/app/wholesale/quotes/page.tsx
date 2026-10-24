'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatINR, Product } from '@/data/products';
import { WholesaleIcon } from '@/components/wholesale/WholesaleIcon';
import {
  Upload,
  ArrowRight,
  FileSpreadsheet,
  X,
  Search,
  Plus,
  Edit3,
  Trash2,
  Copy,
  RotateCcw,
  SlidersHorizontal,
  BookmarkPlus,
  Layers,
  ShoppingBag,
  Check,
  PackagePlus,
} from 'lucide-react';
import '../wholesale.css';

interface SavedProcurementList {
  id: string;
  title: string;
  description: string;
  tag: string;
  estimatedUnits: number;
  estimatedValue: number;
  items: {
    productId: number;
    name: string;
    sku: string;
    quantity: number;
  }[];
}

const PRESET_PROCUREMENT_LISTS: SavedProcurementList[] = [
  {
    id: 'list-fast-movers',
    title: 'Monthly Fast-Moving Showroom Assortment',
    description: 'Top-selling 7D custom floor mats and steering wraps across India’s best-selling car models.',
    tag: 'Recommended Stock',
    estimatedUnits: 45,
    estimatedValue: 185000,
    items: [
      { productId: 1, name: 'CarXen Obsidian Signature 7D Floor Mats', sku: 'CX-7D-HYU-CRT', quantity: 15 },
      { productId: 1, name: 'CarXen Obsidian Signature 7D Floor Mats', sku: 'CX-7D-MAR-SWF', quantity: 15 },
      { productId: 2, name: 'Carbon-Core Performance Steering Wheel Wrap', sku: 'CX-SW-UNI-SP', quantity: 15 },
    ],
  },
  {
    id: 'list-hyundai-pack',
    title: 'Hyundai Dealership Replenishment Pack',
    description: 'Dedicated procurement pack tailored for Hyundai Creta, Venue, Verna, and Alcazar accessories.',
    tag: 'Brand Pack',
    estimatedUnits: 30,
    estimatedValue: 142000,
    items: [
      { productId: 1, name: 'CarXen Obsidian Signature 7D Floor Mats', sku: 'CX-7D-HYU-CRT', quantity: 15 },
      { productId: 3, name: 'Apex Carbon-Grain Custom Leatherette Seat Covers', sku: 'CX-SC-HYU-CRT', quantity: 15 },
    ],
  },
  {
    id: 'list-suv-mahindra',
    title: 'Mahindra Scorpio-N & XUV700 Heavy-Duty Pack',
    description: 'All-weather, heavy-duty 7D mats and reinforced memory foam cushions for rugged full-size SUVs.',
    tag: 'SUV Specialists',
    estimatedUnits: 35,
    estimatedValue: 168000,
    items: [
      { productId: 1, name: 'CarXen Obsidian Signature 7D Floor Mats', sku: 'CX-7D-MAH-SCP', quantity: 20 },
      { productId: 4, name: 'CarXen CloudRest Memory Foam Executive Seat Cushion', sku: 'CX-CF-UNI-ER', quantity: 15 },
    ],
  },
  {
    id: 'list-monsoon',
    title: 'Monsoon All-Weather Protection Stock',
    description: 'Water-impermeable 7D deep-dish mats designed for rain, mud, and intense seasonal customer demand.',
    tag: 'Seasonal Rush',
    estimatedUnits: 50,
    estimatedValue: 245000,
    items: [
      { productId: 1, name: 'CarXen Obsidian Signature 7D Floor Mats', sku: 'CX-7D-HYU-CRT', quantity: 25 },
      { productId: 1, name: 'CarXen Obsidian Signature 7D Floor Mats', sku: 'CX-7D-MAR-SWF', quantity: 25 },
    ],
  },
];

export default function WholesaleQuotesPage() {
  const router = useRouter();
  const {
    user,
    isWholesaleApproved,
    authLoading,
    addToWholesaleBasket,
    wholesaleBasket,
    wholesaleBasketSkuCount,
    products,
    showToast,
  } = useApp();

  // Assortments state loaded from localStorage with preset fallback
  const [assortments, setAssortments] = useState<SavedProcurementList[]>(PRESET_PROCUREMENT_LISTS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Search & Filter & Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [sortBy, setSortBy] = useState<'recommended' | 'value-desc' | 'value-asc' | 'units-desc' | 'units-asc' | 'title-asc' | 'title-desc'>('recommended');

  // CSV Modal
  const [csvText, setCsvText] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Assortment Edit/Create Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalTag, setModalTag] = useState('Custom Stock');
  const [modalDesc, setModalDesc] = useState('');
  const [modalItems, setModalItems] = useState<{ productId: number; name: string; sku: string; quantity: number }[]>([]);
  const [selectedAddProductId, setSelectedAddProductId] = useState<number | ''>('');
  const [addQuantity, setAddQuantity] = useState<number>(10);
  const [addVariantNote, setAddVariantNote] = useState<string>('');
  const [showCatalogBrowser, setShowCatalogBrowser] = useState<boolean>(false);
  const [catalogSearch, setCatalogSearch] = useState<string>('');

  // Load from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cx_saved_assortments');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAssortments(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load saved assortments', e);
    }
    setIsLoaded(true);
  }, []);

  // Save to local storage helper
  const persistAssortments = (newList: SavedProcurementList[]) => {
    setAssortments(newList);
    try {
      localStorage.setItem('cx_saved_assortments', JSON.stringify(newList));
    } catch (e) {
      console.warn('Failed to persist assortments', e);
    }
  };

  // Strict B2B verification gate
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login?redirect=/wholesale/quotes');
      } else if (!isWholesaleApproved) {
        router.replace('/wholesale');
      }
    }
  }, [authLoading, isWholesaleApproved, router, user]);

  if (authLoading || !user || !isWholesaleApproved) {
    return null;
  }

  // Recalculate totals for an assortment
  const computeTotals = (items: { productId: number; quantity: number }[]) => {
    let units = 0;
    let value = 0;
    items.forEach((item) => {
      const q = Math.max(1, item.quantity);
      units += q;
      const p = products.find((x) => x.id === item.productId);
      const unitPrice = p?.wholesalePrice || (p ? Math.round(p.p * 0.85) : 3800);
      value += unitPrice * q;
    });
    return { units, value };
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingId(null);
    setModalTitle('');
    setModalTag('Custom Stock');
    setModalDesc('');
    setModalItems([]);
    setSelectedAddProductId('');
    setAddVariantNote('');
    setAddQuantity(10);
    setShowCatalogBrowser(false);
    setCatalogSearch('');
    setShowEditModal(true);
  };

  // Save current order basket as new assortment
  const handleSaveBasketAsAssortment = () => {
    if (wholesaleBasketSkuCount === 0) {
      showToast('Your Wholesale Order Basket is currently empty');
      return;
    }
    const basketItems: { productId: number; name: string; sku: string; quantity: number }[] = [];
    Object.entries(wholesaleBasket).forEach(([idStr, qty]) => {
      if (qty > 0) {
        const pid = Number(idStr);
        const p = products.find((x) => x.id === pid);
        const seriesCode = (p?.s || 'ACC').toUpperCase().slice(0, 3);
        basketItems.push({
          productId: pid,
          name: p?.n || `Product SKU #${pid}`,
          sku: `CX-${seriesCode}-${pid.toString().padStart(3, '0')}`,
          quantity: qty,
        });
      }
    });

    const dateStr = new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    setEditingId(null);
    setModalTitle(`Replenishment Order (${dateStr})`);
    setModalTag('Custom Order Pack');
    setModalDesc('Auto-generated assortment template saved directly from current Wholesale Order Basket.');
    setModalItems(basketItems);
    setSelectedAddProductId('');
    setAddVariantNote('');
    setAddQuantity(10);
    setShowCatalogBrowser(false);
    setCatalogSearch('');
    setShowEditModal(true);
  };

  // Open Edit Modal for existing assortment
  const handleOpenEditModal = (list: SavedProcurementList) => {
    setEditingId(list.id);
    setModalTitle(list.title);
    setModalTag(list.tag);
    setModalDesc(list.description);
    setModalItems([...list.items]);
    setSelectedAddProductId('');
    setAddVariantNote('');
    setAddQuantity(10);
    setShowCatalogBrowser(false);
    setCatalogSearch('');
    setShowEditModal(true);
  };

  // Duplicate assortment
  const handleDuplicate = (list: SavedProcurementList) => {
    const copy: SavedProcurementList = {
      ...list,
      id: `list-copy-${Date.now()}`,
      title: `${list.title} (Copy)`,
      tag: list.tag === 'Recommended Stock' ? 'Custom Stock' : list.tag,
    };
    const nextList = [copy, ...assortments];
    persistAssortments(nextList);
    showToast(`Duplicated "${list.title}" into custom assortments`);
  };

  // Delete assortment
  const handleDelete = (id: string, title: string) => {
    if (assortments.length <= 1) {
      showToast('At least one procurement assortment must be kept');
      return;
    }
    const nextList = assortments.filter((x) => x.id !== id);
    persistAssortments(nextList);
    showToast(`Removed "${title}" from saved assortments`);
  };

  // Reset to default factory presets
  const handleResetDefaults = () => {
    persistAssortments(PRESET_PROCUREMENT_LISTS);
    showToast('Restored default showroom and dealership assortment packs');
  };

  // Add SKU item in modal (supports direct add from dropdown OR catalog list)
  const handleAddItemToModal = (productToAdd?: Product, qtyToAdd?: number, variant?: string) => {
    const targetProduct = productToAdd || products.find((x) => x.id === Number(selectedAddProductId));
    if (!targetProduct) {
      showToast('Please select a product from the catalog dropdown');
      return;
    }

    const qty = Math.max(1, qtyToAdd !== undefined ? qtyToAdd : (addQuantity || targetProduct.b2bMoq || 5));
    const fitment = (variant !== undefined ? variant : addVariantNote).trim();

    const baseSeries = (targetProduct.s || 'ACC').toUpperCase().slice(0, 3);
    const skuCode = fitment
      ? `CX-${baseSeries}-${targetProduct.id.toString().padStart(3, '0')}-${fitment.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`
      : `CX-${baseSeries}-${targetProduct.id.toString().padStart(3, '0')}`;

    const displayName = fitment
      ? `${targetProduct.n} (${fitment})`
      : targetProduct.n;

    // Check if identical SKU already exists in modalItems
    const existingSkuIdx = modalItems.findIndex((x) => x.sku === skuCode);
    if (existingSkuIdx >= 0) {
      const next = [...modalItems];
      next[existingSkuIdx].quantity += qty;
      setModalItems(next);
      showToast(`Updated "${displayName}" (+${qty} units)`);
    } else {
      setModalItems((prev) => [
        ...prev,
        {
          productId: targetProduct.id,
          name: displayName,
          sku: skuCode,
          quantity: qty,
        },
      ]);
      showToast(`Added "${displayName}" (${qty} units)`);
    }

    // Reset selection so the user can easily select the next product
    setSelectedAddProductId('');
    setAddVariantNote('');
    setAddQuantity(10);
  };

  // Remove SKU item in modal
  const handleRemoveModalItem = (index: number) => {
    setModalItems(modalItems.filter((_, idx) => idx !== index));
  };

  // Update quantity in modal
  const handleUpdateModalItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveModalItem(index);
      return;
    }
    const next = [...modalItems];
    next[index].quantity = newQty;
    setModalItems(next);
  };

  // Save Modal (Create or Edit)
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim()) {
      showToast('Please enter an assortment title');
      return;
    }
    if (modalItems.length === 0) {
      showToast('Please include at least 1 product SKU in the assortment');
      return;
    }

    const { units, value } = computeTotals(modalItems);

    if (editingId) {
      // Update existing
      const updated = assortments.map((item) => {
        if (item.id === editingId) {
          return {
            ...item,
            title: modalTitle.trim(),
            tag: modalTag.trim() || 'Custom Pack',
            description: modalDesc.trim() || 'Custom dealership assortment template.',
            estimatedUnits: units,
            estimatedValue: value,
            items: modalItems,
          };
        }
        return item;
      });
      persistAssortments(updated);
      showToast(`Assortment "${modalTitle.trim()}" updated successfully`);
    } else {
      // Create new
      const newAssortment: SavedProcurementList = {
        id: `list-custom-${Date.now()}`,
        title: modalTitle.trim(),
        tag: modalTag.trim() || 'Custom Pack',
        description: modalDesc.trim() || 'Custom procurement template saved to your enterprise workspace.',
        estimatedUnits: units,
        estimatedValue: value,
        items: modalItems,
      };
      persistAssortments([newAssortment, ...assortments]);
      showToast(`Created new assortment "${modalTitle.trim()}"`);
    }

    setShowEditModal(false);
  };

  // Load into Basket
  const handleLoadListIntoBasket = (list: SavedProcurementList) => {
    list.items.forEach((item) => {
      addToWholesaleBasket(item.productId, item.quantity);
    });
    showToast(`Loaded "${list.title}" (${list.estimatedUnits} units) into Wholesale Order Basket`);
    router.push('/wholesale/order-basket');
  };

  // CSV parse
  const handleParseCsvAndAdd = () => {
    if (!csvText.trim()) return;
    const lines = csvText.trim().split('\n');
    let added = 0;
    lines.forEach((line) => {
      const parts = line.split(',').map((s) => s.trim());
      if (parts.length >= 2) {
        const pid = parseInt(parts[0], 10);
        const qty = parseInt(parts[1], 10);
        if (!isNaN(pid) && !isNaN(qty) && qty > 0) {
          addToWholesaleBasket(pid, qty);
          added++;
        }
      }
    });
    setShowUploadModal(false);
    setCsvText('');
    showToast(`Successfully processed CSV and added ${added} SKUs to Order Basket`);
    router.push('/wholesale/order-basket');
  };

  // Filter and Sort Assortments
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    assortments.forEach((a) => {
      if (a.tag) set.add(a.tag);
    });
    return ['All', ...Array.from(set)];
  }, [assortments]);

  const filteredAndSortedAssortments = useMemo(() => {
    let result = [...assortments];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.tag.toLowerCase().includes(q) ||
          a.items.some((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
      );
    }

    // Tag filter
    if (selectedTag !== 'All') {
      result = result.filter((a) => a.tag === selectedTag);
    }

    // Sort order
    result.sort((a, b) => {
      switch (sortBy) {
        case 'value-desc':
          return b.estimatedValue - a.estimatedValue;
        case 'value-asc':
          return a.estimatedValue - b.estimatedValue;
        case 'units-desc':
          return b.estimatedUnits - a.estimatedUnits;
        case 'units-asc':
          return a.estimatedUnits - b.estimatedUnits;
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        default:
          return 0; // recommended preset sequence
      }
    });

    return result;
  }, [assortments, searchQuery, selectedTag, sortBy]);

  // Modal live totals calculation
  const modalLiveTotals = useMemo(() => {
    return computeTotals(modalItems);
  }, [modalItems, products]);

  return (
    <div className="ws-page-container">
      {/* Header Bar */}
      <div className="ws-header-bar">
        <div className="ws-header-titles">
          <div className="ws-breadcrumb-kicker">
            <WholesaleIcon name="spark" size={13} strokeWidth={2} />
            <span>Assortments & Batch PO Templates</span>
          </div>
          <h1>
            <WholesaleIcon name="lists" size={26} strokeWidth={2} />
            <span>Saved Procurement Assortments & Proforma Templates</span>
          </h1>
          <p>
            Customizable reorder assortments, dealership stocking packs, and batch SKU upload.{' '}
            <strong>Sort by value or volume, edit line items, and load directly into your PO basket.</strong>
          </p>
        </div>
        <div className="ws-header-actions">
          {wholesaleBasketSkuCount > 0 && (
            <button
              type="button"
              onClick={handleSaveBasketAsAssortment}
              className="ws-btn-secondary"
              style={{ gap: '6px' }}
              title="Save all products currently in your Wholesale Basket as a new template"
            >
              <BookmarkPlus size={15} />
              <span>Save Basket as Assortment ({wholesaleBasketSkuCount} SKUs)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="ws-btn-primary"
            style={{ gap: '6px' }}
          >
            <Plus size={15} />
            <span>Create Custom Assortment</span>
          </button>

          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="ws-btn-secondary"
          >
            <Upload size={15} />
            <span>Upload SKU Sheet (CSV)</span>
          </button>

          <Link href="/wholesale/order-basket" className="ws-btn-secondary">
            <WholesaleIcon name="basket" size={15} strokeWidth={2} />
            <span>View Basket ({wholesaleBasketSkuCount})</span>
          </Link>
        </div>
      </div>

      {/* Toolbar: Sort Assortment, Search & Tag Filters */}
      <div className="ws-assortment-toolbar">
        <div className="ws-assortment-toolbar-left">
          {/* Search Input */}
          <div className="ws-assortment-search">
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ws-text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              className="ws-search-input"
              style={{ paddingLeft: '36px' }}
              placeholder="Search assortments by title, tag, or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="ws-search-clear"
                onClick={() => setSearchQuery('')}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Sort Assortment Dropdown */}
          <div className="ws-sort-control">
            <SlidersHorizontal size={15} />
            <span>Sort Assortments:</span>
            <select
              className="ws-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="recommended">Recommended Order</option>
              <option value="value-desc">Highest Estimated Value (₹ High → Low)</option>
              <option value="value-asc">Lowest Estimated Value (₹ Low → High)</option>
              <option value="units-desc">Most Total Units (High → Low)</option>
              <option value="units-asc">Least Total Units (Low → High)</option>
              <option value="title-asc">Title: A to Z</option>
              <option value="title-desc">Title: Z to A</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="ws-btn-secondary"
            style={{ padding: '6px 10px', fontSize: '11.5px', minHeight: '34px', gap: '5px' }}
            title="Reset preset assortments to default"
          >
            <RotateCcw size={13} />
            <span>Restore Presets</span>
          </button>
        </div>
      </div>

      {/* Tag Filter Chips */}
      {availableTags.length > 2 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ws-text-muted)' }}>
            Filter By Tag:
          </span>
          {availableTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`ws-category-chip ${selectedTag === tag ? 'active' : ''}`}
              onClick={() => setSelectedTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Grid of Saved Lists */}
      {filteredAndSortedAssortments.length === 0 ? (
        <div className="ws-empty-state-card">
          <div className="ws-empty-icon-wrap">
            <Layers size={28} />
          </div>
          <h3>No Assortments Found</h3>
          <p>
            No procurement lists matched your current search &ldquo;{searchQuery}&rdquo;. Clear filters or create a new custom procurement pack.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="ws-btn-secondary"
              onClick={() => {
                setSearchQuery('');
                setSelectedTag('All');
              }}
            >
              Clear Filters
            </button>
            <button
              type="button"
              className="ws-btn-primary"
              onClick={handleOpenCreateModal}
            >
              <Plus size={15} />
              <span>Create New Assortment</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="ws-pack-grid">
          {filteredAndSortedAssortments.map((list) => (
            <div key={list.id} className="ws-pack-card">
              <div>
                <div className="ws-pack-header">
                  <span className="ws-pack-tag">{list.tag}</span>
                  <div className="ws-pack-actions">
                    <button
                      type="button"
                      className="ws-icon-btn"
                      onClick={() => handleOpenEditModal(list)}
                      title="Edit assortment items and quantities"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      className="ws-icon-btn"
                      onClick={() => handleDuplicate(list)}
                      title="Duplicate assortment template"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      type="button"
                      className="ws-icon-btn danger"
                      onClick={() => handleDelete(list.id, list.title)}
                      title="Delete assortment"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h3 className="ws-pack-title">{list.title}</h3>
                <p className="ws-pack-desc">{list.description}</p>

                {/* Items preview */}
                <div className="ws-pack-preview-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', marginBottom: '6px', borderBottom: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                    <span>SKU Item</span>
                    <span>Units</span>
                  </div>
                  {list.items.map((item, idx) => (
                    <div key={idx} className="ws-pack-item-line">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0, paddingRight: '8px' }}>
                        <span style={{ color: '#1e293b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name}
                        </span>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b' }}>
                          {item.sku}
                        </span>
                      </div>
                      <span style={{ color: '#0f172a', fontWeight: 800, whiteSpace: 'nowrap' }}>
                        {item.quantity} pcs
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ws-pack-footer">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                      Est. Wholesale
                    </span>
                    <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: 700 }}>
                      · {list.estimatedUnits} units
                    </span>
                  </div>
                  <span className="ws-pack-value">
                    {formatINR(list.estimatedValue || 0)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleLoadListIntoBasket(list)}
                  className="ws-btn-primary"
                  style={{ fontSize: '12.5px', padding: '8px 14px' }}
                >
                  <span>Load into Basket</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Create Assortment Modal */}
      {showEditModal && (
        <div className="ws-modal-overlay">
          <div className="ws-modal-card">
            <div className="ws-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    {editingId ? 'Edit Procurement Assortment' : 'Create Custom Assortment'}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                    Customize items, tags, and production batches for one-click PO generation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="ws-modal-body">
                {/* Title & Tag */}
                <div className="ws-form-grid-2">
                  <div className="ws-form-group">
                    <label className="ws-form-label">
                      <span>Assortment Pack Title</span>
                      <span className="ws-form-label-req">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="ws-form-control"
                      placeholder="e.g. Monthly Showroom Top-Movers"
                      value={modalTitle}
                      onChange={(e) => setModalTitle(e.target.value)}
                    />
                  </div>

                  <div className="ws-form-group">
                    <label className="ws-form-label">
                      <span>Category Tag</span>
                    </label>
                    <input
                      type="text"
                      className="ws-form-control"
                      placeholder="e.g. Recommended Stock, SUV Pack"
                      value={modalTag}
                      onChange={(e) => setModalTag(e.target.value)}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="ws-form-group">
                  <label className="ws-form-label">
                    <span>Description / Procurement Notes</span>
                  </label>
                  <input
                    type="text"
                    className="ws-form-control"
                    placeholder="Short description of models and application target"
                    value={modalDesc}
                    onChange={(e) => setModalDesc(e.target.value)}
                  />
                </div>

                {/* Items in Assortment */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="ws-form-label">
                      <span>Assortment Line Items ({modalItems.length} SKUs)</span>
                      <span className="ws-form-label-req">*</span>
                    </label>
                    <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>
                      Live Total: {modalLiveTotals.units} units · {formatINR(modalLiveTotals.value)}
                    </span>
                  </div>

                  {modalItems.length === 0 ? (
                    <div style={{ padding: '16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
                      No SKU items added yet. Use the selector below to add products.
                    </div>
                  ) : (
                    <table className="ws-modal-items-table">
                      <thead>
                        <tr>
                          <th>Product SKU</th>
                          <th style={{ width: '130px', textAlign: 'center' }}>Units</th>
                          <th style={{ width: '110px', textAlign: 'right' }}>Est. Subtotal</th>
                          <th style={{ width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {modalItems.map((item, idx) => {
                          const p = products.find((x) => x.id === item.productId);
                          const unitPrice = p?.wholesalePrice || (p ? Math.round(p.p * 0.85) : 3800);
                          const lineTotal = unitPrice * item.quantity;

                          return (
                            <tr key={idx}>
                              <td>
                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.name}</div>
                                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b' }}>{item.sku}</div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateModalItemQty(idx, item.quantity - 5)}
                                    style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontWeight: 700 }}
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min={1}
                                    value={item.quantity}
                                    onChange={(e) => handleUpdateModalItemQty(idx, parseInt(e.target.value, 10) || 1)}
                                    style={{ width: '50px', height: '26px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 700 }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateModalItemQty(idx, item.quantity + 5)}
                                    style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontWeight: 700 }}
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                {formatINR(lineTotal)}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveModalItem(idx)}
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                  title="Remove item"
                                >
                                  <X size={15} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Add New Item Section */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <PackagePlus size={16} className="text-emerald-600" />
                      <span>Add Products to Assortment</span>
                    </span>

                    <button
                      type="button"
                      className="ws-btn-secondary"
                      onClick={() => setShowCatalogBrowser(!showCatalogBrowser)}
                      style={{ padding: '4px 10px', fontSize: '11.5px', minHeight: '30px', gap: '5px' }}
                    >
                      <ShoppingBag size={13} />
                      <span>{showCatalogBrowser ? 'Hide Catalog List' : `Browse All Products (${products.length})`}</span>
                    </button>
                  </div>

                  {/* Quick Select & Add Controls */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                      className="ws-form-control"
                      style={{ flex: 1, minWidth: '240px' }}
                      value={selectedAddProductId}
                      onChange={(e) => {
                        const pid = e.target.value ? Number(e.target.value) : '';
                        setSelectedAddProductId(pid);
                        if (pid) {
                          const prod = products.find((x) => x.id === pid);
                          if (prod) setAddQuantity(prod.b2bMoq || 10);
                        }
                      }}
                    >
                      <option value="">-- Choose a Product ({products.length} catalog items) --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.n} (MOQ: {p.b2bMoq || 5} pcs · {formatINR(p.wholesalePrice || Math.round(p.p * 0.85))})
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      className="ws-form-control"
                      style={{ width: '160px' }}
                      placeholder="Variant (e.g. Creta, Thar)"
                      title="Optional vehicle fitment or variant note"
                      value={addVariantNote}
                      onChange={(e) => setAddVariantNote(e.target.value)}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Qty:</span>
                      <input
                        type="number"
                        min={1}
                        className="ws-form-control"
                        style={{ width: '68px', textAlign: 'center' }}
                        value={addQuantity}
                        onChange={(e) => setAddQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      />
                    </div>

                    <button
                      type="button"
                      className="ws-btn-primary"
                      onClick={() => handleAddItemToModal()}
                      style={{ whiteSpace: 'nowrap', padding: '0 14px', height: '40px' }}
                    >
                      <Plus size={15} />
                      <span>Add SKU</span>
                    </button>
                  </div>

                  {/* Expandable Catalog Browser Panel */}
                  {showCatalogBrowser && (
                    <div className="ws-catalog-picker-panel">
                      <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        <input
                          type="text"
                          className="ws-search-input"
                          style={{ height: '34px', fontSize: '12.5px', paddingLeft: '32px' }}
                          placeholder="Search catalog products to quick-add..."
                          value={catalogSearch}
                          onChange={(e) => setCatalogSearch(e.target.value)}
                        />
                      </div>

                      <div className="ws-catalog-picker-list">
                        {products
                          .filter((p) => !catalogSearch.trim() || p.n.toLowerCase().includes(catalogSearch.toLowerCase().trim()))
                          .map((p) => {
                            const unitPrice = p.wholesalePrice || Math.round(p.p * 0.85);
                            const moq = p.b2bMoq || 5;
                            const existingCount = modalItems
                              .filter((x) => x.productId === p.id)
                              .reduce((sum, item) => sum + item.quantity, 0);

                            return (
                              <div key={p.id} className="ws-catalog-picker-item">
                                <div className="ws-catalog-picker-info">
                                  <div className="ws-catalog-picker-thumb">
                                    <ShoppingBag size={16} style={{ color: '#0f172a' }} />
                                  </div>
                                  <div style={{ minWidth: 0 }}>
                                    <div className="ws-catalog-picker-name" title={p.n}>{p.n}</div>
                                    <div className="ws-catalog-picker-meta">
                                      <span style={{ fontWeight: 700, color: '#059669' }}>{formatINR(unitPrice)}</span>
                                      <span>•</span>
                                      <span>MOQ: {moq} pcs</span>
                                      {existingCount > 0 && (
                                        <>
                                          <span>•</span>
                                          <span style={{ color: '#2563eb', fontWeight: 700 }}>In List: {existingCount} pcs</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  className="ws-btn-secondary"
                                  onClick={() => handleAddItemToModal(p, moq)}
                                  style={{ padding: '4px 10px', fontSize: '11.5px', minHeight: '28px', gap: '4px', whiteSpace: 'nowrap' }}
                                >
                                  <Plus size={13} />
                                  <span>+ Add ({moq} MOQ)</span>
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="ws-modal-footer">
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                    Assortment Total ({modalLiveTotals.units} units)
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                    {formatINR(modalLiveTotals.value)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="ws-btn-secondary"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ws-btn-primary"
                  >
                    <span>Save Assortment Template</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showUploadModal && (
        <div className="ws-modal-overlay">
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '540px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
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
                  <FileSpreadsheet size={20} />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Batch SKU Quick-Import
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px', lineHeight: 1.5 }}>
              Paste your procurement rows below in <code>ProductId, Quantity</code> format:
            </p>

            <textarea
              className="ws-search-input"
              style={{
                width: '100%',
                height: '130px',
                fontFamily: 'ui-monospace, monospace',
                fontSize: '13px',
                padding: '12px',
                marginBottom: '18px',
                resize: 'none',
              }}
              placeholder={`1, 15\n2, 25\n3, 10\n4, 20`}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="ws-btn-secondary"
                onClick={() => setShowUploadModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ws-btn-primary"
                onClick={handleParseCsvAndAdd}
                disabled={!csvText.trim()}
              >
                Import into Order Basket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

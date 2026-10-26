import { isMatCategory, isSeatCategory } from '@/lib/storefront/categories';

export type ProductCategory = string;
export type ProductSeries = 'Signature' | 'Sport' | 'Urban' | 'Essentials';
export type ProductArtKey = 'seat' | 'mats' | 'wheel' | 'pillow' | 'arm' | 'trunk';
export type ProductTintOption = [string, string, string];

export type ProductColor = {
  name: string;
  hex: string;
  filter?: string;
  images?: string[];
};

export type ProductInstallation = {
  difficulty?: string;
  time?: string;
  steps?: string[];
  videoUrl?: string;
  guide?: string;
};

export type ProductComboItem = {
  productId?: string;
};

export interface Product {
  id: number;
  n: string;
  c: ProductCategory;
  s: ProductSeries;
  p: number;
  o?: number;
  r: number;
  rv: number;
  a: ProductArtKey;
  top?: number;
  nw?: number;
  spot?: number;
  pk?: number;
  d: string;
  sp: [string, string][];
  slug?: string;
  categoryLabel?: string;
  tintOptions?: ProductTintOption[];
  fitment?: unknown;
  customFit?: boolean;
  image?: string;
  images?: string[];
  tags?: string[];
  colors?: ProductColor[];
  installation?: ProductInstallation;
  isCombo?: boolean;
  comboItems?: ProductComboItem[];
  wholesalePrice?: number;
  b2bMoq?: number;
  discountLimitQty?: number | null;
  taxBreakdown?: {
    gstPercent: number;
    basePriceExGst: number;
    gstAmount: number;
  };
  wholesaleTier?: 'tier1' | 'tier2';
  packageDimensions?: string | null;
}

// Product records are loaded from the storefront API. The remaining values are
// presentation constants used by fitment, filters, reviews, and product UI.
export const VEHICLES: Record<string, string[]> = {
  'Maruti Suzuki': ['Swift', 'Baleno', 'Brezza', 'Dzire', 'Fronx'],
  'Hyundai': ['Creta', 'i20', 'Venue', 'Verna'],
  'Tata': ['Nexon', 'Punch', 'Harrier', 'Altroz'],
  'Mahindra': ['Thar', 'Scorpio-N', 'XUV700', 'XUV 3XO'],
  'Kia': ['Seltos', 'Sonet', 'Carens'],
  'Toyota': ['Innova', 'Fortuner', 'Hyryder'],
  'Honda': ['City', 'Amaze', 'Elevate'],
};

export const SERIES_LIST: [string, string][] = [
  ['Signature', '#e2231a'],
  ['Sport', '#1b1b1e'],
  ['Urban', '#5d5d64'],
  ['Essentials', '#b91a12'],
];

export const TINT_OPTIONS: [string, string, string][] = [
  ['Red stitch', 'none', '#e2231a'],
  ['Blue stitch', 'hue-rotate(200deg)', '#2f6fe0'],
  ['Amber stitch', 'hue-rotate(35deg) saturate(1.3)', '#f5a623'],
];

export const isCustomFit = (p: Product) => p.customFit ?? (isSeatCategory(p.c) || isMatCategory(p.c));

export const formatINR = (n: number) => '₹' + n.toLocaleString('en-IN');

export const DEFAULT_PRESET_TAGS = [
  'Waterproof',
  'Custom Fit',
  'Nappa Leather',
  'All-Weather',
  'Anti-Slip',
  'Scratch-Resistant',
  'OEM Grade',
  'SUV',
  'Sedan',
  'Breathable',
  'Easy Clean',
] as const;

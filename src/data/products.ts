import { isMatCategory, isSeatCategory } from '@/lib/storefront/categories';

export type ProductCategory = string;
export type ProductSeries = string;
export type ProductArtKey = 'seat' | 'mats' | 'wheel' | 'pillow' | 'arm' | 'trunk';

export function formatSeriesLabel(series?: string | null): string {
  const clean = (series || '').trim();
  if (!clean) return '';
  return /\bseries$/i.test(clean) ? clean : `${clean} Series`;
}
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

export type DescriptionBlock =
  | {
      id: string;
      type: 'text';
      heading?: string;
      body: string;
      bullets?: string[];
    }
  | {
      id: string;
      type: 'image';
      url: string;
      caption?: string;
      alt?: string;
    }
  | {
      id: string;
      type: 'split';
      layout: 'image-left' | 'image-right';
      imageUrl: string;
      heading?: string;
      body: string;
      bullets?: string[];
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
  descriptionBlocks?: DescriptionBlock[];
  sp: [string, string][];
  slug?: string;
  categoryId?: string | null;
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
  wholesaleTier2Qty?: number | null;
  wholesaleTier2Discount?: number | null;
  wholesaleTier3Qty?: number | null;
  wholesaleTier3Discount?: number | null;
  discountLimitQty?: number | null;
  taxBreakdown?: {
    gstPercent: number;
    basePriceExGst: number;
    gstAmount: number;
  };
  wholesaleTier?: 'tier1' | 'tier2';
  packageDimensions?: string | null;
  unitDimensions?: string | null;
  unitWeight?: number | null;
  unitWeightUom?: string | null;
  innerBoxDimensions?: string | null;
  innerBoxWeight?: number | null;
  innerBoxWeightUom?: string | null;
  masterCartonDimensions?: string | null;
  unitsPerMasterCarton?: number | null;
  masterCartonWeightKg?: number | null;
  enforceCartonMultiples?: boolean | null;
  isCustomProduct?: boolean;
  stockCount?: number | null;
  inStock?: boolean;
  publishedAt?: string | null;
  soldCount?: number;
}

// Product records are loaded from the storefront API. The remaining values are
// presentation constants used by fitment, filters, reviews, and product UI.
export const VEHICLES: Record<string, string[]> = {
  Mahindra: ['Scorpio N', 'Thar', 'Thar Roxx', 'XUV700', 'XUV 3X0', 'Bolero'],
  Tata: ['Nexon', 'Punch', 'Harrier', 'Safari', 'Altroz', 'Tiago', 'Curvv'],
  Hyundai: ['Creta', 'Venue', 'i20', 'Verna', 'Tucson', 'Alcazar', 'Exter', 'Aura'],
  MG: ['Comet EV', 'Hector', 'Astor', 'ZS EV', 'Windsor EV'],
  'Maruti Suzuki': ['Swift', 'Baleno', 'Brezza', 'Dzire', 'Ertiga', 'Grand Vitara', 'Fronx', 'Jimny'],
  Toyota: ['Fortuner', 'Innova Crysta', 'Innova Hycross', 'Urban Cruiser Hyryder', 'Glanza'],
  Honda: ['City', 'Amaze', 'Elevate'],
  Kia: ['Seltos', 'Sonet', 'Carens', 'EV6', 'Carnival'],
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

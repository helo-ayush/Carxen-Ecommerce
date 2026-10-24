export type ProductCategory = 'seats' | 'mats' | 'steering' | 'comfort';
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
  title: string;
  subtitle?: string;
  productId?: string;
  discountPercent?: number;
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

export const CATEGORIES_LIST: [string, string][] = [
  ['all', 'All parts'],
  ['seats', 'Seat covers'],
  ['mats', 'Floor mats'],
  ['steering', 'Steering'],
  ['comfort', 'Comfort'],
];

export const SAMPLE_REVIEWS: [string, string, string][] = [
  ['Aarav M.', 'Perfect fit, zero gaps', 'Fitted in under an hour. Stitching looks factory-original.'],
  ['Priya K.', 'Worth every rupee', 'Premium material and a spotless finish. Delivery was quick.'],
  ['Vikram S.', 'Better than OEM', 'Fits like it was made for the car. Much more comfortable on long drives.'],
  ['Neha R.', 'Easy to clean', 'Wipes clean in seconds and still looks new after three months.'],
  ['Rohan T.', 'Solid build quality', 'Seams are tight and nothing has loosened. Would buy again.'],
  ['Ishita G.', 'Good value', 'Does exactly what it promises. Neat packaging too.'],
];

export const TINT_OPTIONS: [string, string, string][] = [
  ['Red stitch', 'none', '#e2231a'],
  ['Blue stitch', 'hue-rotate(200deg)', '#2f6fe0'],
  ['Amber stitch', 'hue-rotate(35deg) saturate(1.3)', '#f5a623'],
];

export const isCustomFit = (p: Product) => p.customFit ?? (p.c === 'seats' || p.c === 'mats');

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

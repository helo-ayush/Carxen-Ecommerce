export interface Product {
  id: number;
  n: string;
  c: 'seats' | 'mats' | 'steering' | 'comfort';
  s: 'Signature' | 'Sport' | 'Urban' | 'Essentials';
  p: number;
  o?: number;
  r: number;
  rv: number;
  a: 'seat' | 'mats' | 'wheel' | 'pillow' | 'arm' | 'trunk';
  top?: number;
  nw?: number;
  spot?: number;
  pk?: number;
  d: string;
  sp: [string, string][];
}

export const PRODUCTS: Product[] = [
  {
    id: 1,
    n: 'Premium Quilted Seat Cover',
    c: 'seats',
    s: 'Signature',
    p: 4999,
    o: 6499,
    r: 4.8,
    rv: 412,
    a: 'seat',
    top: 1,
    pk: 1,
    d: 'Full-surround diamond-quilted seat cover in wear-resistant leatherette with 8mm foam core, airbag-safe seams and red contrast stitching.',
    sp: [
      ['Pattern', 'Diamond quilt MQ-01'],
      ['Fit', 'Model-specific, 100+'],
      ['Care', 'Machine washable'],
    ],
  },
  {
    id: 2,
    n: 'All-Weather Floor Mats',
    c: 'mats',
    s: 'Urban',
    p: 2499,
    r: 4.7,
    rv: 298,
    a: 'mats',
    pk: 1,
    d: 'Precision-moulded TPE mats with deep spill channels, reinforced heel pad and anti-slip silica backing.',
    sp: [
      ['Material', 'TPE compound'],
      ['Channels', '6mm spill traps'],
      ['Set', 'Front + rear'],
    ],
  },
  {
    id: 3,
    n: 'Perforated Steering Cover',
    c: 'steering',
    s: 'Sport',
    p: 1299,
    r: 4.6,
    rv: 167,
    a: 'wheel',
    nw: 1,
    pk: 1,
    d: 'Hand-stitched perforated microfibre cover with centre marker stripe. Universal 37–38cm fit, tool-free install.',
    sp: [
      ['Diameter', '370–385mm'],
      ['Grip', 'Micro-perforated'],
      ['Install', 'Tool-free, 10 min'],
    ],
  },
  {
    id: 4,
    n: 'Memory Foam Neck Pillow Set',
    c: 'comfort',
    s: 'Essentials',
    p: 899,
    r: 4.5,
    rv: 231,
    a: 'pillow',
    pk: 1,
    d: 'Pair of slow-rebound memory foam neck pillows with quilted breathable shells. Long-drive support that stays put.',
    sp: [
      ['Core', 'Memory foam'],
      ['Mount', 'Elastic strap'],
      ['Set', '2 pieces'],
    ],
  },
  {
    id: 5,
    n: 'Sport Bucket Seat Cover',
    c: 'seats',
    s: 'Sport',
    p: 5999,
    o: 7299,
    r: 4.9,
    rv: 536,
    a: 'seat',
    spot: 1,
    d: 'Motorsport-inspired bolstered cover with ventilated perforation and bold red piping. Our highest-rated set.',
    sp: [
      ['Bolster', 'Reinforced side'],
      ['Surface', 'Ventilated perf.'],
      ['Fit', 'Model-specific'],
    ],
  },
  {
    id: 6,
    n: '3D Diamond Floor Mats',
    c: 'mats',
    s: 'Signature',
    p: 3299,
    o: 3999,
    r: 4.8,
    rv: 344,
    a: 'mats',
    top: 1,
    d: 'Laser-measured 3D edge mats with diamond tread pattern and 25mm raised lip.',
    sp: [
      ['Edge', '25mm raised lip'],
      ['Fit', 'Laser-measured'],
      ['Care', 'Hose down'],
    ],
  },
  {
    id: 7,
    n: 'Carbon Grip Steering Cover',
    c: 'steering',
    s: 'Signature',
    p: 1799,
    r: 4.7,
    rv: 189,
    a: 'wheel',
    pk: 1,
    d: 'Carbon-textured grip zones with double-stitched seams. Cool in summer, warm in winter.',
    sp: [
      ['Texture', 'Carbon weave'],
      ['Seams', 'Double-stitched'],
      ['Fit', 'Universal'],
    ],
  },
  {
    id: 8,
    n: 'Armrest Cushion',
    c: 'comfort',
    s: 'Essentials',
    p: 1099,
    r: 4.4,
    rv: 142,
    a: 'arm',
    pk: 1,
    d: 'Console-height armrest cushion with high-density foam and non-marking strap system.',
    sp: [
      ['Height gain', '+45mm'],
      ['Core', 'HD foam'],
      ['Strap', 'Non-marking'],
    ],
  },
  {
    id: 9,
    n: 'Trunk Organiser',
    c: 'comfort',
    s: 'Urban',
    p: 1799,
    r: 4.6,
    rv: 210,
    a: 'trunk',
    pk: 1,
    d: 'Foldable boot organiser with rigid dividers, leak-proof liner and grip base.',
    sp: [
      ['Capacity', '60L'],
      ['Dividers', '2 removable'],
      ['Folds', 'Flat, 80mm'],
    ],
  },
  {
    id: 10,
    n: 'Ventilated Seat Cover',
    c: 'seats',
    s: 'Urban',
    p: 3799,
    o: 4499,
    r: 4.5,
    rv: 176,
    a: 'seat',
    d: '3D-mesh ventilated cover that keeps cabins cool through Indian summers.',
    sp: [
      ['Layer', '3D air mesh'],
      ['Seams', 'Airbag-safe'],
      ['Care', 'Wipe clean'],
    ],
  },
  {
    id: 11,
    n: 'Rubber Trunk Mat',
    c: 'mats',
    s: 'Urban',
    p: 1999,
    r: 4.4,
    rv: 98,
    a: 'mats',
    pk: 1,
    d: 'Raised-edge boot liner moulded to your model. Contains mud, water and spills.',
    sp: [
      ['Material', 'TPE rubber'],
      ['Edge', 'Raised'],
      ['Fit', 'Model-specific'],
    ],
  },
  {
    id: 12,
    n: 'Lumbar Support Cushion',
    c: 'comfort',
    s: 'Sport',
    p: 1399,
    o: 1699,
    r: 4.3,
    rv: 87,
    a: 'pillow',
    nw: 1,
    pk: 1,
    d: 'Ergonomic lumbar cushion that supports posture on long highway hauls.',
    sp: [
      ['Core', 'Memory foam'],
      ['Cover', 'Breathable mesh'],
      ['Mount', 'Adjustable strap'],
    ],
  },
];

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

export const isCustomFit = (p: Product) => p.c === 'seats' || p.c === 'mats';

export const formatINR = (n: number) => '₹' + n.toLocaleString('en-IN');

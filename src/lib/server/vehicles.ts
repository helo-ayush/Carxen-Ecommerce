import { getPostgresPool } from './pg-supabase-adapter';

export interface ActiveInventoryVehicle {
  brand: string;
  models: string[];
  itemCount: number;
}

export interface StorefrontVehiclesData {
  success: boolean;
  source: 'database' | 'fallback';
  brands: string[];
  modelsByBrand: Record<string, string[]>;
  inventoryVehicles: ActiveInventoryVehicle[];
  inventoryModels: string[];
  totalFitmentsCount: number;
}

const MODEL_TO_BRAND_LOOKUP: Record<string, string> = {
  // Maruti Suzuki
  swift: 'Maruti Suzuki',
  baleno: 'Maruti Suzuki',
  brezza: 'Maruti Suzuki',
  dzire: 'Maruti Suzuki',
  ertiga: 'Maruti Suzuki',
  'grand vitara': 'Maruti Suzuki',
  fronx: 'Maruti Suzuki',
  jimny: 'Maruti Suzuki',
  xl6: 'Maruti Suzuki',
  ignis: 'Maruti Suzuki',
  celerio: 'Maruti Suzuki',
  wagonr: 'Maruti Suzuki',
  'alto k10': 'Maruti Suzuki',
  's-presso': 'Maruti Suzuki',
  ciaz: 'Maruti Suzuki',
  'e vitara': 'Maruti Suzuki',
  victoris: 'Maruti Suzuki',

  // Hyundai
  creta: 'Hyundai',
  'creta electric': 'Hyundai',
  venue: 'Hyundai',
  'venue n line': 'Hyundai',
  i20: 'Hyundai',
  'i20 active': 'Hyundai',
  'i20 n line': 'Hyundai',
  verna: 'Hyundai',
  alcazar: 'Hyundai',
  tucson: 'Hyundai',
  exter: 'Hyundai',
  aura: 'Hyundai',
  'grand i10': 'Hyundai',
  'grand i10 nios': 'Hyundai',
  santro: 'Hyundai',
  xcent: 'Hyundai',
  elantra: 'Hyundai',
  eon: 'Hyundai',
  i10: 'Hyundai',

  // Tata
  nexon: 'Tata',
  'nexon ev': 'Tata',
  punch: 'Tata',
  'punch ev': 'Tata',
  harrier: 'Tata',
  safari: 'Tata',
  altroz: 'Tata',
  tiago: 'Tata',
  'tiago ev': 'Tata',
  tigor: 'Tata',
  'tigor ev': 'Tata',
  curvv: 'Tata',
  sierra: 'Tata',

  // Mahindra
  'scorpio n': 'Mahindra',
  'scorpio 7': 'Mahindra',
  thar: 'Mahindra',
  'thar roxx': 'Mahindra',
  xuv700: 'Mahindra',
  'xuv 3x0': 'Mahindra',
  bolero: 'Mahindra',

  // Kia
  seltos: 'Kia',
  sonet: 'Kia',
  carens: 'Kia',
  ev6: 'Kia',
  ev9: 'Kia',
  carnival: 'Kia',
  syros: 'Kia',
  'syros ev': 'Kia',

  // Toyota
  fortuner: 'Toyota',
  'innova crysta': 'Toyota',
  'innova hycross': 'Toyota',
  'urban cruiser': 'Toyota',
  'urban cruiser hyryder': 'Toyota',
  glanza: 'Toyota',
  camry: 'Toyota',
  hilux: 'Toyota',
  vellfire: 'Toyota',
  'land cruiser 300': 'Toyota',

  // Honda
  city: 'Honda',
  amaze: 'Honda',
  elevate: 'Honda',
  'zr-v': 'Honda',

  // MG
  'comet ev': 'MG',
  hector: 'MG',
  astor: 'MG',
  'zs ev': 'MG',
  'windsor ev': 'MG',
  gloster: 'MG',
  cyberster: 'MG',
  m9: 'MG',
  majestor: 'MG',
};

const BRAND_CANONICAL: Record<string, string> = {
  'maruti suzuki': 'Maruti Suzuki',
  maruti: 'Maruti Suzuki',
  hyundai: 'Hyundai',
  tata: 'Tata',
  mahindra: 'Mahindra',
  kia: 'Kia',
  toyota: 'Toyota',
  honda: 'Honda',
  mg: 'MG',
};

function canonicalBrand(b: unknown): string {
  if (typeof b !== 'string') return '';
  const lower = b.trim().toLowerCase();
  return BRAND_CANONICAL[lower] || b.trim();
}

function canonicalModel(m: unknown): string {
  if (typeof m !== 'string') return '';
  return m
    .trim()
    .split(/\s+/)
    .map((word) => {
      const up = word.toUpperCase();
      if (['EV', 'N', '3X0', '7D', 'K10', 'ZR-V', 'ZS', 'M9', 'XL6', 'PRO', 'DB', 'SB'].includes(up)) {
        return up;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

// In-memory cache with 5-minute TTL
let cachedVehiclesData: { data: StorefrontVehiclesData; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getActiveVehiclesFromDatabase(): Promise<StorefrontVehiclesData> {
  const now = Date.now();
  if (cachedVehiclesData && now - cachedVehiclesData.timestamp < CACHE_TTL_MS) {
    return cachedVehiclesData.data;
  }

  try {
    const pool = getPostgresPool();

    // 1. Fetch published ecommerce products with fitments
    const prodRes = await pool.query(`
      SELECT id, name, fitment, status, "categoryKey", "categoryLabel"
      FROM ecommerce_products
      WHERE status = 'PUBLISHED' AND fitment IS NOT NULL;
    `);

    const inventoryBrandModels: Record<string, Map<string, number>> = {};
    const allBrandModels: Record<string, Set<string>> = {};

    function recordInventoryFitment(rawBrand: unknown, rawModel: unknown, count = 1) {
      const b = canonicalBrand(rawBrand);
      const m = canonicalModel(rawModel);
      if (!b || !m || b.toLowerCase() === 'universal' || m.toLowerCase() === 'universal' || b === 'NA') return;

      if (!inventoryBrandModels[b]) inventoryBrandModels[b] = new Map();
      const current = inventoryBrandModels[b].get(m) || 0;
      inventoryBrandModels[b].set(m, current + count);

      if (!allBrandModels[b]) allBrandModels[b] = new Set();
      allBrandModels[b].add(m);
    }

    function recordCatalogVehicle(rawBrand: unknown, rawModel: unknown) {
      const b = canonicalBrand(rawBrand);
      const m = canonicalModel(rawModel);
      if (!b || !m || b.toLowerCase() === 'universal' || m.toLowerCase() === 'universal' || b === 'NA') return;
      if (!allBrandModels[b]) allBrandModels[b] = new Set();
      allBrandModels[b].add(m);
    }

    for (const prod of prodRes.rows) {
      let fit = prod.fitment;
      if (typeof fit === 'string') {
        try {
          fit = JSON.parse(fit);
        } catch {
          // ignore
        }
      }
      if (fit && typeof fit === 'object' && !Array.isArray(fit)) {
        const rec = fit as Record<string, unknown>;
        recordInventoryFitment(rec.brand, rec.model, 1);
      }
    }

    // 2. Fetch inventory items from ItemMaster matching key models
    try {
      const itemRes = await pool.query(`
        SELECT im.id, im.name, im."itemCode", COALESCE(bb."stockAvailable", 0) as stock
        FROM "ItemMaster" im
        LEFT JOIN "BinBalance" bb ON bb."itemId" = im.id
        WHERE im.name ILIKE '%nexon%' OR im.name ILIKE '%comet%' OR im.name ILIKE '%creta%' 
           OR im.name ILIKE '%swift%' OR im.name ILIKE '%thar%' OR im.name ILIKE '%scorpio%' 
           OR im.name ILIKE '%fortuner%' OR im.name ILIKE '%city%' OR im.name ILIKE '%seltos%';
      `);

      for (const item of itemRes.rows) {
        const up = item.name.toUpperCase();
        if (up.includes('TATA') || up.includes('NEXON')) recordInventoryFitment('Tata', 'Nexon', 1);
        else if (up.includes('MG') || up.includes('COMET')) recordInventoryFitment('MG', 'Comet EV', 1);
        else if (up.includes('CRETA') || up.includes('HYUNDAI')) recordInventoryFitment('Hyundai', 'Creta', 1);
        else if (up.includes('FORTUNER') || up.includes('TOYOTA')) recordInventoryFitment('Toyota', 'Fortuner', 1);
        else if (up.includes('SCORPIO') || up.includes('THAR') || up.includes('MAHINDRA')) {
          recordInventoryFitment('Mahindra', up.includes('THAR') ? 'Thar' : 'Scorpio N', 1);
        } else if (up.includes('SWIFT') || up.includes('MARUTI')) recordInventoryFitment('Maruti Suzuki', 'Swift', 1);
      }
    } catch (itemErr) {
      console.warn('ItemMaster query skipped in vehicles loader:', itemErr);
    }

    // 3. Fetch SpecFieldOption for Brand and Model master registry
    try {
      const specRes = await pool.query(`
        SELECT sf.name as field_name, sfo.label as option_label, sfo.value as option_value
        FROM "SpecFieldOption" sfo
        JOIN "SpecField" sf ON sfo."fieldId" = sf.id
        WHERE sf.name IN ('Brand', 'Model');
      `);

      for (const spec of specRes.rows) {
        if (spec.field_name === 'Brand') {
          const b = canonicalBrand(spec.option_label || spec.option_value);
          if (b && b !== 'NA' && !allBrandModels[b]) allBrandModels[b] = new Set();
        } else if (spec.field_name === 'Model') {
          const rawM = (spec.option_label || spec.option_value || '').trim();
          const brand = MODEL_TO_BRAND_LOOKUP[rawM.toLowerCase()];
          if (brand) {
            recordCatalogVehicle(brand, rawM);
          }
        }
      }
    } catch (specErr) {
      console.warn('SpecFieldOption query skipped in vehicles loader:', specErr);
    }

    const inventoryVehicles: ActiveInventoryVehicle[] = Object.keys(inventoryBrandModels)
      .filter((b) => b !== 'NA')
      .map((b) => {
        const modelMap = inventoryBrandModels[b];
        let totalItems = 0;
        const models = Array.from(modelMap.keys()).sort();
        for (const count of modelMap.values()) totalItems += count;
        return {
          brand: b,
          models,
          itemCount: totalItems,
        };
      })
      .sort((a, b) => b.itemCount - a.itemCount);

    const modelsByBrand: Record<string, string[]> = {};
    for (const [b, set] of Object.entries(allBrandModels)) {
      if (b === 'NA') continue;
      modelsByBrand[b] = Array.from(set).sort((a, b) => a.localeCompare(b));
    }

    const inventoryBrandSet = new Set(inventoryVehicles.map((v) => v.brand));
    const otherBrands = Object.keys(modelsByBrand)
      .filter((b) => !inventoryBrandSet.has(b))
      .sort();
    const sortedBrands = [...inventoryVehicles.map((v) => v.brand), ...otherBrands];

    const inventoryModels = Array.from(new Set(inventoryVehicles.flatMap((v) => v.models))).sort();

    const result: StorefrontVehiclesData = {
      success: true,
      source: 'database',
      brands: sortedBrands,
      modelsByBrand,
      inventoryVehicles,
      inventoryModels,
      totalFitmentsCount: inventoryVehicles.reduce((acc, v) => acc + v.itemCount, 0),
    };

    cachedVehiclesData = { data: result, timestamp: now };
    return result;
  } catch (error) {
    console.error('Error fetching vehicles from database, using fallback:', error);
    return getFallbackVehiclesData();
  }
}

export function getFallbackVehiclesData(): StorefrontVehiclesData {
  const fallbackModelsByBrand: Record<string, string[]> = {
    'Maruti Suzuki': ['Swift', 'Baleno', 'Brezza', 'Dzire', 'Ertiga', 'Grand Vitara', 'Fronx', 'Jimny'],
    Hyundai: ['Creta', 'Venue', 'i20', 'Verna', 'Tucson', 'Alcazar', 'Exter', 'Aura'],
    Tata: ['Nexon', 'Punch', 'Harrier', 'Safari', 'Altroz', 'Tiago', 'Curvv'],
    Mahindra: ['Scorpio N', 'Thar', 'Thar Roxx', 'XUV700', 'XUV 3X0', 'Bolero'],
    Kia: ['Seltos', 'Sonet', 'Carens', 'EV6', 'Carnival'],
    Toyota: ['Fortuner', 'Innova Crysta', 'Innova Hycross', 'Urban Cruiser Hyryder', 'Glanza'],
    Honda: ['City', 'Amaze', 'Elevate'],
    MG: ['Comet EV', 'Hector', 'Astor', 'ZS EV', 'Windsor EV'],
  };

  const inventoryVehicles: ActiveInventoryVehicle[] = [
    { brand: 'Mahindra', models: ['Scorpio N', 'Thar'], itemCount: 87 },
    { brand: 'Tata', models: ['Nexon'], itemCount: 45 },
    { brand: 'Hyundai', models: ['Creta'], itemCount: 21 },
    { brand: 'MG', models: ['Comet EV'], itemCount: 19 },
    { brand: 'Maruti Suzuki', models: ['Swift'], itemCount: 10 },
    { brand: 'Toyota', models: ['Fortuner'], itemCount: 3 },
    { brand: 'Honda', models: ['City'], itemCount: 2 },
    { brand: 'Kia', models: ['Seltos'], itemCount: 1 },
  ];

  return {
    success: true,
    source: 'fallback',
    brands: ['Mahindra', 'Tata', 'Hyundai', 'MG', 'Maruti Suzuki', 'Toyota', 'Honda', 'Kia'],
    modelsByBrand: fallbackModelsByBrand,
    inventoryVehicles,
    inventoryModels: ['City', 'Comet EV', 'Creta', 'Fortuner', 'Nexon', 'Scorpio N', 'Seltos', 'Swift', 'Thar'],
    totalFitmentsCount: 188,
  };
}


import { getPostgresPool } from './pg-supabase-adapter';

export interface ActiveInventoryVehicle {
  brand: string;
  models: string[];
  itemCount: number;
}

export interface StorefrontVehiclesData {
  success: boolean;
  source: 'database' | 'empty';
  brands: string[];
  modelsByBrand: Record<string, string[]>;
  inventoryVehicles: ActiveInventoryVehicle[];
  inventoryModels: string[];
  totalFitmentsCount: number;
}

function titleCaseBrand(raw: string): string {
  const clean = raw.trim().replace(/\s+/g, ' ');
  if (!clean) return '';
  const upper = clean.toUpperCase();
  if (['MG', 'BMW', 'BYD', 'VW', 'GWM', 'JLR'].includes(upper)) return upper;
  return clean
    .toLowerCase()
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

function canonicalModel(m: unknown): string {
  if (typeof m !== 'string') return '';
  return m
    .trim()
    .split(/\s+/)
    .map((word) => {
      const up = word.toUpperCase();
      if (['EV', 'N', '3X0', '7D', 'K10', 'ZR-V', 'ZS', 'M9', 'XL6', 'PRO', 'GT', 'GT3', 'RS'].includes(up)) {
        return up;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function isIgnoredToken(val: string): boolean {
  const lower = val.trim().toLowerCase();
  return !lower || lower === 'na' || lower === 'n/a' || lower === 'none' || lower.includes('universal') || lower.includes('all cars');
}

// Short in-memory cache (60s) so newly published vehicles/products appear promptly
let cachedVehiclesData: { data: StorefrontVehiclesData; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 1000;

export async function getActiveVehiclesFromDatabase(): Promise<StorefrontVehiclesData> {
  const now = Date.now();
  if (cachedVehiclesData && now - cachedVehiclesData.timestamp < CACHE_TTL_MS) {
    return cachedVehiclesData.data;
  }

  try {
    const pool = getPostgresPool();
    const storeSlug = process.env.NEXT_PUBLIC_ECOMMERCE_STORE_SLUG?.trim() || 'carxen';

    const inventoryBrandModels: Record<string, Map<string, number>> = {};
    const allBrandModels: Record<string, Set<string>> = {};
    const knownDbBrands: string[] = [];

    function registerKnownBrand(rawBrand: unknown): string {
      if (typeof rawBrand !== 'string') return '';
      if (isIgnoredToken(rawBrand)) return '';
      const formatted = titleCaseBrand(rawBrand);
      if (!formatted) return '';
      if (!allBrandModels[formatted]) {
        allBrandModels[formatted] = new Set();
        knownDbBrands.push(formatted);
      }
      return formatted;
    }

    function recordInventoryFitment(rawBrand: unknown, rawModel: unknown, count = 1) {
      const b = registerKnownBrand(rawBrand);
      const m = typeof rawModel === 'string' && !isIgnoredToken(rawModel) ? canonicalModel(rawModel) : '';
      if (!b) return;
      if (!inventoryBrandModels[b]) inventoryBrandModels[b] = new Map();
      if (m) {
        inventoryBrandModels[b].set(m, (inventoryBrandModels[b].get(m) ?? 0) + count);
        allBrandModels[b].add(m);
      }
    }

    // 1. Read live Brand & Model master options from VEDA SpecFieldOption (DB-only)
    try {
      const specRes = await pool.query(`
        SELECT sf.name as field_name, sfo.label as option_label, sfo.value as option_value
        FROM "SpecFieldOption" sfo
        JOIN "SpecField" sf ON sfo."fieldId" = sf.id
        WHERE sf.name IN ('Brand', 'Model')
        ORDER BY sfo.label ASC;
      `);

      for (const spec of specRes.rows) {
        if (spec.field_name === 'Brand') {
          registerKnownBrand(spec.option_label || spec.option_value);
        }
      }
    } catch (specErr) {
      console.warn('SpecFieldOption query skipped in vehicles loader:', specErr);
    }

    // 2. Read live Vehicle master table if populated in VEDA DB
    try {
      const vehRes = await pool.query(`
        SELECT DISTINCT make, model
        FROM "Vehicle"
        WHERE make IS NOT NULL AND TRIM(make) <> ''
        ORDER BY make ASC, model ASC;
      `);
      for (const row of vehRes.rows) {
        const b = registerKnownBrand(row.make);
        const m = typeof row.model === 'string' && !isIgnoredToken(row.model) ? canonicalModel(row.model) : '';
        if (b && m) {
          allBrandModels[b].add(m);
        }
      }
    } catch {
      // Vehicle table optional depending on schema version
    }

    // Sort known DB brands longest-first so "Maruti Suzuki" matches before "Maruti"
    const matchableBrands = [...knownDbBrands].sort((a, b) => b.length - a.length);

    function extractBrandModelFromText(text: string): { brand: string; model: string } | null {
      const trimmed = text.trim();
      if (!trimmed || isIgnoredToken(trimmed)) return null;
      const lower = trimmed.toLowerCase();

      for (const known of matchableBrands) {
        const kLower = known.toLowerCase();
        if (lower === kLower || lower.startsWith(`${kLower} `) || lower.includes(` ${kLower} `)) {
          const idx = lower.indexOf(kLower);
          const rest = trimmed
            .slice(idx + known.length)
            .replace(/\b(19|20)\d{2}\b/g, '')
            .replace(/\b(facelift|bs6|all variants|gen\s*\d+)\b/gi, '')
            .trim();
          const modelToken = rest.split(/[,/|()]/)[0]?.trim() || '';
          return { brand: known, model: modelToken };
        }
      }
      return null;
    }

    // 3. Read live published ecommerce_products for this store and parse ALL fitment formats
    const prodRes = await pool.query(
      `
      SELECT ep.id, ep.name, ep.fitment
      FROM ecommerce_products ep
      JOIN ecommerce_stores es ON es.id = ep."storeId"
      WHERE es.slug = $1
        AND ep.status = 'PUBLISHED'
        AND ep."publishedAt" IS NOT NULL;
      `,
      [storeSlug],
    );

    for (const prod of prodRes.rows) {
      let fit = prod.fitment;
      if (typeof fit === 'string') {
        try {
          fit = JSON.parse(fit);
        } catch {
          const parsed = extractBrandModelFromText(fit);
          if (parsed) recordInventoryFitment(parsed.brand, parsed.model, 1);
          continue;
        }
      }

      if (fit && typeof fit === 'object' && !Array.isArray(fit)) {
        const rec = fit as Record<string, unknown>;
        if (typeof rec.brand === 'string' && !isIgnoredToken(rec.brand)) {
          recordInventoryFitment(rec.brand, rec.model, 1);
          continue;
        }
        if (Array.isArray(rec.vehicles) && rec.vehicles.length > 0) {
          let matchedAny = false;
          for (const v of rec.vehicles) {
            if (typeof v === 'string') {
              const parsed = extractBrandModelFromText(v);
              if (parsed) {
                recordInventoryFitment(parsed.brand, parsed.model, 1);
                matchedAny = true;
              }
            }
          }
          if (matchedAny) continue;
        }
        if (typeof rec.summary === 'string') {
          const parsed = extractBrandModelFromText(rec.summary);
          if (parsed) {
            recordInventoryFitment(parsed.brand, parsed.model, 1);
            continue;
          }
        }
      }

      if (typeof prod.name === 'string') {
        const parsed = extractBrandModelFromText(prod.name);
        if (parsed) recordInventoryFitment(parsed.brand, parsed.model, 1);
      }
    }

    const inventoryVehicles: ActiveInventoryVehicle[] = Object.keys(inventoryBrandModels)
      .map((b) => {
        const modelMap = inventoryBrandModels[b];
        let totalItems = 0;
        const models = Array.from(modelMap.keys()).sort((a, b) => a.localeCompare(b));
        for (const count of modelMap.values()) totalItems += count;
        return { brand: b, models, itemCount: totalItems };
      })
      .sort((a, b) => b.itemCount - a.itemCount || a.brand.localeCompare(b.brand));

    const modelsByBrand: Record<string, string[]> = {};
    for (const [b, set] of Object.entries(allBrandModels)) {
      modelsByBrand[b] = Array.from(set).sort((a, b) => a.localeCompare(b));
    }

    const inventoryBrandSet = new Set(inventoryVehicles.map((v) => v.brand));
    const otherBrands = Object.keys(modelsByBrand)
      .filter((b) => !inventoryBrandSet.has(b))
      .sort((a, b) => a.localeCompare(b));
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
    console.error('Error fetching vehicles from database:', error);
    return {
      success: false,
      source: 'empty',
      brands: [],
      modelsByBrand: {},
      inventoryVehicles: [],
      inventoryModels: [],
      totalFitmentsCount: 0,
    };
  }
}

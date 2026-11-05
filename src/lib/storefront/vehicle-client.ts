export interface ActiveInventoryVehicle {
  brand: string;
  models: string[];
  itemCount: number;
}

export interface StorefrontVehiclesResponse {
  success: boolean;
  source: 'database' | 'veda_erp' | 'fallback';
  brands: string[];
  modelsByBrand: Record<string, string[]>;
  inventoryVehicles: ActiveInventoryVehicle[];
  inventoryModels: string[];
  totalFitmentsCount: number;
}

export const FALLBACK_VEHICLES: Record<string, string[]> = {
  Mahindra: ['Scorpio N', 'Thar', 'Thar Roxx', 'XUV700', 'XUV 3X0', 'Bolero'],
  Tata: ['Nexon', 'Punch', 'Harrier', 'Safari', 'Altroz', 'Tiago', 'Curvv'],
  Hyundai: ['Creta', 'Venue', 'i20', 'Verna', 'Tucson', 'Alcazar', 'Exter', 'Aura'],
  MG: ['Comet EV', 'Hector', 'Astor', 'ZS EV', 'Windsor EV'],
  'Maruti Suzuki': ['Swift', 'Baleno', 'Brezza', 'Dzire', 'Ertiga', 'Grand Vitara', 'Fronx', 'Jimny'],
  Toyota: ['Fortuner', 'Innova Crysta', 'Innova Hycross', 'Urban Cruiser Hyryder', 'Glanza'],
  Honda: ['City', 'Amaze', 'Elevate'],
  Kia: ['Seltos', 'Sonet', 'Carens', 'EV6', 'Carnival'],
};

export const FALLBACK_INVENTORY_VEHICLES: ActiveInventoryVehicle[] = [
  { brand: 'Mahindra', models: ['Scorpio N', 'Thar'], itemCount: 87 },
  { brand: 'Tata', models: ['Nexon'], itemCount: 45 },
  { brand: 'Hyundai', models: ['Creta'], itemCount: 21 },
  { brand: 'MG', models: ['Comet EV'], itemCount: 19 },
  { brand: 'Maruti Suzuki', models: ['Swift'], itemCount: 10 },
  { brand: 'Toyota', models: ['Fortuner'], itemCount: 3 },
  { brand: 'Honda', models: ['City'], itemCount: 2 },
  { brand: 'Kia', models: ['Seltos'], itemCount: 1 },
];

let inMemoryVehiclesCache: StorefrontVehiclesResponse | null = null;
const CACHE_STORAGE_KEY = 'cx_vehicles_registry_v1';

export async function loadActiveVehicles(signal?: AbortSignal): Promise<StorefrontVehiclesResponse> {
  if (inMemoryVehiclesCache) {
    return inMemoryVehiclesCache;
  }

  // Check localStorage if in browser
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(CACHE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StorefrontVehiclesResponse;
        if (parsed && Array.isArray(parsed.brands) && parsed.brands.length > 0) {
          inMemoryVehiclesCache = parsed;
          // Refresh asynchronously in background
          void fetchVehiclesFromServer().catch(() => {});
          return parsed;
        }
      }
    } catch {
      // ignore localStorage errors
    }
  }

  return fetchVehiclesFromServer(signal);
}

async function fetchVehiclesFromServer(signal?: AbortSignal): Promise<StorefrontVehiclesResponse> {
  try {
    const res = await fetch('/api/storefront/vehicles', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });

    if (!res.ok) {
      throw new Error(`Failed to load vehicle catalogue: HTTP ${res.status}`);
    }

    const json = (await res.json()) as StorefrontVehiclesResponse;
    if (json && Array.isArray(json.brands) && json.brands.length > 0) {
      inMemoryVehiclesCache = json;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(json));
        } catch {
          // ignore storage quota errors
        }
      }
      return json;
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    console.warn('Vehicle client fetch failed, returning static fallback:', err);
  }

  const fallback: StorefrontVehiclesResponse = {
    success: true,
    source: 'fallback',
    brands: Object.keys(FALLBACK_VEHICLES),
    modelsByBrand: FALLBACK_VEHICLES,
    inventoryVehicles: FALLBACK_INVENTORY_VEHICLES,
    inventoryModels: Array.from(new Set(FALLBACK_INVENTORY_VEHICLES.flatMap((v) => v.models))),
    totalFitmentsCount: 188,
  };

  inMemoryVehiclesCache = fallback;
  return fallback;
}


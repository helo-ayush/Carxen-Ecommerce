export interface ActiveInventoryVehicle {
  brand: string;
  models: string[];
  itemCount: number;
}

export interface StorefrontVehiclesResponse {
  success: boolean;
  source: 'database' | 'veda_erp' | 'empty';
  brands: string[];
  modelsByBrand: Record<string, string[]>;
  inventoryVehicles: ActiveInventoryVehicle[];
  inventoryModels: string[];
  totalFitmentsCount: number;
}

export const FALLBACK_VEHICLES: Record<string, string[]> = {};
export const FALLBACK_INVENTORY_VEHICLES: ActiveInventoryVehicle[] = [];

let inMemoryVehiclesCache: StorefrontVehiclesResponse | null = null;
const CACHE_STORAGE_KEY = 'cx_vehicles_registry_v2';

export async function loadActiveVehicles(signal?: AbortSignal): Promise<StorefrontVehiclesResponse> {
  if (inMemoryVehiclesCache && inMemoryVehiclesCache.source === 'database') {
    return inMemoryVehiclesCache;
  }

  return fetchVehiclesFromServer(signal);
}

async function fetchVehiclesFromServer(signal?: AbortSignal): Promise<StorefrontVehiclesResponse> {
  try {
    const res = await fetch('/api/storefront/vehicles', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal,
    });

    if (!res.ok) {
      throw new Error(`Failed to load vehicle catalogue: HTTP ${res.status}`);
    }

    const json = (await res.json()) as StorefrontVehiclesResponse;
    if (json && Array.isArray(json.brands)) {
      inMemoryVehiclesCache = json;
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('cx_vehicles_registry_v1');
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
    console.warn('Vehicle client fetch failed:', err);
  }

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

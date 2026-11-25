import type { Product } from '@/data/products';

export type GarageVehicle = {
  b?: string | null;
  m?: string | null;
  y?: string | null;
  f?: string | null;
};

export type FitmentVehicleEntry = {
  brand: string;
  model: string;
  yearFrom?: number;
  yearTo?: number;
  yearLabel?: string;
  fuels?: string[];
};

export type ProductFitment =
  | { kind: 'universal'; label: string }
  | {
      kind: 'vehicle';
      brand: string;
      model: string;
      detail: string;
      label: string;
      vehicles: FitmentVehicleEntry[];
    };

export type FitStatus = 'universal' | 'match' | 'other';

const UNIVERSAL_LABEL = 'Universal fit';

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function comparable(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function parseEntry(raw: unknown): FitmentVehicleEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const brand = text(r.brand) || text(r.vehicleBrand);
  const model = text(r.model) || text(r.vehicleModel);
  if (!brand && !model) return null;
  const yearFrom = typeof r.yearFrom === 'number' ? r.yearFrom : undefined;
  const yearTo = typeof r.yearTo === 'number' ? r.yearTo : undefined;
  const yearLabel = text(r.yearLabel) || text(r.year) || text(r.generation) || undefined;
  const fuels = Array.isArray(r.fuels)
    ? r.fuels.filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
    : undefined;
  return { brand, model, yearFrom, yearTo, yearLabel, fuels };
}

function entryMatchesCar(entry: FitmentVehicleEntry, car: GarageVehicle): boolean {
  const carBrand = comparable(text(car.b));
  const carModel = comparable(text(car.m));
  const entryBrand = comparable(entry.brand);
  const entryModel = comparable(entry.model);

  if (carBrand && entryBrand && carBrand !== entryBrand) {
    return false;
  }
  if (carModel) {
    if (!entryModel) return Boolean(carBrand && entryBrand && carBrand === entryBrand);
    const modelOk = entryModel === carModel || entryModel.includes(carModel) || carModel.includes(entryModel);
    if (!modelOk) return false;
  } else if (carBrand && entryBrand) {
    if (carBrand !== entryBrand) return false;
  }

  // Year range check if both car year and entry bounds are specified
  const carYearNum = Number(text(car.y));
  if (!Number.isNaN(carYearNum) && carYearNum > 1980) {
    if (typeof entry.yearFrom === 'number' && carYearNum < entry.yearFrom) return false;
    if (typeof entry.yearTo === 'number' && carYearNum > entry.yearTo) return false;
  }

  // Fuel check if both car fuel and entry fuels are specified
  const carFuel = comparable(text(car.f));
  if (carFuel && entry.fuels && entry.fuels.length > 0) {
    const fuelOk = entry.fuels.some((f) => {
      const cf = comparable(f);
      return cf === carFuel || cf.includes(carFuel) || carFuel.includes(cf);
    });
    if (!fuelOk) return false;
  }

  return Boolean(entryBrand || entryModel);
}

/**
 * Fitment is stored by the ERP either as a phrase ("Universal fit") or as a
 * resolved vehicle / multi-vehicle array. All shapes are read here uniformly.
 */
export function readFitment(product: Product): ProductFitment {
  const fitment = product.fitment;

  if (fitment && typeof fitment === 'object') {
    const record = fitment as Record<string, unknown>;
    if (record.isUniversal === true) {
      return { kind: 'universal', label: text(record.summary) || UNIVERSAL_LABEL };
    }

    const rawVehicles = Array.isArray(record.vehicles) ? record.vehicles : [];
    const vehicles: FitmentVehicleEntry[] = rawVehicles
      .map(parseEntry)
      .filter((x): x is FitmentVehicleEntry => x !== null);

    const brand = text(record.brand) || text(record.vehicleBrand) || vehicles[0]?.brand || '';
    const model = text(record.model) || text(record.vehicleModel) || vehicles[0]?.model || '';
    const detail = text(record.year) || text(record.generation) || vehicles[0]?.yearLabel || '';

    if (vehicles.length === 0 && (brand || model)) {
      vehicles.push({ brand, model, ...(detail ? { yearLabel: detail } : {}) });
    }

    if (vehicles.length > 0 || brand || model) {
      const defaultLabel =
        vehicles.length > 1
          ? `${vehicles[0].brand} ${vehicles[0].model} +${vehicles.length - 1} more`
          : [brand, model, detail].filter(Boolean).join(' ');
      return {
        kind: 'vehicle',
        brand,
        model,
        detail,
        label: text(record.summary) || defaultLabel,
        vehicles,
      };
    }
  }

  // If fitment is a string like "Hyundai Creta 2024 Facelift"
  const rawStr = text(fitment);
  if (rawStr && !/universal/i.test(rawStr)) {
    return {
      kind: 'vehicle',
      brand: '',
      model: '',
      detail: '',
      label: rawStr,
      vehicles: [],
    };
  }

  return { kind: 'universal', label: rawStr || UNIVERSAL_LABEL };
}

/**
 * True when the product is universal, or built for the customer's/dealer's vehicle.
 */
export function fitsVehicle(
  product: Product,
  car: GarageVehicle | null | undefined,
  options: { includeUniversal?: boolean } = {}
): boolean {
  const { includeUniversal = true } = options;
  const fitment = readFitment(product);
  if (fitment.kind === 'universal') return includeUniversal;

  if (!car || (!text(car.b) && !text(car.m))) return false;

  if (fitment.vehicles.length > 0) {
    if (fitment.vehicles.some((entry) => entryMatchesCar(entry, car))) {
      return true;
    }
  }

  // Fallback string match on label / product name when fitment was free-text
  const carBrand = comparable(text(car.b));
  const carModel = comparable(text(car.m));
  const hay = comparable(`${fitment.label} ${product.n || ''}`);
  if (carModel && hay.includes(carModel)) {
    return !carBrand || hay.includes(carBrand) || comparable(fitment.brand) === carBrand;
  }
  if (!carModel && carBrand) {
    return comparable(fitment.brand) === carBrand || hay.includes(carBrand);
  }
  return false;
}

export function fitStatus(product: Product, car: GarageVehicle | null | undefined): FitStatus {
  const fitment = readFitment(product);
  if (fitment.kind === 'universal') return 'universal';
  return fitsVehicle(product, car, { includeUniversal: false }) ? 'match' : 'other';
}

/** Short badge copy: claims a fit only when the product really is for that car. */
export function fitBadgeText(product: Product, car: GarageVehicle | null | undefined): string {
  const fitment = readFitment(product);
  if (fitment.kind === 'universal') return UNIVERSAL_LABEL;
  if (fitsVehicle(product, car, { includeUniversal: false })) {
    return `Fits ${text(car?.m) || fitment.model}`;
  }
  return `For ${fitment.label}`;
}

/** The vehicle the product is actually made for, or null when universal. */
export function fitmentVehicleLabel(product: Product): string | null {
  const fitment = readFitment(product);
  return fitment.kind === 'vehicle' ? fitment.label : null;
}

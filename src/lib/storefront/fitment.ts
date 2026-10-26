import type { Product } from '@/data/products';

export type GarageVehicle = {
  b?: string | null;
  m?: string | null;
  y?: string | null;
  f?: string | null;
};

export type ProductFitment =
  | { kind: 'universal'; label: string }
  | { kind: 'vehicle'; brand: string; model: string; detail: string; label: string };

export type FitStatus = 'universal' | 'match' | 'other';

const UNIVERSAL_LABEL = 'Universal fit';

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function comparable(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/**
 * Fitment is stored by the ERP either as a phrase ("Universal fit") or as a
 * resolved vehicle. Both shapes are read here so no screen has to guess.
 */
export function readFitment(product: Product): ProductFitment {
  const fitment = product.fitment;

  if (fitment && typeof fitment === 'object') {
    const record = fitment as Record<string, unknown>;
    const brand = text(record.brand);
    const model = text(record.model);
    const detail = text(record.year) || text(record.generation);
    if (brand || model) {
      return {
        kind: 'vehicle',
        brand,
        model,
        detail,
        label: text(record.summary) || [brand, model, detail].filter(Boolean).join(' '),
      };
    }
  }

  return { kind: 'universal', label: text(fitment) || UNIVERSAL_LABEL };
}

/**
 * True when the product is universal, or built for the customer's vehicle.
 * Without a vehicle on file nothing vehicle-specific can be claimed as a fit.
 */
export function fitsVehicle(product: Product, car: GarageVehicle | null | undefined): boolean {
  const fitment = readFitment(product);
  if (fitment.kind === 'universal') return true;

  const carBrand = comparable(text(car?.b));
  const carModel = comparable(text(car?.m));
  const productBrand = comparable(fitment.brand);
  const productModel = comparable(fitment.model);

  if (productModel && carModel) {
    return productModel === carModel && (!productBrand || !carBrand || productBrand === carBrand);
  }
  if (productBrand && carBrand) return productBrand === carBrand;
  return false;
}

export function fitStatus(product: Product, car: GarageVehicle | null | undefined): FitStatus {
  const fitment = readFitment(product);
  if (fitment.kind === 'universal') return 'universal';
  return fitsVehicle(product, car) ? 'match' : 'other';
}

/** Short badge copy: claims a fit only when the product really is for that car. */
export function fitBadgeText(product: Product, car: GarageVehicle | null | undefined): string {
  const fitment = readFitment(product);
  if (fitment.kind === 'universal') return UNIVERSAL_LABEL;
  if (fitsVehicle(product, car)) return `Fits ${text(car?.m) || fitment.model}`;
  return `For ${fitment.label}`;
}

/** The vehicle the product is actually made for, or null when universal. */
export function fitmentVehicleLabel(product: Product): string | null {
  const fitment = readFitment(product);
  return fitment.kind === 'vehicle' ? fitment.label : null;
}

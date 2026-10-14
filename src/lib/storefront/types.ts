import type { Product } from '@/data/products';

export interface StorefrontProductsResponse {
  store: {
    slug: string;
    settings?: Record<string, unknown>;
  };
  products: Product[];
}
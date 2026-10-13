import type { Product } from '@/data/products';

export interface StorefrontProductsResponse {
  store: {
    slug: string;
  };
  products: Product[];
}

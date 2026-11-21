import type { Product } from '@/data/products';

export interface StorefrontCategory {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  artKey?: string | null;
  parentId: string | null;
  sortOrder: number;
  productCount: number;
  totalProductCount: number;
  isMainNav?: boolean;
  children: StorefrontCategory[];
}

export interface StorefrontProductsResponse {
  store: {
    slug: string;
    settings?: Record<string, unknown>;
  };
  products: Product[];
  categories?: StorefrontCategory[];
  flatCategories?: StorefrontCategory[];
  mainNavCategoryIds?: string[];
}

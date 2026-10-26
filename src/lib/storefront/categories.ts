/**
 * Category keys come from the ERP's production item groups (see
 * ecommerce-production-catalog.ts). The storefront only translates legacy
 * short keys and never defines the set of available categories.
 */

const LEGACY_CATEGORY_ALIASES: Record<string, string> = {
  seats: 'seat-cover',
  mats: 'floor-mats',
  steering: 'steering-cover',
  comfort: 'neck-pillow',
};

const CATEGORY_ORDER: Record<string, number> = {
  'seat-cover': 0,
  'floor-mats': 1,
  'steering-cover': 2,
  'neck-pillow': 3,
};

export function slugifyCategory(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeCategoryKey(value: unknown): string {
  if (typeof value !== 'string') return 'accessories';
  const slug = slugifyCategory(value);
  if (!slug) return 'accessories';
  return LEGACY_CATEGORY_ALIASES[slug] ?? slug;
}

export function categoryLabel(key: string, label?: string | null): string {
  const explicit = label?.trim();
  if (explicit) return explicit;
  const words = key.split('-').filter(Boolean);
  if (words.length === 0) return 'Accessories';
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function categoryArtKey(key: string, label?: string | null): string {
  const text = `${key} ${label ?? ''}`.toLowerCase();
  if (text.includes('seat')) return 'seat';
  if (text.includes('mat') || text.includes('floor')) return 'mats';
  if (text.includes('steer') || text.includes('wheel') || text.includes('grip')) return 'wheel';
  if (text.includes('pillow') || text.includes('neck') || text.includes('cushion')) return 'pillow';
  if (text.includes('trunk') || text.includes('boot') || text.includes('liner')) return 'trunk';
  return 'arm';
}

export function categorySortIndex(key: string): number {
  return CATEGORY_ORDER[key] ?? 99;
}

export function compareCategories(
  a: { key: string; label: string },
  b: { key: string; label: string },
): number {
  const orderDiff = categorySortIndex(a.key) - categorySortIndex(b.key);
  return orderDiff !== 0 ? orderDiff : a.label.localeCompare(b.label);
}

export function isSeatCategory(key: string): boolean {
  return key.toLowerCase().includes('seat');
}

export function isMatCategory(key: string): boolean {
  const lower = key.toLowerCase();
  return lower.includes('mat') || lower.includes('floor');
}

export function isSteeringCategory(key: string): boolean {
  const lower = key.toLowerCase();
  return lower.includes('steer') || lower.includes('grip') || lower.includes('wheel');
}

export function isComfortCategory(key: string): boolean {
  const lower = key.toLowerCase();
  return lower.includes('pillow') || lower.includes('neck') || lower.includes('comfort') || lower.includes('cushion');
}

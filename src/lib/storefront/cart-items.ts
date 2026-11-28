export interface RawCartItemInput {
  productId?: unknown;
  quantity?: unknown;
}

export interface AggregatedCartItem {
  productId: number;
  quantity: number;
}

export const DEFAULT_MAX_QTY_PER_LINE = 10_000;
export const RETAIL_MAX_QTY_PER_LINE = 99;

/**
 * Validates each cart item has a positive integer productId and quantity,
 * enforces a per-line maximum, and aggregates duplicate productId entries
 * so stock, MOQ, and discountLimitQty checks always see the total quantity.
 */
export function aggregateAndValidateCartItems(
  items: unknown,
  options: { maxQtyPerLine?: number; maxLines?: number } = {}
): AggregatedCartItem[] {
  const maxQtyPerLine = options.maxQtyPerLine ?? DEFAULT_MAX_QTY_PER_LINE;
  const maxLines = options.maxLines ?? 100;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Your cart is empty.');
  }
  if (items.length > maxLines) {
    throw new Error(`Cart cannot exceed ${maxLines} line items.`);
  }

  const aggregated = new Map<number, number>();

  for (let i = 0; i < items.length; i++) {
    const raw = items[i] as RawCartItemInput | null | undefined;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error(`Cart item ${i + 1} is invalid.`);
    }

    const productId = typeof raw.productId === 'number' ? raw.productId : Number(raw.productId);
    if (!Number.isSafeInteger(productId) || productId < 1 || productId > 2_147_483_647) {
      throw new Error(`Cart item ${i + 1} product is invalid.`);
    }

    const quantity = typeof raw.quantity === 'number' ? raw.quantity : Number(raw.quantity);
    if (
      typeof raw.quantity === 'boolean' ||
      raw.quantity === null ||
      raw.quantity === '' ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > maxQtyPerLine
    ) {
      throw new Error(
        `Cart item ${i + 1} quantity must be a whole number between 1 and ${maxQtyPerLine}.`
      );
    }

    const nextTotal = (aggregated.get(productId) ?? 0) + quantity;
    if (!Number.isSafeInteger(nextTotal) || nextTotal > maxQtyPerLine) {
      throw new Error(
        `Total quantity for product #${productId} cannot exceed ${maxQtyPerLine}.`
      );
    }
    aggregated.set(productId, nextTotal);
  }

  return Array.from(aggregated.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

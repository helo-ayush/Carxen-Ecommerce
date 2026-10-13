export const ORDER_ACCESS_COOKIE_NAME = 'carxen_order_access';
export const ORDER_ACCESS_COOKIE_PATH = '/api/storefront/orders';
export const ORDER_ACCESS_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

const ORDER_ACCESS_TOKEN_PATTERN = /^[0-9a-f]{64}$/;

/** The RPC emits 32 random bytes as 64 lowercase hexadecimal characters. */
export function isOrderAccessToken(value: unknown): value is string {
  return typeof value === 'string' && ORDER_ACCESS_TOKEN_PATTERN.test(value);
}

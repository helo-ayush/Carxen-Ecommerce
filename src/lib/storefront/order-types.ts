export type StorefrontShippingSpeed = 'std' | 'exp';

export type StorefrontPaymentMethod =
  | 'UPI'
  | 'Card'
  | 'Net banking'
  | 'Cash on delivery';

export interface StorefrontCustomerSnapshot {
  name?: string;
  phone?: string;
  email?: string;
}

export interface StorefrontShippingAddressSnapshot {
  name?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface StorefrontCheckoutItem {
  productId: number;
  quantity: number;
}

export interface StorefrontCheckoutRequest {
  customer: StorefrontCustomerSnapshot;
  shippingAddress: StorefrontShippingAddressSnapshot;
  items: StorefrontCheckoutItem[];
  shippingSpeed: StorefrontShippingSpeed;
  paymentMethod: StorefrontPaymentMethod;
  couponCode: string | null;
}

export interface StorefrontOrderSummary {
  orderNumber: string;
  currency: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  totalAmount: number;
  paymentStatus: string;
  fulfillmentStatus: string;
  couponCode: string | null;
}

export interface StorefrontOrderItemSnapshot {
  productId: number;
  productSlug?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
}

export interface StorefrontOrderSnapshot extends StorefrontOrderSummary {
  customer: StorefrontCustomerSnapshot;
  shippingAddress: StorefrontShippingAddressSnapshot;
  placedAt: string | null;
  items: StorefrontOrderItemSnapshot[];
}

export interface StorefrontOrderSummaryResponse {
  order: StorefrontOrderSummary;
}

export interface StorefrontOrderSnapshotResponse {
  order: StorefrontOrderSnapshot;
}

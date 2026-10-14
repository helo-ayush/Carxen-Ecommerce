export interface CustomerAddress {
  id: string;
  label: string; // 'Home' | 'Office' | 'Garage & Workshop' | 'Other'
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isPrimary: boolean;
}

export type OrderProgressStatus =
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface CustomerOrderItem {
  productId: number;
  productSlug?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  image?: string;
  category?: string;
}

export interface CustomerOrderHistoryRecord {
  id: string;
  orderNumber: string;
  placedAt: string;
  status: OrderProgressStatus;
  statusMessage?: string;
  paymentStatus: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
  paymentMethod: string;
  trackingNumber: string;
  carrier: string;
  trackingUrl?: string;
  estimatedDelivery: string;
  shippingAddress: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: CustomerOrderItem[];
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  totalAmount: number;
  currency: string;
}

export interface SavedPaymentMethod {
  id: string;
  type: 'card' | 'upi';
  title: string;
  last4OrVpa: string;
  expiry?: string;
  brand?: 'Visa' | 'Mastercard' | 'Amex' | 'RuPay' | 'UPI';
  isDefault: boolean;
}

export interface CommunicationPreferences {
  whatsappUpdates: boolean;
  smsAlerts: boolean;
  emailNewsletter: boolean;
  garageFitmentAlerts: boolean;
}

export interface GstBillingInfo {
  enabled: boolean;
  companyName: string;
  gstin: string;
}

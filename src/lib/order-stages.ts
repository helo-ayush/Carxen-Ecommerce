import type { OrderProgressStatus } from '@/types/customer';

// Mirrors the ERP fulfilment pipeline stages exactly (Confirmed → Packed → Shipped → Out for delivery → Delivered).
export const ORDER_STAGE_LABELS: Record<OrderProgressStatus, string> = {
  CONFIRMED: 'Confirmed',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export const ORDER_STAGE_FLOW: OrderProgressStatus[] = [
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export const ACTIVE_ORDER_STATUSES: OrderProgressStatus[] = [
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
];

export function normalizeOrderStatus(status: string): OrderProgressStatus {
  const upper = (status || '').toUpperCase().replace(/[\s-]+/g, '_');
  if ((ORDER_STAGE_LABELS as Record<string, string>)[upper]) {
    return upper as OrderProgressStatus;
  }
  if (upper === 'PROCESSING' || upper === 'PAID') return 'PACKED';
  return 'CONFIRMED';
}

export function orderStageStep(status: OrderProgressStatus): number {
  const idx = ORDER_STAGE_FLOW.indexOf(status);
  return idx === -1 ? 0 : idx + 1;
}

export function getOrderStatusMessage(status: OrderProgressStatus): string {
  switch (status) {
    case 'CONFIRMED':
      return 'Order confirmed and registered at CARXEN fulfillment center';
    case 'PACKED':
      return 'Packed at the CARXEN fulfilment centre — awaiting courier pickup';
    case 'SHIPPED':
      return 'Dispatched via premium express logistics network';
    case 'OUT_FOR_DELIVERY':
      return 'Driver out for delivery — expected by 7:00 PM';
    case 'DELIVERED':
      return 'Successfully delivered to verified recipient';
    case 'CANCELLED':
      return 'Order cancelled';
    default:
      return 'Order in progress';
  }
}

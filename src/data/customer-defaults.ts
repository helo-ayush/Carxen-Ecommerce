import type {
  CustomerAddress,
  CustomerOrderHistoryRecord,
  SavedPaymentMethod,
  CommunicationPreferences,
  GstBillingInfo,
} from '@/types/customer';

export const DEFAULT_CUSTOMER_ADDRESSES: CustomerAddress[] = [];

export const DEFAULT_ORDER_HISTORY: CustomerOrderHistoryRecord[] = [];

export const DEFAULT_SAVED_PAYMENTS: SavedPaymentMethod[] = [];

export const DEFAULT_COMMUNICATION_PREFS: CommunicationPreferences = {
  whatsappUpdates: true,
  smsAlerts: true,
  emailNewsletter: true,
  garageFitmentAlerts: true,
};

export const DEFAULT_GST_INFO: GstBillingInfo = {
  enabled: false,
  companyName: '',
  gstin: '',
};

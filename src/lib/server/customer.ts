import { getSupabaseAdmin } from './supabase-admin';
import type { CustomerAddress, CustomerOrderHistoryRecord, OrderProgressStatus } from '@/types/customer';

export const STORE_ID = 'store_carxen';
export const FACTORY_ID = 'fac_demo';

export interface CustomerDbRow {
  id: string;
  storeId: string;
  factoryId: string;
  authUserId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AddressDbRow {
  id: string;
  storeId: string;
  factoryId: string;
  customerId: string;
  label: string | null;
  addressType: string;
  recipientName: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  isDefault: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export async function getAuthenticatedCustomer(request: Request): Promise<{
  user: any | null;
  customer: CustomerDbRow | null;
}> {
  const supabase = getSupabaseAdmin();
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : null;

  let authUser: any = null;

  if (token) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        authUser = data.user;
      }
    } catch (err) {
      console.warn('Error verifying auth token:', err);
    }
  }

  const demoUserId = request.headers.get('x-demo-user-id');
  const demoUserEmail = request.headers.get('x-demo-user-email');

  if (authUser) {
    // Find customer by authUserId or email
    let { data: customer } = await supabase
      .from('ecommerce_customers')
      .select('*')
      .or(`authUserId.eq.${authUser.id},email.eq.${authUser.email}`)
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!customer) {
      // Auto-provision customer
      const now = new Date().toISOString();
      const newCust = {
        id: `cust_${crypto.randomUUID().replace(/-/g, '')}`,
        storeId: STORE_ID,
        factoryId: FACTORY_ID,
        authUserId: authUser.id,
        name:
          authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          authUser.email?.split('@')[0] ||
          'Driver',
        email: authUser.email,
        phone: authUser.user_metadata?.phone || null,
        status: 'ACTIVE',
        metadata: {
          avatarUrl: authUser.user_metadata?.avatar_url || '',
          tier: 'Apex Gold Member',
          rewardPoints: 1450,
          joinedDate: new Date(authUser.created_at || Date.now()).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          }),
        },
        createdAt: now,
        updatedAt: now,
      };

      const { data: created, error: createErr } = await supabase
        .from('ecommerce_customers')
        .insert(newCust)
        .select()
        .single();

      if (createErr) {
        console.error('Failed to provision customer row:', createErr);
      } else {
        customer = created;
      }
    } else if (!customer.authUserId) {
      // Link existing customer row with this auth user ID
      await supabase
        .from('ecommerce_customers')
        .update({ authUserId: authUser.id, updatedAt: new Date().toISOString() })
        .eq('id', customer.id);
      customer.authUserId = authUser.id;
    }

    return { user: authUser, customer };
  }

  // Fallback for demo mode user if specified
  if (demoUserEmail || demoUserId) {
    const query = demoUserEmail
      ? supabase.from('ecommerce_customers').select('*').eq('email', demoUserEmail)
      : supabase.from('ecommerce_customers').select('*').eq('id', demoUserId);

    let { data: customer } = await query.maybeSingle();

    if (!customer && demoUserEmail) {
      const now = new Date().toISOString();
      const { data: created } = await supabase
        .from('ecommerce_customers')
        .insert({
          id: demoUserId || `cust_demo_${crypto.randomUUID().slice(0, 8)}`,
          storeId: STORE_ID,
          factoryId: FACTORY_ID,
          name: demoUserEmail.split('@')[0] || 'Driver',
          email: demoUserEmail,
          phone: '+91 98201 44829',
          status: 'ACTIVE',
          metadata: {
            avatarUrl: '',
            tier: 'Apex Gold Member',
            rewardPoints: 1450,
            joinedDate: 'Oct 2024',
          },
          createdAt: now,
          updatedAt: now,
        })
        .select()
        .single();

      customer = created;
    }

    return { user: null, customer: customer || null };
  }

  return { user: null, customer: null };
}

export function mapAddressDbToDto(row: AddressDbRow): CustomerAddress {
  const meta = (row.metadata || {}) as Record<string, any>;
  return {
    id: row.id,
    label: row.label || 'Home',
    name: row.recipientName,
    phone: row.phone || '',
    addressLine1: row.line1,
    addressLine2: row.line2 || undefined,
    landmark: meta.landmark || undefined,
    city: row.city,
    state: row.state || 'Maharashtra',
    postalCode: row.postalCode,
    country: row.country || 'India',
    isPrimary: Boolean(row.isDefault),
  };
}

export async function loadCustomerAddresses(customerId: string): Promise<CustomerAddress[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('ecommerce_addresses')
    .select('*')
    .eq('customerId', customerId)
    .order('isDefault', { ascending: false })
    .order('createdAt', { ascending: false });

  if (error || !data) return [];
  return (data as AddressDbRow[]).map(mapAddressDbToDto);
}

function normalizeOrderStatus(status: string): OrderProgressStatus {
  const upper = (status || '').toUpperCase();
  if (['CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].includes(upper)) {
    return upper as OrderProgressStatus;
  }
  if (upper === 'PENDING') return 'CONFIRMED';
  if (upper === 'PAID') return 'PROCESSING';
  return 'CONFIRMED';
}

function getStatusMessage(status: OrderProgressStatus): string {
  switch (status) {
    case 'CONFIRMED':
      return 'Order confirmed and registered at CARXEN fulfillment center';
    case 'PROCESSING':
      return 'Performance quality check and high-torque packaging in progress';
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

export async function loadCustomerOrders(
  customerId: string,
  customerEmail?: string | null
): Promise<CustomerOrderHistoryRecord[]> {
  const supabase = getSupabaseAdmin();

  let filter = `customerId.eq.${customerId}`;
  if (customerEmail && customerEmail.trim()) {
    filter += `,customerSnapshot->>email.ilike.${customerEmail.trim()}`;
  }

  const { data: orders, error: ordersErr } = await supabase
    .from('ecommerce_orders')
    .select('*')
    .or(filter)
    .order('placedAt', { ascending: false })
    .order('createdAt', { ascending: false });

  if (ordersErr || !orders || orders.length === 0) {
    return [];
  }

  const orderIds = orders.map((o: any) => o.id);

  // Fetch items
  const { data: items } = await supabase
    .from('ecommerce_order_items')
    .select('*')
    .in('orderId', orderIds);

  // Fetch shipments
  const { data: shipments } = await supabase
    .from('ecommerce_shipments')
    .select('*')
    .in('orderId', orderIds);

  const itemsByOrder = new Map<string, any[]>();
  (items || []).forEach((item: any) => {
    const list = itemsByOrder.get(item.orderId) || [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  });

  const shipmentByOrder = new Map<string, any>();
  (shipments || []).forEach((ship: any) => {
    if (!shipmentByOrder.has(ship.orderId)) {
      shipmentByOrder.set(ship.orderId, ship);
    }
  });

  return orders.map((o: any): CustomerOrderHistoryRecord => {
    const orderItems = itemsByOrder.get(o.id) || [];
    const shipment = shipmentByOrder.get(o.id);

    const progressStatus = normalizeOrderStatus(shipment?.status || o.fulfillmentStatus || o.status);
    const trackingNumber =
      shipment?.trackingNumber || `CX-EXP-${o.orderNumber.replace(/[^A-Za-z0-9]/g, '').slice(-6)}`;
    const carrier = shipment?.carrier || 'Delhivery Priority Express';

    const placedDate = o.placedAt || o.createdAt;
    const estDeliveryDate = new Date(Date.parse(placedDate) + 3 * 864e5).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    const custSnap = (o.customerSnapshot || {}) as Record<string, any>;
    const shipSnap = (o.shippingAddressSnapshot || {}) as Record<string, any>;

    return {
      id: o.id,
      orderNumber: o.orderNumber,
      placedAt: placedDate,
      status: progressStatus,
      statusMessage: getStatusMessage(progressStatus),
      paymentStatus: (o.paymentStatus?.toUpperCase() as any) || 'PAID',
      paymentMethod: custSnap.paymentMethod || 'UPI Payment',
      trackingNumber,
      carrier,
      trackingUrl: `https://www.delhivery.com/track/package/${trackingNumber}`,
      estimatedDelivery: estDeliveryDate,
      shippingAddress: {
        name: shipSnap.name || shipSnap.fullName || custSnap.name || 'Driver',
        phone: shipSnap.phone || custSnap.phone || '',
        addressLine1: shipSnap.addressLine1 || shipSnap.line1 || '',
        addressLine2: shipSnap.addressLine2 || shipSnap.line2 || undefined,
        city: shipSnap.city || 'Pune',
        state: shipSnap.state || 'Maharashtra',
        postalCode: shipSnap.postalCode || '411045',
        country: shipSnap.country || 'India',
      },
      items: orderItems.map((it: any) => ({
        productId: it.productPublicId || 1,
        productSlug: it.productSlug || undefined,
        name: it.nameSnapshot,
        quantity: it.quantity,
        unitPrice: it.unitPriceSnapshot,
        lineSubtotal: it.lineSubtotal,
        category: it.metadata?.category || undefined,
        image: it.metadata?.image || undefined,
      })),
      subtotal: o.subtotal,
      discountAmount: o.discountAmount || 0,
      shippingAmount: o.shippingAmount || 0,
      totalAmount: o.totalAmount,
      currency: o.currency || 'INR',
    };
  });
}

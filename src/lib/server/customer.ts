import { getSupabaseAdmin } from './supabase-admin';
import { getOrderStatusMessage, normalizeOrderStatus } from '@/lib/order-stages';
import type { CustomerAddress, CustomerOrderHistoryRecord, OrderProgressStatus } from '@/types/customer';

// Primary store and factory resolved dynamically by slug
export const DEFAULT_STORE_SLUG = process.env.NEXT_PUBLIC_ECOMMERCE_STORE_SLUG?.trim() || 'carxen';
export const STORE_ID = 'cmvcigiiu0000l208locjorcn';
export const FACTORY_ID = 'fac_demo';

let cachedStoreMeta: { storeId: string; factoryId: string } | null = null;

export async function resolveStoreMeta(): Promise<{ storeId: string; factoryId: string }> {
  if (cachedStoreMeta) return cachedStoreMeta;

  try {
    const supabase = getSupabaseAdmin();
    const slug = (process.env.NEXT_PUBLIC_ECOMMERCE_STORE_SLUG || 'carxen').trim();
    const { data: store } = await supabase
      .from('ecommerce_stores')
      .select('id, factoryId')
      .eq('slug', slug)
      .maybeSingle();

    if (store?.id) {
      cachedStoreMeta = {
        storeId: store.id,
        factoryId: store.factoryId || FACTORY_ID,
      };
      return cachedStoreMeta;
    }
  } catch (err) {
    console.warn('Could not resolve store meta by slug:', err);
  }

  return {
    storeId: STORE_ID,
    factoryId: FACTORY_ID,
  };
}

function buildCarrierTrackingUrl(carrier: string, trackingNumber: string): string | undefined {
  if (!trackingNumber) return undefined;
  const c = (carrier || '').toLowerCase();
  if (c.includes('delhivery')) return `https://www.delhivery.com/track/package/${encodeURIComponent(trackingNumber)}`;
  if (c.includes('blue') || c.includes('dart')) return `https://www.bluedart.com/tracking?trackNumber=${encodeURIComponent(trackingNumber)}`;
  if (c.includes('shiprocket')) return `https://shiprocket.co/tracking/${encodeURIComponent(trackingNumber)}`;
  return undefined;
}

export interface CustomerDbRow {
  id: string;
  storeId: string;
  factoryId: string;
  authUserId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  b2bStatus?: string | null;
  businessName?: string | null;
  tradeName?: string | null;
  gstin?: string | null;
  pan?: string | null;
  businessType?: string | null;
  businessAddress?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  expectedMonthlyVolume?: string | null;
  wholesaleTier?: string | null;
  b2bAppliedAt?: string | null;
  b2bReviewedAt?: string | null;
  b2bRejectionReason?: string | null;
  b2bDocuments?: any | null;
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
  let token = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : null;

  const cookieHeader = request.headers.get('cookie') || '';
  if (!token && cookieHeader) {
    const match = cookieHeader.match(/cx_session=([^;]+)/);
    if (match) {
      token = decodeURIComponent(match[1].trim());
    }
  }

  if (!token && cookieHeader) {
    const sbMatch = cookieHeader.match(/sb-[a-z0-9_-]+-auth-token=([^;]+)/i);
    if (sbMatch) {
      try {
        const raw = decodeURIComponent(sbMatch[1]);
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed[0]) {
          token = parsed[0];
        } else if (parsed?.access_token) {
          token = parsed.access_token;
        }
      } catch {}
    }
  }

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

  const demoUserId = request.headers.get('x-demo-user-id')?.trim();
  const demoUserEmail = request.headers.get('x-demo-user-email')?.trim();

  if (authUser) {
    // Find customer by authUserId or email
    const authOrFilters: string[] = [`authUserId.eq.${authUser.id}`];
    if (authUser.email && authUser.email.trim()) {
      authOrFilters.push(`email.ilike.${authUser.email.trim()}`);
    }

    let { data: customer } = await supabase
      .from('ecommerce_customers')
      .select('*')
      .or(authOrFilters.join(','))
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!customer) {
      // Auto-provision customer
      const { storeId, factoryId } = await resolveStoreMeta();
      const now = new Date().toISOString();
      const newCust = {
        id: `cust_${crypto.randomUUID().replace(/-/g, '')}`,
        storeId,
        factoryId,
        authUserId: authUser.id,
        name:
          authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          authUser.email?.split('@')[0] ||
          'Driver',
        email: authUser.email ? authUser.email.toLowerCase().trim() : null,
        phone: authUser.user_metadata?.phone || null,
        status: 'ACTIVE',
        metadata: {
          avatarUrl: authUser.user_metadata?.avatar_url || '',
          rewardPoints: 250,
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
        const { data: retry } = await supabase
          .from('ecommerce_customers')
          .select('*')
          .or(authOrFilters.join(','))
          .limit(1)
          .maybeSingle();
        customer = retry;
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

    return { user: authUser, customer: customer || null };
  }

  // Fallback for user identified by header (e.g. demo mode or client state)
  if (demoUserEmail || demoUserId) {
    const filters: string[] = [];
    if (demoUserId) {
      filters.push(`id.eq.${demoUserId}`, `authUserId.eq.${demoUserId}`);
    }
    if (demoUserEmail) {
      filters.push(`email.ilike.${demoUserEmail}`);
    }

    let { data: customer } = filters.length > 0
      ? await supabase
          .from('ecommerce_customers')
          .select('*')
          .or(filters.join(','))
          .order('createdAt', { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null };

    if (!customer && (demoUserEmail || demoUserId)) {
      const { storeId, factoryId } = await resolveStoreMeta();
      const cleanEmail = demoUserEmail ? demoUserEmail.toLowerCase() : null;
      const now = new Date().toISOString();
      const idToUse = demoUserId || `cust_demo_${crypto.randomUUID().slice(0, 8)}`;
      const { data: created, error: insertErr } = await supabase
        .from('ecommerce_customers')
        .insert({
          id: idToUse,
          storeId,
          factoryId,
          name: cleanEmail ? cleanEmail.split('@')[0] : 'Driver',
          email: cleanEmail,
          phone: '+91 98201 44829',
          status: 'ACTIVE',
          metadata: {
            avatarUrl: '',
            rewardPoints: 250,
            joinedDate: 'Oct 2024',
          },
          createdAt: now,
          updatedAt: now,
        })
        .select()
        .single();

      if (insertErr) {
        console.error('Failed to provision customer fallback row:', insertErr);
        const { data: retry } = await supabase
          .from('ecommerce_customers')
          .select('*')
          .or(filters.join(','))
          .limit(1)
          .maybeSingle();
        customer = retry;
      } else {
        customer = created;
      }
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

  if (!error && data && data.length > 0) {
    return (data as AddressDbRow[]).map(mapAddressDbToDto);
  }

  // If customer has no addresses in DB, check if customer is demo account
  const { data: customerRow } = await supabase
    .from('ecommerce_customers')
    .select('id, name, email, phone')
    .eq('id', customerId)
    .maybeSingle();

  if (customerRow && (customerRow.email === 'aarav.speed@carxen.io' || customerId.includes('demo'))) {
    const { storeId, factoryId } = await resolveStoreMeta();
    const now = new Date().toISOString();
    const demoAddresses = [
      {
        id: `addr_demo_home_${customerId.slice(-6)}`,
        storeId,
        factoryId,
        customerId: customerId,
        label: 'Home',
        addressType: 'SHIPPING',
        recipientName: customerRow.name || 'Aarav Sharma',
        phone: customerRow.phone || '+91 99719 07190',
        line1: '939/2, Tilak Gali, Kashmere Gate',
        line2: 'Tilak Gali Commercial Belt',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110006',
        country: 'India',
        isDefault: true,
        metadata: { landmark: 'Near Kashmere Gate Metro' },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `addr_demo_office_${customerId.slice(-6)}`,
        storeId,
        factoryId,
        customerId: customerId,
        label: 'Office / Studio',
        addressType: 'SHIPPING',
        recipientName: customerRow.name || 'Aarav Sharma',
        phone: customerRow.phone || '+91 99719 07190',
        line1: 'Shop No. 12, Commercial Auto Complex, Mori Gate',
        line2: 'Kashmere Gate Market',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110006',
        country: 'India',
        isDefault: false,
        metadata: { landmark: 'Opposite GPO' },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `addr_demo_garage_${customerId.slice(-6)}`,
        storeId,
        factoryId,
        customerId: customerId,
        label: 'Garage & Workshop',
        addressType: 'SHIPPING',
        recipientName: customerRow.name || 'Aarav Sharma',
        phone: customerRow.phone || '+91 99719 07190',
        line1: 'Shed 18, Commercial Auto Hub, Mayapuri',
        line2: 'Phase 1 Industrial Area',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110064',
        country: 'India',
        isDefault: false,
        metadata: { landmark: 'Behind Shell Petroleum Station' },
        createdAt: now,
        updatedAt: now,
      },
    ];

    const { data: insertedRows, error: seedErr } = await supabase
      .from('ecommerce_addresses')
      .insert(demoAddresses)
      .select();

    if (!seedErr && insertedRows) {
      return (insertedRows as AddressDbRow[]).map(mapAddressDbToDto);
    }
  }

  return [];
}

export async function loadCustomerOrders(
  customerId: string,
  customerEmail?: string | null,
  authUserId?: string | null
): Promise<CustomerOrderHistoryRecord[]> {
  const supabase = getSupabaseAdmin();

  const filters: string[] = [`customerId.eq.${customerId}`];
  if (authUserId && authUserId.trim()) {
    filters.push(`customerId.eq.${authUserId.trim()}`);
  }
  if (customerEmail && customerEmail.trim()) {
    filters.push(`customerSnapshot->>email.ilike.${customerEmail.trim()}`);
  }

  const { data: orders, error: ordersErr } = await supabase
    .from('ecommerce_orders')
    .select('*')
    .or(filters.join(','))
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

  // Fetch the fulfilment event history written by VEDA
  const { data: orderEvents } = await supabase
    .from('ecommerce_order_events')
    .select('id, orderId, type, source, createdAt')
    .in('orderId', orderIds)
    .order('createdAt', { ascending: false });

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

  const eventsByOrder = new Map<string, { type: string; source: string; at: string }[]>();
  const customerVisibleEvents = new Set([
    'ORDER_PLACED',
    'CONFIRMED',
    'PACKED',
    'SHIPPED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'DELIVERY_FAILED',
    'CANCELLED',
  ]);
  (orderEvents || []).forEach((event: any) => {
    if (!customerVisibleEvents.has(event.type)) return;
    const list = eventsByOrder.get(event.orderId) || [];
    list.push({ type: event.type, source: event.source, at: event.createdAt });
    eventsByOrder.set(event.orderId, list);
  });

  return orders.map((o: any): CustomerOrderHistoryRecord => {
    const orderItems = itemsByOrder.get(o.id) || [];
    const shipment = shipmentByOrder.get(o.id);

    const progressStatus = normalizeOrderStatus(shipment?.status || o.fulfillmentStatus || o.status);
    // CarXen delivers with its own fleet: the shipment reference is the daily run number.
    const trackingNumber = shipment?.trackingNumber || '';
    const carrier = shipment?.carrier || 'CarXen Delivery';
    const trackingUrl = buildCarrierTrackingUrl(carrier, trackingNumber);

    const placedDate = o.placedAt || o.createdAt;
    const estimatedDelivery =
      typeof shipment?.metadata?.estimatedDelivery === 'string' ? shipment.metadata.estimatedDelivery : '';

    const custSnap = (o.customerSnapshot || {}) as Record<string, any>;
    const shipSnap = (o.shippingAddressSnapshot || {}) as Record<string, any>;

    return {
      id: o.id,
      orderNumber: o.orderNumber,
      placedAt: placedDate,
      status: progressStatus,
      statusMessage: getOrderStatusMessage(progressStatus),
      paymentStatus: (o.paymentStatus?.toUpperCase() as any) || 'PAID',
      paymentMethod: custSnap.paymentMethod || 'UPI Payment',
      trackingNumber,
      carrier,
      trackingUrl,
      estimatedDelivery,
      events: eventsByOrder.get(o.id) || [],
      shippingAddress: {
        name: shipSnap.name || shipSnap.fullName || custSnap.name || 'Driver',
        phone: shipSnap.phone || custSnap.phone || '',
        addressLine1: shipSnap.addressLine1 || shipSnap.line1 || '',
        addressLine2: shipSnap.addressLine2 || shipSnap.line2 || undefined,
        city: shipSnap.city || 'Delhi',
        state: shipSnap.state || 'Delhi',
        postalCode: shipSnap.postalCode || '110006',
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

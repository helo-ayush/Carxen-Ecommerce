import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import { getAuthenticatedCustomer, STORE_ID, FACTORY_ID } from '@/lib/server/customer';
import { getStorefrontProducts } from '@/lib/storefront/catalog';
import type { Product } from '@/data/products';
import { calculateItemPriceWithOfferLimit } from '@/lib/storefront/wholesale-pricing';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      items,
      businessName,
      tradeName,
      gstin,
      pan,
      representativeName,
      email,
      phone,
      shippingAddress,
      billingAddress,
      poNumber,
      requestedDeliveryDate,
      partialShipmentAllowed,
      factoryNotes,
    } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Your wholesale order basket is empty. Please add SKUs with valid MOQs.' },
        { status: 400 }
      );
    }

    if (!businessName?.trim()) {
      return NextResponse.json(
        { error: 'Legal Business Name is required for wholesale orders.' },
        { status: 400 }
      );
    }

    if (!shippingAddress?.line1 || !shippingAddress?.city || !shippingAddress?.postalCode) {
      return NextResponse.json(
        { error: 'Complete delivery address (line 1, city, and 6-digit PIN) is required.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    let authUser: any = null;
    let customer: any = null;

    try {
      const auth = await getAuthenticatedCustomer(request);
      authUser = auth.user;
      customer = auth.customer;
    } catch {
      // Unauthenticated
    }

    // Load catalog to get authoritative wholesale pricing & verify MOQs
    let catalog: Product[] = [];
    try {
      const catalogRes = await getStorefrontProducts({ isWholesale: true });
      catalog = catalogRes.products || [];
    } catch {}

    let subtotal = 0;
    const validatedItems: {
      productId: number;
      productName: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[] = [];

    for (const item of items) {
      const pid = Number(item.productId);
      const qty = Number(item.quantity);
      if (!Number.isFinite(pid) || !Number.isFinite(qty) || qty <= 0) continue;

      const p = catalog.find((x: Product) => x.id === pid);
      if (!p) continue;

      const moq = Math.max(1, p.b2bMoq || 5);
      if (qty < moq) {
        return NextResponse.json(
          { error: `Item "${p.n}" requires a minimum wholesale order quantity (MOQ) of ${moq} units (entered: ${qty}).` },
          { status: 400 }
        );
      }

      const priceResult = calculateItemPriceWithOfferLimit(p, qty, true);
      const lineSubtotal = priceResult.totalPrice;
      const unitWholesalePrice = Math.round(lineSubtotal / qty);

      subtotal += lineSubtotal;
      validatedItems.push({
        productId: p.id,
        productName: p.n,
        sku: p.slug || `CX-SKU-${p.id}`,
        quantity: qty,
        unitPrice: unitWholesalePrice,
        totalPrice: lineSubtotal,
      });
    }

    if (validatedItems.length === 0) {
      return NextResponse.json(
        { error: 'No valid wholesale products found in the submitted basket.' },
        { status: 400 }
      );
    }

    // 18% GST estimate for automotive components
    const gstRate = 0.18;
    const gstAmount = Math.round(subtotal * gstRate);
    const totalOrderValue = subtotal + gstAmount;

    // Generate B2B order identifier
    const randNum = Math.floor(10000 + Math.random() * 90000);
    const orderNumber = `CX-B2B-${randNum}`;
    const orderId = `ord_${crypto.randomUUID().replace(/-/g, '')}`;
    const now = new Date().toISOString();

    const customerSnapshot = {
      businessName: businessName.trim(),
      tradeName: tradeName?.trim() || null,
      gstin: gstin?.trim().toUpperCase() || null,
      pan: pan?.trim().toUpperCase() || null,
      representativeName: representativeName?.trim() || customer?.name || authUser?.user_metadata?.full_name || 'Authorized Buyer',
      email: (email || customer?.email || authUser?.email || '').trim().toLowerCase(),
      phone: (phone || customer?.phone || '').trim(),
      wholesaleTier: customer?.wholesaleTier || 'tier1',
      b2bStatus: customer?.b2bStatus || 'APPROVED',
      isB2BWholesale: true,
    };

    const shippingSnapshot = {
      recipientName: shippingAddress.recipientName || representativeName || businessName,
      companyName: businessName.trim(),
      phone: shippingAddress.phone || phone || '',
      line1: shippingAddress.line1.trim(),
      line2: shippingAddress.line2?.trim() || '',
      city: shippingAddress.city.trim(),
      state: shippingAddress.state?.trim() || 'Maharashtra',
      postalCode: shippingAddress.postalCode.trim(),
      country: 'IN',
      dispatchPreference: partialShipmentAllowed ? 'Partial Dispatch Allowed' : 'Complete Dispatch Only',
    };

    const billingSnapshot = billingAddress?.line1
      ? {
          recipientName: billingAddress.recipientName || businessName,
          companyName: businessName.trim(),
          phone: billingAddress.phone || phone || '',
          line1: billingAddress.line1.trim(),
          line2: billingAddress.line2?.trim() || '',
          city: billingAddress.city.trim(),
          state: billingAddress.state?.trim() || 'Maharashtra',
          postalCode: billingAddress.postalCode.trim(),
          country: 'IN',
          gstin: gstin?.trim().toUpperCase() || null,
        }
      : shippingSnapshot;

    const formattedNotes = [
      poNumber ? `PO Reference: ${poNumber.trim()}` : null,
      requestedDeliveryDate ? `Requested Delivery Date: ${requestedDeliveryDate.trim()}` : null,
      partialShipmentAllowed ? 'Partial batch shipment accepted' : 'Ship complete consignment only',
      factoryNotes?.trim() ? `Factory Notes: ${factoryNotes.trim()}` : null,
    ].filter(Boolean).join(' | ');

    // Insert authoritative wholesale order in ecommerce_orders
    // PAYMENT IS OFFLINE / COMMERCIAL TERMS (ZERO ONLINE PAYMENT)
    const { error: orderInsertErr } = await supabase
      .from('ecommerce_orders')
      .insert({
        id: orderId,
        storeId: STORE_ID,
        factoryId: FACTORY_ID,
        orderNumber,
        customerId: customer?.id || null,
        channel: 'WHOLESALE_PORTAL',
        status: 'CONFIRMED_BY_BUYER',
        paymentStatus: 'OFFLINE_COMMERCIAL_TERMS',
        fulfillmentStatus: 'PENDING',
        currency: 'INR',
        subtotal,
        discountAmount: 0,
        taxAmount: gstAmount,
        shippingAmount: 0,
        totalAmount: totalOrderValue,
        customerSnapshot,
        shippingAddressSnapshot: shippingSnapshot,
        billingAddressSnapshot: billingSnapshot,
        notes: formattedNotes || 'Wholesale Order Request submitted via /wholesale portal.',
        placedAt: now,
        createdAt: now,
        updatedAt: now,
      });

    if (orderInsertErr) {
      console.error('Failed to create wholesale order in database:', orderInsertErr);
      return NextResponse.json(
        { error: 'Could not record wholesale order request. Please review your details and try again.' },
        { status: 500 }
      );
    }

    // Insert order line items
    const orderItemsRows = validatedItems.map((it) => ({
      id: `item_${crypto.randomUUID().replace(/-/g, '')}`,
      orderId,
      storeId: STORE_ID,
      factoryId: FACTORY_ID,
      productPublicId: it.productId,
      name: it.productName,
      sku: it.sku,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      totalPrice: it.totalPrice,
      metadata: { isWholesale: true },
      createdAt: now,
      updatedAt: now,
    }));

    const { error: itemsInsertErr } = await supabase
      .from('ecommerce_order_items')
      .insert(orderItemsRows);

    if (itemsInsertErr) {
      console.warn('Could not insert wholesale order line items:', itemsInsertErr);
    }

    // Insert initial factory shipment tracking stub
    try {
      await supabase.from('ecommerce_shipments').insert({
        id: `ship_${crypto.randomUUID().replace(/-/g, '')}`,
        orderId,
        storeId: STORE_ID,
        factoryId: FACTORY_ID,
        shipmentNumber: `SHP-${orderNumber}`,
        status: 'CONFIRMED',
        carrier: 'CarXen Factory Dedicated Line',
        trackingNumber: `CX-B2B-EXP-${Math.floor(100000 + Math.random() * 900000)}`,
        shippingAddressSnapshot: shippingSnapshot,
        metadata: {
          orderType: 'Wholesale B2B Batch Consignment',
          requestedDeliveryDate: requestedDeliveryDate || 'Standard Factory Lead Time (3–5 Days)',
        },
        createdAt: now,
        updatedAt: now,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      order: {
        id: orderId,
        orderNumber,
        status: 'CONFIRMED_BY_BUYER',
        paymentStatus: 'OFFLINE_COMMERCIAL_TERMS',
        subtotal,
        taxAmount: gstAmount,
        totalAmount: totalOrderValue,
        itemsCount: validatedItems.length,
        totalUnits: validatedItems.reduce((sum, it) => sum + it.quantity, 0),
        poNumber: poNumber || null,
        placedAt: now,
      },
      message: 'Wholesale order request submitted successfully. Awaiting CarXen Veda verification & proforma issuance.',
    });
  } catch (err) {
    console.error('Unexpected error in wholesale order placement:', err);
    return NextResponse.json(
      { error: 'An unexpected issue occurred while submitting your order request. Please try again.' },
      { status: 500 }
    );
  }
}

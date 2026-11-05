import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import { getAuthenticatedCustomer, resolveStoreMeta } from '@/lib/server/customer';
import { getStorefrontProducts } from '@/lib/storefront/catalog';
import type { Product } from '@/data/products';
import { calculateItemPriceWithOfferLimit } from '@/lib/storefront/wholesale-pricing';
import {
  createRazorpayOrder,
  getRazorpayConfig,
  verifyRazorpaySignature,
  fetchAndVerifyRazorpayPayment,
} from '@/lib/server/razorpay';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      action,
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
      couponCode,
      discountAmount,
      paymentMethod,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
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

    let authUser: any = null;
    let customer: any = null;
    try {
      const auth = await getAuthenticatedCustomer(request);
      authUser = auth.user;
      customer = auth.customer;
    } catch {
      // Unauthenticated / guest session fallback
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

    // Validate coupon and apply authoritative discounts (reject client-supplied discountAmount)
    let couponDiscount = 0;
    let campaignId: string | null = null;
    let validCouponCode: string | null = null;

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const codeUpper = couponCode.trim().toUpperCase();
      const supabaseAdmin = getSupabaseAdmin();
      const { data: campaign } = await supabaseAdmin
        .from('ecommerce_campaigns')
        .select('*')
        .eq('code', codeUpper)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      if (!campaign) {
        return NextResponse.json(
          { error: `Coupon "${codeUpper}" is invalid or expired.` },
          { status: 400 }
        );
      }

      const now = new Date();
      if (campaign.startsAt && new Date(campaign.startsAt) > now) {
        return NextResponse.json(
          { error: `Coupon "${campaign.code}" is not active yet.` },
          { status: 400 }
        );
      }
      if (campaign.endsAt && new Date(campaign.endsAt) < now) {
        return NextResponse.json(
          { error: `Coupon "${campaign.code}" has expired.` },
          { status: 400 }
        );
      }
      if (campaign.usageLimit && campaign.usageCount && Number(campaign.usageCount) >= Number(campaign.usageLimit)) {
        return NextResponse.json(
          { error: `Coupon "${campaign.code}" has reached its maximum usage limit.` },
          { status: 400 }
        );
      }
      if (campaign.minimumOrderAmount && subtotal < Number(campaign.minimumOrderAmount)) {
        return NextResponse.json(
          {
            error: `Minimum order of ₹${Number(campaign.minimumOrderAmount).toLocaleString('en-IN')} required to use coupon "${campaign.code}". Current subtotal is ₹${subtotal.toLocaleString('en-IN')}.`,
          },
          { status: 400 }
        );
      }

      // Check audience eligibility and targeted B2B buyer rules
      const rules = campaign.audienceRules && typeof campaign.audienceRules === 'object' ? campaign.audienceRules : {};
      const targetEmail = rules.targetWholesaleBuyerEmail ? String(rules.targetWholesaleBuyerEmail).toLowerCase().trim() : null;
      const targetName = rules.targetWholesaleBuyerName ? String(rules.targetWholesaleBuyerName).toLowerCase().trim() : null;
      const targetBuyerId = rules.targetWholesaleBuyerId ? String(rules.targetWholesaleBuyerId).trim() : null;

      const buyerEmail = (email || customer?.email || authUser?.email || '').toLowerCase().trim();
      const buyerBiz = (businessName || '').toLowerCase().trim();
      const buyerTrade = (tradeName || '').toLowerCase().trim();
      const buyerName = (representativeName || customer?.name || '').toLowerCase().trim();
      const buyerId = customer?.id || authUser?.id || '';

      const isTargeted = Boolean(targetEmail || targetName || targetBuyerId);

      if (isTargeted) {
        let matches = false;
        if (targetEmail && buyerEmail && targetEmail === buyerEmail) {
          matches = true;
        }
        if (!matches && targetName) {
          if (buyerBiz && (buyerBiz === targetName || buyerBiz.includes(targetName) || targetName.includes(buyerBiz))) {
            matches = true;
          } else if (buyerTrade && (buyerTrade === targetName || buyerTrade.includes(targetName) || targetName.includes(buyerTrade))) {
            matches = true;
          } else if (buyerName && (buyerName === targetName || buyerName.includes(targetName) || targetName.includes(buyerName))) {
            matches = true;
          }
        }
        if (!matches && targetBuyerId && buyerId && targetBuyerId === buyerId) {
          matches = true;
        }

        if (!matches) {
          const targetLabel = rules.targetWholesaleBuyerName || rules.targetWholesaleBuyerEmail || 'an assigned business partner';
          return NextResponse.json(
            { error: `Coupon "${campaign.code}" is exclusive to ${targetLabel}.` },
            { status: 400 }
          );
        }
      }

      // Authoritative discount calculation strictly from DB campaign settings
      validCouponCode = campaign.code;
      campaignId = campaign.id;
      const val = Number(campaign.discountValue) || 0;
      if (campaign.discountType === 'PERCENTAGE' || campaign.discountType === 'Percentage') {
        couponDiscount = Math.round((subtotal * val) / 100);
        if (campaign.maxDiscountAmount && couponDiscount > Number(campaign.maxDiscountAmount)) {
          couponDiscount = Math.round(Number(campaign.maxDiscountAmount));
        }
      } else {
        couponDiscount = Math.min(subtotal, Math.round(val));
      }
    }

    const discountedSubtotal = Math.max(0, subtotal - couponDiscount);
    // 18% GST for wholesale components
    const gstRate = 0.18;
    const gstAmount = Math.round(discountedSubtotal * gstRate);
    const totalOrderValue = discountedSubtotal + gstAmount;

    // ACTION: Create Razorpay Order for B2B Checkout
    if (action === 'create-razorpay-order') {
      const amountInPaise = Math.round(totalOrderValue * 100);
      const receipt = `cx_ws_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      const rzpOrder = await createRazorpayOrder({
        amountInPaise,
        currency: 'INR',
        receipt,
        notes: {
          storeSlug: 'carxen',
          channel: 'WHOLESALE_PORTAL',
          businessName: businessName?.trim() || '',
          customerName: representativeName?.trim() || businessName?.trim() || 'Wholesale Buyer',
          customerEmail: email?.trim() || '',
          customerPhone: phone?.trim() || '',
          gstin: gstin?.trim().toUpperCase() || '',
          couponCode: validCouponCode || '',
          discountAmount: String(couponDiscount),
        },
      });

      const { keyId } = getRazorpayConfig();

      return NextResponse.json({
        success: true,
        razorpayOrderId: rzpOrder.id,
        amount: amountInPaise,
        currency: 'INR',
        keyId,
        isMock: rzpOrder.isMock,
        subtotal,
        discountAmount: couponDiscount,
        couponCode: validCouponCode,
        gstAmount,
        totalAmount: totalOrderValue,
      });
    }

    // ORDER PLACEMENT FLOW
    if (!shippingAddress?.line1 || !shippingAddress?.city || !shippingAddress?.postalCode) {
      return NextResponse.json(
        { error: 'Complete delivery address (line 1, city, and 6-digit PIN) is required.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const isRazorpay = paymentMethod === 'Razorpay' || paymentMethod === 'razorpay';
    const paymentStatus: 'PAID' | 'PENDING' = isRazorpay ? 'PAID' : 'PENDING';
    const resolvedPaymentMethod = isRazorpay ? 'Razorpay Secure (UPI / Cards / NetBanking)' : 'Cash on delivery';

    // Step 1: Verification if payment is via Razorpay
    let verifiedPayment: any = null;
    if (isRazorpay) {
      if (!razorpayOrderId || !razorpayPaymentId) {
        return NextResponse.json(
          { error: 'Missing Razorpay order ID or payment ID for online payment.' },
          { status: 400 }
        );
      }

      // Verify HMAC-SHA256 signature
      const isValid = verifyRazorpaySignature({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature || '',
      });
      if (!isValid) {
        return NextResponse.json(
          { error: 'Payment signature verification failed. Please try again.' },
          { status: 400 }
        );
      }

      // Direct Razorpay API verification (checks status, order_id, and amount)
      const amountInPaise = Math.round(totalOrderValue * 100);
      try {
        verifiedPayment = await fetchAndVerifyRazorpayPayment({
          razorpay_payment_id: razorpayPaymentId,
          expected_order_id: razorpayOrderId,
          expected_amount_in_paise: amountInPaise,
        });
      } catch (paymentErr: any) {
        console.error('Razorpay B2B payment verification failed:', paymentErr);
        return NextResponse.json(
          { error: paymentErr?.message || 'Payment could not be verified with Razorpay.' },
          { status: 400 }
        );
      }

      // Anti-replay protection: check if payment ID was already used
      const supabaseAdmin = getSupabaseAdmin();
      const { data: existingPayment } = await supabaseAdmin
        .from('ecommerce_payments')
        .select('id, orderId')
        .eq('providerPaymentId', razorpayPaymentId)
        .maybeSingle();

      if (existingPayment) {
        console.error('Duplicate B2B payment reuse attempt:', razorpayPaymentId);
        return NextResponse.json(
          { error: 'This payment transaction has already been recorded for an existing order.' },
          { status: 409 }
        );
      }
    }

    const now = new Date().toISOString();

    const orderMetadata = isRazorpay
      ? {
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: razorpaySignature || null,
          paid_amount_in_paise: Math.round(totalOrderValue * 100),
          paid_at: now,
          payment_method: verifiedPayment?.method || 'razorpay',
        }
      : null;

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
      paymentMethod: resolvedPaymentMethod,
      orderMetadata: orderMetadata || null,
      poNumber: poNumber?.trim() || null,
      requestedDeliveryDate: requestedDeliveryDate?.trim() || null,
      partialShipmentAllowed: Boolean(partialShipmentAllowed),
      consignmentNotes: factoryNotes?.trim() || null,
      couponCode: validCouponCode || null,
      couponDiscount,
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
      poNumber: poNumber?.trim() || null,
      requestedDeliveryDate: requestedDeliveryDate?.trim() || null,
      consignmentNotes: factoryNotes?.trim() || null,
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
      requestedDeliveryDate ? `Target Delivery Date: ${requestedDeliveryDate.trim()}` : null,
      partialShipmentAllowed ? 'Partial batch consignment dispatch allowed' : 'Ship complete consignment only',
      factoryNotes?.trim() ? `Consignment Notes: ${factoryNotes.trim()}` : null,
      validCouponCode ? `Coupon Applied: ${validCouponCode} (-₹${couponDiscount})` : null,
    ].filter(Boolean).join(' | ');

    // Insert authoritative wholesale order in ecommerce_orders with collision retry
    const { storeId, factoryId } = await resolveStoreMeta();
    const MAX_ORDER_INSERT_RETRIES = 5;
    let orderInserted = false;
    let orderNumber = '';
    let orderId = '';
    let lastInsertError: any = null;

    for (let attempt = 1; attempt <= MAX_ORDER_INSERT_RETRIES; attempt++) {
      orderId = `ord_${crypto.randomUUID().replace(/-/g, '')}`;
      // High-entropy 6-digit random identifier (100000 to 999999 -> 900,000 combinations)
      const randDigits = Math.floor(100000 + Math.random() * 900000);
      orderNumber = `CX-B2B-${randDigits}`;

      const { error: insertErr } = await supabase
        .from('ecommerce_orders')
        .insert({
          id: orderId,
          storeId,
          factoryId,
          orderNumber,
          customerId: customer?.id || null,
          campaignId: campaignId || null,
          couponCode: validCouponCode || null,
          channel: 'WHOLESALE_PORTAL',
          status: 'CONFIRMED',
          paymentStatus,
          fulfillmentStatus: 'PENDING',
          currency: 'INR',
          subtotal,
          discountAmount: couponDiscount,
          taxAmount: gstAmount,
          shippingAmount: 0,
          totalAmount: totalOrderValue,
          customerSnapshot,
          shippingAddressSnapshot: shippingSnapshot,
          billingAddressSnapshot: billingSnapshot,
          notes: formattedNotes || 'Wholesale Order placed via /wholesale portal.',
          placedAt: now,
          createdAt: now,
          updatedAt: now,
        });

      if (!insertErr) {
        orderInserted = true;
        break;
      }

      lastInsertError = insertErr;
      const isDuplicateKey =
        insertErr.code === '23505' ||
        insertErr.message?.toLowerCase().includes('duplicate') ||
        insertErr.message?.toLowerCase().includes('unique');

      if (isDuplicateKey && attempt < MAX_ORDER_INSERT_RETRIES) {
        console.warn(`[Wholesale Order] Order number collision on ${orderNumber}. Retrying attempt ${attempt + 1}/${MAX_ORDER_INSERT_RETRIES}...`);
        continue;
      } else {
        console.error('[Wholesale Order] Database insertion error:', insertErr);
        break;
      }
    }

    if (!orderInserted) {
      console.error('Failed to create wholesale order in database after retries:', lastInsertError);
      return NextResponse.json(
        { error: 'Could not record wholesale order. Please review your details and try again.' },
        { status: 500 }
      );
    }

    // Insert order line items
    const orderItemsRows = validatedItems.map((it) => ({
      id: `item_${crypto.randomUUID().replace(/-/g, '')}`,
      orderId,
      storeId,
      factoryId,
      productPublicId: it.productId,
      nameSnapshot: it.productName,
      skuSnapshot: it.sku,
      quantity: it.quantity,
      unitPriceSnapshot: it.unitPrice,
      lineSubtotal: it.totalPrice,
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

    // Increment coupon campaign usage if applicable
    if (campaignId) {
      try {
        const { data: currentCamp } = await supabase
          .from('ecommerce_campaigns')
          .select('usageCount')
          .eq('id', campaignId)
          .maybeSingle();
        const nextCount = (Number(currentCamp?.usageCount) || 0) + 1;
        await supabase
          .from('ecommerce_campaigns')
          .update({ usageCount: nextCount, updatedAt: now })
          .eq('id', campaignId);
      } catch (campErr) {
        console.warn('Could not increment campaign usage count:', campErr);
      }
    }

    // If paid via Razorpay, insert payment record
    if (isRazorpay && razorpayPaymentId) {
      try {
        await supabase.from('ecommerce_payments').insert({
          id: `pay_${crypto.randomUUID().replace(/-/g, '')}`,
          orderId,
          storeId,
          factoryId,
          provider: 'razorpay',
          providerPaymentId: razorpayPaymentId,
          method: verifiedPayment?.method || 'ONLINE',
          status: 'CAPTURED',
          amount: totalOrderValue,
          currency: 'INR',
          metadata: {
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: razorpayPaymentId,
            razorpay_signature: razorpaySignature || null,
            paid_amount_in_paise: Math.round(totalOrderValue * 100),
            paid_at: now,
          },
          paidAt: now,
          createdAt: now,
          updatedAt: now,
        });
      } catch (payErr) {
        console.warn('Could not record ecommerce_payments row:', payErr);
      }
    }

    // Insert initial factory shipment tracking stub
    try {
      await supabase.from('ecommerce_shipments').insert({
        id: `ship_${crypto.randomUUID().replace(/-/g, '')}`,
        orderId,
        storeId,
        factoryId,
        shipmentNumber: `SHP-${orderNumber}`,
        status: 'CONFIRMED',
        carrier: 'CarXen Factory Dedicated Line',
        trackingNumber: `CX-B2B-EXP-${Math.floor(100000 + Math.random() * 900000)}`,
        shippingAddressSnapshot: shippingSnapshot,
        metadata: {
          orderType: 'Wholesale B2B Batch Consignment',
          paymentMethod: resolvedPaymentMethod,
          paymentStatus,
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
        status: 'CONFIRMED',
        paymentStatus,
        paymentMethod: resolvedPaymentMethod,
        subtotal,
        taxAmount: gstAmount,
        totalAmount: totalOrderValue,
        itemsCount: validatedItems.length,
        totalUnits: validatedItems.reduce((sum, it) => sum + it.quantity, 0),
        poNumber: poNumber || null,
        placedAt: now,
      },
      message: 'Wholesale order placed successfully.',
    });
  } catch (err) {
    console.error('Unexpected error in wholesale order placement:', err);
    return NextResponse.json(
      { error: 'An unexpected issue occurred while submitting your order. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber') || searchParams.get('id');

    if (!orderNumber || !orderNumber.trim()) {
      return NextResponse.json({ error: 'Order reference is required.' }, { status: 400 });
    }

    const { user, customer } = await getAuthenticatedCustomer(request);
    if (!user && !customer) {
      return NextResponse.json({ error: 'Authentication required to view wholesale order details.' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const cleanNum = orderNumber.trim();

    const { data: order, error: orderErr } = await supabase
      .from('ecommerce_orders')
      .select('*')
      .or(`orderNumber.eq.${cleanNum},id.eq.${cleanNum}`)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    // Authorization verification
    const authEmail = (user?.email || customer?.email || '').toLowerCase().trim();
    const custId = customer?.id || user?.id || '';
    const snapEmail = ((order.customerSnapshot as any)?.email || '').toLowerCase().trim();
    const orderCustId = order.customerId || '';

    const isAuthorized =
      (custId && orderCustId && custId === orderCustId) ||
      (authEmail && snapEmail && authEmail === snapEmail) ||
      user?.role === 'admin';

    if (!isAuthorized) {
      return NextResponse.json({ error: 'You are not authorized to view this consignment.' }, { status: 403 });
    }

    // Fetch line items
    const { data: items } = await supabase
      .from('ecommerce_order_items')
      .select('*')
      .eq('orderId', order.id);

    // Fetch shipment tracking stub
    const { data: shipment } = await supabase
      .from('ecommerce_shipments')
      .select('*')
      .eq('orderId', order.id)
      .maybeSingle();

    // Fetch order history milestones / events
    const { data: events } = await supabase
      .from('ecommerce_order_events')
      .select('*')
      .eq('orderId', order.id)
      .order('createdAt', { ascending: false });

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        items: items || [],
        shipment: shipment || null,
        events: events || [],
      },
    });
  } catch (err: any) {
    console.error('Error fetching wholesale order details:', err);
    return NextResponse.json({ error: 'Failed to retrieve order details.' }, { status: 500 });
  }
}

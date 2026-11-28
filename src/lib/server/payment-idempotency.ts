/**
 * Shared payment idempotency & rollback helpers for Razorpay order placement.
 */

export async function resolveIdempotentPaymentOrder(
  supabaseAdmin: any,
  providerPaymentId: string,
  expectedCustomerId: string | null,
  expectedRazorpayOrderId: string | null
): Promise<{ kind: 'none' } | { kind: 'idempotent'; order: any } | { kind: 'conflict' }> {
  const { data: existingPayment } = await supabaseAdmin
    .from('ecommerce_payments')
    .select('id, orderId, metadata')
    .eq('providerPaymentId', providerPaymentId)
    .maybeSingle();

  if (!existingPayment) {
    return { kind: 'none' };
  }

  const { data: existingOrder } = await supabaseAdmin
    .from('ecommerce_orders')
    .select(
      'id, orderNumber, storeId, customerId, status, paymentStatus, fulfillmentStatus, currency, subtotal, discountAmount, taxAmount, shippingAmount, totalAmount, couponCode, placedAt'
    )
    .eq('id', existingPayment.orderId)
    .maybeSingle();

  if (!existingOrder) {
    return { kind: 'conflict' };
  }

  const sameCustomer =
    (!expectedCustomerId && !existingOrder.customerId) ||
    (Boolean(expectedCustomerId) && existingOrder.customerId === expectedCustomerId);

  const recordedRzpOrderId = (existingPayment.metadata as any)?.razorpay_order_id || null;
  const sameRazorpayOrder =
    !expectedRazorpayOrderId || !recordedRzpOrderId || recordedRzpOrderId === expectedRazorpayOrderId;

  if (sameCustomer && sameRazorpayOrder) {
    return { kind: 'idempotent', order: existingOrder };
  }

  return { kind: 'conflict' };
}

export async function rollbackFailedPaidOrder(
  supabaseAdmin: any,
  params: {
    orderId: string;
    storeId?: string | null;
    couponCode?: string | null;
    campaignId?: string | null;
  }
): Promise<void> {
  const { orderId, storeId, couponCode, campaignId } = params;
  try {
    await supabaseAdmin.from('ecommerce_order_events').delete().eq('orderId', orderId);
  } catch {}
  try {
    await supabaseAdmin.from('ecommerce_shipments').delete().eq('orderId', orderId);
  } catch {}
  try {
    await supabaseAdmin.from('ecommerce_order_items').delete().eq('orderId', orderId);
  } catch {}
  try {
    await supabaseAdmin.from('ecommerce_orders').delete().eq('id', orderId);
  } catch {}

  if (campaignId || (couponCode && storeId)) {
    try {
      let query = supabaseAdmin.from('ecommerce_campaigns').select('id, usageCount');
      if (campaignId) {
        query = query.eq('id', campaignId);
      } else {
        query = query.eq('storeId', storeId).eq('code', couponCode);
      }
      const { data: camp } = await query.maybeSingle();
      if (camp && Number(camp.usageCount) > 0) {
        await supabaseAdmin
          .from('ecommerce_campaigns')
          .update({
            usageCount: Math.max(0, Number(camp.usageCount) - 1),
            updatedAt: new Date().toISOString(),
          })
          .eq('id', camp.id);
      }
    } catch {}
  }
}

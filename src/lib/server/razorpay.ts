import crypto from 'crypto';

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
}

export class PaymentGatewayUnavailableError extends Error {
  constructor(
    message = 'Online payment gateway is currently unavailable. Please try again later or choose Cash on Delivery (COD).'
  ) {
    super(message);
    this.name = 'PaymentGatewayUnavailableError';
  }
}

export function getRazorpayConfig(): RazorpayConfig {
  const keyId = (
    process.env.RAZORPAY_KEY_ID ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    ''
  ).trim();

  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

  const isPlaceholder =
    !keyId ||
    !keySecret ||
    keyId === 'rzp_test_mockKeyId123' ||
    keySecret === 'mockKeySecret123';

  if (isPlaceholder) {
    throw new PaymentGatewayUnavailableError();
  }

  return {
    keyId,
    keySecret,
  };
}

export interface CreateOrderParams {
  amountInPaise: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status: string;
  notes?: Record<string, string>;
}

/**
 * Creates an authorized order on Razorpay servers.
 * The amount is always verified on the backend before this is called.
 */
export async function createRazorpayOrder(params: CreateOrderParams): Promise<RazorpayOrderResult> {
  const { keyId, keySecret } = getRazorpayConfig();

  const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: params.amountInPaise,
      currency: params.currency || 'INR',
      receipt: params.receipt || `rcpt_${Date.now()}`,
      notes: params.notes || {},
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Razorpay order creation failed:', errorBody);
    throw new Error('Unable to connect to the payment gateway right now. Please try again or use Cash on Delivery.');
  }

  const data = await response.json();
  return {
    id: data.id,
    amount: data.amount,
    currency: data.currency,
    receipt: data.receipt,
    status: data.status,
    notes: data.notes,
  };
}

export interface VerifySignatureParams {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * Validates the HMAC-SHA256 signature returned by Razorpay checkout.
 * Uses timing-safe string comparison to prevent timing attacks.
 */
export function verifyRazorpaySignature(params: VerifySignatureParams): boolean {
  const { keySecret } = getRazorpayConfig();

  if (!params.razorpay_order_id || !params.razorpay_payment_id || !params.razorpay_signature) {
    return false;
  }

  try {
    const payload = `${params.razorpay_order_id}|${params.razorpay_payment_id}`;
    const expected = crypto.createHmac('sha256', keySecret).update(payload).digest('hex');

    const expectedBuf = Buffer.from(expected, 'utf8');
    const providedBuf = Buffer.from(params.razorpay_signature, 'utf8');

    if (expectedBuf.length !== providedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  } catch (err) {
    console.error('HMAC signature verification threw:', err);
    return false;
  }
}

export interface FetchPaymentParams {
  razorpay_payment_id: string;
  expected_order_id: string;
  expected_amount_in_paise: number;
  expected_currency?: string;
}

/**
 * Validates payment directly with Razorpay REST API:
 * 1. Confirms the payment status is captured
 * 2. Confirms payment amount & currency match authoritative order amount
 * 3. Confirms payment order_id matches expected order_id
 */
export async function fetchAndVerifyRazorpayPayment(params: FetchPaymentParams) {
  const { keyId, keySecret } = getRazorpayConfig();

  const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const response = await fetch(`https://api.razorpay.com/v1/payments/${params.razorpay_payment_id}`, {
    headers: { Authorization: authHeader },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Razorpay payment lookup failed (${response.status}): ${errText}`);
  }

  const payment = await response.json();

  if (payment.order_id !== params.expected_order_id) {
    throw new Error(
      `Payment order mismatch: payment belongs to ${payment.order_id}, expected ${params.expected_order_id}.`
    );
  }

  if (payment.amount !== params.expected_amount_in_paise) {
    throw new Error(
      `Payment amount mismatch: received ${payment.amount} paise, expected ${params.expected_amount_in_paise} paise.`
    );
  }

  const expectedCurrency = (params.expected_currency || 'INR').toUpperCase();
  if (String(payment.currency || '').toUpperCase() !== expectedCurrency) {
    throw new Error(
      `Payment currency mismatch: received ${payment.currency}, expected ${expectedCurrency}.`
    );
  }

  if (payment.status !== 'captured') {
    throw new Error(`Payment is in ${payment.status} state, expected captured.`);
  }

  return payment;
}

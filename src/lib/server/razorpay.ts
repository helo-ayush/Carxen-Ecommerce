import crypto from 'crypto';

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  isMock: boolean;
}

export function getRazorpayConfig(): RazorpayConfig {
  const keyId = (
    process.env.RAZORPAY_KEY_ID ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    ''
  ).trim();

  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

  const isMock =
    !keyId ||
    !keySecret ||
    keyId === 'rzp_test_mockKeyId123' ||
    keySecret === 'mockKeySecret123';

  return {
    keyId: keyId || 'rzp_test_mockKeyId123',
    keySecret: keySecret || 'mockKeySecret123',
    isMock,
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
  isMock: boolean;
  notes?: Record<string, string>;
}

/**
 * Creates an authorized order on Razorpay servers.
 * The amount is always verified on the backend before this is called.
 */
export async function createRazorpayOrder(params: CreateOrderParams): Promise<RazorpayOrderResult> {
  const { keyId, keySecret, isMock } = getRazorpayConfig();

  if (isMock) {
    return {
      id: `order_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      amount: params.amountInPaise,
      currency: params.currency || 'INR',
      receipt: params.receipt,
      status: 'created',
      isMock: true,
      notes: params.notes,
    };
  }

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
    throw new Error(`Failed to create Razorpay order (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    amount: data.amount,
    currency: data.currency,
    receipt: data.receipt,
    status: data.status,
    isMock: false,
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
  const { keySecret, isMock } = getRazorpayConfig();

  if (isMock) {
    // In mock simulation mode, accept mock order & payment tokens
    return (
      Boolean(params.razorpay_order_id && params.razorpay_payment_id) &&
      (params.razorpay_order_id.startsWith('order_mock_') ||
        params.razorpay_payment_id.startsWith('pay_mock_') ||
        params.razorpay_signature.startsWith('mock_sig_'))
    );
  }

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
}

/**
 * Validates payment directly with Razorpay REST API:
 * 1. Confirms the payment status is captured/authorized
 * 2. Confirms payment amount matches authoritative order amount in paise
 * 3. Confirms payment order_id matches expected order_id
 */
export async function fetchAndVerifyRazorpayPayment(params: FetchPaymentParams) {
  const { keyId, keySecret, isMock } = getRazorpayConfig();

  if (isMock) {
    return {
      id: params.razorpay_payment_id,
      order_id: params.expected_order_id,
      amount: params.expected_amount_in_paise,
      currency: 'INR',
      status: 'captured',
      method: 'upi',
      isMock: true,
    };
  }

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

  if (payment.status !== 'captured' && payment.status !== 'authorized') {
    throw new Error(`Payment is in ${payment.status} state, expected captured or authorized.`);
  }

  return payment;
}
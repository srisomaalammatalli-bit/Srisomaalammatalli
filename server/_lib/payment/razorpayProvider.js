/**
 * Razorpay provider — not active yet.
 *
 * Razorpay approval and keys are pending, so this module is a contract rather
 * than an integration. It exposes the same interface as phonepeQrProvider so
 * that switching PAYMENT_PROVIDER from PHONEPE_QR to RAZORPAY requires no
 * change to donation or booking logic.
 *
 * Signature verification is implemented already, because it is pure crypto and
 * needs no network access: HMAC-SHA256 over the documented payload, compared
 * in constant time. Order creation is the only part that needs live keys.
 *
 * Secrets are read from the environment on the server only. RAZORPAY_KEY_SECRET
 * and RAZORPAY_WEBHOOK_SECRET must never be exposed to the browser — only
 * VITE_RAZORPAY_KEY_ID (the public key id) may reach the client.
 *
 * TO ACTIVATE:
 *   1. npm install razorpay
 *   2. set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET
 *   3. set PAYMENT_PROVIDER=RAZORPAY
 *   4. implement createOrder() below against the Razorpay Orders API
 */

import crypto from 'crypto';

export const PROVIDER_NAME = 'RAZORPAY';

export const capabilities = Object.freeze({
  autoVerify: true,
  requiresManualVerification: false,
  supportsRefund: true,
  supportsWebhook: true
});

/** True only when every server-side secret is configured. */
export function isConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/**
 * Create a Razorpay order. Not implemented until keys are available.
 *
 * The amount must be the server-computed value in paise; it is never taken
 * from the browser.
 */
export async function createOrder() {
  throw new Error(
    'RAZORPAY_NOT_CONFIGURED: Razorpay keys are not available yet. ' +
      'The active payment provider is PHONEPE_QR.'
  );
}

/**
 * Compare two strings without leaking timing information.
 */
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a || ''), 'utf8');
  const bufB = Buffer.from(String(b || ''), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify a Razorpay Checkout signature.
 * Razorpay signs `${order_id}|${payment_id}` with the key secret.
 *
 * Implemented now so the verification path is reviewed and tested before any
 * real money flows through it.
 */
export async function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return { verified: false, reason: 'RAZORPAY_KEY_SECRET is not configured.' };
  }
  if (!orderId || !paymentId || !signature) {
    return { verified: false, reason: 'Missing order id, payment id or signature.' };
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return safeEqual(expected, signature)
    ? { verified: true }
    : { verified: false, reason: 'Signature mismatch.' };
}

/**
 * Verify a Razorpay webhook.
 * The webhook signature is an HMAC-SHA256 of the RAW request body, so callers
 * must pass the unparsed body string — re-serializing JSON changes the bytes
 * and breaks verification.
 */
export async function verifyWebhook({ rawBody, signature }) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return { verified: false, reason: 'RAZORPAY_WEBHOOK_SECRET is not configured.' };
  }
  if (!rawBody || !signature) {
    return { verified: false, reason: 'Missing webhook body or signature.' };
  }

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  return safeEqual(expected, signature)
    ? { verified: true }
    : { verified: false, reason: 'Webhook signature mismatch.' };
}

/**
 * Razorpay confirms payment through signature verification, so a devotee's
 * self-reported claim is not part of this provider's flow.
 */
export function validateClaim() {
  return {
    valid: false,
    errors: ['Razorpay payments are confirmed automatically and need no manual claim.'],
    nextStatus: 'INITIATED'
  };
}

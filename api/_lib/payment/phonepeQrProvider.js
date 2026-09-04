/**
 * PhonePe QR payment provider — the temporary provider, active until
 * Razorpay credentials are approved.
 *
 * IMPORTANT: a static UPI QR carries no callback and no signature. There is
 * no technical way to confirm from the website that a devotee actually paid.
 * This provider therefore never reports success on its own:
 *
 *   - createOrder() only allocates a reference and shows instructions.
 *   - validateClaim() checks what the devotee says they paid, and the caller
 *     moves the payment to PENDING_VERIFICATION.
 *   - Only a temple administrator, in the admin portal, can move it to
 *     VERIFIED — and that action is audit-logged.
 *
 * Nothing here may ever return a "paid" status.
 */

export const PROVIDER_NAME = 'PHONEPE_QR';

/** This provider cannot confirm payment by itself. */
export const capabilities = Object.freeze({
  autoVerify: false,
  requiresManualVerification: true,
  supportsRefund: false,
  supportsWebhook: false
});

/**
 * "Create an order". For a static QR there is nothing to create with a
 * gateway, so this simply describes what the browser should display.
 * The amount is passed through unchanged — it was already computed and
 * validated server-side by the caller.
 *
 * @param {{amountPaise: number, referenceId: string, type: 'DONATION'|'POOJA'}} order
 * @returns {Promise<object>} details safe to send to the browser
 */
export async function createOrder({ amountPaise, referenceId, type }) {
  return {
    provider: PROVIDER_NAME,
    // No gateway order exists; the reference is our own.
    providerOrderId: null,
    referenceId,
    amountPaise,
    currency: 'INR',
    type,
    // The status a payment starts in for this provider.
    initialStatus: 'PAYMENT_INSTRUCTIONS_SHOWN',
    instructions: {
      qrImageUrl: process.env.PHONEPE_QR_IMAGE_URL || '/assets/qr/phonepe-donation-qr.jpg',
      qrProvider: 'PhonePe',
      steps: [
        'Scan the QR code using PhonePe or any UPI application.',
        'Pay the exact amount shown above.',
        'Copy the UTR or transaction reference from your payment app.',
        'Return here and submit the reference so the temple can verify it.'
      ],
      note:
        'Payments made through this QR are verified manually by the temple ' +
        'administration. Your receipt is issued once verification is complete.'
    }
  };
}

/**
 * Validate a devotee's payment claim.
 *
 * The claim is evidence, not proof: it is recorded for an administrator to
 * check against the temple's bank or UPI statement.
 *
 * @returns {{valid: boolean, errors: string[], nextStatus: string}}
 */
export function validateClaim({ utr, payerName }) {
  const errors = [];

  const reference = String(utr || '').trim();
  if (!reference) {
    errors.push('Enter the UTR or transaction reference from your payment app.');
  } else if (reference.length < 6 || reference.length > 64) {
    errors.push('The UTR or transaction reference looks incorrect.');
  } else if (!/^[A-Za-z0-9-]+$/.test(reference)) {
    errors.push('The UTR or transaction reference may contain only letters, numbers and hyphens.');
  }

  if (!String(payerName || '').trim()) {
    errors.push('Enter the name used to make the payment.');
  }

  return {
    valid: errors.length === 0,
    errors,
    // Never VERIFIED — an administrator must confirm the payment.
    nextStatus: 'PENDING_VERIFICATION'
  };
}

/**
 * This provider has no webhook. Declared so the interface stays uniform and
 * a future Razorpay switch changes only the provider module.
 */
export async function verifyWebhook() {
  return { verified: false, reason: 'PHONEPE_QR does not support webhooks.' };
}

/** No gateway signature exists for a static QR. */
export async function verifyPaymentSignature() {
  return {
    verified: false,
    reason: 'PHONEPE_QR payments are verified manually by the temple administration.'
  };
}

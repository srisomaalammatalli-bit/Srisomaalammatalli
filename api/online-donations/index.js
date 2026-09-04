/**
 * POST /api/online-donations
 *
 * Creates a devotee donation and its pending payment.
 *
 * This is the public, devotee-initiated path. It is deliberately separate from
 * /api/donations, which is the committee's offline ledger of cash and bank
 * receipts entered by an administrator: that one requires an admin session and
 * writes the `donations` table, whereas this one is anonymous and writes
 * `online_donations` plus a `payments` row awaiting verification.
 *
 * The devotee chooses the amount, so it is validated rather than overridden —
 * but it is converted to integer paise and range-checked on the server, and the
 * stored value is the one the server computed.
 */

import { sendSuccess, sendError, sendBadRequest, sendMethodNotAllowed } from '../_lib/response.js';
import { resolveDonationAmount, createPayment } from '../_lib/payment/paymentService.js';
import { sanitizeString, validateMobile, validateEmail } from '../_lib/validation.js';

/** Purposes the temple accepts. An unrecognised value falls back to general. */
const PURPOSES = [
  'General Donation',
  'Temple Development',
  'Annadanam',
  'Pooja',
  'Jathara',
  'Other'
];

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendMethodNotAllowed(res, ['POST']);

  try {
    const body = req.body || {};

    const donorName = sanitizeString(body.donorName, 128);
    const mobile = sanitizeString(body.mobile, 20);
    const email = sanitizeString(body.email, 128);

    /* ---------------- Validation ---------------- */
    const errors = [];
    if (!donorName) errors.push('Enter the devotee name.');
    if (!validateMobile(mobile)) errors.push('Enter a valid 10-digit mobile number.');
    if (email && !validateEmail(email)) errors.push('Enter a valid email address, or leave it blank.');
    if (errors.length) return sendBadRequest(res, errors[0], errors);

    /* ---------------- Server-side amount ---------------- */
    const priced = resolveDonationAmount(body.amount);
    if (!priced.ok) return sendBadRequest(res, priced.error);

    const purpose = PURPOSES.includes(body.purpose) ? body.purpose : 'General Donation';

    /* ---------------- Create donation + payment ---------------- */
    const payment = await createPayment({
      type: 'DONATION',
      amountPaise: priced.amountPaise,
      payerName: donorName,
      payerMobile: mobile,
      idempotencyKey: sanitizeString(body.idempotencyKey, 128) || null,
      details: {
        email,
        address: sanitizeString(body.address, 500),
        purpose,
        message: sanitizeString(body.message, 1000)
      }
    });

    return sendSuccess(
      res,
      {
        reference: payment.referenceId,
        amountPaise: payment.amountPaise,
        purpose,
        status: 'PENDING',
        payment: payment.order?.instructions || null,
        reused: Boolean(payment.reused)
      },
      'Donation recorded. Complete the payment to finish your offering.',
      201
    );
  } catch (err) {
    console.error('[Online Donation Error]', err);
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return sendError(res, 'The temple database is not available.', 'DATABASE_NOT_CONFIGURED', 503);
    }
    return sendError(res, 'Unable to record this donation.');
  }
}

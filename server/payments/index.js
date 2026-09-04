/**
 * /api/payments
 *
 * GET  ?reference=DON-2026-000001    public status of one payment
 * POST { reference, utr, payerName }  submit a payment claim
 *
 * This is the devotee-facing half of the payment flow. It can move a payment
 * only as far as PENDING_VERIFICATION: there is no branch here that sets
 * VERIFIED, issues a receipt, or confirms a booking. Those live in the admin
 * routes and require an authenticated administrator.
 */

import {
  sendSuccess,
  sendError,
  sendBadRequest,
  sendNotFound,
  sendMethodNotAllowed
} from '../_lib/response.js';
import { submitClaim, getPublicPayment } from '../_lib/payment/paymentService.js';
import { sanitizeString } from '../_lib/validation.js';

function clientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for'] || '';
  const first = Array.isArray(forwarded) ? forwarded[0] : String(forwarded).split(',')[0];
  return (first || req.socket?.remoteAddress || '').trim();
}

export default async function handler(req, res) {
  try {
    /* ---------------- Read a payment's public status ---------------- */
    if (req.method === 'GET') {
      const reference = sanitizeString(req.query?.reference, 32);
      if (!reference) {
        return sendBadRequest(res, 'A payment reference is required.');
      }

      const payment = await getPublicPayment(reference);
      if (!payment) return sendNotFound(res, 'That payment reference could not be found.');

      return sendSuccess(res, { payment });
    }

    /* ---------------- Submit a payment claim ---------------- */
    if (req.method === 'POST') {
      const body = req.body || {};

      const result = await submitClaim({
        reference: sanitizeString(body.reference, 32),
        utr: sanitizeString(body.utr, 64),
        payerName: sanitizeString(body.payerName, 128),
        payerMobile: sanitizeString(body.payerMobile, 20),
        paymentDate: sanitizeString(body.paymentDate, 10),
        note: sanitizeString(body.note, 500),
        ip: clientIp(req)
      });

      if (!result.ok) {
        const status = result.code === 'NOT_FOUND' ? 404 : 400;
        return sendError(res, result.errors?.[0] || 'Unable to record this payment.', result.code, status);
      }

      return sendSuccess(
        res,
        {
          reference: result.referenceId,
          status: result.status,
          amountPaise: result.amountPaise,
          duplicate: result.duplicate
        },
        // Wording matters: the payment is recorded, not confirmed.
        'Payment details submitted. The temple administration will verify your payment.',
        201
      );
    }

    return sendMethodNotAllowed(res, ['GET', 'POST']);
  } catch (err) {
    console.error('[Payments Error]', err);
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return sendError(res, 'The temple database is not available.', 'DATABASE_NOT_CONFIGURED', 503);
    }
    return sendError(res, 'Unable to process this payment request.');
  }
}

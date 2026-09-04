/**
 * POST /api/pooja-bookings
 *
 * Creates a pooja booking and its pending payment.
 *
 * The request carries a pooja id and a quantity — never a price. The amount is
 * read from the `poojas` row on the server, so a request claiming that a
 * 501-rupee pooja costs 1 rupee produces a 501-rupee payment regardless.
 *
 * The booking is created as PENDING_PAYMENT and only becomes CONFIRMED after an
 * administrator verifies the payment.
 */

import { sendSuccess, sendError, sendBadRequest, sendMethodNotAllowed } from '../_lib/response.js';
import { resolvePoojaAmount, createPayment } from '../_lib/payment/paymentService.js';
import { sanitizeString, validateMobile, validateEmail, validateDate } from '../_lib/validation.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendMethodNotAllowed(res, ['POST']);

  try {
    const body = req.body || {};

    const devoteeName = sanitizeString(body.devoteeName, 128);
    const mobile = sanitizeString(body.mobile, 20);
    const email = sanitizeString(body.email, 128);
    const poojaId = sanitizeString(body.poojaId, 64);
    const preferredDate = sanitizeString(body.preferredDate, 10);

    /* ---------------- Validation ---------------- */
    const errors = [];
    if (!devoteeName) errors.push('Enter the devotee name.');
    if (!validateMobile(mobile)) errors.push('Enter a valid 10-digit mobile number.');
    if (email && !validateEmail(email)) errors.push('Enter a valid email address, or leave it blank.');
    if (!poojaId) errors.push('Select a pooja.');
    if (!preferredDate || !validateDate(preferredDate)) {
      errors.push('Choose a valid preferred date.');
    } else {
      // A booking may not be made for a date already past.
      const today = new Date().toISOString().slice(0, 10);
      if (preferredDate < today) errors.push('Choose a date that has not already passed.');
    }
    if (errors.length) return sendBadRequest(res, errors[0], errors);

    /* ---------------- Server-authoritative amount ---------------- */
    // body.amount is deliberately ignored: the price comes from the database.
    const priced = await resolvePoojaAmount(poojaId, body.quantity ?? 1);
    if (!priced.ok) return sendBadRequest(res, priced.error);

    /* ---------------- Create booking + payment ---------------- */
    const payment = await createPayment({
      type: 'POOJA',
      amountPaise: priced.amountPaise,
      payerName: devoteeName,
      payerMobile: mobile,
      idempotencyKey: sanitizeString(body.idempotencyKey, 128) || null,
      details: {
        poojaId,
        email,
        preferredDate,
        preferredTime: sanitizeString(body.preferredTime, 32),
        gotram: sanitizeString(body.gotram, 128),
        nakshatram: sanitizeString(body.nakshatram, 128),
        rashi: sanitizeString(body.rashi, 128),
        sankalpam: sanitizeString(body.sankalpam, 1000),
        quantity: priced.quantity
      }
    });

    return sendSuccess(
      res,
      {
        reference: payment.referenceId,
        amountPaise: payment.amountPaise,
        pooja: { id: priced.pooja.id, name: priced.pooja.name },
        quantity: priced.quantity,
        status: 'PENDING_PAYMENT',
        payment: payment.order?.instructions || null,
        reused: Boolean(payment.reused)
      },
      'Booking created. Complete the payment to confirm it.',
      201
    );
  } catch (err) {
    console.error('[Pooja Booking Error]', err);
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return sendError(res, 'The temple database is not available.', 'DATABASE_NOT_CONFIGURED', 503);
    }
    return sendError(res, 'Unable to create this booking.');
  }
}

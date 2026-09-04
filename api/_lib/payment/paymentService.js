/**
 * Shared payment lifecycle.
 *
 * Donations and pooja bookings differ only in what is being paid for, so the
 * money path itself lives here once:
 *
 *   create payment -> devotee pays externally -> claim -> PENDING_VERIFICATION
 *   -> admin verifies -> VERIFIED -> receipt
 *
 * Invariants this module is responsible for:
 *
 *  - The amount is always computed on the server. For a pooja it comes from
 *    the database row; the browser only sends an id.
 *  - The public path can never produce VERIFIED. Only verifyPayment(), which
 *    its callers gate behind an authenticated admin session, can.
 *  - One payment yields at most one receipt, enforced by a UNIQUE constraint
 *    on receipts.payment_id as well as by the checks here.
 *  - Repeat submissions with the same idempotency key return the original
 *    record instead of creating a second one.
 */

import crypto from 'crypto';
import { transaction, query } from '../db.js';
import {
  createOrder,
  validateClaim,
  validateAmountPaise,
  rupeesToPaise,
  nextReference,
  getActiveProviderName
} from './paymentProvider.js';

const newId = (prefix) => `${prefix}_${crypto.randomBytes(12).toString('hex')}`;

/** Statuses from which a payment may still be claimed or cancelled. */
const OPEN_STATUSES = ['INITIATED', 'PAYMENT_INSTRUCTIONS_SHOWN', 'USER_CLAIMED_PAYMENT'];

/* ------------------------------------------------------------------ *
 * Amount resolution — the server is the authority
 * ------------------------------------------------------------------ */

/**
 * Determine what a donation should cost.
 * The devotee chooses this amount, so it is validated but not overridden.
 */
export function resolveDonationAmount(rupees) {
  const paise = rupeesToPaise(rupees);
  if (paise === null) {
    return { ok: false, error: 'Enter a valid donation amount.' };
  }
  const check = validateAmountPaise(paise);
  return check.valid ? { ok: true, amountPaise: paise } : { ok: false, error: check.error };
}

/**
 * Determine what a pooja booking should cost.
 *
 * Any amount supplied by the browser is ignored: the price is read from the
 * database row for the pooja, multiplied by the quantity. A request claiming a
 * 501-rupee pooja costs 1 rupee therefore has no effect.
 */
export async function resolvePoojaAmount(poojaId, quantity = 1) {
  const qty = Number.parseInt(quantity, 10);
  if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
    return { ok: false, error: 'Choose a quantity between 1 and 20.' };
  }

  const result = await query(
    `SELECT id, name, price_paise, available, published FROM poojas WHERE id = $1`,
    [poojaId]
  );
  const pooja = result.rows[0];

  if (!pooja) return { ok: false, error: 'That pooja could not be found.' };
  if (!pooja.published || !pooja.available) {
    return { ok: false, error: `${pooja.name} is not available for booking at present.` };
  }

  const unitPaise = Number(pooja.price_paise || 0);
  if (unitPaise <= 0) {
    return {
      ok: false,
      error: `The offering amount for ${pooja.name} has not been published yet. Please contact the temple office.`
    };
  }

  const amountPaise = unitPaise * qty;
  const check = validateAmountPaise(amountPaise);
  if (!check.valid) return { ok: false, error: check.error };

  return { ok: true, amountPaise, pooja, quantity: qty };
}

/* ------------------------------------------------------------------ *
 * Creating a payment
 * ------------------------------------------------------------------ */

/**
 * Create a payment plus its business record (donation or booking) atomically.
 *
 * @param {object} input
 * @param {'DONATION'|'POOJA'} input.type
 * @param {number} input.amountPaise  server-computed
 * @param {string} input.payerName
 * @param {string} input.payerMobile
 * @param {string} [input.idempotencyKey]
 * @param {object} input.details      per-type fields
 */
export async function createPayment(input) {
  const {
    type,
    amountPaise,
    payerName,
    payerMobile,
    idempotencyKey = null,
    details = {}
  } = input;

  // A repeat submission returns the original payment rather than a new one.
  if (idempotencyKey) {
    const existing = await findByIdempotencyKey(idempotencyKey);
    if (existing) return { ...existing, reused: true };
  }

  const provider = getActiveProviderName();

  const created = await transaction(async (client) => {
    const referenceId = await nextReference(client, type);
    const paymentId = newId('pay');

    const order = await createOrder({ amountPaise, referenceId, type });

    await client.query(
      `INSERT INTO payments
         (id, reference_id, type, provider, amount_paise, currency, status,
          payer_name, payer_mobile, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, 'INR', $6, $7, $8, $9)`,
      [
        paymentId,
        referenceId,
        type,
        provider,
        amountPaise,
        order.initialStatus || 'INITIATED',
        payerName,
        payerMobile,
        idempotencyKey
      ]
    );

    let businessId = null;

    if (type === 'DONATION') {
      businessId = newId('odn');
      await client.query(
        `INSERT INTO online_donations
           (id, reference_id, payment_id, donor_name, mobile, email, address,
            purpose, message, amount_paise, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING')`,
        [
          businessId,
          referenceId,
          paymentId,
          payerName,
          payerMobile,
          details.email || null,
          details.address || null,
          details.purpose || 'General Donation',
          details.message || null,
          amountPaise
        ]
      );
    } else {
      businessId = newId('bkg');
      await client.query(
        `INSERT INTO pooja_bookings
           (id, reference_id, pooja_id, payment_id, devotee_name, mobile, email,
            preferred_date, preferred_time, gotram, nakshatram, rashi, sankalpam,
            quantity, amount_paise, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'PENDING_PAYMENT')`,
        [
          businessId,
          referenceId,
          details.poojaId,
          paymentId,
          payerName,
          payerMobile,
          details.email || null,
          details.preferredDate,
          details.preferredTime || null,
          details.gotram || null,
          details.nakshatram || null,
          details.rashi || null,
          details.sankalpam || null,
          details.quantity || 1,
          amountPaise
        ]
      );
    }

    return { paymentId, referenceId, businessId, order };
  });

  return { ...created, amountPaise, type, reused: false };
}

/** Look up a payment created earlier with the same idempotency key. */
export async function findByIdempotencyKey(key) {
  const result = await query(
    `SELECT id AS paymentId, reference_id AS referenceId, amount_paise AS amountPaise,
            type, status
       FROM payments WHERE idempotency_key = $1`,
    [key]
  );
  return result.rows[0] || null;
}

/* ------------------------------------------------------------------ *
 * Claiming a payment (public)
 * ------------------------------------------------------------------ */

/**
 * Record a devotee's claim that they have paid.
 *
 * This is evidence, never confirmation. The payment moves to
 * PENDING_VERIFICATION and waits for an administrator. There is deliberately
 * no code path here that can set VERIFIED.
 */
export async function submitClaim({ reference, utr, payerName, payerMobile, paymentDate, note, ip }) {
  const validation = validateClaim({ utr, payerName });
  if (!validation.valid) {
    return { ok: false, code: 'VALIDATION_ERROR', errors: validation.errors };
  }

  const found = await query(
    `SELECT id, reference_id, status, amount_paise, type FROM payments WHERE reference_id = $1`,
    [reference]
  );
  const payment = found.rows[0];
  if (!payment) {
    return { ok: false, code: 'NOT_FOUND', errors: ['That payment reference could not be found.'] };
  }

  if (payment.status === 'VERIFIED') {
    return { ok: false, code: 'ALREADY_VERIFIED', errors: ['This payment has already been verified.'] };
  }
  if (payment.status === 'REJECTED') {
    return {
      ok: false,
      code: 'REJECTED',
      errors: ['This payment was not verified. Please contact the temple office.']
    };
  }
  if (payment.status === 'CANCELLED') {
    return { ok: false, code: 'CANCELLED', errors: ['This payment was cancelled.'] };
  }

  const cleanUtr = String(utr).trim();

  // The same reference submitted twice with the same UTR is a retry, not a
  // second payment.
  const duplicate = await query(
    `SELECT id FROM payment_claims WHERE payment_id = $1 AND utr = $2`,
    [payment.id, cleanUtr]
  );
  if (duplicate.rows.length) {
    return {
      ok: true,
      duplicate: true,
      referenceId: payment.reference_id,
      status: 'PENDING_VERIFICATION',
      amountPaise: Number(payment.amount_paise)
    };
  }

  await transaction(async (client) => {
    await client.query(
      `INSERT INTO payment_claims
         (id, payment_id, utr, payer_name, payer_mobile, payment_date, note, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        newId('clm'),
        payment.id,
        cleanUtr,
        String(payerName).trim(),
        payerMobile || null,
        paymentDate || null,
        note || null,
        (ip || '').slice(0, 45)
      ]
    );

    // PENDING_VERIFICATION is the furthest the public path can move a payment.
    await client.query(
      `UPDATE payments
          SET status = 'PENDING_VERIFICATION',
              utr = $1,
              payment_claimed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $2`,
      [cleanUtr, payment.id]
    );
  });

  return {
    ok: true,
    duplicate: false,
    referenceId: payment.reference_id,
    status: 'PENDING_VERIFICATION',
    amountPaise: Number(payment.amount_paise)
  };
}

/* ------------------------------------------------------------------ *
 * Admin verification
 * ------------------------------------------------------------------ */

/**
 * Verify a payment and issue its receipt. Callers must already have checked
 * that the request carries an authenticated administrator session.
 */
export async function verifyPayment(paymentId, adminUser) {
  return transaction(async (client) => {
    const found = await client.query(
      `SELECT id, reference_id, type, status, amount_paise, payer_name, utr
         FROM payments WHERE id = $1`,
      [paymentId]
    );
    const payment = found.rows[0];
    if (!payment) return { ok: false, code: 'NOT_FOUND', error: 'Payment not found.' };

    if (payment.status === 'VERIFIED') {
      // Idempotent: re-verifying returns the existing receipt.
      const existing = await client.query(
        `SELECT receipt_number FROM receipts WHERE payment_id = $1`,
        [paymentId]
      );
      return {
        ok: true,
        alreadyVerified: true,
        receiptNumber: existing.rows[0]?.receipt_number || null
      };
    }
    if (payment.status !== 'PENDING_VERIFICATION') {
      return {
        ok: false,
        code: 'INVALID_STATE',
        error: 'Only a payment awaiting verification can be verified.'
      };
    }

    await client.query(
      `UPDATE payments
          SET status = 'VERIFIED', verified_at = CURRENT_TIMESTAMP,
              verified_by = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2`,
      [adminUser.id, paymentId]
    );

    // Advance the business record.
    let description = 'Temple offering';
    if (payment.type === 'DONATION') {
      const donation = await client.query(
        `SELECT purpose FROM online_donations WHERE payment_id = $1`,
        [paymentId]
      );
      description = donation.rows[0]?.purpose || 'Donation';
      await client.query(
        `UPDATE online_donations SET status = 'PAID', updated_at = CURRENT_TIMESTAMP
          WHERE payment_id = $1`,
        [paymentId]
      );
    } else {
      const booking = await client.query(
        `SELECT b.preferred_date, p.name AS pooja_name
           FROM pooja_bookings b LEFT JOIN poojas p ON p.id = b.pooja_id
          WHERE b.payment_id = $1`,
        [paymentId]
      );
      description = booking.rows[0]?.pooja_name || 'Pooja';
      await client.query(
        `UPDATE pooja_bookings SET status = 'CONFIRMED', updated_at = CURRENT_TIMESTAMP
          WHERE payment_id = $1`,
        [paymentId]
      );
    }

    // Issue the receipt. The UNIQUE constraint on payment_id is the real
    // guarantee that a payment can never carry two receipts.
    const receiptNumber = await nextReference(client, 'RECEIPT');
    await client.query(
      `INSERT INTO receipts
         (id, receipt_number, payment_id, type, devotee_name, description,
          amount_paise, payment_method, issued_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        newId('rcp'),
        receiptNumber,
        paymentId,
        payment.type,
        payment.payer_name,
        description,
        payment.amount_paise,
        'PhonePe',
        adminUser.id
      ]
    );

    return { ok: true, alreadyVerified: false, receiptNumber, referenceId: payment.reference_id };
  });
}

/**
 * Reject a payment. The business record stays unpaid and no receipt is issued.
 */
export async function rejectPayment(paymentId, adminUser, reason) {
  const cleanReason = String(reason || '').trim();
  if (cleanReason.length < 3) {
    return { ok: false, code: 'VALIDATION_ERROR', error: 'Give a reason for rejecting this payment.' };
  }

  return transaction(async (client) => {
    const found = await client.query(`SELECT id, type, status FROM payments WHERE id = $1`, [paymentId]);
    const payment = found.rows[0];
    if (!payment) return { ok: false, code: 'NOT_FOUND', error: 'Payment not found.' };

    if (payment.status === 'VERIFIED') {
      return {
        ok: false,
        code: 'INVALID_STATE',
        error: 'A verified payment cannot be rejected. Record a refund instead.'
      };
    }

    await client.query(
      `UPDATE payments
          SET status = 'REJECTED', rejection_reason = $1, verified_by = $2,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $3`,
      [cleanReason.slice(0, 500), adminUser.id, paymentId]
    );

    if (payment.type === 'DONATION') {
      await client.query(
        `UPDATE online_donations SET status = 'FAILED', updated_at = CURRENT_TIMESTAMP
          WHERE payment_id = $1`,
        [paymentId]
      );
    } else {
      await client.query(
        `UPDATE pooja_bookings SET status = 'PAYMENT_FAILED', updated_at = CURRENT_TIMESTAMP
          WHERE payment_id = $1`,
        [paymentId]
      );
    }

    return { ok: true };
  });
}

/* ------------------------------------------------------------------ *
 * Reading
 * ------------------------------------------------------------------ */

/** Public view of a payment: no internal ids, no admin fields. */
export async function getPublicPayment(reference) {
  const result = await query(
    `SELECT p.reference_id, p.type, p.amount_paise, p.status, p.utr, p.created_at,
            r.receipt_number, r.issued_at
       FROM payments p
       LEFT JOIN receipts r ON r.payment_id = p.id
      WHERE p.reference_id = $1`,
    [reference]
  );
  const row = result.rows[0];
  if (!row) return null;

  return {
    reference: row.reference_id,
    type: row.type,
    amountPaise: Number(row.amount_paise),
    status: row.status,
    utr: row.utr,
    createdAt: row.created_at,
    receiptNumber: row.receipt_number || null,
    receiptIssuedAt: row.issued_at || null
  };
}

/** Admin listing, newest first. */
export async function listPayments({ status = null, limit = 100 } = {}) {
  const capped = Math.min(Math.max(Number.parseInt(limit, 10) || 100, 1), 500);

  const sql = `
    SELECT p.id, p.reference_id, p.type, p.provider, p.amount_paise, p.status,
           p.utr, p.payer_name, p.payer_mobile, p.payment_claimed_at,
           p.verified_at, p.rejection_reason, p.created_at,
           r.receipt_number,
           d.purpose AS donation_purpose,
           b.preferred_date, pj.name AS pooja_name
      FROM payments p
      LEFT JOIN receipts r ON r.payment_id = p.id
      LEFT JOIN online_donations d ON d.payment_id = p.id
      LEFT JOIN pooja_bookings b ON b.payment_id = p.id
      LEFT JOIN poojas pj ON pj.id = b.pooja_id
     ${status ? 'WHERE p.status = $1' : ''}
     ORDER BY p.created_at DESC
     LIMIT ${capped}`;

  const result = await query(sql, status ? [status] : []);
  return result.rows;
}

export { OPEN_STATUSES };

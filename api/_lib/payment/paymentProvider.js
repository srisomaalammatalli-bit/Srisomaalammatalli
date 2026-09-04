/**
 * Payment provider selector and shared money helpers.
 *
 * Donation and booking logic talks only to this module, never to a specific
 * provider. Switching gateways is therefore a configuration change:
 *
 *   PAYMENT_PROVIDER=PHONEPE_QR   (current — manual verification)
 *   PAYMENT_PROVIDER=RAZORPAY     (later — automatic verification)
 *
 * Money is handled as INTEGER PAISE everywhere in this layer. Rupee values are
 * only produced for display. Floating-point arithmetic is never used on money.
 */

import * as phonepeQr from './phonepeQrProvider.js';
import * as razorpay from './razorpayProvider.js';

const PROVIDERS = {
  PHONEPE_QR: phonepeQr,
  RAZORPAY: razorpay
};

/** The provider named by the environment, defaulting to the manual QR flow. */
export function getActiveProviderName() {
  const configured = String(process.env.PAYMENT_PROVIDER || '').trim().toUpperCase();
  return PROVIDERS[configured] ? configured : 'PHONEPE_QR';
}

/** The active provider module. */
export function getPaymentProvider() {
  return PROVIDERS[getActiveProviderName()];
}

/** Provider details that are safe to send to the browser. */
export function getPublicProviderInfo() {
  const provider = getPaymentProvider();
  return {
    provider: provider.PROVIDER_NAME,
    requiresManualVerification: provider.capabilities.requiresManualVerification,
    autoVerify: provider.capabilities.autoVerify
  };
}

/* ------------------------------------------------------------------ *
 * Money
 * ------------------------------------------------------------------ */

/** Smallest and largest single payment the temple accepts. */
export const MIN_AMOUNT_PAISE = 100;        // ₹1
export const MAX_AMOUNT_PAISE = 100000000;  // ₹10,00,000

/**
 * Convert a rupee value to integer paise.
 * Returns null when the input is not a usable amount.
 */
export function rupeesToPaise(rupees) {
  const n = Number(rupees);
  if (!Number.isFinite(n) || n < 0) return null;
  // Round rather than truncate so 501.005 does not silently lose a paisa.
  return Math.round(n * 100);
}

/** Integer paise to a rupee number, for display only. */
export function paiseToRupees(paise) {
  const n = Number(paise);
  if (!Number.isFinite(n)) return 0;
  return n / 100;
}

/** Indian-format currency string, e.g. ₹1,001. */
export function formatPaise(paise) {
  return `₹${paiseToRupees(paise).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Validate a server-computed amount.
 * Callers must derive the amount from the database (a pooja's price, or a
 * donation amount they have already range-checked) — never from the browser.
 */
export function validateAmountPaise(amountPaise) {
  if (!Number.isInteger(amountPaise)) {
    return { valid: false, error: 'Amount must be a whole number of paise.' };
  }
  if (amountPaise < MIN_AMOUNT_PAISE) {
    return { valid: false, error: `The minimum amount is ${formatPaise(MIN_AMOUNT_PAISE)}.` };
  }
  if (amountPaise > MAX_AMOUNT_PAISE) {
    return {
      valid: false,
      error: `For amounts above ${formatPaise(MAX_AMOUNT_PAISE)}, please contact the temple office.`
    };
  }
  return { valid: true };
}

/* ------------------------------------------------------------------ *
 * Reference numbers
 * ------------------------------------------------------------------ */

const REFERENCE_PREFIX = Object.freeze({
  DONATION: 'DON',
  POOJA: 'POOJA',
  RECEIPT: 'REC'
});

/** Where each scope's already-issued references live, for seeding the counter. */
const REFERENCE_SOURCE = Object.freeze({
  DON: { table: 'payments', column: 'reference_id' },
  POOJA: { table: 'payments', column: 'reference_id' },
  REC: { table: 'receipts', column: 'receipt_number' }
});

/**
 * Highest serial already issued for a scope, or 0.
 *
 * Only consulted when the counter row is missing. The counter is normally the
 * single source of truth; this exists so that a database whose counter row was
 * lost cannot restart numbering at 1 and collide with references that already
 * exist.
 */
async function highestIssued(run, prefix, scope) {
  const source = REFERENCE_SOURCE[prefix];
  if (!source) return 0;
  try {
    const result = await run(
      `SELECT ${source.column} AS ref FROM ${source.table} WHERE ${source.column} LIKE $1`,
      [`${scope}-%`]
    );
    let highest = 0;
    for (const row of result.rows || []) {
      const serial = Number(String(row.ref).split('-').pop());
      if (Number.isFinite(serial) && serial > highest) highest = serial;
    }
    return highest;
  } catch {
    // A missing table is not a reason to fail the payment.
    return 0;
  }
}

/**
 * Allocate the next human-readable reference, e.g. DON-2026-000001.
 *
 * The counter is incremented inside the caller's transaction and read back, so
 * two concurrent requests cannot receive the same number. Counting existing
 * rows would race; a dedicated counter row does not.
 *
 * The counter shares the caller's transaction, so if the payment insert fails
 * the increment is rolled back too — correct, but it means a lost or never-
 * created counter row must not restart at 1, or every future allocation in that
 * scope would collide with an existing reference and the scope would be wedged
 * permanently. A new counter is therefore seeded from the highest reference
 * already issued rather than from zero.
 *
 * @param {{query: Function}|Function} executor transaction client or query fn
 * @param {'DONATION'|'POOJA'|'RECEIPT'} kind
 * @param {number} [year]
 */
export async function nextReference(executor, kind, year = new Date().getFullYear()) {
  const prefix = REFERENCE_PREFIX[kind];
  if (!prefix) throw new Error(`Unknown reference kind: ${kind}`);

  const scope = `${prefix}-${year}`;
  const run = typeof executor === 'function' ? executor : (t, p) => executor.query(t, p);

  const existing = await run(`SELECT last_value FROM reference_counters WHERE scope = $1`, [scope]);
  const seed = existing.rows?.length ? null : await highestIssued(run, prefix, scope);

  // Insert the counter if it is new, then increment it atomically.
  await run(
    `INSERT INTO reference_counters (scope, last_value) VALUES ($1, $2)
     ON CONFLICT (scope) DO NOTHING`,
    [scope, seed ?? 0]
  );
  await run(
    `UPDATE reference_counters SET last_value = last_value + 1 WHERE scope = $1`,
    [scope]
  );
  const result = await run(`SELECT last_value FROM reference_counters WHERE scope = $1`, [scope]);

  const value = Number(result.rows?.[0]?.last_value);
  if (!Number.isFinite(value) || value < 1) {
    // Reaching here means the counter could not be read back after being
    // written. Returning a fallback would hand out a duplicate reference and
    // attach it to money, so fail the transaction instead.
    throw new Error(`Could not allocate a reference for ${scope}.`);
  }
  return `${scope}-${String(value).padStart(6, '0')}`;
}

/* ------------------------------------------------------------------ *
 * Delegation to the active provider
 * ------------------------------------------------------------------ */

export async function createOrder(order) {
  return getPaymentProvider().createOrder(order);
}

export function validateClaim(claim) {
  return getPaymentProvider().validateClaim(claim);
}

export async function verifyPaymentSignature(payload) {
  return getPaymentProvider().verifyPaymentSignature(payload);
}

export async function verifyWebhook(payload) {
  return getPaymentProvider().verifyWebhook(payload);
}

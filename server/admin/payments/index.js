/**
 * /api/admin/payments — administrator payment verification.
 *
 * GET  ?status=PENDING_VERIFICATION   list payments for review
 * POST { paymentId, action, reason }  verify or reject one payment
 *
 * This is the only route in the application that can move a payment to
 * VERIFIED and issue a receipt. Every request is checked against a real
 * server-side session before anything is read or written, and every decision
 * is written to the audit log with the administrator's identity.
 */

import {
  sendSuccess,
  sendError,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendMethodNotAllowed
} from '../../_lib/response.js';
import { getAuthenticatedUser, hasRequiredRole } from '../../_lib/auth.js';
import { logAudit } from '../../_lib/audit.js';
import { query } from '../../_lib/db.js';
import { listPayments, verifyPayment, rejectPayment } from '../../_lib/payment/paymentService.js';
import { sanitizeString } from '../../_lib/validation.js';

/** Roles permitted to verify money. Super admin always passes. */
const FINANCE_ROLES = ['finance_manager'];

const VALID_STATUSES = [
  'INITIATED',
  'PAYMENT_INSTRUCTIONS_SHOWN',
  'USER_CLAIMED_PAYMENT',
  'PENDING_VERIFICATION',
  'VERIFIED',
  'REJECTED',
  'CANCELLED'
];

export default async function handler(req, res) {
  try {
    // Authorization first: nothing is read or written for an anonymous caller.
    const user = await getAuthenticatedUser(req);
    if (!user) return sendUnauthorized(res, 'Sign in to manage payments.');
    if (!hasRequiredRole(user, FINANCE_ROLES)) {
      return sendForbidden(res, 'Your role does not permit payment verification.');
    }

    /* ---------------- List ---------------- */
    if (req.method === 'GET') {
      const status = sanitizeString(req.query?.status, 32);
      if (status && !VALID_STATUSES.includes(status)) {
        return sendBadRequest(res, 'Unknown payment status filter.');
      }

      const payments = await listPayments({ status: status || null, limit: req.query?.limit });

      // Include the devotee's own claims so the administrator can compare the
      // stated UTR against the temple's bank or UPI statement.
      const claims = await query(
        `SELECT payment_id, utr, payer_name, payer_mobile, payment_date, note, created_at
           FROM payment_claims ORDER BY created_at DESC LIMIT 500`
      );
      const claimsByPayment = {};
      for (const claim of claims.rows) {
        (claimsByPayment[claim.payment_id] ||= []).push(claim);
      }

      return sendSuccess(res, {
        payments: payments.map((p) => ({ ...p, claims: claimsByPayment[p.id] || [] })),
        count: payments.length
      });
    }

    /* ---------------- Verify or reject ---------------- */
    if (req.method === 'POST') {
      const body = req.body || {};
      const paymentId = sanitizeString(body.paymentId, 64);
      const action = String(body.action || '').toUpperCase();

      if (!paymentId) return sendBadRequest(res, 'A payment id is required.');
      if (!['VERIFY', 'REJECT'].includes(action)) {
        return sendBadRequest(res, 'Action must be VERIFY or REJECT.');
      }

      if (action === 'VERIFY') {
        const result = await verifyPayment(paymentId, user);
        if (!result.ok) {
          return sendError(res, result.error, result.code, result.code === 'NOT_FOUND' ? 404 : 409);
        }

        await logAudit(query, {
          userId: user.id,
          userName: user.name,
          action: 'Payment Verified',
          entityType: 'Payment',
          entityId: paymentId,
          metadata: { receiptNumber: result.receiptNumber, alreadyVerified: result.alreadyVerified },
          req
        });

        return sendSuccess(
          res,
          {
            verified: true,
            receiptNumber: result.receiptNumber,
            alreadyVerified: result.alreadyVerified
          },
          result.alreadyVerified
            ? 'This payment was already verified.'
            : 'Payment verified and receipt issued.'
        );
      }

      const reason = sanitizeString(body.reason, 500);
      const result = await rejectPayment(paymentId, user, reason);
      if (!result.ok) {
        return sendError(res, result.error, result.code, result.code === 'NOT_FOUND' ? 404 : 400);
      }

      await logAudit(query, {
        userId: user.id,
        userName: user.name,
        action: 'Payment Rejected',
        entityType: 'Payment',
        entityId: paymentId,
        metadata: { reason },
        req
      });

      return sendSuccess(res, { rejected: true }, 'Payment rejected.');
    }

    return sendMethodNotAllowed(res, ['GET', 'POST']);
  } catch (err) {
    console.error('[Admin Payments Error]', err);
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return sendError(res, 'The temple database is not available.', 'DATABASE_NOT_CONFIGURED', 503);
    }
    return sendError(res, 'Unable to process this payment action.');
  }
}

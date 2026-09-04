/**
 * /api/temple/submissions
 *
 * POST   public — a devotee offers historical material
 * GET    admin  — review queue
 * PUT    admin  — approve, reject or annotate
 * DELETE admin  — remove a submission
 *
 * This is the one content route whose permissions run the opposite way to
 * the rest of the site: anybody may write, only an administrator may read.
 * A submission is a private offer of material until someone has looked at
 * it, so it is never returned publicly and never published automatically.
 *
 * Approving a submission does not put it on the website either. It marks
 * the material as accepted for the archive; an administrator still copies
 * it into the gallery or history with a source, which keeps the "nothing is
 * published without a source" rule intact.
 */

import crypto from 'crypto';
import { query } from '../../_lib/db.js';
import {
  sendSuccess,
  sendError,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendMethodNotAllowed
} from '../../_lib/response.js';
import { getAuthenticatedUser, hasRequiredRole } from '../../_lib/auth.js';
import { logAudit } from '../../_lib/audit.js';
import { sanitizeString } from '../../_lib/validation.js';
import { COPYRIGHT_STATUSES, VERIFICATION_STATUSES } from '../../_lib/evidence.js';

const REVIEW_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];
const WRITE_ROLES = ['admin', 'finance_manager'];

/**
 * What a devotee may be offering. Anything outside this list is recorded as
 * "Other" rather than rejected: the point of the form is to receive material,
 * not to argue about how it is categorised.
 */
const MATERIAL_TYPES = [
  'Old Photograph',
  'Newspaper Clipping',
  'Festival Invitation',
  'Temple Document',
  'Inscription Photograph',
  'Oral History',
  'Other'
];

/** Client address, for rate-limiting and abuse handling only. */
function clientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return sanitizeString((raw || '').split(',')[0] || req.socket?.remoteAddress || '', 64) || null;
}

export default async function handler(req, res) {
  try {
    /* ---------------- Public: offer material ---------------- */
    if (req.method === 'POST') {
      const body = req.body || {};
      const title = sanitizeString(body.title, 200);
      const description = sanitizeString(body.description, 5000);

      if (!title) return sendBadRequest(res, 'Please describe what you are sharing.');

      // Free text: "around 1980", "my grandfather's time" and "unknown" are
      // all more honest than forcing a year the sender does not have.
      const approximateYear = sanitizeString(body.approximateYear, 60) || null;
      const permission = String(body.copyrightPermission || 'NOT_STATED').toUpperCase();

      const rawType = sanitizeString(body.materialType, 60);
      const materialType = MATERIAL_TYPES.includes(rawType) ? rawType : rawType ? 'Other' : null;

      // review_status and verification_status are literals below, never read
      // from the request: a submitter cannot arrive pre-approved or verified.
      // created_by / updated_by are likewise not accepted from the public.
      const id = `sub_${crypto.randomBytes(12).toString('hex')}`;
      await query(
        `INSERT INTO historical_submissions
           (id, title, description, approximate_year, submitted_by, submitter_contact,
            source, material_type, copyright_permission, image_url, review_status,
            verification_status, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', 'Needs Verification', $11)`,
        [
          id,
          title,
          description || null,
          approximateYear,
          sanitizeString(body.submittedBy, 200) || null,
          sanitizeString(body.submitterContact, 200) || null,
          sanitizeString(body.source, 300) || null,
          materialType,
          COPYRIGHT_STATUSES.includes(permission) ? permission : 'NOT_STATED',
          sanitizeString(body.imageUrl, 1000) || null,
          clientIp(req)
        ]
      );

      // The reference is all that comes back: echoing the stored row would
      // let anyone confirm what else has been submitted.
      return sendSuccess(
        res,
        { reference: id },
        'Thank you. The temple committee will review the material you have shared.',
        201
      );
    }

    /* ---------------- Everything else is administrative ---------------- */
    const user = await getAuthenticatedUser(req);
    if (!user) return sendUnauthorized(res, 'Authentication required.');
    if (!hasRequiredRole(user, WRITE_ROLES)) {
      return sendForbidden(res, 'Your role does not permit this action.');
    }

    if (req.method === 'GET') {
      const status = String(req.query?.status || '').toUpperCase();
      const params = [];
      let where = '';
      if (REVIEW_STATUSES.includes(status)) {
        params.push(status);
        where = ` WHERE review_status = $${params.length}`;
      }

      const result = await query(
        `SELECT id, title, description, approximate_year, submitted_by, submitter_contact,
                source, material_type, copyright_permission, image_url, review_status,
                verification_status, admin_notes, reviewed_by, reviewed_at, created_at
           FROM historical_submissions${where}
          ORDER BY created_at DESC`,
        params
      );
      return sendSuccess(res, { items: result.rows, count: result.rows.length });
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const id = sanitizeString(req.query?.id || (req.body || {}).id, 64);
      if (!id) return sendBadRequest(res, 'A submission id is required.');

      const body = req.body || {};
      const columns = [];
      const values = [];

      if (body.reviewStatus !== undefined) {
        const status = String(body.reviewStatus).toUpperCase();
        // "More information needed" is a note on a submission that is still
        // awaiting review, not a fourth terminal state, so it is stored as
        // PENDING with the request recorded in admin_notes. That keeps the
        // review queue honest: the item is still open.
        if (status === 'NEEDS_MORE_INFO') {
          columns.push('review_status');
          values.push('PENDING');
        } else {
          if (!REVIEW_STATUSES.includes(status)) {
            return sendBadRequest(
              res,
              `Review status must be one of: ${REVIEW_STATUSES.join(', ')}, NEEDS_MORE_INFO.`
            );
          }
          columns.push('review_status');
          values.push(status);
        }
      }
      if (body.verificationStatus !== undefined) {
        const status = sanitizeString(body.verificationStatus, 60);
        if (!VERIFICATION_STATUSES.includes(status)) {
          return sendBadRequest(res, `Verification status must be one of: ${VERIFICATION_STATUSES.join(', ')}.`);
        }
        columns.push('verification_status');
        values.push(status);
      }
      if (body.adminNotes !== undefined) {
        columns.push('admin_notes');
        values.push(sanitizeString(body.adminNotes, 5000) || null);
      }
      if (!columns.length) return sendBadRequest(res, 'No valid fields supplied.');

      columns.push('reviewed_by', 'reviewed_at');
      values.push(user.id, new Date().toISOString().slice(0, 19).replace('T', ' '));

      const setClause = columns.map((c, i) => `${c} = $${i + 1}`).join(', ');
      const result = await query(
        `UPDATE historical_submissions SET ${setClause} WHERE id = $${columns.length + 1} RETURNING id`,
        [...values, id]
      );
      if (!result.rows.length && result.rowCount === 0) {
        return sendNotFound(res, 'Submission not found.');
      }

      await logAudit(query, {
        userId: user.id,
        userName: user.name,
        action: 'Historical Submission Reviewed',
        entityType: 'Historical Submission',
        entityId: id,
        metadata: { fields: columns },
        req
      });

      return sendSuccess(res, { id }, 'Submission updated.');
    }

    if (req.method === 'DELETE') {
      const id = sanitizeString(req.query?.id || (req.body || {}).id, 64);
      if (!id) return sendBadRequest(res, 'A submission id is required.');

      const result = await query(
        'DELETE FROM historical_submissions WHERE id = $1 RETURNING id',
        [id]
      );
      if (!result.rows.length && result.rowCount === 0) {
        return sendNotFound(res, 'Submission not found.');
      }

      await logAudit(query, {
        userId: user.id,
        userName: user.name,
        action: 'Historical Submission Deleted',
        entityType: 'Historical Submission',
        entityId: id,
        metadata: {},
        req
      });

      return sendSuccess(res, { deleted: id }, 'Submission removed.');
    }

    return sendMethodNotAllowed(res, ['GET', 'POST', 'PUT', 'DELETE']);
  } catch (err) {
    console.error('[Historical Submission Error]', err);
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return sendError(res, 'The database is not configured.', 'DATABASE_NOT_CONFIGURED', 503);
    }
    return sendError(res, 'Failed to process the submission.');
  }
}

/**
 * /api/temple/claims
 *
 * GET    public — claims marked visible; admins additionally see the rest
 * POST   admin  — record a claim
 * PUT    admin  — update a claim or its verification
 * DELETE admin  — remove a claim
 *
 * A register of individual historical claims and what backs each one. The
 * point of keeping this separate from /api/temple/history is that a claim
 * can be *recorded without being published*: "Raja Raja Narendra built the
 * present temple" belongs in the register as an unverified claim, so that
 * the temple has a note of it and of why it is not on the website, but it
 * must not appear as history. public_visible therefore defaults to false
 * and has to be set deliberately.
 */

import { createResourceHandler } from '../../_lib/crud.js';
import {
  SOURCE_TYPES,
  VERIFICATION_STATUSES,
  enumField,
  dateField,
  urlField,
  text,
  bool,
  int
} from '../../_lib/evidence.js';

export default createResourceHandler({
  table: 'historical_claims',
  idPrefix: 'clm',
  entityType: 'Historical Claim',
  publicSelect: `id, claim, claim_type, description, source_type, source_title,
                 source_url, source_date, verification_status, verified_by,
                 verification_date, public_visible, display_order, created_at`,
  publicWhere: 'public_visible = TRUE',
  orderBy: 'display_order ASC, created_at ASC',
  requiredOnCreate: ['claim'],
  fields: {
    claim: { column: 'claim', transform: text(2000) },
    claimType: { column: 'claim_type', transform: text(60) },
    description: { column: 'description', transform: text(10000) },
    sourceType: enumField('source_type', SOURCE_TYPES, 'Unverified'),
    sourceTitle: { column: 'source_title', transform: text(300) },
    sourceUrl: urlField('source_url', 'Source link'),
    sourceDate: dateField('source_date'),
    verificationStatus: enumField('verification_status', VERIFICATION_STATUSES, 'Needs Verification'),
    verifiedBy: { column: 'verified_by', transform: text(200) },
    verificationDate: dateField('verification_date'),
    // Kept out of publicSelect: working notes are for the committee.
    adminNotes: { column: 'admin_notes', transform: text(10000) },
    publicVisible: { column: 'public_visible', transform: bool },
    displayOrder: { column: 'display_order', transform: int }
  }
});

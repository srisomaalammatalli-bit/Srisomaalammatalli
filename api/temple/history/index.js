/**
 * /api/temple/history
 *
 * GET    public — published history entries, in display order
 * POST   admin  — add an entry
 * PUT    admin  — update an entry
 * DELETE admin  — remove an entry
 *
 * The narrative history of the temple, one entry per section. Every entry
 * carries its source and verification status so the page can show the
 * difference between what is documented and what is remembered; the columns
 * are validated against the shared evidence vocabulary rather than accepted
 * as free text.
 */

import { createResourceHandler } from '../../_lib/crud.js';
import {
  SOURCE_TYPES,
  VERIFICATION_STATUSES,
  enumField,
  yearField,
  dateField,
  urlField,
  text,
  bool,
  int
} from '../../_lib/evidence.js';

export default createResourceHandler({
  table: 'temple_history',
  idPrefix: 'hist',
  entityType: 'History Entry',
  publicSelect: `id, period, year_start, year_end, title, description, telugu_description,
                 source_type, source_title, source_url, source_date, author,
                 verification_status, featured, display_order, published, created_at`,
  publicWhere: 'published = TRUE',
  orderBy: 'display_order ASC, year_start ASC, created_at ASC',
  requiredOnCreate: ['title'],
  fields: {
    period: { column: 'period', transform: text(120) },
    yearStart: yearField('year_start'),
    yearEnd: yearField('year_end'),
    title: { column: 'title', transform: text(200) },
    description: { column: 'description', transform: text(20000) },
    teluguDescription: { column: 'telugu_description', transform: text(20000) },
    sourceType: enumField('source_type', SOURCE_TYPES, 'Unverified'),
    sourceTitle: { column: 'source_title', transform: text(300) },
    sourceUrl: urlField('source_url', 'Source link'),
    sourceDate: dateField('source_date'),
    author: { column: 'author', transform: text(200) },
    notes: { column: 'notes', transform: text(5000) },
    verificationStatus: enumField('verification_status', VERIFICATION_STATUSES, 'Needs Verification'),
    featured: { column: 'featured', transform: bool },
    displayOrder: { column: 'display_order', transform: int },
    published: { column: 'published', transform: bool }
  }
});

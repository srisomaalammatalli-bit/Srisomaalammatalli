/**
 * /api/financial-records
 *
 * GET    public  — published financial summaries only
 * POST   finance — create a summary for a financial year
 * PUT    finance — update a summary
 * DELETE finance — remove a summary
 *
 * This is the public trust surface of the temple, so:
 * - only rows explicitly marked `published` are visible to devotees;
 * - writes are limited to the finance role (super_admin always permitted);
 * - amounts are coerced to non-negative numbers before they reach SQL.
 *
 * Nothing is pre-populated. Until the committee publishes real audited
 * figures the table stays empty and the public page shows an empty state
 * rather than invented numbers.
 */

import { createResourceHandler } from '../_lib/crud.js';
import { sanitizeString } from '../_lib/validation.js';

const text = (max) => (v) => sanitizeString(v, max);
const bool = (v) => Boolean(v);

/** Money: never negative, never NaN, rounded to paise. */
function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

/** Timestamp for the published_at column, or null. */
function timestamp(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 19).replace('T', ' ');
}

export default createResourceHandler({
  table: 'financial_records',
  idPrefix: 'fin',
  entityType: 'Financial Record',
  publicSelect:
    'id, financial_year_id, total_donations, total_expenses, event_expenses, maintenance_expenses, pooja_expenses, other_expenses, notes, report_url, published, published_at, created_at',
  publicWhere: 'published = TRUE',
  orderBy: 'financial_year_id DESC',
  requiredOnCreate: ['financialYearId'],
  writeRoles: ['finance_manager'],
  fields: {
    financialYearId: { column: 'financial_year_id', transform: text(20) },
    totalDonations: { column: 'total_donations', transform: money },
    totalExpenses: { column: 'total_expenses', transform: money },
    eventExpenses: { column: 'event_expenses', transform: money },
    maintenanceExpenses: { column: 'maintenance_expenses', transform: money },
    poojaExpenses: { column: 'pooja_expenses', transform: money },
    otherExpenses: { column: 'other_expenses', transform: money },
    notes: { column: 'notes', transform: text(2000) },
    reportUrl: { column: 'report_url', transform: text(500) },
    published: { column: 'published', transform: bool },
    publishedAt: { column: 'published_at', transform: timestamp }
  }
});

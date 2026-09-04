import { query } from '../_lib/db.js';
import {
  sendSuccess,
  sendError,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendMethodNotAllowed
} from '../_lib/response.js';
import { getAuthenticatedUser, hasRequiredRole } from '../_lib/auth.js';
import { logAudit } from '../_lib/audit.js';
import { sanitizeString } from '../_lib/validation.js';
import crypto from 'node:crypto';

/**
 * /api/jathara — the annual festival's accounts.
 *
 * GET    public — one year's ledger, totals and expense breakdown
 * POST   admin  — record an income or expense entry, or an expense category
 * PUT    admin  — correct an entry, or set the year's title/status
 * DELETE admin  — remove an entry
 *
 * Until now this route accepted GET only: the tables existed from migration
 * 001, the screen displayed them, and there was no way to put a rupee in. A
 * committee that cannot record the Jathara's collections cannot publish its
 * accounts, which is the whole promise this website makes to devotees.
 *
 * Two rules shape the writes.
 *
 * Money is integer paise. Every amount arrives as rupees from the form and is
 * converted once, here, so no fraction of a paisa is ever created by the
 * arithmetic. The legacy NUMERIC columns are kept in step for the public
 * transparency page, but the paise columns are the truth.
 *
 * Totals are derived, never typed. `total_collection_paise`,
 * `total_expense_paise` and the balance are recomputed from the entries after
 * every write, so a published total cannot disagree with the records behind
 * it. A committee member enters what happened; the arithmetic is not theirs
 * to get wrong.
 */

const WRITE_ROLES = ['admin', 'finance_manager'];
const MAX_TITLE = 255;
const MAX_NOTE = 2000;

/** ₹99,99,99,999 — far above any village Jathara, and a guard against a slip. */
const MAX_PAISE = 9999999999;

const newId = (prefix) => `${prefix}_${crypto.randomBytes(12).toString('hex')}`;

/**
 * Rupees from a form become integer paise.
 *
 * Rounding happens once, at the boundary. Anything that is not a finite
 * non-negative number is refused rather than silently becoming zero — a
 * collection recorded as ₹0 because the field held something unparseable
 * would be worse than an error message.
 */
function rupeesToPaise(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === '') return null;
  // Accept "1,500.50" and "₹1500" as an administrator would type them.
  const cleaned = String(raw).replace(/[,\s₹]/g, '');
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === '' || cleaned === '.') return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  const paise = Math.round(n * 100);
  if (!Number.isSafeInteger(paise) || paise > MAX_PAISE) return null;
  return paise;
}

const paiseToRupees = (paise) => Number(paise || 0) / 100;

async function requireWriter(req, res) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    sendUnauthorized(res, 'Sign in to record Jathara accounts.');
    return null;
  }
  if (!hasRequiredRole(user, WRITE_ROLES)) {
    sendForbidden(res, 'Your role does not permit changing the Jathara accounts.');
    return null;
  }
  return user;
}

/** A four-digit year the temple could plausibly be accounting for. */
function parseYear(raw) {
  const y = Number.parseInt(raw, 10);
  if (!Number.isInteger(y) || y < 2000 || y > 2200) return null;
  return y;
}

/**
 * Recompute the year's totals from its entries.
 *
 * This is why the screen's figures can be trusted: nothing writes a total
 * directly, so a published collection or expense can only ever be the sum of
 * the lines a committee member actually recorded.
 */
async function recomputeTotals(year) {
  const income = await query(
    `SELECT COALESCE(SUM(amount_paise), 0) AS total
       FROM jathara_timeline
      WHERE jathara_year = $1 AND is_expense = FALSE`,
    [year]
  );
  const spent = await query(
    `SELECT COALESCE(SUM(amount_paise), 0) AS total
       FROM jathara_timeline
      WHERE jathara_year = $1 AND is_expense = TRUE`,
    [year]
  );

  const collectionPaise = Number(income.rows[0]?.total || 0);
  const expensePaise = Number(spent.rows[0]?.total || 0);
  const balancePaise = collectionPaise - expensePaise;

  await query(
    `UPDATE jathara
        SET total_collection_paise = $1,
            total_expense_paise = $2,
            total_collection = $3,
            total_expense = $4,
            remaining_balance = $5,
            updated_at = CURRENT_TIMESTAMP
      WHERE year = $6`,
    [
      collectionPaise,
      expensePaise,
      paiseToRupees(collectionPaise),
      paiseToRupees(expensePaise),
      paiseToRupees(balancePaise),
      year
    ]
  );

  return { collectionPaise, expensePaise, balancePaise };
}

/** Create the year's record if this is the first entry for it. */
async function ensureYear(year, title) {
  const found = await query('SELECT year FROM jathara WHERE year = $1', [year]);
  if (found.rows.length) return false;
  await query(
    `INSERT INTO jathara (year, title, status, total_collection, total_expense, remaining_balance)
     VALUES ($1, $2, 'Active', 0, 0, 0)`,
    [year, sanitizeString(title || `Jathara ${year}`, MAX_TITLE)]
  );
  return true;
}

export default async function handler(req, res) {
  try {
    /* ------------------------------------------------------------- GET */
    if (req.method === 'GET') {
      const year = parseYear(req.query.year) ?? new Date().getFullYear();

      const jatharaRes = await query('SELECT * FROM jathara WHERE year = $1', [year]);
      const timelineRes = await query(
        `SELECT * FROM jathara_timeline
          WHERE jathara_year = $1
          ORDER BY display_order ASC, created_at ASC`,
        [year]
      );
      const catRes = await query(
        `SELECT * FROM jathara_expense_categories
          WHERE jathara_year = $1
          ORDER BY display_order ASC`,
        [year]
      );

      // The years actually recorded, so the screen offers those rather than
      // guessing a range that may be empty.
      const yearsRes = await query('SELECT year FROM jathara ORDER BY year DESC');

      // No record for this year means no Jathara has been accounted for yet.
      // The figures below are zero rather than invented: this screen reports
      // money the temple has actually collected and spent, and a placeholder
      // total here would be indistinguishable from a real one.
      const existing = jatharaRes.rows[0];
      const data = existing || {
        year,
        title: null,
        total_collection: 0,
        total_expense: 0,
        remaining_balance: 0,
        contributor_count: 0,
        status: 'Not started'
      };

      return sendSuccess(res, {
        // `recorded` lets the screen say "nothing recorded yet" instead of
        // showing zeroes that look like a Jathara which raised nothing.
        jathara: { ...data, recorded: Boolean(existing) },
        timeline: timelineRes.rows,
        expenseBreakdown: catRes.rows,
        years: yearsRes.rows.map((r) => Number(r.year))
      });
    }

    /* ------------------------------------------------------------ POST */
    if (req.method === 'POST') {
      const user = await requireWriter(req, res);
      if (!user) return;

      const body = req.body || {};
      const year = parseYear(body.year);
      if (year === null) {
        return sendBadRequest(res, 'A Jathara year between 2000 and 2200 is required.');
      }

      /* An expense category — a heading such as "Annadanam" or "Decorations". */
      if (String(body.kind) === 'category') {
        const name = sanitizeString(body.categoryName, 128);
        if (!name) return sendBadRequest(res, 'A category name is required.');
        const paise = rupeesToPaise(body.amount ?? 0);
        if (paise === null) {
          return sendBadRequest(res, 'Enter the amount in rupees, for example 5000 or 5000.50.');
        }

        await ensureYear(year, body.title);
        const id = newId('jcat');
        await query(
          `INSERT INTO jathara_expense_categories
             (id, jathara_year, category_name, amount, amount_paise, display_order)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, year, name, paiseToRupees(paise), paise, Number.parseInt(body.displayOrder, 10) || 0]
        );

        await logAudit(query, {
          userId: user.id,
          userName: user.name,
          action: 'Jathara Expense Category Added',
          entityType: 'Jathara',
          entityId: id,
          metadata: { year, category: name, amountPaise: paise },
          req
        });

        return sendSuccess(res, { id, year }, 'Expense category added.');
      }

      /* An income or expense entry on the year's ledger. */
      const title = sanitizeString(body.title, MAX_TITLE);
      if (!title) return sendBadRequest(res, 'Describe what this entry is for.');

      const paise = rupeesToPaise(body.amount);
      if (paise === null) {
        return sendBadRequest(res, 'Enter the amount in rupees, for example 5000 or 5000.50.');
      }
      if (paise === 0) {
        return sendBadRequest(res, 'An entry of ₹0 cannot be recorded. Enter the actual amount.');
      }

      const isExpense = Boolean(body.isExpense);
      const created = await ensureYear(year, body.title);
      const id = newId('jtl');

      await query(
        `INSERT INTO jathara_timeline
           (id, jathara_year, title, milestone_date, amount, amount_paise, is_expense, note, color_code, display_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          id,
          year,
          title,
          sanitizeString(body.milestoneDate, 64) || new Date().toISOString().slice(0, 10),
          paiseToRupees(paise),
          paise,
          isExpense,
          sanitizeString(body.note, MAX_NOTE) || null,
          isExpense ? '#B23A48' : '#2E7D5B',
          Number.parseInt(body.displayOrder, 10) || 0
        ]
      );

      const totals = await recomputeTotals(year);

      await logAudit(query, {
        userId: user.id,
        userName: user.name,
        action: isExpense ? 'Jathara Expense Recorded' : 'Jathara Income Recorded',
        entityType: 'Jathara',
        entityId: id,
        metadata: { year, title, amountPaise: paise, isExpense, yearCreated: created },
        req
      });

      return sendSuccess(res, { id, year, totals }, isExpense ? 'Expense recorded.' : 'Income recorded.');
    }

    /* ------------------------------------------------------------- PUT */
    if (req.method === 'PUT') {
      const user = await requireWriter(req, res);
      if (!user) return;

      const body = req.body || {};

      // Setting the year's own title, status or contributor count.
      if (String(body.kind) === 'year') {
        const year = parseYear(body.year);
        if (year === null) return sendBadRequest(res, 'A valid Jathara year is required.');

        const found = await query('SELECT year FROM jathara WHERE year = $1', [year]);
        if (!found.rows.length) {
          return sendNotFound(res, 'No Jathara has been recorded for that year.');
        }

        const STATUSES = ['Upcoming', 'Active', 'Completed', 'Audited'];
        const status = body.status ? String(body.status) : null;
        if (status && !STATUSES.includes(status)) {
          return sendBadRequest(res, `Status must be one of: ${STATUSES.join(', ')}.`);
        }

        const raw = body.contributorCount;
        const contributors =
          raw === undefined || raw === null || raw === '' ? null : Number.parseInt(raw, 10);
        if (contributors !== null && (!Number.isInteger(contributors) || contributors < 0)) {
          return sendBadRequest(res, 'The number of contributors must be zero or more.');
        }

        await query(
          `UPDATE jathara
              SET title = COALESCE($1, title),
                  status = COALESCE($2, status),
                  contributor_count = COALESCE($3, contributor_count),
                  notes = COALESCE($4, notes),
                  updated_at = CURRENT_TIMESTAMP
            WHERE year = $5`,
          [
            body.title ? sanitizeString(body.title, MAX_TITLE) : null,
            status,
            contributors,
            body.notes ? sanitizeString(body.notes, MAX_NOTE) : null,
            year
          ]
        );

        await logAudit(query, {
          userId: user.id,
          userName: user.name,
          action: 'Jathara Year Updated',
          entityType: 'Jathara',
          entityId: String(year),
          metadata: { year, status, contributors },
          req
        });

        return sendSuccess(res, { year }, 'Jathara details saved.');
      }

      // Correcting an entry.
      const id = sanitizeString(body.id, 64);
      if (!id) return sendBadRequest(res, 'The entry to change is required.');

      const found = await query('SELECT * FROM jathara_timeline WHERE id = $1', [id]);
      if (!found.rows.length) return sendNotFound(res, 'That entry no longer exists.');
      const entry = found.rows[0];

      let paise = Number(entry.amount_paise || 0);
      if (body.amount !== undefined) {
        const parsed = rupeesToPaise(body.amount);
        if (parsed === null || parsed === 0) {
          return sendBadRequest(res, 'Enter the amount in rupees, for example 5000 or 5000.50.');
        }
        paise = parsed;
      }

      const isExpense =
        body.isExpense === undefined ? Boolean(entry.is_expense) : Boolean(body.isExpense);

      await query(
        `UPDATE jathara_timeline
            SET title = COALESCE($1, title),
                milestone_date = COALESCE($2, milestone_date),
                amount = $3,
                amount_paise = $4,
                is_expense = $5,
                note = COALESCE($6, note),
                color_code = $7
          WHERE id = $8`,
        [
          body.title ? sanitizeString(body.title, MAX_TITLE) : null,
          body.milestoneDate ? sanitizeString(body.milestoneDate, 64) : null,
          paiseToRupees(paise),
          paise,
          isExpense,
          body.note ? sanitizeString(body.note, MAX_NOTE) : null,
          isExpense ? '#B23A48' : '#2E7D5B',
          id
        ]
      );

      const totals = await recomputeTotals(entry.jathara_year);

      await logAudit(query, {
        userId: user.id,
        userName: user.name,
        action: 'Jathara Entry Corrected',
        entityType: 'Jathara',
        entityId: id,
        // The previous amount is kept: a correction to the temple's accounts
        // should always be answerable afterwards.
        metadata: {
          year: entry.jathara_year,
          fromPaise: Number(entry.amount_paise || 0),
          toPaise: paise
        },
        req
      });

      return sendSuccess(res, { id, totals }, 'Entry updated.');
    }

    /* ---------------------------------------------------------- DELETE */
    if (req.method === 'DELETE') {
      const user = await requireWriter(req, res);
      if (!user) return;

      const id = sanitizeString((req.query && req.query.id) || (req.body || {}).id, 64);
      if (!id) return sendBadRequest(res, 'The entry to remove is required.');

      const table = id.startsWith('jcat_') ? 'jathara_expense_categories' : 'jathara_timeline';

      const found = await query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
      if (!found.rows.length) return sendNotFound(res, 'That entry no longer exists.');
      const row = found.rows[0];

      await query(`DELETE FROM ${table} WHERE id = $1`, [id]);
      const totals = await recomputeTotals(row.jathara_year);

      await logAudit(query, {
        userId: user.id,
        userName: user.name,
        action: 'Jathara Entry Removed',
        entityType: 'Jathara',
        entityId: id,
        metadata: {
          year: row.jathara_year,
          title: row.title || row.category_name,
          amountPaise: Number(row.amount_paise || 0)
        },
        req
      });

      return sendSuccess(res, { deleted: id, totals }, 'Entry removed.');
    }

    return sendMethodNotAllowed(res, ['GET', 'POST', 'PUT', 'DELETE']);
  } catch (err) {
    console.error('[Jathara API Error]', err);
    return sendError(res, 'Failed to process the Jathara request.');
  }
}

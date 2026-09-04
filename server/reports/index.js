import { query } from '../_lib/db.js';
import { sendSuccess, sendError } from '../_lib/response.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return sendError(res, 'Method not allowed', 405);
  }

  try {
    // The financial years the temple actually has, newest first. The admin
    // screens need this list to offer a year selector; without it they had
    // nothing to choose from.
    const yearsRes = await query(
      `SELECT id, label, start_date, end_date, is_current, opening_balance
         FROM financial_years
        ORDER BY start_date DESC`
    );
    const financialYears = yearsRes.rows;

    // Which year to report on: the one asked for, else the one the database
    // marks current, else the most recent. Never a year hardcoded here —
    // "FY2026-27" used to be written in, which would silently report on a
    // year the temple might not have.
    const requested = req.query.fy;
    const current = financialYears.find((y) => y.is_current) || financialYears[0];
    const fy = requested || current?.id || null;

    if (!fy) {
      // No financial years configured. An honest empty answer beats
      // inventing one.
      return sendSuccess(res, {
        fy: null,
        financialYears: [],
        summary: null,
        message: 'No financial years have been configured yet.'
      });
    }

    // Aggregate donations
    const donRes = await query(
      `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count 
       FROM donations 
       WHERE (financial_year_id = $1 OR financial_year_id IS NULL) AND status = 'Verified'`,
      [fy]
    );

    // Aggregate expenses
    const expRes = await query(
      `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count 
       FROM expenses 
       WHERE (financial_year_id = $1 OR financial_year_id IS NULL) AND status != 'Rejected'`,
      [fy]
    );

    // Aggregate land income
    const landRes = await query(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM land_income 
       WHERE (financial_year_id = $1 OR financial_year_id IS NULL) AND status = 'Verified'`,
      [fy]
    );

    // Aggregate chit income
    const chitRes = await query(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM chit_income 
       WHERE (financial_year_id = $1 OR financial_year_id IS NULL) AND status = 'Paid'`,
      [fy]
    );

    // These are real temple finances. A missing or zero total means exactly
    // that — no records yet — so it must report zero. Substituting a
    // placeholder figure here would publish invented money to devotees on the
    // public transparency page.
    const toAmount = (value) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    };

    const totalDonations = toAmount(donRes.rows[0]?.total);
    const totalExpenses = toAmount(expRes.rows[0]?.total);
    const totalLand = toAmount(landRes.rows[0]?.total);
    const totalChit = toAmount(chitRes.rows[0]?.total);

    // Jathara collections are recorded as donations in the Jathara category,
    // so they are summed rather than assumed.
    const jatharaRes = await query(
      `SELECT COALESCE(SUM(amount), 0) as total
         FROM donations
        WHERE (financial_year_id = $1 OR financial_year_id IS NULL)
          AND status = 'Verified'
          AND category = 'Annual Jathara Contribution'`,
      [fy]
    );
    const jatharaCollections = toAmount(jatharaRes.rows[0]?.total);

    // jatharaCollections is a subset of totalDonations (donations in the
    // Jathara category), so it is reported separately for the breakdown but
    // must not be added again here — that would inflate reported income.
    const totalIncome = totalDonations + totalLand + totalChit;
    const balance = totalIncome - totalExpenses;

    return sendSuccess(res, {
      fy,
      financialYears,
      summary: {
        totalIncome,
        totalExpenses,
        balance,
        totalDonations,
        totalLand,
        totalChit,
        jatharaCollections
      }
    });
  } catch (err) {
    console.error('[Reports API Error]', err);
    return sendError(res, 'Failed to generate financial reports.');
  }
}

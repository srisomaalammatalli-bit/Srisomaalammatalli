/**
 * Database seeder.
 *
 * Inserts only *structural reference data* the application needs in order to
 * function — roles, the initial administrator, financial-year definitions,
 * expense categories and site settings.
 *
 * It deliberately does NOT insert sample donations, donors, events, gallery
 * items, videos or financial figures. Those are real temple records and must be
 * entered by the temple committee through the admin portal; fabricating them
 * would put invented names and amounts in front of devotees.
 *
 * The administrator password is never committed. It is read from the
 * environment and hashed with bcrypt before storage:
 *
 *   ADMIN_NAME, ADMIN_EMAIL, ADMIN_MOBILE, ADMIN_PASSWORD
 *
 * Works against SQLite (local) and Aiven PostgreSQL (production); the driver is
 * chosen from DATABASE_URL by api/_lib/db.js.
 *
 * Usage:  npm run seed
 */

import bcrypt from 'bcryptjs';
import { loadEnv } from './env.js';

loadEnv();

const { query, getDriver, closeConnections } = await import('../api/_lib/db.js');

/** Roles the portal's authorization checks depend on. */
const ROLES = [
  ['super_admin', 'Super Admin', 'Full unrestricted platform and financial control'],
  ['finance_manager', 'Finance Manager', 'Donations, income, expenses and financial reporting'],
  ['admin', 'Admin', 'Events, gallery, videos, dates and record viewing'],
  ['viewer', 'Viewer', 'Read-only access to temple records']
];

/** Expense categories used to classify temple spending. */
const EXPENSE_CATEGORIES = [
  ['exp_pooja', 'Pooja & Rituals', 'Daily poojas, abhishekam and archana materials'],
  ['exp_maintenance', 'Temple Maintenance', 'Repairs, cleaning, painting and upkeep'],
  ['exp_festival', 'Festivals & Utsavams', 'Jathara, utsavam and festival expenditure'],
  ['exp_annadanam', 'Annadanam', 'Community food offering'],
  ['exp_utilities', 'Utilities', 'Electricity, water and related charges'],
  ['exp_salaries', 'Staff & Honorarium', 'Archaka and staff honorarium'],
  ['exp_other', 'Other Expenses', 'Expenditure not covered by another category']
];

/**
 * Financial years. Dates only — no amounts are invented. Opening balances start
 * at zero and are set by the committee from real records.
 */
function financialYears() {
  const now = new Date();
  // The Indian financial year runs April–March.
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const years = [];
  for (let offset = 0; offset < 3; offset++) {
    const y = startYear - offset;
    const short = String(y + 1).slice(-2);
    years.push({
      id: `FY${y}-${short}`,
      label: `FY ${y}–${short}${offset === 0 ? ' (Current)' : ''}`,
      start: `${y}-04-01`,
      end: `${y + 1}-03-31`,
      isCurrent: offset === 0
    });
  }
  return years;
}

/** Verified temple details supplied by the administrator. */
const SETTINGS = [
  ['temple_name', 'Srisomaalammatalli Temple'],
  ['temple_name_telugu', 'శ్రీ సోమలమ్మ తల్లి దేవస్థానం'],
  ['temple_address', 'Srisomaalammatalli Temple, Munjavarapu Kottu, Mungandapalem, P. Gannavaram Mandal, Dr. B. R. Ambedkar Konaseema District, Andhra Pradesh 533214'],
  ['temple_city', 'P. Gannavaram Mandal'],
  ['temple_state', 'Andhra Pradesh'],
  ['temple_pincode', '533214'],
  ['timings_morning_open', '06:30'],
  ['timings_morning_close', '11:30'],
  ['timings_evening_open', '16:30'],
  ['timings_evening_close', '20:25'],
  ['donation_qr_image', '/assets/qr/phonepe-donation-qr.jpg'],
  ['donation_qr_provider', 'PhonePe']
];

/**
 * Verified darshan timings supplied by the temple administrator:
 * every day 6:30–11:30 am and 4:30–8:25 pm.
 */
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function templeTimings() {
  return WEEKDAYS.map((day, index) => ({
    id: `tim_${day.slice(0, 3).toLowerCase()}`,
    day,
    morningOpen: '06:30',
    morningClose: '11:30',
    eveningOpen: '16:30',
    eveningClose: '20:25',
    order: index
  }));
}

/**
 * Daily sevas named in the temple's own information. Only these two are
 * asserted as daily; festival-specific poojas are added by the committee.
 */
const POOJAS = [
  {
    id: 'pja_abhishekam',
    name: 'Abhishekam',
    nameTelugu: 'అభిషేకం',
    description: 'Sacred bathing ritual performed for Amma Vari each morning.',
    time: '06:00',
    isDaily: true,
    order: 0
  },
  {
    id: 'pja_kumkuma_archana',
    name: 'Kumkuma Archana',
    nameTelugu: 'కుంకుమ అర్చన',
    description: 'Evening archana with kumkuma, open to all devotees.',
    time: '18:30',
    isDaily: true,
    order: 1
  }
];

function requireAdminCredentials() {
  const password = process.env.ADMIN_PASSWORD;
  const mobile = process.env.ADMIN_MOBILE;

  if (!password || !mobile) {
    console.error('Missing administrator credentials.');
    console.error('Set these before seeding (never commit them):');
    console.error('  ADMIN_MOBILE     login mobile number');
    console.error('  ADMIN_PASSWORD   initial password (min 10 characters)');
    console.error('  ADMIN_EMAIL      optional');
    console.error('  ADMIN_NAME       optional');
    process.exit(1);
  }

  if (password.length < 10) {
    console.error('ADMIN_PASSWORD must be at least 10 characters.');
    process.exit(1);
  }

  return {
    name: process.env.ADMIN_NAME || 'Temple Administrator',
    email: process.env.ADMIN_EMAIL || null,
    mobile,
    password
  };
}

/** UPSERT that works on both SQLite and PostgreSQL. */
async function upsert(table, columns, values, conflictColumn, updateColumns = []) {
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const setClause = updateColumns.length
    ? updateColumns.map((c) => `${c} = EXCLUDED.${c}`).join(', ')
    : null;

  const sql =
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ` +
    (setClause
      ? `ON CONFLICT (${conflictColumn}) DO UPDATE SET ${setClause}`
      : `ON CONFLICT (${conflictColumn}) DO NOTHING`);

  await query(sql, values);
}

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not defined. Nothing to seed.');
    process.exit(1);
  }

  const admin = requireAdminCredentials();
  console.log(`Seeding reference data (${getDriver()})...`);

  // 1. Roles
  for (const [id, name, description] of ROLES) {
    await upsert('roles', ['id', 'name', 'description'], [id, name, description], 'id', ['name', 'description']);
  }
  console.log(`  ✓ roles (${ROLES.length})`);

  // 2. Initial administrator — password hashed, never stored in plain text.
  const passwordHash = await bcrypt.hash(admin.password, 10);
  await upsert(
    'users',
    ['id', 'name', 'email', 'mobile', 'password_hash', 'role_id', 'status'],
    ['usr_admin_primary', admin.name, admin.email, admin.mobile, passwordHash, 'super_admin', 'Active'],
    'mobile',
    ['name', 'email', 'password_hash', 'role_id', 'status']
  );
  console.log(`  ✓ administrator (${admin.mobile}) — password hashed with bcrypt`);

  // 3. Financial years (dates only; balances start at zero)
  const years = financialYears();
  for (const fy of years) {
    await upsert(
      'financial_years',
      ['id', 'label', 'start_date', 'end_date', 'is_current', 'opening_balance'],
      [fy.id, fy.label, fy.start, fy.end, fy.isCurrent, 0],
      'id',
      ['label', 'start_date', 'end_date', 'is_current']
    );
  }
  console.log(`  ✓ financial years (${years.length}) — opening balances 0, set real values in the portal`);

  // 4. Expense categories
  for (const [id, name, description] of EXPENSE_CATEGORIES) {
    await upsert(
      'expense_categories',
      ['id', 'name', 'description'],
      [id, name, description],
      'id',
      ['name', 'description']
    );
  }
  console.log(`  ✓ expense categories (${EXPENSE_CATEGORIES.length})`);

  // 5. Site settings
  for (const [key, value] of SETTINGS) {
    await upsert('settings', ['key', 'value'], [key, JSON.stringify(value)], 'key', ['value']);
  }
  console.log(`  ✓ settings (${SETTINGS.length})`);

  // 6. Temple timings — verified darshan hours, one row per weekday.
  const timings = templeTimings();
  for (const t of timings) {
    await upsert(
      'temple_timings',
      ['id', 'day_of_week', 'morning_open', 'morning_close', 'evening_open', 'evening_close', 'display_order'],
      [t.id, t.day, t.morningOpen, t.morningClose, t.eveningOpen, t.eveningClose, t.order],
      'id',
      ['day_of_week', 'morning_open', 'morning_close', 'evening_open', 'evening_close', 'display_order']
    );
  }
  console.log(`  ✓ temple timings (${timings.length} days) — 06:30–11:30, 16:30–20:25`);

  // 7. Daily poojas named in the temple's own information.
  for (const p of POOJAS) {
    await upsert(
      'poojas',
      ['id', 'name', 'name_telugu', 'description', 'pooja_time', 'is_daily', 'display_order', 'published'],
      [p.id, p.name, p.nameTelugu, p.description, p.time, p.isDaily, p.order, true],
      'id',
      ['name', 'name_telugu', 'description', 'pooja_time', 'is_daily', 'display_order']
    );
  }
  console.log(`  ✓ poojas (${POOJAS.length}) — Abhishekam, Kumkuma Archana`);

  console.log('\nSeed complete.');
  console.log('No donations, events, gallery items, videos or financial figures were inserted —');
  console.log('those are real temple records and must be entered through the admin portal.');
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeConnections();
  });

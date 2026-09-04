/**
 * /api/poojas
 *
 * GET    public — published poojas and sevas
 * POST   admin  — add a pooja
 * PUT    admin  — update a pooja
 * DELETE admin  — remove a pooja
 *
 * Covers daily sevas (Abhishekam, Kumkuma Archana) and festival services.
 * Keeping these in the database means the committee can change service times
 * without a code deployment.
 */

import { createResourceHandler } from '../_lib/crud.js';
import { sanitizeString } from '../_lib/validation.js';

const text = (max) => (v) => sanitizeString(v, max);
const bool = (v) => Boolean(v);
const int = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Offering amounts are stored as integer paise. A non-integer or negative
 * value becomes -1 so validPaise can reject it with a clear message rather
 * than silently writing a wrong price.
 */
const paise = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : -1;
};

const validPaise = (value) =>
  value < 0 ? 'The offering amount must be a whole number of paise (₹501 is 50100).' : null;

export default createResourceHandler({
  table: 'poojas',
  idPrefix: 'pja',
  entityType: 'Pooja',
  publicSelect:
    'id, name, name_telugu, description, pooja_time, day_of_week, is_daily, ' +
    'price_paise, duration_minutes, image_url, instructions, available, ' +
    'display_order, published, created_at',
  publicWhere: 'published = TRUE',
  orderBy: 'display_order ASC, name ASC',
  requiredOnCreate: ['name'],
  fields: {
    name: { column: 'name', transform: text(160) },
    nameTelugu: { column: 'name_telugu', transform: text(160) },
    description: { column: 'description', transform: text(1000) },
    poojaTime: { column: 'pooja_time', transform: text(32) },
    dayOfWeek: { column: 'day_of_week', transform: text(16) },
    isDaily: { column: 'is_daily', transform: bool },
    // Offering amount in integer paise. Only an administrator can set this;
    // the public booking endpoint reads it and never accepts a client price.
    pricePaise: { column: 'price_paise', transform: paise, validate: validPaise },
    durationMinutes: { column: 'duration_minutes', transform: int },
    imageUrl: { column: 'image_url', transform: text(500) },
    instructions: { column: 'instructions', transform: text(2000) },
    available: { column: 'available', transform: bool },
    displayOrder: { column: 'display_order', transform: int },
    published: { column: 'published', transform: bool }
  }
});

/**
 * Server-Side Validation Utilities.
 * Enforces data sanity before entering SQL queries.
 */

export function validateRequired(fields, body) {
  const missing = [];
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || String(body[f]).trim() === '') {
      missing.push(f);
    }
  }
  return missing;
}

export function validateAmount(val) {
  if (val === undefined || val === null) return null;
  const num = Number(val);
  if (isNaN(num) || num <= 0 || !isFinite(num)) {
    return null;
  }
  // Standard 2-decimal rounded string for PostgreSQL NUMERIC(12,2)
  return Math.round(num * 100) / 100;
}

export function validateMobile(mobile) {
  if (!mobile) return null;
  const cleaned = String(mobile).replace(/[\s\-\+]/g, '');
  // Matches 10-digit Indian numbers with optional leading 91 or 0
  const match = cleaned.match(/^(?:0|91)?([6-9]\d{9})$/);
  return match ? match[1] : null;
}

export function validateEmail(email) {
  if (!email) return null;
  const trimmed = String(email).trim().toLowerCase();
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(trimmed) ? trimmed : null;
}

export function validateDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

export function sanitizeString(val, maxLength = 255) {
  if (!val) return '';
  return String(val).trim().slice(0, maxLength);
}

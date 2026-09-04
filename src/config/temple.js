/**
 * Verified temple facts, in one place.
 *
 * Every value here was supplied by the temple administrator. Nothing is
 * invented: where a detail has not been provided the field is left empty and
 * the UI shows an empty state rather than a plausible-looking placeholder.
 *
 * Timings and settings are also stored in the database (see `settings` and
 * `temple_timings`) so the committee can change them without a deployment.
 * These constants are the fallback used before that data loads, and the source
 * for details that are not editable, such as the temple's own name.
 */

export const TEMPLE = Object.freeze({
  name: 'Srisomaalammatalli Temple',
  nameTelugu: 'శ్రీ సోమాలమ్మ తల్లి దేవాలయం',
  shortName: 'Srisomaalammatalli',
  deity: 'Sri Somalamma Thalli',
  deityTelugu: 'శ్రీ సోమాలమ్మ తల్లి',

  address: Object.freeze({
    line1: 'Mungandapalem, Munjavarapu Kottu',
    line2: 'P. Gannavaram Mandal',
    city: 'Dr. B. R. Ambedkar Konaseema District',
    state: 'Andhra Pradesh',
    pincode: '533214',
    country: 'India'
  }),

  /**
   * Contact details have not been supplied yet. The UI checks these and shows
   * "will be published soon" rather than a fabricated number or address.
   */
  contact: Object.freeze({
    phone: '',
    email: ''
  }),

  /** Verified darshan hours — the same every day of the week. */
  timings: Object.freeze({
    morning: Object.freeze({ open: '06:30', close: '11:30' }),
    evening: Object.freeze({ open: '16:30', close: '20:25' }),
    note: 'Open every day'
  }),

  /** Donations are collected by UPI QR. No UPI id has been supplied. */
  donation: Object.freeze({
    qrImage: '/assets/qr/phonepe-donation-qr.jpg',
    provider: 'PhonePe',
    upiId: ''
  })
});

/** Full address on one line, for meta tags and the footer. */
export const ADDRESS_SINGLE_LINE = [
  TEMPLE.address.line1,
  TEMPLE.address.line2,
  TEMPLE.address.city,
  `${TEMPLE.address.state} ${TEMPLE.address.pincode}`
].join(', ');

/**
 * Directions link built from the address. A plain Maps link needs no API key
 * and therefore leaks no credentials.
 */
export const MAPS_DIRECTIONS_URL =
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${TEMPLE.name}, ${ADDRESS_SINGLE_LINE}`
  )}`;

/** Convert "HH:MM" (24-hour) into a display string such as "6:30 AM". */
export function formatTime(hhmm) {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

/** "6:30 AM – 11:30 AM" */
export function formatTimeRange(open, close) {
  const a = formatTime(open);
  const b = formatTime(close);
  return a && b ? `${a} – ${b}` : '';
}

/** Indian-format currency, e.g. ₹1,66,200. */
export function formatCurrency(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

/** "18 February 2026" from an ISO date, or '' when absent. */
export function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

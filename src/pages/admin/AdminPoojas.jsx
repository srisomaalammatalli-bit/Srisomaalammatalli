import React from 'react';
import AdminRecordScreen, { VisibilityCell } from '../../components/AdminRecordScreen.jsx';

/**
 * Pooja offerings and their prices.
 *
 * The price is entered in rupees because that is what an administrator and a
 * devotee both think in; it is stored as integer paise so no rounding error
 * can creep into money. Typing 501 saves 50100.
 *
 * The price shown here is the same one the booking API charges. A devotee's
 * browser can send any amount it likes and the server ignores it — the
 * database is the only authority on what a pooja costs.
 */

/** "501" or "501.50" from the administrator → 50100 / 50150 paise. */
function rupeesToPaise(value) {
  const n = Number(String(value).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(n) || n < 0) return -1;
  return Math.round(n * 100);
}

/** 50100 paise from the database → "501" in the form. */
function paiseToRupees(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return String(n / 100);
}

function formatRupees(paise) {
  const n = Number(paise);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `₹${(n / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

const FIELDS = [
  { name: 'name', column: 'name', label: 'Pooja name', required: true },
  { name: 'nameTelugu', column: 'name_telugu', label: 'Pooja name (Telugu)', lang: 'te' },
  {
    name: 'description',
    column: 'description',
    label: 'Description',
    type: 'textarea',
    rows: 4
  },
  {
    name: 'descriptionTelugu',
    column: 'description_telugu',
    label: 'Description (Telugu)',
    type: 'textarea',
    rows: 4,
    lang: 'te'
  },
  {
    name: 'pricePaise',
    column: 'price_paise',
    label: 'Offering amount (₹)',
    placeholder: 'e.g. 501',
    toRequest: rupeesToPaise,
    fromRecord: paiseToRupees,
    hint: 'In rupees. Leave at 0 while the amount has not been decided — the booking page then says the amount has not been published, rather than showing a figure nobody agreed.'
  },
  {
    name: 'durationMinutes',
    column: 'duration_minutes',
    label: 'Duration (minutes)',
    placeholder: 'e.g. 30'
  },
  {
    name: 'poojaTime',
    column: 'pooja_time',
    label: 'Time of day',
    placeholder: 'HH:MM, e.g. 06:30'
  },
  {
    name: 'dayOfWeek',
    column: 'day_of_week',
    label: 'Day',
    placeholder: 'e.g. Friday, or leave blank'
  },
  { name: 'isDaily', column: 'is_daily', label: 'Performed daily', type: 'checkbox' },
  {
    name: 'instructions',
    column: 'instructions',
    label: 'Instructions for devotees',
    type: 'textarea',
    rows: 3
  },
  {
    name: 'imageUrl',
    column: 'image_url',
    label: 'Image link',
    placeholder: '/assets/… or https://…',
    hint: 'Choose one from the Media Library and paste its address, or leave blank.'
  },
  { name: 'displayOrder', column: 'display_order', label: 'Display order', default: '0' },
  {
    name: 'available',
    column: 'available',
    label: 'Available for booking',
    type: 'checkbox',
    hint: 'An unavailable pooja is still listed but cannot be booked.'
  },
  { name: 'published', column: 'published', label: 'Published on the public site', type: 'checkbox' }
];

const COLUMNS = [
  {
    key: 'name',
    label: 'Pooja',
    render: (r) => (
      <div style={{ maxWidth: '32ch' }}>
        <strong>{r.name}</strong>
        {r.name_telugu ? (
          <div lang="te" style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {r.name_telugu}
          </div>
        ) : null}
      </div>
    )
  },
  {
    key: 'price_paise',
    label: 'Amount',
    render: (r) =>
      formatRupees(r.price_paise) || (
        <span style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
          Not published
        </span>
      )
  },
  {
    key: 'duration_minutes',
    label: 'Duration',
    render: (r) => (r.duration_minutes ? `${r.duration_minutes} min` : '—')
  },
  {
    key: 'available',
    label: 'Bookable',
    render: (r) => <VisibilityCell visible={r.available} hiddenLabel="Not bookable" />
  },
  {
    key: 'published',
    label: 'Public',
    render: (r) => <VisibilityCell visible={r.published} hiddenLabel="Draft" />
  }
];

export default function AdminPoojas() {
  return (
    <AdminRecordScreen
      title="Poojas"
      description="The offerings devotees can book, and what each costs. The amount saved here is the amount the booking charges — a devotee's browser cannot change it."
      endpoint="/poojas"
      addLabel="+ Add pooja"
      fields={FIELDS}
      columns={COLUMNS}
      emptyTitle="No poojas yet."
      emptyMessage="Add the offerings the temple performs, so devotees can book them."
      deletePrompt="Delete this pooja? It will disappear from the public site and can no longer be booked."
      extraRowActions={(record, { toggleFlag }) => [
        {
          label: record.published ? 'Unpublish' : 'Publish',
          onClick: () => toggleFlag(record, 'published', 'published')
        },
        {
          label: record.available ? 'Close bookings' : 'Open bookings',
          onClick: () => toggleFlag(record, 'available', 'available')
        }
      ]}
    />
  );
}

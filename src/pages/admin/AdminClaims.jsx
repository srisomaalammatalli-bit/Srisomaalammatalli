import React from 'react';
import AdminRecordScreen, {
  StatusCell,
  VisibilityCell,
  SOURCE_TYPES,
  VERIFICATION_STATUSES
} from '../../components/AdminRecordScreen.jsx';

/**
 * The register of historical claims.
 *
 * A claim can be recorded here without ever being published. That is the point
 * of keeping it separate from the history entries: "Raja Raja Narendra built
 * the present temple" belongs in the record, so the committee has a note of
 * the claim and of why it is not on the website, but it must not appear as
 * history. Public visibility is therefore off unless someone turns it on.
 *
 * Admin notes are working notes for the committee and are never returned by
 * the public API.
 */

const FIELDS = [
  {
    name: 'claim',
    column: 'claim',
    label: 'The claim',
    required: true,
    type: 'textarea',
    rows: 3,
    hint: 'State the claim as it is made, even if it is not one the temple endorses.'
  },
  {
    name: 'claimType',
    column: 'claim_type',
    label: 'Kind of claim',
    placeholder: 'e.g. Renovation, Construction, Tradition'
  },
  {
    name: 'description',
    column: 'description',
    label: 'Assessment',
    type: 'textarea',
    rows: 5,
    hint: 'What is known about this claim, and what would be needed to settle it.'
  },
  {
    name: 'sourceType',
    column: 'source_type',
    label: 'Source type',
    type: 'select',
    options: SOURCE_TYPES,
    default: 'Unverified'
  },
  { name: 'sourceTitle', column: 'source_title', label: 'Source title' },
  { name: 'sourceUrl', column: 'source_url', label: 'Source link', placeholder: 'https://…' },
  { name: 'sourceDate', column: 'source_date', label: 'Source date', placeholder: 'YYYY-MM-DD' },
  {
    name: 'verificationStatus',
    column: 'verification_status',
    label: 'Verification status',
    type: 'select',
    options: VERIFICATION_STATUSES,
    default: 'Needs Verification'
  },
  { name: 'verifiedBy', column: 'verified_by', label: 'Verified by' },
  {
    name: 'verificationDate',
    column: 'verification_date',
    label: 'Date verified',
    placeholder: 'YYYY-MM-DD'
  },
  {
    name: 'adminNotes',
    column: 'admin_notes',
    label: 'Committee notes (never shown publicly)',
    type: 'textarea',
    rows: 4,
    hint: 'Private. Use this to record why a claim is or is not published.'
  },
  { name: 'displayOrder', column: 'display_order', label: 'Display order', default: '0' },
  {
    name: 'publicVisible',
    column: 'public_visible',
    label: 'Show this claim on the public website',
    type: 'checkbox'
  }
];

const COLUMNS = [
  {
    key: 'claim',
    label: 'Claim',
    render: (r) => (
      <div style={{ maxWidth: '46ch' }}>
        <strong style={{ fontWeight: 600 }}>{r.claim}</strong>
        {r.claim_type ? (
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{r.claim_type}</div>
        ) : null}
      </div>
    )
  },
  { key: 'verification_status', label: 'Status', render: (r) => <StatusCell record={r} /> },
  {
    key: 'public_visible',
    label: 'Visibility',
    render: (r) => <VisibilityCell visible={r.public_visible} />
  },
  {
    key: 'updated_at',
    label: 'Last updated',
    render: (r) => {
      const value = r.updated_at || r.created_at;
      if (!value) return '—';
      const d = new Date(String(value).replace(' ', 'T'));
      return Number.isNaN(d.getTime())
        ? String(value)
        : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }
];

export default function AdminClaims() {
  return (
    <AdminRecordScreen
      title="Historical Claims"
      description="Every claim made about the temple's past, whether or not it is published. Recording a claim here is not the same as endorsing it: a claim stays hidden from the website until it is deliberately made visible."
      endpoint="/temple/claims"
      addLabel="+ Record a claim"
      fields={FIELDS}
      columns={COLUMNS}
      emptyTitle="No historical claims yet."
      emptyMessage="Record a claim to track what is asserted about the temple and what supports it."
      deletePrompt="Delete this claim from the register? The record of it will be lost."
      extraRowActions={(record, { toggleFlag }) => [
        {
          label: record.public_visible ? 'Hide from public' : 'Show publicly',
          onClick: () => toggleFlag(record, 'publicVisible', 'public_visible')
        }
      ]}
    />
  );
}

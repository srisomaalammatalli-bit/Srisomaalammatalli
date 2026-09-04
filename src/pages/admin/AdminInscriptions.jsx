import React from 'react';
import AdminRecordScreen, {
  StatusCell,
  VisibilityCell,
  VERIFICATION_STATUSES
} from '../../components/AdminRecordScreen.jsx';

/**
 * The inscription archive.
 *
 * A record is created to say "this inscription is reported to exist"; the
 * reading is added later, once the stone has actually been located,
 * photographed and transcribed. Transcription and translation are therefore
 * optional, and a record without them shows as outstanding work rather than
 * as documented text. Nothing here should ever be filled in from memory or
 * inference: an invented transcription would be indistinguishable from a real
 * one to whoever reads this archive next.
 *
 * Images are referenced by URL. The R2 signing library exists server-side but
 * no upload endpoint is wired yet, so a photograph is linked rather than
 * uploaded through this screen.
 */

const FIELDS = [
  {
    name: 'title',
    column: 'title',
    label: 'Title',
    required: true,
    placeholder: 'e.g. Reported inscription connected with the 1911 renovation'
  },
  {
    name: 'location',
    column: 'location',
    label: 'Where the stone is',
    placeholder: 'e.g. East wall of the mandapam, or "Not yet documented"'
  },
  {
    name: 'estimatedDate',
    column: 'estimated_date',
    label: 'Date',
    placeholder: 'e.g. Reported 1911, undated, illegible',
    hint: 'Free text on purpose: "undated" and "illegible" are honest answers a date field could not hold.'
  },
  {
    name: 'originalLanguage',
    column: 'original_language',
    label: 'Language of the inscription',
    placeholder: 'e.g. Telugu'
  },
  {
    name: 'transcription',
    column: 'transcription',
    label: 'Transcription',
    type: 'textarea',
    rows: 6,
    hint: 'Leave blank until the stone has actually been read. Never reconstruct or infer a reading.'
  },
  {
    name: 'translation',
    column: 'translation',
    label: 'Translation',
    type: 'textarea',
    rows: 6,
    hint: 'Only once a transcription exists.'
  },
  {
    name: 'historicalSignificance',
    column: 'historical_significance',
    label: 'Significance',
    type: 'textarea',
    rows: 4
  },
  {
    name: 'imageUrl',
    column: 'image_url',
    label: 'Photograph link',
    placeholder: 'https://… or /assets/…'
  },
  {
    name: 'documentUrl',
    column: 'document_url',
    label: 'Document link',
    placeholder: 'https://… or /assets/…'
  },
  { name: 'source', column: 'source', label: 'Source' },
  { name: 'sourceUrl', column: 'source_url', label: 'Source link', placeholder: 'https://…' },
  {
    name: 'verificationStatus',
    column: 'verification_status',
    label: 'Verification status',
    type: 'select',
    options: VERIFICATION_STATUSES,
    default: 'Needs Verification'
  },
  { name: 'displayOrder', column: 'display_order', label: 'Display order', default: '0' },
  {
    name: 'publicVisible',
    column: 'public_visible',
    label: 'Show on the public history page',
    type: 'checkbox'
  }
];

const COLUMNS = [
  {
    key: 'title',
    label: 'Inscription',
    render: (r) => (
      <div style={{ maxWidth: '40ch' }}>
        <strong>{r.title}</strong>
        {r.location ? (
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{r.location}</div>
        ) : null}
      </div>
    )
  },
  { key: 'estimated_date', label: 'Date', render: (r) => r.estimated_date || '—' },
  {
    key: 'transcription',
    label: 'Reading',
    render: (r) =>
      r.transcription ? (
        <span className="badge badge-success">Transcribed</span>
      ) : (
        <span style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
          Transcription not yet available.
        </span>
      )
  },
  { key: 'verification_status', label: 'Status', render: (r) => <StatusCell record={r} /> },
  {
    key: 'public_visible',
    label: 'Visibility',
    render: (r) => <VisibilityCell visible={r.public_visible} />
  }
];

export default function AdminInscriptions() {
  return (
    <AdminRecordScreen
      title="Inscription Archive"
      description="Inscriptions connected with the temple. A record may exist long before anyone has read the stone — add the photograph, transcription and translation once that work has actually been done."
      endpoint="/temple/inscriptions"
      addLabel="+ Add inscription record"
      fields={FIELDS}
      columns={COLUMNS}
      emptyTitle="No inscription records yet."
      emptyMessage="Record an inscription to track what is reported to exist and what still needs documenting."
      deletePrompt="Delete this inscription record? Any transcription recorded with it will be lost."
      extraRowActions={(record, { toggleFlag }) => [
        {
          label: record.public_visible ? 'Hide from public' : 'Show publicly',
          onClick: () => toggleFlag(record, 'publicVisible', 'public_visible')
        }
      ]}
    />
  );
}

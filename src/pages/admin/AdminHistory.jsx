import React from 'react';
import AdminRecordScreen, {
  StatusCell,
  VisibilityCell,
  SOURCE_TYPES,
  VERIFICATION_STATUSES
} from '../../components/AdminRecordScreen.jsx';

/**
 * Temple history entries.
 *
 * Each entry is one section of the public history page. The verification
 * status defaults to "Needs Verification" rather than to something reassuring,
 * because an entry that reaches the site unlabelled would read as established
 * fact.
 *
 * A year is optional throughout: most of this history has no documented date,
 * and leaving the field blank is the honest answer.
 */

const FIELDS = [
  {
    name: 'title',
    column: 'title',
    label: 'Title',
    required: true,
    placeholder: 'e.g. Reported 1911 Renovation'
  },
  {
    name: 'period',
    column: 'period',
    label: 'Period',
    placeholder: 'e.g. Eastern Chalukya period, or 1911',
    hint: 'A readable label for when this belongs. Use words when no year is known.'
  },
  {
    name: 'yearStart',
    column: 'year_start',
    label: 'Year (from)',
    hint: 'Leave blank if the year is not documented. Never estimate one.'
  },
  { name: 'yearEnd', column: 'year_end', label: 'Year (to)' },
  {
    name: 'description',
    column: 'description',
    label: 'Description',
    type: 'textarea',
    rows: 6,
    hint: 'Keep the wording no stronger than the evidence: report what a source says rather than asserting it.'
  },
  {
    name: 'teluguDescription',
    column: 'telugu_description',
    label: 'Description (Telugu)',
    type: 'textarea',
    rows: 6,
    lang: 'te',
    hint: 'Optional. Do not machine-translate a claim that is uncertain in English.'
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
  {
    name: 'sourceDate',
    column: 'source_date',
    label: 'Source date',
    placeholder: 'YYYY-MM-DD',
    hint: 'Leave blank unless the source itself is dated.'
  },
  { name: 'author', column: 'author', label: 'Author' },
  {
    name: 'verificationStatus',
    column: 'verification_status',
    label: 'Verification status',
    type: 'select',
    options: VERIFICATION_STATUSES,
    default: 'Needs Verification',
    hint: 'Choose "Verified" only when the claim has been checked against primary evidence.'
  },
  { name: 'displayOrder', column: 'display_order', label: 'Display order', default: '0' },
  { name: 'featured', column: 'featured', label: 'Featured on the About page', type: 'checkbox' },
  {
    name: 'published',
    column: 'published',
    label: 'Published on the public history page',
    type: 'checkbox'
  }
];

const COLUMNS = [
  {
    key: 'title',
    label: 'Entry',
    render: (r) => (
      <div>
        <strong>{r.title}</strong>
        {r.period ? (
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{r.period}</div>
        ) : null}
      </div>
    )
  },
  { key: 'verification_status', label: 'Evidence', render: (r) => <StatusCell record={r} /> },
  {
    key: 'published',
    label: 'Public',
    render: (r) => <VisibilityCell visible={r.published} hiddenLabel="Draft" />
  },
  { key: 'display_order', label: 'Order', render: (r) => r.display_order ?? 0 }
];

export default function AdminHistory() {
  return (
    <AdminRecordScreen
      title="Temple History"
      description="The sections of the public history page. Every entry carries the source it rests on and how far it can be trusted, and a reader sees that label beside the text."
      endpoint="/temple/history"
      addLabel="+ Add history entry"
      fields={FIELDS}
      columns={COLUMNS}
      emptyTitle="No historical entries yet."
      emptyMessage="Add the first entry to begin the temple's written history."
      deletePrompt="Delete this history entry? It will be removed from the public history page."
      extraRowActions={(record, { toggleFlag }) => [
        {
          label: record.published ? 'Unpublish' : 'Publish',
          onClick: () => toggleFlag(record, 'published', 'published')
        },
        {
          label: record.featured ? 'Unfeature' : 'Feature',
          onClick: () => toggleFlag(record, 'featured', 'featured')
        }
      ]}
    />
  );
}

import React from 'react';
import AdminRecordScreen, {
  StatusCell,
  VisibilityCell,
  SOURCE_TYPES,
  VERIFICATION_STATUSES
} from '../../components/AdminRecordScreen.jsx';

/**
 * The festival archive: one record per festival per year.
 *
 * This is a record of what happened, not what is coming up. Upcoming events
 * are managed separately under Events, and the two must not be conflated — an
 * archive entry describing the 2021 Jatara is not an announcement that it is
 * about to occur.
 *
 * Dates stay empty unless they are actually documented. A year whose programme
 * was never recorded reads as "dates not documented", which is true, rather
 * than borrowing last year's schedule.
 */

const CURRENT_YEAR = new Date().getFullYear();

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: '2021', label: '2021' },
  { key: '2022', label: '2022' },
  { key: '2023', label: '2023' },
  { key: '2024', label: '2024' },
  { key: '2025', label: '2025' },
  { key: 'future', label: 'Future years' }
];

function matchesFilter(record, filter) {
  if (filter === 'all') return true;
  if (filter === 'future') return Number(record.year) > CURRENT_YEAR;
  return String(record.year) === filter;
}

const FIELDS = [
  {
    name: 'name',
    column: 'name',
    label: 'Festival name',
    required: true,
    placeholder: 'e.g. Somalamma Ammavari Jatara Mahotsavam'
  },
  {
    name: 'nameTelugu',
    column: 'name_telugu',
    label: 'Festival name (Telugu)',
    lang: 'te',
    placeholder: 'సోమాలమ్మ తల్లి జాతర'
  },
  {
    name: 'year',
    column: 'year',
    label: 'Year',
    required: true,
    placeholder: 'e.g. 2021',
    hint: 'The year this festival took place. The archive is browsed by year.'
  },
  {
    name: 'slug',
    column: 'slug',
    label: 'URL slug',
    hint: 'Leave blank to generate one from the name.'
  },
  {
    name: 'description',
    column: 'description',
    label: 'Description',
    type: 'textarea',
    rows: 5,
    hint: 'Describe what is documented for this year, and say so when documentation is partial.'
  },
  {
    name: 'teluguDescription',
    column: 'telugu_description',
    label: 'Description (Telugu)',
    type: 'textarea',
    rows: 5,
    lang: 'te'
  },
  { name: 'festivalType', column: 'festival_type', label: 'Type', placeholder: 'e.g. Jatara' },
  {
    name: 'calendarReference',
    column: 'calendar_reference',
    label: 'Calendar reference',
    placeholder: 'e.g. Associated with the Ugadi period',
    hint: 'The festival follows the lunar calendar, so this is more durable than a fixed date.'
  },
  {
    name: 'startDate',
    column: 'start_date',
    label: 'Start date',
    placeholder: 'YYYY-MM-DD',
    hint: 'Only if the actual dates for this year are documented. Otherwise leave blank.'
  },
  { name: 'endDate', column: 'end_date', label: 'End date', placeholder: 'YYYY-MM-DD' },
  { name: 'rituals', column: 'rituals', label: 'Rituals', type: 'textarea', rows: 4 },
  {
    name: 'specialPoojas',
    column: 'special_poojas',
    label: 'Special poojas',
    type: 'textarea',
    rows: 3
  },
  { name: 'procession', column: 'procession', label: 'Procession', type: 'textarea', rows: 3 },
  {
    name: 'culturalPrograms',
    column: 'cultural_programs',
    label: 'Cultural programmes',
    type: 'textarea',
    rows: 3
  },
  {
    name: 'historicalNotes',
    column: 'historical_notes',
    label: 'Notes',
    type: 'textarea',
    rows: 3
  },
  {
    name: 'featuredImage',
    column: 'featured_image',
    label: 'Featured image link',
    placeholder: 'https://… or /assets/…',
    hint: 'Only media the temple holds the right to publish.'
  },
  { name: 'sourceTitle', column: 'source_title', label: 'Source title' },
  { name: 'sourceUrl', column: 'source_url', label: 'Source link', placeholder: 'https://…' },
  {
    name: 'sourceType',
    column: 'source_type',
    label: 'Source type',
    type: 'select',
    options: SOURCE_TYPES,
    default: 'Unverified'
  },
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
    name: 'isCurrent',
    column: 'is_current',
    label: 'This is the current or upcoming festival',
    type: 'checkbox',
    hint: 'Leave off for past years. An archive record is not an announcement.'
  },
  { name: 'published', column: 'published', label: 'Published in the public archive', type: 'checkbox' }
];

const COLUMNS = [
  { key: 'year', label: 'Year', render: (r) => r.year ?? '—' },
  {
    key: 'name',
    label: 'Festival',
    render: (r) => (
      <div style={{ maxWidth: '36ch' }}>
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
    key: 'start_date',
    label: 'Dates',
    render: (r) =>
      r.start_date ? (
        `${r.start_date}${r.end_date ? ` – ${r.end_date}` : ''}`
      ) : (
        <span style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
          Dates not documented
        </span>
      )
  },
  { key: 'verification_status', label: 'Evidence', render: (r) => <StatusCell record={r} /> },
  {
    key: 'published',
    label: 'Public',
    render: (r) => <VisibilityCell visible={r.published} hiddenLabel="Draft" />
  }
];

export default function AdminFestivals() {
  return (
    <AdminRecordScreen
      title="Festival Archive"
      description="A record of the Jatara and other festivals, year by year. This is the historical archive — upcoming celebrations are announced under Events."
      endpoint="/temple/festivals"
      addLabel="+ Add festival record"
      fields={FIELDS}
      columns={COLUMNS}
      filters={FILTERS}
      filterRecord={matchesFilter}
      emptyTitle="No festival archive entries yet."
      emptyMessage="Add a year to begin recording the festival's history."
      deletePrompt="Delete this festival record? The archive entry for that year will be lost."
      extraRowActions={(record, { toggleFlag }) => [
        {
          label: record.published ? 'Unpublish' : 'Publish',
          onClick: () => toggleFlag(record, 'published', 'published')
        }
      ]}
    />
  );
}

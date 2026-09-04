import React from 'react';
import AdminRecordScreen, { VisibilityCell } from '../../components/AdminRecordScreen.jsx';

/**
 * Temple events and festivals.
 *
 * Rebuilt on the shared admin scaffold: the previous version could only add
 * and delete, so an administrator who mistyped a date had to remove the
 * event and enter it again.
 *
 * A blank location stays blank. The schema used to fill in "Main Sanctum"
 * for anything left empty, which put a place into the temple's calendar
 * that nobody had chosen; migration 010 removed that default.
 */

const FIELDS = [
  { name: 'title', column: 'title', label: 'Event name', required: true },
  { name: 'titleTelugu', column: 'title_telugu', label: 'Event name (Telugu)', lang: 'te' },
  {
    name: 'eventDate',
    column: 'event_date',
    label: 'Date',
    required: true,
    placeholder: 'YYYY-MM-DD',
    hint: 'The day the event takes place.'
  },
  { name: 'startTime', column: 'start_time', label: 'Start time', placeholder: 'HH:MM' },
  { name: 'endTime', column: 'end_time', label: 'End time', placeholder: 'HH:MM' },
  {
    name: 'location',
    column: 'location',
    label: 'Location',
    hint: 'Leave blank if it has not been decided. Nothing is filled in for you.'
  },
  { name: 'description', column: 'description', label: 'Description', type: 'textarea', rows: 4 },
  {
    name: 'descriptionTelugu',
    column: 'description_telugu',
    label: 'Description (Telugu)',
    type: 'textarea',
    rows: 4,
    lang: 'te'
  },
  {
    name: 'imageUrl',
    column: 'image_url',
    label: 'Photograph',
    placeholder: '/assets/… or https://…',
    hint: 'Paste the address of a picture from the Media Library.'
  },
  { name: 'displayOrder', column: 'display_order', label: 'Display order', default: '0' },
  { name: 'featured', column: 'featured', label: 'Featured', type: 'checkbox' },
  { name: 'published', column: 'published', label: 'Published', type: 'checkbox' }
];

const COLUMNS = [
  {
    key: 'title',
    label: 'Event',
    render: (r) => (
      <div style={{ maxWidth: '32ch' }}>
        <strong>{r.title}</strong>
        {r.title_telugu ? (
          <div lang="te" style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {r.title_telugu}
          </div>
        ) : null}
      </div>
    )
  },
  {
    key: 'event_date',
    label: 'Date',
    render: (r) => {
      if (!r.event_date) return '—';
      const d = new Date(String(r.event_date).replace(' ', 'T'));
      return Number.isNaN(d.getTime())
        ? String(r.event_date)
        : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  },
  {
    key: 'location',
    label: 'Location',
    render: (r) =>
      r.location || (
        <span style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
          Not stated
        </span>
      )
  },
  {
    key: 'published',
    label: 'Public',
    render: (r) => <VisibilityCell visible={r.published} hiddenLabel="Draft" />
  }
];

export default function AdminEvents() {
  return (
    <AdminRecordScreen
      title="Events"
      description="Festivals, utsavams and special poojas. An event appears on the public calendar only once it is published."
      endpoint="/events"
      addLabel="+ Add event"
      fields={FIELDS}
      columns={COLUMNS}
      emptyTitle="No events yet."
      emptyMessage="Add an event so devotees can see what is coming."
      deletePrompt="Delete this event? It will be removed from the public calendar."
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

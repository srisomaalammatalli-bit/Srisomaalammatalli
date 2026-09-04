import React from 'react';
import AdminRecordScreen, { VisibilityCell } from '../../components/AdminRecordScreen.jsx';

/**
 * Temple notices.
 *
 * A notice appears on the site as soon as it is published, and disappears
 * again when its end time passes — so a festival announcement does not need
 * anybody to remember to take it down afterwards, and a closure notice can
 * be written in advance and left to appear on the day.
 *
 * Donation and pooja notices are stored as general notices: the database
 * constrains the type to a fixed list, and mapping to a value it accepts is
 * safer than storing one it would reject.
 */

const TYPES = ['ANNOUNCEMENT', 'URGENT', 'FESTIVAL', 'EVENT', 'CLOSURE', 'GENERAL'];

const TYPE_LABEL = {
  ANNOUNCEMENT: 'Announcement',
  URGENT: 'Urgent notice',
  FESTIVAL: 'Festival',
  EVENT: 'Event',
  CLOSURE: 'Closure',
  GENERAL: 'General notice'
};

const FIELDS = [
  {
    name: 'title',
    column: 'title',
    label: 'Title',
    required: true,
    placeholder: 'e.g. Temple closed for maintenance on Tuesday'
  },
  {
    name: 'titleTelugu',
    column: 'title_telugu',
    label: 'Title (Telugu)',
    lang: 'te'
  },
  {
    name: 'description',
    column: 'description',
    label: 'Message',
    type: 'textarea',
    rows: 4
  },
  {
    name: 'descriptionTelugu',
    column: 'description_telugu',
    label: 'Message (Telugu)',
    type: 'textarea',
    rows: 4,
    lang: 'te'
  },
  {
    name: 'type',
    column: 'type',
    label: 'Kind of notice',
    type: 'select',
    options: TYPES,
    default: 'ANNOUNCEMENT',
    hint: 'Donation and pooja notices are recorded as General notices.'
  },
  {
    name: 'priority',
    column: 'priority',
    label: 'Priority',
    default: '0',
    hint: 'Higher numbers appear first. An urgent closure might be 10.'
  },
  {
    name: 'startAt',
    column: 'start_at',
    label: 'Show from',
    placeholder: 'YYYY-MM-DD HH:MM:SS',
    hint: 'Leave blank to show as soon as it is published.'
  },
  {
    name: 'endAt',
    column: 'end_at',
    label: 'Stop showing after',
    placeholder: 'YYYY-MM-DD HH:MM:SS',
    hint: 'Leave blank to show until you unpublish it. A festival notice should usually have an end.'
  },
  { name: 'showOnTicker', column: 'show_on_ticker', label: 'Show in the header ticker', type: 'checkbox' },
  { name: 'showOnHomepage', column: 'show_on_homepage', label: 'Show on the homepage', type: 'checkbox' },
  { name: 'dismissible', column: 'dismissible', label: 'Devotees can dismiss it', type: 'checkbox' },
  { name: 'published', column: 'published', label: 'Published', type: 'checkbox' }
];

/** Whether a published notice is inside its window right now. */
function liveNow(record) {
  if (!record.published) return false;
  const now = Date.now();
  const parse = (v) => (v ? new Date(String(v).replace(' ', 'T')).getTime() : null);
  const from = parse(record.start_at);
  const until = parse(record.end_at);
  if (from && Number.isFinite(from) && from > now) return false;
  if (until && Number.isFinite(until) && until < now) return false;
  return true;
}

const COLUMNS = [
  {
    key: 'title',
    label: 'Notice',
    render: (r) => (
      <div style={{ maxWidth: '40ch' }}>
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
    key: 'type',
    label: 'Kind',
    render: (r) => <span className="badge badge-muted">{TYPE_LABEL[r.type] || r.type}</span>
  },
  {
    key: 'window',
    label: 'Showing',
    render: (r) => {
      if (!r.published) return <span className="badge badge-warning">Draft</span>;
      if (liveNow(r)) return <span className="badge badge-success">Live now</span>;
      const now = Date.now();
      const from = r.start_at ? new Date(String(r.start_at).replace(' ', 'T')).getTime() : null;
      if (from && from > now) return <span className="badge badge-gold">Scheduled</span>;
      return <span className="badge badge-muted">Expired</span>;
    }
  },
  {
    key: 'ticker',
    label: 'Ticker',
    render: (r) => <VisibilityCell visible={r.show_on_ticker} hiddenLabel="Not in ticker" />
  },
  { key: 'priority', label: 'Priority', render: (r) => r.priority ?? 0 }
];

export default function AdminAnnouncements() {
  return (
    <AdminRecordScreen
      title="Notices"
      description="Announcements, festival notices and closures. A published notice appears on the site straight away, and stops showing by itself once its end time passes."
      endpoint="/announcements"
      addLabel="+ Write a notice"
      fields={FIELDS}
      columns={COLUMNS}
      emptyTitle="No notices yet."
      emptyMessage="Write a notice to tell devotees about a festival, a closure or anything else."
      deletePrompt="Delete this notice? It will be removed from the site."
      extraRowActions={(record, { toggleFlag }) => [
        {
          label: record.published ? 'Unpublish' : 'Publish',
          onClick: () => toggleFlag(record, 'published', 'published')
        },
        {
          label: record.show_on_ticker ? 'Remove from ticker' : 'Add to ticker',
          onClick: () => toggleFlag(record, 'showOnTicker', 'show_on_ticker')
        }
      ]}
    />
  );
}

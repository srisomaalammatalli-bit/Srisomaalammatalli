import React from 'react';
import AdminRecordScreen, { VisibilityCell } from '../../components/AdminRecordScreen.jsx';

/**
 * Temple videos.
 *
 * An administrator supplies a title and a YouTube address; the server takes
 * the video id out of the address itself, in any of the forms YouTube hands
 * out — watch?v=, youtu.be, /shorts/ and /embed/. Nobody has to find an id
 * by hand, and an address that is not YouTube is refused rather than stored.
 *
 * Nothing is invented. An earlier version filled in a stock photograph from
 * a picture library, a "10:00" duration and "1.2K views" for every video
 * added; none of that described the temple's footage. A blank thumbnail now
 * falls back to the still YouTube generates from the video itself, and a
 * blank duration stays blank.
 */

const FIELDS = [
  { name: 'title', column: 'title', label: 'Title', required: true },
  { name: 'titleTelugu', column: 'title_telugu', label: 'Title (Telugu)', lang: 'te' },
  {
    name: 'youtubeUrl',
    column: 'youtube_url',
    label: 'YouTube address',
    required: true,
    placeholder: 'https://www.youtube.com/watch?v=… or https://youtu.be/…',
    hint: 'Paste the address from YouTube. Shorts and embed links work too — the video id is taken from it automatically.'
  },
  { name: 'description', column: 'description', label: 'Description', type: 'textarea', rows: 3 },
  {
    name: 'descriptionTelugu',
    column: 'description_telugu',
    label: 'Description (Telugu)',
    type: 'textarea',
    rows: 3,
    lang: 'te'
  },
  { name: 'category', column: 'category', label: 'Category', placeholder: 'e.g. Festivals' },
  {
    name: 'thumbnailUrl',
    column: 'thumbnail_url',
    label: 'Custom thumbnail (optional)',
    placeholder: '/assets/… or https://…',
    hint: 'Leave blank to use the still YouTube generates from the video itself.'
  },
  { name: 'displayOrder', column: 'display_order', label: 'Display order', default: '0' },
  { name: 'featured', column: 'featured', label: 'Featured', type: 'checkbox' },
  { name: 'published', column: 'published', label: 'Published', type: 'checkbox' }
];

const COLUMNS = [
  {
    key: 'title',
    label: 'Video',
    render: (r) => (
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        {r.youtube_video_id ? (
          <img
            src={`https://i.ytimg.com/vi/${r.youtube_video_id}/default.jpg`}
            alt=""
            style={{ width: '64px', height: '48px', objectFit: 'cover', borderRadius: '4px' }}
          />
        ) : null}
        <div style={{ maxWidth: '30ch' }}>
          <strong>{r.title}</strong>
          {r.title_telugu ? (
            <div lang="te" style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {r.title_telugu}
            </div>
          ) : null}
        </div>
      </div>
    )
  },
  {
    key: 'youtube_video_id',
    label: 'Source',
    render: (r) =>
      r.video_kind === 'UPLOAD' ? (
        <span className="badge badge-muted">Temple file</span>
      ) : r.youtube_video_id ? (
        <span className="badge badge-muted">YouTube</span>
      ) : (
        '—'
      )
  },
  {
    key: 'published',
    label: 'Public',
    render: (r) => <VisibilityCell visible={r.published} hiddenLabel="Draft" />
  },
  { key: 'display_order', label: 'Order', render: (r) => r.display_order ?? 0 }
];

export default function AdminVideos() {
  return (
    <AdminRecordScreen
      title="Videos"
      description="Videos shown on the public site. Paste a YouTube address and the video id is taken from it — there is no need to look anything up."
      endpoint="/videos"
      addLabel="+ Add video"
      fields={FIELDS}
      columns={COLUMNS}
      emptyTitle="No videos yet."
      emptyMessage="Paste a YouTube address to add the first video."
      deletePrompt="Delete this video? It will disappear from the public site. The video on YouTube is unaffected."
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

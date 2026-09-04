/**
 * /api/videos
 *
 * GET    public — published videos only
 * POST   admin  — add a video
 * PUT    admin  — update a video
 * DELETE admin  — remove a video
 *
 * Videos are referenced by URL (YouTube or a file under public/assets/).
 * Only http(s) URLs and site-relative paths are accepted, so a stored value
 * can never become a javascript: or data: URL in the browser.
 */

import { createResourceHandler } from '../_lib/crud.js';
import { query } from '../_lib/db.js';
import { sanitizeString } from '../_lib/validation.js';
import {
  COPYRIGHT_STATUSES,
  VERIFICATION_STATUSES,
  enumField,
  yearField,
  dateField
} from '../_lib/evidence.js';

const text = (max) => (v) => sanitizeString(v, max);
const bool = (v) => Boolean(v);
const int = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Reject any scheme that could execute script when rendered as a link.
 * Only http(s) URLs and site-relative paths survive; everything else
 * (javascript:, data:, vbscript:, …) becomes null.
 */
function safeUrl(v) {
  const raw = sanitizeString(v, 500);
  if (!raw) return null;
  if (raw.startsWith('/')) return raw;
  return /^https?:\/\//i.test(raw) ? raw : null;
}

/** Turn a rejected URL into a clear 400 rather than a database constraint error. */
function requireSafeUrl(label) {
  return (value, raw) =>
    value === null && raw
      ? `${label} must be an http(s) address or a path beginning with "/".`
      : null;
}


/**
 * Extract a YouTube video id from the URL forms an administrator is likely to
 * paste. Returns null for anything else, so a malformed or hostile URL is
 * rejected rather than embedded.
 *
 *   youtube.com/watch?v=ABC123     -> ABC123
 *   youtu.be/ABC123                -> ABC123
 *   youtube.com/shorts/ABC123      -> ABC123
 *   youtube.com/embed/ABC123       -> ABC123
 *
 * Only the id is trusted afterwards: the embed URL is rebuilt from it rather
 * than reusing whatever query parameters came in.
 */
export function extractYouTubeId(rawUrl) {
  const url = String(rawUrl || '').trim();
  if (!url) return null;

  // A bare id is acceptable too.
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (!/^https?:$/.test(parsed.protocol)) return null;

  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
  const path = parsed.pathname.replace(/^\/+/, '');

  let candidate = null;
  if (host === 'youtu.be') {
    candidate = path.split('/')[0];
  } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    if (path === 'watch') candidate = parsed.searchParams.get('v');
    else if (path.startsWith('shorts/')) candidate = path.slice('shorts/'.length).split('/')[0];
    else if (path.startsWith('embed/')) candidate = path.slice('embed/'.length).split('/')[0];
    else if (path.startsWith('live/')) candidate = path.slice('live/'.length).split('/')[0];
  }

  return candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
}

/** Canonical thumbnail for a video id. */
export function youtubeThumbnail(videoId) {
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
}

const handler = createResourceHandler({
  table: 'videos',
  idPrefix: 'vid',
  entityType: 'Video',
  publicSelect:
    'id, title, title_telugu, description, description_telugu, youtube_url, youtube_video_id, ' +
    'video_kind, thumbnail_url, category, duration, year, recorded_on, source, source_url, ' +
    'copyright_status, verification_status, featured, display_order, published, created_at',
  publicWhere: 'published = TRUE',
  orderBy: 'display_order ASC, created_at DESC',
  requiredOnCreate: ['title', 'youtubeUrl', 'category'],
  fields: {
    title: { column: 'title', transform: text(200) },
    titleTelugu: { column: 'title_telugu', transform: text(200) },
    description: { column: 'description', transform: text(1000) },
    youtubeUrl: { column: 'youtube_url', transform: safeUrl, validate: requireSafeUrl('Video URL') },
    // Derived server-side from youtubeUrl; a caller cannot set it directly to
    // an arbitrary value, and an unrecognised URL is refused. Declaring the
    // source means the extraction — and its validation — still runs when the
    // administrator submits only a URL, which is always.
    youtubeVideoId: {
      column: 'youtube_video_id',
      derivedFrom: 'youtubeUrl',
      transform: (rawUrl) => extractYouTubeId(rawUrl),
      // An uploaded video legitimately has no YouTube id; a YouTube entry
      // whose URL cannot be parsed is refused rather than stored unplayable.
      validate: (value, _raw, body) =>
        value || body?.videoKind === 'UPLOAD'
          ? null
          : 'Enter a valid YouTube URL, for example https://www.youtube.com/watch?v=XXXXXXXXXXX'
    },
    videoKind: { column: 'video_kind', transform: (v) => (v === 'UPLOAD' ? 'UPLOAD' : 'YOUTUBE') },
    descriptionTelugu: { column: 'description_telugu', transform: text(2000) },
    thumbnailUrl: { column: 'thumbnail_url', transform: safeUrl, validate: requireSafeUrl('Thumbnail URL') },
    category: { column: 'category', transform: text(64) },
    duration: { column: 'duration', transform: text(32) },
    // Provenance. Most of this footage was recorded by devotees and news
    // outlets rather than by the temple, so who holds the rights has to be
    // recordable — and visible, so the site never implies the temple owns a
    // video it merely embeds.
    year: yearField('year'),
    recordedOn: dateField('recorded_on'),
    source: { column: 'source', transform: text(300) },
    sourceUrl: { column: 'source_url', transform: text(1000) },
    copyrightStatus: enumField('copyright_status', COPYRIGHT_STATUSES, 'NOT_STATED'),
    verificationStatus: enumField('verification_status', VERIFICATION_STATUSES, 'Needs Verification'),
    featured: { column: 'featured', transform: bool },
    displayOrder: { column: 'display_order', transform: int },
    published: { column: 'published', transform: bool }
  }
});

/**
 * Published video files from the media library.
 *
 * The `videos` table describes an embedded YouTube video: youtube_url is
 * required, and a video id is extracted from it. The temple also has its own
 * MP4 footage sitting in the repository, which has no YouTube URL and never
 * should have one invented for it — so those play from the site itself and
 * are surfaced here instead.
 *
 * video_kind = 'UPLOAD' is what tells the page to render a <video> element
 * rather than a YouTube embed.
 */
async function publishedVideoFiles() {
  const result = await query(
    `SELECT m.id, m.title, m.title_telugu, m.description, m.public_url, m.category,
            m.alt_text, m.duration_seconds, m.display_order, m.featured, m.created_at,
            m.original_filename
       FROM media_assets m
       LEFT JOIN videos v ON v.media_id = m.id
      WHERE m.published = TRUE
        AND m.active = TRUE
        AND m.media_type = 'VIDEO'
        AND v.id IS NULL
      ORDER BY m.display_order ASC, m.created_at DESC`
  );

  return result.rows.map((m) => ({
    id: m.id,
    title: m.title || m.original_filename || '',
    title_telugu: m.title_telugu || null,
    description: m.description || null,
    // A local file: the page plays it directly. No YouTube id is invented.
    youtube_url: m.public_url,
    youtube_video_id: null,
    video_kind: 'UPLOAD',
    thumbnail_url: null,
    category: m.category || null,
    duration: null,
    display_order: m.display_order ?? 0,
    featured: Boolean(m.featured),
    published: true,
    created_at: m.created_at,
    year: null,
    source: null,
    copyright_status: null,
    verification_status: null,
    from_media_library: true
  }));
}

export default async function videosHandler(req, res) {
  if (req.method !== 'GET') return handler(req, res);

  const captured = {};
  const proxy = {
    ...res,
    setHeader: (...args) => res.setHeader(...args),
    status(code) {
      captured.status = code;
      return proxy;
    },
    json(payload) {
      captured.payload = payload;
      return proxy;
    }
  };

  await handler(req, proxy);

  const payload = captured.payload;
  if (!payload?.success || !payload?.data) {
    res.status(captured.status || 200).json(payload ?? { success: false });
    return;
  }

  try {
    const extra = await publishedVideoFiles();
    const items = [...(payload.data.items || []), ...extra];
    res.status(captured.status || 200).json({
      ...payload,
      data: { ...payload.data, items, count: items.length }
    });
  } catch (err) {
    console.error('[Videos media merge]', err.message);
    res.status(captured.status || 200).json(payload);
  }
}

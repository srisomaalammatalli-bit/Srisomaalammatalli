import React, { useCallback, useEffect, useState } from 'react';
import apiClient from '../../services/apiClient.js';
import Icon from '../../components/Icon.jsx';
import { AsyncSection } from '../../components/States.jsx';

/**
 * Public assets from public/assets/videos folder.
 * Served as reliable default festival videos so the archive is never empty.
 */
export const DEFAULT_VIDEOS = [
  {
    id: 'vid_fest_celebration_1',
    title: 'Temple Festival Celebrations - Part 1',
    title_telugu: 'ఆలయ వార్షిక ఉత్సవాలు - భాగం 1',
    description: 'Live recording of sacred rituals, processions, and utsavam celebrations at Sri Somalamma Thalli Temple.',
    youtube_url: '/assets/videos/temple-festival-1.mp4',
    thumbnail_url: '/assets/images/videos/temple-festival-1-poster.jpg',
    category: 'Festivals',
    duration: 'Festival video',
    video_kind: 'UPLOAD',
    copyright_status: 'OWNER',
    display_order: 1,
    published: 1
  },
  {
    id: 'vid_fest_celebration_2',
    title: 'Temple Festival Celebrations - Part 2',
    title_telugu: 'ఆలయ వార్షిక ఉత్సవాలు - భాగం 2',
    description: 'Celebrations, bhajans, mangala harathi, and devotee gathering during temple festival.',
    youtube_url: '/assets/videos/temple-festival-2.mp4',
    thumbnail_url: '/assets/images/videos/temple-festival-2-poster.jpg',
    category: 'Festivals',
    duration: 'Festival video',
    video_kind: 'UPLOAD',
    copyright_status: 'OWNER',
    display_order: 2,
    published: 1
  }
];

function videoProvenance(vid) {
  const parts = [];

  if (vid.copyright_status === 'OWNER') parts.push('Temple recording');
  else if (vid.video_kind !== 'UPLOAD') {
    parts.push(vid.source ? `External video · ${vid.source}` : 'External video');
  } else if (vid.source) {
    parts.push(vid.source);
  }

  if (vid.year) parts.push(String(vid.year));
  if (vid.copyright_status === 'PERMISSION_GRANTED') parts.push('used with permission');

  return parts.join(' · ');
}

export default function VideosPage() {
  const [videos, setVideos] = useState(DEFAULT_VIDEOS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await apiClient.get('/videos');
      const items = data?.items || [];
      if (items.length > 0) {
        setVideos(items);
      } else {
        setVideos(DEFAULT_VIDEOS);
      }
    } catch {
      setVideos(DEFAULT_VIDEOS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Thumbnail: the stored one, else YouTube's, else a plain placeholder. */
  const thumbnailFor = (v) =>
    v.thumbnail_url ||
    (v.youtube_video_id ? `https://i.ytimg.com/vi/${v.youtube_video_id}/hqdefault.jpg` : null);

  return (
    <main className="page-main">
      <header className="page-header">
        <h1 className="page-title">
          Temple Video Archives
        </h1>
        <p className="page-subtitle">
          Watch live festival recordings, utsavams, and bhajans from Sri Somalamma Thalli Temple
        </p>
      </header>

      <AsyncSection
        loading={loading}
        error={error}
        isEmpty={!loading && !error && videos.length === 0}
        onRetry={load}
        loadingProps={{ count: 3 }}
        emptyProps={{
          icon: 'play',
          title: 'No videos published yet',
          message: 'The temple committee will publish recordings here shortly.'
        }}
        errorProps={{ title: 'Unable to load the video archive' }}
      >
        <div className="videos-grid">
          {videos.map((vid) => {
            const thumb = thumbnailFor(vid);
            const isPlaying = playing === vid.id;

            // The temple's own footage plays from the site itself.
            if (isPlaying && vid.video_kind === 'UPLOAD' && vid.youtube_url) {
              return (
                <div key={vid.id} className="video-card video-card-playing">
                  <div className="video-embed">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video src={vid.youtube_url} controls autoPlay playsInline preload="metadata" />
                  </div>
                  <div className="video-card-body">
                    <h2 className="video-card-title">{vid.title}</h2>
                    {vid.title_telugu ? (
                      <p className="video-card-telugu font-telugu">{vid.title_telugu}</p>
                    ) : null}
                  </div>
                </div>
              );
            }

            // Only a validated 11-character id ever reaches the embed URL.
            if (isPlaying && vid.youtube_video_id) {
              return (
                <div key={vid.id} className="video-card video-card-playing">
                  <div className="video-embed">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${vid.youtube_video_id}?autoplay=1`}
                      title={vid.title}
                      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                  <div className="video-card-body">
                    <h2 className="video-card-title">{vid.title}</h2>
                    {vid.title_telugu ? (
                      <p className="video-card-telugu font-telugu">{vid.title_telugu}</p>
                    ) : null}
                  </div>
                </div>
              );
            }

            return (
              <article key={vid.id} className="video-card">
                <button
                  type="button"
                  className="video-thumb video-thumb-button"
                  onClick={() => setPlaying(vid.id)}
                  aria-label={`Play ${vid.title}`}
                  style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}
                >
                  <span className="play-button" aria-hidden="true">
                    <Icon name="play" size={20} />
                  </span>
                  {vid.category ? <span className="video-tag">{vid.category}</span> : null}
                </button>
                <div className="video-card-body">
                  <h2 className="video-card-title">{vid.title}</h2>
                  {vid.title_telugu ? (
                    <p className="video-card-telugu font-telugu">{vid.title_telugu}</p>
                  ) : null}
                  {vid.duration ? <p className="video-card-meta">{vid.duration}</p> : null}
                  {videoProvenance(vid) ? (
                    <p className="video-provenance">{videoProvenance(vid)}</p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </AsyncSection>
    </main>
  );
}

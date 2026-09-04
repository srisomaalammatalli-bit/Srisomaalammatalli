import React, { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '../../services/apiClient.js';
import CardMedia from '../../components/CardMedia.jsx';
import Icon from '../../components/Icon.jsx';
import { AsyncSection } from '../../components/States.jsx';

/**
 * Public assets from public/assets/ folder.
 * Served as reliable default devotional content so the gallery is never empty.
 */
export const DEFAULT_GALLERY_ITEMS = [
  {
    id: 'gal_deity_alankaram',
    title: 'Somalamma Talli Divya Alankaram',
    title_telugu: 'శ్రీ సోమాలమ్మ తల్లి దివ్య అలంకారం',
    description: 'Divya Alankaram of Sri Somalamma Thalli Amma Varu adorned with sacred garlands and haridra kumkuma.',
    image_url: '/assets/images/deity/somalamma-talli-alankaram.jpg',
    category: 'Amma Vari',
    alt_text: 'Sri Somalamma Thalli Amma Varu Alankaram with garlands and turmeric',
    aspect_height: 420,
    media_type: 'IMAGE',
    copyright_status: 'OWNER',
    display_order: 1,
    published: 1
  },
  {
    id: 'gal_deity_closeup',
    title: 'Somalamma Talli Mukha Darshanam',
    title_telugu: 'శ్రీ సోమాలమ్మ తల్లి ముఖ దర్శనం',
    description: 'Sacred close-up darshanam of Sri Somalamma Thalli radiating divine grace and tranquility.',
    image_url: '/assets/images/deity/somalamma-talli-closeup.jpg',
    category: 'Amma Vari',
    alt_text: 'Close up sanctum darshanam of Sri Somalamma Thalli deity',
    aspect_height: 450,
    media_type: 'IMAGE',
    copyright_status: 'OWNER',
    display_order: 2,
    published: 1
  },
  {
    id: 'gal_deity_sanctum',
    title: 'Garbhalaya Sanctum Darshanam',
    title_telugu: 'గర్భాలయ దర్శనం',
    description: 'Darshanam inside the sacred sanctum sanctorum of Sri Somalamma Thalli Temple.',
    image_url: '/assets/images/deity/somalamma-talli-sanctum.jpg',
    category: 'Temple',
    alt_text: 'Garbhalaya sanctum of Sri Somalamma Thalli Temple',
    aspect_height: 400,
    media_type: 'IMAGE',
    copyright_status: 'OWNER',
    display_order: 3,
    published: 1
  },
  {
    id: 'gal_fest_bonalu',
    title: 'Bonalu Utsavam Procession',
    title_telugu: 'బోనాలు ఉత్సవ ఊరేగింపు',
    description: 'Devotees carrying sacred decorated offerings during the joyful Bonalu festival procession.',
    image_url: '/assets/images/festivals/bonalu-procession.jpg',
    category: 'Festivals',
    alt_text: 'Women devotees carrying decorated Bonalu pots during the temple festival procession',
    aspect_height: 320,
    media_type: 'IMAGE',
    copyright_status: 'OWNER',
    display_order: 4,
    published: 1
  },
  {
    id: 'gal_temple_night',
    title: 'Temple Night Illumination',
    title_telugu: 'రాత్రి వేళ ఆలయ విద్యుద్దీపాలంకరణ',
    description: 'Illuminated temple gopuram and peaceful premises during annual festival nights.',
    image_url: '/assets/images/temple/temple-night-illumination.jpg',
    category: 'Temple',
    alt_text: 'Sri Somalamma Thalli Temple decorated with colourful decorative illumination at night',
    aspect_height: 300,
    media_type: 'IMAGE',
    copyright_status: 'OWNER',
    display_order: 5,
    published: 1
  },
  {
    id: 'gal_vid_fest1',
    title: 'Temple Festival Celebrations - Part 1',
    title_telugu: 'ఆలయ వార్షిక ఉత్సవాలు - భాగం 1',
    description: 'Sacred rituals, processions, and devotion during the annual temple celebrations.',
    image_url: '/assets/images/videos/temple-festival-1-poster.jpg',
    video_url: '/assets/videos/temple-festival-1.mp4',
    category: 'Videos',
    alt_text: 'Sri Somalamma Thalli annual festival video celebration part 1',
    aspect_height: 340,
    media_type: 'VIDEO',
    copyright_status: 'OWNER',
    display_order: 6,
    published: 1
  },
  {
    id: 'gal_vid_fest2',
    title: 'Temple Festival Celebrations - Part 2',
    title_telugu: 'ఆలయ వార్షిక ఉత్సవాలు - భాగం 2',
    description: 'Devotional music, traditional drum beats, and community gathering during the utsavam.',
    image_url: '/assets/images/videos/temple-festival-2-poster.jpg',
    video_url: '/assets/videos/temple-festival-2.mp4',
    category: 'Videos',
    alt_text: 'Sri Somalamma Thalli annual festival video celebration part 2',
    aspect_height: 340,
    media_type: 'VIDEO',
    copyright_status: 'OWNER',
    display_order: 7,
    published: 1
  }
];

function provenanceLabel(item) {
  if (item.verification_status === 'Oral Tradition' || item.source_type === 'Community Source') {
    return 'Community archive';
  }
  if (item.source || item.year) return 'Historical source';
  return null;
}

function provenanceDetail(item) {
  const parts = [];
  if (item.year) parts.push(String(item.year));
  if (item.source) parts.push(item.source);
  if (item.copyright_status && item.copyright_status !== 'NOT_STATED') {
    parts.push(
      item.copyright_status === 'OWNER'
        ? 'Temple collection'
        : item.copyright_status === 'PERMISSION_GRANTED'
          ? 'Used with permission'
          : item.copyright_status === 'PUBLIC_DOMAIN'
            ? 'Public domain'
            : 'Rights unknown'
    );
  }
  return parts.join(' · ');
}

export default function GalleryPage() {
  const [activeCat, setActiveCat] = useState('All');
  const [photos, setPhotos] = useState(DEFAULT_GALLERY_ITEMS);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [itemsData, categoryData] = await Promise.all([
        apiClient.get('/gallery'),
        apiClient.get('/gallery-categories').catch(() => ({ items: [] }))
      ]);
      const fetchedItems = itemsData?.items || [];
      if (fetchedItems.length > 0) {
        setPhotos(fetchedItems);
      } else {
        setPhotos(DEFAULT_GALLERY_ITEMS);
      }
      setCategories(categoryData?.items || []);
    } catch {
      // Graceful fallback to default public assets
      setPhotos(DEFAULT_GALLERY_ITEMS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Handle ESC key to close lightbox modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedMedia(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Offer categories that have items
  const categoryNames = useMemo(() => {
    const used = new Set(photos.map((p) => p.category).filter(Boolean));
    const named = categories.filter((c) => used.has(c.name) || used.has(c.slug)).map((c) => c.name);
    const extras = [...used].filter((c) => !named.includes(c));
    return ['All', ...named, ...extras];
  }, [photos, categories]);

  const filtered =
    activeCat === 'All' ? photos : photos.filter((p) => p.category === activeCat);

  const isVideoItem = (item) =>
    item.media_type === 'VIDEO' ||
    item.category === 'Videos' ||
    Boolean(item.video_url) ||
    (item.id && item.id.includes('vid'));

  const getVideoSrc = (item) => {
    if (item.video_url) return item.video_url;
    if (item.id === 'gal_vid_fest1') return '/assets/videos/temple-festival-1.mp4';
    if (item.id === 'gal_vid_fest2') return '/assets/videos/temple-festival-2.mp4';
    return null;
  };

  return (
    <main className="page-main">
      <header className="page-header page-header-tight">
        <p className="page-eyebrow">Photographs & Videos</p>
        <h1 className="page-title">Devotional Gallery</h1>
        <p className="page-subtitle">
          Sacred memories, divine celebrations, and festival archives of Sri Somalamma Thalli
        </p>
      </header>

      {/* Category Pills */}
      <div className="pill-row" role="group" aria-label="Filter gallery by category">
        {categoryNames.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setActiveCat(c)}
            className={`pill ${activeCat === c ? 'active' : ''}`}
            aria-pressed={activeCat === c}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Masonry Grid */}
      <AsyncSection
        loading={loading}
        error={error}
        isEmpty={!loading && !error && filtered.length === 0}
        onRetry={load}
        loadingProps={{ count: 6 }}
        emptyProps={{
          icon: 'image',
          title: 'No items in this category',
          message: 'Choose another category to view more sacred photographs and videos.'
        }}
        errorProps={{ title: 'Unable to load the gallery' }}
      >
        <div className="gallery-masonry">
          {filtered.map((item) => {
            const height = Number(item.aspect_height) || 300;
            const isVideo = isVideoItem(item);
            const caption = item.title_telugu
              ? `${item.title} · ${item.title_telugu}`
              : item.title;

            return (
              <figure
                key={item.id}
                className={`gallery-item ${isVideo ? 'gallery-item-video' : ''}`}
                onClick={() => setSelectedMedia(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedMedia(item);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`View ${item.title}`}
                style={{ cursor: 'pointer' }}
              >
                {item.image_url ? (
                  <div className="gallery-media-wrapper" style={{ position: 'relative' }}>
                    <CardMedia
                      className="gallery-media"
                      src={item.image_url}
                      alt={item.alt_text || item.title || 'Temple photograph'}
                      style={{ height: `${height}px` }}
                    />
                    {isVideo && (
                      <div className="gallery-video-play-overlay">
                        <span className="gallery-play-btn" aria-hidden="true">
                          <Icon name="play" size={24} />
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="gallery-placeholder" style={{ height: `${height}px` }}>
                    <figcaption className="gallery-placeholder-title">{item.title}</figcaption>
                  </div>
                )}

                {item.category ? <span className="gallery-tag">{item.category}</span> : null}

                {provenanceLabel(item) ? (
                  <span className="gallery-provenance">{provenanceLabel(item)}</span>
                ) : null}

                <div className="gallery-item-meta">
                  <figcaption className="gallery-item-title font-telugu">
                    {item.title_telugu || item.title}
                  </figcaption>
                  {item.title_telugu && (
                    <figcaption className="gallery-item-subtitle">
                      {item.title}
                    </figcaption>
                  )}
                  {provenanceDetail(item) ? (
                    <figcaption className="gallery-provenance-detail">
                      {provenanceDetail(item)}
                    </figcaption>
                  ) : null}
                </div>
              </figure>
            );
          })}
        </div>
      </AsyncSection>

      {/* Lightbox / Video Player Modal */}
      {selectedMedia && (
        <div
          className="gallery-lightbox-backdrop"
          onClick={() => setSelectedMedia(null)}
          role="dialog"
          aria-modal="true"
          aria-label={selectedMedia.title}
        >
          <div
            className="gallery-lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="gallery-lightbox-close"
              onClick={() => setSelectedMedia(null)}
              aria-label="Close viewer"
            >
              ✕
            </button>

            {isVideoItem(selectedMedia) ? (
              <div className="gallery-lightbox-video">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  src={getVideoSrc(selectedMedia)}
                  poster={selectedMedia.image_url}
                  controls
                  autoPlay
                  playsInline
                  className="gallery-player-video"
                />
              </div>
            ) : (
              <div className="gallery-lightbox-image">
                <img
                  src={selectedMedia.image_url}
                  alt={selectedMedia.alt_text || selectedMedia.title}
                  className="gallery-player-img"
                />
              </div>
            )}

            <div className="gallery-lightbox-caption">
              <h2 className="gallery-lightbox-title">
                {selectedMedia.title}
                {selectedMedia.title_telugu ? (
                  <span className="gallery-lightbox-telugu font-telugu">
                    {' '}({selectedMedia.title_telugu})
                  </span>
                ) : null}
              </h2>
              {selectedMedia.description && (
                <p className="gallery-lightbox-desc">{selectedMedia.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

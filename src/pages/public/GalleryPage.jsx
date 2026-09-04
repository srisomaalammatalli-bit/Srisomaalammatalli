import React, { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '../../services/apiClient.js';
import CardMedia from '../../components/CardMedia.jsx';
import { AsyncSection } from '../../components/States.jsx';

/**
 * Devotional gallery.
 *
 * Photographs and their categories come from the database, so the committee
 * adds, reorders, publishes and withdraws images from the admin dashboard
 * without a developer or a deployment. Nothing on this page is hard-coded:
 * when the gallery is empty it says so rather than showing invented entries.
 */
/**
 * A short marker for a photograph that came from somewhere other than the
 * temple's own camera. Returns null for ordinary pictures, so the badge means
 * something when it does appear, and nothing is invented for a photograph
 * whose provenance was never recorded.
 */
function provenanceLabel(item) {
  if (item.verification_status === 'Oral Tradition' || item.source_type === 'Community Source') {
    return 'Community archive';
  }
  if (item.source || item.year) return 'Historical source';
  return null;
}

/** The provenance actually recorded, for the caption beneath the image. */
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
  const [photos, setPhotos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      // Categories are optional: a missing list simply means no filters.
      const [itemsData, categoryData] = await Promise.all([
        apiClient.get('/gallery'),
        apiClient.get('/gallery-categories').catch(() => ({ items: [] }))
      ]);
      setPhotos(itemsData?.items || []);
      setCategories(categoryData?.items || []);
    } catch {
      setError(true);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Offer only categories that actually have published photographs.
  const categoryNames = useMemo(() => {
    const used = new Set(photos.map((p) => p.category).filter(Boolean));
    const named = categories.filter((c) => used.has(c.name) || used.has(c.slug)).map((c) => c.name);
    const extras = [...used].filter((c) => !named.includes(c));
    return ['All', ...named, ...extras];
  }, [photos, categories]);

  const filtered =
    activeCat === 'All' ? photos : photos.filter((p) => p.category === activeCat);

  return (
    <main className="page-main">
      <header className="page-header page-header-tight">
        <p className="page-eyebrow">Photographs</p>
        <h1 className="page-title">Devotional Gallery</h1>
        <p className="page-subtitle">
          Sacred memories and divine celebrations through the generations
        </p>
      </header>

      {/* Category Pills */}
      <div className="pill-row" role="group" aria-label="Filter photographs by category">
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
          title: photos.length === 0 ? 'No photographs published yet' : 'No photographs in this category',
          message:
            photos.length === 0
              ? 'The temple committee will publish photographs here shortly.'
              : 'Choose another category to see more photographs.'
        }}
        errorProps={{ title: 'Unable to load the gallery' }}
      >
        <div className="gallery-masonry">
          {filtered.map((item) => {
            // aspect_height drives the masonry rhythm; it is the one value
            // that must stay inline.
            const height = Number(item.aspect_height) || 300;
            const caption = item.title_telugu
              ? `${item.title} · ${item.title_telugu}`
              : item.title;

            return (
              <figure key={item.id} className="gallery-item">
                {item.image_url ? (
                  <CardMedia
                    className="gallery-media"
                    src={item.image_url}
                    alt={item.alt_text || item.title || 'Temple photograph'}
                    style={{ height: `${height}px` }}
                  />
                ) : (
                  <div className="gallery-placeholder" style={{ height: `${height}px` }}>
                    <figcaption className="gallery-placeholder-title">{item.title}</figcaption>
                  </div>
                )}
                {item.category ? <span className="gallery-tag">{item.category}</span> : null}
                {/* Provenance appears only on photographs that have any. An
                    ordinary picture taken by the temple carries no badge, so
                    the marker means something when it does appear. */}
                {provenanceLabel(item) ? (
                  <span className="gallery-provenance">{provenanceLabel(item)}</span>
                ) : null}
                {provenanceDetail(item) ? (
                  <figcaption className="gallery-provenance-detail">
                    {provenanceDetail(item)}
                  </figcaption>
                ) : null}
                {caption ? <figcaption className="sr-only">{caption}</figcaption> : null}
              </figure>
            );
          })}
        </div>
      </AsyncSection>
    </main>
  );
}

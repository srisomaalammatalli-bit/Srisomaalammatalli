import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../../services/apiClient.js';
import SeoHead from '../../components/SeoHead.jsx';
import Breadcrumb from '../../components/Breadcrumb.jsx';
import AiAnswerBlock from '../../components/AiAnswerBlock.jsx';
import { formatDate, TEMPLE } from '../../config/temple.js';

export default function FestivalDetailPage() {
  const { slug } = useParams();
  const [festival, setFestival] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    apiClient
      .get(`/temple/festivals?slug=${encodeURIComponent(slug)}`)
      .then((data) => {
        if (!active) return;
        if (data?.item) {
          setFestival(data.item);
        } else {
          setError(true);
        }
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <main className="page-main page-main-narrow">
        <div className="card-surface p-6 text-center" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="skeleton-line" style={{ height: '32px', width: '60%', margin: '0 auto 1rem' }}></div>
          <div className="skeleton-line" style={{ height: '20px', width: '80%', margin: '0 auto' }}></div>
        </div>
      </main>
    );
  }

  if (error || !festival) {
    return (
      <main className="page-main page-main-narrow">
        <SeoHead
          title="Festival Not Found"
          description="The requested temple festival could not be found."
          canonicalPath={`/festivals/${slug}`}
          noindex={true}
        />
        <div className="card-surface text-center" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <h1 className="page-title page-title-sm">Festival Not Found</h1>
          <p className="page-subtitle" style={{ margin: '1rem 0 2rem' }}>
            The festival you are looking for is either not published or has been updated.
          </p>
          <Link to="/festivals" className="btn btn-saffron">
            ← View all Temple Festivals
          </Link>
        </div>
      </main>
    );
  }

  const canonicalUrlPath = `/festivals/${festival.slug || slug}`;
  const pageTitle = festival.seo_title || `${festival.name} | ${TEMPLE.name}`;
  const pageDesc = festival.seo_description || festival.description ||
    `Official information about ${festival.name} at ${TEMPLE.name}, Mungandapalem, East Godavari District.`;

  const breadcrumbs = [
    { name: 'Home', to: '/' },
    { name: 'Festivals', to: '/festivals' },
    { name: festival.name, to: canonicalUrlPath }
  ];

  const facts = [
    { label: 'Temple', value: TEMPLE.name },
    { label: 'Festival Name', value: festival.name },
    ...(festival.name_telugu ? [{ label: 'Telugu Name', value: festival.name_telugu }] : []),
    ...(festival.calendar_reference ? [{ label: 'Calendar Reference', value: festival.calendar_reference }] : []),
    ...(festival.start_date ? [{ label: 'Start Date', value: formatDate(festival.start_date) }] : []),
    ...(festival.end_date ? [{ label: 'End Date', value: formatDate(festival.end_date) }] : []),
    { label: 'Location', value: 'Mungandapalem, East Godavari District, Andhra Pradesh' },
    ...(festival.verification_status ? [{ label: 'Verification Status', value: festival.verification_status }] : [])
  ];

  const relatedLinks = [
    { label: 'All Temple Festivals', to: '/festivals' },
    { label: 'Upcoming Events', to: '/events' },
    { label: 'Temple History & Traditions', to: '/history' },
    { label: 'Location & Directions', to: '/contact' }
  ];

  const schemaFestival = {
    '@type': 'Festival',
    '@id': `${TEMPLE.canonicalDomain}${canonicalUrlPath}#festival`,
    name: festival.name,
    alternateName: festival.name_telugu || undefined,
    description: festival.description || pageDesc,
    startDate: festival.start_date || undefined,
    endDate: festival.end_date || undefined,
    location: { '@id': TEMPLE.entityId }
  };

  return (
    <>
      <SeoHead
        title={pageTitle}
        description={pageDesc}
        canonicalPath={canonicalUrlPath}
        imageUrl={festival.featured_image}
        type="article"
        breadcrumbs={breadcrumbs}
        schemaGraph={schemaFestival}
      />

      <Breadcrumb items={breadcrumbs} />

      <main className="page-main page-main-narrow">
        <header className="page-header page-header-compact">
          <p className="page-eyebrow">Sacred Temple Festival</p>
          <h1 className="page-title">{festival.name}</h1>
          {festival.name_telugu && (
            <p className="donate-telugu font-telugu" style={{ fontSize: '1.25rem', marginTop: '0.25rem' }}>
              {festival.name_telugu}
            </p>
          )}
          {festival.start_date && (
            <p className="page-subtitle" style={{ marginTop: '0.5rem', fontWeight: 500 }}>
              📅 {formatDate(festival.start_date)}
              {festival.end_date && festival.end_date !== festival.start_date ? ` to ${formatDate(festival.end_date)}` : ''}
            </p>
          )}
        </header>

        {/* AI & Human Direct Answer Overview */}
        <AiAnswerBlock
          question={`What are the traditions and schedule of ${festival.name} at ${TEMPLE.name}?`}
          answer={`${festival.name} is a sacred festival celebrated in honor of Sri Somalamma Thalli at ${TEMPLE.name} in Mungandapalem, East Godavari District. Devotees from surrounding villages gather to participate in holy rituals, special sevas, and cultural celebrations. ${festival.start_date ? `The festival begins on ${formatDate(festival.start_date)}.` : ''}`}
          facts={facts}
          relatedLinks={relatedLinks}
          className="mb-8"
        />

        {/* Detailed Festival Description */}
        <section className="card-surface" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 600, marginBottom: '1rem' }}>About this Festival</h2>
          {festival.description ? (
            <p style={{ lineHeight: '1.7', color: 'var(--color-text-muted, #4b5563)', whiteSpace: 'pre-line' }}>
              {festival.description}
            </p>
          ) : (
            <p style={{ color: 'var(--color-text-muted, #6b7280)', fontStyle: 'italic' }}>
              Details will be published as official festival schedules are finalized.
            </p>
          )}

          {festival.rituals && (
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--color-border, #e5e7eb)', paddingTop: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Rituals &amp; Observances
              </h3>
              <p style={{ lineHeight: '1.6', color: 'var(--color-text-muted, #4b5563)', whiteSpace: 'pre-line' }}>
                {festival.rituals}
              </p>
            </div>
          )}

          {festival.procession && (
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--color-border, #e5e7eb)', paddingTop: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Procession (Uregimpu)
              </h3>
              <p style={{ lineHeight: '1.6', color: 'var(--color-text-muted, #4b5563)', whiteSpace: 'pre-line' }}>
                {festival.procession}
              </p>
            </div>
          )}

          {festival.source_title && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px dashed var(--color-border, #e5e7eb)' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted, #6b7280)' }}>
                <strong>Provenance:</strong> {festival.source_title}
                {festival.source_url && (
                  <> (<a href={festival.source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary, #b45309)' }}>Source Record</a>)</>
                )}
                {festival.verification_status && <> · <span className="badge">{festival.verification_status}</span></>}
              </p>
            </div>
          )}

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link to="/festivals" className="btn btn-saffron">
              ← View All Festivals
            </Link>
            <Link to="/contact" className="btn btn-secondary">
              Visiting Information
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

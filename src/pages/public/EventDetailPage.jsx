import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../../services/apiClient.js';
import SeoHead from '../../components/SeoHead.jsx';
import Breadcrumb from '../../components/Breadcrumb.jsx';
import AiAnswerBlock from '../../components/AiAnswerBlock.jsx';
import { formatTime, formatDate, TEMPLE } from '../../config/temple.js';

export default function EventDetailPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    apiClient
      .get(`/events?slug=${encodeURIComponent(slug)}`)
      .then((data) => {
        if (!active) return;
        if (data?.item) {
          setEvent(data.item);
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

  if (error || !event) {
    return (
      <main className="page-main page-main-narrow">
        <SeoHead
          title="Event Not Found"
          description="The requested temple event could not be found."
          canonicalPath={`/events/${slug}`}
          noindex={true}
        />
        <div className="card-surface text-center" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <h1 className="page-title page-title-sm">Event Not Found</h1>
          <p className="page-subtitle" style={{ margin: '1rem 0 2rem' }}>
            The event you are looking for is either completed, not published, or has been updated.
          </p>
          <Link to="/events" className="btn btn-saffron">
            ← View all Temple Events
          </Link>
        </div>
      </main>
    );
  }

  const canonicalUrlPath = `/events/${event.slug || slug}`;
  const pageTitle = event.seo_title || `${event.title} | ${TEMPLE.name}`;
  const pageDesc = event.seo_description || event.description ||
    `Official details for ${event.title} at ${TEMPLE.name}, Mungandapalem, East Godavari District.`;

  const breadcrumbs = [
    { name: 'Home', to: '/' },
    { name: 'Events', to: '/events' },
    { name: event.title, to: canonicalUrlPath }
  ];

  const facts = [
    { label: 'Temple', value: TEMPLE.name },
    { label: 'Event Name', value: event.title },
    ...(event.title_telugu ? [{ label: 'Telugu Title', value: event.title_telugu }] : []),
    { label: 'Date', value: event.event_date ? formatDate(event.event_date) : 'To be announced' },
    ...(event.start_time ? [{ label: 'Start Time', value: formatTime(event.start_time) }] : []),
    ...(event.end_time ? [{ label: 'End Time', value: formatTime(event.end_time) }] : []),
    ...(event.location ? [{ label: 'Location', value: event.location }] : []),
    { label: 'Organizer', value: TEMPLE.name }
  ];

  const relatedLinks = [
    { label: 'All Temple Events', to: '/events' },
    { label: 'Temple Festivals & Jathara', to: '/festivals' },
    { label: 'Daily Darshan Timings', to: '/timings' },
    { label: 'Directions & Location', to: '/contact' }
  ];

  const schemaEvent = {
    '@type': 'Event',
    '@id': `${TEMPLE.canonicalDomain}${canonicalUrlPath}#event`,
    name: event.title,
    alternateName: event.title_telugu || undefined,
    description: event.description || pageDesc,
    startDate: event.event_date ? `${event.event_date}${event.start_time ? `T${event.start_time}` : ''}` : undefined,
    endDate: event.event_date && event.end_time ? `${event.event_date}T${event.end_time}` : undefined,
    organizer: { '@id': TEMPLE.entityId },
    location: {
      '@type': 'Place',
      name: event.location ? `${event.location}, ${TEMPLE.name}` : TEMPLE.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: TEMPLE.address.line1,
        addressLocality: TEMPLE.address.city,
        addressRegion: TEMPLE.address.state,
        postalCode: TEMPLE.address.pincode,
        addressCountry: 'IN'
      }
    }
  };

  return (
    <>
      <SeoHead
        title={pageTitle}
        description={pageDesc}
        canonicalPath={canonicalUrlPath}
        imageUrl={event.image_url}
        type="article"
        breadcrumbs={breadcrumbs}
        schemaGraph={schemaEvent}
      />

      <Breadcrumb items={breadcrumbs} />

      <main className="page-main page-main-narrow">
        <header className="page-header page-header-compact">
          <p className="page-eyebrow">Temple Celebration &amp; Event</p>
          <h1 className="page-title">{event.title}</h1>
          {event.title_telugu && (
            <p className="donate-telugu font-telugu" style={{ fontSize: '1.25rem', marginTop: '0.25rem' }}>
              {event.title_telugu}
            </p>
          )}
          {event.event_date && (
            <p className="page-subtitle" style={{ marginTop: '0.5rem', fontWeight: 500 }}>
              📅 {formatDate(event.event_date)}
              {event.start_time ? ` at ${formatTime(event.start_time)}` : ''}
            </p>
          )}
        </header>

        {/* AI & Human Direct Answer Overview */}
        <AiAnswerBlock
          question={`When and where is ${event.title} celebrated at ${TEMPLE.name}?`}
          answer={`${event.title} is an auspicious event held at ${TEMPLE.name} in Mungandapalem, East Godavari District. ${event.event_date ? `The event is scheduled for ${formatDate(event.event_date)}${event.start_time ? ` starting at ${formatTime(event.start_time)}` : ''}.` : 'The date and timings are published according to the official temple calendar.'}`}
          facts={facts}
          relatedLinks={relatedLinks}
          className="mb-8"
        />

        {/* Detailed Event Description */}
        <section className="card-surface" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 600, marginBottom: '1rem' }}>Event Details &amp; Significance</h2>
          {event.description ? (
            <p style={{ lineHeight: '1.7', color: 'var(--color-text-muted, #4b5563)', whiteSpace: 'pre-line' }}>
              {event.description}
            </p>
          ) : (
            <p style={{ color: 'var(--color-text-muted, #6b7280)', fontStyle: 'italic' }}>
              Additional information regarding rituals and programs will be published by the temple committee.
            </p>
          )}

          {event.description_telugu && (
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--color-border, #e5e7eb)', paddingTop: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                వివరాలు (Telugu)
              </h3>
              <p className="font-telugu" style={{ lineHeight: '1.8', color: 'var(--color-text-muted, #4b5563)', whiteSpace: 'pre-line' }}>
                {event.description_telugu}
              </p>
            </div>
          )}

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link to="/events" className="btn btn-saffron">
              ← View All Events
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

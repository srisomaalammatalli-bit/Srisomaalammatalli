import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/apiClient.js';
import SeoHead from '../../components/SeoHead.jsx';
import Breadcrumb from '../../components/Breadcrumb.jsx';
import AiAnswerBlock from '../../components/AiAnswerBlock.jsx';
import { formatDate, TEMPLE } from '../../config/temple.js';

export default function FestivalsPage() {
  const [festivals, setFestivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    apiClient
      .get('/temple/festivals')
      .then((data) => {
        if (!active) return;
        setFestivals(data?.items || []);
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
  }, []);

  const breadcrumbs = [
    { name: 'Home', to: '/' },
    { name: 'Festivals', to: '/festivals' }
  ];

  const facts = [
    { label: 'Temple', value: TEMPLE.name },
    { label: 'Location', value: 'Mungandapalem, East Godavari District, Andhra Pradesh' },
    { label: 'Primary Celebration', value: 'Annual Somalamma Talli Jathara Mahotsavam' },
    { label: 'Tradition', value: 'Grama Devatha Utsavam & Sacred Processions' },
    { label: 'Darshan Hours', value: 'Daily 06:30 AM–11:30 AM & 04:30 PM–08:25 PM' }
  ];

  const relatedLinks = [
    { label: 'Daily Darshan Timings', to: '/timings' },
    { label: 'Daily Poojas & Sevas', to: '/poojas' },
    { label: 'Upcoming Events', to: '/events' },
    { label: 'Temple Sthala Puranam', to: '/history' }
  ];

  return (
    <>
      <SeoHead
        title={`Temple Festivals & Annual Jathara | ${TEMPLE.name}`}
        description={`Experience the grand annual Jathara and sacred festivals of ${TEMPLE.name}, Mungandapalem, East Godavari District. Official schedules, rituals, and celebration details.`}
        canonicalPath="/festivals"
        breadcrumbs={breadcrumbs}
      />

      <Breadcrumb items={breadcrumbs} />

      <main className="page-main">
        <header className="page-header">
          <p className="page-eyebrow">Sacred Utsavams &amp; Traditions</p>
          <h1 className="page-title">Temple Festivals &amp; Jathara</h1>
          <p className="page-subtitle">
            Celebrate the divine festivities and cultural heritage of {TEMPLE.name} in Mungandapalem.
          </p>
        </header>

        {/* AI & Human Direct Answer Overview */}
        <div style={{ maxWidth: '900px', margin: '0 auto 2.5rem' }}>
          <AiAnswerBlock
            question={`What are the major festivals and Jatharas celebrated at ${TEMPLE.name}?`}
            answer={`The paramount celebration at ${TEMPLE.name} is the annual Somalamma Talli Jathara Mahotsavam, along with traditional Devi Navaratri and auspicious festival sevas. Devotees from across Andhra Pradesh gather at Mungandapalem in East Godavari District to offer prayers, sacred naivedyam, and participate in holy processions.`}
            facts={facts}
            relatedLinks={relatedLinks}
          />
        </div>

        {loading && (
          <div className="card-surface text-center" style={{ padding: '3rem', textAlign: 'center' }}>
            <p>Loading temple festival archives…</p>
          </div>
        )}

        {error && (
          <div className="card-surface text-center" style={{ padding: '2rem', textAlign: 'center' }}>
            <p>Unable to load festival records at present. Please check back shortly.</p>
          </div>
        )}

        {!loading && !error && festivals.length === 0 && (
          <div className="card-surface text-center" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Festival Schedules Being Updated</h2>
            <p style={{ color: 'var(--color-text-muted, #6b7280)', marginTop: '0.5rem' }}>
              The temple committee will publish upcoming festival and Jathara dates here as soon as they are finalized.
            </p>
          </div>
        )}

        {!loading && !error && festivals.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {festivals.map((fest) => {
              const linkUrl = `/festivals/${fest.slug || fest.id}`;
              return (
                <article key={fest.id} className="card-surface" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      <Link to={linkUrl} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {fest.name}
                      </Link>
                    </h2>
                    {fest.name_telugu && (
                      <p className="font-telugu" style={{ color: 'var(--color-primary, #b45309)', marginBottom: '0.75rem' }}>
                        {fest.name_telugu}
                      </p>
                    )}

                    {fest.start_date && (
                      <p style={{ fontSize: '0.9rem', color: '#4b5563', marginBottom: '0.75rem' }}>
                        📅 <strong>Dates:</strong> {formatDate(fest.start_date)}
                        {fest.end_date && fest.end_date !== fest.start_date ? ` to ${formatDate(fest.end_date)}` : ''}
                      </p>
                    )}

                    {fest.calendar_reference && (
                      <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                        🗓️ {fest.calendar_reference}
                      </p>
                    )}

                    {fest.description && (
                      <p style={{ fontSize: '0.95rem', color: '#4b5563', lineHeight: '1.5', marginTop: '0.5rem' }}>
                        {fest.description.slice(0, 160)}
                        {fest.description.length > 160 ? '…' : ''}
                      </p>
                    )}
                  </div>

                  <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                    <Link to={linkUrl} className="btn btn-secondary btn-block" style={{ width: '100%', textAlign: 'center' }}>
                      View Festival Details →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../../services/apiClient.js';
import SeoHead from '../../components/SeoHead.jsx';
import Breadcrumb from '../../components/Breadcrumb.jsx';
import AiAnswerBlock from '../../components/AiAnswerBlock.jsx';
import Icon from '../../components/Icon.jsx';
import { formatPaise } from '../../components/PhonePePayment.jsx';
import { formatTime, TEMPLE } from '../../config/temple.js';

export default function PoojaDetailPage() {
  const { slug } = useParams();
  const [pooja, setPooja] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    apiClient
      .get(`/poojas?slug=${encodeURIComponent(slug)}`)
      .then((data) => {
        if (!active) return;
        if (data?.item) {
          setPooja(data.item);
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

  if (error || !pooja) {
    return (
      <main className="page-main page-main-narrow">
        <SeoHead
          title="Pooja Not Found"
          description="The requested pooja or seva could not be found."
          canonicalPath={`/poojas/${slug}`}
          noindex={true}
        />
        <div className="card-surface text-center" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <h1 className="page-title page-title-sm">Pooja Not Found</h1>
          <p className="page-subtitle" style={{ margin: '1rem 0 2rem' }}>
            The seva or pooja you are looking for is either not published or has been updated.
          </p>
          <Link to="/poojas" className="btn btn-saffron">
            ← View all Poojas &amp; Sevas
          </Link>
        </div>
      </main>
    );
  }

  const price = Number(pooja.price_paise || 0);
  const priceDisplay = price > 0 ? formatPaise(price) : 'Amount not yet published';
  const canonicalUrlPath = `/poojas/${pooja.slug || slug}`;
  const pageTitle = pooja.seo_title || `${pooja.name} - Timings, Offering & Booking | ${TEMPLE.name}`;
  const pageDesc = pooja.seo_description || pooja.description ||
    `Official details for ${pooja.name} at ${TEMPLE.name}, Mungandapalem. Timings, offering amounts, guidelines, and seva booking information.`;

  const breadcrumbs = [
    { name: 'Home', to: '/' },
    { name: 'Poojas', to: '/poojas' },
    { name: pooja.name, to: canonicalUrlPath }
  ];

  const facts = [
    { label: 'Temple', value: TEMPLE.name },
    { label: 'Location', value: 'Mungandapalem, East Godavari District, Andhra Pradesh' },
    { label: 'Pooja Name', value: pooja.name },
    ...(pooja.name_telugu ? [{ label: 'Telugu Name', value: pooja.name_telugu }] : []),
    { label: 'Pooja Timing', value: pooja.pooja_time ? formatTime(pooja.pooja_time) : 'As per temple schedule' },
    { label: 'Duration', value: pooja.duration_minutes ? `${pooja.duration_minutes} minutes` : 'Approx. 30–45 minutes' },
    { label: 'Frequency', value: pooja.is_daily ? 'Daily' : (pooja.day_of_week || 'Special / Designated Days') },
    { label: 'Offering Amount', value: priceDisplay }
  ];

  const relatedLinks = [
    { label: 'Darshan & Temple Timings', to: '/timings' },
    { label: 'All Poojas & Sevas', to: '/poojas' },
    { label: 'Temple Sthala Puranam', to: '/history' },
    { label: 'Visiting & Directions', to: '/contact' }
  ];

  const schemaService = {
    '@type': 'Service',
    '@id': `${TEMPLE.canonicalDomain}${canonicalUrlPath}#service`,
    name: pooja.name,
    alternateName: pooja.name_telugu || undefined,
    description: pooja.description || pageDesc,
    provider: { '@id': TEMPLE.entityId }
  };

  if (price > 0) {
    schemaService.offers = {
      '@type': 'Offer',
      price: (price / 100).toFixed(2),
      priceCurrency: 'INR',
      availability: pooja.available ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
      url: `${TEMPLE.canonicalDomain}${canonicalUrlPath}`
    };
  }

  return (
    <>
      <SeoHead
        title={pageTitle}
        description={pageDesc}
        canonicalPath={canonicalUrlPath}
        imageUrl={pooja.image_url}
        type="article"
        breadcrumbs={breadcrumbs}
        schemaGraph={schemaService}
      />

      <Breadcrumb items={breadcrumbs} />

      <main className="page-main page-main-narrow">
        <header className="page-header page-header-compact">
          <p className="page-eyebrow">Pooja &amp; Seva Information</p>
          <h1 className="page-title">{pooja.name}</h1>
          {pooja.name_telugu && (
            <p className="donate-telugu font-telugu" style={{ fontSize: '1.25rem', marginTop: '0.25rem' }}>
              {pooja.name_telugu}
            </p>
          )}
          <p className="page-subtitle" style={{ marginTop: '0.5rem' }}>
            Performed at {TEMPLE.name}, Mungandapalem
          </p>
        </header>

        {/* AI & Human Direct Answer Overview */}
        <AiAnswerBlock
          question={`What is the procedure and schedule for ${pooja.name} at ${TEMPLE.name}?`}
          answer={`${pooja.name} is a sacred devotional offering performed for Sri Somalamma Thalli at ${TEMPLE.name} in Mungandapalem, East Godavari District. Devotees offer this seva to seek divine grace and spiritual blessings. ${pooja.pooja_time ? `The seva is typically conducted at ${formatTime(pooja.pooja_time)}.` : 'The seva is conducted during daily temple darshan hours.'}`}
          facts={facts}
          relatedLinks={relatedLinks}
          className="mb-8"
        />

        {/* Detailed Information Section */}
        <section className="card-surface" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 600, marginBottom: '1rem' }}>About this Seva</h2>
          {pooja.description ? (
            <p style={{ lineHeight: '1.7', color: 'var(--color-text-muted, #4b5563)', whiteSpace: 'pre-line' }}>
              {pooja.description}
            </p>
          ) : (
            <p style={{ color: 'var(--color-text-muted, #6b7280)', fontStyle: 'italic' }}>
              Detailed spiritual significance will be published in official temple updates.
            </p>
          )}

          {pooja.instructions && (
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--color-border, #e5e7eb)', paddingTop: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Devotee Guidelines &amp; Instructions
              </h3>
              <p style={{ lineHeight: '1.6', color: 'var(--color-text-muted, #4b5563)', whiteSpace: 'pre-line' }}>
                {pooja.instructions}
              </p>
            </div>
          )}

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link to="/poojas" className="btn btn-saffron">
              Book this Seva
            </Link>
            <Link to="/timings" className="btn btn-secondary">
              View Daily Darshan Timings
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/apiClient.js';
import { AsyncSection } from '../../components/States.jsx';
import SourceBadge from '../../components/SourceBadge.jsx';
import { useSettings, settingValue, composeAddress } from '../../hooks/useSettings.js';

/**
 * About Old Somalamma Temple.
 *
 * The introduction and the temple's details come from settings, and the
 * "living tradition" section is drawn from the featured history entries, so
 * the committee edits this page from the admin portal rather than through a
 * developer.
 *
 * Contact details appear only when they have actually been entered. An
 * empty phone or email renders as "currently being updated" rather than as
 * a plausible-looking placeholder someone might try to ring.
 */
export default function AboutPage() {
  const { settings } = useSettings();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await apiClient.get('/temple/history');
      setHistory(data?.items || []);
    } catch {
      setError(true);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const templeName = settingValue(settings, 'temple_name', 'Old Somalamma Temple');
  const templeNameTelugu = settingValue(settings, 'temple_name_telugu', '');
  const deity = settingValue(settings, 'temple_deity', '');
  const deityTelugu = settingValue(settings, 'temple_deity_telugu', '');
  const templeType = settingValue(settings, 'temple_type', '');
  const area = settingValue(settings, 'temple_area', '');
  const city = settingValue(settings, 'temple_city', '');
  const address = composeAddress(settings);
  const addressTelugu = settingValue(settings, 'temple_address_telugu', '');
  const phone = settingValue(settings, 'temple_phone', '');
  const email = settingValue(settings, 'temple_email', '');
  const mapsUrl = settingValue(settings, 'temple_maps_url', '');

  return (
    <main className="page-main">
      <header className="page-header page-header-tight">
        <p className="page-eyebrow">About</p>
        <h1 className="page-title">About {templeName}</h1>
        {templeNameTelugu ? (
          <p className="page-title-telugu" lang="te">
            {templeNameTelugu}
          </p>
        ) : null}
      </header>

      {/* 1. Temple Introduction */}
      <section className="about-section" aria-label="Temple introduction">
        <h2 className="section-title">Temple Introduction</h2>
        <p className="about-lead">
          {templeName}
          {area ? ` in ${area}` : ''}
          {city ? `, ${city}` : ''}, is a shrine dedicated to {deity || 'the goddess'} and forms
          part of the living local-goddess tradition of coastal Andhra. The annual Jatara
          continues to bring together devotees and the wider community.
        </p>
      </section>

      {/* 2. Sri Somalamma Thalli */}
      {deity ? (
        <section className="about-section" aria-label="The deity">
          <h2 className="section-title">{deity}</h2>
          {deityTelugu ? (
            <p className="about-deity-telugu" lang="te">
              {deityTelugu}
            </p>
          ) : null}
          {templeType ? <p className="about-body">{templeType}</p> : null}
        </section>
      ) : null}

      {/* 3 & 4. Spiritual and community significance, from the history
          entries rather than restated here in a way that could drift. */}
      <AsyncSection
        loading={loading}
        error={error}
        isEmpty={!loading && !error && history.length === 0}
        onRetry={load}
        loadingProps={{ count: 2 }}
        emptyProps={{
          icon: 'book',
          title: 'The temple history has not been published yet',
          message: 'The temple committee will publish this shortly.'
        }}
        errorProps={{ title: 'Unable to load the temple history' }}
      >
        <section className="about-section" aria-label="Living tradition">
          <h2 className="section-title">A Living Tradition</h2>
          {history.slice(0, 3).map((entry) => (
            <article key={entry.id} className="about-history-card">
              <h3 className="about-history-title">{entry.title}</h3>
              {entry.description ? <p className="about-body">{entry.description}</p> : null}
              <SourceBadge
                status={entry.verification_status}
                sourceType={entry.source_type}
                sourceTitle={entry.source_title}
                sourceDate={entry.source_date}
              />
            </article>
          ))}
          <p className="about-more">
            <Link to="/history" className="btn btn-outline">
              Explore the full temple history
            </Link>
          </p>
        </section>
      </AsyncSection>

      {/* 5. Location */}
      <section className="about-section" aria-label="Location">
        <h2 className="section-title">Location</h2>
        {address ? <p className="about-body">{address}</p> : null}
        {addressTelugu ? (
          <p className="about-body" lang="te">
            {addressTelugu}
          </p>
        ) : null}
        {mapsUrl ? (
          <p>
            <a className="btn btn-primary" href={mapsUrl} target="_blank" rel="noreferrer noopener">
              Get directions
            </a>
          </p>
        ) : null}

        <h3 className="about-subtitle">Contact</h3>
        {phone || email ? (
          <ul className="about-contact-list">
            {phone ? (
              <li>
                <a href={`tel:${phone.replace(/\s+/g, '')}`}>{phone}</a>
              </li>
            ) : null}
            {email ? (
              <li>
                <a href={`mailto:${email}`}>{email}</a>
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="about-body about-pending">
            Temple contact details are currently being updated.
          </p>
        )}
      </section>
    </main>
  );
}

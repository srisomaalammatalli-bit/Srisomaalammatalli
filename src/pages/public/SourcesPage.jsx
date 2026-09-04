import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/apiClient.js';
import { AsyncSection } from '../../components/States.jsx';
import SourceBadge, { SourceBadgeLegend } from '../../components/SourceBadge.jsx';

/**
 * The source archive behind the history pages.
 *
 * Everything the site says about the temple's past is listed here with the
 * source it rests on, grouped by the kind of source it is. The purpose is to
 * let a reader answer "says who?" for any statement on the site, and to keep
 * the difference between a newspaper report and a remembered tradition
 * visible rather than smoothed over.
 *
 * Entries with no identified source appear too, under "Not yet attributed".
 * Leaving them out would make the archive look better evidenced than it is.
 */

const GROUP_ORDER = [
  'Primary Source',
  'Government Record',
  'Academic Source',
  'Book',
  'Newspaper',
  'Local Historical Source',
  'Video',
  'Oral History',
  'Community Source',
  'User Submitted',
  'Unverified'
];

const GROUP_LABELS = {
  'Primary Source': 'Primary sources',
  'Government Record': 'Government records',
  'Academic Source': 'Academic sources',
  Book: 'Books',
  Newspaper: 'Newspaper reports',
  'Local Historical Source': 'Local historical sources',
  Video: 'Video documentation',
  'Oral History': 'Oral history',
  'Community Source': 'Community documentation',
  'User Submitted': 'Submitted by devotees',
  Unverified: 'Not yet attributed'
};

export default function SourcesPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [history, claims, inscriptions, festivals] = await Promise.all([
        apiClient.get('/temple/history').catch(() => ({ items: [] })),
        apiClient.get('/temple/claims').catch(() => ({ items: [] })),
        apiClient.get('/temple/inscriptions').catch(() => ({ items: [] })),
        apiClient.get('/temple/festivals').catch(() => ({ items: [] }))
      ]);

      // One shape for four different record types, so the archive can list
      // them together without the page caring where each came from.
      const combined = [
        ...(history?.items || []).map((h) => ({
          id: `h-${h.id}`,
          kind: 'History',
          title: h.title,
          detail: h.description,
          sourceType: h.source_type,
          sourceTitle: h.source_title,
          sourceUrl: h.source_url,
          sourceDate: h.source_date,
          status: h.verification_status
        })),
        ...(claims?.items || []).map((c) => ({
          id: `c-${c.id}`,
          kind: 'Claim',
          title: c.claim,
          detail: c.description,
          sourceType: c.source_type,
          sourceTitle: c.source_title,
          sourceUrl: c.source_url,
          sourceDate: c.source_date,
          status: c.verification_status
        })),
        ...(inscriptions?.items || []).map((i) => ({
          id: `i-${i.id}`,
          kind: 'Inscription',
          title: i.title,
          detail: i.historical_significance,
          sourceType: 'Primary Source',
          sourceTitle: i.source,
          sourceUrl: i.source_url,
          sourceDate: null,
          status: i.verification_status
        })),
        ...(festivals?.items || []).map((f) => ({
          id: `f-${f.id}`,
          kind: 'Festival',
          title: `${f.name}${f.year ? ` — ${f.year}` : ''}`,
          detail: f.description,
          sourceType: f.source_type,
          sourceTitle: f.source_title,
          sourceUrl: f.source_url,
          sourceDate: null,
          status: f.verification_status
        }))
      ];

      setRecords(combined);
    } catch {
      setError(true);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    const byType = new Map();
    for (const record of records) {
      const key = GROUP_ORDER.includes(record.sourceType) ? record.sourceType : 'Unverified';
      if (!byType.has(key)) byType.set(key, []);
      byType.get(key).push(record);
    }
    return GROUP_ORDER.filter((key) => byType.has(key)).map((key) => ({
      key,
      label: GROUP_LABELS[key] || key,
      items: byType.get(key)
    }));
  }, [records]);

  return (
    <main className="page-main">
      <header className="page-header page-header-tight">
        <p className="page-eyebrow">Research archive</p>
        <h1 className="page-title">Sources</h1>
        <p className="page-subtitle">
          What the temple&rsquo;s history rests on, and how far each statement can be trusted
        </p>
      </header>

      <AsyncSection
        loading={loading}
        error={error}
        isEmpty={!loading && !error && records.length === 0}
        onRetry={load}
        loadingProps={{ count: 5 }}
        emptyProps={{
          icon: 'book',
          title: 'No sources have been recorded yet',
          message: 'The temple committee will publish the source archive here.'
        }}
        errorProps={{ title: 'Unable to load the source archive' }}
      >
        <SourceBadgeLegend />

        {groups.map((group) => (
          <section key={group.key} className="sources-group" aria-label={group.label}>
            <h2 className="section-title">{group.label}</h2>
            <ul className="sources-list">
              {group.items.map((item) => (
                <li key={item.id} className="source-card">
                  <div className="source-card-head">
                    <span className="source-kind">{item.kind}</span>
                    <SourceBadge status={item.status} />
                  </div>
                  <h3 className="source-card-title">{item.title}</h3>
                  {item.detail ? <p className="source-card-detail">{item.detail}</p> : null}
                  <p className="source-card-meta">
                    {item.sourceTitle ? <span>{item.sourceTitle}</span> : <span>Source not named</span>}
                    {item.sourceDate ? <span> · {item.sourceDate}</span> : null}
                    {item.sourceUrl ? (
                      <>
                        {' · '}
                        <a href={item.sourceUrl} target="_blank" rel="noreferrer noopener">
                          View source
                        </a>
                      </>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className="sources-back">
          <Link to="/history" className="btn btn-outline">
            Back to the temple history
          </Link>
        </p>
      </AsyncSection>
    </main>
  );
}

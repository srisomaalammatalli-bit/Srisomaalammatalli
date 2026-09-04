import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/apiClient.js';
import { AsyncSection } from '../../components/States.jsx';
import SourceBadge, { SourceBadgeLegend } from '../../components/SourceBadge.jsx';
import { useSettings, settingValue } from '../../hooks/useSettings.js';

/**
 * History of Old Somalamma Temple.
 *
 * Every word of history on this page comes from the database, so the temple
 * committee can correct or extend it without a developer. Nothing is
 * hard-coded here but the section headings and the explanation of how to
 * read the evidence labels.
 *
 * The page is built around a distinction it must never blur: what is
 * documented, and what is remembered. Each entry carries its own badge, the
 * outstanding questions get a section of their own rather than being
 * omitted, and a claim the committee has recorded but not published simply
 * does not appear — the API withholds it.
 */
export default function HistoryPage() {
  const { settings } = useSettings();
  const [history, setHistory] = useState([]);
  const [claims, setClaims] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [festivals, setFestivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      // Claims, inscriptions and festivals are supporting material: if one
      // is unavailable the narrative should still render.
      const [historyData, claimData, inscriptionData, festivalData] = await Promise.all([
        apiClient.get('/temple/history'),
        apiClient.get('/temple/claims').catch(() => ({ items: [] })),
        apiClient.get('/temple/inscriptions').catch(() => ({ items: [] })),
        apiClient.get('/temple/festivals').catch(() => ({ items: [] }))
      ]);
      setHistory(historyData?.items || []);
      setClaims(claimData?.items || []);
      setInscriptions(inscriptionData?.items || []);
      setFestivals(festivalData?.items || []);
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
  const city = settingValue(settings, 'temple_city', '');

  // The timeline is the history entries plus the documented festival years,
  // ordered by whatever date information each actually has. Entries with no
  // year keep their editorial order rather than being given an invented one.
  const timeline = useMemo(() => {
    const fromHistory = history.map((h) => ({
      key: `h-${h.id}`,
      label: h.period || (h.year_start ? String(h.year_start) : 'Undated'),
      sortYear: h.year_start ?? null,
      order: h.display_order ?? 0,
      title: h.title,
      description: h.description,
      status: h.verification_status,
      sourceType: h.source_type,
      sourceTitle: h.source_title,
      sourceDate: h.source_date
    }));

    const fromFestivals = festivals.map((f) => ({
      key: `f-${f.id}`,
      label: f.year ? String(f.year) : 'Undated',
      sortYear: f.year ?? null,
      order: 1000,
      title: `${f.name}${f.year ? ` — ${f.year}` : ''}`,
      description: f.description,
      status: f.verification_status,
      sourceType: f.source_type,
      sourceTitle: f.source_title,
      sourceDate: null
    }));

    // Editorial order leads, because most entries have no year and the
    // committee's sequence is the only thing that knows where an undated
    // period belongs. Years only settle ties within the same position, so
    // an undated entry is never pushed to one end as though its date were
    // known to be extreme.
    return [...fromHistory, ...fromFestivals].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      if (a.sortYear !== null && b.sortYear !== null) return a.sortYear - b.sortYear;
      if (a.sortYear === null && b.sortYear === null) return 0;
      return a.sortYear === null ? -1 : 1;
    });
  }, [history, festivals]);

  // Section 10: everything still open. Built from the data rather than
  // written by hand, so it cannot drift out of date as claims are verified.
  const outstanding = useMemo(() => {
    const items = [];
    for (const h of history) {
      if (h.verification_status === 'Needs Verification' || h.verification_status === 'Disputed') {
        items.push({ key: `h-${h.id}`, text: h.title, status: h.verification_status });
      }
    }
    for (const c of claims) {
      if (c.verification_status === 'Needs Verification' || c.verification_status === 'Disputed') {
        items.push({ key: `c-${c.id}`, text: c.claim, status: c.verification_status });
      }
    }
    for (const i of inscriptions) {
      if (!i.transcription) {
        items.push({
          key: `i-${i.id}`,
          text: `${i.title} — not yet located, photographed or read.`,
          status: i.verification_status
        });
      }
    }
    return items;
  }, [history, claims, inscriptions]);

  return (
    <main className="page-main">
      <header className="page-header page-header-history">
        <p className="page-eyebrow">History</p>
        <h1 className="page-title">History of {templeName}</h1>
        <p className="page-subtitle">
          Tracing the living tradition of Somalamma in {city}
        </p>
      </header>

      <AsyncSection
        loading={loading}
        error={error}
        isEmpty={!loading && !error && history.length === 0}
        onRetry={load}
        loadingProps={{ count: 4 }}
        emptyProps={{
          icon: 'book',
          title: 'The temple history has not been published yet',
          message: 'The temple committee will publish the history of the temple here.'
        }}
        errorProps={{ title: 'Unable to load the temple history' }}
      >
        <SourceBadgeLegend />

        {/* The narrative, one section per database entry. */}
        <section className="history-sections" aria-label="Temple history">
          {history.map((entry) => (
            <article key={entry.id} className="history-entry">
              {entry.period ? <p className="history-period">{entry.period}</p> : null}
              <h2 className="history-entry-title">{entry.title}</h2>
              {entry.description ? <p className="history-entry-body">{entry.description}</p> : null}
              {entry.telugu_description ? (
                <p className="history-entry-body history-entry-telugu" lang="te">
                  {entry.telugu_description}
                </p>
              ) : null}
              <div className="history-entry-meta">
                <SourceBadge
                  status={entry.verification_status}
                  sourceType={entry.source_type}
                  sourceTitle={entry.source_title}
                  sourceDate={entry.source_date}
                />
                {entry.source_url ? (
                  <a
                    className="history-source-link"
                    href={entry.source_url}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    View source
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </section>

        {/* Timeline — a vertical rail on every width; see website.css. */}
        {timeline.length ? (
          <section className="history-timeline-section" aria-label="Historical timeline">
            <h2 className="section-title">Timeline</h2>
            <p className="section-intro">
              Periods without a documented date are shown as such rather than being given an
              estimated one.
            </p>
            <ol className="history-timeline">
              {timeline.map((item) => (
                <li key={item.key} className="timeline-item">
                  <span className="timeline-marker" aria-hidden="true" />
                  <div className="timeline-content">
                    <p className="timeline-label">{item.label}</p>
                    <h3 className="timeline-title">{item.title}</h3>
                    {item.description ? <p className="timeline-body">{item.description}</p> : null}
                    <SourceBadge
                      status={item.status}
                      sourceType={item.sourceType}
                      sourceTitle={item.sourceTitle}
                      sourceDate={item.sourceDate}
                    />
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* Inscriptions. A record with no reading is shown as outstanding
            work, never with an invented transcription. */}
        {inscriptions.length ? (
          <section className="history-inscriptions" aria-label="Inscription records">
            <h2 className="section-title">Inscription Records</h2>
            {inscriptions.map((item) => (
              <article key={item.id} className="inscription-card">
                <h3 className="inscription-title">{item.title}</h3>
                <dl className="inscription-facts">
                  {item.location ? (
                    <div>
                      <dt>Location</dt>
                      <dd>{item.location}</dd>
                    </div>
                  ) : null}
                  {item.estimated_date ? (
                    <div>
                      <dt>Date</dt>
                      <dd>{item.estimated_date}</dd>
                    </div>
                  ) : null}
                  {item.original_language ? (
                    <div>
                      <dt>Language</dt>
                      <dd>{item.original_language}</dd>
                    </div>
                  ) : null}
                </dl>
                {item.historical_significance ? (
                  <p className="inscription-body">{item.historical_significance}</p>
                ) : null}
                {item.transcription ? (
                  <div className="inscription-reading">
                    <h4>Transcription</h4>
                    <p className="inscription-transcription">{item.transcription}</p>
                    {item.translation ? (
                      <>
                        <h4>Translation</h4>
                        <p>{item.translation}</p>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <p className="inscription-pending">
                    No transcription has been recorded. The stone has not yet been located,
                    photographed and read for this archive.
                  </p>
                )}
                <SourceBadge status={item.verification_status} sourceTitle={item.source} />
              </article>
            ))}
          </section>
        ) : null}

        {/* Section 10 — the open questions, stated plainly. */}
        <section className="history-outstanding" aria-label="What remains to be verified">
          <h2 className="section-title">What Remains to Be Verified</h2>
          {outstanding.length ? (
            <>
              <p className="section-intro">
                These are recorded in the temple archive but have not been confirmed against
                primary sources. They are listed here rather than left out.
              </p>
              <ul className="outstanding-list">
                {outstanding.map((item) => (
                  <li key={item.key} className="outstanding-item">
                    <SourceBadge status={item.status} />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="section-intro">
              Every published entry has been checked against a source.
            </p>
          )}
          <p className="outstanding-invite">
            <Link to="/history/contribute" className="btn btn-outline">
              Help us document this history
            </Link>
          </p>
        </section>

        {/* Festival archive, summarised by year. The full record for a year
            lives in the archive itself; this is the way in. */}
        {festivals.length ? (
          <section className="history-festivals" aria-label="Festival archive">
            <h2 className="section-title">Festival Archive</h2>
            <p className="section-intro">
              What is documented of the Jatara, year by year. A year with no recorded programme is
              shown as such rather than given one.
            </p>
            <ul className="festival-year-list">
              {festivals.map((f) => (
                <li key={f.id} className="festival-year-card">
                  <div className="festival-year-head">
                    <span className="festival-year">{f.year || '—'}</span>
                    <SourceBadge
                      status={f.verification_status}
                      sourceType={f.source_type}
                      sourceTitle={f.source_title}
                    />
                  </div>
                  <h3 className="festival-year-name">{f.name}</h3>
                  {f.name_telugu ? (
                    <p className="festival-year-telugu" lang="te">
                      {f.name_telugu}
                    </p>
                  ) : null}
                  {f.description ? <p className="festival-year-body">{f.description}</p> : null}
                  <p className="festival-year-dates">
                    {f.start_date
                      ? `${f.start_date}${f.end_date ? ` – ${f.end_date}` : ''}`
                      : 'Dates not documented'}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Sources. Every statement above rests on something; this is where a
            reader can check what. */}
        <section className="history-sources-cta" aria-label="Sources">
          <h2 className="section-title">Sources</h2>
          <p className="section-intro">
            Every entry on this page carries the source it rests on and how far it can be trusted.
            The full archive lists them together.
          </p>
          <p>
            <Link to="/history/sources" className="btn btn-outline">
              View the source archive
            </Link>
          </p>
        </section>

        {/* Help preserve the history. */}
        <section className="history-contribute" aria-label="Help preserve the history">
          <h2 className="section-title">Help Preserve the History</h2>
          <p className="section-intro">
            Do you have an old photograph, family record, festival invitation, newspaper clipping,
            inscription photograph or oral history connected with this temple? Much of what survives
            of the temple&rsquo;s recent past is held by devotees rather than in any archive.
          </p>
          <p>
            <Link to="/history/contribute" className="btn btn-primary">
              Submit Historical Material
            </Link>
          </p>
        </section>
      </AsyncSection>
    </main>
  );
}

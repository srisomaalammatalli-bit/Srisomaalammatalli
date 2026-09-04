import React, { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '../../services/apiClient.js';
import { AsyncSection } from '../../components/States.jsx';
import SourceBadge from '../../components/SourceBadge.jsx';
import { VERIFICATION_STATUSES } from '../../components/AdminRecordScreen.jsx';
import { adminErrorMessage } from '../../services/adminMessages.js';

/**
 * The review queue for material sent in by devotees.
 *
 * Accepting something here does not make it true, and does not put it on the
 * website. It means the temple has taken the material for the archive; the
 * verification status is a separate judgement, and publishing it is a separate
 * act in the history or gallery screens. Keeping those three apart is what
 * stops a family photograph with an uncertain date from becoming a dated
 * historical fact by being clicked once.
 */

const FILTERS = [
  { key: 'PENDING', label: 'Awaiting review' },
  { key: 'APPROVED', label: 'Accepted' },
  { key: 'REJECTED', label: 'Declined' },
  { key: '', label: 'All' }
];

const COPYRIGHT_LABEL = {
  OWNER: 'Submitter owns it',
  PERMISSION_GRANTED: 'Permission granted',
  PUBLIC_DOMAIN: 'Public domain',
  NOT_STATED: 'Not stated',
  UNKNOWN: 'Unknown'
};

function formatWhen(value) {
  if (!value) return '—';
  const d = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminSubmissions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState('PENDING');
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await apiClient.get('/temple/submissions');
      setItems(data?.items || []);
    } catch {
      setError(true);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () => (filter ? items.filter((i) => i.review_status === filter) : items),
    [items, filter]
  );

  const pendingCount = items.filter((i) => i.review_status === 'PENDING').length;

  async function act(submission, body, message) {
    setBusyId(submission.id);
    try {
      await apiClient.put('/temple/submissions', { id: submission.id, ...body });
      setNotice(message);
      await load();
    } catch (err) {
      window.alert(adminErrorMessage(err, 'The submission could not be updated.'));
    } finally {
      setBusyId(null);
    }
  }

  function approve(submission) {
    act(
      submission,
      { reviewStatus: 'APPROVED' },
      'Accepted for the archive. Set its verification status, then publish it from the History or Gallery screen.'
    );
  }

  function reject(submission) {
    if (!window.confirm('Decline this submission? The submitter is not notified automatically.')) return;
    act(submission, { reviewStatus: 'REJECTED' }, 'Submission declined.');
  }

  function requestInfo(submission) {
    const question = window.prompt(
      'What should the submitter be asked for?\n(Recorded on the submission; it stays in the review queue.)'
    );
    if (!question) return;
    const existing = submission.admin_notes ? `${submission.admin_notes}\n` : '';
    act(
      submission,
      {
        reviewStatus: 'NEEDS_MORE_INFO',
        adminNotes: `${existing}More information requested: ${question}`
      },
      'Recorded. The submission stays in the review queue.'
    );
  }

  function setVerification(submission, status) {
    act(submission, { verificationStatus: status }, `Marked as "${status}".`);
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '28px',
            fontWeight: 700,
            margin: '0 0 4px',
            color: 'var(--color-maroon-primary)'
          }}
        >
          Historical Submissions
        </h1>
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '75ch' }}>
          Photographs, clippings and recollections sent in by devotees. Accepting material means the
          temple has taken it for the archive — it does not make it verified, and it does not put it
          on the website. Both of those are separate, deliberate steps.
        </div>
      </div>

      {notice ? (
        <div
          role="status"
          style={{
            background: 'var(--color-gold-tint)',
            border: '1px solid var(--color-gold-border)',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '18px',
            fontSize: '13px'
          }}
        >
          {notice}
          <button
            type="button"
            onClick={() => setNotice('')}
            style={{ border: 'none', background: 'none', cursor: 'pointer', float: 'right' }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button
            key={f.key || 'all'}
            type="button"
            onClick={() => setFilter(f.key)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              border: '1px solid var(--color-border-subtle)',
              background: filter === f.key ? 'var(--color-maroon-primary)' : 'var(--color-ivory-surface)',
              color: filter === f.key ? '#fff' : 'var(--color-text-primary)',
              cursor: 'pointer'
            }}
          >
            {f.label}
            {f.key === 'PENDING' && pendingCount ? ` (${pendingCount})` : ''}
          </button>
        ))}
      </div>

      <AsyncSection
        loading={loading}
        error={error}
        isEmpty={!loading && !error && visible.length === 0}
        onRetry={load}
        loadingProps={{ count: 3, variant: 'rows' }}
        emptyProps={{
          icon: 'inbox',
          title:
            filter === 'PENDING'
              ? 'No historical submissions awaiting review.'
              : 'Nothing in this list.',
          message:
            items.length === 0
              ? 'Material sent through the public form will appear here for review.'
              : 'Choose another filter to see other submissions.'
        }}
        errorProps={{ title: 'Unable to load the review queue' }}
      >
        <div style={{ display: 'grid', gap: '16px' }}>
          {visible.map((s) => (
            <article
              key={s.id}
              style={{
                background: 'var(--color-ivory-surface)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '12px',
                padding: '20px 22px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                  marginBottom: '10px'
                }}
              >
                <div>
                  <h3 style={{ margin: '0 0 4px', color: 'var(--color-maroon-primary)' }}>{s.title}</h3>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    {s.material_type || 'Type not stated'} · received {formatWhen(s.created_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span
                    className={`badge ${
                      s.review_status === 'APPROVED'
                        ? 'badge-success'
                        : s.review_status === 'REJECTED'
                          ? 'badge-danger'
                          : 'badge-warning'
                    }`}
                  >
                    {s.review_status === 'PENDING' ? 'Awaiting review' : s.review_status}
                  </span>
                  <SourceBadge status={s.verification_status} />
                </div>
              </div>

              {s.description ? (
                <p style={{ margin: '0 0 12px', lineHeight: 1.7 }}>{s.description}</p>
              ) : null}

              <dl
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '10px',
                  margin: '0 0 14px',
                  fontSize: '13px'
                }}
              >
                <div>
                  <dt style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>Approximate year</dt>
                  <dd style={{ margin: 0 }}>{s.approximate_year || 'Not stated'}</dd>
                </div>
                <div>
                  <dt style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>Submitted by</dt>
                  <dd style={{ margin: 0 }}>{s.submitted_by || 'Anonymous'}</dd>
                </div>
                <div>
                  <dt style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>Contact</dt>
                  <dd style={{ margin: 0 }}>{s.submitter_contact || '—'}</dd>
                </div>
                <div>
                  <dt style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>Source</dt>
                  <dd style={{ margin: 0 }}>{s.source || 'Not stated'}</dd>
                </div>
                <div>
                  <dt style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>Rights</dt>
                  <dd style={{ margin: 0 }}>
                    {COPYRIGHT_LABEL[s.copyright_permission] || s.copyright_permission}
                  </dd>
                </div>
              </dl>

              {s.image_url ? (
                <p style={{ margin: '0 0 12px', fontSize: '13px' }}>
                  <a href={s.image_url} target="_blank" rel="noreferrer noopener">
                    View the submitted material
                  </a>
                </p>
              ) : null}

              {s.admin_notes ? (
                <pre
                  style={{
                    background: 'var(--color-sand-alt)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '12px',
                    whiteSpace: 'pre-wrap',
                    margin: '0 0 14px',
                    fontFamily: 'inherit'
                  }}
                >
                  {s.admin_notes}
                </pre>
              ) : null}

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '5px 12px' }}
                  disabled={busyId === s.id || s.review_status === 'APPROVED'}
                  onClick={() => approve(s)}
                >
                  Accept for the archive
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: '12px', padding: '5px 12px' }}
                  disabled={busyId === s.id}
                  onClick={() => requestInfo(s)}
                >
                  Request more information
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: '12px', padding: '5px 12px', color: '#8A2020' }}
                  disabled={busyId === s.id || s.review_status === 'REJECTED'}
                  onClick={() => reject(s)}
                >
                  Decline
                </button>

                <label
                  style={{
                    marginLeft: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px'
                  }}
                >
                  Evidence:
                  <select
                    className="input-field"
                    style={{ fontSize: '12px', padding: '4px 8px', width: 'auto' }}
                    value={s.verification_status || 'Needs Verification'}
                    disabled={busyId === s.id}
                    onChange={(e) => setVerification(s, e.target.value)}
                  >
                    {VERIFICATION_STATUSES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </article>
          ))}
        </div>
      </AsyncSection>
    </div>
  );
}

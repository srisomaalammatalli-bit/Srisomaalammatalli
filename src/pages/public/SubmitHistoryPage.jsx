import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/apiClient.js';

/**
 * "Help preserve the history of Somalamma Temple."
 *
 * Devotees hold most of what survives of this temple's recent past: festival
 * invitations, photographs from family albums, clippings kept in a drawer.
 * This form takes that material into the archive.
 *
 * Nothing sent here is published. Every submission arrives as pending, the
 * temple committee reviews it, and publishing it is a separate decision made
 * afterwards — which is what the confirmation says, so nobody expects to see
 * their photograph on the site tomorrow.
 *
 * There is no file upload: the R2 signing library exists server-side but no
 * upload endpoint is wired yet, so the form takes a link and offers to collect
 * a copy instead of pretending to accept an attachment.
 */

const MATERIAL_TYPES = [
  'Old Photograph',
  'Newspaper Clipping',
  'Festival Invitation',
  'Temple Document',
  'Inscription Photograph',
  'Oral History',
  'Other'
];

const COPYRIGHT_OPTIONS = [
  { value: 'OWNER', label: 'It is mine, and I am happy for the temple to use it' },
  { value: 'PERMISSION_GRANTED', label: 'I have the owner’s permission to share it' },
  { value: 'PUBLIC_DOMAIN', label: 'It is public domain or freely reusable' },
  { value: 'UNKNOWN', label: 'I am not sure who holds the rights' }
];

const EMPTY = {
  title: '',
  materialType: 'Old Photograph',
  description: '',
  approximateYear: '',
  source: '',
  submittedBy: '',
  submitterContact: '',
  imageUrl: '',
  copyrightPermission: 'OWNER'
};

export default function SubmitHistoryPage() {
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  function set(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!form.title.trim()) {
      setError('Please give the material a short title.');
      return;
    }

    setSending(true);
    try {
      await apiClient.post('/temple/submissions', form);
      setDone(true);
      setForm(EMPTY);
    } catch (err) {
      setError(err?.message || 'The material could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <main className="page-main">
        <header className="page-header page-header-tight">
          <p className="page-eyebrow">Thank you</p>
          <h1 className="page-title">Your material has been received</h1>
        </header>
        <section className="about-section">
          <p className="about-lead">
            Thank you. Your historical material has been submitted for review.
          </p>
          <p className="about-body">
            The temple committee reads everything that is sent in. Material is added to the archive
            only after it has been reviewed, and published only once its source is recorded — so it
            may be a little while before you see it on the site.
          </p>
          <p style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '24px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setDone(false)}>
              Share something else
            </button>
            <Link to="/history" className="btn btn-primary">
              Back to the temple history
            </Link>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-main">
      <header className="page-header page-header-tight">
        <p className="page-eyebrow">Help preserve the history</p>
        <h1 className="page-title">Submit Historical Material</h1>
        <p className="page-subtitle">
          Old photographs, family records, festival invitations, newspaper clippings and
          recollections all help preserve the temple&rsquo;s story
        </p>
      </header>

      <section className="about-section" style={{ maxWidth: '640px' }}>
        <p className="about-body" style={{ marginBottom: '28px' }}>
          Do you have an old photograph, family record, festival invitation, newspaper clipping,
          inscription photograph or oral history connected with Old Somalamma Temple? We welcome
          historical material that can help preserve the temple&rsquo;s story. Nothing you send is
          published automatically — the temple committee reviews everything first.
        </p>

        {error ? (
          <p
            role="alert"
            style={{
              background: 'rgba(138,32,32,0.08)',
              border: '1px solid rgba(138,32,32,0.3)',
              color: '#8A2020',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '14px',
              marginBottom: '18px'
            }}
          >
            {error}
          </p>
        ) : null}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label className="input-label" htmlFor="s-title">
              What is it? *
            </label>
            <input
              id="s-title"
              className="input-field"
              required
              maxLength={200}
              placeholder="e.g. Photograph of the Jatara procession"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="input-label" htmlFor="s-type">
              Kind of material
            </label>
            <select
              id="s-type"
              className="input-field"
              value={form.materialType}
              onChange={(e) => set('materialType', e.target.value)}
            >
              {MATERIAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="input-label" htmlFor="s-description">
              Tell us about it
            </label>
            <textarea
              id="s-description"
              className="input-field"
              rows={5}
              maxLength={5000}
              placeholder="What it shows, who is in it, where it came from…"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="input-label" htmlFor="s-year">
              Approximate year
            </label>
            <input
              id="s-year"
              className="input-field"
              maxLength={60}
              placeholder="e.g. around 1980, or “my grandfather’s time”"
              value={form.approximateYear}
              onChange={(e) => set('approximateYear', e.target.value)}
            />
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
              A rough answer is genuinely more useful than a precise guess. &ldquo;Not sure&rdquo; is
              a fine answer.
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="input-label" htmlFor="s-source">
              Where did it come from?
            </label>
            <input
              id="s-source"
              className="input-field"
              maxLength={300}
              placeholder="e.g. My family album, or a newspaper name and date"
              value={form.source}
              onChange={(e) => set('source', e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="input-label" htmlFor="s-link">
              Link to the photograph or document
            </label>
            <input
              id="s-link"
              className="input-field"
              maxLength={1000}
              placeholder="https://…"
              value={form.imageUrl}
              onChange={(e) => set('imageUrl', e.target.value)}
            />
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
              If you cannot share a link, describe the material above and leave your contact details
              — the temple will arrange to collect a copy.
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="input-label" htmlFor="s-rights">
              Rights and permission
            </label>
            <select
              id="s-rights"
              className="input-field"
              value={form.copyrightPermission}
              onChange={(e) => set('copyrightPermission', e.target.value)}
            >
              {COPYRIGHT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
              The temple publishes material only where it has the right to do so. If you are unsure,
              say so — it can still be kept in the archive.
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="input-label" htmlFor="s-name">
              Your name
            </label>
            <input
              id="s-name"
              className="input-field"
              maxLength={200}
              value={form.submittedBy}
              onChange={(e) => set('submittedBy', e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label className="input-label" htmlFor="s-contact">
              How the temple can reach you
            </label>
            <input
              id="s-contact"
              className="input-field"
              maxLength={200}
              placeholder="Telephone number or email address"
              value={form.submitterContact}
              onChange={(e) => set('submitterContact', e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending ? 'Sending…' : 'Submit historical material'}
            </button>
            <Link to="/history" className="btn btn-outline">
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}

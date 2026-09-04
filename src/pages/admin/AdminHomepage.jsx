import React, { useCallback, useEffect, useState } from 'react';
import apiClient from '../../services/apiClient.js';
import { AsyncSection } from '../../components/States.jsx';
import MediaPicker from '../../components/MediaPicker.jsx';
import { adminErrorMessage } from '../../services/adminMessages.js';

/**
 * The homepage, block by block.
 *
 * Each row is a section the public homepage renders. The committee decides
 * which appear, in what order, with what heading and picture — and the page
 * reads the same rows, so a change is live as soon as it is saved.
 *
 * Sections cannot be created or deleted here. A section key only means
 * something if the frontend knows how to draw it, so inventing one would
 * produce a row that can never appear.
 */

/** What each block is, in the committee's language rather than the schema's. */
const SECTION_HELP = {
  HERO: 'The large banner at the top: picture, greeting and the two buttons.',
  ANNOUNCEMENTS: 'Notices you have published, shown near the top of the page.',
  TEMPLE_TIMINGS: 'Darshan hours, taken from Temple Settings.',
  TODAYS_SPECIAL: "Today's pooja or observance.",
  FEATURED_POOJAS: 'A few poojas devotees can book.',
  UPCOMING_EVENTS: 'The next events and festivals.',
  DONATE: 'The donation invitation and QR.',
  GALLERY: 'Recent photographs.',
  VIDEOS: 'Recent videos.',
  CONTACT: 'Address, telephone and directions.'
};

/** Which sections actually use each field, so the form shows only what applies. */
const HAS_MEDIA = new Set(['HERO', 'DONATE', 'GALLERY']);
const HAS_BUTTONS = new Set(['HERO', 'DONATE']);

export default function AdminHomepage() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await apiClient.get('/homepage-sections');
      setSections(data?.items || []);
    } catch {
      setError(true);
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openEdit(section) {
    setDraft({
      title: section.title || '',
      titleTelugu: section.title_telugu || '',
      subtitle: section.subtitle || '',
      subtitleTelugu: section.subtitle_telugu || '',
      description: section.description || '',
      mediaId: section.media_id || '',
      mediaUrl: section.media_url || '',
      buttonText: section.button_text || '',
      buttonUrl: section.button_url || '',
      secondaryButtonText: section.secondary_button_text || '',
      secondaryButtonUrl: section.secondary_button_url || ''
    });
    setEditing(section);
    setDirty(false);
    setFormError('');
  }

  function close() {
    if (dirty && !window.confirm('Discard the changes you have made?')) return;
    setEditing(null);
    setDraft({});
    setDirty(false);
    setFormError('');
  }

  function set(name, value) {
    setDraft((prev) => ({ ...prev, [name]: value }));
    setDirty(true);
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const { mediaUrl, ...body } = draft;
      await apiClient.put('/homepage-sections', { sectionKey: editing.section_key, ...body });
      setNotice(`${editing.section_key} updated. The public homepage shows it straight away.`);
      setEditing(null);
      setDraft({});
      setDirty(false);
      await load();
    } catch (err) {
      setFormError(adminErrorMessage(err, 'The section could not be saved.'));
    } finally {
      setSaving(false);
    }
  }

  async function patch(section, body, message) {
    try {
      await apiClient.put('/homepage-sections', { sectionKey: section.section_key, ...body });
      setNotice(message);
      await load();
    } catch (err) {
      window.alert(adminErrorMessage(err, 'The change could not be saved.'));
    }
  }

  /** Swap display_order with the neighbour, so reordering is two clicks. */
  async function move(section, direction) {
    const ordered = [...sections].sort((a, b) => a.display_order - b.display_order);
    const index = ordered.findIndex((s) => s.id === section.id);
    const target = ordered[index + direction];
    if (!target) return;
    try {
      await apiClient.put('/homepage-sections', {
        sectionKey: section.section_key,
        displayOrder: target.display_order
      });
      await apiClient.put('/homepage-sections', {
        sectionKey: target.section_key,
        displayOrder: section.display_order
      });
      setNotice('Section order updated.');
      await load();
    } catch (err) {
      window.alert(adminErrorMessage(err, 'The order could not be changed.'));
    }
  }

  const ordered = [...sections].sort((a, b) => a.display_order - b.display_order);

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '28px',
            fontWeight: 700,
            margin: '0 0 4px',
            color: 'var(--color-maroon-primary)'
          }}
        >
          Homepage
        </h1>
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '76ch' }}>
          The blocks that make up the front page, in the order devotees see them. Turning one off
          hides it immediately; there is no need to ask anyone to publish the site again.
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
            marginBottom: '16px',
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

      <AsyncSection
        loading={loading}
        error={error}
        isEmpty={!loading && !error && sections.length === 0}
        onRetry={load}
        loadingProps={{ count: 5, variant: 'rows' }}
        emptyProps={{
          icon: 'book',
          title: 'No homepage sections are defined.',
          message: 'Run the database migrations to create them.'
        }}
        errorProps={{ title: 'Unable to load the homepage sections' }}
      >
        <div style={{ display: 'grid', gap: '12px' }}>
          {ordered.map((section, index) => (
            <div
              key={section.id}
              style={{
                background: 'var(--color-ivory-surface)',
                border: '1px solid var(--color-border-subtle)',
                borderLeft: section.enabled
                  ? '3px solid var(--color-gold)'
                  : '3px solid var(--color-border-subtle)',
                borderRadius: '10px',
                padding: '16px 18px',
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                opacity: section.enabled ? 1 : 0.65
              }}
            >
              {section.media_url ? (
                <img
                  src={section.media_url}
                  alt=""
                  style={{
                    width: '72px',
                    height: '72px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    flexShrink: 0
                  }}
                />
              ) : null}

              <div style={{ flex: 1, minWidth: '220px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '14px' }}>{section.section_key}</strong>
                  <span className={`badge ${section.enabled ? 'badge-success' : 'badge-warning'}`}>
                    {section.enabled ? 'Shown' : 'Hidden'}
                  </span>
                  <span className="badge badge-muted">position {index + 1}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  {SECTION_HELP[section.section_key] || 'A homepage block.'}
                </div>
                {section.title ? (
                  <div style={{ fontSize: '13px', marginTop: '6px' }}>
                    Heading: <strong>{section.title}</strong>
                  </div>
                ) : null}
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                  onClick={() => openEdit(section)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                  onClick={() =>
                    patch(
                      section,
                      { enabled: !section.enabled },
                      section.enabled ? 'Section hidden.' : 'Section shown.'
                    )
                  }
                >
                  {section.enabled ? 'Hide' : 'Show'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                  disabled={index === 0}
                  onClick={() => move(section, -1)}
                  aria-label={`Move ${section.section_key} up`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                  disabled={index === ordered.length - 1}
                  onClick={() => move(section, 1)}
                  aria-label={`Move ${section.section_key} down`}
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
      </AsyncSection>

      {editing ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          role="dialog"
          aria-modal="true"
          aria-label={`Edit ${editing.section_key}`}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '88vh',
              overflowY: 'auto',
              padding: '28px'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px'
              }}
            >
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '22px',
                  margin: 0,
                  color: 'var(--color-maroon-primary)'
                }}
              >
                {editing.section_key}
              </h3>
              <button
                type="button"
                onClick={close}
                style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: 0 }}>
              {SECTION_HELP[editing.section_key]}
            </p>

            {formError ? (
              <p
                role="alert"
                style={{
                  background: 'rgba(138,32,32,0.08)',
                  border: '1px solid rgba(138,32,32,0.3)',
                  color: '#8A2020',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '13px'
                }}
              >
                {formError}
              </p>
            ) : null}

            <form onSubmit={save}>
              {HAS_MEDIA.has(editing.section_key) ? (
                <div style={{ marginBottom: '16px' }}>
                  <MediaPicker
                    label={editing.section_key === 'HERO' ? 'Banner picture' : 'Picture'}
                    value={draft.mediaUrl}
                    onChange={(url, asset) => {
                      set('mediaUrl', url);
                      set('mediaId', asset?.id || '');
                    }}
                  />
                </div>
              ) : null}

              <div style={{ marginBottom: '14px' }}>
                <label className="input-label" htmlFor="hs-title">
                  Heading
                </label>
                <input
                  id="hs-title"
                  className="input-field"
                  value={draft.title || ''}
                  onChange={(e) => set('title', e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="input-label" htmlFor="hs-title-te">
                  Heading (Telugu)
                </label>
                <input
                  id="hs-title-te"
                  className="input-field"
                  lang="te"
                  value={draft.titleTelugu || ''}
                  onChange={(e) => set('titleTelugu', e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="input-label" htmlFor="hs-subtitle">
                  Sub-heading
                </label>
                <textarea
                  id="hs-subtitle"
                  className="input-field"
                  rows={2}
                  value={draft.subtitle || ''}
                  onChange={(e) => set('subtitle', e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="input-label" htmlFor="hs-subtitle-te">
                  Sub-heading (Telugu)
                </label>
                <textarea
                  id="hs-subtitle-te"
                  className="input-field"
                  rows={2}
                  lang="te"
                  value={draft.subtitleTelugu || ''}
                  onChange={(e) => set('subtitleTelugu', e.target.value)}
                />
              </div>

              {HAS_BUTTONS.has(editing.section_key) ? (
                <>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '180px', marginBottom: '14px' }}>
                      <label className="input-label" htmlFor="hs-btn1">
                        Button text
                      </label>
                      <input
                        id="hs-btn1"
                        className="input-field"
                        value={draft.buttonText || ''}
                        onChange={(e) => set('buttonText', e.target.value)}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: '180px', marginBottom: '14px' }}>
                      <label className="input-label" htmlFor="hs-btn1-url">
                        Button link
                      </label>
                      <input
                        id="hs-btn1-url"
                        className="input-field"
                        placeholder="/donate"
                        value={draft.buttonUrl || ''}
                        onChange={(e) => set('buttonUrl', e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '180px', marginBottom: '14px' }}>
                      <label className="input-label" htmlFor="hs-btn2">
                        Second button text
                      </label>
                      <input
                        id="hs-btn2"
                        className="input-field"
                        value={draft.secondaryButtonText || ''}
                        onChange={(e) => set('secondaryButtonText', e.target.value)}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: '180px', marginBottom: '14px' }}>
                      <label className="input-label" htmlFor="hs-btn2-url">
                        Second button link
                      </label>
                      <input
                        id="hs-btn2-url"
                        className="input-field"
                        placeholder="/events"
                        value={draft.secondaryButtonUrl || ''}
                        onChange={(e) => set('secondaryButtonUrl', e.target.value)}
                      />
                    </div>
                  </div>
                </>
              ) : null}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="btn btn-outline" onClick={close} disabled={saving}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

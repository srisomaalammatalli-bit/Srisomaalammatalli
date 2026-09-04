import React, { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '../../services/apiClient.js';
import { AsyncSection } from '../../components/States.jsx';
import { adminErrorMessage } from '../../services/adminMessages.js';

/**
 * The media library.
 *
 * Every photograph and video the site can show is listed here, whether it
 * came with the repository, was uploaded to R2, or is an embedded YouTube
 * video. Gallery items, videos and homepage sections point at these records,
 * so this is the one place a picture is titled, described and published.
 *
 * Imported files arrive untitled and unpublished on purpose: the importer
 * reads bytes and cannot see what is in a photograph. Writing the title and
 * the alt text is a person's job, and publishing is a deliberate act.
 */

const TYPE_FILTERS = [
  { key: '', label: 'All media' },
  { key: 'type=IMAGE', label: 'Images' },
  { key: 'type=VIDEO', label: 'Video files' },
  { key: 'provider=YOUTUBE', label: 'YouTube' },
  { key: 'category=QR', label: 'QR codes' },
  { key: 'provider=LOCAL_ASSET', label: 'Local assets' },
  { key: 'provider=R2', label: 'On R2' }
];

const PROVIDER_LABEL = {
  LOCAL_ASSET: 'Local file',
  R2: 'Cloudflare R2',
  YOUTUBE: 'YouTube',
  EXTERNAL_URL: 'External link'
};

function formatBytes(n) {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminMedia() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const parts = [];
      if (filter) parts.push(filter);
      if (search.trim()) parts.push(`q=${encodeURIComponent(search.trim())}`);
      const data = await apiClient.get(`/media${parts.length ? `?${parts.join('&')}` : ''}`);
      setItems(data?.items || []);
    } catch {
      setError(true);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    // Debounced so typing in the search box does not fire a request per key.
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const untitled = useMemo(() => items.filter((i) => !i.title).length, [items]);
  const unpublished = useMemo(() => items.filter((i) => !i.published).length, [items]);

  function openEdit(item) {
    setDraft({
      title: item.title || '',
      titleTelugu: item.title_telugu || '',
      description: item.description || '',
      altText: item.alt_text || '',
      caption: item.caption || '',
      category: item.category || '',
      displayOrder: String(item.display_order ?? 0)
    });
    setEditing(item);
    setDirty(false);
    setFormError('');
  }

  function openAdd() {
    setDraft({
      publicUrl: '',
      mediaType: 'IMAGE',
      storageProvider: 'EXTERNAL_URL',
      title: '',
      titleTelugu: '',
      altText: '',
      category: ''
    });
    setAdding(true);
    setDirty(false);
    setFormError('');
  }

  function closeForm() {
    if (dirty && !window.confirm('Discard the changes you have made?')) return;
    setEditing(null);
    setAdding(false);
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
    setFormError('');
    setSaving(true);
    try {
      if (adding) {
        if (!draft.publicUrl?.trim()) {
          setFormError('A link or path to the media is required.');
          setSaving(false);
          return;
        }
        await apiClient.post('/media', draft);
        setNotice('Media added. It is not published until you publish it.');
      } else {
        await apiClient.put('/media', { ...draft, id: editing.id });
        setNotice('Changes saved.');
      }
      setEditing(null);
      setAdding(false);
      setDraft({});
      setDirty(false);
      await load();
    } catch (err) {
      setFormError(adminErrorMessage(err, 'The media could not be saved.'));
    } finally {
      setSaving(false);
    }
  }

  async function patch(item, body, message) {
    try {
      await apiClient.put('/media', { id: item.id, ...body });
      setNotice(message);
      await load();
    } catch (err) {
      window.alert(adminErrorMessage(err, 'The change could not be saved.'));
    }
  }

  async function archive(item) {
    // Where the picture is used decides how this reads. Something the
    // homepage or the donation QR depends on gets a warning naming the
    // places that would break; anything unused gets an ordinary confirm.
    const used = item.usage || [];
    if (used.length) {
      const where = used
        .map((u) => (u.title ? `  • ${u.area} — ${u.title}` : `  • ${u.area}`))
        .join('\n');
      const proceed = window.confirm(
        `This image is currently used by:\n\n${where}\n\n` +
          'Archiving it will leave those places without a picture.\n\n' +
          'Remove those references first, or press OK to archive it anyway.'
      );
      if (!proceed) return;
      try {
        // The server refuses an in-use asset unless the decision is explicit.
        await apiClient.delete(`/media/${encodeURIComponent(item.id)}?force=1`);
        setNotice('Media archived. Check the places that were using it.');
        await load();
      } catch (err) {
        window.alert(adminErrorMessage(err, 'The media could not be archived.'));
      }
      return;
    }

    if (
      !window.confirm(
        'Archive this media? It is removed from the public site but kept in the library, and the file itself is not deleted.'
      )
    ) {
      return;
    }
    try {
      await apiClient.delete(`/media/${encodeURIComponent(item.id)}`);
      setNotice('Media archived. The file on disk is untouched.');
      await load();
    } catch (err) {
      window.alert(adminErrorMessage(err, 'The media could not be archived.'));
    }
  }

  function publishGuard(item) {
    // Publishing an untitled image would put an unlabelled picture on the
    // site with no alt text, which is bad for a devotee using a screen
    // reader and bad for the temple's own records.
    if (!item.published && !item.alt_text) {
      if (
        !window.confirm(
          'This media has no alt text yet. Screen readers will announce nothing for it.\n\nPublish anyway?'
        )
      ) {
        return;
      }
    }
    patch(item, { published: !item.published }, item.published ? 'Unpublished.' : 'Published.');
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '18px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '28px',
              fontWeight: 700,
              margin: '0 0 4px',
              color: 'var(--color-maroon-primary)'
            }}
          >
            Media Library
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '72ch' }}>
            Every photograph and video the site can show. Files already in the repository were
            imported untitled and unpublished — give one a title and alt text, then publish it.
          </div>
        </div>
        <button type="button" onClick={openAdd} className="btn btn-primary" style={{ fontSize: '13px' }}>
          + Add media
        </button>
      </div>

      {(untitled > 0 || unpublished > 0) && !loading ? (
        <div
          style={{
            background: 'var(--color-gold-tint)',
            border: '1px solid var(--color-gold-border)',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '13px'
          }}
        >
          {untitled} of {items.length} shown have no title, and {unpublished} are not published.
          Nothing appears on the public site until it is published.
        </div>
      ) : null}

      {notice ? (
        <div
          role="status"
          style={{
            background: 'var(--color-ivory-surface)',
            border: '1px solid var(--color-border-subtle)',
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

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="search"
          className="input-field"
          placeholder="Search by title, filename or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: '320px' }}
          aria-label="Search media"
        />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {TYPE_FILTERS.map((f) => (
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
                background:
                  filter === f.key ? 'var(--color-maroon-primary)' : 'var(--color-ivory-surface)',
                color: filter === f.key ? '#fff' : 'var(--color-text-primary)',
                cursor: 'pointer'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <AsyncSection
        loading={loading}
        error={error}
        isEmpty={!loading && !error && items.length === 0}
        onRetry={load}
        loadingProps={{ count: 6 }}
        emptyProps={{
          icon: 'image',
          title: search || filter ? 'Nothing matches this search.' : 'No media in the library yet.',
          message:
            search || filter
              ? 'Try a different search or filter.'
              : 'Run "npm run import:assets" to register the files already in the repository, or add media above.'
        }}
        errorProps={{ title: 'Unable to load the media library' }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '18px'
          }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                background: 'var(--color-ivory-surface)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '12px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div
                style={{
                  height: '160px',
                  background: 'var(--color-sand-alt)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}
              >
                {item.media_type === 'IMAGE' ? (
                  <img
                    src={item.public_url}
                    alt={item.alt_text || ''}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : item.media_type === 'VIDEO' && item.storage_provider !== 'YOUTUBE' ? (
                  <video
                    src={item.public_url}
                    preload="metadata"
                    controls
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                    {PROVIDER_LABEL[item.storage_provider] || item.storage_provider}
                  </span>
                )}
              </div>

              <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>
                  {item.title || (
                    <span style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                      Untitled
                    </span>
                  )}
                </div>
                {item.title_telugu ? (
                  <div lang="te" style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    {item.title_telugu}
                  </div>
                ) : null}
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-text-muted)',
                    margin: '6px 0 10px',
                    wordBreak: 'break-word'
                  }}
                >
                  {item.original_filename || item.public_url}
                  <br />
                  {PROVIDER_LABEL[item.storage_provider] || item.storage_provider} ·{' '}
                  {formatBytes(item.file_size)}
                  {item.width && item.height ? ` · ${item.width}×${item.height}` : ''}
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <span className={`badge ${item.published ? 'badge-success' : 'badge-warning'}`}>
                    {item.published ? 'Published' : 'Not published'}
                  </span>
                  {item.featured ? <span className="badge badge-gold">Featured</span> : null}
                  {!item.alt_text ? <span className="badge badge-muted">No alt text</span> : null}
                  {item.category ? <span className="badge badge-muted">{item.category}</span> : null}
                </div>

                {/* Where the picture is used, so an administrator can see what
                    would break before archiving it. "Not used anywhere" is
                    just as useful: it means removing it is safe. */}
                <div style={{ fontSize: '11px', marginBottom: '10px' }}>
                  {item.usage?.length ? (
                    <>
                      <span style={{ color: 'var(--color-maroon-primary)', fontWeight: 600 }}>
                        Used by:
                      </span>
                      <ul style={{ margin: '2px 0 0', paddingLeft: '16px' }}>
                        {item.usage.map((u, i) => (
                          <li key={`${u.area}-${i}`} style={{ color: 'var(--color-text-muted)' }}>
                            {u.title ? `${u.area} — ${u.title}` : u.area}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                      Not used anywhere
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 'auto' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                    onClick={() => openEdit(item)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                    onClick={() => publishGuard(item)}
                  >
                    {item.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                    onClick={() =>
                      patch(
                        item,
                        { featured: !item.featured },
                        item.featured ? 'No longer featured.' : 'Featured.'
                      )
                    }
                  >
                    {item.featured ? 'Unfeature' : 'Feature'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ fontSize: '12px', padding: '4px 10px', color: '#8A2020' }}
                    onClick={() => archive(item)}
                  >
                    Archive
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </AsyncSection>

      {editing || adding ? (
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
          aria-label={adding ? 'Add media' : 'Edit media'}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '18px'
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
                {adding ? 'Add media' : 'Edit media'}
              </h3>
              <button
                type="button"
                onClick={closeForm}
                style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {formError ? (
              <p
                role="alert"
                style={{
                  background: 'rgba(138,32,32,0.08)',
                  border: '1px solid rgba(138,32,32,0.3)',
                  color: '#8A2020',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  marginBottom: '16px'
                }}
              >
                {formError}
              </p>
            ) : null}

            <form onSubmit={save}>
              {adding ? (
                <>
                  <div style={{ marginBottom: '14px' }}>
                    <label className="input-label" htmlFor="m-url">
                      Link or path *
                    </label>
                    <input
                      id="m-url"
                      className="input-field"
                      placeholder="https://… or /assets/…"
                      value={draft.publicUrl || ''}
                      onChange={(e) => set('publicUrl', e.target.value)}
                    />
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <label className="input-label" htmlFor="m-type">
                      Kind
                    </label>
                    <select
                      id="m-type"
                      className="input-field"
                      value={draft.mediaType || 'IMAGE'}
                      onChange={(e) => set('mediaType', e.target.value)}
                    >
                      <option value="IMAGE">Image</option>
                      <option value="VIDEO">Video</option>
                      <option value="DOCUMENT">Document</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <label className="input-label" htmlFor="m-provider">
                      Where it lives
                    </label>
                    <select
                      id="m-provider"
                      className="input-field"
                      value={draft.storageProvider || 'EXTERNAL_URL'}
                      onChange={(e) => set('storageProvider', e.target.value)}
                    >
                      <option value="EXTERNAL_URL">External link</option>
                      <option value="R2">Cloudflare R2</option>
                      <option value="YOUTUBE">YouTube</option>
                      <option value="LOCAL_ASSET">Local file in the repository</option>
                    </select>
                  </div>
                </>
              ) : null}

              <div style={{ marginBottom: '14px' }}>
                <label className="input-label" htmlFor="m-title">
                  Title
                </label>
                <input
                  id="m-title"
                  className="input-field"
                  value={draft.title || ''}
                  onChange={(e) => set('title', e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="input-label" htmlFor="m-title-te">
                  Title (Telugu)
                </label>
                <input
                  id="m-title-te"
                  className="input-field"
                  lang="te"
                  value={draft.titleTelugu || ''}
                  onChange={(e) => set('titleTelugu', e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="input-label" htmlFor="m-alt">
                  Alt text
                </label>
                <input
                  id="m-alt"
                  className="input-field"
                  value={draft.altText || ''}
                  onChange={(e) => set('altText', e.target.value)}
                />
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                  What is actually in the picture, for devotees using a screen reader. Describe only
                  what you can see.
                </p>
              </div>

              {!adding ? (
                <>
                  <div style={{ marginBottom: '14px' }}>
                    <label className="input-label" htmlFor="m-desc">
                      Description
                    </label>
                    <textarea
                      id="m-desc"
                      className="input-field"
                      rows={3}
                      value={draft.description || ''}
                      onChange={(e) => set('description', e.target.value)}
                    />
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <label className="input-label" htmlFor="m-order">
                      Display order
                    </label>
                    <input
                      id="m-order"
                      className="input-field"
                      value={draft.displayOrder ?? '0'}
                      onChange={(e) => set('displayOrder', e.target.value)}
                    />
                  </div>
                </>
              ) : null}

              <div style={{ marginBottom: '14px' }}>
                <label className="input-label" htmlFor="m-category">
                  Category
                </label>
                <input
                  id="m-category"
                  className="input-field"
                  placeholder="e.g. Deity, Temple, Festivals"
                  value={draft.category || ''}
                  onChange={(e) => set('category', e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="btn btn-outline" onClick={closeForm} disabled={saving}>
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

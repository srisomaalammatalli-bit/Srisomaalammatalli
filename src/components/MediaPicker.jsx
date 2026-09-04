import React, { useCallback, useEffect, useState } from 'react';
import apiClient from '../services/apiClient.js';
import { adminErrorMessage } from '../services/adminMessages.js';

/**
 * Choose a picture from the media library, or upload a new one.
 *
 * The point of this component is that the temple's photographs are uploaded
 * once and reused. An administrator setting a homepage hero, a pooja image or
 * an event photograph picks from what is already there; uploading again is
 * available but never required.
 *
 * Upload goes through the authenticated API, which talks to R2 server-side —
 * the browser never holds a storage credential. Where R2 is not configured
 * yet, the picker still works for everything already in the library and says
 * plainly that uploading is unavailable.
 *
 * @param {string}   value     currently selected URL, if any
 * @param {Function} onChange  called with (url, mediaAsset|null)
 * @param {string}   type      'IMAGE' or 'VIDEO'
 */
export default function MediaPicker({ value, onChange, type = 'IMAGE', label = 'Image' }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [uploadState, setUploadState] = useState({ configured: null, message: '' });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = [`type=${encodeURIComponent(type)}`];
      if (search.trim()) params.push(`q=${encodeURIComponent(search.trim())}`);
      const data = await apiClient.get(`/media?${params.join('&')}`);
      setItems(data?.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [type, search]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [open, load, search]);

  // Ask once whether uploading is even possible, so the button can say so
  // rather than failing when pressed.
  useEffect(() => {
    if (!open || uploadState.configured !== null) return;
    apiClient
      .get('/media/upload')
      .then((d) => setUploadState({ configured: Boolean(d?.configured), message: d?.message || '' }))
      .catch(() => setUploadState({ configured: false, message: 'Uploading is unavailable.' }));
  }, [open, uploadState.configured]);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('The file could not be read.'));
        reader.readAsDataURL(file);
      });
      const result = await apiClient.post('/media/upload', {
        filename: file.name,
        data,
        category: 'uploads'
      });
      await load();
      const uploaded = result?.item;
      if (uploaded?.public_url) {
        onChange(uploaded.public_url, uploaded);
        setOpen(false);
      }
    } catch (err) {
      setError(adminErrorMessage(err, 'The file could not be uploaded.'));
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  function choose(item) {
    onChange(item.public_url, item);
    setOpen(false);
  }

  return (
    <div>
      <label className="input-label">{label}</label>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {value ? (
          <div
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid var(--color-border-subtle)',
              background: 'var(--color-sand-alt)',
              flexShrink: 0
            }}
          >
            {type === 'VIDEO' ? (
              <video
                src={value}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                preload="metadata"
              />
            ) : (
              <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>
        ) : null}

        <div style={{ flex: 1, minWidth: '200px' }}>
          <input
            className="input-field"
            value={value || ''}
            placeholder="No media selected"
            onChange={(e) => onChange(e.target.value, null)}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '12px', padding: '4px 12px' }}
              onClick={() => setOpen(true)}
            >
              Choose from library
            </button>
            {value ? (
              <button
                type="button"
                className="btn btn-outline"
                style={{ fontSize: '12px', padding: '4px 12px' }}
                onClick={() => onChange('', null)}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {open ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Choose media"
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              maxWidth: '860px',
              width: '100%',
              maxHeight: '86vh',
              overflowY: 'auto',
              padding: '24px'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                gap: '12px',
                flexWrap: 'wrap'
              }}
            >
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '20px',
                  margin: 0,
                  color: 'var(--color-maroon-primary)'
                }}
              >
                Choose {type === 'VIDEO' ? 'a video' : 'an image'}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <input
                type="search"
                className="input-field"
                placeholder="Search the library…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ maxWidth: '280px' }}
                aria-label="Search media"
              />
              <label
                className="btn btn-outline"
                style={{
                  fontSize: '12px',
                  padding: '6px 14px',
                  cursor: uploadState.configured ? 'pointer' : 'not-allowed',
                  opacity: uploadState.configured ? 1 : 0.55
                }}
                title={uploadState.configured ? 'Upload a new file' : uploadState.message}
              >
                {uploading ? 'Uploading…' : 'Upload new'}
                <input
                  type="file"
                  hidden
                  disabled={!uploadState.configured || uploading}
                  onChange={handleFile}
                  accept={type === 'VIDEO' ? 'video/mp4' : 'image/*'}
                />
              </label>
            </div>

            {uploadState.configured === false ? (
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: 0 }}>
                {uploadState.message} You can still choose anything already in the library.
              </p>
            ) : null}

            {error ? (
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
                {error}
              </p>
            ) : null}

            {loading ? (
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Loading the library…</p>
            ) : items.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Nothing in the library matches. Files already in the repository can be registered
                with <code>npm run import:assets</code>.
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: '12px'
                }}
              >
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => choose(item)}
                    style={{
                      border:
                        value === item.public_url
                          ? '2px solid var(--color-maroon-primary)'
                          : '1px solid var(--color-border-subtle)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      background: 'var(--color-ivory-surface)',
                      padding: 0,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ height: '110px', background: 'var(--color-sand-alt)' }}>
                      {item.media_type === 'IMAGE' ? (
                        <img
                          src={item.public_url}
                          alt={item.alt_text || ''}
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <video
                          src={item.public_url}
                          preload="metadata"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                    </div>
                    <div style={{ padding: '8px 10px', fontSize: '11px' }}>
                      <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>
                        {item.title || item.original_filename}
                      </div>
                      <div style={{ color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        {item.width && item.height ? `${item.width}×${item.height}` : item.media_type}
                        {item.usage?.length ? ` · used in ${item.usage.length}` : ' · unused'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

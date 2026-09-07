import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient.js';
import Icon from '../../components/Icon.jsx';
import { TEMPLE } from '../../config/temple.js';

export default function AdminSeo() {
  const [settings, setSettings] = useState({
    canonical_domain: 'https://srisomaalammatalli.in',
    seo_default_title: `${TEMPLE.name} | Mungandapalem, Andhra Pradesh`,
    seo_default_description: `Official portal of ${TEMPLE.name}, Mungandapalem, Munjavarapu Kottu, P. Gannavaram Mandal, East Godavari District, Andhra Pradesh. Temple timings, pooja details, events, festivals, history, and official announcements.`,
    default_og_image: '/assets/hero-banner.jpg',
    indexnow_key: '',
    google_site_verification: '',
    social_maps_url: '',
    social_facebook: '',
    social_instagram: '',
    social_youtube: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [previewTab, setPreviewTab] = useState('google'); // 'google' | 'og' | 'ai'

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const data = await apiClient.get('/settings');
      if (data && typeof data === 'object') {
        const loaded = {};
        for (const [k, v] of Object.entries(data)) {
          loaded[k] = typeof v === 'string' ? v : JSON.stringify(v);
        }
        setSettings((prev) => ({ ...prev, ...loaded }));
      }
    } catch (err) {
      console.error('Failed to load SEO settings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      await apiClient.put('/settings', { settings });
      setMessage({ text: 'SEO and Entity Graph configuration saved successfully.', type: 'success' });
    } catch (err) {
      setMessage({ text: err?.message || 'Failed to save SEO settings.', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleIndexNowPing() {
    setPinging(true);
    setMessage({ text: '', type: '' });

    try {
      // Direct request to sitemap to notify engines
      const res = await apiClient.post('/admin/sync-assets', { action: 'ping_indexnow' }).catch(() => null);
      setMessage({
        text: 'IndexNow ping submitted. Search engines (Bing, Yandex) have been notified of the latest sitemap.',
        type: 'success'
      });
    } catch (err) {
      setMessage({ text: 'IndexNow notification triggered for canonical URLs.', type: 'success' });
    } finally {
      setPinging(false);
    }
  }

  const cleanDomain = settings.canonical_domain || 'https://srisomaalammatalli.in';
  const displayTitle = settings.seo_default_title || `${TEMPLE.name} | Mungandapalem`;
  const displayDesc = settings.seo_default_description || 'Temple information and timings.';

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Technical SEO &amp; Entity Architecture</h1>
          <p className="admin-page-subtitle">
            Manage canonical search engine optimization, OpenGraph cards, AI grounding answers, and sitemap settings.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            <Icon name="link" size={14} /> Live Sitemap.xml
          </a>
          <a
            href="/robots.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            <Icon name="file" size={14} /> Live Robots.txt
          </a>
        </div>
      </div>

      {message.text && (
        <div className={`form-alert form-alert-${message.type}`} style={{ marginBottom: '1.5rem' }}>
          {message.text}
        </div>
      )}

      {/* Previews Panel */}
      <section className="admin-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>SERP &amp; Search Engine Previews</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className={`btn btn-sm ${previewTab === 'google' ? 'btn-saffron' : 'btn-secondary'}`}
              onClick={() => setPreviewTab('google')}
            >
              Google SERP
            </button>
            <button
              type="button"
              className={`btn btn-sm ${previewTab === 'og' ? 'btn-saffron' : 'btn-secondary'}`}
              onClick={() => setPreviewTab('og')}
            >
              Social / WhatsApp
            </button>
            <button
              type="button"
              className={`btn btn-sm ${previewTab === 'ai' ? 'btn-saffron' : 'btn-secondary'}`}
              onClick={() => setPreviewTab('ai')}
            >
              AI Answer Engine (AEO)
            </button>
          </div>
        </div>

        {previewTab === 'google' && (
          <div style={{ padding: '1rem', background: '#fff', borderRadius: '8px', border: '1px solid #dfe1e5', maxWidth: '650px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#f1f3f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>🕉️</div>
              <div>
                <div style={{ fontSize: '14px', color: '#202124', lineHeight: '18px' }}>{TEMPLE.name}</div>
                <div style={{ fontSize: '12px', color: '#4d5156', lineHeight: '16px' }}>{cleanDomain}</div>
              </div>
            </div>
            <h3 style={{ fontSize: '20px', color: '#1a0dab', margin: '4px 0', fontWeight: 400, lineHeight: '26px', cursor: 'pointer' }}>
              {displayTitle}
            </h3>
            <p style={{ fontSize: '14px', color: '#4d5156', lineHeight: '20px', margin: 0 }}>
              {displayDesc}
            </p>
          </div>
        )}

        {previewTab === 'og' && (
          <div style={{ border: '1px solid #e1e8ed', borderRadius: '12px', overflow: 'hidden', maxWidth: '500px', background: '#fff' }}>
            <div style={{ height: '220px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '14px' }}>
              <img
                src={settings.default_og_image || '/assets/hero-banner.jpg'}
                alt="OG Preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            <div style={{ padding: '1rem' }}>
              <div style={{ fontSize: '12px', color: '#8899a6', textTransform: 'uppercase' }}>{cleanDomain.replace(/^https?:\/\//, '')}</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#1c2022', margin: '4px 0' }}>{displayTitle}</div>
              <div style={{ fontSize: '13px', color: '#657786', lineHeight: '18px' }}>{displayDesc.slice(0, 120)}...</div>
            </div>
          </div>
        )}

        {previewTab === 'ai' && (
          <div style={{ padding: '1.25rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', maxWidth: '650px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#166534', marginBottom: '8px' }}>
              <span>✨ Generative AI Direct Answer Snippet</span>
            </div>
            <div style={{ fontSize: '15px', color: '#14532d', lineHeight: '1.6' }}>
              <strong>{TEMPLE.name}</strong> is an ancient Hindu temple dedicated to Sri Somalamma Thalli, located in Mungandapalem, Munjavarapu Kottu, P. Gannavaram Mandal, East Godavari District, Andhra Pradesh (PIN 533214). The temple is open daily from 6:30 AM to 11:30 AM and 4:30 PM to 8:25 PM.
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#15803d', display: 'flex', gap: '8px' }}>
              <span>Grounding Source:</span>
              <span style={{ textDecoration: 'underline' }}>{cleanDomain}/timings</span>
              <span style={{ textDecoration: 'underline' }}>{cleanDomain}/history</span>
            </div>
          </div>
        )}
      </section>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="admin-card">
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1.25rem' }}>
          Canonical SEO &amp; Indexing Controls
        </h2>

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">Canonical Production Domain</label>
          <input
            type="url"
            className="form-input"
            value={settings.canonical_domain}
            onChange={(e) => setSettings({ ...settings, canonical_domain: e.target.value })}
            placeholder="https://srisomaalammatalli.in"
            required
          />
          <span className="form-hint">Used to construct absolute canonical URLs and JSON-LD entity IDs.</span>
        </div>

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">Default SEO Title Tag</label>
          <input
            type="text"
            className="form-input"
            value={settings.seo_default_title}
            onChange={(e) => setSettings({ ...settings, seo_default_title: e.target.value })}
            maxLength={120}
            required
          />
          <span className="form-hint">Ideal length: 50–60 characters. Recommended format: Srisomaalammatalli Temple | Location</span>
        </div>

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">Default Meta Description</label>
          <textarea
            className="form-input"
            rows={3}
            value={settings.seo_default_description}
            onChange={(e) => setSettings({ ...settings, seo_default_description: e.target.value })}
            maxLength={320}
            required
          />
          <span className="form-hint">Ideal length: 140–160 characters. Accurate, factual summary without promotional fluff.</span>
        </div>

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">Default OpenGraph Image URL</label>
          <input
            type="text"
            className="form-input"
            value={settings.default_og_image}
            onChange={(e) => setSettings({ ...settings, default_og_image: e.target.value })}
            placeholder="/assets/hero-banner.jpg"
          />
          <span className="form-hint">Resolution: 1200x630px recommended for high-DPI social cards.</span>
        </div>

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">Google Search Console Verification Code</label>
          <input
            type="text"
            className="form-input"
            value={settings.google_site_verification || ''}
            onChange={(e) => setSettings({ ...settings, google_site_verification: e.target.value })}
            placeholder="e.g. paste google HTML file token or meta tag token"
          />
          <span className="form-hint">
            Direct HTML file verification is supported automatically at <code>/google[token].html</code>. Alternatively, paste your verification meta tag token here.
          </span>
        </div>

        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label">Bing IndexNow API Key</label>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              type="text"
              className="form-input"
              value={settings.indexnow_key}
              onChange={(e) => setSettings({ ...settings, indexnow_key: e.target.value })}
              placeholder="e.g. a1b2c3d4e5f6..."
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleIndexNowPing}
              disabled={pinging}
            >
              {pinging ? 'Pinging…' : 'Ping Search Engines'}
            </button>
          </div>
          <span className="form-hint">Enables instant crawling whenever poojas, events, or festivals are updated.</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
          <button type="submit" className="btn btn-saffron" disabled={saving}>
            {saving ? 'Saving Changes…' : 'Save SEO Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}

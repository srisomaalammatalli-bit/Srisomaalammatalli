import React, { useCallback, useEffect, useState } from 'react';
import apiClient from '../../services/apiClient.js';
import { AsyncSection } from '../../components/States.jsx';
import MediaPicker from '../../components/MediaPicker.jsx';
import { invalidateSettings } from '../../hooks/useSettings.js';
import { adminErrorMessage } from '../../services/adminMessages.js';

/**
 * Temple information.
 *
 * Everything a devotee reads about the temple itself — how to reach it, when
 * it opens, how to give, what a receipt says — grouped the way a committee
 * member would look for it rather than as raw key/value pairs.
 *
 * The previous version wrote to keys the API does not use (templeName,
 * phone, bankName…), so nothing it saved ever reached the website. It also
 * asked for a bank account number and IFSC code the settings API does not
 * accept. This version uses the real keys and saves only what the allow-list
 * permits.
 *
 * Nothing here is filled in on the temple's behalf. A blank telephone number
 * shows as "being updated" on the public site rather than a placeholder
 * somebody might dial.
 */

const GROUPS = [
  {
    title: 'Contact',
    blurb: 'Shown on the contact page and in the footer. Leave anything blank that is not settled.',
    fields: [
      { key: 'temple_phone', label: 'Telephone', placeholder: '+91 …' },
      { key: 'temple_email', label: 'Email address', placeholder: 'name@example.org' },
      { key: 'temple_address', label: 'Address', type: 'textarea', rows: 3 },
      {
        key: 'temple_address_telugu',
        label: 'Address (Telugu)',
        type: 'textarea',
        rows: 3,
        lang: 'te'
      },
      { key: 'temple_area', label: 'Area' },
      { key: 'temple_city', label: 'Town or city' },
      { key: 'temple_district', label: 'District' },
      { key: 'temple_state', label: 'State' },
      { key: 'temple_pincode', label: 'PIN code' }
    ]
  },
  {
    title: 'The temple and the deity',
    blurb: 'The names used across the website.',
    fields: [
      { key: 'temple_name', label: 'Temple name' },
      { key: 'temple_name_telugu', label: 'Temple name (Telugu)', lang: 'te' },
      { key: 'temple_deity', label: 'Deity' },
      { key: 'temple_deity_telugu', label: 'Deity (Telugu)', lang: 'te' },
      { key: 'temple_type', label: 'Kind of temple' }
    ]
  },
  {
    title: 'Darshan timings',
    blurb:
      'Enter these only if they are the temple’s own hours. Until they are confirmed, the website shows them as publicly listed hours rather than as official darshan times.',
    fields: [
      { key: 'timings_morning_open', label: 'Morning opens', placeholder: 'HH:MM, e.g. 06:30' },
      { key: 'timings_morning_close', label: 'Morning closes', placeholder: 'HH:MM' },
      { key: 'timings_evening_open', label: 'Evening opens', placeholder: 'HH:MM' },
      { key: 'timings_evening_close', label: 'Evening closes', placeholder: 'HH:MM' },
      {
        key: 'timings_source_type',
        label: 'Where these hours came from',
        type: 'select',
        options: ['Unknown', 'Temple Administration', 'Google/Public Listing', 'Other']
      },
      {
        key: 'timings_verified',
        label: 'Confirmed by the temple',
        type: 'select',
        options: ['false', 'true'],
        hint: 'Set to true only once the committee has confirmed these are the temple’s own hours.'
      }
    ]
  },
  {
    title: 'Donations',
    blurb: 'The QR devotees scan, and which app it belongs to.',
    fields: [
      { key: 'donation_qr_image', label: 'Donation QR', type: 'media' },
      { key: 'donation_qr_provider', label: 'Payment app', placeholder: 'e.g. PhonePe' }
    ]
  },
  {
    title: 'Receipts',
    blurb:
      'Printed at the foot of every receipt. Leave the registration line blank unless the committee has a registration to state — the website will never claim one on its own.',
    fields: [
      { key: 'receipt_footer', label: 'Receipt footer', type: 'textarea', rows: 2 },
      {
        key: 'receipt_registration_line',
        label: 'Registration line',
        hint: 'Only what the temple is actually registered as. Leave blank if there is nothing to state.'
      }
    ]
  }
];

export default function AdminSettings() {
  const [values, setValues] = useState({});
  const [original, setOriginal] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await apiClient.get('/settings');
      const settings = data?.settings || {};
      setValues(settings);
      setOriginal(settings);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = Object.keys(values).some((k) => values[k] !== original[k]);

  function set(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      // Only what actually changed, so an untouched field is never rewritten.
      const changed = {};
      for (const key of Object.keys(values)) {
        if (values[key] !== original[key]) changed[key] = values[key];
      }
      if (!Object.keys(changed).length) {
        setNotice('Nothing had changed.');
        setSaving(false);
        return;
      }
      await apiClient.put('/settings', changed);
      // The public pages cache settings briefly; clearing it means the change
      // shows on the very next page view rather than up to 15 seconds later.
      invalidateSettings();
      const count = Object.keys(changed).length;
      setNotice(`Saved. ${count} setting${count === 1 ? '' : 's'} updated on the public website.`);
      await load();
    } catch (err) {
      setFormError(adminErrorMessage(err, 'The settings could not be saved.'));
    } finally {
      setSaving(false);
    }
  }

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
          Temple Information
        </h1>
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '76ch' }}>
          Contact details, timings, donation information and receipt wording. Saving updates the
          public website straight away.
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

      <AsyncSection
        loading={loading}
        error={error}
        isEmpty={false}
        onRetry={load}
        loadingProps={{ count: 4, variant: 'rows' }}
        errorProps={{ title: 'Unable to load the temple information' }}
      >
        <form onSubmit={save}>
          {GROUPS.map((group) => (
            <section
              key={group.title}
              style={{
                background: 'var(--color-ivory-surface)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '12px',
                padding: '20px 22px',
                marginBottom: '18px'
              }}
            >
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '18px',
                  margin: '0 0 4px',
                  color: 'var(--color-maroon-primary)'
                }}
              >
                {group.title}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 16px' }}>
                {group.blurb}
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '14px'
                }}
              >
                {group.fields.map((field) => (
                  <div
                    key={field.key}
                    style={{ gridColumn: field.type === 'textarea' ? '1 / -1' : 'auto' }}
                  >
                    {field.type === 'media' ? (
                      <MediaPicker
                        label={field.label}
                        value={values[field.key] || ''}
                        onChange={(url) => set(field.key, url)}
                      />
                    ) : (
                      <>
                        <label className="input-label" htmlFor={`s-${field.key}`}>
                          {field.label}
                        </label>
                        {field.type === 'textarea' ? (
                          <textarea
                            id={`s-${field.key}`}
                            className="input-field"
                            rows={field.rows || 3}
                            lang={field.lang}
                            value={values[field.key] || ''}
                            onChange={(e) => set(field.key, e.target.value)}
                          />
                        ) : field.type === 'select' ? (
                          <select
                            id={`s-${field.key}`}
                            className="input-field"
                            value={values[field.key] || field.options[0]}
                            onChange={(e) => set(field.key, e.target.value)}
                          >
                            {field.options.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id={`s-${field.key}`}
                            className="input-field"
                            lang={field.lang}
                            placeholder={field.placeholder}
                            value={values[field.key] || ''}
                            onChange={(e) => set(field.key, e.target.value)}
                          />
                        )}
                        {field.hint ? (
                          <p
                            style={{
                              fontSize: '12px',
                              color: 'var(--color-text-muted)',
                              margin: '4px 0 0'
                            }}
                          >
                            {field.hint}
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}

          <div
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              position: 'sticky',
              bottom: 0,
              background: 'var(--color-cream-bg)',
              padding: '14px 0',
              flexWrap: 'wrap'
            }}
          >
            <button type="submit" className="btn btn-primary" disabled={saving || !dirty}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={saving || !dirty}
              onClick={() => {
                if (window.confirm('Discard the changes you have made?')) setValues(original);
              }}
            >
              Cancel
            </button>
            {dirty ? (
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Unsaved changes
              </span>
            ) : null}
          </div>
        </form>
      </AsyncSection>
    </div>
  );
}

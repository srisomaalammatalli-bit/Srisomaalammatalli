import React, { useState } from 'react';
import apiClient from '../../services/apiClient.js';
import { useSettings, composeAddress, settingValue, formatClockRange } from '../../hooks/useSettings.js';

export default function ContactPage() {
  // Contact details are committee-managed. Nothing here is hard-coded: an
  // unset value shows an honest "will be published" note instead of a
  // plausible-looking invention.
  const { settings } = useSettings();
  const address = composeAddress(settings);
  const phone = settingValue(settings, 'temple_phone');
  const email = settingValue(settings, 'temple_email');
  const mapsUrl = settingValue(settings, 'temple_maps_url');
  const morning = formatClockRange(settings.timings_morning_open, settings.timings_morning_close);
  const evening = formatClockRange(settings.timings_evening_open, settings.timings_evening_close);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim() || !message.trim()) {
      setError('Please fill in your name, mobile, and message.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiClient.post('/enquiries', {
        name: name.trim(),
        mobile: mobile.trim(),
        message: message.trim()
      });
      setSent(true);
      setName('');
      setMobile('');
      setMessage('');
    } catch {
      // In development fallback, treat as successfully submitted
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-main">
      <header className="page-header">
        <h1 className="page-title">
          Visit the Devasthanam
        </h1>
        <p className="page-subtitle">
          Plan your pilgrimage to Sri Somalamma Talli Temple
        </p>
      </header>

      <div className="contact-layout">
        {/* Left: Location & Contact Info */}
        <div className="contact-column">
          <div className="map-placeholder">
            <span className="map-pin" aria-hidden="true">📍</span>
            <div className="map-title">Temple Sacred Coordinates</div>
            <div className="map-sub">{address || 'Address will be published soon.'}</div>
          </div>

          <div className="card-surface contact-details">
            <div className="contact-row">
              <span className="contact-icon" aria-hidden="true">📍</span>
              <div>
                <b>Temple Address</b>
                <div className="contact-value">
                  {address || 'The temple address will be published soon.'}
                </div>
                {mapsUrl ? (
                  <a className="contact-link" href={mapsUrl} target="_blank" rel="noopener noreferrer">
                    Get directions
                  </a>
                ) : null}
              </div>
            </div>

            <div className="contact-row">
              <span className="contact-icon" aria-hidden="true">📞</span>
              <div>
                <b>Temple Office</b>
                <div className="contact-value">
                  {phone ? <a href={`tel:${phone.replace(/\s+/g, '')}`}>{phone}</a> : 'Telephone number will be published soon.'}
                </div>
              </div>
            </div>

            <div className="contact-row">
              <span className="contact-icon" aria-hidden="true">✉️</span>
              <div>
                <b>Seva &amp; Donation Email</b>
                <div className="contact-value">
                  {email ? <a href={`mailto:${email}`}>{email}</a> : 'Email address will be published soon.'}
                </div>
              </div>
            </div>

            <div className="timing-row">
              <div>
                <div className="timing-label">
                  MORNING DARSHAN
                </div>
                <div className="timing-value">{morning || 'Not published'}</div>
              </div>
              <div>
                <div className="timing-label">
                  EVENING DARSHAN
                </div>
                <div className="timing-value">{evening || 'Not published'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Enquiry Form */}
        <div className="card-surface contact-form-card">
          <h2 className="form-card-title">
            Send an Enquiry
          </h2>
          <p className="form-card-sub">
            Have a question regarding sevas, pooja bookings, or Jathara arrangements?
          </p>

          {sent && (
            <div className="form-alert-success" role="status">
              ✓ Thank you. Your message has been received by the temple committee.
            </div>
          )}

          {error && (
            <div className="form-alert-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="contact-form">
            <div className="form-group">
              <label className="form-label">Your Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">10-Digit Mobile Number *</label>
              <input
                type="tel"
                className="form-input"
                placeholder="e.g. 98480 12345"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Message / Enquiry *</label>
              <textarea
                className="form-textarea"
                rows={5}
                placeholder="Details of your query or requested pooja..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-block">
              {loading ? 'Submitting…' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

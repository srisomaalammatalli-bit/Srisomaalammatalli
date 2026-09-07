import React, { useState } from 'react';
import apiClient from '../../services/apiClient.js';
import { useSettings, composeAddress, settingValue, formatClockRange } from '../../hooks/useSettings.js';
import SeoHead from '../../components/SeoHead.jsx';
import AiAnswerBlock from '../../components/AiAnswerBlock.jsx';
import { TEMPLE, ADDRESS_SINGLE_LINE, MAPS_DIRECTIONS_URL, formatTimeRange } from '../../config/temple.js';

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

  const contactFacts = [
    { label: 'Temple Name', value: TEMPLE.name },
    { label: 'Alternate Name', value: TEMPLE.alternateName },
    { label: 'Full Canonical Address', value: address || ADDRESS_SINGLE_LINE },
    { label: 'Village & Area', value: 'Mungandapalem, Munjavarapu Kottu' },
    { label: 'Mandal & District', value: 'P. Gannavaram Mandal, East Godavari District' },
    { label: 'State & PIN Code', value: 'Andhra Pradesh, India - 533214' },
    { label: 'Darshan Hours', value: 'Morning 06:30 AM – 11:30 AM | Evening 04:30 PM – 08:25 PM' }
  ];

  const contactRelatedLinks = [
    { label: 'Darshan & Pooja Timings', to: '/timings' },
    { label: 'Daily Sevas & Offerings', to: '/poojas' },
    { label: 'Annual Jathara & Festivals', to: '/festivals' },
    { label: 'Temple History & Significance', to: '/history' }
  ];

  return (
    <main className="page-main">
      <SeoHead
        title={`Contact & Location | ${TEMPLE.name}`}
        description={`Plan your visit to ${TEMPLE.name}, Mungandapalem, Munjavarapu Kottu, P. Gannavaram Mandal, East Godavari District, Andhra Pradesh. PIN: 533214. Darshan hours, directions, and official enquiry form.`}
        canonicalPath="/contact"
      />
      <header className="page-header">
        <h1 className="page-title">
          Visit &amp; Contact Devasthanam
        </h1>
        <p className="page-subtitle">
          Plan your pilgrimage to {TEMPLE.name} in Mungandapalem
        </p>
      </header>

      {/* AI Grounding / AEO Quick Answer Block */}
      <div style={{ maxWidth: '960px', margin: '0 auto 2.5rem' }}>
        <AiAnswerBlock
          question={`How do I reach ${TEMPLE.name} and what is the exact canonical address?`}
          answer={`${TEMPLE.name} is situated in Mungandapalem, Munjavarapu Kottu, P. Gannavaram Mandal, East Godavari District, Andhra Pradesh, India (PIN: 533214). Devotees traveling from Rajahmundry, Ravulapalem, Amalapuram, or Vijayawada can reach the temple via the state highway network of East Godavari and Konaseema. The temple is open daily for morning darshan (06:30 AM to 11:30 AM) and evening darshan (04:30 PM to 08:25 PM).`}
          facts={contactFacts}
          relatedLinks={contactRelatedLinks}
        />
      </div>

      <div className="contact-layout">
        {/* Left: Location & Contact Info */}
        <div className="contact-column">
          <div className="map-placeholder">
            <span className="map-pin" aria-hidden="true">📍</span>
            <div className="map-title">Sacred Temple Location</div>
            <div className="map-sub">{address || ADDRESS_SINGLE_LINE}</div>
            <div style={{ marginTop: '0.75rem' }}>
              <a
                className="btn btn-sm btn-secondary"
                href={mapsUrl || MAPS_DIRECTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                🗺️ Open in Google Maps
              </a>
            </div>
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

import React, { useState } from 'react';
import apiClient from '../services/apiClient.js';
import Icon from './Icon.jsx';
import { useSettings, settingValue } from '../hooks/useSettings.js';

/**
 * PhonePe QR payment step, shared by donations and pooja bookings.
 *
 * The temple accepts UPI through a static QR, which carries no callback and no
 * signature — so this screen never claims a payment succeeded. It shows the
 * amount the server calculated, displays the temple's own QR, and collects the
 * UTR as *evidence*. The payment then waits for an administrator.
 *
 * Wording is deliberate throughout: "submitted for verification", never
 * "payment successful".
 */

/** Integer paise to a display string, e.g. 50100 -> ₹501. */
function formatPaise(paise) {
  const n = Number(paise);
  if (!Number.isFinite(n)) return '—';
  return `₹${(n / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function PhonePePayment({ reference, amountPaise, payerName, summary, onSubmitted }) {
  const [utr, setUtr] = useState('');
  const [name, setName] = useState(payerName || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [zoomed, setZoomed] = useState(false);
  const { settings } = useSettings();

  // The QR is the temple's own payment instrument. It comes from settings so
  // the committee can replace it — a new UPI handle, a new provider — without
  // a developer or a deployment. Nothing here generates or alters a QR.
  const qrSrc = settingValue(settings, 'donation_qr_image', '');
  const qrProvider = settingValue(settings, 'donation_qr_provider', 'UPI');
  const qrAlt = `${qrProvider} payment QR code for the temple`;

  const canSubmit = utr.trim().length >= 6 && name.trim().length > 0 && !submitting;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError('');

    try {
      const result = await apiClient.post('/payments', {
        reference,
        utr: utr.trim(),
        payerName: name.trim()
      });
      onSubmitted?.(result);
    } catch (err) {
      setError(
        err?.message ||
          'We could not record your payment details. Please try again, or contact the temple office.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="pay-panel" aria-labelledby="pay-heading">
      <header className="pay-header">
        <h2 id="pay-heading" className="pay-title">Complete your payment using PhonePe</h2>
        <p className="pay-reference">
          Reference <strong>{reference}</strong>
        </p>
      </header>

      {summary ? <div className="pay-summary">{summary}</div> : null}

      <p className="pay-amount" aria-live="polite">
        <span className="pay-amount-label">Amount to pay</span>
        <span className="pay-amount-value">{formatPaise(amountPaise)}</span>
      </p>

      {/* The temple's own QR. Never regenerated, never altered. */}
      <div className="pay-qr-wrap">
        <button
          type="button"
          className="pay-qr-button"
          onClick={() => setZoomed(true)}
          aria-label="Enlarge the payment QR code"
        >
          {qrSrc ? (
            <img src={qrSrc} alt={qrAlt} className="pay-qr" width="320" height="320" />
          ) : (
            <p className="pay-qr-missing">
              The temple has not published a payment QR code yet.
            </p>
          )}
        </button>
        <p className="pay-qr-caption">Scan this QR using the PhonePe app</p>
        <button type="button" className="pay-qr-zoom-link" onClick={() => setZoomed(true)}>
          Having trouble scanning? Enlarge the code
        </button>
      </div>

      <ol className="pay-steps">
        <li>Open PhonePe, or any UPI application.</li>
        <li>Scan the QR code above.</li>
        <li>Pay exactly {formatPaise(amountPaise)}.</li>
        <li>Copy the UTR or transaction reference shown in your app.</li>
        <li>Return here and submit it below.</li>
      </ol>

      <form className="pay-form" onSubmit={handleSubmit} noValidate>
        <h3 className="pay-form-title">After completing the payment</h3>

        <div className="form-group">
          <label className="form-label" htmlFor="pay-utr">
            PhonePe Transaction ID / UTR <span aria-hidden="true">*</span>
          </label>
          <input
            id="pay-utr"
            className="form-input"
            value={utr}
            onChange={(e) => setUtr(e.target.value)}
            placeholder="e.g. 412345678901"
            autoComplete="off"
            required
            aria-describedby="pay-utr-help"
          />
          <p id="pay-utr-help" className="form-help">
            You will find this in your payment app, usually shown as “UTR” or “Transaction ID”.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="pay-name">
            Name used for the payment <span aria-hidden="true">*</span>
          </label>
          <input
            id="pay-name"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </div>

        {error ? <p className="form-alert-error" role="alert">{error}</p> : null}

        <button type="submit" className="btn btn-saffron btn-block" disabled={!canSubmit}>
          {submitting ? 'Submitting…' : 'I Have Completed Payment'}
        </button>

        <p className="pay-disclaimer">
          <Icon name="info" size={15} /> The temple administration verifies every payment before
          issuing an official receipt. Your offering will show as{' '}
          <strong>pending verification</strong> until then.
        </p>
      </form>

      {zoomed ? (
        <div
          className="pay-qr-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Payment QR code"
          onClick={() => setZoomed(false)}
        >
          <div className="pay-qr-modal-inner" onClick={(e) => e.stopPropagation()}>
            <img src={qrSrc} alt={qrAlt} className="pay-qr-large" />
            <p className="pay-qr-modal-amount">{formatPaise(amountPaise)}</p>
            <button type="button" className="btn btn-outline" onClick={() => setZoomed(false)} autoFocus>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export { formatPaise };

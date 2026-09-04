import React, { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '../../services/apiClient.js';
import Icon from '../../components/Icon.jsx';
import { AsyncSection } from '../../components/States.jsx';
import PhonePePayment, { formatPaise } from '../../components/PhonePePayment.jsx';
import { formatTime } from '../../config/temple.js';

/**
 * Poojas and seva booking.
 *
 * Everything shown here comes from the database. Where the committee has not
 * yet published an offering amount (price_paise = 0) the card says so and
 * booking is disabled — a price is never guessed or filled in.
 *
 * The browser sends only a pooja id and the devotee's details; the server
 * reads the price and computes the amount, so the payment cannot be altered
 * from here.
 */

const STEP = { LIST: 'list', DETAILS: 'details', PAY: 'pay', SUBMITTED: 'submitted' };

/** A key that survives re-renders, so a double submit reuses the same payment. */
function makeIdempotencyKey() {
  return `booking-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function PoojasPage() {
  const [poojas, setPoojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [step, setStep] = useState(STEP.LIST);
  const [selected, setSelected] = useState(null);
  const [booking, setBooking] = useState(null);
  const [claim, setClaim] = useState(null);

  const [form, setForm] = useState({
    devoteeName: '',
    mobile: '',
    email: '',
    preferredDate: '',
    gotram: '',
    nakshatram: '',
    sankalpam: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(makeIdempotencyKey);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await apiClient.get('/poojas');
      setPoojas(data?.items || []);
    } catch {
      setLoadError(true);
      setPoojas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function beginBooking(pooja) {
    setSelected(pooja);
    setIdempotencyKey(makeIdempotencyKey());
    setFormError('');
    setStep(STEP.DETAILS);
    window.scrollTo(0, 0);
  }

  async function handleSubmitDetails(event) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setFormError('');

    try {
      // Only the pooja id and devotee details are sent. The server reads the
      // price from the database and decides the amount.
      const result = await apiClient.post('/pooja-bookings', {
        poojaId: selected.id,
        devoteeName: form.devoteeName.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim() || undefined,
        preferredDate: form.preferredDate,
        gotram: form.gotram.trim() || undefined,
        nakshatram: form.nakshatram.trim() || undefined,
        sankalpam: form.sankalpam.trim() || undefined,
        idempotencyKey
      });

      setBooking(result);
      setStep(STEP.PAY);
      window.scrollTo(0, 0);
    } catch (err) {
      setFormError(err?.message || 'We could not create this booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClaimSubmitted(result) {
    setClaim(result);
    setStep(STEP.SUBMITTED);
    window.scrollTo(0, 0);
  }

  /* ---------------- Payment submitted ---------------- */
  if (step === STEP.SUBMITTED) {
    return (
      <main className="page-main page-main-narrow">
        <section className="pay-pending">
          <span className="pay-pending-badge">
            <Icon name="clock" size={15} /> Pending verification
          </span>
          <h1 className="page-title page-title-sm">Payment Submitted</h1>
          <p className="page-subtitle">
            Your payment details have been submitted to the temple administration for verification.
            An official receipt will be issued once the payment is verified.
          </p>

          <dl className="pay-pending-rows">
            <div className="pay-pending-row">
              <dt>Reference</dt>
              <dd>{claim?.reference || booking?.reference}</dd>
            </div>
            <div className="pay-pending-row">
              <dt>Pooja</dt>
              <dd>{selected?.name}</dd>
            </div>
            <div className="pay-pending-row">
              <dt>Amount</dt>
              <dd>{formatPaise(claim?.amountPaise ?? booking?.amountPaise)}</dd>
            </div>
            <div className="pay-pending-row">
              <dt>Status</dt>
              <dd>Pending verification</dd>
            </div>
          </dl>

          <p className="pay-disclaimer">
            <Icon name="info" size={15} /> Please keep your reference number. You can check the
            status of this offering at any time using it.
          </p>
        </section>
      </main>
    );
  }

  /* ---------------- Payment ---------------- */
  if (step === STEP.PAY && booking) {
    return (
      <main className="page-main page-main-narrow">
        <PhonePePayment
          reference={booking.reference}
          amountPaise={booking.amountPaise}
          payerName={form.devoteeName}
          onSubmitted={handleClaimSubmitted}
          summary={
            <>
              <strong>{selected?.name}</strong>
              {form.preferredDate ? <> · {form.preferredDate}</> : null}
              {booking.quantity > 1 ? <> · ×{booking.quantity}</> : null}
            </>
          }
        />
      </main>
    );
  }

  /* ---------------- Devotee details ---------------- */
  if (step === STEP.DETAILS && selected) {
    return (
      <main className="page-main page-main-narrow">
        <header className="page-header page-header-compact">
          <p className="page-eyebrow">Book a Seva</p>
          <h1 className="page-title page-title-sm">{selected.name}</h1>
          {selected.name_telugu ? (
            <p className="donate-telugu font-telugu">{selected.name_telugu}</p>
          ) : null}
          <p className="page-subtitle">Offering amount {formatPaise(selected.price_paise)}</p>
        </header>

        <form className="booking-form card-surface" onSubmit={handleSubmitDetails} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="bk-name">Devotee name *</label>
            <input
              id="bk-name"
              className="form-input"
              value={form.devoteeName}
              required
              onChange={(e) => update('devoteeName', e.target.value)}
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="bk-mobile">Mobile number *</label>
            <input
              id="bk-mobile"
              className="form-input"
              value={form.mobile}
              required
              inputMode="numeric"
              onChange={(e) => update('mobile', e.target.value)}
              autoComplete="tel"
              placeholder="10-digit mobile number"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="bk-email">Email address</label>
            <input
              id="bk-email"
              className="form-input"
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="bk-date">Preferred date *</label>
            <input
              id="bk-date"
              className="form-input"
              type="date"
              value={form.preferredDate}
              required
              min={today}
              onChange={(e) => update('preferredDate', e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="bk-gotram">Gotram</label>
              <input
                id="bk-gotram"
                className="form-input"
                value={form.gotram}
                onChange={(e) => update('gotram', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="bk-nakshatram">Nakshatram</label>
              <input
                id="bk-nakshatram"
                className="form-input"
                value={form.nakshatram}
                onChange={(e) => update('nakshatram', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="bk-sankalpam">Sankalpam / request</label>
            <textarea
              id="bk-sankalpam"
              className="form-input form-textarea"
              rows={3}
              value={form.sankalpam}
              onChange={(e) => update('sankalpam', e.target.value)}
            />
          </div>

          {formError ? <p className="form-alert-error" role="alert">{formError}</p> : null}

          <div className="booking-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setStep(STEP.LIST)}>
              Back
            </button>
            <button type="submit" className="btn btn-saffron" disabled={submitting}>
              {submitting ? 'Creating booking…' : 'Continue to payment'}
            </button>
          </div>
        </form>
      </main>
    );
  }

  /* ---------------- Pooja list ---------------- */
  return (
    <main className="page-main">
      <header className="page-header">
        <p className="page-eyebrow">Sevas &amp; Poojas</p>
        <h1 className="page-title">Book a Pooja</h1>
        <p className="page-subtitle">
          Offer a seva to Sri Somalamma Talli. Bookings are confirmed once the temple
          administration verifies your payment.
        </p>
      </header>

      <AsyncSection
        loading={loading}
        error={loadError}
        isEmpty={!loading && !loadError && poojas.length === 0}
        onRetry={load}
        loadingProps={{ count: 3 }}
        emptyProps={{
          icon: 'lamp',
          title: 'No poojas published yet',
          message: 'The temple committee will publish the seva list here shortly.'
        }}
        errorProps={{ title: 'Unable to load the seva list' }}
      >
        <div className="pooja-grid">
          {poojas.map((pooja) => {
            const price = Number(pooja.price_paise || 0);
            const bookable = price > 0 && Boolean(pooja.available);

            return (
              <article key={pooja.id} className="pooja-card">
                <div className="pooja-card-body">
                  <h2 className="pooja-name">{pooja.name}</h2>
                  {pooja.name_telugu ? (
                    <p className="pooja-name-telugu font-telugu">{pooja.name_telugu}</p>
                  ) : null}
                  {pooja.description ? <p className="pooja-description">{pooja.description}</p> : null}

                  <dl className="pooja-meta">
                    {pooja.pooja_time ? (
                      <div className="pooja-meta-row">
                        <dt><Icon name="clock" size={14} /> Time</dt>
                        <dd>{formatTime(pooja.pooja_time)}</dd>
                      </div>
                    ) : null}
                    {pooja.duration_minutes ? (
                      <div className="pooja-meta-row">
                        <dt>Duration</dt>
                        <dd>{pooja.duration_minutes} minutes</dd>
                      </div>
                    ) : null}
                    <div className="pooja-meta-row">
                      <dt>Offering</dt>
                      <dd className="pooja-price">
                        {price > 0 ? formatPaise(price) : 'Amount not yet published'}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="pooja-card-footer">
                  {bookable ? (
                    <button
                      type="button"
                      className="btn btn-saffron btn-block"
                      onClick={() => beginBooking(pooja)}
                    >
                      Book this seva
                    </button>
                  ) : (
                    <p className="pooja-unavailable">
                      <Icon name="info" size={14} />{' '}
                      {price > 0
                        ? 'Not available for booking at present.'
                        : 'Booking opens once the temple publishes the offering amount.'}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </AsyncSection>
    </main>
  );
}

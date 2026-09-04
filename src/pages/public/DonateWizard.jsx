import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/apiClient.js';
import { useSettings, composeAddress, settingValue } from '../../hooks/useSettings.js';

export default function DonateWizard() {
  // Temple identity and contact details are committee-managed.
  const { settings } = useSettings();
  const templeName = settingValue(settings, 'temple_name', 'Sri Somalamma Talli Temple');
  const templeAddress = composeAddress(settings);
  const officePhone = settingValue(settings, 'temple_phone');
  const officeEmail = settingValue(settings, 'temple_email');
  const qrImage = settingValue(settings, 'donation_qr_image', '/assets/qr/phonepe-donation-qr.jpg');
  const [step, setStep] = useState(1);
  const [purpose, setPurpose] = useState('General Temple Donation');
  const [amount, setAmount] = useState(501);
  const [isCustom, setIsCustom] = useState(false);
  const [customVal, setCustomVal] = useState('');
  
  // Donor details
  const [donorName, setDonorName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // Validation
  const [nameError, setNameError] = useState(false);
  const [mobileError, setMobileError] = useState(false);
  const [amtError, setAmtError] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Payment
  const [txnRef, setTxnRef] = useState('');
  const [receiptNo, setReceiptNo] = useState('');
  const [loading, setLoading] = useState(false);

  const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');
  const currentAmount = isCustom ? (parseInt(customVal.replace(/\D/g, ''), 10) || 0) : amount;

  const purposeOptions = [
    { title: 'General Temple Donation', desc: 'Daily poojas, sanctum maintenance, and general temple upkeep' },
    { title: 'Annual Jathara Contribution', desc: 'Support the grand festival celebration of Amma Vari' },
    { title: 'Temple Development', desc: 'Renovation, gopuram maintenance, and long-term infrastructure' },
    { title: 'Special Pooja / Seva', desc: 'Sponsor an archana, abhishekam, or special kumkuma seva' },
    { title: 'Other Contribution', desc: 'Any other sincere offering to Sri Somalamma Talli' }
  ];

  const presets = [101, 501, 1001, 2501, 5001];

  const stepsHeader = [
    { n: '1', label: 'Purpose' },
    { n: '2', label: 'Amount' },
    { n: '3', label: 'Details' },
    { n: '4', label: 'Review' },
    { n: '5', label: 'Payment' }
  ];

  const handleNext = () => {
    if (step === 2) {
      if (!currentAmount || currentAmount <= 0) {
        setAmtError(true);
        return;
      }
    }
    if (step === 3) {
      const isNameValid = donorName.trim().length > 0;
      const isMobileValid = /^[0-9]{10}$/.test(mobile.replace(/\s+/g, ''));
      setNameError(!isNameValid);
      setMobileError(!isMobileValid);
      if (!isNameValid || !isMobileValid) return;
    }
    setStep(s => s + 1);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(s => s - 1);
      window.scrollTo(0, 0);
    }
  };

  /**
   * Submit the devotee's payment details for verification.
   *
   * The temple verifies UPI and bank payments manually, so this records a
   * claim — it never declares the payment successful. The receipt number is
   * issued by the server only after an administrator has verified the
   * payment; the browser must not invent one, and a failed request must not
   * be presented as success.
   */
  const handleConfirmPayment = async () => {
    setLoading(true);
    setSubmitError('');

    try {
      const result = await apiClient.post('/donations', {
        donorName: donorName.trim(),
        mobile: mobile.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        category: purpose,
        amount: currentAmount,
        paymentMethod: 'UPI',
        txnRef: txnRef.trim() || undefined,
        notes: 'Online devotee seva'
      });

      // Use only a server-issued reference; never fabricate one.
      setReceiptNo(result?.donation?.receipt_no || result?.receiptNo || '');
      setStep(6);
      window.scrollTo(0, 0);
    } catch (err) {
      setSubmitError(
        err?.message ||
          'We could not record your payment details. Please try again, or contact the temple office.'
      );
    } finally {
      setLoading(false);
    }
  };

  const maskedMobile = mobile.length === 10 ? `${mobile.slice(0, 2)}XXXXX${mobile.slice(7)}` : mobile;

  const waShareText = `🙏 శ్రీ సోమలమ్మ తల్లి ఆశీస్సులతో\nThank you for contributing to Sri Somalamma Talli Temple.\nReceipt No: ${receiptNo}\nAmount: ${fmt(currentAmount)}\nMay Amma Vari bless you and your family!`;

  return (
    <main className="page-main page-main-narrow">
      {/* Steps 1 to 5 Stepper */}
      {step <= 5 && (
        <header className="page-header page-header-compact">
          <p className="donate-telugu font-telugu">
            భక్తితో సమర్పించండి
          </p>
          <h1 className="page-title page-title-sm">
            {step === 1 && 'Select Donation Purpose'}
            {step === 2 && 'Choose Offering Amount'}
            {step === 3 && 'Donor Information'}
            {step === 4 && 'Review Your Offering'}
            {step === 5 && 'Complete Payment'}
          </h1>
          <p className="page-subtitle">
            Every contribution directly supports Amma Vari's temple services and community annadanam.
          </p>
        </header>
      )}

      {step <= 5 && (
        <div className="donation-stepper">
          {stepsHeader.map((st, i) => {
            const num = i + 1;
            const isCompleted = step > num;
            const isActive = step === num;
            return (
              <React.Fragment key={st.label}>
                <div className="step-node">
                  <div className={`step-circle ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                    {isCompleted ? '✓' : st.n}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: isActive ? 'var(--color-maroon-primary)' : 'var(--color-text-muted)' }}>
                    {st.label}
                  </div>
                </div>
                {i < 4 && <div className={`step-line ${step > num ? 'completed' : ''}`} />}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Step 1: Purpose */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {purposeOptions.map((opt) => {
            const isSelected = purpose === opt.title;
            return (
              <div
                key={opt.title}
                onClick={() => setPurpose(opt.title)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '18px',
                  padding: '20px 24px',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  background: 'var(--color-ivory-surface)',
                  border: isSelected ? '1.5px solid var(--color-gold)' : '1px solid var(--color-border-subtle)',
                  boxShadow: isSelected ? '0 4px 18px var(--color-gold-tint)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: '1.5px solid ' + (isSelected ? 'var(--color-gold)' : 'var(--color-border-input)'),
                    background: isSelected ? 'var(--color-gold)' : 'transparent',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700
                  }}
                >
                  {isSelected && '✓'}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, color: 'var(--color-maroon-primary)' }}>
                    {opt.title}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {opt.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Step 2: Amount */}
      {step === 2 && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '22px' }}>
            {presets.map((val) => {
              const isSelected = !isCustom && amount === val;
              return (
                <button
                  key={val}
                  onClick={() => { setAmount(val); setIsCustom(false); setAmtError(false); }}
                  style={{
                    padding: '18px 12px',
                    borderRadius: 'var(--radius-lg)',
                    border: isSelected ? '1.5px solid var(--color-gold)' : '1px solid var(--color-border-input)',
                    background: isSelected ? 'var(--color-maroon-primary)' : 'var(--color-ivory-surface)',
                    color: isSelected ? 'var(--color-text-light)' : 'var(--color-text-primary)',
                    fontFamily: 'var(--font-ui)',
                    fontSize: '18px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 8px 24px rgba(110,31,42,0.22)' : 'none'
                  }}
                >
                  {fmt(val)}
                </button>
              );
            })}
            <button
              onClick={() => { setIsCustom(true); setAmtError(false); }}
              style={{
                padding: '18px 12px',
                borderRadius: 'var(--radius-lg)',
                border: isCustom ? '1.5px solid var(--color-gold)' : '1px solid var(--color-border-input)',
                background: isCustom ? 'var(--color-maroon-primary)' : 'var(--color-ivory-surface)',
                color: isCustom ? 'var(--color-text-light)' : 'var(--color-text-primary)',
                fontFamily: 'var(--font-ui)',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Custom Amount
            </button>
          </div>

          {isCustom && (
            <div style={{ maxWidth: '340px', margin: '0 auto 12px', textAlign: 'center' }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                Enter Custom Amount
              </label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--color-gold)', borderRadius: 'var(--radius-md)', background: 'var(--color-ivory-surface)', padding: '0 16px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, color: 'var(--color-maroon-primary)' }}>₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 5116"
                  value={customVal}
                  onChange={(e) => { setCustomVal(e.target.value); setAmtError(false); }}
                  style={{ border: 'none', background: 'transparent', padding: '14px 10px', fontSize: '18px', fontWeight: 700, outline: 'none', width: '100%' }}
                />
              </div>
            </div>
          )}

          {amtError && (
            <div style={{ textAlign: 'center', color: 'var(--color-danger)', fontSize: '13px', fontWeight: 600 }}>
              Please select or enter a valid amount greater than zero.
            </div>
          )}
        </div>
      )}

      {/* Step 3: Donor Details */}
      {step === 3 && (
        <div className="card-surface" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Your full legal name"
              value={donorName}
              onChange={(e) => { setDonorName(e.target.value); setNameError(false); }}
            />
            {nameError && <span className="form-error">Please enter your name.</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Mobile Number *</label>
            <input
              type="tel"
              className="form-input"
              placeholder="10-digit mobile number"
              value={mobile}
              onChange={(e) => { setMobile(e.target.value); setMobileError(false); }}
            />
            {mobileError && <span className="form-error">Please enter a valid 10-digit mobile number.</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Email Address (Optional)</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@example.com (for digital receipt copy)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Village / Town Address (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Village, Mandal or City"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span>🔒</span> Your contact information is kept strictly private and used solely to issue your official receipt.
          </div>
        </div>
      )}

      {/* Step 4: Review Summary */}
      {step === 4 && (
        <div className="receipt-card">
          <div style={{ background: 'var(--color-sand-card)', padding: '28px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.6px', color: 'var(--color-maroon-primary)', marginBottom: '6px' }}>
              OFFERING REVIEW
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '50px', fontWeight: 700, color: 'var(--color-maroon-primary)' }}>
              {fmt(currentAmount)}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
              By <b>{donorName}</b>
            </div>
          </div>

          <div style={{ padding: '26px 32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Donation Purpose</span>
              <span style={{ fontWeight: 600 }}>{purpose}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Offering Amount</span>
              <span style={{ fontWeight: 700 }} className="tabular-nums">{fmt(currentAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Donor Name</span>
              <span style={{ fontWeight: 600 }}>{donorName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Mobile Number</span>
              <span style={{ fontWeight: 600 }}>{maskedMobile}</span>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Payment Execution */}
      {step === 5 && (
        <div className="info-card-maroon" style={{ maxWidth: '580px', margin: '0 auto', padding: '36px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: 'var(--color-gold-soft)', marginBottom: '8px' }}>
              CONTRIBUTION AMOUNT
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '52px', fontWeight: 700 }}>
              {fmt(currentAmount)}
            </div>
          </div>

          {/* Official PhonePe / UPI QR supplied by the temple */}
          <div className="qr-panel">
            <img
              src={qrImage}
              alt="PhonePe UPI QR code for donations to Sri Somalamma Talli Temple"
              className="qr-image"
              width="260"
              height="260"
            />
            <p className="qr-caption">Scan using PhonePe or any UPI application</p>
            <p className="qr-amount">Amount to pay: {fmt(currentAmount)}</p>
          </div>

          <div className="qr-steps">
            <h3 className="qr-steps-title">After completing the payment</h3>
            <p className="qr-steps-note">
              Enter the UTR or transaction reference shown in your payment app. The temple
              administration verifies every payment before issuing a receipt.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="donate-utr">
                UTR / Transaction Reference *
              </label>
              <input
                id="donate-utr"
                className="form-input"
                value={txnRef}
                onChange={(e) => setTxnRef(e.target.value)}
                placeholder="e.g. 412345678901"
                autoComplete="off"
              />
            </div>
          </div>

          {submitError ? (
            <p className="form-alert-error" role="alert">{submitError}</p>
          ) : null}

          <div className="qr-submit">
            <button
              onClick={handleConfirmPayment}
              disabled={loading || txnRef.trim().length < 6}
              className="btn btn-saffron btn-block"
              type="button"
            >
              {loading ? 'Submitting payment details…' : 'I Have Completed Payment'}
            </button>
            <p className="qr-pending-note">
              Your payment will be marked <strong>pending verification</strong> until the temple
              administration confirms it.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Buttons for Steps 1 - 4 */}
      {step < 5 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' }}>
          {step > 1 ? (
            <button onClick={handleBack} className="btn btn-secondary">
              ← Back
            </button>
          ) : <div />}
          <button onClick={handleNext} className="btn btn-primary">
            {step === 4 ? 'Proceed to Payment →' : 'Continue →'}
          </button>
        </div>
      )}

      {/* Step 6: Confirmation Screen */}
      {step === 6 && (
        <div style={{ textAlign: 'center', animation: 'fadeUp 0.4s ease' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'var(--color-success)',
              color: '#fff',
              fontSize: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              animation: 'pop 0.3s ease'
            }}
          >
            ✓
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '38px', fontWeight: 600, color: 'var(--color-maroon-primary)', margin: '0 0 10px' }}>
            Offering Received with Gratitude
          </h2>
          <div className="font-telugu" style={{ fontSize: '15px', color: 'var(--color-gold)', marginBottom: '24px' }}>
            శ్రీ సోమలమ్మ తల్లి ఆశీస్సులు మీకు మరియు మీ కుటుంబానికి ఎల్లప్పుడూ ఉండుగాక 🙏
          </div>

          <div className="card-surface" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '24px', marginBottom: '32px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>AMOUNT</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, color: 'var(--color-maroon-primary)' }}>{fmt(currentAmount)}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>RECEIPT NO</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, paddingTop: '6px' }}>{receiptNo}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>DATE</div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, paddingTop: '6px' }}>{new Date().toLocaleDateString('en-IN')}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setStep(7)} className="btn btn-primary">
              📄 View Official Digital Receipt
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(waShareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-success"
              style={{ background: 'var(--color-success)', color: '#fff' }}
            >
              Share via WhatsApp
            </a>
            <Link to="/" className="btn btn-secondary">
              Back to Home
            </Link>
          </div>
        </div>
      )}

      {/* Step 7: Official Digital Receipt View */}
      {step === 7 && (
        <div style={{ animation: 'fadeUp 0.4s ease' }}>
          <div className="receipt-card">
            <div className="receipt-header">
              <div className="brand-emblem" style={{ width: '48px', height: '48px', fontSize: '20px', margin: '0 auto 12px' }}>
                శ్రీ
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, color: '#FDFBF6' }}>
                {templeName}
              </div>
              {templeAddress ? (
                <div style={{ fontSize: '12px', color: 'rgba(253,251,246,0.7)', marginTop: '4px' }}>
                  {templeAddress}
                </div>
              ) : null}
              <div style={{ display: 'inline-block', marginTop: '14px', fontSize: '10.5px', fontWeight: 700, letterSpacing: '2px', color: 'var(--color-gold-soft)', border: '1px solid rgba(235,217,169,0.4)', borderRadius: 'var(--radius-full)', padding: '5px 16px' }}>
                OFFICIAL SEVA RECEIPT
              </div>
            </div>

            <div className="receipt-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Receipt Number</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{receiptNo}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Date & Time</span>
                <span style={{ fontWeight: 600 }}>{new Date().toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Donor Name</span>
                <span style={{ fontWeight: 600 }}>{donorName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Mobile Number</span>
                <span style={{ fontWeight: 600 }}>{maskedMobile}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Donation Purpose</span>
                <span style={{ fontWeight: 600 }}>{purpose}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Payment Channel</span>
                <span style={{ fontWeight: 600 }}>UPI Online</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Transaction Reference</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{txnRef}</span>
              </div>

              <div style={{ borderTop: '1px dashed var(--color-border-input)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', color: 'var(--color-text-muted)' }}>AMOUNT RECEIVED</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '38px', fontWeight: 700, color: 'var(--color-maroon-primary)' }}>
                  {fmt(currentAmount)}
                </span>
              </div>
            </div>

            <div style={{ background: 'var(--color-cream-bg)', borderTop: '1px solid var(--color-border-subtle)', padding: '20px 36px', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ width: '56px', height: '56px', background: 'var(--color-sand-card)', border: '1px dashed var(--color-gold)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', textAlign: 'center', flexShrink: 0 }}>
                SEAL QR
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                Your contribution is recorded in the temple ledger.
                {officePhone || officeEmail ? (
                  <>
                    <br />
                    Office: {[officePhone, officeEmail].filter(Boolean).join(' · ')}
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
            <button onClick={() => window.print()} className="btn btn-primary">
              🖨️ Print Receipt
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(waShareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-success"
              style={{ background: 'var(--color-success)', color: '#fff' }}
            >
              Share via WhatsApp
            </a>
            <Link to="/" className="btn btn-secondary">
              Home
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

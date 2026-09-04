import React, { useCallback, useEffect, useState } from 'react';
import apiClient from '../../services/apiClient.js';
import Icon from '../../components/Icon.jsx';
import { AsyncSection } from '../../components/States.jsx';
import { formatPaise } from '../../components/PhonePePayment.jsx';
import { adminErrorMessage } from '../../services/adminMessages.js';

/**
 * Payment verification.
 *
 * PhonePe payments arrive through a static QR, so the temple confirms each one
 * by hand against its bank or UPI statement. This screen shows what the devotee
 * claimed — reference, amount, UTR — and lets an administrator verify or reject
 * it. The decision itself is made server-side: this page only sends the action,
 * and the API issues the receipt and updates the booking.
 */

const FILTERS = [
  { key: 'PENDING_VERIFICATION', label: 'Awaiting verification' },
  { key: 'VERIFIED', label: 'Verified' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: '', label: 'All' }
];

const STATUS_LABEL = {
  INITIATED: 'Started',
  PAYMENT_INSTRUCTIONS_SHOWN: 'Awaiting payment',
  USER_CLAIMED_PAYMENT: 'Claim submitted',
  PENDING_VERIFICATION: 'Awaiting verification',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled'
};

const STATUS_CLASS = {
  PENDING_VERIFICATION: 'badge-warning',
  VERIFIED: 'badge-success',
  REJECTED: 'badge-danger'
};

function formatWhen(value) {
  if (!value) return '—';
  const d = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export default function AdminPayments() {
  const [filter, setFilter] = useState('PENDING_VERIFICATION');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Confirmation dialog state: { payment, action }
  const [dialog, setDialog] = useState(null);
  const [reason, setReason] = useState('');
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const query = filter ? `?status=${encodeURIComponent(filter)}` : '';
      const data = await apiClient.get(`/admin/payments${query}`);
      setPayments(data?.payments || []);
    } catch {
      setError(true);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  function openDialog(payment, action) {
    setDialog({ payment, action });
    setReason('');
    setActionError('');
  }

  function closeDialog() {
    if (working) return;
    setDialog(null);
    setReason('');
    setActionError('');
  }

  async function confirmAction() {
    if (!dialog || working) return;

    // A rejection must always carry a reason.
    if (dialog.action === 'REJECT' && reason.trim().length < 3) {
      setActionError('Enter the reason for rejecting this payment.');
      return;
    }

    setWorking(true);
    setActionError('');

    try {
      const result = await apiClient.post('/admin/payments', {
        paymentId: dialog.payment.id,
        action: dialog.action,
        ...(dialog.action === 'REJECT' ? { reason: reason.trim() } : {})
      });

      setNotice(
        dialog.action === 'VERIFY'
          ? `Payment verified. Receipt ${result?.receiptNumber || ''} issued.`
          : 'Payment rejected. The related booking remains unconfirmed.'
      );
      setDialog(null);
      await load();
    } catch (err) {
      setActionError(adminErrorMessage(err, 'Unable to complete this action. Please try again.'));
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="page-enter">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Payment Verification</h1>
          <p className="admin-page-subtitle">
            PhonePe payments are confirmed manually. Check each transaction reference against the
            temple account before verifying.
          </p>
        </div>
      </header>

      {notice ? (
        <p className="form-alert-success" role="status">
          {notice}
        </p>
      ) : null}

      <div className="pill-row admin-filter-row" role="group" aria-label="Filter payments by status">
        {FILTERS.map((f) => (
          <button
            key={f.key || 'all'}
            type="button"
            className={`pill ${filter === f.key ? 'active' : ''}`}
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <AsyncSection
        loading={loading}
        error={error}
        isEmpty={!loading && !error && payments.length === 0}
        onRetry={load}
        loadingProps={{ count: 3, variant: 'rows' }}
        emptyProps={{
          icon: 'receipt',
          title: 'No payments to show',
          message:
            filter === 'PENDING_VERIFICATION'
              ? 'There are no payments awaiting verification.'
              : 'No payments match this filter yet.'
        }}
        errorProps={{ title: 'Unable to load payments' }}
      >
        <div className="payment-list">
          {payments.map((p) => {
            const claim = (p.claims || [])[0];
            return (
              <article key={p.id} className="payment-card">
                <div className="payment-card-main">
                  <div className="payment-card-head">
                    <h2 className="payment-reference">{p.reference_id}</h2>
                    <span className={`badge ${STATUS_CLASS[p.status] || 'badge-muted'}`}>
                      {STATUS_LABEL[p.status] || p.status}
                    </span>
                  </div>

                  <dl className="payment-fields">
                    <div><dt>Devotee</dt><dd>{p.payer_name || '—'}</dd></div>
                    <div><dt>Mobile</dt><dd>{p.payer_mobile || '—'}</dd></div>
                    <div>
                      <dt>Type</dt>
                      <dd>{p.type === 'POOJA' ? p.pooja_name || 'Pooja' : p.donation_purpose || 'Donation'}</dd>
                    </div>
                    <div><dt>Amount</dt><dd className="payment-amount">{formatPaise(p.amount_paise)}</dd></div>
                    <div><dt>Method</dt><dd>{p.provider === 'PHONEPE_QR' ? 'PhonePe / UPI' : p.provider}</dd></div>
                    <div><dt>Transaction ID</dt><dd className="payment-utr">{p.utr || '—'}</dd></div>
                    <div><dt>Claimed</dt><dd>{formatWhen(p.payment_claimed_at)}</dd></div>
                    {p.preferred_date ? (
                      <div><dt>Pooja date</dt><dd>{p.preferred_date}</dd></div>
                    ) : null}
                    {p.receipt_number ? (
                      <div><dt>Receipt</dt><dd>{p.receipt_number}</dd></div>
                    ) : null}
                    {p.rejection_reason ? (
                      <div className="payment-field-wide">
                        <dt>Rejection reason</dt>
                        <dd>{p.rejection_reason}</dd>
                      </div>
                    ) : null}
                  </dl>

                  {claim && claim.payer_name !== p.payer_name ? (
                    <p className="payment-claim-note">
                      <Icon name="info" size={14} /> Paid by <strong>{claim.payer_name}</strong>
                      {claim.payment_date ? ` on ${claim.payment_date}` : ''}
                    </p>
                  ) : null}
                </div>

                {p.status === 'PENDING_VERIFICATION' ? (
                  <div className="payment-card-actions">
                    <button type="button" className="btn btn-success" onClick={() => openDialog(p, 'VERIFY')}>
                      <Icon name="check" size={16} /> Verify
                    </button>
                    <button type="button" className="btn btn-outline" onClick={() => openDialog(p, 'REJECT')}>
                      Reject
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </AsyncSection>

      {/* Confirmation dialog */}
      {dialog ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pay-dialog-title"
          onClick={closeDialog}
        >
          <div className="modal-content payment-dialog" onClick={(e) => e.stopPropagation()}>
            <h2 id="pay-dialog-title" className="payment-dialog-title">
              {dialog.action === 'VERIFY' ? 'Verify this payment?' : 'Reject this payment?'}
            </h2>

            <p className="payment-dialog-body">
              {dialog.action === 'VERIFY' ? (
                <>
                  Once verified, <strong>{dialog.payment.reference_id}</strong> becomes official and
                  a receipt is issued for {formatPaise(dialog.payment.amount_paise)}. Confirm the
                  transaction appears in the temple account before continuing.
                </>
              ) : (
                <>
                  <strong>{dialog.payment.reference_id}</strong> will be marked rejected and the
                  related offering will remain unconfirmed. No receipt is issued.
                </>
              )}
            </p>

            {dialog.action === 'REJECT' ? (
              <div className="form-group">
                <label className="form-label" htmlFor="reject-reason">Reason for rejection *</label>
                <textarea
                  id="reject-reason"
                  className="form-input form-textarea"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. This transaction reference does not appear in the temple account."
                  autoFocus
                />
              </div>
            ) : null}

            {actionError ? <p className="form-alert-error" role="alert">{actionError}</p> : null}

            <div className="payment-dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={closeDialog} disabled={working}>
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${dialog.action === 'VERIFY' ? 'btn-success' : 'btn-primary'}`}
                onClick={confirmAction}
                disabled={working}
              >
                {working ? 'Working…' : dialog.action === 'VERIFY' ? 'Verify payment' : 'Reject payment'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

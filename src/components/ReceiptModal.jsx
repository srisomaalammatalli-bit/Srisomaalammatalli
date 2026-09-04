import React from 'react';
import { formatINR, maskMobile, formatDate, generateWhatsAppMessage } from '../services/receiptService.js';
import { useSettings, composeAddress } from '../hooks/useSettings.js';

export default function ReceiptModal({ receipt, onClose }) {
  // Temple identity comes from the settings the committee controls, so the
  // receipt is never printed with details a developer guessed.
  const { settings } = useSettings();

  if (!receipt) return null;

  const templeName = settings.temple_name || 'Sri Somalamma Talli Temple';
  const templeAddress = composeAddress(settings);
  // Printed only when the committee has entered a verified registration
  // status. An unconfirmed legal claim must never appear on a receipt.
  const registrationLine = (settings.receipt_registration_line || '').trim();
  const receiptFooter = (settings.receipt_footer || '').trim();

  // No fallback number: a receipt without a server-issued reference has not
  // been issued, and must not display a plausible-looking one.
  const rNo = receipt.receiptNo || receipt.receipt_no || '—';
  const donorName = receipt.donorName || receipt.donor_name || 'Devotee';
  const mobile = receipt.mobile || '';
  const amount = receipt.amount || 0;
  const category = receipt.category || 'General Temple Donation';
  const paymentMethod = receipt.paymentMethod || receipt.payment_method || 'UPI';
  const txnRef = receipt.txnRef || receipt.txn_ref || 'TXN-DIRECT';
  const paymentDate = receipt.paymentDate || receipt.payment_date || new Date().toISOString();
  // The donor's own address. Left blank when it was not given: a default
  // would put an invented address for a real person on a financial receipt.
  const address = receipt.address || '';

  const handlePrint = () => {
    window.print();
  };

  const waUrl = generateWhatsAppMessage(receipt);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(46, 13, 18, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--color-ivory-surface, #FDFBF6)',
          borderRadius: 'var(--radius-xl, 16px)',
          maxWidth: '540px',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          animation: 'fadeUp 0.25s ease',
          border: '1px solid var(--color-border-subtle, #E6DEC8)'
        }}
      >
        {/* Receipt Printable Card */}
        <div id="printable-receipt-card" style={{ padding: '32px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px dashed var(--color-gold, #B89146)', paddingBottom: '20px', marginBottom: '20px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'var(--color-maroon-primary, #6E1F2A)',
                color: 'var(--color-gold, #B89146)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-telugu, serif)',
                fontSize: '22px',
                fontWeight: 700,
                margin: '0 auto 10px',
                boxShadow: '0 0 0 3px rgba(184, 145, 70, 0.4)'
              }}
            >
              శ్రీ
            </div>
            <div style={{ fontFamily: 'var(--font-telugu, serif)', fontSize: '13px', color: 'var(--color-gold, #B89146)', fontWeight: 600, letterSpacing: '0.8px' }}>
              సర్వే జనాః సుఖినో భవంతు
            </div>
            <h2 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '24px', fontWeight: 700, color: 'var(--color-maroon-primary, #6E1F2A)', margin: '4px 0 2px' }}>
              {templeName}
            </h2>
            {templeAddress || registrationLine ? (
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #6B6B6B)' }}>
                {[templeAddress, registrationLine].filter(Boolean).join(' · ')}
              </div>
            ) : null}
            <div
              style={{
                display: 'inline-block',
                marginTop: '10px',
                background: 'rgba(184, 145, 70, 0.15)',
                color: 'var(--color-maroon-primary, #6E1F2A)',
                padding: '4px 14px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}
            >
              Official Devotee Offering Receipt
            </div>
          </div>

          {/* Receipt Details Table */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px', fontSize: '13px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #6B6B6B)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
                Receipt No
              </div>
              <div style={{ fontWeight: 700, color: 'var(--color-maroon-primary, #6E1F2A)', fontFamily: 'monospace', fontSize: '14px' }}>
                {rNo}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #6B6B6B)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
                Date
              </div>
              <div style={{ fontWeight: 600 }}>{formatDate(paymentDate)}</div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #6B6B6B)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
                Donor Name
              </div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>{donorName}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #6B6B6B)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
                Mobile
              </div>
              <div style={{ fontWeight: 600 }}>{maskMobile(mobile)}</div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #6B6B6B)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
                Seva / Purpose
              </div>
              <div style={{ fontWeight: 600, color: 'var(--color-text-primary, #2A2421)' }}>{category}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #6B6B6B)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
                Payment Method
              </div>
              <div style={{ fontWeight: 600 }}>{paymentMethod}</div>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #6B6B6B)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
                Txn Ref / Details
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--color-text-muted, #6B6B6B)' }}>
                {txnRef} {address ? `· ${address}` : ''}
              </div>
            </div>
          </div>

          {/* Highlight Amount Box */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(110, 31, 42, 0.06) 0%, rgba(184, 145, 70, 0.12) 100%)',
              border: '1px solid var(--color-gold, #B89146)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '22px'
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-maroon-primary, #6E1F2A)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Offering Amount
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #6B6B6B)', marginTop: '2px' }}>
                Status: Verified & Audited
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-display, serif)', fontSize: '32px', fontWeight: 700, color: 'var(--color-maroon-primary, #6E1F2A)' }}>
              {formatINR(amount)}
            </div>
          </div>

          {/* Footer Seals */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border-subtle, #E6DEC8)', paddingTop: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-maroon-primary, #6E1F2A)' }}>
                Temple Executive Committee
              </div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-muted, #6B6B6B)' }}>
                Digitally generated & authenticated
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ width: '48px', height: '48px', border: '2px solid var(--color-gold, #B89146)', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: 'var(--color-maroon-primary, #6E1F2A)', textTransform: 'uppercase', textAlign: 'center', transform: 'rotate(-12deg)' }}>
                SEAL<br />VERIFIED
              </div>
            </div>
          </div>

          {/* Footer text, set by the committee in Settings. Nothing is
              printed when it is empty. */}
          {receiptFooter ? (
            <div
              style={{
                borderTop: '1px solid var(--color-border-subtle, #EAE2D2)',
                marginTop: '16px',
                paddingTop: '12px',
                fontSize: '11.5px',
                lineHeight: 1.6,
                color: 'var(--color-text-muted, #6B6B6B)',
                textAlign: 'center'
              }}
            >
              {receiptFooter}
            </div>
          ) : null}
        </div>

        {/* Action Bar (Not Printed) */}
        <div
          className="no-print"
          style={{
            background: 'var(--color-cream-bg, #F8F5EF)',
            padding: '14px 24px',
            borderTop: '1px solid var(--color-border-subtle, #E6DEC8)',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            alignItems: 'center'
          }}
        >
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: '#128C7E', borderColor: '#128C7E' }}
          >
            <span>💬</span> Share WhatsApp
          </a>

          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-primary"
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>🖨</span> Print Receipt
          </button>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline"
            style={{ fontSize: '13px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

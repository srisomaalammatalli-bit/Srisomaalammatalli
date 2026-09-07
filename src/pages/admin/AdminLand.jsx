import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import adminStore from '../../services/adminStore.js';
import { formatINR, formatDate } from '../../services/receiptService.js';

export default function AdminLand() {
  const { selectedFY = 'FY2026-27' } = useOutletContext() || {};
  const [store, setStore] = useState(() => adminStore.getState());

  const [showLandModal, setShowLandModal] = useState(false);
  const [showChitModal, setShowChitModal] = useState(false);

  // Land form
  const [propName, setPropName] = useState('Temple Agricultural Land (Survey No. 42)');
  const [tenantName, setTenantName] = useState('');
  const [landPeriod, setLandPeriod] = useState('Annual Kharif / Rabi 2026–27');
  const [landAmt, setLandAmt] = useState('');
  const [landPaymentDate, setLandPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSavingLand, setIsSavingLand] = useState(false);
  const [landError, setLandError] = useState('');

  // Chit form
  const [chitName, setChitName] = useState('Temple Committee Welfare Chit Group A (₹1 Lakh)');
  const [memberName, setMemberName] = useState('');
  const [installmentNo, setInstallmentNo] = useState('1');
  const [chitAmt, setChitAmt] = useState('5000');
  const [chitDate, setChitDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSavingChit, setIsSavingChit] = useState(false);
  const [chitError, setChitError] = useState('');

  // Notifications
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    return adminStore.subscribe((newState) => {
      setStore({ ...newState });
    });
  }, []);

  const displayedLand = (store.landIncome || [])
    .filter(l => !selectedFY || !l.fy || l.fy === selectedFY);

  const totalLandIncome = displayedLand
    .filter(l => l.status !== 'Rejected')
    .reduce((s, l) => s + Number(l.amount || 0), 0);

  const displayedChit = (store.chitIncome || [])
    .filter(c => !selectedFY || !c.fy || c.fy === selectedFY);

  const totalChitIncome = displayedChit
    .filter(c => c.status !== 'Cancelled')
    .reduce((s, c) => s + Number(c.amount || 0), 0);

  const showNotification = (msg, type = 'success') => {
    setNotice({ msg, type });
    setTimeout(() => setNotice(null), 5000);
  };

  const handleCreateLand = async (e) => {
    e.preventDefault();
    setLandError('');

    const trimmedTenant = tenantName.trim();
    const numAmt = Number(landAmt);

    if (!trimmedTenant) {
      setLandError('Please enter tenant / lessee name.');
      return;
    }
    if (!numAmt || numAmt <= 0) {
      setLandError('Please enter a valid lease amount greater than 0.');
      return;
    }

    try {
      setIsSavingLand(true);
      await adminStore.addLandIncome({
        type: 'land',
        kind: 'land',
        propertyName: (propName || 'Temple Agricultural Land').trim(),
        tenantName: trimmedTenant,
        period: landPeriod.trim() || 'Annual',
        amount: numAmt,
        paymentDate: landPaymentDate,
        status: 'Verified',
        fy: selectedFY
      });

      setTenantName('');
      setLandAmt('');
      setShowLandModal(false);
      showNotification('Land lease payment recorded successfully!');
    } catch (err) {
      console.error('[AdminLand] save land error:', err);
      setLandError(err?.message || 'Failed to save land lease record. Please try again.');
    } finally {
      setIsSavingLand(false);
    }
  };

  const handleDeleteLand = async (item) => {
    const pName = item.propertyName || item.property_name || 'Land parcel';
    const tName = item.tenantName || item.tenant_name || 'Tenant';
    const amt = formatINR(item.amount);

    if (!window.confirm(`Are you sure you want to delete lease record for "${pName}" (${tName}, ${amt})?`)) {
      return;
    }

    try {
      await adminStore.deleteLandIncome(item.id);
      showNotification('Land lease record deleted.');
    } catch (err) {
      alert('Failed to delete land lease record: ' + (err?.message || 'Server error'));
    }
  };

  const handleCreateChit = async (e) => {
    e.preventDefault();
    setChitError('');

    const trimmedMember = memberName.trim();
    const numAmt = Number(chitAmt);

    if (!trimmedMember) {
      setChitError('Please enter member / contributor name.');
      return;
    }
    if (!numAmt || numAmt <= 0) {
      setChitError('Please enter a valid installment amount greater than 0.');
      return;
    }

    try {
      setIsSavingChit(true);
      await adminStore.addChitIncome({
        type: 'chit',
        kind: 'chit',
        chitName: (chitName || 'Temple Committee Welfare Chit').trim(),
        memberName: trimmedMember,
        installmentNo: Number(installmentNo || 1),
        amount: numAmt,
        dueDate: chitDate,
        paidDate: chitDate,
        status: 'Paid',
        fy: selectedFY
      });

      setMemberName('');
      setShowChitModal(false);
      showNotification('Chit installment recorded successfully!');
    } catch (err) {
      console.error('[AdminLand] save chit error:', err);
      setChitError(err?.message || 'Failed to save chit installment. Please try again.');
    } finally {
      setIsSavingChit(false);
    }
  };

  const handleDeleteChit = async (chit) => {
    const cName = chit.chitName || chit.chit_name || 'Chit group';
    const mName = chit.memberName || chit.member_name || 'Member';
    const amt = formatINR(chit.amount);

    if (!window.confirm(`Are you sure you want to delete chit installment for "${cName}" (${mName}, ${amt})?`)) {
      return;
    }

    try {
      await adminStore.deleteChitIncome(chit.id);
      showNotification('Chit installment record deleted.');
    } catch (err) {
      alert('Failed to delete chit installment: ' + (err?.message || 'Server error'));
    }
  };

  return (
    <div>
      {/* Notice Banner */}
      {notice && (
        <div style={{
          background: notice.type === 'error' ? 'var(--color-maroon-primary)' : 'var(--color-success)',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: 'var(--shadow-sm)',
          fontSize: '14px',
          fontWeight: 600
        }}>
          <span>{notice.msg}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, margin: '0 0 4px', color: 'var(--color-maroon-primary)' }}>
            Land & Chit Income
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Agricultural land lease management, tenant contracts & committee welfare chit fund ledger
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => { setLandError(''); setShowLandModal(true); }}
            className="btn btn-primary"
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>+</span> Record Land Lease
          </button>
          <button
            type="button"
            onClick={() => { setChitError(''); setShowChitModal(true); }}
            className="btn btn-outline"
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', background: '#fff' }}
          >
            <span>+</span> Record Chit Installment
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: '28px' }}>
        <div className="kpi-card">
          <div className="kpi-label">TOTAL LAND LEASE ({selectedFY})</div>
          <div className="kpi-value" style={{ color: 'var(--color-gold)' }}>{formatINR(totalLandIncome)}</div>
          <div className="kpi-trend">Recorded lease income</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">CHIT FUND COLLECTIONS</div>
          <div className="kpi-value" style={{ color: 'var(--color-success)' }}>{formatINR(totalChitIncome)}</div>
          <div className="kpi-trend" style={{ color: 'var(--color-text-muted)' }}>Monthly committee welfare pooling</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">COMBINED ASSET INFLOW</div>
          <div className="kpi-value" style={{ color: 'var(--color-maroon-primary)' }}>{formatINR(totalLandIncome + totalChitIncome)}</div>
          <div className="kpi-trend" style={{ color: 'var(--color-text-muted)' }}>Protected non-donation income</div>
        </div>
      </div>

      {/* Land Lease Section */}
      <div style={{ background: 'var(--color-ivory-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-subtle)', marginBottom: '32px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, margin: 0 }}>
              Agricultural Land Lease Record
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Lease income recorded by the temple committee
            </div>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 600, background: 'rgba(184, 145, 70, 0.15)', color: 'var(--color-maroon-primary)', padding: '4px 10px', borderRadius: '12px' }}>
            Temple Property
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Property / Parcel</th>
                <th>Tenant Name</th>
                <th>Lease Period</th>
                <th>Amount</th>
                <th>Payment Date</th>
                <th>Status</th>
                <th>Deed / Proof</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(!displayedLand || displayedLand.length === 0) ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--color-text-muted)' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>🌾</div>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-text-primary)' }}>
                      No land lease records found {selectedFY ? `for ${selectedFY}` : ''}
                    </div>
                    <div style={{ fontSize: '13px', marginTop: '4px' }}>
                      Click <strong>"+ Record Land Lease"</strong> above to add agricultural lease income.
                    </div>
                  </td>
                </tr>
              ) : (
                displayedLand.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.propertyName || item.property_name || 'Temple Land'}</td>
                    <td>{item.tenantName || item.tenant_name || '—'}</td>
                    <td style={{ fontSize: '13px' }}>{item.period || 'Annual'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: '14px' }}>
                      {formatINR(item.amount)}
                    </td>
                    <td style={{ fontSize: '13px' }}>{formatDate(item.paymentDate || item.payment_date)}</td>
                    <td>
                      <span style={{ fontSize: '11px', background: 'rgba(46, 125, 91, 0.15)', color: 'var(--color-success)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                        {item.status || 'Verified'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--color-maroon-primary)', textDecoration: 'underline', cursor: 'pointer' }}>
                        📄 {item.proofUrl || item.proof_url || 'Lease-Deed.pdf'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteLand(item)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-error, #b00020)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '4px 8px',
                          borderRadius: '4px'
                        }}
                        title="Delete this lease record"
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chit Fund Section */}
      <div style={{ background: 'var(--color-ivory-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-subtle)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, margin: 0 }}>
              Committee Welfare Chit Fund Ledger
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Monthly savings cycles administered for temple emergency reserves
            </div>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 600, background: 'rgba(46, 125, 91, 0.15)', color: 'var(--color-success)', padding: '4px 10px', borderRadius: '12px' }}>
            Active Cycle
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Chit Scheme</th>
                <th>Member / Trustee</th>
                <th>Installment #</th>
                <th>Due Date</th>
                <th>Paid Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(!displayedChit || displayedChit.length === 0) ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--color-text-muted)' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>💰</div>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-text-primary)' }}>
                      No chit fund installments found {selectedFY ? `for ${selectedFY}` : ''}
                    </div>
                    <div style={{ fontSize: '13px', marginTop: '4px' }}>
                      Click <strong>"+ Record Chit Installment"</strong> above to record committee welfare contributions.
                    </div>
                  </td>
                </tr>
              ) : (
                displayedChit.map((chit) => (
                  <tr key={chit.id}>
                    <td style={{ fontWeight: 600 }}>{chit.chitName || chit.chit_name || 'Chit Group'}</td>
                    <td>{chit.memberName || chit.member_name || '—'}</td>
                    <td style={{ fontWeight: 600 }}>Installment #{chit.installmentNo ?? chit.installment_no ?? 1}</td>
                    <td style={{ fontSize: '13px' }}>{formatDate(chit.dueDate || chit.due_date)}</td>
                    <td style={{ fontSize: '13px' }}>{formatDate(chit.paidDate || chit.paid_date)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: '14px' }}>
                      {formatINR(chit.amount)}
                    </td>
                    <td>
                      <span style={{ fontSize: '11px', background: 'rgba(46, 125, 91, 0.15)', color: 'var(--color-success)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                        {chit.status || 'Paid'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteChit(chit)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-error, #b00020)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '4px 8px',
                          borderRadius: '4px'
                        }}
                        title="Delete this installment"
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Land Modal */}
      {showLandModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '28px', boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--color-maroon-primary)' }}>
                Record Land Lease Rent
              </h3>
              <button
                type="button"
                onClick={() => setShowLandModal(false)}
                style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {landError && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px', fontWeight: 500 }}>
                ⚠️ {landError}
              </div>
            )}

            <form onSubmit={handleCreateLand}>
              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Land Parcel / Property *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Temple Agricultural Land (Survey No. 42)"
                  value={propName}
                  onChange={(e) => setPropName(e.target.value)}
                  className="input-field"
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Tenant / Lessee Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sri K. Satyanarayana"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="input-field"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="input-label">Lease Period</label>
                  <input
                    type="text"
                    value={landPeriod}
                    onChange={(e) => setLandPeriod(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 25000"
                    value={landAmt}
                    onChange={(e) => setLandAmt(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="input-label">Payment Date</label>
                <input
                  type="date"
                  value={landPaymentDate}
                  onChange={(e) => setLandPaymentDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  disabled={isSavingLand}
                  onClick={() => setShowLandModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingLand}
                  className="btn btn-primary"
                >
                  {isSavingLand ? 'Saving Record…' : 'Save Lease Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Chit Modal */}
      {showChitModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '28px', boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--color-maroon-primary)' }}>
                Record Chit Installment
              </h3>
              <button
                type="button"
                onClick={() => setShowChitModal(false)}
                style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {chitError && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px', fontWeight: 500 }}>
                ⚠️ {chitError}
              </div>
            )}

            <form onSubmit={handleCreateChit}>
              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Chit Fund Scheme *</label>
                <input
                  type="text"
                  required
                  value={chitName}
                  onChange={(e) => setChitName(e.target.value)}
                  className="input-field"
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Member / Trustee Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sri V. Subba Rao"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="input-field"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="input-label">Installment #</label>
                  <input
                    type="number"
                    min="1"
                    value={installmentNo}
                    onChange={(e) => setInstallmentNo(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 5000"
                    value={chitAmt}
                    onChange={(e) => setChitAmt(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="input-label">Payment Date</label>
                <input
                  type="date"
                  value={chitDate}
                  onChange={(e) => setChitDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  disabled={isSavingChit}
                  onClick={() => setShowChitModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingChit}
                  className="btn btn-primary"
                >
                  {isSavingChit ? 'Saving Record…' : 'Save Installment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

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
  // Left blank: the committee records the actual parcel details.
  const [propName, setPropName] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [landPeriod, setLandPeriod] = useState('Annual Kharif / Rabi 2026–27');
  const [landAmt, setLandAmt] = useState('');

  // Chit form
  const [chitName, setChitName] = useState('Temple Committee Welfare Chit Group A (₹1 Lakh)');
  const [memberName, setMemberName] = useState('');
  const [installmentNo, setInstallmentNo] = useState('7');
  const [chitAmt, setChitAmt] = useState('5000');

  useEffect(() => {
    return adminStore.subscribe((newState) => {
      setStore({ ...newState });
    });
  }, []);

  const totalLandIncome = store.landIncome
    .filter(l => !l.fy || l.fy === selectedFY)
    .reduce((s, l) => s + Number(l.amount), 0);

  const totalChitIncome = store.chitIncome
    .filter(c => !c.fy || c.fy === selectedFY)
    .reduce((s, c) => s + Number(c.amount), 0);

  const handleCreateLand = (e) => {
    e.preventDefault();
    if (!tenantName.trim() || !landAmt || Number(landAmt) <= 0) return;

    adminStore.addLandIncome({
      propertyName: propName,
      tenantName: tenantName.trim(),
      period: landPeriod,
      amount: Number(landAmt),
      status: 'Verified',
      fy: selectedFY
    });

    setTenantName('');
    setLandAmt('');
    setShowLandModal(false);
  };

  const handleCreateChit = (e) => {
    e.preventDefault();
    if (!memberName.trim() || !chitAmt || Number(chitAmt) <= 0) return;

    adminStore.addChitIncome({
      chitName,
      memberName: memberName.trim(),
      installmentNo: Number(installmentNo),
      amount: Number(chitAmt),
      dueDate: new Date().toISOString().split('T')[0],
      paidDate: new Date().toISOString().split('T')[0],
      status: 'Paid',
      fy: selectedFY
    });

    setMemberName('');
    setShowChitModal(false);
  };

  return (
    <div>
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
            onClick={() => setShowLandModal(true)}
            className="btn btn-primary"
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>+</span> Record Land Lease
          </button>
          <button
            type="button"
            onClick={() => setShowChitModal(true)}
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
              </tr>
            </thead>
            <tbody>
              {store.landIncome.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.propertyName}</td>
                  <td>{item.tenantName}</td>
                  <td style={{ fontSize: '13px' }}>{item.period}</td>
                  <td style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: '14px' }}>
                    {formatINR(item.amount)}
                  </td>
                  <td style={{ fontSize: '13px' }}>{formatDate(item.paymentDate)}</td>
                  <td>
                    <span style={{ fontSize: '11px', background: 'rgba(46, 125, 91, 0.15)', color: 'var(--color-success)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', color: 'var(--color-maroon-primary)', textDecoration: 'underline', cursor: 'pointer' }}>
                      📄 {item.proofUrl || 'Lease-Deed.pdf'}
                    </span>
                  </td>
                </tr>
              ))}
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
              </tr>
            </thead>
            <tbody>
              {store.chitIncome.map((chit) => (
                <tr key={chit.id}>
                  <td style={{ fontWeight: 600 }}>{chit.chitName}</td>
                  <td>{chit.memberName}</td>
                  <td style={{ fontWeight: 600 }}>Installment #{chit.installmentNo}</td>
                  <td style={{ fontSize: '13px' }}>{formatDate(chit.dueDate)}</td>
                  <td style={{ fontSize: '13px' }}>{formatDate(chit.paidDate)}</td>
                  <td style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: '14px' }}>
                    {formatINR(chit.amount)}
                  </td>
                  <td>
                    <span style={{ fontSize: '11px', background: 'rgba(46, 125, 91, 0.15)', color: 'var(--color-success)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                      {chit.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Land Modal */}
      {showLandModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--color-maroon-primary)' }}>
                Record Land Lease Rent
              </h3>
              <button onClick={() => setShowLandModal(false)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleCreateLand}>
              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Land Parcel *</label>
                <input
                  type="text"
                  required
                  value={propName}
                  onChange={(e) => setPropName(e.target.value)}
                  className="input-field"
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Tenant Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Lessee name"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="input-field"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
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
                    placeholder="e.g. 30000"
                    value={landAmt}
                    onChange={(e) => setLandAmt(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowLandModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Lease Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Chit Modal */}
      {showChitModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--color-maroon-primary)' }}>
                Record Chit Installment
              </h3>
              <button onClick={() => setShowChitModal(false)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleCreateChit}>
              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Chit Fund Name *</label>
                <input
                  type="text"
                  required
                  value={chitName}
                  onChange={(e) => setChitName(e.target.value)}
                  className="input-field"
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Member / Contributor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Member name"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="input-field"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label className="input-label">Installment #</label>
                  <input
                    type="number"
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
                    value={chitAmt}
                    onChange={(e) => setChitAmt(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowChitModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Installment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

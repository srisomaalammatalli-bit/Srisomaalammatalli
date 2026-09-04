import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import adminStore from '../../services/adminStore.js';
import { formatINR, formatDate, maskMobile } from '../../services/receiptService.js';
import ReceiptModal from '../../components/ReceiptModal.jsx';

export default function AdminDonations() {
  const { selectedFY = 'FY2026-27', searchQuery = '' } = useOutletContext() || {};
  const [store, setStore] = useState(() => adminStore.getState());
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Filters
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterMethod, setFilterMethod] = useState('All');
  const [filterText, setFilterText] = useState('');

  // Add form fields
  const [donorName, setDonorName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('General Temple Donation');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    return adminStore.subscribe((newState) => {
      setStore({ ...newState });
    });
  }, []);

  const donations = store.donations.filter(d => {
    if (d.fy && d.fy !== selectedFY) return false;
    if (filterCategory !== 'All' && d.category !== filterCategory) return false;
    if (filterMethod !== 'All' && d.paymentMethod !== filterMethod) return false;

    const q = (searchQuery || filterText).toLowerCase();
    if (q) {
      const matchName = d.donorName.toLowerCase().includes(q);
      const matchMobile = d.mobile.includes(q);
      const matchReceipt = d.receiptNo.toLowerCase().includes(q);
      const matchCat = d.category.toLowerCase().includes(q);
      if (!matchName && !matchMobile && !matchReceipt && !matchCat) return false;
    }
    return true;
  });

  const totalAmount = donations.reduce((sum, d) => sum + Number(d.amount), 0);
  const upiTotal = donations.filter(d => d.paymentMethod === 'UPI').reduce((sum, d) => sum + Number(d.amount), 0);
  const cashTotal = donations.filter(d => d.paymentMethod === 'Cash').reduce((sum, d) => sum + Number(d.amount), 0);

  const handleCreateDonation = (e) => {
    e.preventDefault();
    if (!donorName.trim() || !amount || Number(amount) <= 0) return;

    const newDon = adminStore.addDonation({
      donorName: donorName.trim(),
      // No invented fallback: an unrecorded number stays unrecorded.
      mobile: mobile.trim(),
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      category,
      amount: Number(amount),
      paymentMethod,
      notes: notes.trim() || 'Recorded via Admin Portal',
      fy: selectedFY
    });

    setDonorName('');
    setMobile('');
    setEmail('');
    setAddress('');
    setAmount('');
    setNotes('');
    setShowAddModal(false);
    setSelectedReceipt(newDon);
  };

  const exportCSV = () => {
    const headers = ['Receipt No', 'Donor Name', 'Mobile', 'Category', 'Amount', 'Payment Method', 'Date', 'Status'];
    const rows = donations.map(d => [
      d.receiptNo,
      `"${d.donorName}"`,
      d.mobile,
      `"${d.category}"`,
      d.amount,
      d.paymentMethod,
      d.paymentDate,
      d.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Donations_${selectedFY}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* Header & Primary Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, margin: '0 0 4px', color: 'var(--color-maroon-primary)' }}>
            Donation Management
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Devotee offerings, online sevas, automated receipts & verifiable audit entries
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={exportCSV}
            className="btn btn-outline"
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', background: '#fff' }}
          >
            <span>📥</span> Export CSV
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>+</span> Record New Donation
          </button>
        </div>
      </div>

      {/* Mini KPI Bar */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-label">TOTAL DONATIONS ({selectedFY})</div>
          <div className="kpi-value" style={{ color: 'var(--color-maroon-primary)' }}>{formatINR(totalAmount)}</div>
          <div className="kpi-trend" style={{ color: 'var(--color-success)' }}>{donations.length} Verified Offerings</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">UPI DIGITAL RECEIPTS</div>
          <div className="kpi-value" style={{ color: 'var(--color-success)' }}>{formatINR(upiTotal)}</div>
          <div className="kpi-trend" style={{ color: 'var(--color-text-muted)' }}>PhonePe, GPay, Paytm, BHIM</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">CASH & HUNDI SEVAS</div>
          <div className="kpi-value" style={{ color: 'var(--color-saffron)' }}>{formatINR(cashTotal)}</div>
          <div className="kpi-trend" style={{ color: 'var(--color-text-muted)' }}>Sanctum counter offerings</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ background: 'var(--color-ivory-surface)', padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-subtle)', marginBottom: '20px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Filter by name, mobile, receipt no…"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{
            flex: '1 1 220px',
            padding: '8px 14px',
            border: '1px solid var(--color-border-input)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            background: 'var(--color-cream-bg)'
          }}
        />

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{
            padding: '8px 14px',
            border: '1px solid var(--color-border-input)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            background: 'var(--color-cream-bg)'
          }}
        >
          <option value="All">All Categories</option>
          <option value="General Temple Donation">General Temple</option>
          <option value="Annual Jathara Contribution">Annual Jathara</option>
          <option value="Special Pooja / Seva">Special Pooja / Seva</option>
          <option value="Temple Development">Temple Development</option>
          <option value="Other Contribution">Other</option>
        </select>

        <select
          value={filterMethod}
          onChange={(e) => setFilterMethod(e.target.value)}
          style={{
            padding: '8px 14px',
            border: '1px solid var(--color-border-input)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            background: 'var(--color-cream-bg)'
          }}
        >
          <option value="All">All Payment Modes</option>
          <option value="UPI">UPI</option>
          <option value="Cash">Cash</option>
          <option value="Bank Transfer">Bank Transfer</option>
        </select>
      </div>

      {/* Main Ledger Table */}
      <div style={{ background: 'var(--color-ivory-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-subtle)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Receipt No</th>
                <th>Devotee Name</th>
                <th>Mobile</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {donations.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: 'var(--color-text-muted)' }}>
                    No donations matching the filter criteria found.
                  </td>
                </tr>
              ) : (
                donations.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-maroon-primary)' }}>
                      {d.receiptNo}
                    </td>
                    <td style={{ fontWeight: 600 }}>{d.donorName}</td>
                    <td style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{maskMobile(d.mobile)}</td>
                    <td>
                      <span style={{ fontSize: '12px', background: 'rgba(184, 145, 70, 0.12)', color: 'var(--color-maroon-primary)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                        {d.category}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: '14px' }}>
                      {formatINR(d.amount)}
                    </td>
                    <td style={{ fontSize: '13px' }}>{d.paymentMethod}</td>
                    <td style={{ fontSize: '13px' }}>{formatDate(d.paymentDate)}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: 'rgba(46, 125, 91, 0.15)',
                          color: 'var(--color-success)'
                        }}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(d)}
                        className="btn btn-outline"
                        style={{ fontSize: '12px', padding: '4px 10px' }}
                      >
                        🖨 Receipt
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Donation Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--color-maroon-primary)' }}>
                Record Devotee Offering
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreateDonation}>
              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Devotee / Family Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smt. Lakshmi & Sri Narsimha Rao"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="input-label">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="devotee@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Village / Native Place</label>
                <input
                  type="text"
                  placeholder="Village or town, district"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="input-label">Offering Category *</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
                    <option value="General Temple Donation">General Temple Donation</option>
                    <option value="Annual Jathara Contribution">Annual Jathara Contribution</option>
                    <option value="Special Pooja / Seva">Special Pooja / Seva</option>
                    <option value="Temple Development">Temple Development</option>
                    <option value="Other Contribution">Other Contribution</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 1001"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input-field">
                  <option value="UPI">UPI (QR Code / PhonePe / GPay)</option>
                  <option value="Cash">Cash Offering</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="input-label">Special Notes / Gotram</label>
                <input
                  type="text"
                  placeholder="e.g. Sankalpam in name of son; or anniversary"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Generate Official Receipt</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      )}
    </div>
  );
}

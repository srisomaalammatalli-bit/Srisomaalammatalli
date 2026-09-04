import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import adminStore from '../../services/adminStore.js';
import { formatINR, formatDate } from '../../services/receiptService.js';
import ReceiptModal from '../../components/ReceiptModal.jsx';

export default function AdminDashboard() {
  const { selectedFY = 'FY2026-27', searchQuery = '' } = useOutletContext() || {};
  const [store, setStore] = useState(() => adminStore.getState());
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Quick action modals
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Form states for quick donation
  const [donName, setDonName] = useState('');
  const [donMobile, setDonMobile] = useState('');
  const [donCat, setDonCat] = useState('General Temple Donation');
  const [donAmt, setDonAmt] = useState('');
  const [donPayMethod, setDonPayMethod] = useState('UPI');

  // Form states for quick expense
  const [expTitle, setExpTitle] = useState('');
  const [expCat, setExpCat] = useState('Pooja Materials');
  const [expAmt, setExpAmt] = useState('');
  const [expPayee, setExpPayee] = useState('');
  const [expPayMethod, setExpPayMethod] = useState('UPI');

  useEffect(() => {
    return adminStore.subscribe((newState) => {
      setStore({ ...newState });
    });
  }, []);

  const kpis = adminStore.getDashboardKPIs(selectedFY);
  const summary = adminStore.getFinancialSummary(selectedFY);

  // Filter recent donations and expenses into a unified feed
  const donations = store.donations.map(d => ({
    type: 'Income',
    title: `${d.donorName} (${d.category})`,
    category: d.category,
    amount: d.amount,
    date: d.paymentDate,
    status: d.status,
    raw: d
  }));

  const expenses = store.expenses.map(e => ({
    type: 'Expense',
    title: `${e.paidTo} — ${e.title}`,
    category: e.category,
    amount: e.amount,
    date: e.expenseDate,
    status: e.status,
    raw: e
  }));

  const allTxns = [...donations, ...expenses]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .filter(item => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    });

  const handleSaveDonation = (e) => {
    e.preventDefault();
    if (!donName.trim() || !donAmt || Number(donAmt) <= 0) return;

    const newDon = adminStore.addDonation({
      donorName: donName.trim(),
      // No invented fallback: an unrecorded number stays unrecorded.
      mobile: donMobile.trim(),
      category: donCat,
      amount: Number(donAmt),
      paymentMethod: donPayMethod,
      fy: selectedFY
    });

    setDonName('');
    setDonMobile('');
    setDonAmt('');
    setShowDonationModal(false);
    setSelectedReceipt(newDon);
  };

  const handleSaveExpense = (e) => {
    e.preventDefault();
    if (!expTitle.trim() || !expAmt || Number(expAmt) <= 0 || !expPayee.trim()) return;

    adminStore.addExpense({
      title: expTitle.trim(),
      category: expCat,
      amount: Number(expAmt),
      paidTo: expPayee.trim(),
      paymentMethod: expPayMethod,
      fy: selectedFY
    });

    setExpTitle('');
    setExpAmt('');
    setExpPayee('');
    setShowExpenseModal(false);
  };

  const monthlyBreakdown = [
    { m: 'Apr', inc: 18500, exp: 6200 },
    { m: 'May', inc: 15200, exp: 5400 },
    { m: 'Jun', inc: 43800, exp: 4900 },
    { m: 'Jul', inc: 26400, exp: 9800 },
    { m: 'Aug', inc: 21900, exp: 7300 },
    { m: 'Sep', inc: 32500, exp: 11450 },
    { m: 'Oct', inc: 16800, exp: 5600 },
    { m: 'Nov', inc: 19200, exp: 7100 },
    { m: 'Dec', inc: 17400, exp: 5800 },
    { m: 'Jan', inc: 13600, exp: 5200 },
    { m: 'Feb', inc: 54800, exp: 18900 },
    { m: 'Mar', inc: 15400, exp: 6100 }
  ];

  const maxChartAmt = 60000;

  return (
    <div>
      {/* Top Banner & Quick Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, margin: '0 0 4px', color: 'var(--color-maroon-primary)' }}>
            Temple Committee Dashboard
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Overview for <strong>{selectedFY}</strong> · Sri Somalamma Talli Temple Devasthanam
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setShowDonationModal(true)}
            className="btn btn-primary"
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>+</span> Record Donation
          </button>
          <button
            type="button"
            onClick={() => setShowExpenseModal(true)}
            className="btn btn-outline"
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', background: '#fff' }}
          >
            <span>+</span> Add Expense
          </button>
          <Link
            to="/admin/land-chit"
            className="btn btn-outline"
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', background: '#fff' }}
          >
            <span>◱</span> Land & Chit
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="kpi-grid">
        {kpis.map((kpi) => (
          <div key={kpi.id} className="kpi-card">
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-value" style={{ color: kpi.id === 'kpi_income' ? 'var(--color-success)' : (kpi.id === 'kpi_expenses' ? 'var(--color-danger)' : 'inherit') }}>
              {kpi.isCurrency === false ? kpi.value.toLocaleString('en-IN') : formatINR(kpi.value)}
            </div>
            <div className="kpi-trend" style={{ color: kpi.trendColor }}>
              {kpi.trend}
            </div>
          </div>
        ))}
      </div>

      {/* Charts & Analytics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* Dual Bar Monthly Cashflow Chart */}
        <div style={{ background: 'var(--color-ivory-surface)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: 'var(--color-text-muted)' }}>
                ANNUAL CASHFLOW ANALYSIS
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700 }}>
                Income vs Expenses (12 Months)
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', background: 'var(--color-success)', borderRadius: '2px' }} /> Income
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', background: 'var(--color-danger)', borderRadius: '2px' }} /> Expense
              </span>
            </div>
          </div>

          <div className="chart-container" style={{ height: '180px' }}>
            {monthlyBreakdown.map((item) => {
              const incHeight = Math.min(100, Math.round((item.inc / maxChartAmt) * 100));
              const expHeight = Math.min(100, Math.round((item.exp / maxChartAmt) * 100));
              return (
                <div key={item.m} className="chart-bar-group" title={`${item.m}: Income ${formatINR(item.inc)} | Expense ${formatINR(item.exp)}`}>
                  <div className="chart-bars">
                    <div className="bar-income" style={{ height: `${incHeight}%` }} />
                    <div className="bar-expense" style={{ height: `${expHeight}%` }} />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 600 }}>{item.m}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Income Sources & Category Allocations */}
        <div style={{ background: 'var(--color-ivory-surface)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-subtle)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
            FUNDS ALLOCATION
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, marginBottom: '18px' }}>
            Income Streams ({selectedFY})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>Annual Jathara Collections</span>
                <span style={{ fontWeight: 700 }}>{formatINR(summary.jatharaCollection)}</span>
              </div>
              <div style={{ height: '8px', background: 'var(--color-sand-alt)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.round((summary.jatharaCollection / (summary.totalIncome || 1)) * 100)}%`, height: '100%', background: 'var(--color-maroon-primary)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>Devotee Donations & Sevas</span>
                <span style={{ fontWeight: 700 }}>{formatINR(summary.totalDonations)}</span>
              </div>
              <div style={{ height: '8px', background: 'var(--color-sand-alt)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.round((summary.totalDonations / (summary.totalIncome || 1)) * 100)}%`, height: '100%', background: 'var(--color-saffron)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>Agricultural Land Lease</span>
                <span style={{ fontWeight: 700 }}>{formatINR(summary.totalLand)}</span>
              </div>
              <div style={{ height: '8px', background: 'var(--color-sand-alt)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.round((summary.totalLand / (summary.totalIncome || 1)) * 100)}%`, height: '100%', background: 'var(--color-gold)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>Committee Welfare Chit Fund</span>
                <span style={{ fontWeight: 700 }}>{formatINR(summary.totalChit)}</span>
              </div>
              <div style={{ height: '8px', background: 'var(--color-sand-alt)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.round((summary.totalChit / (summary.totalIncome || 1)) * 100)}%`, height: '100%', background: 'var(--color-success)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Unified Table */}
      <div style={{ background: 'var(--color-ivory-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-subtle)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-subtle)' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, margin: 0 }}>
              Recent Transactions Feed
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Live consolidated stream of devotee offerings and temple expenditures
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/admin/donations" className="btn btn-outline" style={{ fontSize: '12px', padding: '6px 12px' }}>
              All Donations →
            </Link>
            <Link to="/admin/expenses" className="btn btn-outline" style={{ fontSize: '12px', padding: '6px 12px' }}>
              All Expenses →
            </Link>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Particulars / Name</th>
                <th>Category</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Receipt / Action</th>
              </tr>
            </thead>
            <tbody>
              {allTxns.slice(0, 8).map((t, idx) => (
                <tr key={idx}>
                  <td>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '12px',
                        background: t.type === 'Income' ? 'rgba(46, 125, 91, 0.12)' : 'rgba(178, 58, 72, 0.12)',
                        color: t.type === 'Income' ? 'var(--color-success)' : 'var(--color-danger)'
                      }}
                    >
                      {t.type === 'Income' ? '↓ Received' : '↑ Paid'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{t.title}</td>
                  <td style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{t.category}</td>
                  <td style={{ fontSize: '13px' }}>{formatDate(t.date)}</td>
                  <td style={{ fontWeight: 700, color: t.type === 'Income' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {t.type === 'Income' ? '+' : '-'}{formatINR(t.amount)}
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: t.status === 'Verified' ? 'rgba(46, 125, 91, 0.15)' : 'rgba(217, 119, 43, 0.15)',
                        color: t.status === 'Verified' ? 'var(--color-success)' : 'var(--color-saffron)'
                      }}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {t.type === 'Income' ? (
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(t.raw)}
                        className="btn btn-outline"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                      >
                        🖨 Receipt
                      </button>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        {t.raw.receiptUrl ? '📄 Bill On File' : '⚠️ Pending Bill'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Add Donation Modal */}
      {showDonationModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, margin: 0 }}>
                Record New Devotee Donation
              </h3>
              <button onClick={() => setShowDonationModal(false)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleSaveDonation}>
              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Devotee / Donor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smt. Lakshmi & Sri Narsimha Rao"
                  value={donName}
                  onChange={(e) => setDonName(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="10-digit mobile"
                  value={donMobile}
                  onChange={(e) => setDonMobile(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="input-label">Offering Category</label>
                  <select value={donCat} onChange={(e) => setDonCat(e.target.value)} className="input-field">
                    <option value="General Temple Donation">General Temple</option>
                    <option value="Annual Jathara Contribution">Annual Jathara</option>
                    <option value="Special Pooja / Seva">Special Pooja</option>
                    <option value="Temple Development">Development</option>
                    <option value="Other Contribution">Other</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 1001"
                    value={donAmt}
                    onChange={(e) => setDonAmt(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="input-label">Payment Mode</label>
                <select value={donPayMethod} onChange={(e) => setDonPayMethod(e.target.value)} className="input-field">
                  <option value="UPI">UPI (QR Code / PhonePe / GPay)</option>
                  <option value="Cash">Cash Offering</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowDonationModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Save & Issue Receipt</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Expense Modal */}
      {showExpenseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, margin: 0 }}>
                Record Temple Expense
              </h3>
              <button onClick={() => setShowExpenseModal(false)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleSaveExpense}>
              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Expense Title / Item *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annadanam Rice & Provisions"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Paid To (Vendor / Person) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sri Balaji General Stores"
                  value={expPayee}
                  onChange={(e) => setExpPayee(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="input-label">Category</label>
                  <select value={expCat} onChange={(e) => setExpCat(e.target.value)} className="input-field">
                    <option value="Pooja Materials">Pooja Materials</option>
                    <option value="Annadanam">Annadanam</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Electricity & Water">Electricity & Water</option>
                    <option value="Annual Jathara">Annual Jathara</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 4500"
                    value={expAmt}
                    onChange={(e) => setExpAmt(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="input-label">Payment Mode</label>
                <select value={expPayMethod} onChange={(e) => setExpPayMethod(e.target.value)} className="input-field">
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowExpenseModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Record Expense</button>
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

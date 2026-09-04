import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import adminStore from '../../services/adminStore.js';
import { formatINR, formatDate } from '../../services/receiptService.js';

export default function AdminExpenses() {
  const { selectedFY = 'FY2026-27', searchQuery = '' } = useOutletContext() || {};
  const [store, setStore] = useState(() => adminStore.getState());
  const [showAddModal, setShowAddModal] = useState(false);

  // Filter states
  const [filterCat, setFilterCat] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchText, setSearchText] = useState('');

  // Add Expense fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Pooja Materials');
  const [amount, setAmount] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [description, setDescription] = useState('');
  const [hasReceipt, setHasReceipt] = useState(true);

  useEffect(() => {
    return adminStore.subscribe((newState) => {
      setStore({ ...newState });
    });
  }, []);

  const expenses = store.expenses.filter(e => {
    if (e.fy && e.fy !== selectedFY) return false;
    if (filterCat !== 'All' && e.category !== filterCat) return false;
    if (filterStatus !== 'All' && e.status !== filterStatus) return false;

    const q = (searchQuery || searchText).toLowerCase();
    if (q) {
      const matchTitle = e.title.toLowerCase().includes(q);
      const matchPayee = e.paidTo.toLowerCase().includes(q);
      const matchCat = e.category.toLowerCase().includes(q);
      if (!matchTitle && !matchPayee && !matchCat) return false;
    }
    return true;
  });

  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const missingCount = expenses.filter(e => e.status === 'Missing').length;
  const verifiedTotal = expenses.filter(e => e.status === 'Verified').reduce((s, e) => s + Number(e.amount), 0);

  const handleCreateExpense = (e) => {
    e.preventDefault();
    if (!title.trim() || !amount || Number(amount) <= 0 || !paidTo.trim()) return;

    adminStore.addExpense({
      title: title.trim(),
      category,
      amount: Number(amount),
      paidTo: paidTo.trim(),
      paymentMethod,
      description: description.trim(),
      receiptUrl: hasReceipt ? `VOUCHER-${Date.now().toString().slice(-4)}.pdf` : null,
      status: hasReceipt ? 'Verified' : 'Missing',
      fy: selectedFY
    });

    setTitle('');
    setAmount('');
    setPaidTo('');
    setDescription('');
    setShowAddModal(false);
  };

  const markAsVerified = (expId) => {
    const updated = store.expenses.map(exp => {
      if (exp.id === expId) {
        return { ...exp, status: 'Verified', receiptUrl: `VOUCHER-${Date.now().toString().slice(-4)}.pdf` };
      }
      return exp;
    });
    adminStore.state.expenses = updated;
    adminStore.saveState();
  };

  const exportCSV = () => {
    const headers = ['Date', 'Title', 'Payee', 'Category', 'Amount', 'Payment Method', 'Status', 'Bill Document'];
    const rows = expenses.map(e => [
      e.expenseDate,
      `"${e.title}"`,
      `"${e.paidTo}"`,
      `"${e.category}"`,
      e.amount,
      e.paymentMethod,
      e.status,
      e.receiptUrl || 'None'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Expenses_${selectedFY}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* Header & Main Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, margin: '0 0 4px', color: 'var(--color-maroon-primary)' }}>
            Expense Management
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Voucher verification, bills on file, vendor payments & strict financial governance
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
            <span>+</span> Record New Expense
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-label">TOTAL EXPENSES ({selectedFY})</div>
          <div className="kpi-value" style={{ color: 'var(--color-danger)' }}>{formatINR(totalExpense)}</div>
          <div className="kpi-trend" style={{ color: 'var(--color-text-muted)' }}>{expenses.length} Total line items</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">AUDITED & VERIFIED</div>
          <div className="kpi-value" style={{ color: 'var(--color-success)' }}>{formatINR(verifiedTotal)}</div>
          <div className="kpi-trend" style={{ color: 'var(--color-success)' }}>Supported by bill or voucher</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">MISSING RECEIPTS</div>
          <div className="kpi-value" style={{ color: missingCount > 0 ? 'var(--color-saffron)' : 'var(--color-success)' }}>
            {missingCount} Items
          </div>
          <div className="kpi-trend" style={{ color: missingCount > 0 ? 'var(--color-saffron)' : 'var(--color-text-muted)' }}>
            {missingCount > 0 ? 'Action required: upload receipt' : 'All receipts verified'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ background: 'var(--color-ivory-surface)', padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-subtle)', marginBottom: '20px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by payee, item title…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
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
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          style={{
            padding: '8px 14px',
            border: '1px solid var(--color-border-input)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            background: 'var(--color-cream-bg)'
          }}
        >
          <option value="All">All Categories</option>
          <option value="Pooja Materials">Pooja Materials</option>
          <option value="Annadanam">Annadanam</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Electricity & Water">Electricity & Water</option>
          <option value="Annual Jathara">Annual Jathara</option>
          <option value="Miscellaneous">Miscellaneous</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '8px 14px',
            border: '1px solid var(--color-border-input)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            background: 'var(--color-cream-bg)'
          }}
        >
          <option value="All">All Statuses</option>
          <option value="Verified">Verified Bills</option>
          <option value="Missing">Missing Receipts</option>
        </select>
      </div>

      {/* Expense Ledger Table */}
      <div style={{ background: 'var(--color-ivory-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-subtle)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Item / Description</th>
                <th>Paid To (Vendor)</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Voucher / Bill</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--color-text-muted)' }}>
                    No expense items matching the criteria found.
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id}>
                    <td style={{ fontSize: '13px' }}>{formatDate(e.expenseDate)}</td>
                    <td style={{ fontWeight: 600 }}>
                      <div>{e.title}</div>
                      {e.description && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{e.description}</div>}
                    </td>
                    <td style={{ fontSize: '13px', fontWeight: 500 }}>{e.paidTo}</td>
                    <td>
                      <span style={{ fontSize: '12px', background: 'var(--color-sand-alt)', padding: '3px 8px', borderRadius: '10px', fontWeight: 600 }}>
                        {e.category}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-danger)', fontSize: '14px' }}>
                      {formatINR(e.amount)}
                    </td>
                    <td style={{ fontSize: '13px' }}>{e.paymentMethod}</td>
                    <td>
                      {e.status === 'Verified' ? (
                        <span style={{ fontSize: '11px', background: 'rgba(46, 125, 91, 0.15)', color: 'var(--color-success)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          ✓ {e.receiptUrl || 'On File'}
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', background: 'rgba(217, 119, 43, 0.15)', color: 'var(--color-saffron)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                          ⚠️ Missing Receipt
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {e.status === 'Missing' ? (
                        <button
                          type="button"
                          onClick={() => markAsVerified(e.id)}
                          className="btn btn-outline"
                          style={{ fontSize: '11px', padding: '4px 8px', color: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                        >
                          + Verify Bill
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Verified</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Expense Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--color-maroon-primary)' }}>
                Record Temple Expenditure
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreateExpense}>
              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Expense Item / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sanctum Illumination & Sound setup"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="input-label">Category *</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
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
                    placeholder="e.g. 5000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Paid To (Vendor Name / Payee) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sri Balaji Electrical Works"
                  value={paidTo}
                  onChange={(e) => setPaidTo(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Payment Mode</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input-field">
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT)</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Description / Remarks</label>
                <textarea
                  rows="2"
                  placeholder="Details of the work or goods purchased..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="hasRec"
                  checked={hasReceipt}
                  onChange={(e) => setHasReceipt(e.target.checked)}
                />
                <label htmlFor="hasRec" style={{ fontSize: '13px', cursor: 'pointer' }}>
                  Bill / Voucher has been verified and placed on physical temple file
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Record Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

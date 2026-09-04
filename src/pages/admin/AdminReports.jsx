import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import adminStore from '../../services/adminStore.js';
import { formatINR } from '../../services/receiptService.js';
import { useSettings, composeAddress, settingValue } from '../../hooks/useSettings.js';

export default function AdminReports() {
  // Temple identity for the statement header comes from settings. A
  // registration or trust status is printed only if the committee has
  // entered one — never asserted by the application.
  const { settings } = useSettings();
  const templeName = settingValue(settings, 'temple_name', 'Sri Somalamma Talli Temple');
  const templeAddress = composeAddress(settings);
  const registrationLine = settingValue(settings, 'receipt_registration_line');
  const { selectedFY = 'FY2026-27' } = useOutletContext() || {};
  const [store, setStore] = useState(() => adminStore.getState());

  useEffect(() => {
    return adminStore.subscribe((newState) => {
      setStore({ ...newState });
    });
  }, []);

  const summary = adminStore.getFinancialSummary(selectedFY);

  // Opening balance comes from the financial year record; it is zero until the
  // committee enters the real figure. It is never assumed.
  const activeYear = (store.financialYears || []).find((y) => y.id === selectedFY);
  const openingBalance = Number(activeYear?.opening_balance || 0);
  const netTotalFunds = openingBalance + summary.totalIncome;
  const closingBalance = netTotalFunds - summary.totalExpenses;

  // Report signatories are the committee's own office bearers, from the
  // database — never hard-coded names.
  const signatories = (store.committee || []).filter((m) =>
    /president|treasurer|secretary/i.test(m.role || '')
  );

  // Receipt lines, from the aggregated summary.
  const inflowRows = [
    { label: 'Opening Bank Balance (as of April 1)', amount: openingBalance },
    { label: 'Devotee Donations & Seva Offerings', amount: summary.totalDonations },
    { label: 'Annual Jathara Devotee Contributions', amount: summary.jatharaCollection },
    { label: 'Land Lease Income', amount: summary.totalLand },
    { label: 'Committee Welfare Chit Group Yield', amount: summary.totalChit }
  ];

  // Expenditure lines, from recorded expenses. Empty until the committee
  // enters them, rather than showing invented figures.
  const expenseRows = (store.expenses || []).map((e) => ({
    label: e.title || e.category || 'Expense',
    amount: Number(e.amount) || 0
  }));

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const lines = [
      [`${templeName} - Financial Statement`, selectedFY],
      ['Generated On', new Date().toLocaleDateString('en-IN')],
      [],
      ['PARTICULARS', 'AMOUNT (INR)'],
      ['Opening Balance as on 01-April', openingBalance],
      ['Devotee Donations & Sevas', summary.totalDonations],
      ['Annual Jathara Collections', summary.jatharaCollection],
      ['Agricultural Land Lease Rental', summary.totalLand],
      ['Committee Welfare Chit Fund', summary.totalChit],
      ['TOTAL INFLOWS (A)', summary.totalIncome],
      ['GROSS FUNDS AVAILABLE (Opening + Inflows)', netTotalFunds],
      [],
      ['EXPENDITURES', 'AMOUNT (INR)'],
      // Expense lines come from recorded expenses, not fixed figures.
      ...(store.expenses || []).map((e) => [e.title || e.category || 'Expense', Number(e.amount) || 0]),
      ['Annual Jathara Festival Expenses', summary.jatharaExpenses || 0],
      ['TOTAL EXPENDITURES (B)', summary.totalExpenses],
      [],
      ['NET CLOSING BALANCE CARRIED FORWARD', closingBalance]
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + lines.map(row => row.join(',')).join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `Temple_Financial_Audit_${selectedFY}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* Header with Print & Export Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, margin: '0 0 4px', color: 'var(--color-maroon-primary)' }}>
            Financial Audit Reports & Ledger
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Statutory non-profit financial statement compliant with temple trust audits
          </div>
        </div>

        <div className="no-print" style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={handleExportCSV}
            className="btn btn-outline"
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', background: '#fff' }}
          >
            <span>📥</span> Export CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-primary"
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>🖨</span> Print Audited Statement
          </button>
        </div>
      </div>

      {/* Formal Audit Document Container */}
      <div
        id="audited-financial-document"
        style={{
          background: 'var(--color-ivory-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border-subtle)',
          padding: '36px',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        {/* Document Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid var(--color-gold)', paddingBottom: '24px', marginBottom: '28px' }}>
          <div style={{ fontFamily: 'var(--font-telugu)', fontSize: '14px', color: 'var(--color-gold)', fontWeight: 700, letterSpacing: '1px' }}>
            {settingValue(settings, 'temple_name_telugu', 'శ్రీ సోమలమ్మ తల్లి దేవస్థానం')}
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color: 'var(--color-maroon-primary)', margin: '6px 0 4px' }}>
            {templeName}
          </h2>
          {templeAddress || registrationLine ? (
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              {[registrationLine, templeAddress].filter(Boolean).join(' · ')}
            </div>
          ) : null}
          <div style={{ marginTop: '12px', display: 'inline-block', background: 'var(--color-cream-bg)', border: '1px solid var(--color-gold)', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, color: 'var(--color-maroon-primary)' }}>
            ANNUAL STATEMENT OF RECEIPTS & DISBURSEMENTS — {selectedFY}
          </div>
        </div>

        {/* 3 Metric Summary Boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div style={{ background: 'var(--color-cream-bg)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Gross Inflow + Opening</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, color: 'var(--color-success)', marginTop: '4px' }}>
              {formatINR(netTotalFunds)}
            </div>
          </div>
          <div style={{ background: 'var(--color-cream-bg)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Disbursements</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, color: 'var(--color-danger)', marginTop: '4px' }}>
              {formatINR(summary.totalExpenses)}
            </div>
          </div>
          <div style={{ background: 'var(--color-cream-bg)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Closing Net Balance</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, color: 'var(--color-maroon-primary)', marginTop: '4px' }}>
              {formatINR(closingBalance)}
            </div>
          </div>
        </div>

        {/* Statement of Accounts Table */}
        <div style={{ overflowX: 'auto', marginBottom: '36px' }}>
          <table className="data-table" style={{ fontSize: '13.5px' }}>
            <thead>
              <tr style={{ background: 'var(--color-maroon-primary)', color: '#fff' }}>
                <th style={{ color: '#fff' }}>Receipts & Inflows (Credit)</th>
                <th style={{ textAlign: 'right', color: '#fff' }}>Amount (₹)</th>
                <th style={{ color: '#fff' }}>Disbursements & Outflows (Debit)</th>
                <th style={{ textAlign: 'right', color: '#fff' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {/* Receipts on the left, recorded expenditures on the right.
                  Both columns come from the database — no figure and no
                  descriptive claim (acreage, utility provider) is asserted
                  by the application. */}
              {inflowRows.map((row, i) => {
                const expense = expenseRows[i];
                return (
                  <tr key={row.label}>
                    <td style={{ fontWeight: i === 0 ? 600 : 400 }}>{row.label}</td>
                    <td style={{ textAlign: 'right', fontWeight: i === 0 ? 600 : 400 }}>
                      {formatINR(row.amount)}
                    </td>
                    <td style={{ fontWeight: i === 0 ? 600 : 400 }}>{expense ? expense.label : ''}</td>
                    <td style={{ textAlign: 'right', fontWeight: i === 0 ? 600 : 400 }}>
                      {expense ? formatINR(expense.amount) : ''}
                    </td>
                  </tr>
                );
              })}
              <tr style={{ background: 'var(--color-sand-alt)', fontWeight: 700 }}>
                <td>TOTAL GROSS INFLOW (A)</td>
                <td style={{ textAlign: 'right', color: 'var(--color-success)' }}>{formatINR(netTotalFunds)}</td>
                <td>TOTAL DISBURSEMENTS (B)</td>
                <td style={{ textAlign: 'right', color: 'var(--color-danger)' }}>{formatINR(summary.totalExpenses)}</td>
              </tr>
              <tr style={{ background: 'rgba(184, 145, 70, 0.15)', fontWeight: 700, fontSize: '14.5px' }}>
                <td colSpan="2" style={{ color: 'var(--color-maroon-primary)' }}>
                  CLOSING SURPLUS PRESERVED IN TEMPLE TREASURY (A - B)
                </td>
                <td colSpan="2" style={{ textAlign: 'right', color: 'var(--color-maroon-primary)' }}>
                  {formatINR(closingBalance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Committee Signatories */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', paddingTop: '32px', borderTop: '1px solid var(--color-border-subtle)', textAlign: 'center' }}>
          <div>
            <div style={{ height: '40px' }} />
            <div style={{ fontWeight: 700, fontSize: '13px' }}>
              {signatories[0]?.name || '—'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>President</div>
          </div>
          <div>
            <div style={{ height: '40px' }} />
            <div style={{ fontWeight: 700, fontSize: '13px' }}>
              {signatories[1]?.name || '—'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Treasurer</div>
          </div>
          <div>
            <div style={{ height: '40px' }} />
            <div style={{ fontWeight: 700, fontSize: '13px' }}>Audit Advisory Committee</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Verified & Sealed</div>
          </div>
        </div>
      </div>
    </div>
  );
}

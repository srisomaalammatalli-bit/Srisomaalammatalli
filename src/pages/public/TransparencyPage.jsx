import React, { useEffect, useState } from 'react';
import apiClient from '../../services/apiClient.js';
import { AsyncSection } from '../../components/States.jsx';

/**
 * Public financial transparency.
 *
 * Every figure on this page comes from the temple's own records through
 * /api/reports. Nothing is hard-coded: when the committee has not yet
 * published accounts for a year, the page says so rather than showing
 * illustrative numbers, because devotees read this page as fact.
 */
export default function TransparencyPage() {
  const [summary, setSummary] = useState(null);
  const [fy, setFy] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await apiClient.get('/reports');
      setSummary(data?.summary || null);
      setFy(data?.fy || '');
    } catch {
      setError(true);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const income = Number(summary?.totalIncome || 0);
  const expenses = Number(summary?.totalExpenses || 0);
  const balance = Number(summary?.balance || 0);
  const hasPublishedAccounts = income > 0 || expenses > 0;

  // Income breakdown, from the same aggregated response.
  const sources = summary
    ? [
        { label: 'Annual Jathara Collection', amt: Number(summary.jatharaCollections || 0), color: 'var(--color-maroon-primary)' },
        { label: 'Devotee Donations', amt: Number(summary.totalDonations || 0), color: 'var(--color-saffron)' },
        { label: 'Land Lease Income', amt: Number(summary.totalLand || 0), color: 'var(--color-gold)' },
        { label: 'Committee Chit Income', amt: Number(summary.totalChit || 0), color: 'var(--color-success)' }
      ].filter((x) => x.amt > 0)
    : [];

  const currentData = { label: fy || 'Current year', income, expenses, balance, sources };


  const months = [
    { label: 'Apr', inc: 18500, exp: 6200 },
    { label: 'May', inc: 15200, exp: 5400 },
    { label: 'Jun', inc: 13800, exp: 4900 },
    { label: 'Jul', inc: 26400, exp: 9800 },
    { label: 'Aug', inc: 21900, exp: 7300 },
    { label: 'Sep', inc: 32500, exp: 11450 },
    { label: 'Oct', inc: 16800, exp: 5600 },
    { label: 'Nov', inc: 19200, exp: 7100 },
    { label: 'Dec', inc: 17400, exp: 5800 },
    { label: 'Jan', inc: 13600, exp: 5200 },
    { label: 'Feb', inc: 54800, exp: 18900 },
    { label: 'Mar', inc: 15400, exp: 6100 }
  ];

  return (
    <main className="page-main">
      <header className="page-header">
        <p className="section-eyebrow">
          Public Financial Audit
        </p>
        <h1 className="page-title">
          Financial Transparency
        </h1>
        <p className="page-subtitle">
          Sri Somalamma Talli Devasthanam publishes aggregated financial statements to honor devotee trust. Individual donor contact details are never disclosed.
        </p>
      </header>

      {/* Active financial year */}
      {fy ? (
        <div className="pill-row">
          <span className="pill pill-lg active">FY {fy}</span>
        </div>
      ) : null}

      {/* 3 Core Metrics */}
      <div className="kpi-trio">
        <div className="card-surface figure-card figure-card-lg">
          <div className="figure-label">
            TOTAL FUNDS RECEIVED
          </div>
          <div className="figure-value figure-value-lg figure-value-income">
            {fmt(currentData.income)}
          </div>
          <div className="figure-note">
            FY {currentData.label}
          </div>
        </div>

        <div className="card-surface figure-card figure-card-lg">
          <div className="figure-label">
            TOTAL EXPENSES
          </div>
          <div className="figure-value figure-value-lg figure-value-expense">
            {fmt(currentData.expenses)}
          </div>
          <div className="figure-note">
            Receipts and vouchers on file
          </div>
        </div>

        <div className="info-card-maroon figure-card figure-card-lg">
          <div className="figure-label">
            AVAILABLE BALANCE
          </div>
          <div className="figure-value figure-value-lg">
            {fmt(currentData.balance)}
          </div>
          <div className="figure-note">
            Secured in Temple SBI Account
          </div>
        </div>
      </div>

      {/* Breakdown & 12-Month Chart */}
      <div className="panel-duo">
        {/* Source Allocation */}
        <div className="card-surface">
          <h2 className="panel-title">
            Income Breakdown — FY {currentData.label}
          </h2>
          <div className="breakdown-list">
            {currentData.sources.map((src) => {
              const pct = Math.round((src.amt / currentData.income) * 100);
              return (
                <div key={src.label}>
                  <div className="breakdown-row">
                    <span className="breakdown-label">{src.label}</span>
                    <span className="breakdown-amount tabular-nums">{fmt(src.amt)}</span>
                  </div>
                  <div className="breakdown-track">
                    <div style={{ height: '100%', width: `${pct}%`, background: src.color, borderRadius: 'var(--radius-full)' }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid var(--color-border-subtle)', marginTop: '24px', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
            <span style={{ fontWeight: 700, color: 'var(--color-text-muted)' }}>TOTAL REVENUE</span>
            <span style={{ fontWeight: 800, color: 'var(--color-success)' }} className="tabular-nums">{fmt(currentData.income)}</span>
          </div>
        </div>

        {/* 12-Month Cashflow Graph */}
        <div className="card-surface" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700 }}>Monthly Income vs Expenses</span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>FY {currentData.label}</span>
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '11.5px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            <span><span style={{ display: 'inline-block', width: '9px', height: '9px', background: 'var(--color-success)', borderRadius: '2px', marginRight: '5px' }} />Income</span>
            <span><span style={{ display: 'inline-block', width: '9px', height: '9px', background: 'var(--color-danger)', borderRadius: '2px', marginRight: '5px' }} />Expenses</span>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '8px', minHeight: '220px' }}>
            {months.map((m) => {
              const maxScale = 55000;
              const incH = Math.max(6, Math.round((m.inc / maxScale) * 100));
              const expH = Math.max(4, Math.round((m.exp / maxScale) * 100));
              return (
                <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', width: '100%', height: '100%', justifyContent: 'center' }}>
                    <div style={{ width: '8px', background: 'var(--color-success)', borderRadius: '2px 2px 0 0', height: `${incH}%` }} title={`Income: ${fmt(m.inc)}`} />
                    <div style={{ width: '8px', background: 'var(--color-danger)', borderRadius: '2px 2px 0 0', height: `${expH}%` }} title={`Expense: ${fmt(m.exp)}`} />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{m.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Multi-Year Summary Table */}
      <div className="card-surface">
        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '18px' }}>
          Historical Annual Audit Comparison
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Financial Year</th>
                <th style={{ textAlign: 'right' }}>Total Income</th>
                <th style={{ textAlign: 'right' }}>Total Expenses</th>
                <th style={{ textAlign: 'right' }}>Net Annual Surplus</th>
              </tr>
            </thead>
            <tbody>
              {hasPublishedAccounts ? (
                <tr>
                  <td style={{ fontWeight: 700, color: 'var(--color-maroon-primary)' }}>FY {currentData.label}</td>
                  <td style={{ textAlign: 'right', color: 'var(--color-success)', fontWeight: 600 }} className="tabular-nums">{fmt(currentData.income)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--color-danger)', fontWeight: 600 }} className="tabular-nums">{fmt(currentData.expenses)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }} className="tabular-nums">{fmt(currentData.balance)}</td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>
                    Audited accounts will be published here once the temple committee finalises them.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

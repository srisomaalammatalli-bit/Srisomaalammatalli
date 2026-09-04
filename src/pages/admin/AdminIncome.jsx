import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import adminStore from '../../services/adminStore.js';
import { formatINR, formatDate } from '../../services/receiptService.js';

export default function AdminIncome() {
  const { selectedFY = 'FY2026-27' } = useOutletContext() || {};
  const [store, setStore] = useState(() => adminStore.getState());

  useEffect(() => {
    return adminStore.subscribe((newState) => {
      setStore({ ...newState });
    });
  }, []);

  const summary = adminStore.getFinancialSummary(selectedFY);

  const incomeStreams = [
    {
      title: 'Annual Jathara Collections',
      amount: summary.jatharaCollection,
      pct: Math.round((summary.jatharaCollection / (summary.totalIncome || 1)) * 100),
      desc: 'Festival contributions, bonalu sevas, and gramotsavam offerings',
      color: 'var(--color-maroon-primary)',
      link: '/admin/jathara'
    },
    {
      title: 'General Devotee Donations',
      amount: summary.totalDonations,
      pct: Math.round((summary.totalDonations / (summary.totalIncome || 1)) * 100),
      desc: 'Daily archana, abhishekam, and online sevas via QR and website',
      color: 'var(--color-saffron)',
      link: '/admin/donations'
    },
    {
      title: 'Agricultural Land Lease',
      amount: summary.totalLand,
      pct: Math.round((summary.totalLand / (summary.totalIncome || 1)) * 100),
      desc: 'Temple agricultural land rental',
      color: 'var(--color-gold)',
      link: '/admin/land-chit'
    },
    {
      title: 'Committee Welfare Chit Fund',
      amount: summary.totalChit,
      pct: Math.round((summary.totalChit / (summary.totalIncome || 1)) * 100),
      desc: 'Monthly committee contribution pool for temple reserve',
      color: 'var(--color-success)',
      link: '/admin/land-chit'
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, margin: '0 0 4px', color: 'var(--color-maroon-primary)' }}>
            Income Overview & Streams
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Consolidated temple revenue sources for <strong>{selectedFY}</strong>
          </div>
        </div>

        <div style={{ background: 'var(--color-ivory-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-md)', padding: '10px 18px', textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Inflow</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, color: 'var(--color-success)' }}>
            {formatINR(summary.totalIncome)}
          </div>
        </div>
      </div>

      {/* Stream Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '28px' }}>
        {incomeStreams.map((stream) => (
          <div key={stream.title} className="kpi-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span className="kpi-label" style={{ color: stream.color }}>{stream.title}</span>
                <span style={{ fontSize: '12px', fontWeight: 700, background: 'var(--color-sand-alt)', padding: '2px 8px', borderRadius: '10px' }}>
                  {stream.pct}%
                </span>
              </div>
              <div className="kpi-value" style={{ color: 'var(--color-maroon-primary)', fontSize: '28px' }}>
                {formatINR(stream.amount)}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: '8px 0 16px' }}>
                {stream.desc}
              </p>
            </div>
            <Link to={stream.link} className="btn btn-outline" style={{ fontSize: '12px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
              Manage {stream.title.split(' ')[0]} →
            </Link>
          </div>
        ))}
      </div>

      {/* Recent Income Transactions Table */}
      <div style={{ background: 'var(--color-ivory-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-subtle)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--color-border-subtle)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, margin: 0 }}>
            Recent Verified Inflows
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Latest records across all four operational income sources
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Stream</th>
                <th>Source / Contributor</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Payment Mode</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {store.donations.slice(0, 5).map(d => (
                <tr key={d.id}>
                  <td><span style={{ fontSize: '11px', background: 'rgba(217, 119, 43, 0.12)', color: 'var(--color-saffron)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>Donation</span></td>
                  <td style={{ fontWeight: 600 }}>{d.donorName} ({d.category})</td>
                  <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>{formatINR(d.amount)}</td>
                  <td style={{ fontSize: '13px' }}>{formatDate(d.paymentDate)}</td>
                  <td style={{ fontSize: '13px' }}>{d.paymentMethod}</td>
                  <td><span style={{ fontSize: '11px', background: 'rgba(46, 125, 91, 0.15)', color: 'var(--color-success)', padding: '2px 8px', borderRadius: '10px' }}>{d.status}</span></td>
                </tr>
              ))}
              {store.landIncome.slice(0, 2).map(l => (
                <tr key={l.id}>
                  <td><span style={{ fontSize: '11px', background: 'rgba(184, 145, 70, 0.15)', color: 'var(--color-maroon-primary)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>Land Lease</span></td>
                  <td style={{ fontWeight: 600 }}>{l.propertyName} ({l.tenantName})</td>
                  <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>{formatINR(l.amount)}</td>
                  <td style={{ fontSize: '13px' }}>{formatDate(l.paymentDate)}</td>
                  <td style={{ fontSize: '13px' }}>Bank Transfer</td>
                  <td><span style={{ fontSize: '11px', background: 'rgba(46, 125, 91, 0.15)', color: 'var(--color-success)', padding: '2px 8px', borderRadius: '10px' }}>{l.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

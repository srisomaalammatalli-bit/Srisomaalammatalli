import React, { useState, useEffect } from 'react';
import adminStore from '../../services/adminStore.js';

export default function AdminAudit() {
  const [store, setStore] = useState(() => adminStore.getState());
  const [filterAction, setFilterAction] = useState('All');

  useEffect(() => {
    return adminStore.subscribe((newState) => {
      setStore({ ...newState });
    });
  }, []);

  const logs = store.auditLogs.filter(l => {
    if (filterAction === 'All') return true;
    return l.action.includes(filterAction);
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, margin: '0 0 4px', color: 'var(--color-maroon-primary)' }}>
            Immutable Audit Trail
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Tamper-evident chronological record of all administrative, financial, and publishing actions
          </div>
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          style={{
            padding: '8px 14px',
            border: '1px solid var(--color-border-input)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            background: 'var(--color-ivory-surface)'
          }}
        >
          <option value="All">All Actions</option>
          <option value="Donation">Donations</option>
          <option value="Expense">Expenses</option>
          <option value="Land">Land & Chit</option>
          <option value="Event">Events</option>
          <option value="Date">Dates</option>
          <option value="Settings">Settings</option>
        </select>
      </div>

      <div style={{ background: 'var(--color-ivory-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-subtle)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Trustee / User</th>
                <th>Action</th>
                <th>Entity Target</th>
                <th>Audit Details & Hash Record</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: '12.5px', fontFamily: 'monospace', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    {log.timestamp}
                  </td>
                  <td style={{ fontWeight: 600 }}>{log.userName}</td>
                  <td>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '10px',
                        background: log.action.includes('Donation') ? 'rgba(46, 125, 91, 0.12)' : (log.action.includes('Expense') ? 'rgba(178, 58, 72, 0.12)' : 'rgba(184, 145, 70, 0.12)'),
                        color: log.action.includes('Donation') ? 'var(--color-success)' : (log.action.includes('Expense') ? 'var(--color-danger)' : 'var(--color-maroon-primary)')
                      }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'monospace' }}>
                    {log.entityType} {log.entityId ? `[${log.entityId}]` : ''}
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

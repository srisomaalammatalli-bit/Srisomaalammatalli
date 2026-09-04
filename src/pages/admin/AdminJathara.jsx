import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../services/apiClient.js';
import { formatINR } from '../../services/receiptService.js';
import { adminErrorMessage } from '../../services/adminMessages.js';

/**
 * Jathara festival accounts.
 *
 * Figures come from /api/jathara, which reports what the temple has actually
 * recorded for that year. A year with no record shows zero and says so,
 * rather than displaying a total nobody collected.
 *
 * This screen previously read a browser-side store that was never populated,
 * which is why it rendered nothing at all.
 */
export default function AdminJathara() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [jathara, setJathara] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);

  // New Milestone fields
  const [msTitle, setMsTitle] = useState('');
  const [msDate, setMsDate] = useState('');
  const [msAmount, setMsAmount] = useState('');
  const [msIsExpense, setMsIsExpense] = useState(true);
  const [msNote, setMsNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await apiClient.get(`/jathara?year=${encodeURIComponent(selectedYear)}`);
      setJathara(data?.jathara || null);
      setTimeline(data?.timeline || []);
      setExpenseBreakdown(data?.expenseBreakdown || []);
    } catch {
      setError(true);
      setJathara(null);
      setTimeline([]);
      setExpenseBreakdown([]);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    load();
  }, [load]);

  const collection = Number(jathara?.total_collection || 0);
  const expense = Number(jathara?.total_expense || 0);
  const balance = collection - expense;
  const expenseRatio = Math.round((expense / (collection || 1)) * 100);
  const recorded = Boolean(jathara?.recorded);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  /**
   * Record one income or expense line against this year's Jathara.
   *
   * The amount is sent as the administrator typed it and converted to paise
   * once, on the server, so the browser never decides what a rupee is worth.
   * The totals shown afterwards are recomputed there too, from the entries —
   * this screen never adds anything up itself, which is why the published
   * figures cannot drift away from the records behind them.
   */
  const handleAddMilestone = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!msTitle.trim()) {
      setFormError('Describe what this entry is for, for example "Hundi collection, day 1".');
      return;
    }
    if (!String(msAmount).trim()) {
      setFormError('Enter the amount in rupees.');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/jathara', {
        year: Number(selectedYear),
        title: msTitle.trim(),
        amount: msAmount,
        milestoneDate: msDate || undefined,
        note: msNote.trim() || undefined,
        isExpense: msIsExpense
      });
      setNotice(msIsExpense ? 'Expense recorded.' : 'Income recorded.');
      setMsTitle('');
      setMsDate('');
      setMsAmount('');
      setMsNote('');
      setShowMilestoneModal(false);
      await load();
    } catch (err) {
      setFormError(adminErrorMessage(err, 'The entry could not be recorded.'));
    } finally {
      setSaving(false);
    }
  };

  /** Remove a line. The year's totals are recomputed by the server. */
  const handleDeleteEntry = async (entry) => {
    const what = `${entry.title} — ${formatINR(Number(entry.amount || 0))}`;
    if (!window.confirm(`Remove this entry?

${what}

The year's totals will be recalculated.`)) {
      return;
    }
    try {
      await apiClient.delete(`/jathara?id=${encodeURIComponent(entry.id)}`);
      setNotice('Entry removed. The totals have been recalculated.');
      await load();
    } catch (err) {
      window.alert(adminErrorMessage(err, 'The entry could not be removed.'));
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px' }} aria-busy="true">
        Loading the Jathara accounts…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <p>The Jathara accounts could not be loaded.</p>
        <button type="button" className="btn btn-outline" onClick={load}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Confirmation that a change actually saved. Without it a committee
          member cannot tell a successful entry from one that quietly failed,
          and the safest assumption — entering it again — doubles the money. */}
      {notice ? (
        <div
          role="status"
          style={{
            background: 'rgba(46,125,91,0.12)',
            color: 'var(--color-success)',
            border: '1px solid var(--color-success)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            aria-label="Dismiss this message"
          >
            ×
          </button>
        </div>
      ) : null}

      {/* Top Header & Year Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, margin: '0 0 4px', color: 'var(--color-maroon-primary)' }}>
            Annual Jathara Mahotsavam
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Festival collections, bonalu processions, annadanam logistics & expense ledger
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--color-ivory-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
            {['2026', '2025', '2024'].map(yr => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                style={{
                  border: 'none',
                  background: selectedYear === yr ? 'var(--color-maroon-primary)' : 'none',
                  color: selectedYear === yr ? '#fff' : 'var(--color-text-primary)',
                  fontWeight: 700,
                  fontSize: '13px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Jathara {yr}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowMilestoneModal(true)}
            className="btn btn-primary"
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>+</span> Add Milestone
          </button>
        </div>
      </div>

      {/* Jathara Grand Hero Banner */}
      <div className="jathara-hero-card">
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.2px', opacity: 0.8, color: 'var(--color-gold-soft)' }}>
            TOTAL FESTIVAL COLLECTIONS
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, margin: '8px 0 4px' }}>
            {formatINR(collection)}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.85 }}>
            {recorded
              ? `${Number(jathara.contributor_count || 0)} contributors recorded`
              : 'No collections recorded for this year'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.2px', opacity: 0.8, color: 'var(--color-gold-soft)' }}>
            FESTIVAL EXPENSES
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, margin: '8px 0 4px', color: '#FFB4B4' }}>
            {formatINR(expense)}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.85 }}>
            {expenseRatio}% of collection allocated
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.2px', opacity: 0.8, color: 'var(--color-gold-soft)' }}>
            SURPLUS RETAINED IN TEMPLE FUND
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, margin: '8px 0 4px', color: '#A3E635' }}>
            {formatINR(balance)}
          </div>
          {/* Where the surplus is held is not something this screen knows,
              and naming a bank would be a claim about the temple's accounts. */}
          <div style={{ fontSize: '12px', opacity: 0.85 }}>
            Collections less expenses
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.2px', opacity: 0.8, color: 'var(--color-gold-soft)' }}>
            FESTIVAL STATUS
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, margin: '8px 0 4px', color: 'var(--color-gold-soft)' }}>
            {jathara?.status || 'Not started'}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.85 }}>
            {jathara?.title || `Jathara ${selectedYear}`}
          </div>
        </div>
      </div>

      {/* Progress Ratio Bar */}
      <div style={{ background: 'var(--color-ivory-surface)', padding: '20px 24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-subtle)', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', fontWeight: 600 }}>
          <span>Budget Utilization: {expenseRatio}% Spent</span>
          <span style={{ color: 'var(--color-success)' }}>{100 - expenseRatio}% Surplus Retained</span>
        </div>
        <div style={{ height: '12px', background: 'var(--color-sand-alt)', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: `${expenseRatio}%`, background: 'var(--color-maroon-primary)' }} title={`Spent: ${formatINR(expense)}`} />
          <div style={{ width: `${100 - expenseRatio}%`, background: 'var(--color-success)' }} title={`Surplus: ${formatINR(balance)}`} />
        </div>
      </div>

      {/* Two Column Layout: Timeline & Expense Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Milestones Timeline */}
        <div style={{ background: 'var(--color-ivory-surface)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-subtle)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
            CHRONOLOGICAL SCHEDULE
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, margin: '0 0 20px' }}>
            Festival Milestones & Ceremonies
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {timeline.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
                No milestones recorded for {selectedYear}.
              </p>
            ) : (
              timeline.map((m, idx) => (
                <div key={m.id || idx} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: m.is_expense ? 'var(--color-danger)' : 'var(--color-success)', marginTop: '5px', flexShrink: 0 }} />
                  <div style={{ flex: 1, borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{m.title}</div>
                      {Number(m.amount) > 0 && (
                        <div style={{ fontWeight: 700, fontSize: '13px', color: m.is_expense ? 'var(--color-danger)' : 'var(--color-success)' }}>
                          {m.is_expense ? '-' : '+'}{formatINR(Number(m.amount))}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span>{m.milestone_date}</span>
                      {m.note ? <span>· {m.note}</span> : null}
                      <button
                        type="button"
                        onClick={() => handleDeleteEntry(m)}
                        className="btn-link-danger"
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-danger)', fontSize: '12px', textDecoration: 'underline' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Expense Category Breakdown */}
        <div style={{ background: 'var(--color-ivory-surface)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-subtle)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
            FINANCIAL AUDIT
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, margin: '0 0 20px' }}>
            Expense Breakdown by Service
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {expenseBreakdown.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
                No expense categories recorded for {selectedYear}.
              </p>
            ) : (
              expenseBreakdown.map((cat) => {
                const amount = Number(cat.amount || 0);
                const pct = expense > 0 ? Math.round((amount / expense) * 100) : 0;
                return (
                  <div key={cat.id || cat.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600 }}>{cat.name}</span>
                      <span style={{ fontWeight: 700 }}>
                        {formatINR(amount)} ({pct}%)
                      </span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--color-sand-alt)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-maroon-primary)' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Add Milestone Modal */}
      {showMilestoneModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--color-maroon-primary)' }}>
                Add Jathara Milestone
              </h3>
              <button onClick={() => setShowMilestoneModal(false)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleAddMilestone}>
              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Ceremony / Milestone Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pallaki Seva Procession"
                  value={msTitle}
                  onChange={(e) => setMsTitle(e.target.value)}
                  className="input-field"
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Date & Timing *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Feb 19, 6:00 PM"
                  value={msDate}
                  onChange={(e) => setMsDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label className="input-label">Type</label>
                  <select value={msIsExpense ? 'exp' : 'inc'} onChange={(e) => setMsIsExpense(e.target.value === 'exp')} className="input-field">
                    <option value="exp">Expenditure</option>
                    <option value="inc">Collection</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Amount (₹)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 15000 or 15000.50"
                    value={msAmount}
                    onChange={(e) => setMsAmount(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Note (optional)</label>
                <input
                  type="text"
                  placeholder="What was this for? e.g. paid to the decorator"
                  value={msNote}
                  onChange={(e) => setMsNote(e.target.value)}
                  className="input-field"
                />
              </div>

              {formError ? (
                <p style={{ color: 'var(--color-danger)', fontSize: '13px', margin: '0 0 12px' }} role="alert">
                  {formError}
                </p>
              ) : null}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowMilestoneModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

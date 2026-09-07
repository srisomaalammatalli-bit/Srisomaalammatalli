import React, { useState, useEffect } from 'react';
import adminStore from '../../services/adminStore.js';
import { formatDate } from '../../services/receiptService.js';

export default function AdminDates() {
  const [store, setStore] = useState(() => adminStore.getState());
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [monthLabel, setMonthLabel] = useState('FEB');
  const [dayNumber, setDayNumber] = useState('18');
  const [priority, setPriority] = useState('High');
  const [showOnTicker, setShowOnTicker] = useState(true);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    return adminStore.subscribe((newState) => {
      setStore({ ...newState });
    });
  }, []);

  const showNotification = (msg, type = 'success') => {
    setNotice({ msg, type });
    setTimeout(() => setNotice(null), 5000);
  };

  const handleDateChange = (val) => {
    setEventDate(val);
    if (val) {
      try {
        const d = new Date(val + 'T00:00:00');
        if (!isNaN(d.getTime())) {
          setMonthLabel(d.toLocaleString('en-US', { month: 'short' }).toUpperCase());
          setDayNumber(String(d.getDate()));
        }
      } catch {}
    }
  };

  const handleAddDate = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim() || !eventDate) {
      setFormError('Please enter both occasion title and date.');
      return;
    }

    try {
      setSaving(true);
      await adminStore.addImportantDate({
        title: title.trim(),
        desc: desc.trim(),
        description: desc.trim(),
        date: eventDate,
        eventDate: eventDate,
        month: monthLabel.toUpperCase(),
        monthLabel: monthLabel.toUpperCase(),
        day: dayNumber,
        dayNumber: dayNumber,
        priority,
        showOnTicker
      });

      setTitle('');
      setDesc('');
      setEventDate('');
      setShowAddModal(false);
      showNotification('Important date added successfully!');
    } catch (err) {
      console.error('[AdminDates] Error adding date:', err);
      setFormError(err?.message || 'Failed to add date. Please check the inputs.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTicker = async (id, currentStatus) => {
    try {
      await adminStore.updateImportantDate(id, { showOnTicker: !currentStatus, show_on_ticker: !currentStatus });
      showNotification(`Ticker status updated to ${!currentStatus ? 'Active' : 'Off'}.`);
    } catch (err) {
      alert('Failed to update ticker status: ' + (err?.message || 'Server error'));
    }
  };

  const handleDelete = async (id, dateTitle) => {
    if (!window.confirm(`Remove "${dateTitle || 'this date'}" from the festival calendar?`)) {
      return;
    }
    try {
      await adminStore.deleteImportantDate(id);
      showNotification('Date removed from festival calendar.');
    } catch (err) {
      alert('Failed to delete date: ' + (err?.message || 'Server error'));
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, margin: '0 0 4px', color: 'var(--color-maroon-primary)' }}>
            Important Dates & Calendar
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Control dates displayed on the public announcement marquee and devotee festival calendars
          </div>
        </div>

        <button
          type="button"
          onClick={() => { setFormError(''); setShowAddModal(true); }}
          className="btn btn-primary"
          style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>+</span> Add Important Date
        </button>
      </div>

      <div style={{ background: 'var(--color-ivory-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-subtle)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Festival / Occasion</th>
                <th>Priority</th>
                <th>Marquee Ticker</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(!store.importantDates || store.importantDates.length === 0) ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--color-text-muted)' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>📅</div>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-text-primary)' }}>
                      No festival dates recorded
                    </div>
                    <div style={{ fontSize: '13px', marginTop: '4px' }}>
                      Click <strong>"+ Add Important Date"</strong> to add an auspicious date to the temple calendar.
                    </div>
                  </td>
                </tr>
              ) : (
                store.importantDates.map((dt) => (
                  <tr key={dt.id}>
                    <td style={{ width: '130px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--color-cream-bg)', border: '1px solid var(--color-border-subtle)', padding: '4px 10px', borderRadius: '8px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--color-maroon-primary)', fontSize: '12px' }}>{dt.month || dt.monthLabel || 'DATE'}</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px' }}>{dt.day || dt.dayNumber || '—'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{dt.title}</div>
                      {(dt.desc || dt.description) && (
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {dt.desc || dt.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '10px',
                          background: dt.priority === 'High' ? 'rgba(178, 58, 72, 0.12)' : (dt.priority === 'Medium' ? 'rgba(217, 119, 43, 0.12)' : 'rgba(46, 125, 91, 0.12)'),
                          color: dt.priority === 'High' ? 'var(--color-danger)' : (dt.priority === 'Medium' ? 'var(--color-saffron)' : 'var(--color-success)')
                        }}
                      >
                        {dt.priority} Priority
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleTicker(dt.id, Boolean(dt.showOnTicker))}
                        style={{
                          border: 'none',
                          background: dt.showOnTicker ? 'rgba(46, 125, 91, 0.15)' : 'rgba(0, 0, 0, 0.08)',
                          color: dt.showOnTicker ? 'var(--color-success)' : 'var(--color-text-muted)',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {dt.showOnTicker ? '✓ Live on Marquee' : 'Off Ticker'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleDelete(dt.id, dt.title)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-danger)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Date Modal */}
      {showAddModal && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '28px', boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--color-maroon-primary)' }}>
                Add Auspicious Date
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px', fontWeight: 500 }}>
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleAddDate}>
              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Occasion / Festival Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Karthika Pournami Deepotsavam"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label className="input-label">Date *</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Month Label</label>
                  <input
                    type="text"
                    placeholder="e.g. NOV"
                    value={monthLabel}
                    onChange={(e) => setMonthLabel(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Day Display</label>
                  <input
                    type="text"
                    placeholder="e.g. 26"
                    value={dayNumber}
                    onChange={(e) => setDayNumber(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input-field">
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Significance / Description</label>
                <textarea
                  rows="2"
                  placeholder="Devotional significance..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="showMarquee"
                  checked={showOnTicker}
                  onChange={(e) => setShowOnTicker(e.target.checked)}
                />
                <label htmlFor="showMarquee" style={{ fontSize: '13px', cursor: 'pointer' }}>
                  Display on public top announcement ticker
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? 'Saving Date…' : 'Save Date'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

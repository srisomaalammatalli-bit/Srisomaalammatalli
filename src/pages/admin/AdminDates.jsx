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

  useEffect(() => {
    return adminStore.subscribe((newState) => {
      setStore({ ...newState });
    });
  }, []);

  const handleAddDate = (e) => {
    e.preventDefault();
    if (!title.trim() || !eventDate) return;

    adminStore.addImportantDate({
      title: title.trim(),
      desc: desc.trim(),
      date: eventDate,
      month: monthLabel.toUpperCase(),
      day: dayNumber,
      priority,
      showOnTicker
    });

    setTitle('');
    setDesc('');
    setEventDate('');
    setShowAddModal(false);
  };

  const handleToggleTicker = (id) => {
    const updated = store.importantDates.map(d => {
      if (d.id === id) {
        return { ...d, showOnTicker: !d.showOnTicker };
      }
      return d;
    });
    adminStore.state.importantDates = updated;
    adminStore.saveState();
  };

  const handleDelete = (id) => {
    if (window.confirm('Remove this date from the festival calendar?')) {
      adminStore.deleteImportantDate(id);
    }
  };

  return (
    <div>
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
          onClick={() => setShowAddModal(true)}
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
              {store.importantDates.map((dt) => (
                <tr key={dt.id}>
                  <td style={{ width: '130px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--color-cream-bg)', border: '1px solid var(--color-border-subtle)', padding: '4px 10px', borderRadius: '8px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--color-maroon-primary)', fontSize: '12px' }}>{dt.month}</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px' }}>{dt.day}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{dt.title}</div>
                    {dt.desc && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{dt.desc}</div>}
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
                      onClick={() => handleToggleTicker(dt.id)}
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
                      onClick={() => handleDelete(dt.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-danger)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Date Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--color-maroon-primary)' }}>
                Add Auspicious Date
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label className="input-label">Date *</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
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
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Date</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

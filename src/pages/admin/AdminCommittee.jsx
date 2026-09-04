import React, { useState, useEffect } from 'react';
import adminStore from '../../services/adminStore.js';

export default function AdminCommittee() {
  const [store, setStore] = useState(() => adminStore.getState());
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Admin');
  const [avatarBg, setAvatarBg] = useState('#6E1F2A');

  useEffect(() => {
    return adminStore.subscribe((newState) => {
      setStore({ ...newState });
    });
  }, []);

  const handleAddMember = (e) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) return;

    // A blank email stays blank. This used to invent one from the member's
    // name at somalamma.org — an address for a real person, at a domain the
    // temple may not own and where nobody would receive mail.
    adminStore.addCommitteeMember({
      name: name.trim(),
      mobile: mobile.trim(),
      email: email.trim() || null,
      role,
      avatarBg
    });

    setName('');
    setMobile('');
    setEmail('');
    setShowAddModal(false);
  };

  const roleColors = {
    'Super Admin': 'var(--color-maroon-primary)',
    'Finance Manager': 'var(--color-gold)',
    'Admin': 'var(--color-saffron)',
    'Viewer': 'var(--color-text-muted)'
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, margin: '0 0 4px', color: 'var(--color-maroon-primary)' }}>
            Temple Executive Committee
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Volunteer trustees, role-based permissions, financial signatories & audit accountability
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
          style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>+</span> Add Committee Member
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {store.committee.map((member) => (
          <div
            key={member.id}
            style={{
              background: 'var(--color-ivory-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border-subtle)',
              padding: '24px',
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-start'
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: member.avatarBg || 'var(--color-maroon-primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '18px',
                flexShrink: 0
              }}
            >
              {member.name.slice(0, 2).toUpperCase()}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 2px' }}>
                  {member.name}
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: 'var(--color-sand-alt)',
                    color: roleColors[member.role] || 'inherit'
                  }}
                >
                  {member.role}
                </span>
              </div>

              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                📞 {member.mobile}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                ✉️ {member.email}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--color-border-subtle)', fontSize: '11px' }}>
                <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>● Active Trustee</span>
                <span style={{ color: 'var(--color-text-muted)' }}>Active {member.lastActive}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--color-maroon-primary)' }}>
                Add Committee Trustee
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleAddMember}>
              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sri K. Venkataramana Rao"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
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

              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="trustee@somalamma.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="input-label">Portal Role & Permission Level</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="input-field">
                  <option value="Admin">Admin (Events, Dates, Gallery, Content)</option>
                  <option value="Finance Manager">Finance Manager (Donations, Expenses, Ledger)</option>
                  <option value="Super Admin">Super Admin (Full Platform Control)</option>
                  <option value="Viewer">Viewer (Auditor / Read-Only)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

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

  const handleAddMember = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !mobile.trim()) {
      setFormError('Please provide both full name and mobile number.');
      return;
    }

    try {
      setSaving(true);
      await adminStore.addCommitteeMember({
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
      showNotification('Committee trustee added successfully!');
    } catch (err) {
      console.error('[AdminCommittee] Error adding member:', err);
      setFormError(err?.message || 'Failed to add committee member.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async (member) => {
    if (!window.confirm(`Remove trustee "${member.name}" (${member.role}) from the committee list?`)) {
      return;
    }
    try {
      await adminStore.deleteCommitteeMember(member.id);
      showNotification('Committee member removed.');
    } catch (err) {
      alert('Failed to remove committee member: ' + (err?.message || 'Server error'));
    }
  };

  const roleColors = {
    'Super Admin': 'var(--color-maroon-primary)',
    'Finance Manager': 'var(--color-gold)',
    'Admin': 'var(--color-saffron)',
    'Viewer': 'var(--color-text-muted)'
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
            Temple Executive Committee
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Volunteer trustees, role-based permissions, financial signatories & audit accountability
          </div>
        </div>

        <button
          type="button"
          onClick={() => { setFormError(''); setShowAddModal(true); }}
          className="btn btn-primary"
          style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>+</span> Add Committee Member
        </button>
      </div>

      {(!store.committee || store.committee.length === 0) ? (
        <div style={{
          background: 'var(--color-ivory-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border-subtle)',
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--color-text-muted)'
        }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>👥</div>
          <div style={{ fontWeight: 700, fontSize: '17px', color: 'var(--color-text-primary)' }}>
            No committee trustees registered
          </div>
          <div style={{ fontSize: '13px', marginTop: '6px' }}>
            Click <strong>"+ Add Committee Member"</strong> above to record temple executive trustees.
          </div>
        </div>
      ) : (
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
                alignItems: 'flex-start',
                position: 'relative'
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: member.avatarBg || member.avatar_bg || 'var(--color-maroon-primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '18px',
                  flexShrink: 0
                }}
              >
                {(member.name || 'TM').slice(0, 2).toUpperCase()}
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
                {member.email && (
                  <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    ✉️ {member.email}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--color-border-subtle)', fontSize: '11px' }}>
                  <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>● Active Trustee</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteMember(member)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-danger, #b00020)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '2px 6px'
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '28px', boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--color-maroon-primary)' }}>
                Add Committee Trustee
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
                <label className="input-label">Email (Optional)</label>
                <input
                  type="email"
                  placeholder="trustee@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label className="input-label">Role</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} className="input-field">
                    <option value="Super Admin">Super Admin</option>
                    <option value="Finance Manager">Finance Manager</option>
                    <option value="Admin">Admin</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Badge Color</label>
                  <input
                    type="color"
                    value={avatarBg}
                    onChange={(e) => setAvatarBg(e.target.value)}
                    style={{ height: '42px', width: '100%', borderRadius: '8px', border: '1px solid var(--color-border-input)', padding: '2px', cursor: 'pointer' }}
                  />
                </div>
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
                  {saving ? 'Adding Trustee…' : 'Add Trustee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

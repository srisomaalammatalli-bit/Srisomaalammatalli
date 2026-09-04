import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient.js';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [selectedFY, setSelectedFY] = useState('FY2026-27');
  const [searchQuery, setSearchQuery] = useState('');

  const navSections = [
    {
      title: 'OVERVIEW',
      items: [
        { label: 'Dashboard', path: '/admin/dashboard', icon: '▦' }
      ]
    },
    {
      title: 'FINANCIAL MANAGEMENT',
      items: [
        { label: 'Donations', path: '/admin/donations', icon: '🙏' },
        { label: 'Payment Verification', path: '/admin/payments', icon: '✔' },
        { label: 'Income Overview', path: '/admin/income', icon: '₹' },
        { label: 'Expenses', path: '/admin/expenses', icon: '▤' },
        { label: 'Land & Chit Income', path: '/admin/land-chit', icon: '◱' },
        { label: 'Jathara Financials', path: '/admin/jathara', icon: '✦' },
        { label: 'Reports', path: '/admin/reports', icon: '▣' }
      ]
    },
    {
      title: 'TEMPLE CONTENT',
      items: [
        { label: 'Homepage', path: '/admin/homepage', icon: '⌂' },
        { label: 'Poojas', path: '/admin/poojas', icon: '🪔' },
        { label: 'Media Library', path: '/admin/media', icon: '🗂' },
        { label: 'Notices', path: '/admin/announcements', icon: '📢' },
        { label: 'Events', path: '/admin/events', icon: '📅' },
        { label: 'Gallery', path: '/admin/gallery', icon: '🖼' },
        { label: 'Videos', path: '/admin/videos', icon: '▶' },
        { label: 'Important Dates', path: '/admin/important-dates', icon: '◔' }
      ]
    },
    {
      // The archive is its own section rather than part of TEMPLE CONTENT:
      // events and gallery items are announcements, while these are
      // historical records that carry a source and a verification status.
      title: 'TEMPLE ARCHIVE',
      items: [
        { label: 'Temple History', path: '/admin/history', icon: '▤' },
        { label: 'Historical Claims', path: '/admin/claims', icon: '⚖' },
        { label: 'Inscriptions', path: '/admin/inscriptions', icon: '⛭' },
        { label: 'Festival Archive', path: '/admin/festivals', icon: '✦' },
        { label: 'Historical Submissions', path: '/admin/submissions', icon: '📥' }
      ]
    },
    {
      title: 'ADMINISTRATION',
      items: [
        { label: 'Committee Members', path: '/admin/committee', icon: '☰' },
        { label: 'Audit Trail', path: '/admin/audit', icon: '📜' },
        { label: 'Settings', path: '/admin/settings', icon: '⚙' }
      ]
    }
  ];

  useEffect(() => {
    /**
     * Establish who is signed in.
     *
     * There is deliberately no fallback profile. Inventing an administrator
     * when the session check fails would render the whole portal to an
     * unauthenticated visitor. Anyone without a valid session is sent to the
     * login page instead.
     *
     * The API enforces authorization independently on every request, so this
     * redirect is for the person's benefit, not the security boundary.
     */
    let cancelled = false;

    async function loadSession() {
      try {
        const data = await apiClient.get('/auth/session');
        if (cancelled) return;

        if (data?.authenticated && data.user) {
          setCurrentUser(data.user);
        } else {
          navigate('/admin/login', { replace: true });
        }
      } catch {
        if (!cancelled) navigate('/admin/login', { replace: true });
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    }

    loadSession();
    return () => { cancelled = true; };
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network failures on logout
    }
    navigate('/admin/login');
  };

  // Derive breadcrumb from active route
  const allItems = navSections.flatMap(s => s.items);
  const activeItem = allItems.find(it => it.path === location.pathname);
  const pageTitle = activeItem ? activeItem.label : 'Dashboard';

  // Render nothing until the session is confirmed: admin content must not
  // flash on screen before we know who is signed in.
  if (!sessionChecked || !currentUser) {
    return (
      <div className="admin-session-check" role="status" aria-live="polite">
        <span className="sr-only">Checking your session…</span>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* Fixed 248px Left Sidebar */}
      <aside className="admin-sidebar no-print">
        <div className="sidebar-header">
          <div className="brand-emblem" style={{ width: '38px', height: '38px', fontSize: '16px' }}>శ్రీ</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: '#FDFBF6', lineHeight: 1.15 }}>
              Sri Somalamma Talli
            </div>
            <div style={{ fontSize: '10px', letterSpacing: '1.4px', color: 'var(--color-gold)', fontWeight: 700 }}>
              ADMIN PORTAL
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((sec) => (
            <div key={sec.title}>
              <div className="sidebar-heading">{sec.title}</div>
              {sec.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                  >
                    <span className="sidebar-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              background: 'none',
              border: '1px solid rgba(253, 251, 246, 0.16)',
              color: 'rgba(253, 251, 246, 0.75)',
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            ↩ Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main-wrapper">
        {/* Sticky Topbar */}
        <header className="admin-topbar no-print">
          <div className="admin-breadcrumbs">
            <span>Admin</span> <span style={{ color: 'var(--color-border-input)' }}>/</span>{' '}
            <span className="current">{pageTitle}</span>
          </div>

          <input
            type="text"
            className="admin-search-input"
            placeholder="Search donations, expenses, members…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            value={selectedFY}
            onChange={(e) => setSelectedFY(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--color-border-input)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              background: 'var(--color-cream-bg)',
              color: 'var(--color-text-primary)'
            }}
          >
            <option value="FY2026-27">FY 2026–27</option>
            <option value="FY2025-26">FY 2025–26</option>
            <option value="FY2024-25">FY 2024–25</option>
          </select>

          <div style={{ position: 'relative', cursor: 'pointer', fontSize: '18px' }} title="Notifications">
            🔔
            <span
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-3px',
                width: '8px',
                height: '8px',
                background: 'var(--color-saffron)',
                borderRadius: '50%'
              }}
            />
          </div>

          <div className="admin-user-chip">
            <div className="user-avatar">
              {currentUser?.initials || currentUser?.name?.slice(0, 2).toUpperCase() || 'AD'}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontBold: true, fontWeight: 700 }}>
                {currentUser?.name || ''}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                {currentUser?.roleName || 'Super Admin'}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Outlet with Search & FY Context */}
        <main className="admin-content-area">
          <Outlet context={{ selectedFY, searchQuery, currentUser }} />
        </main>
      </div>
    </div>
  );
}

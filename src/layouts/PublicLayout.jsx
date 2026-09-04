import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import apiClient from '../services/apiClient.js';
import { TEMPLE, ADDRESS_SINGLE_LINE, formatTimeRange } from '../config/temple.js';
import { useSettings, settingValue, formatClockRange } from '../hooks/useSettings.js';

export default function PublicLayout() {
  const location = useLocation();
  const currentPath = location.pathname;
  const [menuOpen, setMenuOpen] = useState(false);
  const { settings } = useSettings();
  const [notices, setNotices] = useState([]);

  // Notices come from the database on every page load, so publishing one in
  // the admin portal shows it to devotees without a deployment. A failure
  // here must not break the header, so it falls back to no notices.
  useEffect(() => {
    let cancelled = false;
    apiClient
      .get('/announcements')
      .then((data) => {
        if (cancelled) return;
        setNotices((data?.items || []).filter((n) => n.show_on_ticker));
      })
      .catch(() => {
        if (!cancelled) setNotices([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Identity comes from the database so the committee can correct it without
  // a deployment; the config file is only a fallback for a cold start.
  const templeName = settingValue(settings, 'temple_name', TEMPLE.name);
  const templeNameTelugu = settingValue(settings, 'temple_name_telugu', '');
  const templeCity = settingValue(settings, 'temple_city', '');
  const templeState = settingValue(settings, 'temple_state', 'Andhra Pradesh');

  // Opening hours are only called the temple's own once someone has actually
  // confirmed they came from the temple. The database has held 06:30–11:30
  // and 16:30–20:25 since an early seed, but 06:30 matches the public Google
  // listing exactly and the provenance was never established — so the hours
  // are shown either way, and labelled for what they are. Presenting a
  // third-party listing as "Darshan timings" would be a false claim about
  // when a devotee can actually see the goddess.
  const morningOpen = settingValue(settings, 'timings_morning_open', '');
  const morningClose = settingValue(settings, 'timings_morning_close', '');
  const eveningOpen = settingValue(settings, 'timings_evening_open', '');
  const eveningClose = settingValue(settings, 'timings_evening_close', '');
  const timingsVerified = settingValue(settings, 'timings_verified', 'false') === 'true';
  const listingNote = settingValue(
    settings,
    'listing_hours_note',
    'Publicly listed hours — not yet confirmed by the temple administration'
  );

  const hoursRange = morningOpen
    ? `${formatClockRange(morningOpen, morningClose)}${
        eveningOpen ? ` and ${formatClockRange(eveningOpen, eveningClose)}` : ''
      }`
    : '';

  const hoursItem = !hoursRange
    ? 'Temple timings are being confirmed by the temple administration'
    : timingsVerified
      ? `Darshan ${hoursRange}`
      : `${listingNote}: ${hoursRange}`;

  // Notices the committee has published and marked for the ticker. They lead,
  // because a closure or festival announcement is the thing a devotee most
  // needs to see; the standing facts follow.
  const tickerItems = [
    ...notices.map((n) => n.title),
    hoursItem,
    TEMPLE.timings.note,
    `${templeName}, ${templeCity}`
  ].filter(Boolean);
  // Repeat so the marquee loops without a visible gap.
  const ticker = [...tickerItems, ...tickerItems, ...tickerItems];

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [currentPath]);

  // Prevent background scrolling while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Poojas', path: '/poojas' },
    { label: 'Events', path: '/events' },
    { label: 'Gallery', path: '/gallery' },
    { label: 'Videos', path: '/videos' },
    { label: 'Financial Transparency', path: '/transparency' },
    { label: 'Contact', path: '/contact' }
  ];

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>

      {/* Sticky Public Header */}
      <header className="site-header">
        <div className="site-header-inner">
          <Link to="/" className="brand-badge">
            <div className="brand-emblem">శ్రీ</div>
            <div className="brand-text">
              <div className="brand-title">{templeName}</div>
              <div className="brand-subtitle">
                {templeNameTelugu ? <span lang="te">{templeNameTelugu}</span> : null}
                {templeNameTelugu ? ' · ' : ''}
                {templeState}
              </div>
            </div>
          </Link>

          <nav className="site-nav" aria-label="Primary">
            {navLinks.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${currentPath === item.path ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="header-actions">
            {/* On a narrow phone the word is hidden and the emblem carries the
                button, which buys back the width the temple's name needs. The
                aria-label keeps it announced as "Donate to the temple" either
                way, so nothing is lost for a screen reader. */}
            <Link to="/donate" className="btn btn-saffron btn-donate" aria-label="Donate to the temple">
              <span aria-hidden="true">🙏</span>
              <span className="btn-donate-label">Donate</span>
            </Link>
            <Link to="/admin/login" className="admin-login-link">
              Admin Login
            </Link>
          </div>

          <button
            type="button"
            className="nav-toggle"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className={`nav-toggle-bars ${menuOpen ? 'is-open' : ''}`} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <div
          id="mobile-nav"
          className={`mobile-nav ${menuOpen ? 'is-open' : ''}`}
          hidden={!menuOpen}
        >
          <nav className="mobile-nav-links" aria-label="Mobile">
            {navLinks.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`mobile-nav-link ${currentPath === item.path ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mobile-nav-footer">
            <Link to="/donate" className="btn btn-saffron">🙏 Donate to Temple</Link>
            <Link to="/admin/login" className="admin-login-link">Admin Login</Link>
          </div>
        </div>
      </header>

      {/* Marquee Announcement Ticker */}
      <div className="announcement-ticker no-print" role="region" aria-label="Temple announcements">
        <div className="ticker-track">
          {ticker.map((item, i) => (
            <span className="ticker-item" key={`${item}-${i}`}>✦ {item}</span>
          ))}
        </div>
      </div>

      {/* Main Page View Outlet */}
      <div id="main-content" className="site-main">
        <Outlet />
      </div>

      {/* Public Footer */}
      <footer className="site-footer">
        <div className="site-footer-inner">
          <div>
            <div className="footer-brand">
              <div className="brand-emblem brand-emblem-sm">శ్రీ</div>
              <div className="footer-brand-name">Sri Somalamma Talli Temple</div>
            </div>
            <p className="footer-blurb">
              A sacred village temple managed with devotion and complete financial transparency by a dedicated volunteer committee.
            </p>
          </div>

          <nav aria-label="Footer">
            <h2 className="footer-heading">Explore</h2>
            <div className="footer-links">
              <Link to="/events">Upcoming Events</Link>
              <Link to="/gallery">Devotional Gallery</Link>
              <Link to="/transparency">Financial Transparency</Link>
              <Link to="/donate">Online Seva &amp; Donation</Link>
            </div>
          </nav>

          <div>
            <h2 className="footer-heading">Contact &amp; Visit</h2>
            <address className="footer-contact">
              <span>
                <Icon name="mapPin" size={14} /> {ADDRESS_SINGLE_LINE}
              </span>
              {TEMPLE.contact.phone ? (
                <span><Icon name="phone" size={14} /> {TEMPLE.contact.phone}</span>
              ) : null}
              {TEMPLE.contact.email ? (
                <span><Icon name="mail" size={14} /> {TEMPLE.contact.email}</span>
              ) : null}
              {!TEMPLE.contact.phone && !TEMPLE.contact.email ? (
                <span className="footer-pending">
                  Telephone and email will be published soon.
                </span>
              ) : null}
            </address>
          </div>
        </div>

        <div className="footer-bottom">
          © 2026 Sri Somalamma Talli Temple · Managed by the Temple Committee · <Link to="/admin/login">Admin Portal</Link>
        </div>
      </footer>
    </div>
  );
}

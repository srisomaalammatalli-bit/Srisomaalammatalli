import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/apiClient.js';
import Icon from '../../components/Icon.jsx';
import { TEMPLE, formatTime, formatTimeRange, formatDate } from '../../config/temple.js';
import { useSettings, settingValue } from '../../hooks/useSettings.js';
import HeroCarousel, {
  useHeroCarousel,
  HeroCarouselControls,
  DEITY_PHOTOGRAPHS
} from '../../components/HeroCarousel.jsx';

export default function HomePage() {
  const { settings } = useSettings();
  const [dailyPoojas, setDailyPoojas] = useState([]);
  const [nextEvent, setNextEvent] = useState(null);
  const [sections, setSections] = useState([]);
  const [heroSlides, setHeroSlides] = useState(null);

  // Poojas and the next event come from the database so the committee can
  // change them without a deployment. A failure here must never break the
  // page: the cards fall back to their "will be published soon" copy.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await apiClient.get('/poojas');
        const items = data?.items || [];
        if (!cancelled) setDailyPoojas(items.filter((p) => p.is_daily).slice(0, 3));
      } catch {
        if (!cancelled) setDailyPoojas([]);
      }

      try {
        const data = await apiClient.get('/events');
        const events = data?.events || data?.items || [];
        const today = new Date().toISOString().slice(0, 10);
        const upcoming = events
          .filter((e) => e.event_date && e.event_date >= today)
          .sort((a, b) => a.event_date.localeCompare(b.event_date));
        if (!cancelled) setNextEvent(upcoming[0] || null);
      } catch {
        if (!cancelled) setNextEvent(null);
      }

      // Which blocks appear, in what order, with what heading and hero
      // picture. Failing here leaves the page's own defaults in place rather
      // than blanking it.
      try {
        const data = await apiClient.get('/homepage-sections');
        if (!cancelled) setSections(data?.items || []);
      } catch {
        if (!cancelled) setSections([]);
      }

      // Photographs the committee has marked "featured" become the hero
      // slides, so the front page can be changed from the admin portal. Fewer
      // than two would not be a slideshow, so in that case the carousel keeps
      // its bundled fallback rather than showing a single picture with dots.
      try {
        const data = await apiClient.get('/gallery');
        const featured = (data?.items || [])
          .filter((g) => g.featured && g.image_url)
          .map((g) => ({ id: g.id, url: g.image_url }));
        if (!cancelled) setHeroSlides(featured.length >= 2 ? featured : null);
      } catch {
        if (!cancelled) setHeroSlides(null);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  /** A section by key, or undefined when the committee has disabled it. */
  const section = (key) => sections.find((s) => s.section_key === key);
  const hero = section('HERO');

  // The hero picture is set as an inline custom property so an administrator
  // choosing a different image in the media library replaces the stylesheet's
  // default immediately, with no rebuild.
  const heroStyle = hero?.media_url
    ? { '--hero-image': `url("${hero.media_url}")` }
    : undefined;

  // The pictures and their controls are rendered in two different places —
  // the stage behind the scrim, the controls in the flow after the buttons —
  // so the shared state lives here.
  const carousel = useHeroCarousel(heroSlides);

  const templeCity = settingValue(settings, 'temple_city', '');

  /** Integer paise from the accounts, shown in rupees. */
  const rupees = (paise) =>
    `₹${Math.round((Number(paise) || 0) / 100).toLocaleString('en-IN')}`;

  const quickCards = [
    { icon: 'lamp', title: 'Donate', desc: 'Offer your seva to the temple by UPI.', path: '/donate' },
    { icon: 'calendar', title: 'Events & Festivals', desc: 'Jathara, utsavams and special pooja schedules.', path: '/events' },
    { icon: 'image', title: 'Devotional Gallery', desc: 'Photographs of Amma Vari and the temple.', path: '/gallery' },
    { icon: 'play', title: 'Temple Videos', desc: 'Recordings of celebrations and processions.', path: '/videos' }
  ];

  return (
    <main className="page-enter">
      {/* Hero Section */}
      <section className="hero-section" style={heroStyle}>
        <HeroCarousel carousel={carousel} />
        <div className="hero-overlay" />
        <div className="hero-content">
          <div className="hero-telugu">
            {hero?.title_telugu || 'సర్వే జనాః సుఖినో భవంతు'}
          </div>
          <h1 className="hero-title">
            {hero?.title ? (
              hero.title
            ) : (
              <>
                Divine Blessings.<br />Transparent Service.
              </>
            )}
          </h1>
          <p className="hero-desc">
            {hero?.subtitle ||
              'Every rupee offered to the temple is recorded, receipted, and published for the community to see.'}
          </p>
          <div className="hero-actions">
            <Link to="/donate" className="btn btn-saffron">
              🙏 Donate to Temple
            </Link>
            <Link to="/events" className="btn btn-outline btn-on-dark">
              Explore Temple
            </Link>
          </div>
          <HeroCarouselControls carousel={carousel} />
        </div>
      </section>

      {/* Floating Info Strip */}
      <section className="quick-info-strip" aria-label="Temple information at a glance">
        <div className="info-card">
          <div className="card-label">Darshan Timings</div>
          <div className="card-value">
            {formatTimeRange(TEMPLE.timings.morning.open, TEMPLE.timings.morning.close)}
          </div>
          <div className="card-value">
            {formatTimeRange(TEMPLE.timings.evening.open, TEMPLE.timings.evening.close)}
          </div>
          <div className="card-note">{TEMPLE.timings.note}</div>
        </div>

        <div className="info-card">
          <div className="card-label">Daily Sevas</div>
          {dailyPoojas.length > 0 ? (
            dailyPoojas.map((p) => (
              <div key={p.id} className="card-value card-value-compact">
                {p.name}
                {p.pooja_time ? (
                  <span className="card-note-inline"> · {formatTime(p.pooja_time)}</span>
                ) : null}
              </div>
            ))
          ) : (
            <div className="card-note">Seva timings will be published soon.</div>
          )}
        </div>

        <div className="info-card info-card-maroon">
          <div className="card-label">Upcoming Event</div>
          {nextEvent ? (
            <>
              <div className="card-value">{nextEvent.title}</div>
              <div className="card-note">
                {formatDate(nextEvent.event_date)} · <Link to="/events">view details</Link>
              </div>
            </>
          ) : (
            <div className="card-note">
              Festival dates will be published here. <Link to="/events">See the calendar</Link>
            </div>
          )}
        </div>
      </section>

      {/* Amma Vari — the portrait photographs, shown upright and uncropped.
          These were hero slides until it became clear a 2.3-wide hero can only
          show a band of a 0.45-aspect photograph. Here they are seen whole. */}
      <section className="deity-strip" aria-labelledby="deity-strip-title">
        <p className="section-eyebrow">Amma Vari</p>
        <h2 className="section-title" id="deity-strip-title">
          Darshan of Sri Somalamma Talli
        </h2>
        <div className="deity-strip-grid">
          {DEITY_PHOTOGRAPHS.map((photo) => (
            <figure key={photo.id} className="deity-figure">
              <img src={photo.url} alt={photo.alt} loading="lazy" />
            </figure>
          ))}
        </div>
      </section>

      {/* Quick Action Grid */}
      <section className="action-grid">
        {quickCards.map((c) => (
          <Link key={c.title} to={c.path} className="action-card">
            <span className="action-card-icon">
              <Icon name={c.icon} size={26} />
            </span>
            <div className="action-card-title">{c.title}</div>
            <div className="action-card-desc">{c.desc}</div>
          </Link>
        ))}
      </section>

      {/* About & Story Section */}
      <section className="about-section">
        <div className="about-inner">
          <figure className="about-image-box">
            <img
              src="/assets/images/deity/somalamma-talli-alankaram.jpg"
              alt="Sri Somalamma Talli in alankaram, garlanded with marigold"
              loading="lazy"
            />
            <figcaption className="about-image-caption">
              <span className="about-image-title">Sri Somalamma Talli</span>
              {/* No age is claimed here. The temple's own history is not
                  documented, and "Centuries of Faith" would be a founding
                  claim on the front page that no source supports. */}
              <span className="about-image-sub">Amma Vari alankaram</span>
            </figcaption>
          </figure>

          <div>
            <p className="section-eyebrow">
              About the Temple
            </p>
            {/* The heading names no place and no age: the temple's location
                is admin-configurable, and nothing establishes its age. */}
            <h2 className="section-title">
              {templeCity ? `A living tradition of ${templeCity}` : 'A living tradition'}
            </h2>
            <p className="about-telugu font-telugu">
              అమ్మవారి ఆశీస్సులతో, ఊరి ప్రజల సేవలో
            </p>
            <p className="about-para">
              The temple of Sri Somalamma Talli is maintained by the village community, and the
              annual Jathara festival brings together devotees from the surrounding villages and
              mandals. The documented history of the temple, with its sources, is published on the
              history page.
            </p>
            <p className="about-para about-para-muted">
              Managed completely by an elected volunteer committee, the temple operates with dedication and service to the deity and devotees.
            </p>

            {/* No attendance count, founding year or committee headcount is
                shown here: none of them has been supplied by the committee,
                and a figure on the front page reads as a fact. */}
            <p className="about-para">
              <Link to="/history">Read the documented history of the temple →</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

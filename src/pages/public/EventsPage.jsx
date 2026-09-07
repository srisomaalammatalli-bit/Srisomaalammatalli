import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/apiClient.js';
import CardMedia from '../../components/CardMedia.jsx';
import SeoHead from '../../components/SeoHead.jsx';
import { TEMPLE } from '../../config/temple.js';

/** The month and day badge, taken from the event's real date. */
function badgeFor(eventDate) {
  if (!eventDate) return null;
  const d = new Date(String(eventDate).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return null;
  return {
    month: d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
    day: String(d.getDate()).padStart(2, '0')
  };
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await apiClient.get('/events');
        const rows = data?.events || data?.items || [];
        setEvents(
          rows.map((e) => ({
            id: e.id,
            slug: e.slug,
            name: e.title,
            nameTelugu: e.title_telugu,
            desc: e.description,
            place: e.location,
            time: e.start_time,
            eventDate: e.event_date,
            image: e.image_url
          }))
        );
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  return (
    <main className="page-main">
      <SeoHead
        title={`Upcoming Events & Celebrations | ${TEMPLE.name}`}
        description={`Sacred utsavams, special poojas, and auspicious celebrations at ${TEMPLE.name}, Mungandapalem. Complete temple calendar and celebration dates.`}
        canonicalPath="/events"
      />
      <header className="page-header">
        <p className="page-eyebrow">Temple Calendar</p>
        <h1 className="page-title">Temple Events &amp; Festivals</h1>
        <p className="page-subtitle">
          Sacred poojas, utsavams, and celebrations at {TEMPLE.name}
        </p>
      </header>

      {loading ? (
        <p className="section-intro">Loading the temple calendar…</p>
      ) : events.length === 0 ? (
        <p className="section-intro">
          No events have been published yet. The temple committee announces festivals and special
          poojas here as they are arranged.
        </p>
      ) : (
        <div className="events-grid">
          {events.map((evt) => {
            const badge = badgeFor(evt.eventDate);
            const meta = [evt.time, evt.place].filter(Boolean).join(' · ');
            const detailUrl = `/events/${evt.slug || evt.id}`;

            return (
              <article key={evt.id} className="event-card">
                <CardMedia className="event-media" src={evt.image} alt={evt.image ? evt.name : ''} />
                <div className="event-card-body">
                  {badge ? (
                    <div className="date-badge">
                      <div className="date-badge-month">{badge.month}</div>
                      <div className="date-badge-day">{badge.day}</div>
                    </div>
                  ) : null}
                  <div>
                    <h2 className="event-card-title">
                      <Link to={detailUrl} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {evt.name}
                      </Link>
                    </h2>
                    {evt.nameTelugu ? (
                      <p className="event-card-telugu font-telugu" lang="te">
                        {evt.nameTelugu}
                      </p>
                    ) : null}
                    {meta ? <p className="event-card-meta">{meta}</p> : null}
                    {evt.desc ? <p className="event-card-desc">{evt.desc}</p> : null}
                    <div style={{ marginTop: '0.75rem' }}>
                      <Link
                        to={detailUrl}
                        style={{ fontSize: '0.85rem', color: 'var(--color-primary, #b45309)', textDecoration: 'none', fontWeight: 500 }}
                      >
                        View Event Details →
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

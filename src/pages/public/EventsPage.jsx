import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient.js';
import CardMedia from '../../components/CardMedia.jsx';

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
        // The endpoint answers { events, items, count } — never a bare array,
        // which the previous Array.isArray() check assumed. It was therefore
        // always false, and the page showed a placeholder calendar even when
        // the temple had real events.
        const rows = data?.events || data?.items || [];
        setEvents(
          rows.map((e) => ({
            id: e.id,
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
        // An unreachable API is not a reason to invent a calendar.
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  return (
    <main className="page-main">
      <header className="page-header">
        <p className="page-eyebrow">Temple Calendar</p>
        <h1 className="page-title">Temple Events &amp; Festivals</h1>
        <p className="page-subtitle">
          Sacred poojas, utsavams, and celebrations at Sri Somalamma Talli Devasthanam
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
            // Every value below comes from the record. Nothing is filled in:
            // an event with no stated time or place simply shows neither.
            const badge = badgeFor(evt.eventDate);
            const meta = [evt.time, evt.place].filter(Boolean).join(' · ');

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
                    <h2 className="event-card-title">{evt.name}</h2>
                    {evt.nameTelugu ? (
                      <p className="event-card-telugu font-telugu" lang="te">
                        {evt.nameTelugu}
                      </p>
                    ) : null}
                    {meta ? <p className="event-card-meta">{meta}</p> : null}
                    {evt.desc ? <p className="event-card-desc">{evt.desc}</p> : null}
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

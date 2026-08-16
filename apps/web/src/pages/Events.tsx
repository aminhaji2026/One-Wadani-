import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicEvent, publicApi, whenLabel } from '../lib/publicApi';

const FALLBACK_IMAGES = [
  '/events/event-rally.jpg',
  '/events/event-meeting.jpg',
  '/events/event-diaspora.jpg',
  '/events/event-youth.jpg',
  '/events/event-speech.jpg',
  '/events/event-march.jpg',
];

export default function Events() {
  const [rows, setRows] = useState<PublicEvent[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    publicApi<PublicEvent[]>('/events')
      .then(setRows)
      .catch((e) => setError(e.message || 'Failed to load events'));
  }, []);

  return (
    <section className="pageHero suitePage">
      <div className="pageHeroInner">
        <p className="kicker">Events</p>
        <h1>Rallies, meetings &amp; actions</h1>
        <p className="pageLead">RSVP to published events, claim volunteer shifts, and keep organising after the night ends.</p>
        {error && <p className="formError">{error}</p>}
        <div className="eventList">
          {rows.map((e, i) => (
            <article key={e.id} className="eventRow">
              <div className="eventRowMedia" aria-hidden="true">
                <img src={e.imageUrl || FALLBACK_IMAGES[i % FALLBACK_IMAGES.length]} alt="" />
              </div>
              <div>
                <p className="kicker">{e.upcoming ? 'Upcoming' : e.status === 'COMPLETED' ? 'Completed' : 'Listed'}</p>
                <h2>
                  <Link to={`/events/${e.id}`}>{e.title}</Link>
                </h2>
                <p>{e.description}</p>
                <p className="muted">
                  {whenLabel(e.startsAt)}
                  {e.venue ? ` · ${e.venue}` : ''}
                  {e.office ? ` · ${e.office.name}` : ''}
                  {e.openShifts ? ` · ${e.openShifts} open shifts` : ''}
                </p>
                <Link className="btn btnPrimary" to={`/events/${e.id}`}>
                  View &amp; RSVP
                </Link>
              </div>
            </article>
          ))}
        </div>
        {!rows.length && !error && <p className="muted">Loading events…</p>}
      </div>
    </section>
  );
}

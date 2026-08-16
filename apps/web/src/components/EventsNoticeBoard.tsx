import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Thermometer from './Thermometer';
import { CampaignSummary, PublicEvent, publicApi, whenLabel } from '../lib/publicApi';

const FALLBACK_IMAGES = [
  '/events/event-rally.jpg',
  '/events/event-meeting.jpg',
  '/events/event-diaspora.jpg',
  '/events/event-youth.jpg',
  '/events/event-speech.jpg',
  '/events/event-march.jpg',
];

type Notice = {
  id: string;
  title: string;
  detail: string;
  when: string;
  where: string;
  tag: 'Today' | 'Soon' | 'Upcoming' | 'Past';
  image: string;
};

function tagFor(startsAt: string, upcoming?: boolean): Notice['tag'] {
  const d = new Date(startsAt);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (!upcoming && d < now) return 'Past';
  if (sameDay) return 'Today';
  const days = (d.getTime() - now.getTime()) / 86400000;
  if (days <= 4) return 'Soon';
  return 'Upcoming';
}

export default function EventsNoticeBoard() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [campaign, setCampaign] = useState<CampaignSummary | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    publicApi<PublicEvent[]>('/events')
      .then((rows) => {
        const mapped: Notice[] = rows.slice(0, 8).map((e, i) => ({
          id: e.id,
          title: e.title,
          detail: e.description || 'Join organisers and supporters.',
          when: whenLabel(e.startsAt),
          where: [e.venue, e.office?.name].filter(Boolean).join(' · ') || 'TBA',
          tag: tagFor(e.startsAt, e.upcoming),
          image: e.imageUrl || FALLBACK_IMAGES[i % FALLBACK_IMAGES.length],
        }));
        setNotices(mapped.length ? mapped : []);
      })
      .catch(() => setNotices([]));
    publicApi<CampaignSummary[]>('/campaigns')
      .then((rows) => setCampaign(rows[0] || null))
      .catch(() => setCampaign(null));
  }, []);

  useEffect(() => {
    if (notices.length < 2) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % notices.length), 4800);
    return () => window.clearInterval(id);
  }, [notices.length]);

  const featured = notices[active];
  const ticker = useMemo(() => [...notices, ...notices], [notices]);

  if (!featured) {
    return (
      <section className="section eventsNotice reveal" id="events" aria-label="Events notice board">
        <div className="sectionHead">
          <p className="kicker">Events notice board</p>
          <h2>Coming up across Waddani</h2>
          <p>Loading live events…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section eventsNotice reveal" id="events" aria-label="Events notice board">
      <div className="sectionHead">
        <p className="kicker">Events notice board</p>
        <h2>Coming up across Waddani</h2>
        <p>Live from the operations platform — rallies, branch meetings, diaspora calls, and volunteer actions.</p>
      </div>

      {campaign && (
        <div className="noticeThermo">
          <div>
            <p className="kicker">Live fund</p>
            <h3>
              <Link to={`/campaigns/${campaign.slug}`}>{campaign.title}</Link>
            </h3>
          </div>
          <Thermometer raised={campaign.raisedAmount} target={campaign.targetAmount} currency={campaign.currency} donors={campaign.donorCount} compact />
          <Link className="btn btnPrimary" to={`/donate?campaign=${campaign.slug}`}>
            Donate
          </Link>
        </div>
      )}

      <div className="eventsNoticeBoard">
        <article key={featured.id} className="eventsNoticeFeature">
          <div className="eventsNoticeImage" aria-hidden="true">
            <img src={featured.image} alt="" />
            <div className="eventsNoticeShade" />
          </div>
          <div className="eventsNoticeCopy">
            <div className="eventsNoticeMeta">
              <span className={`eventsNoticeTag eventsNoticeTag--${featured.tag.toLowerCase()}`}>{featured.tag}</span>
              <span className="eventsNoticePulse" aria-hidden="true" />
              <time>{featured.when}</time>
            </div>
            <h3>{featured.title}</h3>
            <p>{featured.detail}</p>
            <div className="eventsNoticeFoot">
              <span>{featured.where}</span>
              <Link to={`/events/${featured.id}`} className="eventsNoticeCta">
                View &amp; RSVP →
              </Link>
            </div>
          </div>
        </article>

        <div className="eventsNoticeTicker" aria-hidden="true">
          <div className="eventsNoticeTickerTrack" style={{ animationDuration: `${Math.max(18, notices.length * 5)}s` }}>
            {ticker.map((item, i) => (
              <div className="eventsNoticeTickerItem" key={`${item.id}-${i}`}>
                <img src={item.image} alt="" />
                <strong>{item.title}</strong>
                <span>{item.when}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="eventsNoticeDots" role="tablist" aria-label="Select event notice">
          {notices.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={item.title}
              className={i === active ? 'active' : ''}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
      </div>
      <div className="heroCtas" style={{ marginTop: 22 }}>
        <Link to="/events" className="btn btnGhost">
          All events
        </Link>
        <Link to="/action#shifts" className="btn btnGhost">
          Volunteer shifts
        </Link>
      </div>
    </section>
  );
}

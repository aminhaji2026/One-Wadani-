import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

type Notice = {
  id: string;
  title: string;
  detail: string;
  when: string;
  where: string;
  tag: 'Today' | 'Soon' | 'Upcoming';
  image: string;
};

const NOTICES: Notice[] = [
  {
    id: 'rally',
    title: 'National rally — Hargeisa',
    detail: 'Join organisers and supporters for a city-wide rally on jobs, services, and honest government.',
    when: 'Sat 22 Aug · 4:00 PM',
    where: 'Freedom Square, Hargeisa',
    tag: 'Soon',
    image: '/events/event-rally.jpg',
  },
  {
    id: 'meeting',
    title: 'Branch organising meeting',
    detail: 'Local coordinators meet to plan canvassing routes, volunteer shifts, and membership follow-ups.',
    when: 'Tue 18 Aug · 6:30 PM',
    where: 'Borama Local Office',
    tag: 'Today',
    image: '/events/event-meeting.jpg',
  },
  {
    id: 'diaspora',
    title: 'Diaspora campaign night',
    detail: 'Online town hall for overseas supporters covering consent-based updates and volunteer pathways.',
    when: 'Thu 20 Aug · 8:00 PM',
    where: 'Online / Zoom',
    tag: 'Soon',
    image: '/events/event-diaspora.jpg',
  },
  {
    id: 'youth',
    title: 'Youth volunteer canvass',
    detail: 'Youth wing door-knocking day — register supporters and share the plan for opportunity everywhere.',
    when: 'Sun 23 Aug · 10:00 AM',
    where: 'Berbera Community Hall',
    tag: 'Upcoming',
    image: '/events/event-youth.jpg',
  },
  {
    id: 'speech',
    title: 'Leadership address',
    detail: 'Public address on lowering living costs, protecting services, and rebuilding trust in public life.',
    when: 'Fri 28 Aug · 5:00 PM',
    where: 'National HQ courtyard',
    tag: 'Upcoming',
    image: '/events/event-speech.jpg',
  },
  {
    id: 'march',
    title: 'Evening solidarity march',
    detail: 'Peaceful evening march with branches, volunteers, and families standing together for fair chance.',
    when: 'Sat 29 Aug · 7:00 PM',
    where: 'Central Avenue route',
    tag: 'Upcoming',
    image: '/events/event-march.jpg',
  },
];

export default function EventsNoticeBoard() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (NOTICES.length < 2) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % NOTICES.length), 4800);
    return () => window.clearInterval(id);
  }, []);

  const featured = NOTICES[active];
  const ticker = [...NOTICES, ...NOTICES];

  return (
    <section className="section eventsNotice reveal" id="events" aria-label="Events notice board">
      <div className="sectionHead">
        <p className="kicker">Events notice board</p>
        <h2>Coming up across Waddani</h2>
        <p>Rallies, branch meetings, diaspora calls, and volunteer actions — updated as they are announced.</p>
      </div>

      <div className="eventsNoticeBoard">
        <article key={featured.id} className="eventsNoticeFeature">
          <div className="eventsNoticeImage" aria-hidden="true">
            <img src={featured.image} alt="" />
            <div className="eventsNoticeShade" />
          </div>
          <div className="eventsNoticeCopy">
            <div className="eventsNoticeMeta">
              <span className={`eventsNoticeTag eventsNoticeTag--${featured.tag.toLowerCase()}`}>
                {featured.tag}
              </span>
              <span className="eventsNoticePulse" aria-hidden="true" />
              <time>{featured.when}</time>
            </div>
            <h3>{featured.title}</h3>
            <p>{featured.detail}</p>
            <div className="eventsNoticeFoot">
              <span>{featured.where}</span>
              <Link to="/join" className="eventsNoticeCta">
                Get involved →
              </Link>
            </div>
          </div>
        </article>

        <div className="eventsNoticeTicker" aria-hidden="true">
          <div
            className="eventsNoticeTickerTrack"
            style={{ animationDuration: `${Math.max(18, NOTICES.length * 5)}s` }}
          >
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
          {NOTICES.map((item, i) => (
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
    </section>
  );
}

import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import EventsNoticeBoard from '../components/EventsNoticeBoard';
import VideoReleases from '../components/VideoReleases';

const news = [
  {
    date: '15 Aug 2026',
    title: 'Waddani organisers open membership drive across diaspora offices',
  },
  {
    date: '12 Aug 2026',
    title: 'Leadership brief: lowering living costs and protecting public services',
  },
  {
    date: '8 Aug 2026',
    title: 'Volunteer weekend mobilises supporters in Hargeisa and abroad',
  },
];

export default function Home() {
  useEffect(() => {
    const nodes = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('is-visible');
        });
      },
      { threshold: 0.16 }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <section className="hero">
        <div className="heroMedia" aria-hidden="true">
          <img src="/hero.png" alt="" />
          <div className="heroShade" />
        </div>
        <div className="heroCopy">
          <p className="heroEyebrow anim-1">We are</p>
          <h1 className="anim-2">
            <span className="brandWord">WADDANI</span>
          </h1>
          <p className="heroLead anim-3">
            Every Somalilander deserves a fair shot — lower costs, stronger services, honest government, and a democracy that works.
          </p>
          <div className="heroCtas anim-4">
            <Link to="/join" className="btn btnPrimary">
              Join
            </Link>
            <Link to="/donate" className="btn btnGhost">
              Donate
            </Link>
          </div>
        </div>
      </section>

      <section className="band bandAction reveal" id="action">
        <div className="bandInner">
          <div>
            <p className="kicker">Take action</p>
            <h2>Looking to get involved?</h2>
            <p>Find events, claim volunteer shifts, support a campaign fund, and track impact — all in one place.</p>
          </div>
          <div className="actionRow">
            <Link className="actionLink" to="/action">
              Open action hub
            </Link>
            <Link className="actionLink" to="/events">
              Find events
            </Link>
            <Link className="actionLink" to="/donate">
              Donate
            </Link>
            <Link className="actionLink" to="/join">
              Join the party
            </Link>
          </div>
        </div>
      </section>

      <section className="section plan reveal" id="plan">
        <div className="sectionHead">
          <p className="kicker">Our plan</p>
          <h2>A country that works for ordinary people</h2>
          <p>Inspired by clear public platforms: one message, three priorities, and room for everyone to take part.</p>
        </div>
        <ol className="pillars">
          <li>
            <span>01</span>
            <h3>Put power closer to people</h3>
            <p>Strengthen local branches and diaspora offices so communities shape decisions that affect them.</p>
          </li>
          <li>
            <span>02</span>
            <h3>Grow opportunity everywhere</h3>
            <p>Support jobs, skills, and fair markets so no town or region is written off.</p>
          </li>
          <li>
            <span>03</span>
            <h3>Restore hope in public life</h3>
            <p>Fight corruption, protect rights, and rebuild trust with transparent party operations.</p>
          </li>
        </ol>
      </section>

      <section className="quoteBand reveal">
        <blockquote>
          “I want a country that works for ordinary people, not against them.”
        </blockquote>
        <Link to="/join" className="btn btnPrimary">
          Agree? Add your name
        </Link>
      </section>

      <EventsNoticeBoard />

      <VideoReleases />

      <section className="section news reveal" id="news">
        <div className="sectionHead">
          <p className="kicker">Press &amp; updates</p>
          <h2>Latest from Waddani</h2>
        </div>
        <ul className="newsList">
          {news.map((item) => (
            <li key={item.title}>
              <time>{item.date}</time>
              <h3>{item.title}</h3>
            </li>
          ))}
        </ul>
      </section>

      <section className="joinBand reveal" id="join">
        <div className="joinBandInner">
          <div>
            <p className="kicker light">Join Waddani</p>
            <h2>Change takes all of us</h2>
            <p>Become a member, volunteer at events, or support the campaign fund. Build what comes next.</p>
          </div>
          <div className="heroCtas">
            <Link to="/join" className="btn btnLight">
              Join now
            </Link>
            <Link to="/donate" className="btn btnGhostLight">
              Donate
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

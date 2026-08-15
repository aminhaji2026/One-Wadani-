import { NavLink, Outlet, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import EventBanner from './EventBanner';
import NavPolls from './NavPolls';

export default function SiteShell() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="site">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className={`siteTop ${scrolled ? 'is-scrolled' : ''}`}>
        <EventBanner />
        <header className="siteNav">
          <div className="siteNavInner">
            <div className="siteNavLead">
              <Link to="/" className="siteBrand" aria-label="Waddani home">
                <img className="brandEmblem" src="/waddani-emblem-nav.png" alt="Xisbiga Waddani" width={48} height={48} />
                <span className="brandText">
                  <b>WADDANI</b>
                  <small>Somaliland National Party</small>
                </span>
              </Link>
              <NavPolls />
            </div>
            <button
              className="navToggle"
              type="button"
              aria-expanded={open}
              aria-label="Menu"
              onClick={() => setOpen((v) => !v)}
            >
              <span />
              <span />
            </button>
            <nav className={open ? 'is-open' : ''} onClick={() => setOpen(false)}>
              <Link to="/polls">Polls</Link>
              <a href="/#action">Take action</a>
              <a href="/#plan">Our plan</a>
              <a href="/#news">News</a>
              <Link to="/join">Join</Link>
              <Link to="/donate" className="navCta">
                Donate
              </Link>
              <Link to="/login" className="navQuiet">
                Staff
              </Link>
            </nav>
          </div>
        </header>
      </div>
      <main id="main">
        <Outlet />
      </main>
      <footer className="siteFooter">
        <div className="siteFooterInner">
          <div>
            <div className="siteBrand footerBrand">
              <img className="brandEmblem" src="/waddani-emblem.png" alt="Xisbiga Waddani" width={44} height={44} />
              <span className="brandText">
                <b>WADDANI</b>
                <small>Somaliland National Party</small>
              </span>
            </div>
            <p>The Somaliland National Party — organising for dignity, opportunity, and democratic accountability.</p>
          </div>
          <div>
            <h4>Get involved</h4>
            <Link to="/join">Become a member</Link>
            <Link to="/donate">Donate</Link>
            <a href="/#action">Find events</a>
          </div>
          <div>
            <h4>Platform</h4>
            <NavLink to="/login">Staff console</NavLink>
            <a href="mailto:hello@waddani.local">Contact</a>
          </div>
        </div>
        <div className="siteFooterBar">
          <small>© {new Date().getFullYear()} Waddani. Built for transparent party operations.</small>
        </div>
      </footer>
    </div>
  );
}

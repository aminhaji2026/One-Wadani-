import { NavLink, Outlet, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

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
      <header className={`siteNav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="siteNavInner">
          <Link to="/" className="siteBrand" aria-label="Waddani home">
            <img src="/waddani-mark.svg" alt="" width={40} height={40} />
            <span>WADDANI</span>
          </Link>
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
      <main id="main">
        <Outlet />
      </main>
      <footer className="siteFooter">
        <div className="siteFooterInner">
          <div>
            <div className="siteBrand footerBrand">
              <img src="/waddani-mark.svg" alt="" width={36} height={36} />
              <span>WADDANI</span>
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

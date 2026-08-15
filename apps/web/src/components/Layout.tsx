import { NavLink } from 'react-router-dom';
import { useMemo, useState, type ReactNode } from 'react';
import { clearSession, getStoredUser } from '../lib/api';
import BrandLogo from './BrandLogo';

const items: [string, string][] = [
  ['/', 'Command Centre'],
  ['/organisation', 'Organisation'],
  ['/members', 'Members'],
  ['/supporters', 'Supporters'],
  ['/people', 'Staff & Volunteers'],
  ['/fundraising', 'Fundraising'],
  ['/finance', 'Finance'],
  ['/communications', 'Communications'],
  ['/operations', 'Events & Tasks'],
  ['/analytics', 'Analytics'],
  ['/security', 'Security & Privacy'],
];

export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const user = getStoredUser();
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <div className="shell">
      <aside className={open ? 'open' : ''}>
        <div className="brand">
          <BrandLogo variant="mark" />
          <div>
            <b>WADDANI ONE</b>
            <small>Xisbiga Waddani</small>
          </div>
        </div>
        <nav onClick={() => setOpen(false)}>
          {items.map(([path, label]) => (
            <NavLink key={path} to={path} className={({ isActive }) => (isActive ? 'active' : '')} end={path === '/'}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="asideFooter">
          {user?.name && <div className="userChip">{user.name}</div>}
          <button
            className="logout"
            onClick={() => {
              clearSession();
              window.location.assign('/');
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main>
        <header>
          <div className="headerLead">
            <button className="navToggle" type="button" aria-label="Toggle navigation" onClick={() => setOpen((v) => !v)}>
              Menu
            </button>
            <div>
              <h1>Waddani One</h1>
              <p>
                {greeting}
                {user?.name ? `, ${user.name.split(' ')[0]}` : ''}. National party operations across membership,
                fundraising, and the field.
              </p>
            </div>
          </div>
          <div className="badge">Live HQ</div>
        </header>
        {children}
      </main>
      {open && <button className="navScrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    </div>
  );
}

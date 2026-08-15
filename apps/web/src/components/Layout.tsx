import { NavLink, Link } from 'react-router-dom';
import type { ReactNode } from 'react';

const items = [
  ['/console', 'Command Centre'],
  ['/console/organisation', 'Organisation'],
  ['/console/members', 'Members'],
  ['/console/supporters', 'Supporters'],
  ['/console/people', 'Staff & Volunteers'],
  ['/console/fundraising', 'Fundraising'],
  ['/console/finance', 'Finance'],
  ['/console/communications', 'Communications'],
  ['/console/operations', 'Events & Tasks'],
  ['/console/analytics', 'Analytics'],
  ['/console/security', 'Security & Privacy'],
];

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <aside>
        <Link to="/" className="brand">
          <img src="/waddani-mark.svg" alt="" width={42} height={42} />
          <div>
            <b>WADDANI ONE</b>
            <small>Party Operations Platform</small>
          </div>
        </Link>
        <nav>
          {items.map(([p, l]) => (
            <NavLink key={p} to={p} end={p === '/console'} className={({ isActive }) => (isActive ? 'active' : '')}>
              {l}
            </NavLink>
          ))}
        </nav>
        <button
          className="logout"
          onClick={() => {
            localStorage.removeItem('waddani_token');
            location.href = '/';
          }}
        >
          Sign out
        </button>
      </aside>
      <main>
        <header>
          <div>
            <h1>Waddani Management System</h1>
            <p>Secure global party operations, membership, fundraising and communications</p>
          </div>
          <div className="badge">HQ Console</div>
        </header>
        {children}
      </main>
    </div>
  );
}

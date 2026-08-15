import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { clearSession, getStoredUser, type PortalKind } from '../lib/api';
import BrandLogo from './BrandLogo';
import NotificationBell from './NotificationBell';

type NavItem = [string, string];

const navByPortal: Record<Exclude<PortalKind, 'staff'>, NavItem[]> = {
  member: [
    ['/', 'Home'],
    ['/events', 'Events'],
    ['/profile', 'My card'],
  ],
  supporter: [
    ['/', 'Home'],
    ['/campaigns', 'Campaigns'],
    ['/give', 'Give'],
    ['/consents', 'Consents'],
    ['/profile', 'Profile'],
  ],
  volunteer: [
    ['/', 'Home'],
    ['/tasks', 'Tasks'],
    ['/events', 'Field events'],
    ['/check-in', 'Check-in'],
    ['/profile', 'Profile'],
  ],
};

const titles: Record<Exclude<PortalKind, 'staff'>, { label: string; subtitle: string }> = {
  member: { label: 'Member portal', subtitle: 'Digital membership' },
  supporter: { label: 'Supporter portal', subtitle: 'Campaigns & consent' },
  volunteer: { label: 'Volunteer portal', subtitle: 'Field operations' },
};

export default function PortalShell({
  portal,
  children,
}: {
  portal: Exclude<PortalKind, 'staff'>;
  children: ReactNode;
}) {
  const user = getStoredUser();
  const meta = titles[portal];
  const items = navByPortal[portal];

  return (
    <div className={`portalShell theme-${portal}`}>
      <header className="portalHeader">
        <div className="portalBrand">
          <BrandLogo variant="mark" />
          <div>
            <b>WADDANI ONE</b>
            <small>
              {meta.label} · {user?.name}
            </small>
          </div>
        </div>
        <div className="portalHeaderActions">
          <span className="portalPill">{meta.subtitle}</span>
          <NotificationBell />
          <button
            type="button"
            className="secondaryBtn"
            onClick={() => {
              clearSession();
              window.location.assign('/');
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="portalLayout">
        <nav className="portalNav" aria-label={`${portal} portal`}>
          {items.map(([path, label]) => (
            <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              {label}
            </NavLink>
          ))}
        </nav>
        <main className="portalMain">{children}</main>
      </div>
    </div>
  );
}

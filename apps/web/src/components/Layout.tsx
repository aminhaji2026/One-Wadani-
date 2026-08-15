import { NavLink } from 'react-router-dom';
import { useMemo, useState, type ReactNode } from 'react';
import { clearSession, getStoredUser } from '../lib/api';
import BrandLogo from './BrandLogo';
import NotificationBell from './NotificationBell';
import { useI18n } from '../lib/i18n';
import { useFeaturedCampaignBanner } from '../lib/campaignBanner';

const items: [string, string][] = [
  ['/', 'Command Centre'],
  ['/approvals', 'Approvals'],
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
  const { t, lang, setLang } = useI18n();
  const banner = useFeaturedCampaignBanner();
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const roles = ((user as { roles?: string[] } | null)?.roles || []) as string[];
  const roleLabel = roles[0]?.replaceAll('_', ' ') || 'HQ Console';

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
        <header
          className={banner ? 'hasBanner' : undefined}
          style={banner ? { backgroundImage: `url(${banner.imageUrl})` } : undefined}
        >
          <div className="headerShade">
            <div className="headerLead">
              <button className="navToggle" type="button" aria-label="Toggle navigation" onClick={() => setOpen((v) => !v)}>
                Menu
              </button>
              <div>
                <h1>Waddani One</h1>
                <p>
                  {greeting}
                  {user?.name ? `, ${user.name.split(' ')[0]}` : ''}.{' '}
                  {banner
                    ? `${banner.title} — ${t('approvals')} and national operations in one workspace.`
                    : `${t('approvals')} and national operations in one workspace.`}
                </p>
              </div>
            </div>
            <div className="headerTrail">
              <div className="badge">{roleLabel}</div>
              <NotificationBell />
              <div className="langSwitch compact">
                <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
                  EN
                </button>
                <button type="button" className={lang === 'so' ? 'active' : ''} onClick={() => setLang('so')}>
                  SO
                </button>
              </div>
            </div>
          </div>
        </header>
        {children}
      </main>
      {open && <button className="navScrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    </div>
  );
}

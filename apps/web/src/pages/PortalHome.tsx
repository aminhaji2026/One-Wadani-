import { useEffect, useState } from 'react';
import { api, clearSession, getStoredUser } from '../lib/api';
import BrandLogo from '../components/BrandLogo';
import { Card, Empty, Table } from '../components/Common';

type PortalHomeData = {
  portal: string;
  cards?: { label: string; value?: string | null }[];
  upcomingEvents?: { id: string; title: string; startsAt: string; venue?: string | null }[];
  activeCampaigns?: { id: string; title: string; raisedAmount: string | number; targetAmount: string | number; currency: string }[];
  openTasks?: { id: string; title: string; priority: string; status: string }[];
  profile?: Record<string, unknown>;
};

export default function PortalHome() {
  const user = getStoredUser();
  const [data, setData] = useState<PortalHomeData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/portal/home')
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="portalShell">
      <header className="portalHeader">
        <div className="portalBrand">
          <BrandLogo variant="mark" />
          <div>
            <b>Waddani One</b>
            <small>{user?.portal || 'portal'} · {user?.name}</small>
          </div>
        </div>
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
      </header>

      <main className="portalMain">
        <div className="pageTitle">
          <div>
            <h2>Welcome{user?.name ? `, ${user.name}` : ''}</h2>
            <p>Your {user?.portal || 'community'} portal for Xisbiga Waddani.</p>
          </div>
        </div>

        {error && <div className="error">{error}</div>}
        {!data && !error && <div className="loading">Loading portal…</div>}

        {data?.cards && (
          <div className="stats stats4">
            {data.cards.map((c) => (
              <div className="stat" key={c.label}>
                <small>{c.label}</small>
                <strong>{c.value || '—'}</strong>
              </div>
            ))}
          </div>
        )}

        {data?.portal === 'member' && (
          <Card title="Upcoming events">
            {data.upcomingEvents?.length ? (
              <Table
                headers={['Event', 'When', 'Venue']}
                rows={data.upcomingEvents.map((e) => [
                  e.title,
                  new Date(e.startsAt).toLocaleString(),
                  e.venue || '—',
                ])}
              />
            ) : (
              <Empty text="No published events yet" />
            )}
          </Card>
        )}

        {data?.portal === 'supporter' && (
          <Card title="Active fundraising campaigns">
            {data.activeCampaigns?.length ? (
              <Table
                headers={['Campaign', 'Raised', 'Target']}
                rows={data.activeCampaigns.map((c) => [
                  c.title,
                  `${c.currency} ${Number(c.raisedAmount).toLocaleString()}`,
                  `${c.currency} ${Number(c.targetAmount).toLocaleString()}`,
                ])}
              />
            ) : (
              <Empty text="No active campaigns" />
            )}
          </Card>
        )}

        {data?.portal === 'volunteer' && (
          <Card title="Open tasks">
            {data.openTasks?.length ? (
              <Table
                headers={['Task', 'Priority', 'Status']}
                rows={data.openTasks.map((t) => [t.title, t.priority, t.status])}
              />
            ) : (
              <Empty text="No open tasks assigned to your office" />
            )}
          </Card>
        )}
      </main>
    </div>
  );
}

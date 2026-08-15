import { useEffect, useState } from 'react';
import { api, clearSession, getStoredUser } from '../lib/api';
import BrandLogo from '../components/BrandLogo';
import { Card, Empty, ProgressBar, Table } from '../components/Common';

type PortalHomeData = {
  portal: string;
  cards?: { label: string; value?: string | null }[];
  upcomingEvents?: { id: string; title: string; startsAt: string; venue?: string | null }[];
  activeCampaigns?: {
    id: string;
    title: string;
    raisedAmount: string | number;
    targetAmount: string | number;
    currency: string;
  }[];
  openTasks?: { id: string; title: string; priority: string; status: string }[];
  profile?: Record<string, unknown>;
};

const portalCopy: Record<string, { eyebrow: string; title: string; blurb: string }> = {
  member: {
    eyebrow: 'Member portal',
    title: 'Your membership, events, and community',
    blurb: 'Stay close to Waddani programmes, gatherings, and your digital membership record.',
  },
  supporter: {
    eyebrow: 'Supporter portal',
    title: 'Campaigns you can back with confidence',
    blurb: 'Follow active fundraising and keep your consent preferences respected.',
  },
  volunteer: {
    eyebrow: 'Volunteer portal',
    title: 'Field tasks ready for action',
    blurb: 'See open assignments for your office and keep the ground game moving.',
  },
};

export default function PortalHome() {
  const user = getStoredUser();
  const [data, setData] = useState<PortalHomeData | null>(null);
  const [error, setError] = useState('');
  const copy = portalCopy[user?.portal || ''] || {
    eyebrow: 'Community portal',
    title: 'Welcome to Waddani One',
    blurb: 'Your personal space for Xisbiga Waddani.',
  };

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
            <b>WADDANI ONE</b>
            <small>
              {user?.portal || 'portal'} · {user?.name}
            </small>
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
        <section className="heroBand">
          <div className="eyebrow">{copy.eyebrow}</div>
          <h2>
            {user?.name ? `${user.name.split(' ')[0]}, ` : ''}
            {copy.title}
          </h2>
          <p>{copy.blurb}</p>
        </section>

        {error && <div className="error">{error}</div>}
        {!data && !error && <div className="loading">Opening your portal…</div>}

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
              <Empty text="No published events yet — check back soon." />
            )}
          </Card>
        )}

        {data?.portal === 'supporter' && (
          <Card title="Active fundraising campaigns">
            {data.activeCampaigns?.length ? (
              <div className="campaignRail">
                {data.activeCampaigns.map((c) => {
                  const raised = Number(c.raisedAmount);
                  const target = Number(c.targetAmount) || 1;
                  const pct = Math.min(100, Math.round((raised / target) * 100));
                  return (
                    <div className="campaignRow" key={c.id}>
                      <div className="campaignRowHead">
                        <strong>{c.title}</strong>
                        <span>
                          {c.currency} {raised.toLocaleString()} / {target.toLocaleString()}
                        </span>
                      </div>
                      <ProgressBar value={pct} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty text="No active campaigns right now." />
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
              <Empty text="No open tasks assigned to your office yet." />
            )}
          </Card>
        )}
      </main>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getStoredUser } from '../../lib/api';
import { Card, Empty, ProgressBar, Stat, Table } from '../../components/Common';

type HomeData = {
  cards?: { label: string; value?: string | null }[];
  upcomingEvents?: {
    id: string;
    title: string;
    startsAt: string;
    venue?: string | null;
    description?: string | null;
  }[];
  activeCampaigns?: {
    id: string;
    title: string;
    raisedAmount: string | number;
    targetAmount: string | number;
    currency: string;
    description?: string;
  }[];
  recentDonations?: {
    id: string;
    receiptNo: string;
    amount: string | number;
    currency: string;
    status: string;
    campaign?: { title?: string } | null;
  }[];
  openTasks?: { id: string; title: string; priority: string; status: string; dueAt?: string | null }[];
};

export function MemberHome() {
  const user = getStoredUser();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/portal/home')
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <section className="heroBand">
        <div className="eyebrow">Member portal</div>
        <h2>{user?.name ? `${user.name.split(' ')[0]}, your membership hub` : 'Your membership hub'}</h2>
        <p>Carry your digital membership, RSVP to gatherings, and stay close to local Waddani activity.</p>
      </section>
      {error && <div className="error">{error}</div>}
      {!data && !error && <div className="loading">Opening member home…</div>}
      {data?.cards && (
        <div className="stats stats4">
          {data.cards.map((c) => (
            <Stat key={c.label} label={c.label} value={c.value || '—'} />
          ))}
        </div>
      )}
      <div className="grid2">
        <Card
          title="Next gatherings"
          actions={
            <Link className="linkish" to="/events">
              View all
            </Link>
          }
        >
          {data?.upcomingEvents?.length ? (
            <Table
              headers={['Event', 'When', 'Venue']}
              rows={data.upcomingEvents.slice(0, 4).map((e) => [
                e.title,
                new Date(e.startsAt).toLocaleString(),
                e.venue || '—',
              ])}
            />
          ) : (
            <Empty text="No published events yet." />
          )}
        </Card>
        <Card title="Quick actions">
          <div className="actionStack">
            <Link className="primary actionLink" to="/events">
              RSVP to an event
            </Link>
            <Link className="secondaryBtn actionLink" to="/profile">
              View membership card
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}

export function SupporterHome() {
  const user = getStoredUser();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/portal/home')
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <section className="heroBand">
        <div className="eyebrow">Supporter portal</div>
        <h2>{user?.name ? `${user.name.split(' ')[0]}, back the mission` : 'Back the mission'}</h2>
        <p>Follow live campaigns, give through Somali mobile money or Stripe, and control every consent.</p>
      </section>
      {error && <div className="error">{error}</div>}
      {!data && !error && <div className="loading">Opening supporter home…</div>}
      {data?.cards && (
        <div className="stats stats4">
          {data.cards.map((c) => (
            <Stat key={c.label} label={c.label} value={c.value || '—'} />
          ))}
        </div>
      )}
      <div className="grid2">
        <Card
          title="Active campaigns"
          actions={
            <Link className="linkish" to="/campaigns">
              Browse
            </Link>
          }
        >
          {data?.activeCampaigns?.length ? (
            <div className="campaignRail">
              {data.activeCampaigns.slice(0, 3).map((c) => {
                const raised = Number(c.raisedAmount);
                const target = Number(c.targetAmount) || 1;
                return (
                  <div className="campaignRow" key={c.id}>
                    <div className="campaignRowHead">
                      <strong>{c.title}</strong>
                      <span>
                        {c.currency} {raised.toLocaleString()}
                      </span>
                    </div>
                    <ProgressBar value={Math.min(100, Math.round((raised / target) * 100))} />
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty text="No active campaigns." />
          )}
        </Card>
        <Card
          title="Your recent gifts"
          actions={
            <Link className="linkish" to="/give">
              Give now
            </Link>
          }
        >
          {data?.recentDonations?.length ? (
            <Table
              headers={['Receipt', 'Campaign', 'Amount', 'Status']}
              rows={data.recentDonations.map((d) => [
                d.receiptNo,
                d.campaign?.title || '—',
                `${d.currency} ${Number(d.amount).toLocaleString()}`,
                d.status,
              ])}
            />
          ) : (
            <Empty text="No donations yet from this account." />
          )}
        </Card>
      </div>
    </>
  );
}

export function VolunteerHome() {
  const user = getStoredUser();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/portal/home')
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <section className="heroBand">
        <div className="eyebrow">Volunteer portal</div>
        <h2>{user?.name ? `${user.name.split(' ')[0]}, your field desk` : 'Your field desk'}</h2>
        <p>Pick up office tasks, update status as you go, and keep an eye on local gatherings.</p>
      </section>
      {error && <div className="error">{error}</div>}
      {!data && !error && <div className="loading">Opening volunteer home…</div>}
      {data?.cards && (
        <div className="stats stats4">
          {data.cards.map((c) => (
            <Stat key={c.label} label={c.label} value={c.value || '—'} />
          ))}
        </div>
      )}
      <div className="grid2">
        <Card
          title="Open tasks"
          actions={
            <Link className="linkish" to="/tasks">
              Manage
            </Link>
          }
        >
          {data?.openTasks?.length ? (
            <Table
              headers={['Task', 'Priority', 'Status']}
              rows={data.openTasks.slice(0, 5).map((t) => [t.title, t.priority, t.status])}
            />
          ) : (
            <Empty text="No open tasks for your office." />
          )}
        </Card>
        <Card title="Nearby / published events">
          {data?.upcomingEvents?.length ? (
            <Table
              headers={['Event', 'When', 'Venue']}
              rows={data.upcomingEvents.map((e) => [
                e.title,
                new Date(e.startsAt).toLocaleString(),
                e.venue || '—',
              ])}
            />
          ) : (
            <Empty text="No upcoming field events." />
          )}
        </Card>
      </div>
    </>
  );
}

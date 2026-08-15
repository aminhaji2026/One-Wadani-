import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getStoredUser } from '../../lib/api';
import { Card, Empty, ProgressBar, Stat, Table } from '../../components/Common';
import { useI18n } from '../../lib/i18n';

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

type Announcement = { id: string; title: string; body: string; publishedAt: string };

function usePortalHome() {
  const [data, setData] = useState<HomeData | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/portal/home')
      .then(setData)
      .catch((e: Error) => setError(e.message));
    api('/announcements')
      .then((d) => setAnnouncements(d.announcements || []))
      .catch(() => undefined);
  }, []);
  return { data, announcements, error };
}

function AnnouncementList({ items }: { items: Announcement[] }) {
  const { t } = useI18n();
  if (!items.length) return null;
  return (
    <Card title={t('announcements')}>
      <div className="campaignRail">
        {items.slice(0, 4).map((a) => (
          <div className="campaignRow" key={a.id}>
            <div className="campaignRowHead">
              <strong>{a.title}</strong>
              <span>{new Date(a.publishedAt).toLocaleDateString()}</span>
            </div>
            <div className="mutedLine">{a.body}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function MemberHome() {
  const user = getStoredUser();
  const { t } = useI18n();
  const { data, announcements, error } = usePortalHome();

  return (
    <>
      <section className="heroBand">
        <div className="eyebrow">Member portal</div>
        <h2>
          {t('welcome')}
          {user?.name ? `, ${user.name.split(' ')[0]}` : ''} — your membership hub
        </h2>
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
      <AnnouncementList items={announcements} />
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
            <Empty text={t('emptyEvents')} />
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
  const { t } = useI18n();
  const { data, announcements, error } = usePortalHome();

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
      <AnnouncementList items={announcements} />
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
            <Empty text={t('emptyCampaigns')} />
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
            <Empty text="No donations yet — start from Give." />
          )}
        </Card>
      </div>
    </>
  );
}

export function VolunteerHome() {
  const user = getStoredUser();
  const { t } = useI18n();
  const { data, announcements, error } = usePortalHome();

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
      <AnnouncementList items={announcements} />
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
            <div className="taskCards">
              {data.openTasks.slice(0, 5).map((task) => (
                <div className="taskCard" key={task.id}>
                  <strong>{task.title}</strong>
                  <span>
                    {task.priority} · {task.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Empty text={t('emptyTasks')} />
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
            <Empty text={t('emptyEvents')} />
          )}
        </Card>
      </div>
    </>
  );
}

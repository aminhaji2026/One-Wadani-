import { lazy, Suspense, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, Stat } from '../components/Common';

const CountryBarChart = lazy(() =>
  import('../components/Charts').then((m) => ({ default: m.CountryBarChart })),
);

type DashboardData = {
  members: number;
  supporters: number;
  offices: number;
  staff: number;
  volunteers: number;
  activeCampaigns: number;
  upcomingEvents: number;
  openTasks: number;
  confirmedDonations: number;
  approvedExpenses: number;
  supportersByCountry: { country: string; count: number }[];
  recentDonations: {
    id: string;
    amount: number;
    currency: string;
    country: string;
    campaign: string;
    createdAt: string;
  }[];
};

export default function Dashboard() {
  const [d, setD] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/analytics/dashboard')
      .then(setD)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!d) return <div className="loading">Loading command centre…</div>;

  return (
    <>
      <section className="heroBand">
        <div className="eyebrow">Command centre</div>
        <h2>Momentum across the movement</h2>
        <p>
          Track membership growth, supporter reach, fundraising pulse, and field activity in one live view.
        </p>
      </section>

      <div className="stats">
        <Stat label="Members" value={d.members} />
        <Stat label="Supporters" value={d.supporters} />
        <Stat label="Active offices" value={d.offices} />
        <Stat label="Staff" value={d.staff} />
        <Stat label="Volunteers" value={d.volunteers} />
        <Stat label="Confirmed donations" value={`$${d.confirmedDonations.toLocaleString()}`} />
      </div>
      <div className="grid2">
        <Card title="Operations pulse">
          <div className="metricList">
            <p>
              <span>Active fundraising campaigns</span>
              <b>{d.activeCampaigns}</b>
            </p>
            <p>
              <span>Published / upcoming events</span>
              <b>{d.upcomingEvents}</b>
            </p>
            <p>
              <span>Open tasks</span>
              <b>{d.openTasks}</b>
            </p>
            <p>
              <span>Approved expenses</span>
              <b>${d.approvedExpenses.toLocaleString()}</b>
            </p>
          </div>
        </Card>
        <Card title="Supporters by country">
          <Suspense fallback={<div className="loading">Loading chart…</div>}>
            <CountryBarChart data={d.supportersByCountry} />
          </Suspense>
        </Card>
      </div>
      <Card title="Recent confirmed donations">
        {d.recentDonations?.length ? (
          <div className="metricList">
            {d.recentDonations.map((x) => (
              <p key={x.id}>
                <span>
                  {x.campaign} · {x.country}
                </span>
                <b>
                  {x.currency} {x.amount.toLocaleString()}
                </b>
              </p>
            ))}
          </div>
        ) : (
          <div className="empty">No confirmed donations yet — record one from Fundraising.</div>
        )}
      </Card>
      <Card title="Platform safeguards">
        <div className="notice">
          Consent-based supporter communications and aggregate operational analytics only. This build does not implement
          clan profiling, covert affiliation inference, or sensitive persuasion scoring.
        </div>
      </Card>
    </>
  );
}

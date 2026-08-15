import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../lib/api';
import { Card, Stat } from '../components/Common';

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
  recentDonations: { id: string; amount: number; currency: string; country: string; campaign: string; createdAt: string }[];
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
              <span>Published/upcoming events</span>
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
          {d.supportersByCountry.length ? (
            <div className="chartBox">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={d.supportersByCountry}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5ece8" />
                  <XAxis dataKey="country" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#168a59" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty">No supporter data yet</div>
          )}
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
          <div className="empty">No confirmed donations yet</div>
        )}
      </Card>
      <Card title="Platform safeguards">
        <div className="notice">
          This build uses consent-based supporter communications and aggregate operational analytics. It intentionally
          does not implement clan profiling, covert political-affiliation inference or sensitive persuasion scoring.
        </div>
      </Card>
    </>
  );
}

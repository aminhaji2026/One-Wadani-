import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, Stat } from '../components/Common';
import VideoReleases from '../components/VideoReleases';

export default function Dashboard() {
  const [d, setD] = useState<any>();
  useEffect(() => {
    api('/analytics/dashboard').then(setD);
  }, []);
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

      <VideoReleases />

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
            d.supportersByCountry.map((x: any) => (
              <div className="barrow" key={x.country}>
                <span>{x.country}</span>
                <div>
                  <i style={{ width: `${Math.min(100, x.count * 5)}%` }} />
                </div>
                <b>{x.count}</b>
              </div>
            ))
          ) : (
            <div className="empty">No supporter data yet</div>
          )}
        </Card>
      </div>
      <Card title="Platform safeguards">
        <div className="notice">
          This build uses consent-based supporter communications and aggregate operational analytics. It intentionally
          does not implement clan profiling, covert political-affiliation inference or sensitive persuasion scoring.
        </div>
      </Card>
    </>
  );
}

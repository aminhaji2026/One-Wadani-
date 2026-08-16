import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { money, publicApi } from '../lib/publicApi';

type Impact = {
  members: number;
  supporters: number;
  volunteers: number;
  eventsHeld: number;
  volunteerShiftsFilled: number;
  confirmedDonations: number;
  donationCount: number;
  fundsDeployed: number;
  activeOffices: number;
  activeCampaigns: number;
  note: string;
};

type Diaspora = { leaderboard: Array<{ country: string; raised: number; donors: number; members: number; supporters: number }> };
type Offices = {
  offices: Array<{
    id: string;
    name: string;
    country: string;
    city?: string | null;
    type: string;
    members: number;
    events: number;
    volunteers: number;
    raised: number;
  }>;
};

export default function Impact() {
  const [impact, setImpact] = useState<Impact | null>(null);
  const [diaspora, setDiaspora] = useState<Diaspora['leaderboard']>([]);
  const [offices, setOffices] = useState<Offices['offices']>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([publicApi<Impact>('/impact'), publicApi<Diaspora>('/diaspora'), publicApi<Offices>('/offices/scoreboard')])
      .then(([i, d, o]) => {
        setImpact(i);
        setDiaspora(d.leaderboard || []);
        setOffices(o.offices || []);
      })
      .catch((e) => setError(e.message || 'Failed to load impact'));
  }, []);

  return (
    <section className="pageHero suitePage">
      <div className="pageHeroInner">
        <p className="kicker">Transparency</p>
        <h1>Impact dashboard</h1>
        <p className="pageLead">
          Aggregate organising and fundraising metrics only — no individual political profiling.
        </p>
        {error && <p className="formError">{error}</p>}

        {impact && (
          <div className="impactGrid">
            <div>
              <strong>{impact.members}</strong>
              <span>Active members</span>
            </div>
            <div>
              <strong>{impact.supporters}</strong>
              <span>Supporters</span>
            </div>
            <div>
              <strong>{impact.volunteers}</strong>
              <span>Volunteers</span>
            </div>
            <div>
              <strong>{impact.eventsHeld}</strong>
              <span>Events held</span>
            </div>
            <div>
              <strong>{impact.volunteerShiftsFilled}</strong>
              <span>Shifts filled</span>
            </div>
            <div>
              <strong>{money(impact.confirmedDonations)}</strong>
              <span>{impact.donationCount} confirmed gifts</span>
            </div>
            <div>
              <strong>{money(impact.fundsDeployed)}</strong>
              <span>Funds deployed</span>
            </div>
            <div>
              <strong>{impact.activeOffices}</strong>
              <span>Active offices</span>
            </div>
            <div>
              <strong>{impact.activeCampaigns}</strong>
              <span>Live campaigns</span>
            </div>
          </div>
        )}

        <div className="suiteSection">
          <h2>Diaspora leaderboard</h2>
          <p className="muted">Country totals from confirmed gifts and membership — celebrate organising, not clans.</p>
          <ol className="scoreList">
            {diaspora.map((row, i) => (
              <li key={row.country}>
                <span className="rank">{i + 1}</span>
                <div>
                  <strong>{row.country}</strong>
                  <span>
                    {money(row.raised)} · {row.donors} donors · {row.members} members · {row.supporters} supporters
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="suiteSection">
          <h2>Office scoreboard</h2>
          <ol className="scoreList">
            {offices.map((o, i) => (
              <li key={o.id}>
                <span className="rank">{i + 1}</span>
                <div>
                  <strong>
                    {o.name}
                    {o.city ? ` · ${o.city}` : ''}
                  </strong>
                  <span>
                    {o.country} · {o.members} members · {o.volunteers} volunteers · {o.events} events · {money(o.raised)} raised
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="heroCtas">
          <Link to="/donate" className="btn btnPrimary">
            Donate
          </Link>
          <Link to="/action" className="btn btnGhost">
            Take action
          </Link>
          <Link to="/campaigns" className="btn btnGhost">
            Campaigns
          </Link>
        </div>
        {impact?.note && <p className="muted">{impact.note}</p>}
      </div>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Thermometer from '../components/Thermometer';
import { CampaignSummary, money, publicApi } from '../lib/publicApi';

export default function Campaigns() {
  const [rows, setRows] = useState<CampaignSummary[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    publicApi<CampaignSummary[]>('/campaigns')
      .then(setRows)
      .catch((e) => setError(e.message || 'Failed to load campaigns'));
  }, []);

  return (
    <section className="pageHero suitePage">
      <div className="pageHeroInner">
        <p className="kicker">Fundraising</p>
        <h1>Campaign funds</h1>
        <p className="pageLead">
          Transparent goals for canvassing, youth training, and diaspora organising. Pick a fund, share the story, and track progress.
        </p>
        {error && <p className="formError">{error}</p>}
        <div className="campaignGrid">
          {rows.map((c) => (
            <article key={c.id} className="campaignTile">
              {c.imageUrl && (
                <Link to={`/campaigns/${c.slug}`} className="campaignTileMedia" aria-hidden="true">
                  <img src={c.imageUrl} alt="" />
                </Link>
              )}
              <div className="campaignTileBody">
                <p className="kicker">{c.office ? `${c.office.name}` : 'National'}</p>
                <h2>
                  <Link to={`/campaigns/${c.slug}`}>{c.title}</Link>
                </h2>
                <p>{c.description}</p>
                <Thermometer raised={c.raisedAmount} target={c.targetAmount} currency={c.currency} donors={c.donorCount} compact />
                <div className="heroCtas">
                  <Link className="btn btnPrimary" to={`/donate?campaign=${c.slug}`}>
                    Donate {money(25, c.currency)}+
                  </Link>
                  <Link className="btn btnGhost" to={`/campaigns/${c.slug}`}>
                    Read story
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
        {!rows.length && !error && <p className="muted">Loading campaigns…</p>}
      </div>
    </section>
  );
}

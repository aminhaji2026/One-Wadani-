import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Thermometer from '../components/Thermometer';
import { CampaignDetail, money, publicApi, whenLabel } from '../lib/publicApi';

export default function CampaignDetailPage() {
  const { slug } = useParams();
  const [c, setC] = useState<CampaignDetail | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    publicApi<CampaignDetail>(`/campaigns/${slug}`)
      .then(setC)
      .catch((e) => setError(e.message || 'Campaign not found'));
  }, [slug]);

  const share = async () => {
    if (!c) return;
    const url = window.location.href;
    const text = c.shareText || `Support ${c.title}`;
    try {
      if (navigator.share) await navigator.share({ title: c.title, text, url });
      else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* user cancelled */
    }
  };

  if (error) {
    return (
      <section className="pageHero">
        <div className="pageHeroInner">
          <h1>Campaign unavailable</h1>
          <p className="pageLead">{error}</p>
          <Link to="/campaigns" className="btn btnPrimary">
            All campaigns
          </Link>
        </div>
      </section>
    );
  }

  if (!c) {
    return (
      <section className="pageHero">
        <div className="pageHeroInner">
          <p className="muted">Loading campaign…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="pageHero suitePage">
      <div className="pageHeroInner campaignDetail">
        <p className="kicker">{c.office ? c.office.name : 'National campaign'}</p>
        <h1>{c.title}</h1>
        <p className="pageLead">{c.story || c.description}</p>
        <Thermometer raised={c.raisedAmount} target={c.targetAmount} currency={c.currency} donors={c.donorCount} />
        <div className="heroCtas">
          <Link className="btn btnPrimary" to={`/donate?campaign=${c.slug}`}>
            Donate now
          </Link>
          <button type="button" className="btn btnGhost" onClick={share}>
            {copied ? 'Link copied' : 'Share'}
          </button>
          <Link className="btn btnGhost" to="/action">
            Take action
          </Link>
        </div>

        {c.recentDonations?.length > 0 && (
          <div className="recentDonors">
            <h2>Recent confirmed gifts</h2>
            <ul>
              {c.recentDonations.map((d, i) => (
                <li key={`${d.at}-${i}`}>
                  <strong>{d.name}</strong>
                  <span>
                    {money(d.amount, d.currency)}
                    {d.recurring ? ' · recurring' : ''} · {d.country}
                  </span>
                  <time>{whenLabel(d.at)}</time>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

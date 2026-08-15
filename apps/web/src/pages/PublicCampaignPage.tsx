import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { ProgressBar } from '../components/Common';

const API = import.meta.env.VITE_API_URL || '/api';

type Campaign = {
  id: string;
  title: string;
  description: string;
  message?: string | null;
  imageUrl?: string | null;
  targetAmount: string | number;
  raisedAmount: string | number;
  currency: string;
  slug?: string | null;
};

type Gateway = { id: string; label: string; demoMode: boolean };

export default function PublicCampaignPage() {
  const { slug } = useParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [form, setForm] = useState({
    amount: '25',
    gateway: 'zaad',
    donorName: '',
    donorEmail: '',
    donorPhone: '',
    donorCountry: '',
    recurring: false,
  });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API}/public/campaigns/${slug}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Not found');
        setCampaign(d.campaign);
        setGateways(d.gateways || []);
      })
      .catch((e: Error) => setError(e.message));
  }, [slug]);

  const donate = async () => {
    if (!campaign) return;
    setSaving(true);
    setError('');
    setInfo('');
    try {
      const res = await fetch(`${API}/public/donate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          amount: Number(form.amount),
          gateway: form.gateway,
          donorName: form.donorName,
          donorEmail: form.donorEmail,
          donorPhone: form.donorPhone,
          donorCountry: form.donorCountry,
          recurring: form.recurring,
          returnUrl: window.location.href,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Donation failed');
      setInfo(`${data.receiptNo} · ${data.status}. ${data.instructions || ''}`);
      if (data.checkoutUrl) window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
      if (data.receiptUrl) {
        setInfo((prev) => `${prev} Receipt: ${data.receiptUrl}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Donation failed');
    } finally {
      setSaving(false);
    }
  };

  const raised = Number(campaign?.raisedAmount || 0);
  const target = Number(campaign?.targetAmount || 1);
  const pct = Math.min(100, Math.round((raised / target) * 100));

  return (
    <div className="portalShell publicCampaignPage">
      <header
        className={`portalHeader campaignHeaderBanner${campaign?.imageUrl ? ' hasBanner' : ''}`}
        style={campaign?.imageUrl ? { backgroundImage: `url(${campaign.imageUrl})` } : undefined}
      >
        <div className="headerShade portalHeaderShade">
          <div className="portalBrand">
            <BrandLogo variant="mark" />
            <div>
              <b>WADDANI ONE</b>
              <small>Public campaign</small>
            </div>
          </div>
          <Link className="secondaryBtn" to="/">
            Sign in
          </Link>
        </div>
        {campaign && (
          <div className="campaignBannerShade inHeader">
            <p className="eyebrow">Waddani fundraising</p>
            <h1>{campaign.title}</h1>
            <p>{campaign.description}</p>
          </div>
        )}
      </header>

      <main className="portalMain">
        {error && <div className="error">{error}</div>}
        {!campaign && !error && <div className="loading">Loading campaign…</div>}
        {campaign && (
          <>
            {campaign.message ? (
              <section className="campaignMessage">
                <h2>Campaign message</h2>
                <p>{campaign.message}</p>
              </section>
            ) : null}

            <div className="card">
              <div className="campaignRowHead">
                <strong>{pct}% raised</strong>
                <span>
                  {campaign.currency} {raised.toLocaleString()} / {target.toLocaleString()}
                </span>
              </div>
              <ProgressBar value={pct} />
            </div>
            <div className="card">
              <div className="cardHead">
                <h3>Give now</h3>
              </div>
              <div className="formGrid">
                <label>
                  <span>Amount</span>
                  <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} type="number" />
                </label>
                <label>
                  <span>Gateway</span>
                  <select value={form.gateway} onChange={(e) => setForm({ ...form, gateway: e.target.value })}>
                    {gateways.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                        {g.demoMode ? ' (demo)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Name</span>
                  <input value={form.donorName} onChange={(e) => setForm({ ...form, donorName: e.target.value })} />
                </label>
                <label>
                  <span>Email (for receipt)</span>
                  <input type="email" value={form.donorEmail} onChange={(e) => setForm({ ...form, donorEmail: e.target.value })} />
                </label>
                <label>
                  <span>Phone</span>
                  <input value={form.donorPhone} onChange={(e) => setForm({ ...form, donorPhone: e.target.value })} />
                </label>
                <label>
                  <span>Country</span>
                  <input value={form.donorCountry} onChange={(e) => setForm({ ...form, donorCountry: e.target.value })} />
                </label>
              </div>
              <label className="checkLabel" style={{ marginBottom: 12 }}>
                <input
                  type="checkbox"
                  checked={form.recurring}
                  onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
                />
                <span>Make this a recurring monthly gift (flagged for follow-up)</span>
              </label>
              <button type="button" className="primary" disabled={saving} onClick={donate}>
                {saving ? 'Processing…' : 'Donate'}
              </button>
              {info && <div className="notice">{info}</div>}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card, Empty, ProgressBar, Table } from '../../components/Common';

type Campaign = {
  id: string;
  title: string;
  description: string;
  message?: string | null;
  imageUrl?: string | null;
  slug?: string | null;
  targetAmount: string | number;
  raisedAmount: string | number;
  currency: string;
};

type Gateway = { id: string; label: string; configured: boolean; demoMode: boolean };

export function SupporterCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/portal/campaigns')
      .then((d) => {
        setCampaigns(d.campaigns || []);
        setGateways(d.gateways || []);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <section className="heroBand">
        <div className="eyebrow">Campaigns</div>
        <h2>Live fundraising you can support</h2>
        <p>Track progress and jump into giving with ZAAD, eDahab, Premier, MyCash, Sifalo, or Stripe.</p>
      </section>
      {error && <div className="error">{error}</div>}
      <Card title="Accepted gateways">
        <div className="gatewayGrid">
          {gateways
            .filter((g) => g.id !== 'mock')
            .map((g) => (
              <div key={g.id} className={`gatewayChip ${g.configured ? 'ready' : 'demo'}`}>
                <strong>{g.label}</strong>
                <span>{g.configured ? 'Live credentials' : 'Demo mode'}</span>
              </div>
            ))}
        </div>
      </Card>
      <Card title={`${campaigns.length} active campaigns`}>
        {campaigns.length ? (
          <div className="campaignRail">
            {campaigns.map((c) => {
              const raised = Number(c.raisedAmount);
              const target = Number(c.targetAmount) || 1;
              const pct = Math.min(100, Math.round((raised / target) * 100));
              return (
                <div className="campaignRow" key={c.id}>
                  {c.imageUrl && (
                    <div className="campaignThumb" style={{ backgroundImage: `url(${c.imageUrl})` }} aria-hidden="true" />
                  )}
                  <div className="campaignRowHead">
                    <div>
                      <strong>{c.title}</strong>
                      <div className="mutedLine">{c.message || c.description}</div>
                    </div>
                    <span>
                      {pct}% · {c.currency} {raised.toLocaleString()} / {target.toLocaleString()}
                    </span>
                  </div>
                  <ProgressBar value={pct} />
                  <div className="btnRow" style={{ marginTop: 10 }}>
                    <Link className="primary actionLink" to={`/give?campaign=${c.id}`}>
                      Support this campaign
                    </Link>
                    {c.slug && (
                      <a className="secondaryBtn actionLink" href={`/c/${c.slug}`} target="_blank" rel="noreferrer">
                        Open public page
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty text="No active campaigns." />
        )}
      </Card>
    </>
  );
}

export function SupporterGive() {
  const params = new URLSearchParams(window.location.search);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [donations, setDonations] = useState<
    { id: string; receiptNo: string; amount: string | number; currency: string; status: string; gateway?: string; campaign?: { title?: string } | null; createdAt: string }[]
  >([]);
  const [form, setForm] = useState({
    campaignId: params.get('campaign') || '',
    amount: '25',
    currency: 'USD',
    gateway: 'zaad',
    donorPhone: '',
  });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [c, d] = await Promise.all([api('/portal/campaigns'), api('/portal/donations')]);
    setCampaigns(c.campaigns || []);
    setGateways(c.gateways || []);
    setDonations(d.donations || []);
    if (!form.campaignId && c.campaigns?.[0]?.id) {
      setForm((f) => ({ ...f, campaignId: c.campaigns[0].id }));
    }
  };

  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    setSaving(true);
    setError('');
    setInfo('');
    try {
      const result = await api('/portal/donate', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
          returnUrl: window.location.href,
        }),
      });
      setInfo(
        [`Gift ${result.receiptNo} via ${result.gateway} (${result.status}).`, result.instructions]
          .filter(Boolean)
          .join(' '),
      );
      if (result.checkoutUrl) window.open(result.checkoutUrl, '_blank', 'noopener,noreferrer');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Donation failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section className="heroBand">
        <div className="eyebrow">Give</div>
        <h2>Send support in a few taps</h2>
        <p>Your profile details are applied automatically. Choose a campaign, gateway, and amount.</p>
      </section>
      {error && <div className="error">{error}</div>}
      {info && <div className="notice">{info}</div>}
      <Card title="New gift">
        <div className="formGrid">
          <label>
            <span>Campaign</span>
            <select value={form.campaignId} onChange={(e) => setForm({ ...form, campaignId: e.target.value })}>
              <option value="">Select…</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
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
            <span>Amount</span>
            <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </label>
          <label>
            <span>Phone (mobile money)</span>
            <input value={form.donorPhone} onChange={(e) => setForm({ ...form, donorPhone: e.target.value })} placeholder="2526…" />
          </label>
        </div>
        <button type="button" className="primary" disabled={saving || !form.campaignId} onClick={submit}>
          {saving ? 'Processing…' : 'Complete gift'}
        </button>
      </Card>
      <Card title="Your donation history">
        {donations.length ? (
          <Table
            headers={['Receipt', 'Campaign', 'Gateway', 'Amount', 'Status', 'Date']}
            rows={donations.map((d) => [
              d.receiptNo,
              d.campaign?.title || '—',
              d.gateway || '—',
              `${d.currency} ${Number(d.amount).toLocaleString()}`,
              d.status,
              new Date(d.createdAt).toLocaleString(),
            ])}
          />
        ) : (
          <Empty text="No gifts yet." />
        )}
      </Card>
    </>
  );
}

export function SupporterConsents() {
  const [consents, setConsents] = useState<{ type: string; granted: boolean }[]>([]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('/portal/consents')
      .then((d) => setConsents(d.consents || []))
      .catch((e: Error) => setError(e.message));
  }, []);

  const toggle = (type: string) => {
    setConsents((rows) => rows.map((c) => (c.type === type ? { ...c, granted: !c.granted } : c)));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setInfo('');
    try {
      const result = await api('/portal/consents', {
        method: 'PUT',
        body: JSON.stringify({ consents }),
      });
      setConsents(
        (result.consents || []).map((c: { type: string; granted: boolean }) => ({
          type: c.type,
          granted: c.granted,
        })),
      );
      setInfo('Consent preferences saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section className="heroBand">
        <div className="eyebrow">Consents</div>
        <h2>You decide how Waddani reaches you</h2>
        <p>Toggle communication topics on or off. Changes apply immediately to supporter outreach.</p>
      </section>
      {error && <div className="error">{error}</div>}
      {info && <div className="notice">{info}</div>}
      <Card title="Communication preferences">
        <div className="consentBox">
          <div className="consentGrid">
            {consents.map((c) => (
              <label className="checkLabel" key={c.type}>
                <input type="checkbox" checked={c.granted} onChange={() => toggle(c.type)} />
                <span>{c.type.replaceAll('_', ' ')}</span>
              </label>
            ))}
          </div>
        </div>
        <button type="button" className="primary" disabled={saving || !consents.length} onClick={save}>
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
      </Card>
    </>
  );
}

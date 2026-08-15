import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, Empty, ProgressBar, Table } from '../components/Common';

type Campaign = {
  id: string;
  title: string;
  description: string;
  targetAmount: string | number;
  raisedAmount: string | number;
  currency: string;
  status: string;
  office?: { name?: string } | null;
};

type Donation = {
  id: string;
  receiptNo: string;
  amount: string | number;
  currency: string;
  status: string;
  gateway?: string;
  donorName?: string | null;
  donorCountry?: string | null;
  createdAt: string;
  campaign?: { title?: string } | null;
};

type Gateway = { id: string; label: string; configured: boolean; demoMode: boolean };

export default function FundraisingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [open, setOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [donate, setDonate] = useState<Record<string, string>>({ gateway: 'zaad', currency: 'USD' });
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [c, d, g] = await Promise.all([
        api('/fundraising'),
        api('/donations'),
        api('/payments/gateways'),
      ]);
      setCampaigns(c);
      setDonations(d);
      setGateways(g.gateways || []);
      setErr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load fundraising data');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    setSaving(true);
    setErr('');
    try {
      await api('/fundraising', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          targetAmount: Number(form.targetAmount),
          currency: form.currency || 'USD',
        }),
      });
      setOpen(false);
      setForm({});
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const submitDonation = async () => {
    setSaving(true);
    setErr('');
    setInfo('');
    try {
      const result = await api('/donations', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: donate.campaignId,
          amount: Number(donate.amount),
          currency: donate.currency || 'USD',
          gateway: donate.gateway || 'zaad',
          donorName: donate.donorName,
          donorEmail: donate.donorEmail,
          donorPhone: donate.donorPhone,
          donorCountry: donate.donorCountry,
          returnUrl: window.location.href,
        }),
      });
      setInfo(
        [
          `Donation ${result.receiptNo} created via ${result.gateway} (${result.status}).`,
          result.instructions,
          result.checkoutUrl ? `Checkout: ${result.checkoutUrl}` : '',
        ]
          .filter(Boolean)
          .join(' '),
      );
      if (result.checkoutUrl) window.open(result.checkoutUrl, '_blank', 'noopener,noreferrer');
      setDonateOpen(false);
      setDonate({ gateway: donate.gateway || 'zaad', currency: 'USD' });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Donation failed');
    } finally {
      setSaving(false);
    }
  };

  const activeCampaigns = campaigns.filter((c) => c.status === 'ACTIVE');

  return (
    <>
      <section className="heroBand">
        <div className="eyebrow">Fundraising</div>
        <h2>Power campaigns with Somali mobile money and Stripe</h2>
        <p>ZAAD, eDahab, Premier, MyCash, Sifalo, and Stripe — collect in demo mode now, go live with API keys later.</p>
      </section>

      <div className="pageTitle">
        <div>
          <h2>Campaigns & donations</h2>
          <p>Approve campaigns, take donations, and watch raised amounts move in real time.</p>
        </div>
        <div className="btnRow">
          <button type="button" className="secondaryBtn" onClick={() => setDonateOpen(!donateOpen)}>
            {donateOpen ? 'Cancel donation' : 'Record donation'}
          </button>
          <button type="button" onClick={() => setOpen(!open)}>
            {open ? 'Cancel' : 'New campaign'}
          </button>
        </div>
      </div>

      <Card title="Payment gateways">
        <div className="gatewayGrid">
          {gateways.map((g) => (
            <div key={g.id} className={`gatewayChip ${g.configured ? 'ready' : 'demo'}`}>
              <strong>{g.label}</strong>
              <span>{g.configured ? 'Configured' : g.id === 'mock' ? 'Always available' : 'Demo mode — add API keys'}</span>
            </div>
          ))}
        </div>
      </Card>

      {activeCampaigns.length > 0 && (
        <Card title="Campaign momentum">
          <div className="campaignRail">
            {activeCampaigns.map((c) => {
              const raised = Number(c.raisedAmount);
              const target = Number(c.targetAmount) || 1;
              const pct = Math.min(100, Math.round((raised / target) * 100));
              return (
                <div className="campaignRow" key={c.id}>
                  <div className="campaignRowHead">
                    <strong>{c.title}</strong>
                    <span>
                      {pct}% · {c.currency} {raised.toLocaleString()} / {target.toLocaleString()}
                    </span>
                  </div>
                  <ProgressBar value={pct} />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {donateOpen && (
        <Card title="Collect donation">
          <div className="formGrid">
            <label>
              <span>Campaign</span>
              <select value={donate.campaignId || ''} onChange={(e) => setDonate({ ...donate, campaignId: e.target.value })}>
                <option value="">Select active campaign…</option>
                {activeCampaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Gateway</span>
              <select value={donate.gateway || 'zaad'} onChange={(e) => setDonate({ ...donate, gateway: e.target.value })}>
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
              <input type="number" value={donate.amount || ''} onChange={(e) => setDonate({ ...donate, amount: e.target.value })} />
            </label>
            <label>
              <span>Currency</span>
              <input value={donate.currency || 'USD'} onChange={(e) => setDonate({ ...donate, currency: e.target.value })} />
            </label>
            <label>
              <span>Donor name</span>
              <input value={donate.donorName || ''} onChange={(e) => setDonate({ ...donate, donorName: e.target.value })} />
            </label>
            <label>
              <span>Donor phone (required for mobile money)</span>
              <input value={donate.donorPhone || ''} onChange={(e) => setDonate({ ...donate, donorPhone: e.target.value })} />
            </label>
            <label>
              <span>Donor email</span>
              <input value={donate.donorEmail || ''} onChange={(e) => setDonate({ ...donate, donorEmail: e.target.value })} />
            </label>
            <label>
              <span>Donor country</span>
              <input value={donate.donorCountry || ''} onChange={(e) => setDonate({ ...donate, donorCountry: e.target.value })} />
            </label>
          </div>
          <button className="primary" type="button" disabled={saving} onClick={submitDonation}>
            {saving ? 'Processing…' : 'Charge via gateway'}
          </button>
        </Card>
      )}

      {open && (
        <Card title="Create fundraising campaign">
          <div className="formGrid">
            <label>
              <span>Title</span>
              <input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label>
              <span>Target amount</span>
              <input type="number" value={form.targetAmount || ''} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} />
            </label>
            <label>
              <span>Currency</span>
              <input value={form.currency || 'USD'} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </label>
            <label>
              <span>Description</span>
              <input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
          </div>
          <button className="primary" type="button" disabled={saving} onClick={submit}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </Card>
      )}

      {err && <div className="error">{err}</div>}
      {info && <div className="notice">{info}</div>}

      <Card title={`${campaigns.length} campaigns`}>
        {campaigns.length ? (
          <Table
            headers={['Campaign', 'Target', 'Raised', 'Status', 'Actions']}
            rows={campaigns.map((x) => [
              x.title,
              `${x.currency} ${Number(x.targetAmount).toLocaleString()}`,
              `${x.currency} ${Number(x.raisedAmount).toLocaleString()}`,
              x.status,
              x.status === 'PENDING_APPROVAL' ? (
                <span className="actionPair" key={x.id}>
                  <button
                    className="linkish"
                    type="button"
                    onClick={async () => {
                      await api(`/campaigns/${x.id}/approve`, { method: 'POST' });
                      load();
                    }}
                  >
                    Approve
                  </button>
                  <button
                    className="linkish dangerLink"
                    type="button"
                    onClick={async () => {
                      await api(`/campaigns/${x.id}/reject`, { method: 'POST' });
                      load();
                    }}
                  >
                    Reject
                  </button>
                </span>
              ) : (
                '—'
              ),
            ])}
          />
        ) : (
          <Empty text="No campaigns yet" />
        )}
      </Card>

      <Card title={`${donations.length} donations`}>
        {donations.length ? (
          <Table
            headers={['Receipt', 'Campaign', 'Gateway', 'Donor', 'Amount', 'Status', 'Date']}
            rows={donations.map((x) => [
              x.receiptNo,
              x.campaign?.title || '—',
              x.gateway || '—',
              x.donorName || x.donorCountry || 'Anonymous',
              `${x.currency} ${Number(x.amount).toLocaleString()}`,
              x.status,
              new Date(x.createdAt).toLocaleString(),
            ])}
          />
        ) : (
          <Empty text="No donations recorded yet" />
        )}
      </Card>
    </>
  );
}

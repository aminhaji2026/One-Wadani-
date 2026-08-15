import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, Empty, Table } from '../components/Common';

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
  donorName?: string | null;
  donorCountry?: string | null;
  createdAt: string;
  campaign?: { title?: string } | null;
};

export default function FundraisingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [c, d] = await Promise.all([api('/fundraising'), api('/donations')]);
      setCampaigns(c);
      setDonations(d);
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

  return (
    <>
      <div className="pageTitle">
        <div>
          <h2>Fundraising & Donations</h2>
          <p>Campaign creation, approvals, payments and reconciliation.</p>
        </div>
        <button type="button" onClick={() => setOpen(!open)}>
          {open ? 'Cancel' : '+ New campaign'}
        </button>
      </div>

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
            headers={['Receipt', 'Campaign', 'Donor', 'Amount', 'Status', 'Date']}
            rows={donations.map((x) => [
              x.receiptNo,
              x.campaign?.title || '—',
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

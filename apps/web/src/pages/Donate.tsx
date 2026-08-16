import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Thermometer from '../components/Thermometer';
import { CampaignSummary, money, publicApi } from '../lib/publicApi';

const amounts = [10, 25, 50, 100];

type DonateResult = {
  donationId: string;
  receiptNo: string;
  status: string;
  subscriptionId?: string;
  retryable?: boolean;
  message?: string;
  recurring?: boolean;
};

export default function Donate() {
  const [params] = useSearchParams();
  const campaignKey = params.get('campaign') || '';
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [campaignId, setCampaignId] = useState('');
  const [amount, setAmount] = useState(25);
  const [recurring, setRecurring] = useState(false);
  const [interval, setInterval] = useState<'MONTHLY' | 'WEEKLY'>('MONTHLY');
  const [gateway, setGateway] = useState('mock');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DonateResult | null>(null);

  useEffect(() => {
    publicApi<CampaignSummary[]>('/campaigns')
      .then((rows) => {
        setCampaigns(rows);
        const match = rows.find((c) => c.slug === campaignKey || c.id === campaignKey) || rows[0];
        if (match) setCampaignId(match.id);
      })
      .catch((e) => setError(e.message || 'Failed to load campaigns'));
  }, [campaignKey]);

  const selected = useMemo(() => campaigns.find((c) => c.id === campaignId), [campaigns, campaignId]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!campaignId) return;
    setBusy(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    try {
      const data = await publicApi<DonateResult>('/donations', {
        method: 'POST',
        body: JSON.stringify({
          campaignId,
          amount,
          currency: selected?.currency || 'USD',
          gateway,
          donorName: String(fd.get('name') || ''),
          donorEmail: String(fd.get('email') || ''),
          donorPhone: String(fd.get('phone') || '') || undefined,
          donorCountry: String(fd.get('country') || 'Somaliland'),
          recurring,
          interval,
          // Demo: amount 13 with ZAAD simulates a failed charge for retry UX
          forceFail: gateway === 'zaad' && amount === 13,
        }),
      });
      setResult(data);
      if (data.status === 'CONFIRMED') {
        const refreshed = await publicApi<CampaignSummary[]>('/campaigns');
        setCampaigns(refreshed);
      }
    } catch (err: any) {
      setError(err.message || 'Donation failed');
    } finally {
      setBusy(false);
    }
  };

  const retry = async () => {
    if (!result?.donationId) return;
    setBusy(true);
    setError('');
    try {
      const data = await publicApi<DonateResult>(`/donations/${result.donationId}/retry`, { method: 'POST', body: '{}' });
      setResult({ ...result, ...data, retryable: data.status !== 'CONFIRMED' });
      if (data.status === 'CONFIRMED') {
        const refreshed = await publicApi<CampaignSummary[]>('/campaigns');
        setCampaigns(refreshed);
      }
    } catch (err: any) {
      setError(err.message || 'Retry failed');
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    const ok = result.status === 'CONFIRMED';
    return (
      <section className="pageHero">
        <div className="pageHeroInner">
          <div className="formSuccess">
            <h2>{ok ? 'Thank you' : 'Payment needs attention'}</h2>
            <p>
              {ok
                ? `Your ${money(amount)} gift was confirmed${result.recurring ? ' and a recurring schedule was set' : ''}. Receipt ${result.receiptNo}.`
                : result.message || 'The payment did not complete. You can retry safely without creating a duplicate pledge.'}
            </p>
            {!ok && result.retryable && (
              <button className="btn btnPrimary" type="button" disabled={busy} onClick={retry}>
                {busy ? 'Retrying…' : 'Retry payment'}
              </button>
            )}
            {ok && (
              <div className="nextSteps">
                <p>Next steps</p>
                <Link to="/join" className="btn btnPrimary">
                  Join as a member
                </Link>
                <Link to="/action#shifts" className="btn btnGhost">
                  Pick a volunteer shift
                </Link>
                <Link to="/events" className="btn btnGhost">
                  Find events
                </Link>
              </div>
            )}
            <p className="muted">
              <Link to="/campaigns">Back to campaigns</Link>
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pageHero suitePage">
      <div className="pageHeroInner donateLayout">
        <div>
          <p className="kicker">Campaign fund</p>
          <h1>Help build a country that works for you</h1>
          <p className="pageLead">
            Give once or set a monthly gift. Mock payments confirm instantly for demos; choose ZAAD with $13 to practice the retry flow.
          </p>
          {selected && (
            <Thermometer
              raised={selected.raisedAmount}
              target={selected.targetAmount}
              currency={selected.currency}
              donors={selected.donorCount}
              label={selected.title}
            />
          )}
        </div>
        <form className="publicForm" onSubmit={onSubmit}>
          {error && <p className="formError full">{error}</p>}
          <label className="full">
            <span>Campaign</span>
            <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} required>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} — {money(c.raisedAmount, c.currency)} / {money(c.targetAmount, c.currency)}
                </option>
              ))}
            </select>
          </label>
          <div className="amountRow full">
            {amounts.map((n) => (
              <button key={n} type="button" className={amount === n ? 'amount is-active' : 'amount'} onClick={() => setAmount(n)}>
                ${n}
              </button>
            ))}
          </div>
          <label>
            <span>Custom amount (USD)</span>
            <input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} required />
          </label>
          <label>
            <span>Gateway</span>
            <select value={gateway} onChange={(e) => setGateway(e.target.value)}>
              <option value="mock">Mock (instant confirm)</option>
              <option value="zaad">ZAAD (demo)</option>
            </select>
          </label>
          <label>
            <span>Full name</span>
            <input name="name" required />
          </label>
          <label>
            <span>Email</span>
            <input type="email" name="email" required />
          </label>
          <label>
            <span>Phone (optional)</span>
            <input name="phone" />
          </label>
          <label>
            <span>Country</span>
            <input name="country" defaultValue="Somaliland" required />
          </label>
          <label className="check full">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
            <span>Make this a recurring gift</span>
          </label>
          {recurring && (
            <label className="full">
              <span>Interval</span>
              <select value={interval} onChange={(e) => setInterval(e.target.value as 'MONTHLY' | 'WEEKLY')}>
                <option value="MONTHLY">Monthly</option>
                <option value="WEEKLY">Weekly</option>
              </select>
            </label>
          )}
          <button className="btn btnPrimary full" type="submit" disabled={busy || !campaignId}>
            {busy ? 'Processing…' : `Donate $${amount}${recurring ? ` / ${interval === 'WEEKLY' ? 'week' : 'month'}` : ''}`}
          </button>
        </form>
      </div>
    </section>
  );
}

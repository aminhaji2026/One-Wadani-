import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Thermometer from '../components/Thermometer';
import { CampaignSummary, VolunteerShift, publicApi, whenLabel } from '../lib/publicApi';

export default function TakeAction() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [shifts, setShifts] = useState<VolunteerShift[]>([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    Promise.all([publicApi<CampaignSummary[]>('/campaigns'), publicApi<VolunteerShift[]>('/shifts')])
      .then(([c, s]) => {
        setCampaigns(c.slice(0, 3));
        setShifts(s);
      })
      .catch((e) => setError(e.message || 'Failed to load'));
  };

  useEffect(load, []);

  const signup = async (shiftId: string, e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMsg('');
    const fd = new FormData(e.currentTarget);
    try {
      const res = await publicApi<{ reminder: string }>(`/shifts/${shiftId}/signup`, {
        method: 'POST',
        body: JSON.stringify({
          name: String(fd.get('name') || ''),
          email: String(fd.get('email') || '') || undefined,
          phone: String(fd.get('phone') || '') || undefined,
          reminderConsent: Boolean(fd.get('reminderConsent')),
        }),
      });
      setMsg(res.reminder || 'Signed up.');
      load();
      e.currentTarget.reset();
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="pageHero suitePage">
      <div className="pageHeroInner">
        <p className="kicker">Take action</p>
        <h1>One hub for organising</h1>
        <p className="pageLead">Join, donate, claim a shift, or RSVP — pick the next concrete step that fits your week.</p>

        <div className="actionHub">
          <Link className="actionHubTile" to="/join">
            <strong>Join</strong>
            <span>Become a member or volunteer</span>
          </Link>
          <Link className="actionHubTile" to="/donate">
            <strong>Donate</strong>
            <span>Fuel a live campaign</span>
          </Link>
          <Link className="actionHubTile" to="/events">
            <strong>Events</strong>
            <span>RSVP and show up</span>
          </Link>
          <Link className="actionHubTile" to="/impact">
            <strong>Impact</strong>
            <span>See funds and organising totals</span>
          </Link>
        </div>

        <div className="suiteSection">
          <h2>Live campaign thermometers</h2>
          <div className="campaignGrid compact">
            {campaigns.map((c) => (
              <article key={c.id} className="campaignTile">
                <div className="campaignTileBody">
                  <h3>
                    <Link to={`/campaigns/${c.slug}`}>{c.title}</Link>
                  </h3>
                  <Thermometer raised={c.raisedAmount} target={c.targetAmount} currency={c.currency} donors={c.donorCount} compact />
                  <Link className="btn btnPrimary" to={`/donate?campaign=${c.slug}`}>
                    Donate
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="suiteSection" id="shifts">
          <h2>Open volunteer shifts</h2>
          {msg && <p className="formSuccessInline">{msg}</p>}
          {error && <p className="formError">{error}</p>}
          <div className="shiftList">
            {shifts.map((s) => (
              <article key={s.id} className="shiftCard">
                <div>
                  <h3>
                    {s.title}
                    {s.role ? ` · ${s.role}` : ''}
                  </h3>
                  <p>
                    {s.event.title}
                    {s.event.venue ? ` · ${s.event.venue}` : ''}
                  </p>
                  <p className="muted">
                    {whenLabel(s.startsAt)} · {s.seatsLeft} seats left
                    {s.event.office ? ` · ${s.event.office.name}` : ''}
                  </p>
                </div>
                <form className="publicForm shiftForm" onSubmit={(e) => signup(s.id, e)}>
                  <label>
                    <span>Name</span>
                    <input name="name" required />
                  </label>
                  <label>
                    <span>Email</span>
                    <input type="email" name="email" />
                  </label>
                  <label className="check full">
                    <input type="checkbox" name="reminderConsent" />
                    <span>Consent to shift reminders</span>
                  </label>
                  <button className="btn btnPrimary full" type="submit" disabled={busy || s.seatsLeft < 1}>
                    Sign up
                  </button>
                </form>
              </article>
            ))}
            {!shifts.length && !error && <p className="muted">No open shifts right now — check events or join the volunteer list.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PublicEvent, publicApi, whenLabel } from '../lib/publicApi';

export default function EventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [error, setError] = useState('');
  const [rsvpDone, setRsvpDone] = useState(false);
  const [shiftMsg, setShiftMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!id) return;
    publicApi<PublicEvent>(`/events/${id}`)
      .then(setEvent)
      .catch((e) => setError(e.message || 'Event not found'));
  };

  useEffect(load, [id]);

  const onRsvp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) return;
    setBusy(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    try {
      await publicApi(`/events/${id}/rsvp`, {
        method: 'POST',
        body: JSON.stringify({
          name: String(fd.get('name') || ''),
          email: String(fd.get('email') || '') || undefined,
          phone: String(fd.get('phone') || '') || undefined,
        }),
      });
      setRsvpDone(true);
      load();
    } catch (err: any) {
      setError(err.message || 'RSVP failed');
    } finally {
      setBusy(false);
    }
  };

  const signupShift = async (shiftId: string, e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setShiftMsg('');
    const fd = new FormData(e.currentTarget);
    try {
      const res = await publicApi<{ reminder: string }>(`/shifts/${shiftId}/signup`, {
        method: 'POST',
        body: JSON.stringify({
          name: String(fd.get('name') || ''),
          email: String(fd.get('email') || '') || undefined,
          phone: String(fd.get('phone') || '') || undefined,
          country: String(fd.get('country') || '') || undefined,
          reminderConsent: Boolean(fd.get('reminderConsent')),
        }),
      });
      setShiftMsg(res.reminder || 'Shift signup recorded.');
      load();
    } catch (err: any) {
      setError(err.message || 'Shift signup failed');
    } finally {
      setBusy(false);
    }
  };

  if (error && !event) {
    return (
      <section className="pageHero">
        <div className="pageHeroInner">
          <h1>Event unavailable</h1>
          <p className="pageLead">{error}</p>
          <Link to="/events" className="btn btnPrimary">
            All events
          </Link>
        </div>
      </section>
    );
  }

  if (!event) {
    return (
      <section className="pageHero">
        <div className="pageHeroInner">
          <p className="muted">Loading event…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="pageHero suitePage">
      <div className="pageHeroInner">
        <p className="kicker">{event.completed ? 'Follow-up' : 'Event'}</p>
        <h1>{event.title}</h1>
        <p className="pageLead">{event.description}</p>
        <p className="muted">
          {whenLabel(event.startsAt)}
          {event.venue ? ` · ${event.venue}` : ''}
          {event.office ? ` · ${event.office.name}` : ''}
          {` · ${event.attendees} RSVPs`}
        </p>

        {event.completed && (
          <div className="followUpBand">
            <h2>Thanks for coming — keep the momentum</h2>
            <p>If you attended, take the next step: join as a member, give to a live campaign, or claim another shift.</p>
            <div className="heroCtas">
              <Link to="/join" className="btn btnPrimary">
                Join Waddani
              </Link>
              <Link to="/donate" className="btn btnGhost">
                Donate
              </Link>
              <Link to="/action#shifts" className="btn btnGhost">
                More shifts
              </Link>
            </div>
          </div>
        )}

        {!event.completed && !rsvpDone && (
          <form className="publicForm" onSubmit={onRsvp}>
            <h2 className="full formSectionTitle">RSVP</h2>
            {error && <p className="formError full">{error}</p>}
            <label>
              <span>Full name</span>
              <input name="name" required />
            </label>
            <label>
              <span>Email</span>
              <input type="email" name="email" />
            </label>
            <label className="full">
              <span>Phone</span>
              <input name="phone" />
            </label>
            <button className="btn btnPrimary full" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Confirm RSVP'}
            </button>
          </form>
        )}

        {rsvpDone && (
          <div className="formSuccess">
            <h2>You are on the list</h2>
            <p>See you there. Want to help on the day?</p>
            <a href="#shifts" className="btn btnPrimary">
              Claim a shift below
            </a>
          </div>
        )}

        <div id="shifts" className="shiftBlock">
          <h2>Volunteer shifts</h2>
          {shiftMsg && <p className="formSuccessInline">{shiftMsg}</p>}
          {!event.shifts?.length && <p className="muted">No open shifts for this event yet.</p>}
          {event.shifts?.map((s) => (
            <article key={s.id} className="shiftCard">
              <div>
                <h3>
                  {s.title}
                  {s.role ? ` · ${s.role}` : ''}
                </h3>
                <p className="muted">
                  {whenLabel(s.startsAt)} · {s.seatsLeft} seats left of {s.capacity}
                </p>
                {s.description && <p>{s.description}</p>}
              </div>
              {s.seatsLeft > 0 && s.status !== 'FULL' ? (
                <form className="publicForm shiftForm" onSubmit={(e) => signupShift(s.id, e)}>
                  <label>
                    <span>Name</span>
                    <input name="name" required />
                  </label>
                  <label>
                    <span>Email</span>
                    <input type="email" name="email" />
                  </label>
                  <label>
                    <span>Phone</span>
                    <input name="phone" />
                  </label>
                  <label>
                    <span>Country</span>
                    <input name="country" defaultValue="Somaliland" />
                  </label>
                  <label className="check full">
                    <input type="checkbox" name="reminderConsent" />
                    <span>Send me consent-based WhatsApp/SMS reminders for this shift.</span>
                  </label>
                  <button className="btn btnPrimary full" type="submit" disabled={busy}>
                    Sign up
                  </button>
                </form>
              ) : (
                <p className="muted">This shift is full.</p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

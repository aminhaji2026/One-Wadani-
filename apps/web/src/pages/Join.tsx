import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicApi } from '../lib/publicApi';

export default function Join() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const interest = String(fd.get('interest') || 'member') as 'member' | 'volunteer' | 'both';
    const consents: string[] = ['NEWS', 'EVENTS'];
    if (fd.get('consentFundraising')) consents.push('FUNDRAISING');
    if (interest === 'volunteer' || interest === 'both') consents.push('VOLUNTEERING');
    try {
      await publicApi('/join', {
        method: 'POST',
        body: JSON.stringify({
          firstName: String(fd.get('firstName') || ''),
          lastName: String(fd.get('lastName') || ''),
          email: String(fd.get('email') || ''),
          phone: String(fd.get('phone') || '') || undefined,
          country: String(fd.get('country') || 'Somaliland'),
          city: String(fd.get('city') || '') || undefined,
          interest,
          consents,
        }),
      });
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Could not submit');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="pageHero">
      <div className="pageHeroInner">
        <p className="kicker">Membership</p>
        <h1>Join Waddani</h1>
        <p className="pageLead">
          Register to become a member or volunteer. We only contact you for the channels you consent to — no clan profiling, no covert scoring.
        </p>
        {done ? (
          <div className="formSuccess">
            <h2>Thank you</h2>
            <p>Your details were recorded. Here is how to keep going:</p>
            <div className="nextSteps">
              <Link to="/action#shifts" className="btn btnPrimary">
                Claim a volunteer shift
              </Link>
              <Link to="/donate" className="btn btnGhost">
                Support a campaign fund
              </Link>
              <Link to="/events" className="btn btnGhost">
                RSVP to an event
              </Link>
              <Link to="/impact" className="btn btnGhost">
                See our impact
              </Link>
            </div>
          </div>
        ) : (
          <form className="publicForm" onSubmit={onSubmit}>
            {error && <p className="formError full">{error}</p>}
            <label>
              <span>First name</span>
              <input name="firstName" required />
            </label>
            <label>
              <span>Last name</span>
              <input name="lastName" required />
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
            <label>
              <span>City (optional)</span>
              <input name="city" />
            </label>
            <label className="full">
              <span>I want to</span>
              <select name="interest" defaultValue="member">
                <option value="member">Become a member</option>
                <option value="volunteer">Volunteer</option>
                <option value="both">Both</option>
              </select>
            </label>
            <label className="check full">
              <input type="checkbox" name="consentContact" required />
              <span>I consent to be contacted about membership and events.</span>
            </label>
            <label className="check full">
              <input type="checkbox" name="consentFundraising" />
              <span>Also send fundraising updates (optional).</span>
            </label>
            <button className="btn btnPrimary full" type="submit" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

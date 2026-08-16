import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';

export default function Join() {
  const [sent, setSent] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <section className="pageHero">
      <div className="pageHeroInner">
        <p className="kicker">Membership</p>
        <h1>Join Waddani</h1>
        <p className="pageLead">
          Change takes all of us. Register your interest to become a member or volunteer — we will follow up through your local office.
        </p>
        {sent ? (
          <div className="formSuccess">
            <h2>Thank you</h2>
            <p>Your details were recorded for this demo. Staff can manage real memberships in the console.</p>
            <Link to="/" className="btn btnPrimary">
              Back home
            </Link>
          </div>
        ) : (
          <form className="publicForm" onSubmit={onSubmit}>
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
              <span>Country</span>
              <input name="country" defaultValue="Somaliland" required />
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
              <input type="checkbox" required />
              <span>I consent to be contacted about membership and events.</span>
            </label>
            <button className="btn btnPrimary full" type="submit">
              Submit
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

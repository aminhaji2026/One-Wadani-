import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';

const amounts = [10, 25, 50, 100];

export default function Donate() {
  const [amount, setAmount] = useState(25);
  const [sent, setSent] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <section className="pageHero">
      <div className="pageHeroInner">
        <p className="kicker">Campaign fund</p>
        <h1>Help build a country that works for you</h1>
        <p className="pageLead">
          Donate to Waddani’s campaign fund. This demo records intent only — live payments use approved gateways in the operations platform.
        </p>
        {sent ? (
          <div className="formSuccess">
            <h2>Thank you</h2>
            <p>Your ${amount} pledge was recorded for this demo.</p>
            <Link to="/" className="btn btnPrimary">
              Back home
            </Link>
          </div>
        ) : (
          <form className="publicForm" onSubmit={onSubmit}>
            <div className="amountRow full">
              {amounts.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={amount === n ? 'amount is-active' : 'amount'}
                  onClick={() => setAmount(n)}
                >
                  ${n}
                </button>
              ))}
            </div>
            <label>
              <span>Custom amount (USD)</span>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                required
              />
            </label>
            <label>
              <span>Full name</span>
              <input name="name" required />
            </label>
            <label className="full">
              <span>Email</span>
              <input type="email" name="email" required />
            </label>
            <button className="btn btnPrimary full" type="submit">
              Donate ${amount}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

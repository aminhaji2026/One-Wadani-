import { useState } from 'react';
import { Link } from 'react-router-dom';
import { login } from '../lib/api';

export default function Login() {
  const [email, setEmail] = useState('admin@waddani.local');
  const [password, setPassword] = useState('ChangeMe123!');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className="login">
      <div className="loginVisual" aria-hidden="true">
        <img src="/hero.png" alt="" />
        <div className="loginShade" />
        <div className="loginBrandBlock">
          <p>We are</p>
          <strong>WADDANI</strong>
          <span>Staff operations console</span>
        </div>
      </div>
      <div className="loginPanel">
        <Link to="/" className="loginBack">
          ← Public site
        </Link>
        <div className="loginCard">
          <img src="/waddani-mark.svg" alt="" width={48} height={48} />
          <h1>Sign in</h1>
          <p>Authorised staff, officials, and organisers only.</p>
          <label>
            <span>Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
          </label>
          <button
            className="btn btnPrimary"
            disabled={busy}
            onClick={async () => {
              try {
                setBusy(true);
                await login(email, password);
                location.href = '/console';
              } catch (e: any) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          {error && <div className="error">{error}</div>}
          <small>Demo credentials are pre-filled. Change them before production.</small>
        </div>
      </div>
    </div>
  );
}

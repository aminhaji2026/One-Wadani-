import { useState, type FormEvent } from 'react';
import { login } from '../lib/api';

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login">
      <div className="loginAtmosphere" aria-hidden="true" />
      <form className="loginCard" onSubmit={onSubmit}>
        <div className="logoCircle">W</div>
        <h1>Waddani One</h1>
        <p>Authorised staff access to party operations</p>
        <label>
          <span>Email</span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        {error && <div className="error">{error}</div>}
        <small>Use your provisioned staff credentials. Seeded demo accounts must change password after first login.</small>
      </form>
    </div>
  );
}

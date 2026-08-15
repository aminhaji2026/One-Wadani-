import { useState, type FormEvent } from 'react';
import { login, type PortalKind } from '../lib/api';
import BrandLogo from '../components/BrandLogo';

const portals: { id: PortalKind; title: string; subtitle: string; hint: string }[] = [
  {
    id: 'staff',
    title: 'Staff',
    subtitle: 'HQ & office operations',
    hint: 'staff@waddani.local or admin@waddani.local',
  },
  {
    id: 'member',
    title: 'Members',
    subtitle: 'Digital membership portal',
    hint: 'member@waddani.local',
  },
  {
    id: 'supporter',
    title: 'Supporters',
    subtitle: 'Consent & campaign portal',
    hint: 'supporter@waddani.local',
  },
  {
    id: 'volunteer',
    title: 'Volunteers',
    subtitle: 'Tasks & field operations',
    hint: 'volunteer@waddani.local',
  },
];

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [portal, setPortal] = useState<PortalKind>('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const active = portals.find((p) => p.id === portal)!;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password, portal);
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
      <div className="loginStage loginStageWide">
        <BrandLogo />
        <div className="portalGrid">
          {portals.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`portalPanel ${portal === p.id ? 'active' : ''}`}
              onClick={() => {
                setPortal(p.id);
                setError('');
              }}
            >
              <strong>{p.title}</strong>
              <span>{p.subtitle}</span>
            </button>
          ))}
        </div>
        <form className="loginCard" onSubmit={onSubmit}>
          <h1>{active.title} login</h1>
          <p>{active.subtitle}</p>
          <label>
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={active.hint}
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
            {loading ? 'Signing in…' : `Sign in as ${active.title.slice(0, -1)}`}
          </button>
          {error && <div className="error">{error}</div>}
          <small>
            Demo seed password is ChangeMe123!. Select your portal panel above — Staff, Members, Supporters, or
            Volunteers.
          </small>
        </form>
      </div>
    </div>
  );
}

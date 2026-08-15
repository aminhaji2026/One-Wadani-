import { useState, type FormEvent } from 'react';
import { login, type PortalKind } from '../lib/api';
import BrandLogo from '../components/BrandLogo';

const portals: { id: PortalKind; title: string; subtitle: string; hint: string; cta: string }[] = [
  {
    id: 'staff',
    title: 'Staff',
    subtitle: 'HQ & office operations',
    hint: 'staff@waddani.local or admin@waddani.local',
    cta: 'Sign in to console',
  },
  {
    id: 'member',
    title: 'Members',
    subtitle: 'Digital membership portal',
    hint: 'member@waddani.local',
    cta: 'Enter member portal',
  },
  {
    id: 'supporter',
    title: 'Supporters',
    subtitle: 'Consent & campaign portal',
    hint: 'supporter@waddani.local',
    cta: 'Enter supporter portal',
  },
  {
    id: 'volunteer',
    title: 'Volunteers',
    subtitle: 'Tasks & field operations',
    hint: 'volunteer@waddani.local',
    cta: 'Enter volunteer portal',
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
      <div className="loginMesh" aria-hidden="true" />

      <section className="loginHero" aria-label="Waddani brand">
        <BrandLogo />
        <h1 className="brandWord">
          WADDANI
          <span>ONE PLATFORM</span>
        </h1>
        <p className="lead">Membership, fundraising, and field operations for Xisbiga Waddani — one secure workspace.</p>
        <div className="heroMeta">
          <span>Staff console</span>
          <span>Member portal</span>
          <span>Somali mobile money</span>
        </div>
      </section>

      <section className="loginPanel">
        <div className="loginStage loginStageWide">
          <div className="portalGrid" role="tablist" aria-label="Choose portal">
            {portals.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={portal === p.id}
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
            <h1>{active.title} access</h1>
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
              {loading ? 'Signing in…' : active.cta}
            </button>
            {error && <div className="error">{error}</div>}
            <small>
              First-time demo accounts use ChangeMe123! until you change it. After you set a new password, that new
              password is kept across deploys — use the same portal panel you registered with.
            </small>
          </form>
        </div>
      </section>
    </div>
  );
}

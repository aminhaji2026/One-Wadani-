import { useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { login, type PortalKind } from '../lib/api';
import BrandLogo from '../components/BrandLogo';
import { useI18n } from '../lib/i18n';

const API = import.meta.env.VITE_API_URL || '/api';

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
  const { t, lang, setLang } = useI18n();
  const [params] = useSearchParams();
  const [portal, setPortal] = useState<PortalKind>((params.get('portal') as PortalKind) || 'staff');
  const [email, setEmail] = useState(params.get('email') || '');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpRequired, setTotpRequired] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>(params.get('reset') ? 'reset' : 'login');
  const [resetToken] = useState(params.get('reset') || '');
  const [newPassword, setNewPassword] = useState('');
  const active = portals.find((p) => p.id === portal)!;

  const title = useMemo(() => {
    if (mode === 'forgot') return t('forgot');
    if (mode === 'reset') return 'Choose a new password';
    return `${active.title} ${t('signIn').toLowerCase()}`;
  }, [mode, active.title, t]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (mode === 'forgot') {
        const res = await fetch(`${API}/password-reset/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), portal }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');
        setInfo(data.message);
        return;
      }
      if (mode === 'reset') {
        const res = await fetch(`${API}/password-reset/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken, newPassword: newPassword.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Reset failed');
        setInfo(data.message);
        setMode('login');
        return;
      }
      await login(email.trim(), password, portal, totpCode || undefined);
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed';
      if (message.toLowerCase().includes('authenticator') || message.includes('totpRequired')) {
        setTotpRequired(true);
      }
      setError(message);
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
          <span>{t('staff')} console</span>
          <span>{t('members')} portal</span>
          <span>Somali mobile money</span>
        </div>
      </section>

      <section className="loginPanel">
        <div className="loginStage loginStageWide">
          <div className="langSwitch">
            <span>{t('language')}</span>
            <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
              EN
            </button>
            <button type="button" className={lang === 'so' ? 'active' : ''} onClick={() => setLang('so')}>
              SO
            </button>
          </div>

          {mode === 'login' && (
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
                    setTotpRequired(false);
                  }}
                >
                  <strong>{p.title}</strong>
                  <span>{p.subtitle}</span>
                </button>
              ))}
            </div>
          )}

          <form className="loginCard" onSubmit={onSubmit}>
            <h1>{title}</h1>
            <p>{mode === 'login' ? active.subtitle : 'We will email a secure reset link if the account exists.'}</p>

            {(mode === 'login' || mode === 'forgot') && (
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
            )}

            {mode === 'login' && (
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
            )}

            {mode === 'login' && (totpRequired || portal === 'staff') && (
              <label>
                <span>Authenticator code {totpRequired ? '(required)' : '(if enabled)'}</span>
                <input value={totpCode} onChange={(e) => setTotpCode(e.target.value)} inputMode="numeric" placeholder="123456" />
              </label>
            )}

            {mode === 'reset' && (
              <label>
                <span>New password (min 10)</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={10}
                />
              </label>
            )}

            <button type="submit" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'login' ? active.cta : mode === 'forgot' ? 'Send reset link' : 'Update password'}
            </button>
            {error && <div className="error">{error}</div>}
            {info && <div className="notice">{info}</div>}

            <div className="authLinks">
              {mode === 'login' ? (
                <>
                  <button type="button" className="linkish" onClick={() => setMode('forgot')}>
                    {t('forgot')}
                  </button>
                  <Link to="/register">{t('register')}</Link>
                  <Link to="/check-in">Event check-in</Link>
                </>
              ) : (
                <button type="button" className="linkish" onClick={() => setMode('login')}>
                  Back to {t('signIn').toLowerCase()}
                </button>
              )}
            </div>
            <small>
              First-time demo accounts use ChangeMe123! until you change it. After you set a new password, keep the same
              portal selected.
            </small>
          </form>
        </div>
      </section>
    </div>
  );
}

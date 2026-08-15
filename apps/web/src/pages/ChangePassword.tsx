import { useEffect, useState, type FormEvent } from 'react';
import { changePassword, getStoredUser } from '../lib/api';
import BrandLogo from '../components/BrandLogo';

export default function ChangePassword({ onDone }: { onDone: () => void }) {
  const user = getStoredUser();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Secure your account | Waddani One';
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const current = currentPassword.trim();
    const next = newPassword.trim();
    const confirmNext = confirm.trim();

    if (next !== confirmNext) {
      setError('New passwords do not match');
      return;
    }
    if (next.length < 10) {
      setError('New password must be at least 10 characters');
      return;
    }
    if (current === next) {
      setError('Choose a new password that is different from the current one');
      return;
    }
    setLoading(true);
    try {
      await changePassword(current, next);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to change password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login loginCompact">
      <div className="loginAtmosphere" aria-hidden="true" />
      <div className="loginMesh" aria-hidden="true" />
      <div className="loginPanel">
        <div className="loginStage">
          <BrandLogo />
          <form className="loginCard" onSubmit={onSubmit}>
            <h1>Secure your account</h1>
            <p>
              {user?.email ? (
                <>
                  Signed in as <strong>{user.email}</strong>
                  {user.portal ? ` (${user.portal})` : ''}. Set a lasting password — it will not be reset by normal
                  deploys.
                </>
              ) : (
                'Update the temporary password before entering the platform.'
              )}
            </p>
            <label>
              <span>Current password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrent(e.target.value)}
                required
                minLength={8}
              />
            </label>
            <label>
              <span>New password (min 10 characters)</span>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNew(e.target.value)}
                required
                minLength={10}
              />
            </label>
            <label>
              <span>Confirm new password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={10}
              />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Update & continue'}
            </button>
            {error && <div className="error">{error}</div>}
            <small>
              After saving, use this new password on your next sign-in. Keep the same portal selected (Staff / Members /
              Supporters / Volunteers).
            </small>
          </form>
        </div>
      </div>
    </div>
  );
}

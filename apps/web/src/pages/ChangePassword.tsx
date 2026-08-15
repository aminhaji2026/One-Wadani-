import { useEffect, useState, type FormEvent } from 'react';
import { changePassword } from '../lib/api';
import BrandLogo from '../components/BrandLogo';

export default function ChangePassword({ onDone }: { onDone: () => void }) {
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
    if (newPassword !== confirm) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 10) {
      setError('New password must be at least 10 characters');
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
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
            <p>Update the temporary password before entering the platform.</p>
            <label>
              <span>Current password</span>
              <input type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} required />
            </label>
            <label>
              <span>New password</span>
              <input type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} required minLength={10} />
            </label>
            <label>
              <span>Confirm new password</span>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={10} />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Update & continue'}
            </button>
            {error && <div className="error">{error}</div>}
          </form>
        </div>
      </div>
    </div>
  );
}

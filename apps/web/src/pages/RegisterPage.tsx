import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { useI18n } from '../lib/i18n';

const API = import.meta.env.VITE_API_URL || '/api';

export default function RegisterPage() {
  const { t } = useI18n();
  const [form, setForm] = useState({
    kind: 'MEMBER',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: 'Somaliland',
    city: '',
    password: '',
    skills: '',
    message: '',
  });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const res = await fetch(`${API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          skills: form.skills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setInfo(data.message || 'Submitted for approval.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login loginCompact">
      <div className="loginAtmosphere" aria-hidden="true" />
      <div className="loginMesh" aria-hidden="true" />
      <div className="loginPanel">
        <div className="loginStage loginStageWide">
          <BrandLogo />
          <form className="loginCard" onSubmit={onSubmit}>
            <h1>{t('register')}</h1>
            <p>Apply for Member, Supporter, or Volunteer access. Staff will approve before you can sign in.</p>
            <div className="formGrid">
              <label>
                <span>Portal</span>
                <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                  <option value="MEMBER">{t('members')}</option>
                  <option value="SUPPORTER">{t('supporters')}</option>
                  <option value="VOLUNTEER">{t('volunteers')}</option>
                </select>
              </label>
              <label>
                <span>Country</span>
                <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required />
              </label>
              <label>
                <span>First name</span>
                <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              </label>
              <label>
                <span>Last name</span>
                <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              </label>
              <label>
                <span>Email</span>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </label>
              <label>
                <span>Phone</span>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
              <label>
                <span>City</span>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </label>
              <label>
                <span>Password (min 10)</span>
                <input
                  type="password"
                  minLength={10}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </label>
              {form.kind === 'VOLUNTEER' && (
                <label>
                  <span>Skills</span>
                  <input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Outreach, Events" />
                </label>
              )}
              <label>
                <span>Message to office</span>
                <input value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              </label>
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Submitting…' : 'Submit application'}
            </button>
            {error && <div className="error">{error}</div>}
            {info && <div className="notice">{info}</div>}
            <small>
              Already approved? <Link to="/">{t('signIn')}</Link>
            </small>
          </form>
        </div>
      </div>
    </div>
  );
}

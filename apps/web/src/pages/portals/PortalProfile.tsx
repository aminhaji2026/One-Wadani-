import { useEffect, useState } from 'react';
import { api, changePassword, getStoredUser, type PortalKind } from '../../lib/api';
import { Card } from '../../components/Common';

type Profile = Record<string, unknown> & {
  firstName?: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string;
  membershipNo?: string;
  membershipType?: string;
  status?: string;
  preferredLanguage?: string;
  language?: string;
  skills?: string[];
  office?: { name?: string } | null;
};

export default function PortalProfile({ portal }: { portal: Exclude<PortalKind, 'staff'> }) {
  const user = getStoredUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ phone: '', city: '', preferredLanguage: 'so', skills: '' });
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    api('/portal/profile')
      .then((d) => {
        const p = d.profile as Profile;
        setProfile(p);
        setForm({
          phone: p.phone || '',
          city: p.city || '',
          preferredLanguage: p.preferredLanguage || p.language || 'so',
          skills: (p.skills || []).join(', '),
        });
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    setInfo('');
    try {
      const body: Record<string, unknown> = {
        phone: form.phone || undefined,
        city: form.city || undefined,
      };
      if (portal === 'member') body.preferredLanguage = form.preferredLanguage;
      if (portal === 'supporter') body.language = form.preferredLanguage;
      if (portal === 'volunteer') {
        body.skills = form.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      const result = await api('/portal/profile', { method: 'PATCH', body: JSON.stringify(body) });
      setProfile(result.profile);
      setInfo('Profile updated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    setPwSaving(true);
    setError('');
    setInfo('');
    try {
      if (pw.next.trim() !== pw.confirm.trim()) throw new Error('New passwords do not match');
      if (pw.next.trim().length < 10) throw new Error('New password must be at least 10 characters');
      await changePassword(pw.current, pw.next);
      setPw({ current: '', next: '', confirm: '' });
      setInfo('Password updated. Use the new password next time you sign in.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Password update failed');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <>
      <section className="heroBand">
        <div className="eyebrow">{portal} profile</div>
        <h2>{portal === 'member' ? 'Your digital membership card' : 'Your portal profile'}</h2>
        <p>Keep contact details current and change your password any time from this page.</p>
      </section>
      {error && <div className="error">{error}</div>}
      {info && <div className="notice">{info}</div>}

      <div className="grid2">
        <Card title={portal === 'member' ? 'Membership card' : 'Identity'}>
          {!profile ? (
            <div className="loading">Loading profile…</div>
          ) : (
            <div className="memberCard">
              <div className="memberCardTop">
                <strong>
                  {profile.firstName} {profile.lastName || ''}
                </strong>
                <span>{user?.portal}</span>
              </div>
              {profile.membershipNo && <div className="memberNo">{profile.membershipNo}</div>}
              <div className="metricList">
                <p>
                  <span>Status</span>
                  <b>{profile.status || '—'}</b>
                </p>
                <p>
                  <span>Email</span>
                  <b>{profile.email || '—'}</b>
                </p>
                <p>
                  <span>Office</span>
                  <b>{profile.office?.name || '—'}</b>
                </p>
                {profile.country && (
                  <p>
                    <span>Country</span>
                    <b>{profile.country}</b>
                  </p>
                )}
                {portal === 'member' && (
                  <p>
                    <span>Type</span>
                    <b>{profile.membershipType || 'Standard'}</b>
                  </p>
                )}
                {portal === 'volunteer' && (
                  <p>
                    <span>Skills</span>
                    <b>{(profile.skills || []).join(', ') || '—'}</b>
                  </p>
                )}
              </div>
            </div>
          )}
        </Card>

        <Card title="Editable details">
          <div className="formGrid">
            <label>
              <span>Phone</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            {portal !== 'volunteer' && (
              <label>
                <span>City</span>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </label>
            )}
            {portal !== 'volunteer' && (
              <label>
                <span>Preferred language</span>
                <select
                  value={form.preferredLanguage}
                  onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value })}
                >
                  <option value="so">Somali</option>
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                </select>
              </label>
            )}
            {portal === 'volunteer' && (
              <label>
                <span>Skills (comma separated)</span>
                <input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
              </label>
            )}
          </div>
          <button type="button" className="primary" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </Card>
      </div>

      <Card title="Change password">
        <div className="formGrid">
          <label>
            <span>Current password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
            />
          </label>
          <label>
            <span>New password (min 10)</span>
            <input
              type="password"
              autoComplete="new-password"
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
            />
          </label>
          <label>
            <span>Confirm new password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
            />
          </label>
        </div>
        <button type="button" className="primary" disabled={pwSaving} onClick={savePassword}>
          {pwSaving ? 'Updating…' : 'Update password'}
        </button>
      </Card>
    </>
  );
}

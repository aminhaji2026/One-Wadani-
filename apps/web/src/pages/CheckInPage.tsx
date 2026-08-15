import { useState } from 'react';
import BrandLogo from '../components/BrandLogo';

const API = import.meta.env.VITE_API_URL || '/api';

export default function CheckInPage({ embedded = false }: { embedded?: boolean }) {
  const [qrToken, setQrToken] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    setResult('');
    try {
      const res = await fetch(`${API}/public/events/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken: qrToken.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check-in failed');
      setResult(
        data.already
          ? `Already checked in: ${data.attendee.name} · ${data.event.title}`
          : `Checked in: ${data.attendee.name} · ${data.event.title}`,
      );
      setQrToken('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check-in failed');
    }
  };

  const form = (
    <>
      <label>
        <span>QR / check-in code</span>
        <input
          value={qrToken}
          onChange={(e) => setQrToken(e.target.value)}
          placeholder="Paste or type token"
          inputMode="text"
          autoComplete="off"
        />
      </label>
      <button type="button" className="primary" onClick={submit} style={{ width: '100%', marginTop: 12 }}>
        Check in attendee
      </button>
      {error && <div className="error">{error}</div>}
      {result && <div className="notice">{result}</div>}
    </>
  );

  if (embedded) {
    return (
      <>
        <section className="heroBand">
          <div className="eyebrow">Field ops</div>
          <h2>Mobile event check-in</h2>
          <p>Paste the member RSVP code or scan from the membership QR printout.</p>
        </section>
        <div className="cardPanel">{form}</div>
      </>
    );
  }

  return (
    <div className="login loginCompact">
      <div className="loginAtmosphere" aria-hidden="true" />
      <div className="loginPanel">
        <div className="loginStage">
          <BrandLogo />
          <div className="loginCard">
            <h1>Event check-in</h1>
            <p>Scan or paste an attendee QR token from a member RSVP.</p>
            {form}
          </div>
        </div>
      </div>
    </div>
  );
}

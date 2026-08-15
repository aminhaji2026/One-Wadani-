import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Empty, Table } from '../../components/Common';

type EventRow = {
  id: string;
  title: string;
  description?: string | null;
  venue?: string | null;
  startsAt: string;
  capacity?: number | null;
  attendees: number;
  rsvped?: boolean;
  office?: string | null;
};

export default function PortalEvents({ mode }: { mode: 'member' | 'volunteer' }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    api('/portal/events')
      .then((d) => setEvents(d.events || []))
      .catch((e: Error) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const rsvp = async (id: string) => {
    setBusy(id);
    setError('');
    setInfo('');
    try {
      const result = await api(`/portal/events/${id}/rsvp`, { method: 'POST' });
      setInfo(result.already ? 'You already RSVPed to this event.' : 'RSVP confirmed. Bring your phone for check-in.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'RSVP failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <section className="heroBand">
        <div className="eyebrow">{mode === 'member' ? 'Events' : 'Field events'}</div>
        <h2>{mode === 'member' ? 'Gatherings worth showing up for' : 'Published events in your network'}</h2>
        <p>
          {mode === 'member'
            ? 'RSVP to published events and keep your place on the attendee list.'
            : 'Coordinate around upcoming published events linked to offices and HQ.'}
        </p>
      </section>

      {error && <div className="error">{error}</div>}
      {info && <div className="notice">{info}</div>}

      <Card title={`${events.length} published events`}>
        {events.length ? (
          <Table
            headers={
              mode === 'member'
                ? ['Event', 'When', 'Venue', 'Attendees', 'Action']
                : ['Event', 'When', 'Venue', 'Office', 'Attendees']
            }
            rows={events.map((e) => {
              const base = [
                <div key="t">
                  <strong>{e.title}</strong>
                  {e.description ? <div className="mutedLine">{e.description}</div> : null}
                </div>,
                new Date(e.startsAt).toLocaleString(),
                e.venue || '—',
              ];
              if (mode === 'member') {
                return [
                  ...base,
                  `${e.attendees}${e.capacity ? ` / ${e.capacity}` : ''}`,
                  e.rsvped ? (
                    <span className="statusChip ok" key="s">
                      RSVPed
                    </span>
                  ) : (
                    <button
                      key="b"
                      type="button"
                      className="linkish"
                      disabled={busy === e.id}
                      onClick={() => rsvp(e.id)}
                    >
                      {busy === e.id ? 'Saving…' : 'RSVP'}
                    </button>
                  ),
                ];
              }
              return [...base, e.office || 'HQ / open', e.attendees];
            })}
          />
        ) : (
          <Empty text="No published events yet." />
        )}
      </Card>
    </>
  );
}

import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  castVote,
  getPollsWithVotes,
  getUserVote,
  totalVotes,
  type Poll,
} from '../lib/polls';

export default function NavPolls() {
  const [open, setOpen] = useState(false);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [voted, setVoted] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = () => {
    const next = getPollsWithVotes();
    setPolls(next);
    const live = next.find((p) => p.status === 'live');
    setVoted(live ? getUserVote(live.id) : null);
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const live = polls.find((p) => p.status === 'live');
  const currentCount = polls.filter((p) => p.status === 'current').length;
  const liveTotal = live ? totalVotes(live) : 0;

  return (
    <div className="navPolls" ref={rootRef}>
      <button
        type="button"
        className="navPollsLive"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="navPollsPulse" aria-hidden="true" />
        <span className="navPollsLiveText">
          <strong>Live poll</strong>
          <em>{live?.title || 'Loading…'}</em>
        </span>
      </button>
      <Link to="/polls" className="navPollsCurrent">
        Current polls
        <span>{currentCount}</span>
      </Link>

      {open && live && (
        <div className="navPollsPanel" id={panelId} role="dialog" aria-label="Live poll">
          <div className="navPollsPanelHead">
            <p className="kicker">Live now</p>
            <h3>{live.title}</h3>
            <small>
              {liveTotal.toLocaleString()} votes · {live.closesAt}
            </small>
          </div>
          <ul className="navPollsOptions">
            {live.options.map((opt) => {
              const pct = liveTotal ? Math.round((opt.votes / liveTotal) * 100) : 0;
              const isMine = voted === opt.id;
              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    className={isMine ? 'is-mine' : ''}
                    disabled={!!voted}
                    onClick={() => {
                      const ok = castVote(live.id, opt.id);
                      if (!ok) {
                        setMessage('You already voted in this poll.');
                        return;
                      }
                      setMessage('Thanks — your vote is in.');
                      refresh();
                    }}
                  >
                    <span className="navPollsOptLabel">
                      {opt.label}
                      {isMine ? ' · Your vote' : ''}
                    </span>
                    <span className="navPollsOptMeta">{pct}%</span>
                    <i style={{ width: `${pct}%` }} />
                  </button>
                </li>
              );
            })}
          </ul>
          {message && <p className="navPollsMsg">{message}</p>}
          <Link to="/polls" className="navPollsAll" onClick={() => setOpen(false)}>
            See all current polls →
          </Link>
        </div>
      )}
    </div>
  );
}

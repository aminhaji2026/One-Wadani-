import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  castVote,
  getPollsWithVotes,
  getUserVote,
  totalVotes,
  type Poll,
} from '../lib/polls';

export default function Polls() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votes, setVotes] = useState<Record<string, string | null>>({});
  const [flash, setFlash] = useState('');

  const refresh = () => {
    const next = getPollsWithVotes();
    setPolls(next);
    const map: Record<string, string | null> = {};
    next.forEach((p) => {
      map[p.id] = getUserVote(p.id);
    });
    setVotes(map);
  };

  useEffect(() => {
    refresh();
  }, []);

  const live = polls.filter((p) => p.status === 'live');
  const current = polls.filter((p) => p.status === 'current');

  return (
    <section className="pageHero pollsPage">
      <div className="pageHeroInner">
        <p className="kicker">Member voice</p>
        <h1>Live &amp; current polls</h1>
        <p className="pageLead">
          Tell us what matters. Votes are stored on this device for the demo — staff can later connect official polling.
        </p>
        {flash && <p className="navPollsMsg">{flash}</p>}

        <div className="pollsGroups">
          <div>
            <h2 className="pollsGroupTitle">
              <span className="navPollsPulse" aria-hidden="true" />
              Live polls
            </h2>
            {live.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                voted={votes[poll.id]}
                onVote={(optionId) => {
                  if (!castVote(poll.id, optionId)) {
                    setFlash('You already voted in that poll.');
                    return;
                  }
                  setFlash('Thanks — your vote is counted.');
                  refresh();
                }}
              />
            ))}
          </div>
          <div>
            <h2 className="pollsGroupTitle">Current polls</h2>
            {current.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                voted={votes[poll.id]}
                onVote={(optionId) => {
                  if (!castVote(poll.id, optionId)) {
                    setFlash('You already voted in that poll.');
                    return;
                  }
                  setFlash('Thanks — your vote is counted.');
                  refresh();
                }}
              />
            ))}
          </div>
        </div>

        <Link to="/" className="btn btnPrimary" style={{ marginTop: 28 }}>
          Back home
        </Link>
      </div>
    </section>
  );
}

function PollCard({
  poll,
  voted,
  onVote,
}: {
  poll: Poll;
  voted: string | null | undefined;
  onVote: (optionId: string) => void;
}) {
  const total = totalVotes(poll);
  return (
    <article className={`pollCard ${poll.status === 'live' ? 'is-live' : ''}`}>
      <div className="pollCardHead">
        <h3>{poll.title}</h3>
        <small>
          {total.toLocaleString()} votes · {poll.closesAt}
        </small>
      </div>
      <ul className="navPollsOptions">
        {poll.options.map((opt) => {
          const pct = total ? Math.round((opt.votes / total) * 100) : 0;
          const isMine = voted === opt.id;
          return (
            <li key={opt.id}>
              <button
                type="button"
                className={isMine ? 'is-mine' : ''}
                disabled={!!voted}
                onClick={() => onVote(opt.id)}
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
    </article>
  );
}

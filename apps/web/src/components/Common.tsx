import type { ReactNode } from 'react';

export function Card({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card">
      <div className="cardHead">
        <h3>{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="stat">
      <small>{label}</small>
      <strong>{value}</strong>
      {sub && <span>{sub}</span>}
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="progressTrack" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="progressFill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>;
}

export function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number | ReactNode)[][];
}) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

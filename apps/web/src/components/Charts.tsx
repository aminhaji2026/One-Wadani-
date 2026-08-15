import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function CountryBarChart({ data }: { data: { country: string; count: number }[] }) {
  if (!data.length) return <div className="empty">No supporter data yet</div>;
  return (
    <div className="chartBox">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5ece8" />
          <XAxis dataKey="country" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#168a59" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AnalyticsCharts({
  byCountry,
  donations,
  expenses,
}: {
  byCountry: { country: string; count: number }[];
  donations: number;
  expenses: number;
}) {
  return (
    <div className="grid2">
      <section className="card">
        <div className="cardHead">
          <h3>Country distribution</h3>
        </div>
        <CountryBarChart data={byCountry} />
      </section>
      <section className="card">
        <div className="cardHead">
          <h3>Financial snapshot</h3>
        </div>
        <div className="metricList">
          <p>
            <span>Confirmed donations</span>
            <b>${donations.toLocaleString()}</b>
          </p>
          <p>
            <span>Approved expenses</span>
            <b>${expenses.toLocaleString()}</b>
          </p>
          <p>
            <span>Net operational balance (approx.)</span>
            <b>${(donations - expenses).toLocaleString()}</b>
          </p>
        </div>
      </section>
    </div>
  );
}

export function LazyCountryChart({ data }: { data: { country: string; count: number }[] }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <div className="loading">Preparing chart…</div>;
  return <CountryBarChart data={data} />;
}

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function CountryBarChart({ data }: { data: { country: string; count: number }[] }) {
  if (!data.length) return <div className="empty">No supporter data yet</div>;
  return (
    <div className="chartBox">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="4 6" stroke="rgba(20,17,15,0.08)" />
          <XAxis dataKey="country" tick={{ fontSize: 11, fill: '#6a615a' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6a615a' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid rgba(20,17,15,0.08)',
              boxShadow: '0 12px 36px rgba(20,17,15,0.08)',
            }}
          />
          <Bar dataKey="count" fill="#ff6600" radius={[8, 8, 0, 0]} />
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

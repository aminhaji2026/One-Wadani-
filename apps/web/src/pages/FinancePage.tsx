import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, Empty, Table } from '../components/Common';

type Office = { id: string; name: string };
type Expense = {
  id: string;
  category: string;
  description: string;
  amount: string | number;
  currency: string;
  status: string;
  office?: { name?: string } | null;
};
type Budget = {
  id: string;
  name: string;
  year: number;
  amount: string | number;
  currency: string;
  office?: { name?: string } | null;
};

export default function FinancePage() {
  const [tab, setTab] = useState<'expenses' | 'budgets'>('expenses');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [e, b, o] = await Promise.all([api('/expenses'), api('/budgets'), api('/offices')]);
      setExpenses(e);
      setBudgets(b);
      setOffices(o);
      setErr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load finance data');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    setSaving(true);
    setErr('');
    try {
      if (tab === 'expenses') {
        await api('/expenses', {
          method: 'POST',
          body: JSON.stringify({
            category: form.category,
            description: form.description,
            amount: Number(form.amount),
            currency: form.currency || 'USD',
            officeId: form.officeId,
          }),
        });
      } else {
        await api('/budgets', {
          method: 'POST',
          body: JSON.stringify({
            name: form.name,
            year: Number(form.year),
            amount: Number(form.amount),
            currency: form.currency || 'USD',
            officeId: form.officeId,
          }),
        });
      }
      setOpen(false);
      setForm({});
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="pageTitle">
        <div>
          <h2>Finance, Budgets & Reconciliation</h2>
          <p>Track office expenditure, budgets, approvals and ledger reconciliation.</p>
        </div>
        <button type="button" onClick={() => setOpen(!open)}>
          {open ? 'Cancel' : `+ Add ${tab === 'expenses' ? 'expense' : 'budget'}`}
        </button>
      </div>

      <div className="tabs">
        <button type="button" className={tab === 'expenses' ? 'active' : ''} onClick={() => setTab('expenses')}>
          Expenses
        </button>
        <button type="button" className={tab === 'budgets' ? 'active' : ''} onClick={() => setTab('budgets')}>
          Budgets
        </button>
      </div>

      {open && (
        <Card title={tab === 'expenses' ? 'Create expense' : 'Create budget'}>
          <div className="formGrid">
            <label>
              <span>Office</span>
              <select value={form.officeId || ''} onChange={(e) => setForm({ ...form, officeId: e.target.value })}>
                <option value="">Select office…</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            {tab === 'expenses' ? (
              <>
                <label>
                  <span>Category</span>
                  <input value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </label>
                <label>
                  <span>Description</span>
                  <input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </label>
              </>
            ) : (
              <>
                <label>
                  <span>Budget name</span>
                  <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </label>
                <label>
                  <span>Year</span>
                  <input type="number" value={form.year || String(new Date().getFullYear())} onChange={(e) => setForm({ ...form, year: e.target.value })} />
                </label>
              </>
            )}
            <label>
              <span>Amount</span>
              <input type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </label>
            <label>
              <span>Currency</span>
              <input value={form.currency || 'USD'} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </label>
          </div>
          <button className="primary" type="button" disabled={saving} onClick={submit}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </Card>
      )}

      {err && <div className="error">{err}</div>}

      {tab === 'expenses' ? (
        <Card title={`${expenses.length} expenses`}>
          {expenses.length ? (
            <Table
              headers={['Category', 'Description', 'Amount', 'Office', 'Status', 'Actions']}
              rows={expenses.map((x) => [
                x.category,
                x.description,
                `${x.currency} ${Number(x.amount).toLocaleString()}`,
                x.office?.name || '—',
                x.status,
                x.status === 'PENDING' ? (
                  <span className="actionPair" key={x.id}>
                    <button
                      className="linkish"
                      type="button"
                      onClick={async () => {
                        await api(`/expenses/${x.id}/approve`, { method: 'POST' });
                        load();
                      }}
                    >
                      Approve
                    </button>
                    <button
                      className="linkish dangerLink"
                      type="button"
                      onClick={async () => {
                        await api(`/expenses/${x.id}/reject`, { method: 'POST' });
                        load();
                      }}
                    >
                      Reject
                    </button>
                  </span>
                ) : (
                  '—'
                ),
              ])}
            />
          ) : (
            <Empty text="No expenses yet" />
          )}
        </Card>
      ) : (
        <Card title={`${budgets.length} budgets`}>
          {budgets.length ? (
            <Table
              headers={['Name', 'Year', 'Amount', 'Office']}
              rows={budgets.map((x) => [
                x.name,
                x.year,
                `${x.currency} ${Number(x.amount).toLocaleString()}`,
                x.office?.name || '—',
              ])}
            />
          ) : (
            <Empty text="No budgets yet" />
          )}
        </Card>
      )}
    </>
  );
}

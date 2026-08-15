import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Empty, Table } from '../../components/Common';

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueAt?: string | null;
  office?: { name?: string } | null;
};

const statuses = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'] as const;

export default function VolunteerTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    api('/portal/tasks')
      .then((d) => setTasks(d.tasks || []))
      .catch((e: Error) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setBusy(id);
    setError('');
    try {
      await api(`/portal/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <section className="heroBand">
        <div className="eyebrow">Tasks</div>
        <h2>Move office work from board to done</h2>
        <p>Update status as you progress. Tasks are scoped to your assigned office.</p>
      </section>
      {error && <div className="error">{error}</div>}
      <Card title={`${tasks.length} office tasks`}>
        {tasks.length ? (
          <Table
            headers={['Task', 'Priority', 'Due', 'Status']}
            rows={tasks.map((t) => [
              <div key="t">
                <strong>{t.title}</strong>
                {t.description ? <div className="mutedLine">{t.description}</div> : null}
              </div>,
              t.priority,
              t.dueAt ? new Date(t.dueAt).toLocaleDateString() : '—',
              <select
                key="s"
                className="inlineSelect"
                value={t.status}
                disabled={busy === t.id}
                onChange={(e) => updateStatus(t.id, e.target.value)}
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>,
            ])}
          />
        ) : (
          <Empty text="No tasks for your office yet." />
        )}
      </Card>
    </>
  );
}

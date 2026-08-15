import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../lib/api';
import { Card, Empty, Table } from '../components/Common';

type FormField = {
  label: string;
  key: string;
  type?: string;
  options?: string[];
};

type Cfg = {
  title: string;
  subtitle: string;
  endpoint: string;
  headers: string[];
  row: (x: Record<string, unknown>) => (string | number | ReactNode)[];
  form?: FormField[];
  transform?: (form: Record<string, unknown>) => Record<string, unknown>;
  actions?: (x: Record<string, unknown>, reload: () => void) => ReactNode;
};

const CONSENT_OPTIONS = ['NEWS', 'EVENTS', 'FUNDRAISING', 'VOLUNTEERING', 'ELECTION_INFORMATION'] as const;

const officeTypes = [
  'HEADQUARTERS',
  'REGION',
  'DISTRICT',
  'CITY',
  'LOCAL',
  'INTERNATIONAL_COUNTRY',
  'INTERNATIONAL_CITY',
];

const cfgs: Record<string, Cfg> = {
  organisation: {
    title: 'Organisation & Worldwide Offices',
    subtitle: 'Manage Somaliland and international office hierarchy.',
    endpoint: '/offices',
    headers: ['Office', 'Type', 'Country', 'City', 'Status'],
    row: (x) => [String(x.name), String(x.type), String(x.country), String(x.city || '—'), x.active ? 'Active' : 'Inactive'],
    form: [
      { label: 'Office name', key: 'name' },
      { label: 'Type', key: 'type', options: officeTypes },
      { label: 'Country', key: 'country' },
      { label: 'City', key: 'city' },
    ],
  },
  members: {
    title: 'Membership & Digital Membership',
    subtitle: 'Register and manage official party members.',
    endpoint: '/members',
    headers: ['Member No.', 'Name', 'Country', 'Type', 'Status'],
    row: (x) => [
      String(x.membershipNo),
      `${x.firstName} ${x.lastName}`,
      String(x.country),
      String(x.membershipType),
      String(x.status),
    ],
    form: [
      { label: 'First name', key: 'firstName' },
      { label: 'Last name', key: 'lastName' },
      { label: 'Country', key: 'country' },
      { label: 'City', key: 'city' },
      { label: 'Membership type', key: 'membershipType' },
    ],
  },
  supporters: {
    title: 'Global Supporters & Consent',
    subtitle: 'Consent-based supporter registration and communication preferences.',
    endpoint: '/supporters',
    headers: ['Name', 'Country', 'City', 'Consents', 'Status'],
    row: (x) => {
      const consents = (x.consents as { granted: boolean; type: string }[] | undefined) || [];
      return [
        `${x.firstName} ${x.lastName || ''}`.trim(),
        String(x.country),
        String(x.city || '—'),
        consents.filter((c) => c.granted).map((c) => c.type).join(', ') || 'None',
        String(x.status),
      ];
    },
    form: [
      { label: 'First name', key: 'firstName' },
      { label: 'Last name', key: 'lastName' },
      { label: 'Country', key: 'country' },
      { label: 'City', key: 'city' },
      { label: 'Email', key: 'email' },
    ],
    transform: (form) => ({
      ...form,
      consents: (form.consents as string[]) || [],
    }),
  },
  fundraising: {
    title: 'Fundraising & Donations',
    subtitle: 'Campaign creation, approvals, payments and reconciliation.',
    endpoint: '/fundraising',
    headers: ['Campaign', 'Target', 'Raised', 'Status', 'Actions'],
    row: () => [],
    form: [
      { label: 'Title', key: 'title' },
      { label: 'Description', key: 'description' },
      { label: 'Target amount', key: 'targetAmount', type: 'number' },
      { label: 'Currency', key: 'currency' },
    ],
    actions: (x, reload) =>
      x.status === 'PENDING_APPROVAL' ? (
        <button
          className="linkish"
          onClick={async () => {
            await api(`/campaigns/${x.id}/approve`, { method: 'POST' });
            reload();
          }}
        >
          Approve
        </button>
      ) : (
        '—'
      ),
  },
  finance: {
    title: 'Finance, Budgets & Reconciliation',
    subtitle: 'Track office expenditure, approvals and ledger reconciliation.',
    endpoint: '/expenses',
    headers: ['Category', 'Description', 'Amount', 'Office', 'Status', 'Actions'],
    row: () => [],
    form: [
      { label: 'Category', key: 'category' },
      { label: 'Description', key: 'description' },
      { label: 'Amount', key: 'amount', type: 'number' },
      { label: 'Currency', key: 'currency' },
      { label: 'Office ID', key: 'officeId' },
    ],
    actions: (x, reload) =>
      x.status === 'PENDING' ? (
        <button
          className="linkish"
          onClick={async () => {
            await api(`/expenses/${x.id}/approve`, { method: 'POST' });
            reload();
          }}
        >
          Approve
        </button>
      ) : (
        '—'
      ),
  },
  communications: {
    title: 'Communications & Media Centre',
    subtitle: 'Create authorised public communications with approval workflow.',
    endpoint: '/communications',
    headers: ['Title', 'Channel', 'Audience', 'Status', 'Actions'],
    row: () => [],
    form: [
      { label: 'Title', key: 'title' },
      { label: 'Channel', key: 'channel' },
      { label: 'Audience', key: 'audience' },
      { label: 'Message', key: 'message' },
    ],
    actions: (x, reload) =>
      x.status === 'PENDING_APPROVAL' ? (
        <button
          className="linkish"
          onClick={async () => {
            await api(`/communications/${x.id}/approve`, { method: 'POST' });
            reload();
          }}
        >
          Approve
        </button>
      ) : (
        '—'
      ),
  },
};

function buildRows(kind: string, data: Record<string, unknown>[], cfg: Cfg, reload: () => void) {
  if (kind === 'fundraising') {
    return data.map((x) => [
      String(x.title),
      `${x.currency} ${Number(x.targetAmount).toLocaleString()}`,
      `${x.currency} ${Number(x.raisedAmount).toLocaleString()}`,
      String(x.status),
      cfg.actions?.(x, reload) || '—',
    ]);
  }
  if (kind === 'finance') {
    return data.map((x) => [
      String(x.category),
      String(x.description),
      `${x.currency} ${Number(x.amount).toLocaleString()}`,
      String((x.office as { name?: string } | null)?.name || '—'),
      String(x.status),
      cfg.actions?.(x, reload) || '—',
    ]);
  }
  if (kind === 'communications') {
    return data.map((x) => [
      String(x.title),
      String(x.channel),
      String(x.audience),
      String(x.status),
      cfg.actions?.(x, reload) || '—',
    ]);
  }
  return data.map(cfg.row);
}

export function ModulePage({ kind }: { kind: keyof typeof cfgs }) {
  const c = cfgs[kind];
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () =>
    api(c.endpoint)
      .then(setData)
      .catch((e: Error) => setErr(e.message));

  useEffect(() => {
    setErr('');
    load();
  }, [c.endpoint]);

  const submit = async () => {
    setSaving(true);
    setErr('');
    try {
      let payload = c.transform ? c.transform(form) : { ...form };
      if (kind === 'organisation' && !payload.type) payload = { ...payload, type: 'LOCAL' };
      if (kind === 'fundraising' && !payload.currency) payload = { ...payload, currency: 'USD' };
      if (kind === 'finance' && !payload.currency) payload = { ...payload, currency: 'USD' };
      await api(c.endpoint, { method: 'POST', body: JSON.stringify(payload) });
      setOpen(false);
      setForm({});
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const consentValues = useMemo(() => (form.consents as string[]) || [], [form.consents]);

  return (
    <>
      <div className="pageTitle">
        <div>
          <h2>{c.title}</h2>
          <p>{c.subtitle}</p>
        </div>
        {c.form && (
          <button type="button" onClick={() => setOpen(!open)}>
            {open ? 'Cancel' : '+ Add new'}
          </button>
        )}
      </div>
      {open && c.form && (
        <Card title="Create record">
          <div className="formGrid">
            {c.form.map((f) => (
              <label key={f.key}>
                <span>{f.label}</span>
                {f.options ? (
                  <select
                    value={String(form[f.key] || '')}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  >
                    <option value="">Select…</option>
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type || 'text'}
                    value={String(form[f.key] || '')}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  />
                )}
              </label>
            ))}
          </div>
          {kind === 'supporters' && (
            <div className="consentBox">
              <strong>Communication consents</strong>
              <div className="consentGrid">
                {CONSENT_OPTIONS.map((type) => (
                  <label key={type} className="checkLabel">
                    <input
                      type="checkbox"
                      checked={consentValues.includes(type)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...consentValues, type]
                          : consentValues.filter((t) => t !== type);
                        setForm({ ...form, consents: next });
                      }}
                    />
                    {type.replaceAll('_', ' ')}
                  </label>
                ))}
              </div>
            </div>
          )}
          <button className="primary" type="button" disabled={saving} onClick={submit}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </Card>
      )}
      {err && <div className="error">{err}</div>}
      <Card title={`${data.length} records`}>
        {data.length ? <Table headers={c.headers} rows={buildRows(kind, data, c, load)} /> : <Empty text="No records yet" />}
      </Card>
    </>
  );
}

export function PeoplePage() {
  const [staff, setStaff] = useState<Record<string, unknown>[]>([]);
  const [vol, setVol] = useState<Record<string, unknown>[]>([]);
  const [open, setOpen] = useState<'staff' | 'volunteer' | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [skills, setSkills] = useState('');
  const [err, setErr] = useState('');
  const [tempPassword, setTempPassword] = useState('');

  const load = () => {
    api('/staff').then(setStaff).catch((e: Error) => setErr(e.message));
    api('/volunteers').then(setVol).catch((e: Error) => setErr(e.message));
  };

  useEffect(load, []);

  const submit = async () => {
    setErr('');
    setTempPassword('');
    try {
      if (open === 'staff') {
        const created = await api('/staff', {
          method: 'POST',
          body: JSON.stringify({ ...form, roleName: form.roleName || 'OFFICE_STAFF' }),
        });
        setTempPassword(created.temporaryPassword || '');
      } else {
        await api('/volunteers', {
          method: 'POST',
          body: JSON.stringify({
            ...form,
            skills: skills
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          }),
        });
      }
      setOpen(null);
      setForm({});
      setSkills('');
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    }
  };

  return (
    <>
      <div className="pageTitle">
        <div>
          <h2>Staff, Officials & Volunteers</h2>
          <p>Role-linked staffing and volunteer operations across offices.</p>
        </div>
        <div className="btnRow">
          <button type="button" onClick={() => setOpen('staff')}>
            + Staff
          </button>
          <button type="button" className="secondaryBtn" onClick={() => setOpen('volunteer')}>
            + Volunteer
          </button>
        </div>
      </div>
      {open && (
        <Card title={open === 'staff' ? 'Add staff member' : 'Add volunteer'}>
          <div className="formGrid">
            <label>
              <span>First name</span>
              <input value={form.firstName || ''} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </label>
            <label>
              <span>Last name</span>
              <input value={form.lastName || ''} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </label>
            {open === 'staff' ? (
              <>
                <label>
                  <span>Email</span>
                  <input value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </label>
                <label>
                  <span>Title</span>
                  <input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </label>
                <label>
                  <span>Department</span>
                  <input value={form.department || ''} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                </label>
                <label>
                  <span>Role</span>
                  <select value={form.roleName || 'OFFICE_STAFF'} onChange={(e) => setForm({ ...form, roleName: e.target.value })}>
                    <option value="OFFICE_STAFF">OFFICE_STAFF</option>
                    <option value="OFFICE_MANAGER">OFFICE_MANAGER</option>
                    <option value="FINANCE_OFFICER">FINANCE_OFFICER</option>
                    <option value="COMMS_OFFICER">COMMS_OFFICER</option>
                  </select>
                </label>
              </>
            ) : (
              <label>
                <span>Skills (comma separated)</span>
                <input value={skills} onChange={(e) => setSkills(e.target.value)} />
              </label>
            )}
          </div>
          <div className="btnRow">
            <button className="primary" type="button" onClick={submit}>
              Save
            </button>
            <button type="button" className="secondaryBtn" onClick={() => setOpen(null)}>
              Cancel
            </button>
          </div>
        </Card>
      )}
      {tempPassword && <div className="notice">Temporary password issued: <b>{tempPassword}</b> — share securely and require change on first login.</div>}
      {err && <div className="error">{err}</div>}
      <div className="grid2">
        <Card title="Staff">
          <Table
            headers={['Staff No.', 'Name', 'Title', 'Department', 'Office']}
            rows={staff.map((x) => {
              const user = x.user as { firstName: string; lastName: string };
              const office = x.office as { name?: string } | null;
              return [String(x.staffNo), `${user.firstName} ${user.lastName}`, String(x.title), String(x.department), office?.name || '—'];
            })}
          />
        </Card>
        <Card title="Volunteers">
          <Table
            headers={['Name', 'Skills', 'Office', 'Status']}
            rows={vol.map((x) => {
              const office = x.office as { name?: string } | null;
              return [
                `${x.firstName} ${x.lastName || ''}`,
                ((x.skills as string[]) || []).join(', '),
                office?.name || '—',
                String(x.status),
              ];
            })}
          />
        </Card>
      </div>
    </>
  );
}

export function OperationsPage() {
  const [tab, setTab] = useState<'events' | 'tasks'>('events');
  const [events, setEvents] = useState<Record<string, unknown>[]>([]);
  const [tasks, setTasks] = useState<Record<string, unknown>[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');

  const load = () => {
    api('/events').then(setEvents).catch((e: Error) => setErr(e.message));
    api('/tasks').then(setTasks).catch((e: Error) => setErr(e.message));
  };
  useEffect(load, []);

  const submit = async () => {
    setErr('');
    try {
      if (tab === 'events') {
        await api('/events', {
          method: 'POST',
          body: JSON.stringify({
            title: form.title,
            venue: form.venue,
            startsAt: form.startsAt,
            capacity: form.capacity ? Number(form.capacity) : undefined,
          }),
        });
      } else {
        await api('/tasks', {
          method: 'POST',
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            priority: form.priority || 'NORMAL',
            dueAt: form.dueAt || undefined,
          }),
        });
      }
      setOpen(false);
      setForm({});
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    }
  };

  return (
    <>
      <div className="pageTitle">
        <div>
          <h2>Events, Meetings & Tasks</h2>
          <p>Coordinate events, attendance, operational tasks and branch execution.</p>
        </div>
        <button type="button" onClick={() => setOpen(!open)}>
          {open ? 'Cancel' : `+ Add ${tab === 'events' ? 'event' : 'task'}`}
        </button>
      </div>
      <div className="tabs">
        <button type="button" className={tab === 'events' ? 'active' : ''} onClick={() => setTab('events')}>
          Events
        </button>
        <button type="button" className={tab === 'tasks' ? 'active' : ''} onClick={() => setTab('tasks')}>
          Tasks
        </button>
      </div>
      {open && (
        <Card title={tab === 'events' ? 'Create event' : 'Create task'}>
          <div className="formGrid">
            <label>
              <span>Title</span>
              <input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            {tab === 'events' ? (
              <>
                <label>
                  <span>Venue</span>
                  <input value={form.venue || ''} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
                </label>
                <label>
                  <span>Starts at</span>
                  <input type="datetime-local" value={form.startsAt || ''} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
                </label>
                <label>
                  <span>Capacity</span>
                  <input type="number" value={form.capacity || ''} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
                </label>
              </>
            ) : (
              <>
                <label>
                  <span>Description</span>
                  <input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </label>
                <label>
                  <span>Priority</span>
                  <select value={form.priority || 'NORMAL'} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="LOW">LOW</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </label>
                <label>
                  <span>Due at</span>
                  <input type="datetime-local" value={form.dueAt || ''} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
                </label>
              </>
            )}
          </div>
          <button className="primary" type="button" onClick={submit}>
            Save
          </button>
        </Card>
      )}
      {err && <div className="error">{err}</div>}
      {tab === 'events' ? (
        <Card title={`${events.length} events`}>
          {events.length ? (
            <Table
              headers={['Event', 'Venue', 'Starts', 'Status', 'Actions']}
              rows={events.map((x) => [
                String(x.title),
                String(x.venue || '—'),
                new Date(String(x.startsAt)).toLocaleString(),
                String(x.status),
                x.status === 'DRAFT' ? (
                  <button
                    key={String(x.id)}
                    className="linkish"
                    onClick={async () => {
                      await api(`/events/${x.id}/publish`, { method: 'PATCH' });
                      load();
                    }}
                  >
                    Publish
                  </button>
                ) : (
                  '—'
                ),
              ])}
            />
          ) : (
            <Empty text="No events yet" />
          )}
        </Card>
      ) : (
        <Card title={`${tasks.length} tasks`}>
          {tasks.length ? (
            <Table
              headers={['Task', 'Priority', 'Status', 'Due', 'Actions']}
              rows={tasks.map((x) => [
                String(x.title),
                String(x.priority),
                String(x.status),
                x.dueAt ? new Date(String(x.dueAt)).toLocaleString() : '—',
                x.status !== 'DONE' ? (
                  <button
                    key={String(x.id)}
                    className="linkish"
                    onClick={async () => {
                      await api(`/tasks/${x.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'DONE' }) });
                      load();
                    }}
                  >
                    Mark done
                  </button>
                ) : (
                  '—'
                ),
              ])}
            />
          ) : (
            <Empty text="No tasks yet" />
          )}
        </Card>
      )}
    </>
  );
}

export function SecurityPage() {
  const [audit, setAudit] = useState<Record<string, unknown>[]>([]);
  const [privacy, setPrivacy] = useState<Record<string, unknown>[]>([]);
  const [err, setErr] = useState('');

  const load = () => {
    api('/audit').then(setAudit).catch((e: Error) => setErr(e.message));
    api('/privacy-requests').then(setPrivacy).catch((e: Error) => setErr(e.message));
  };
  useEffect(load, []);

  return (
    <>
      <div className="pageTitle">
        <div>
          <h2>Security, Permissions & Audit</h2>
          <p>Review operational audit history and privacy request handling.</p>
        </div>
      </div>
      {err && <div className="error">{err}</div>}
      <div className="grid2">
        <Card title="Recent audit log">
          {audit.length ? (
            <Table
              headers={['Time', 'Actor', 'Action', 'Entity']}
              rows={audit.slice(0, 50).map((x) => {
                const actor = x.actor as { firstName?: string; lastName?: string } | null;
                return [
                  new Date(String(x.createdAt)).toLocaleString(),
                  actor ? `${actor.firstName} ${actor.lastName}` : 'System',
                  String(x.action),
                  String(x.entity),
                ];
              })}
            />
          ) : (
            <Empty text="No audit entries yet" />
          )}
        </Card>
        <Card title="Privacy requests">
          {privacy.length ? (
            <Table
              headers={['Type', 'Subject', 'Status', 'Actions']}
              rows={privacy.map((x) => [
                String(x.type),
                `${x.subjectType}:${x.subjectId}`,
                String(x.status),
                x.status === 'OPEN' ? (
                  <button
                    key={String(x.id)}
                    className="linkish"
                    onClick={async () => {
                      await api(`/privacy-requests/${x.id}/complete`, { method: 'PATCH' });
                      load();
                    }}
                  >
                    Complete
                  </button>
                ) : (
                  '—'
                ),
              ])}
            />
          ) : (
            <Empty text="No privacy requests yet" />
          )}
        </Card>
      </div>
    </>
  );
}

export function AnalyticsPage() {
  const [d, setD] = useState<{
    members: number;
    supporters: number;
    offices: number;
    volunteers: number;
    confirmedDonations: number;
    approvedExpenses: number;
    supportersByCountry: { country: string; count: number }[];
  } | null>(null);

  useEffect(() => {
    api('/analytics/dashboard').then(setD);
  }, []);

  if (!d) return <div className="loading">Loading analytics…</div>;

  return (
    <>
      <div className="pageTitle">
        <div>
          <h2>Leadership Analytics</h2>
          <p>Aggregate organisational performance without individual political persuasion scoring.</p>
        </div>
      </div>
      <div className="stats stats4">
        <div className="stat">
          <small>Members</small>
          <strong>{d.members}</strong>
        </div>
        <div className="stat">
          <small>Supporters</small>
          <strong>{d.supporters}</strong>
        </div>
        <div className="stat">
          <small>Offices</small>
          <strong>{d.offices}</strong>
        </div>
        <div className="stat">
          <small>Volunteers</small>
          <strong>{d.volunteers}</strong>
        </div>
      </div>
      <div className="grid2">
        <Card title="Country distribution">
          <div className="chartBox">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={d.supportersByCountry}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5ece8" />
                <XAxis dataKey="country" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0c754b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Financial snapshot">
          <div className="metricList">
            <p>
              <span>Confirmed donations</span>
              <b>${d.confirmedDonations.toLocaleString()}</b>
            </p>
            <p>
              <span>Approved expenses</span>
              <b>${d.approvedExpenses.toLocaleString()}</b>
            </p>
            <p>
              <span>Net operational balance (approx.)</span>
              <b>${(d.confirmedDonations - d.approvedExpenses).toLocaleString()}</b>
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}

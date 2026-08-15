import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, Empty, Table } from '../components/Common';
import { useI18n } from '../lib/i18n';

type Approval = {
  id: string;
  entityType: string;
  status: string;
  createdAt: string;
  fundraisingCampaign?: { title?: string } | null;
  expense?: { description?: string; amount?: string | number } | null;
  communicationCampaign?: { title?: string } | null;
};

type Registration = {
  id: string;
  kind: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  createdAt: string;
  message?: string | null;
};

export default function ApprovalsPage() {
  const { t } = useI18n();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const load = () =>
    api('/approvals/inbox')
      .then((d) => {
        setApprovals(d.approvals || []);
        setRegistrations(d.registrations || []);
      })
      .catch((e: Error) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const decideReg = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    setError('');
    setInfo('');
    try {
      await api(`/registrations/${id}/decide`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      setInfo(`Registration ${decision.toLowerCase()}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Decision failed');
    }
  };

  return (
    <>
      <section className="heroBand">
        <div className="eyebrow">{t('approvals')}</div>
        <h2>One queue for campaigns, spend, and new people</h2>
        <p>Approve portal registrations and pending operational items without hunting across modules.</p>
      </section>
      {error && <div className="error">{error}</div>}
      {info && <div className="notice">{info}</div>}

      <Card title={`Portal registrations (${registrations.length})`}>
        {registrations.length ? (
          <Table
            headers={['Kind', 'Name', 'Email', 'Country', 'Actions']}
            rows={registrations.map((r) => [
              r.kind,
              `${r.firstName} ${r.lastName}`,
              r.email,
              r.country,
              <span className="actionPair" key={r.id}>
                <button type="button" className="linkish" onClick={() => decideReg(r.id, 'APPROVED')}>
                  Approve
                </button>
                <button type="button" className="linkish dangerLink" onClick={() => decideReg(r.id, 'REJECTED')}>
                  Reject
                </button>
              </span>,
            ])}
          />
        ) : (
          <Empty text="No pending registrations — share /register to grow the movement." />
        )}
      </Card>

      <Card title={`Pending approvals (${approvals.length})`}>
        {approvals.length ? (
          <Table
            headers={['Type', 'Item', 'Requested', 'Status']}
            rows={approvals.map((a) => [
              a.entityType,
              a.fundraisingCampaign?.title ||
                a.communicationCampaign?.title ||
                a.expense?.description ||
                a.id,
              new Date(a.createdAt).toLocaleString(),
              a.status,
            ])}
          />
        ) : (
          <Empty text="No pending campaign/expense/comms approvals." />
        )}
      </Card>
    </>
  );
}

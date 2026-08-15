import assert from 'node:assert/strict';

const API = process.env.API_URL || 'http://localhost:4000';

async function json(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function main() {
  const health = await json('/health');
  assert.equal(health.res.status, 200);
  assert.equal(health.body.ok, true);

  const gateways = await json('/api/payments/gateways');
  assert.equal(gateways.res.status, 200);
  assert.ok(Array.isArray(gateways.body.gateways));

  const publicCampaigns = await json('/api/public/campaigns');
  assert.equal(publicCampaigns.res.status, 200);

  const seedLogin = await json('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@waddani.local', password: 'ChangeMe123!', portal: 'staff' }),
  });
  assert.equal(seedLogin.res.status, 200, `login failed: ${JSON.stringify(seedLogin.body)}`);
  const token = seedLogin.body.token as string;

  const me = await json('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(me.res.status, 200);

  const inbox = await json('/api/approvals/inbox', { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(inbox.res.status, 200);

  const memberLogin = await json('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'member@waddani.local', password: 'ChangeMe123!', portal: 'member' }),
  });
  assert.equal(memberLogin.res.status, 200);
  const mToken = memberLogin.body.token as string;
  const events = await json('/api/portal/events', { headers: { Authorization: `Bearer ${mToken}` } });
  assert.equal(events.res.status, 200);

  console.log('smoke ok');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

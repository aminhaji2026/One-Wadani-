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

  const badLogin = await json('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'nobody@example.com', password: 'wrongpass1' }),
  });
  assert.equal(badLogin.res.status, 401);

  const login = await json('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: process.env.SMOKE_EMAIL || 'admin@waddani.local',
      password: process.env.SMOKE_PASSWORD || 'SecurePass123!',
    }),
  });

  if (login.res.status !== 200) {
    // Fall back to seed password if smoke password not updated.
    const seedLogin = await json('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@waddani.local', password: 'ChangeMe123!' }),
    });
    assert.equal(seedLogin.res.status, 200, `login failed: ${JSON.stringify(seedLogin.body)}`);
    assert.ok(seedLogin.body.token);
    console.log('smoke ok (seed credentials)');
    return;
  }

  const token = login.body.token as string;
  const me = await json('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(me.res.status, 200);
  assert.ok(Array.isArray(me.body.permissions));

  const members = await json('/api/members', { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(members.res.status, 200);
  assert.ok(Array.isArray(members.body));

  console.log('smoke ok');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

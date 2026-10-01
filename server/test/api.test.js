'use strict';

/*
 * API tests against a real PostgreSQL database.
 * Run with: TEST_DATABASE_URL=postgres://... npm test   (in server/)
 * The tables of that database are dropped and recreated.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { createPool, migrate } = require('../db.js');
const { createApp } = require('../app.js');
const Auth = require('../auth.js');
const Storage = require('../../js/storage.js');

const URL_DB = process.env.TEST_DATABASE_URL;

test('server API', { skip: !URL_DB && 'TEST_DATABASE_URL not set' }, async (t) => {
  const pool = createPool(URL_DB);
  await pool.query('DROP TABLE IF EXISTS sessions, files, org_versions, users, orgs, settings CASCADE');
  await migrate(pool);
  await pool.query("INSERT INTO users (email, name, password_hash, role) VALUES ('fac@example.org', 'Fac', $1, 'facilitator')", [await Auth.hashPassword('facpass123')]);
  const server = http.createServer(createApp(pool));
  await new Promise((r) => server.listen(0, r));
  const base = 'http://127.0.0.1:' + server.address().port;
  t.after(async () => { server.close(); await pool.end(); });

  function client() {
    let cookie = '';
    return async function call(method, path, body, headers) {
      const opts = { method: method, headers: Object.assign({ 'X-Requested-With': 'diag' }, headers || {}) };
      if (cookie) opts.headers.Cookie = cookie;
      if (body !== undefined) {
        if (Buffer.isBuffer(body)) opts.body = body;
        else { opts.body = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; }
      }
      const res = await fetch(base + path, opts);
      const set = res.headers.get('set-cookie');
      if (set) cookie = set.split(';')[0];
      const type = res.headers.get('content-type') || '';
      return { status: res.status, body: type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer()), headers: res.headers };
    };
  }

  const fac = client();
  const anon = client();

  await t.test('static app and unauthenticated access', async () => {
    const page = await anon('GET', '/');
    assert.equal(page.status, 200);
    assert.match(page.body.toString(), /Outil de Diagnostic Organisationnel/);
    assert.equal((await anon('GET', '/js/app.js')).status, 200);
    assert.equal((await anon('GET', '/server/app.js')).status, 404);
    assert.equal((await anon('GET', '/js/../server/app.js')).status, 404);
    const me = await anon('GET', '/api/me');
    assert.equal(me.status, 401);
    assert.equal(me.body.server, true);
    assert.equal((await anon('GET', '/api/workspace')).status, 401);
  });

  await t.test('login, wrong password and CSRF header', async () => {
    assert.equal((await anon('POST', '/api/login', { email: 'fac@example.org', password: 'nope' })).status, 401);
    const noHeader = await fetch(base + '/api/login', { method: 'POST', body: '{}' });
    assert.equal(noHeader.status, 403);
    const ok = await fac('POST', '/api/login', { email: 'FAC@example.org ', password: 'facpass123' });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.user.role, 'facilitator');
    assert.match(ok.headers.get('set-cookie'), /HttpOnly/);
    assert.equal((await fac('GET', '/api/me')).body.user.email, 'fac@example.org');
  });

  const orgA = Storage.newOrg('Org A');
  const orgB = Storage.newOrg('Org B');
  orgA.organization.type = 'ONG';

  await t.test('facilitator creates and updates organisations, with conflict detection', async () => {
    const created = await fac('PUT', '/api/orgs/' + orgA.id, { data: orgA, baseVersion: null });
    assert.deepEqual(created.body, { version: 1 });
    assert.equal((await fac('PUT', '/api/orgs/' + orgB.id, { data: orgB })).status, 200);
    orgA.organization.region = 'Analamanga';
    assert.equal((await fac('PUT', '/api/orgs/' + orgA.id, { data: orgA, baseVersion: 1 })).body.version, 2);
    const conflict = await fac('PUT', '/api/orgs/' + orgA.id, { data: orgA, baseVersion: 1 });
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.version, 2);
    assert.equal(conflict.body.data.organization.region, 'Analamanga');
    const ws = await fac('GET', '/api/workspace');
    assert.equal(ws.body.orgs.length, 2);
    const a = ws.body.orgs.find((o) => o.id === orgA.id);
    assert.equal(a.data.organization.type, 'ngo', 'normalised on the server');
    assert.equal((await fac('PUT', '/api/orgs/' + orgA.id, { data: { nonsense: true }, baseVersion: 2 })).status, 400);
  });

  const orgUser = client();
  let orgUserId;

  await t.test('facilitator manages accounts', async () => {
    assert.equal((await fac('POST', '/api/users', { email: 'a@example.org', name: 'A', role: 'org', orgId: orgA.id, password: 'short' })).body.error, 'password-too-short');
    assert.equal((await fac('POST', '/api/users', { email: 'a@example.org', name: 'A', role: 'org', password: 'orgpass123' })).body.error, 'org-required');
    assert.equal((await fac('POST', '/api/users', { email: 'a@example.org', role: 'org', orgId: 'missing', password: 'orgpass123' })).body.error, 'unknown-org');
    const r = await fac('POST', '/api/users', { email: 'a@example.org', name: 'A', role: 'org', orgId: orgA.id, password: 'orgpass123' });
    assert.equal(r.status, 200);
    orgUserId = r.body.user.id;
    assert.equal((await fac('POST', '/api/users', { email: 'a@example.org', role: 'org', orgId: orgA.id, password: 'orgpass123' })).body.error, 'email-taken');
    const list = await fac('GET', '/api/users');
    assert.equal(list.body.users.length, 2);
    assert.ok(!('password_hash' in list.body.users[0]) && !('passwordHash' in list.body.users[0]));
  });

  await t.test('organisation account only sees and edits its own organisation', async () => {
    assert.equal((await orgUser('POST', '/api/login', { email: 'a@example.org', password: 'orgpass123' })).status, 200);
    const ws = await orgUser('GET', '/api/workspace');
    assert.deepEqual(ws.body.orgs.map((o) => o.id), [orgA.id]);
    assert.equal((await orgUser('PUT', '/api/orgs/' + orgB.id, { data: orgB, baseVersion: 1 })).status, 403);
    const fresh = Storage.newOrg('Sneaky');
    assert.equal((await orgUser('PUT', '/api/orgs/' + fresh.id, { data: fresh })).status, 403);
    assert.equal((await orgUser('PUT', '/api/orgs/' + orgA.id, { data: orgA, baseVersion: 2 })).body.version, 3);
    assert.equal((await orgUser('GET', '/api/users')).status, 403);
    assert.equal((await orgUser('PUT', '/api/settings', { indexMethod: 'weighted' })).status, 403);
    assert.equal((await orgUser('DELETE', '/api/orgs/' + orgA.id)).status, 403);
  });

  await t.test('evidence files are scoped to the organisation', async () => {
    const pdf = Buffer.from('%PDF-1.4\n%test\n');
    assert.equal((await orgUser('POST', '/api/files?org=' + orgA.id + '&name=x.pdf', Buffer.from('hello'))).body.error, 'not-pdf');
    assert.equal((await orgUser('POST', '/api/files?org=' + orgB.id + '&name=x.pdf', pdf)).status, 403);
    const up = await orgUser('POST', '/api/files?org=' + orgA.id + '&name=' + encodeURIComponent('rapport annuel.pdf'), pdf);
    assert.equal(up.status, 200);
    assert.equal(up.body.name, 'rapport annuel.pdf');
    const got = await fac('GET', '/api/files/' + up.body.id);
    assert.equal(got.status, 200);
    assert.equal(got.body.toString(), pdf.toString());
    const upB = await fac('POST', '/api/files?org=' + orgB.id + '&name=b.pdf&id=fimported1', pdf);
    assert.equal(upB.body.id, 'fimported1');
    assert.equal((await orgUser('GET', '/api/files/fimported1')).status, 404);
    assert.equal((await orgUser('DELETE', '/api/files/' + up.body.id)).status, 200);
    assert.equal((await fac('GET', '/api/files/' + up.body.id)).status, 404);
  });

  await t.test('settings, password change and account deactivation', async () => {
    const s = await fac('PUT', '/api/settings', { indexMethod: 'weighted', weights: { gov: 40, plan: 20, hr: 20, fin: 20 } });
    assert.equal(s.body.indexMethod, 'weighted');
    assert.equal((await orgUser('GET', '/api/workspace')).body.settings.weights.gov, 40);
    assert.equal((await orgUser('POST', '/api/password', { current: 'wrong', next: 'newpass123' })).body.error, 'bad-current-password');
    assert.equal((await orgUser('POST', '/api/password', { current: 'orgpass123', next: 'newpass123' })).status, 200);
    assert.equal((await fac('PATCH', '/api/users/' + orgUserId, { active: false })).body.user.active, false);
    assert.equal((await orgUser('GET', '/api/me')).status, 401, 'signed out when deactivated');
    assert.equal((await orgUser('POST', '/api/login', { email: 'a@example.org', password: 'newpass123' })).status, 401);
  });

  await t.test('facilitator cannot lock themselves out; organisations with accounts are protected', async () => {
    const me = (await fac('GET', '/api/me')).body.user;
    assert.equal((await fac('PATCH', '/api/users/' + me.id, { active: false })).body.error, 'cannot-demote-self');
    assert.equal((await fac('DELETE', '/api/users/' + me.id)).body.error, 'cannot-delete-self');
    assert.equal((await fac('DELETE', '/api/orgs/' + orgA.id)).body.error, 'org-has-accounts');
    assert.equal((await fac('DELETE', '/api/orgs/' + orgB.id)).status, 200);
    assert.equal((await fac('GET', '/api/workspace')).body.orgs.length, 1);
    const kept = await pool.query('SELECT count(*)::int AS n FROM org_versions WHERE org_id = $1', [orgB.id]);
    assert.equal(kept.rows[0].n, 1, 'a snapshot is kept after deletion');
  });

  await t.test('logout ends the session', async () => {
    assert.equal((await fac('POST', '/api/logout')).status, 200);
    assert.equal((await fac('GET', '/api/workspace')).status, 401);
  });

  await t.test('login attempts are throttled', async () => {
    const bad = client();
    for (let i = 0; i < 10; i++) await bad('POST', '/api/login', { email: 'fac@example.org', password: 'x' + i });
    assert.equal((await bad('POST', '/api/login', { email: 'fac@example.org', password: 'facpass123' })).status, 429);
  });
});

'use strict';

/*
 * HTTP API and static file server.
 *
 * Roles:
 *   facilitator  sees and edits every organisation, manages accounts and settings
 *   org          sees and edits its own organisation only
 *
 * Organisations are stored as JSON documents (the same format as the
 * browser workspace), validated with js/storage.js. Every write keeps an
 * hourly snapshot of the previous version in org_versions.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Auth = require('./auth.js');
const Storage = require('../js/storage.js');

const ROOT = path.join(__dirname, '..');
const COOKIE = 'diag_sid';
const SESSION_DAYS = 14;
const MAX_JSON = 5 * 1024 * 1024;
const MAX_FILE = 10 * 1024 * 1024;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 10;
const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STATIC_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};
const STATIC_DIRS = ['css/', 'js/', 'dist/'];

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; frame-src 'self' blob:; object-src 'self' blob:; connect-src 'self'; base-uri 'self'; form-action 'self'"
};

class HttpError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}

function createApp(pool, options) {
  options = options || {};
  const secureCookie = !!options.secureCookie;
  const trustProxy = !!options.trustProxy;
  const failures = new Map();

  // ---------------------------------------------------------------- helpers

  function send(res, status, body, headers) {
    const data = body === undefined ? '' : JSON.stringify(body);
    res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, SECURITY_HEADERS, headers || {}));
    res.end(data);
  }

  function readBody(req, limit) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      req.on('data', (c) => {
        size += c.length;
        if (size > limit) { reject(new HttpError(413, 'too-large')); req.destroy(); return; }
        chunks.push(c);
      });
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  }

  async function readJson(req) {
    const buf = await readBody(req, MAX_JSON);
    if (!buf.length) return {};
    try { return JSON.parse(buf.toString('utf8')); } catch (e) { throw new HttpError(400, 'invalid-json'); }
  }

  function cookies(req) {
    const out = {};
    String(req.headers.cookie || '').split(';').forEach((part) => {
      const i = part.indexOf('=');
      if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    });
    return out;
  }

  function isHttps(req) {
    return secureCookie || (trustProxy && String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https');
  }

  function sessionCookie(req, token, maxAge) {
    return COOKIE + '=' + (token || '') + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + maxAge + (isHttps(req) ? '; Secure' : '');
  }

  function clientIp(req) {
    if (trustProxy && req.headers['x-forwarded-for']) return String(req.headers['x-forwarded-for']).split(',')[0].trim();
    return req.socket.remoteAddress || '';
  }

  function publicUser(u) {
    return { id: u.id, email: u.email, name: u.name, role: u.role, orgId: u.org_id, active: u.active, lastLogin: u.last_login, createdAt: u.created_at };
  }

  async function currentUser(req) {
    const token = cookies(req)[COOKIE];
    if (!token) return null;
    const { rows } = await pool.query(
      'SELECT u.*, s.token_hash, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now() AND u.active',
      [Auth.hashToken(token)]);
    if (!rows.length) return null;
    const u = rows[0];
    // Sliding expiry, refreshed at most once a day.
    if (new Date(u.expires_at) - Date.now() < (SESSION_DAYS - 1) * 86400000) {
      await pool.query("UPDATE sessions SET expires_at = now() + interval '" + SESSION_DAYS + " days' WHERE token_hash = $1", [u.token_hash]);
    }
    return u;
  }

  function requireRole(user, role) {
    if (!user) throw new HttpError(401, 'unauthenticated');
    if (role && user.role !== role) throw new HttpError(403, 'forbidden');
  }

  function canAccessOrg(user, orgId) {
    return user.role === 'facilitator' || (user.role === 'org' && user.org_id === orgId);
  }

  async function readSettings() {
    const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'workspace'");
    const s = Storage.normalizeSettings(rows.length ? rows[0].value : {});
    return { indexMethod: s.indexMethod, weights: s.weights };
  }

  function normalizeOrgData(id, data) {
    let org;
    try { org = Storage.normalizeOrg(data); } catch (e) { throw new HttpError(400, 'invalid-org'); }
    org.id = id;
    return org;
  }

  // ---------------------------------------------------------------- login

  function tooManyFailures(key) {
    const f = failures.get(key);
    if (!f) return false;
    if (Date.now() - f.first > LOGIN_WINDOW_MS) { failures.delete(key); return false; }
    return f.count >= LOGIN_MAX_FAILURES;
  }

  function recordFailure(key) {
    const f = failures.get(key);
    if (!f || Date.now() - f.first > LOGIN_WINDOW_MS) failures.set(key, { count: 1, first: Date.now() });
    else f.count++;
    if (failures.size > 10000) failures.clear();
  }

  async function login(req, res) {
    const body = await readJson(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const key = clientIp(req) + '|' + email;
    if (tooManyFailures(key)) throw new HttpError(429, 'too-many-attempts');
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    const ok = user ? await Auth.verifyPassword(password, user.password_hash) : await Auth.dummyVerify(password);
    if (!ok || !user.active) {
      recordFailure(key);
      throw new HttpError(401, 'bad-credentials');
    }
    failures.delete(key);
    const token = Auth.newToken();
    await pool.query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '" + SESSION_DAYS + " days')",
      [Auth.hashToken(token), user.id]);
    await pool.query('UPDATE users SET last_login = now() WHERE id = $1', [user.id]);
    send(res, 200, { user: publicUser(user) }, { 'Set-Cookie': sessionCookie(req, token, SESSION_DAYS * 86400) });
  }

  async function logout(req, res) {
    const token = cookies(req)[COOKIE];
    if (token) await pool.query('DELETE FROM sessions WHERE token_hash = $1', [Auth.hashToken(token)]);
    send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) });
  }

  async function changeOwnPassword(req, res, user) {
    const body = await readJson(req);
    if (!(await Auth.verifyPassword(String(body.current || ''), user.password_hash))) throw new HttpError(400, 'bad-current-password');
    const problem = Auth.passwordProblem(body.next);
    if (problem) throw new HttpError(400, problem);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [await Auth.hashPassword(body.next), user.id]);
    // Sign out the other sessions of this account.
    await pool.query('DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2', [user.id, user.token_hash]);
    send(res, 200, { ok: true });
  }

  // ---------------------------------------------------------------- organisations

  async function workspace(req, res, user) {
    const q = user.role === 'facilitator'
      ? await pool.query('SELECT id, data, version, updated_at FROM orgs ORDER BY updated_at')
      : await pool.query('SELECT id, data, version, updated_at FROM orgs WHERE id = $1', [user.org_id]);
    send(res, 200, {
      settings: await readSettings(),
      orgs: q.rows.map((r) => ({ id: r.id, version: r.version, data: r.data }))
    });
  }

  async function putOrg(req, res, user, id) {
    if (!ID_RE.test(id)) throw new HttpError(400, 'invalid-id');
    if (!canAccessOrg(user, id)) throw new HttpError(403, 'forbidden');
    const body = await readJson(req);
    const data = normalizeOrgData(id, body.data);
    const base = body.baseVersion === undefined || body.baseVersion === null ? null : Number(body.baseVersion);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = await client.query('SELECT data, version, updated_at FROM orgs WHERE id = $1 FOR UPDATE', [id]);
      if (!cur.rows.length) {
        if (user.role !== 'facilitator') throw new HttpError(403, 'forbidden');
        await client.query('INSERT INTO orgs (id, data, version, updated_by) VALUES ($1, $2, 1, $3)', [id, data, user.id]);
        await client.query('COMMIT');
        send(res, 200, { version: 1 });
        return;
      }
      const row = cur.rows[0];
      if (base !== row.version) {
        await client.query('ROLLBACK');
        send(res, 409, { error: 'conflict', version: row.version, data: row.data });
        return;
      }
      const last = await client.query('SELECT saved_at FROM org_versions WHERE org_id = $1 ORDER BY saved_at DESC LIMIT 1', [id]);
      if (!last.rows.length || Date.now() - new Date(last.rows[0].saved_at) > 3600 * 1000) {
        await client.query('INSERT INTO org_versions (org_id, version, data, saved_by) VALUES ($1, $2, $3, $4)', [id, row.version, row.data, user.id]);
        await client.query('DELETE FROM org_versions WHERE org_id = $1 AND id NOT IN (SELECT id FROM org_versions WHERE org_id = $1 ORDER BY saved_at DESC LIMIT 100)', [id]);
      }
      const version = row.version + 1;
      await client.query('UPDATE orgs SET data = $2, version = $3, updated_at = now(), updated_by = $4 WHERE id = $1', [id, data, version, user.id]);
      await client.query('COMMIT');
      send(res, 200, { version: version });
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }

  async function deleteOrg(req, res, user, id) {
    requireRole(user, 'facilitator');
    const users = await pool.query('SELECT count(*)::int AS n FROM users WHERE org_id = $1', [id]);
    if (users.rows[0].n > 0) throw new HttpError(409, 'org-has-accounts');
    const cur = await pool.query('SELECT data, version FROM orgs WHERE id = $1', [id]);
    if (cur.rows.length) {
      // Keep a last snapshot so a deletion can be undone from the database.
      await pool.query('INSERT INTO org_versions (org_id, version, data, saved_by) VALUES ($1, $2, $3, $4)', [id, cur.rows[0].version, cur.rows[0].data, user.id]);
    }
    await pool.query('DELETE FROM orgs WHERE id = $1', [id]);
    await pool.query('DELETE FROM files WHERE org_id = $1', [id]);
    send(res, 200, { ok: true });
  }

  async function putSettings(req, res, user) {
    requireRole(user, 'facilitator');
    const body = await readJson(req);
    const s = Storage.normalizeSettings(body);
    const value = { indexMethod: s.indexMethod, weights: s.weights };
    await pool.query("INSERT INTO settings (key, value) VALUES ('workspace', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [value]);
    send(res, 200, value);
  }

  // ---------------------------------------------------------------- files

  async function uploadFile(req, res, user, url) {
    const orgId = url.searchParams.get('org') || '';
    if (!canAccessOrg(user, orgId)) throw new HttpError(403, 'forbidden');
    const exists = await pool.query('SELECT 1 FROM orgs WHERE id = $1', [orgId]);
    if (!exists.rows.length) throw new HttpError(400, 'unknown-org');
    const buf = await readBody(req, MAX_FILE);
    if (buf.length < 4 || buf.slice(0, 4).toString('latin1') !== '%PDF') throw new HttpError(400, 'not-pdf');
    const name = (url.searchParams.get('name') || 'evidence.pdf').replace(/[\\/\r\n"]/g, '_').slice(0, 200);
    let id = url.searchParams.get('id') || '';
    if (id) {
      if (!ID_RE.test(id)) throw new HttpError(400, 'invalid-id');
      const taken = await pool.query('SELECT org_id FROM files WHERE id = $1', [id]);
      if (taken.rows.length) {
        // Re-importing the same file is fine; a clash with another organisation is not.
        if (taken.rows[0].org_id !== orgId) throw new HttpError(409, 'file-id-taken');
        send(res, 200, { id: id, name: name, size: buf.length, uploadedAt: new Date().toISOString() });
        return;
      }
    } else {
      id = 'f' + Date.now().toString(36) + crypto.randomBytes(6).toString('hex');
    }
    const r = await pool.query('INSERT INTO files (id, org_id, name, size, data, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING uploaded_at',
      [id, orgId, name, buf.length, buf, user.id]);
    send(res, 200, { id: id, name: name, size: buf.length, uploadedAt: r.rows[0].uploaded_at });
  }

  async function getFile(req, res, user, id) {
    const { rows } = await pool.query('SELECT org_id, name, data FROM files WHERE id = $1', [id]);
    if (!rows.length || !canAccessOrg(user, rows[0].org_id)) throw new HttpError(404, 'not-found');
    res.writeHead(200, Object.assign({}, SECURITY_HEADERS, {
      'Content-Type': 'application/pdf',
      'Content-Length': rows[0].data.length,
      'Content-Disposition': 'inline; filename="' + rows[0].name.replace(/[^\x20-\x7e]/g, '_') + '"; filename*=UTF-8\'\'' + encodeURIComponent(rows[0].name),
      'Cache-Control': 'private, max-age=3600'
    }));
    res.end(rows[0].data);
  }

  async function deleteFile(req, res, user, id) {
    const { rows } = await pool.query('SELECT org_id FROM files WHERE id = $1', [id]);
    if (rows.length) {
      if (!canAccessOrg(user, rows[0].org_id)) throw new HttpError(404, 'not-found');
      await pool.query('DELETE FROM files WHERE id = $1', [id]);
    }
    send(res, 200, { ok: true });
  }

  // ---------------------------------------------------------------- accounts

  async function listUsers(req, res, user) {
    requireRole(user, 'facilitator');
    const { rows } = await pool.query('SELECT * FROM users ORDER BY role, name, email');
    send(res, 200, { users: rows.map(publicUser) });
  }

  async function checkUserFields(body, partial) {
    const out = {};
    if (!partial || body.email !== undefined) {
      out.email = String(body.email || '').trim().toLowerCase();
      if (!EMAIL_RE.test(out.email) || out.email.length > 200) throw new HttpError(400, 'invalid-email');
    }
    if (!partial || body.name !== undefined) out.name = String(body.name || '').trim().slice(0, 200);
    if (!partial || body.role !== undefined) {
      if (body.role !== 'facilitator' && body.role !== 'org') throw new HttpError(400, 'invalid-role');
      out.role = body.role;
    }
    if (!partial || body.orgId !== undefined) out.org_id = body.orgId ? String(body.orgId) : null;
    if (out.role === 'org' || (partial && out.org_id !== undefined)) {
      if (out.role === 'org' && !out.org_id && (!partial || out.org_id !== undefined)) throw new HttpError(400, 'org-required');
      if (out.org_id) {
        const r = await pool.query('SELECT 1 FROM orgs WHERE id = $1', [out.org_id]);
        if (!r.rows.length) throw new HttpError(400, 'unknown-org');
      }
    }
    if (out.role === 'facilitator') out.org_id = null;
    if (!partial || body.password) {
      const problem = Auth.passwordProblem(body.password);
      if (problem) throw new HttpError(400, problem);
      out.password_hash = await Auth.hashPassword(body.password);
    }
    if (partial && body.active !== undefined) out.active = !!body.active;
    return out;
  }

  async function createUser(req, res, user) {
    requireRole(user, 'facilitator');
    const f = await checkUserFields(await readJson(req), false);
    try {
      const { rows } = await pool.query('INSERT INTO users (email, name, password_hash, role, org_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [f.email, f.name, f.password_hash, f.role, f.org_id]);
      send(res, 200, { user: publicUser(rows[0]) });
    } catch (e) {
      if (e.code === '23505') throw new HttpError(409, 'email-taken');
      throw e;
    }
  }

  async function activeFacilitators(exceptId) {
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM users WHERE role = 'facilitator' AND active AND id <> $1", [exceptId]);
    return rows[0].n;
  }

  async function updateUser(req, res, user, id) {
    requireRole(user, 'facilitator');
    const target = (await pool.query('SELECT * FROM users WHERE id = $1', [id])).rows[0];
    if (!target) throw new HttpError(404, 'not-found');
    const body = await readJson(req);
    const f = await checkUserFields(Object.assign({ role: body.role === undefined ? target.role : body.role }, body), true);
    if (f.role === 'org' && f.org_id === undefined && !target.org_id) throw new HttpError(400, 'org-required');
    if (target.id === user.id && (f.active === false || f.role === 'org')) throw new HttpError(400, 'cannot-demote-self');
    const losesFacilitator = target.role === 'facilitator' && target.active && (f.role === 'org' || f.active === false);
    if (losesFacilitator && (await activeFacilitators(target.id)) === 0) throw new HttpError(400, 'last-facilitator');
    const cols = Object.keys(f);
    if (cols.length) {
      try {
        await pool.query('UPDATE users SET ' + cols.map((c, i) => c + ' = $' + (i + 2)).join(', ') + ' WHERE id = $1', [id].concat(cols.map((c) => f[c])));
      } catch (e) {
        if (e.code === '23505') throw new HttpError(409, 'email-taken');
        throw e;
      }
    }
    // A new password, a deactivation or a change of rights signs the account
    // out (except the facilitator's own current session).
    if (f.password_hash || f.active === false || (f.role && f.role !== target.role) || (f.org_id !== undefined && f.org_id !== target.org_id)) {
      if (target.id === user.id) await pool.query('DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2', [id, user.token_hash]);
      else await pool.query('DELETE FROM sessions WHERE user_id = $1', [id]);
    }
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    send(res, 200, { user: publicUser(rows[0]) });
  }

  async function deleteUser(req, res, user, id) {
    requireRole(user, 'facilitator');
    if (id === user.id) throw new HttpError(400, 'cannot-delete-self');
    const target = (await pool.query('SELECT * FROM users WHERE id = $1', [id])).rows[0];
    if (!target) throw new HttpError(404, 'not-found');
    if (target.role === 'facilitator' && target.active && (await activeFacilitators(id)) === 0) throw new HttpError(400, 'last-facilitator');
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    send(res, 200, { ok: true });
  }

  // ---------------------------------------------------------------- static files

  function serveStatic(req, res, pathname) {
    let rel = decodeURIComponent(pathname).replace(/^\/+/, '');
    if (rel === '' || rel === 'index.html') rel = 'index.html';
    else if (!STATIC_DIRS.some((d) => rel.startsWith(d))) return false;
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(ROOT + path.sep)) return false;
    const type = STATIC_TYPES[path.extname(file).toLowerCase()];
    if (!type) return false;
    let stat;
    try { stat = fs.statSync(file); } catch (e) { return false; }
    if (!stat.isFile()) return false;
    const etag = '"' + stat.size.toString(36) + '-' + stat.mtimeMs.toString(36) + '"';
    const headers = Object.assign({ 'Content-Type': type, 'Cache-Control': 'no-cache', 'ETag': etag }, SECURITY_HEADERS);
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); res.end(); return true; }
    res.writeHead(200, Object.assign(headers, { 'Content-Length': stat.size }));
    if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).pipe(res);
    return true;
  }

  // ---------------------------------------------------------------- router

  async function api(req, res, url) {
    const p = url.pathname.slice('/api/'.length).split('/');
    const m = req.method;

    if (m !== 'GET' && m !== 'HEAD' && req.headers['x-requested-with'] !== 'diag') {
      // Custom header required on writes: blocks cross-site form posts (CSRF).
      throw new HttpError(403, 'csrf');
    }
    if (p[0] === 'health' && m === 'GET') {
      await pool.query('SELECT 1');
      return send(res, 200, { ok: true });
    }
    if (p[0] === 'login' && m === 'POST') return login(req, res);
    if (p[0] === 'logout' && m === 'POST') return logout(req, res);

    const user = await currentUser(req);
    if (p[0] === 'me' && m === 'GET') {
      if (!user) return send(res, 401, { error: 'unauthenticated', server: true });
      return send(res, 200, { user: publicUser(user), server: true });
    }
    requireRole(user);
    if (p[0] === 'password' && m === 'POST') return changeOwnPassword(req, res, user);
    if (p[0] === 'workspace' && m === 'GET') return workspace(req, res, user);
    if (p[0] === 'settings' && m === 'PUT') return putSettings(req, res, user);
    if (p[0] === 'orgs' && p[1] && p.length === 2) {
      if (m === 'PUT') return putOrg(req, res, user, p[1]);
      if (m === 'DELETE') return deleteOrg(req, res, user, p[1]);
    }
    if (p[0] === 'files') {
      if (!p[1] && m === 'POST') return uploadFile(req, res, user, url);
      if (p[1] && m === 'GET') return getFile(req, res, user, p[1]);
      if (p[1] && m === 'DELETE') return deleteFile(req, res, user, p[1]);
    }
    if (p[0] === 'users') {
      if (!p[1] && m === 'GET') return listUsers(req, res, user);
      if (!p[1] && m === 'POST') return createUser(req, res, user);
      const id = Number(p[1]);
      if (p[1] && Number.isInteger(id) && m === 'PATCH') return updateUser(req, res, user, id);
      if (p[1] && Number.isInteger(id) && m === 'DELETE') return deleteUser(req, res, user, id);
    }
    throw new HttpError(404, 'not-found');
  }

  return async function handler(req, res) {
    let url;
    try { url = new URL(req.url, 'http://localhost'); } catch (e) { return send(res, 400, { error: 'bad-url' }); }
    try {
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      if ((req.method === 'GET' || req.method === 'HEAD') && serveStatic(req, res, url.pathname)) return;
      res.writeHead(404, Object.assign({ 'Content-Type': 'text/plain; charset=utf-8' }, SECURITY_HEADERS));
      res.end('Not found');
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.status, { error: e.code });
      console.error(new Date().toISOString(), req.method, url.pathname, e);
      if (!res.headersSent) send(res, 500, { error: 'server-error' });
      else res.end();
    }
  };
}

module.exports = { createApp, HttpError };

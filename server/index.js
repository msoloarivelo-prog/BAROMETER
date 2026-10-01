'use strict';

/*
 * Starts the server.
 *
 * Environment:
 *   DATABASE_URL     postgres://user:password@host:5432/db (required)
 *   PORT             default 8080
 *   ADMIN_EMAIL      first facilitator account, created when no account exists
 *   ADMIN_PASSWORD   its password (at least 8 characters)
 *   ADMIN_NAME       optional display name
 *   COOKIE_SECURE=1  always mark the session cookie Secure (HTTPS only)
 *   TRUST_PROXY=1    behind a reverse proxy (Caddy, nginx): trust X-Forwarded-*
 */
const http = require('http');
const { createPool, migrate, waitForDb } = require('./db.js');
const { createApp } = require('./app.js');
const Auth = require('./auth.js');

async function bootstrapAdmin(pool) {
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM users');
  if (rows[0].n > 0) return;
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || Auth.passwordProblem(password)) {
    console.warn('No account exists yet. Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ characters) and restart, ' +
      'or run: node server/cli.js create-facilitator <email> <password>');
    return;
  }
  await pool.query("INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, 'facilitator')",
    [email, process.env.ADMIN_NAME || 'Facilitateur', await Auth.hashPassword(password)]);
  console.log('Facilitator account created for ' + email);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  const pool = createPool(process.env.DATABASE_URL);
  await waitForDb(pool, 60);
  await migrate(pool);
  await bootstrapAdmin(pool);

  const handler = createApp(pool, {
    secureCookie: process.env.COOKIE_SECURE === '1',
    trustProxy: process.env.TRUST_PROXY === '1'
  });
  const port = Number(process.env.PORT) || 8080;
  const server = http.createServer(handler);
  server.listen(port, () => console.log('Outil de Diagnostic Organisationnel listening on port ' + port));

  // Remove expired sessions every hour.
  setInterval(() => { pool.query('DELETE FROM sessions WHERE expires_at < now()').catch(() => {}); }, 3600 * 1000).unref();

  const stop = () => { server.close(() => pool.end().then(() => process.exit(0))); setTimeout(() => process.exit(0), 5000).unref(); };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

main().catch((e) => { console.error(e); process.exit(1); });

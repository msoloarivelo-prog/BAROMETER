'use strict';

/*
 * Account administration from the command line (for example when every
 * facilitator password is lost).
 *
 *   node server/cli.js create-facilitator <email> <password> [name]
 *   node server/cli.js set-password <email> <password>
 *   node server/cli.js list-users
 *
 * With Docker:  docker compose exec app node server/cli.js list-users
 */
const { createPool, migrate } = require('./db.js');
const Auth = require('./auth.js');

async function main() {
  const [cmd, email, password, name] = process.argv.slice(2);
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = createPool(process.env.DATABASE_URL);
  try {
    await migrate(pool);
    if (cmd === 'create-facilitator' || cmd === 'set-password') {
      const mail = String(email || '').trim().toLowerCase();
      const problem = Auth.passwordProblem(password);
      if (!mail || problem) throw new Error('Usage: ' + cmd + ' <email> <password (8+ characters)>');
      const hash = await Auth.hashPassword(password);
      if (cmd === 'create-facilitator') {
        await pool.query("INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, 'facilitator') " +
          "ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'facilitator', org_id = NULL, active = TRUE",
          [mail, name || 'Facilitateur', hash]);
        console.log('Facilitator account ready: ' + mail);
      } else {
        const r = await pool.query('UPDATE users SET password_hash = $2, active = TRUE WHERE email = $1', [mail, hash]);
        if (!r.rowCount) throw new Error('No account with e-mail ' + mail);
        await pool.query('DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = $1)', [mail]);
        console.log('Password changed for ' + mail);
      }
    } else if (cmd === 'list-users') {
      const { rows } = await pool.query('SELECT email, name, role, org_id, active, last_login FROM users ORDER BY role, email');
      rows.forEach((u) => console.log([u.role, u.email, u.name, u.org_id || '', u.active ? 'active' : 'disabled', u.last_login ? u.last_login.toISOString() : ''].join('\t')));
    } else {
      console.log('Commands: create-facilitator <email> <password> [name] | set-password <email> <password> | list-users');
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });

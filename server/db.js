'use strict';

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function createPool(connectionString) {
  return new Pool({ connectionString: connectionString, max: 10 });
}

/** Creates the tables if needed (the schema is idempotent). */
async function migrate(pool) {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

/** Waits for the database to accept connections (useful at container start). */
async function waitForDb(pool, attempts) {
  let last;
  for (let i = 0; i < (attempts || 30); i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw last;
}

module.exports = { createPool, migrate, waitForDb };

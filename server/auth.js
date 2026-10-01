'use strict';

/*
 * Password hashing (scrypt, built into Node) and session tokens.
 */
const crypto = require('crypto');

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

function scrypt(password, salt, n, r, p) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEYLEN, { N: n, r: r, p: p, maxmem: 64 * 1024 * 1024 }, (err, key) => {
      if (err) reject(err); else resolve(key);
    });
  });
}

/** Returns "scrypt$N$r$p$salt$hash" (base64 parts). */
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(String(password), salt, N, R, P);
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const expected = Buffer.from(parts[5], 'base64');
  const key = await scrypt(String(password), Buffer.from(parts[4], 'base64'), Number(parts[1]), Number(parts[2]), Number(parts[3]));
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

// Used when the e-mail is unknown, so that the response time does not reveal
// whether an account exists.
let dummyHash = null;
async function dummyVerify(password) {
  if (!dummyHash) dummyHash = await hashPassword('dummy-password');
  await verifyPassword(password, dummyHash);
  return false;
}

function newToken() { return crypto.randomBytes(32).toString('base64url'); }

function hashToken(token) { return crypto.createHash('sha256').update(String(token)).digest('hex'); }

const MIN_PASSWORD = 8;

function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) return 'password-too-short';
  if (password.length > 200) return 'password-too-long';
  return null;
}

module.exports = { hashPassword, verifyPassword, dummyVerify, newToken, hashToken, passwordProblem, MIN_PASSWORD };

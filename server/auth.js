// Login for when the books are reached over a network or the internet.
// Switched on by setting BOOKS_USER and BOOKS_PASSWORD (in a .env file next to package.json, or the host's settings).
// Without them the app stays as before: open, and only reachable from this computer.
import crypto from 'node:crypto';

const COOKIE = 'books_session';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FAILURES = 8;
const LOCKOUT_MS = 15 * 60 * 1000;

// Read when needed, so a .env file loaded at start-up is seen.
const user = () => process.env.BOOKS_USER ?? '';
const password = () => process.env.BOOKS_PASSWORD ?? '';
export const authEnabled = () => !!(user() && password());

// Signing key for login cookies. Set BOOKS_SESSION_SECRET to keep people logged in across restarts.
let generatedSecret;
const secret = () => process.env.BOOKS_SESSION_SECRET || (generatedSecret ??= crypto.randomBytes(32).toString('hex'));

const sign = value => crypto.createHmac('sha256', secret()).update(value).digest('base64url');
const sameText = (a, b) => {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};

function readCookie(req) {
  const header = req.headers.cookie ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE) return v.join('=');
  }
  return '';
}

/** The logged-in user name, or null. */
export function sessionUser(req) {
  const token = readCookie(req);
  const [name, expires, signature] = token.split('.');
  if (!name || !expires || !signature) return null;
  if (!sameText(signature, sign(`${name}.${expires}`))) return null;
  if (Number(expires) < Date.now()) return null;
  const decoded = Buffer.from(name, 'base64url').toString('utf8');
  return decoded === user() ? decoded : null;
}

const isHttps = req => req.headers['x-forwarded-proto'] === 'https' || !!req.socket?.encrypted;

function setCookie(res, req, value, maxAgeMs) {
  const parts = [`${COOKIE}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${Math.floor(maxAgeMs / 1000)}`];
  if (isHttps(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

// Slows down password guessing: too many wrong tries from one address locks it out for a while.
const failures = new Map();
// The last forwarded address is the one the host's proxy added, so it cannot be faked by the visitor.
const clientAddress = req => String(req.headers['x-forwarded-for'] ?? '').split(',').map(x => x.trim()).filter(Boolean).at(-1) || req.socket?.remoteAddress || 'unknown';
// A cap across everyone too, in case guesses come from many addresses.
const ALL = '*';
const MAX_FAILURES_ALL = 40;

export function lockedOutFor(req) {
  const all = failures.get(ALL);
  if (all && all.count >= MAX_FAILURES_ALL) {
    const left = all.since + LOCKOUT_MS - Date.now();
    if (left > 0) return left;
    failures.delete(ALL);
  }
  const f = failures.get(clientAddress(req));
  if (!f || f.count < MAX_FAILURES) return 0;
  const left = f.since + LOCKOUT_MS - Date.now();
  if (left <= 0) { failures.delete(clientAddress(req)); return 0; }
  return left;
}

/** Checks a login attempt. On success sets the session cookie and returns true. */
export function tryLogin(req, res, name, pass) {
  const ok = sameText(name ?? '', user()) & sameText(pass ?? '', password());
  const key = clientAddress(req);
  if (!ok) {
    for (const k of [key, ALL]) {
      const f = failures.get(k);
      failures.set(k, f && Date.now() - f.since < LOCKOUT_MS ? { count: f.count + 1, since: f.since } : { count: 1, since: Date.now() });
    }
    return false;
  }
  failures.delete(key);
  const expires = String(Date.now() + SESSION_MS);
  const encoded = Buffer.from(user(), 'utf8').toString('base64url');
  setCookie(res, req, `${encoded}.${expires}.${sign(`${encoded}.${expires}`)}`, SESSION_MS);
  return true;
}

export function logout(req, res) {
  setCookie(res, req, '', 0);
}

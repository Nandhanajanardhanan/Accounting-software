// The small API the screens save through. Used by both `npm run dev` and server/index.js.
import * as store from './books-db.js';
import { authEnabled, lockedOutFor, logout, sessionUser, tryLogin } from './auth.js';

const MAX_BODY_BYTES = 200 * 1024 * 1024;

const send = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
};

const readBody = req => new Promise((resolve, reject) => {
  const chunks = [];
  let size = 0;
  req.on('data', chunk => {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      reject(new Error('Data is too large to save.'));
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  req.on('error', reject);
});

// Your accounts are only served to this computer, so a web page elsewhere cannot reach them by address tricks.
const isLocalHost = req => /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(req.headers.host ?? '');

async function handleAuth(req, res, path) {
  if (req.method === 'GET' && path === 'me') {
    send(res, 200, { required: authEnabled(), user: authEnabled() ? sessionUser(req) : null });
    return;
  }
  if (req.method === 'POST' && path === 'login') {
    if (!authEnabled()) { send(res, 200, { ok: true }); return; }
    const wait = lockedOutFor(req);
    if (wait) { send(res, 429, { error: `Too many wrong attempts. Try again in ${Math.ceil(wait / 60000)} minutes.` }); return; }
    let body = {};
    try { body = JSON.parse(await readBody(req)); } catch { /* treated as a wrong login */ }
    if (tryLogin(req, res, body.username, body.password)) send(res, 200, { ok: true, user: body.username });
    else send(res, 401, { error: 'Wrong user name or password.' });
    return;
  }
  if (req.method === 'POST' && path === 'logout') {
    logout(req, res);
    send(res, 200, { ok: true });
    return;
  }
  send(res, 404, { error: 'Unknown request.' });
}

export async function handleBooksApi(req, res) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname.startsWith('/api/auth/')) {
    try { await handleAuth(req, res, url.pathname.slice('/api/auth/'.length)); } catch (err) { send(res, 500, { error: err instanceof Error ? err.message : 'Could not complete that.' }); }
    return true;
  }
  if (!url.pathname.startsWith('/api/books/')) return false;
  if (authEnabled()) {
    // Online: every request needs a valid login.
    if (!sessionUser(req)) { send(res, 401, { error: 'Please log in.', login: true }); return true; }
  } else if (!isLocalHost(req)) {
    send(res, 403, { error: 'This data is only available on this computer.' });
    return true;
  }

  const parts = url.pathname.slice('/api/books/'.length).split('/').map(decodeURIComponent);
  try {
    if (req.method === 'GET' && parts[0] === 'state') {
      send(res, 200, { companies: store.listCompanies(), activeId: store.getActiveId(), storage: store.storageInfo() });
      return true;
    }
    if (req.method === 'PUT' && parts[0] === 'active') {
      const { id } = JSON.parse(await readBody(req));
      store.setActiveId(id);
      send(res, 200, { ok: true });
      return true;
    }
    if (parts[0] === 'company' && parts[1]) {
      const id = parts[1];
      if (req.method === 'GET') {
        const json = store.getCompany(id);
        if (json) send(res, 200, json);
        else send(res, 404, { error: 'No such business.' });
        return true;
      }
      if (req.method === 'PUT') {
        const json = await readBody(req);
        const parsed = JSON.parse(json);
        if (parsed?.version !== 2 || parsed?.company?.id !== id || !Array.isArray(parsed.ledgers) || !Array.isArray(parsed.vouchers)) {
          send(res, 400, { error: 'That is not a valid set of books.' });
          return true;
        }
        send(res, 200, { ok: true, updatedAt: store.saveCompany(id, parsed.company.name, json) });
        return true;
      }
      if (req.method === 'DELETE') {
        store.deleteCompany(id);
        send(res, 200, { ok: true });
        return true;
      }
    }
    if (req.method === 'GET' && parts[0] === 'restore-points' && parts[1]) {
      if (parts[2]) {
        const json = store.getRestorePoint(parts[1], parts[2]);
        if (json) send(res, 200, json);
        else send(res, 404, { error: 'No restore point for that day.' });
      } else {
        send(res, 200, store.listRestorePoints(parts[1]));
      }
      return true;
    }
    send(res, 404, { error: 'Unknown request.' });
  } catch (err) {
    console.error('[books api]', err);
    send(res, 500, { error: err instanceof Error ? err.message : 'Could not complete that.' });
  }
  return true;
}

export const booksApiPlugin = () => {
  const attach = server => {
    server.middlewares.use(async (req, res, next) => {
      if (!(await handleBooksApi(req, res))) next();
    });
  };
  return { name: 'books-api', configureServer: attach, configurePreviewServer: attach };
};

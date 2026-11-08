// Runs the finished app: serves the screens and the API on this computer only.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Settings such as the login (BOOKS_USER, BOOKS_PASSWORD) can live in a .env file next to package.json.
if (fs.existsSync(path.join(ROOT, '.env'))) process.loadEnvFile(path.join(ROOT, '.env'));

const { handleBooksApi } = await import('./books-api.js');
const { DB_PATH } = await import('./books-db.js');
const { authEnabled } = await import('./auth.js');

const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 3001;
// Only this computer by default. A host (HOST=0.0.0.0) is allowed only with a login set.
const HOST = process.env.HOST || '127.0.0.1';
if (HOST !== '127.0.0.1' && HOST !== 'localhost' && !authEnabled()) {
  console.error('Refusing to open the books to the network without a login. Set BOOKS_USER and BOOKS_PASSWORD first.');
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

const server = http.createServer(async (req, res) => {
  if (await handleBooksApi(req, res)) return;
  const urlPath = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  let file = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath);
  // Nothing outside the built app is ever served.
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  if (!fs.existsSync(file)) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('The app has not been built yet. Run: npm run build');
    return;
  }
  res.setHeader('Content-Type', TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  fs.createReadStream(file).pipe(res);
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.log(`The app is already running at http://localhost:${PORT}`);
    process.exit(0);
  }
  throw err;
});

server.listen(PORT, HOST, () => {
  console.log(`Your books are open at http://localhost:${PORT}${authEnabled() ? ` (login required for ${process.env.BOOKS_USER})` : ''}`);
  console.log(`Saved in ${DB_PATH}`);
  console.log('Keep this window open while you work. Close it to stop.');
});

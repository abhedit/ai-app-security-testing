import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { createApi } from './api.js';

const api = createApi();
const root = resolve('dist');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
createServer((req, res) => {
  const staticFile = () => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const file = resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
      if (!['GET', 'HEAD'].includes(req.method) || !file.startsWith(root + sep) || !statSync(file).isFile()) throw new Error();
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
      if (req.method === 'HEAD') return res.end();
      createReadStream(file).on('error', () => res.destroy()).pipe(res);
    } catch {
      res.writeHead(404).end('Not found');
    }
  };
  api(req, res, staticFile).catch(() => {
    if (res.headersSent) return res.destroy();
    res.writeHead(500).end('Unexpected server error');
  });
}).listen(Number(process.env.PORT || 4173), process.env.HOST || '127.0.0.1');

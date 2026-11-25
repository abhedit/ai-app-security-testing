import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { checks, evaluate, sampleFixtures, validateFixtures } from './checks.js';

const artifacts = ['Response schema', 'Tool permission inventory', 'Data handling policy', 'Human approval workflow', 'Release evaluation manifest'];
const fixtureBodyLimit = 128 * 1024;

async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size <= fixtureBodyLimit) chunks.push(chunk);
  }
  if (size > fixtureBodyLimit) throw new Error('The upload exceeds 128 KB.');
  try { return JSON.parse(Buffer.concat(chunks)); }
  catch { throw new Error('Provide valid JSON.'); }
}

export function createApi(path = process.env.AEGIS_DB || '.data/workspace.sqlite') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS workspace (id TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS release (
      workspace_id TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL,
      PRIMARY KEY (workspace_id, id)
    );
  `);
  const findWorkspace = db.prepare('SELECT id FROM workspace WHERE id = ?');
  const addWorkspace = db.prepare('INSERT INTO workspace VALUES (?)');
  const list = db.prepare('SELECT data FROM release WHERE workspace_id = ? ORDER BY rowid DESC');
  const get = db.prepare('SELECT data FROM release WHERE workspace_id = ? AND id = ?');
  const save = db.prepare('INSERT INTO release VALUES (?, ?, ?) ON CONFLICT(workspace_id, id) DO UPDATE SET data=excluded.data');

  return async function api(req, res, next) {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) return next();
    const respond = (status, value) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(JSON.stringify(value));
    };
    if (req.method === 'POST' && (!req.headers['content-type']?.startsWith('application/json') || req.headers['sec-fetch-site'] === 'cross-site')) {
      return respond(415, { error: 'Send a same-site JSON request.' });
    }

    let workspace = req.headers.cookie?.match(/(?:^|;\s*)aegis=([a-f\d-]{36})(?:;|$)/)?.[1];
    if (!workspace || !findWorkspace.get(workspace)) {
      workspace = randomUUID();
      const sample = { id: randomUUID(), title: 'Support Assistant', version: 'v2.8', date: '2026-11-24', team: 'AppSec, AI Engineering', artifacts, fixtures: sampleFixtures, owners: {}, sample: true };
      db.exec('BEGIN');
      try {
        addWorkspace.run(workspace);
        save.run(workspace, sample.id, JSON.stringify(sample));
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
      const secure = req.socket.encrypted || process.env.AEGIS_SECURE_COOKIE === '1';
      res.setHeader('Set-Cookie', 'aegis=' + workspace + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000' + (secure ? '; Secure' : ''));
    }

    const withResults = release => ({ ...release, results: evaluate(release.fixtures) });
    try {
      if (url.pathname === '/api/releases' && req.method === 'GET') {
        return respond(200, list.all(workspace).map(row => withResults(JSON.parse(row.data))));
      }
      if (url.pathname === '/api/releases' && req.method === 'POST') {
        const body = await readBody(req);
        const text = (key, max) => {
          if (typeof body?.[key] !== 'string' || !body[key].trim() || body[key].length > max) {
            throw new Error('Enter a valid ' + key + '.');
          }
          return body[key].trim();
        };
        const release = { id: randomUUID(), title: text('title', 100), version: text('version', 40), team: text('team', 100),
          date: new Date().toISOString().slice(0, 10), artifacts: [], fixtures: validateFixtures(body.fixtures), owners: {}, sample: false };
        save.run(workspace, release.id, JSON.stringify(release));
        return respond(201, withResults(release));
      }

      const match = url.pathname.match(/^\/api\/releases\/([a-f\d-]{36})\/(owners|fixtures)$/);
      if (match && req.method === 'POST') {
        const body = await readBody(req);
        const stored = get.get(workspace, match[1]);
        if (!stored) return respond(404, { error: 'Release not found.' });
        const release = JSON.parse(stored.data);
        if (match[2] === 'fixtures') {
          release.fixtures = validateFixtures(body?.fixtures);
        } else {
          if (!checks.some(check => check.id === body?.check) || typeof body.owner !== 'string' || !body.owner.trim() || body.owner.length > 100) {
            throw new Error('Select a check and enter a valid owner.');
          }
          release.owners[body.check] = body.owner.trim();
        }
        save.run(workspace, release.id, JSON.stringify(release));
        return respond(200, withResults(release));
      }
      return respond(404, { error: 'Endpoint not found.' });
    } catch (error) {
      const status = error.code?.startsWith('ERR_SQLITE') ? 500 : 400;
      return respond(status, { error: status === 500 ? 'Unable to save the workspace.' : error.message });
    }
  };
}

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApi } from './api.js';

test('creates, reevaluates and assigns releases within the originating workspace', async t => {
  const api = createApi(':memory:');
  const server = createServer((req, res) => api(req, res, () => res.writeHead(404).end()));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());
  const base = 'http://127.0.0.1:' + server.address().port + '/api/releases';
  const initial = await fetch(base);
  const cookie = initial.headers.get('set-cookie').split(';')[0];
  const fixtures = [{ name: 'Approval', humanApprovalEnforced: false }];
  const post = (suffix, data, session = cookie) => fetch(base + suffix, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: session }, body: JSON.stringify(data),
  });
  const created = await post('', { title: 'Billing Assistant', version: 'v1', team: 'AppSec', fixtures });
  assert.equal(created.status, 201);
  const release = await created.json();
  assert.equal(release.results.at(-1).status, 'Failed');
  const endpoint = '/' + release.id;
  assert.equal((await post(endpoint + '/owners', { check: 'approval', owner: 'AppSec' }, '')).status, 404);
  assert.equal((await post(endpoint + '/owners', { check: 'approval', owner: 'AppSec' })).status, 200);
  const rerun = await post(endpoint + '/fixtures', { fixtures: [{ ...fixtures[0], humanApprovalEnforced: true }] });
  const updated = await rerun.json();
  assert.equal(updated.results.at(-1).status, 'Passed');
  assert.equal(updated.owners.approval, 'AppSec');
});

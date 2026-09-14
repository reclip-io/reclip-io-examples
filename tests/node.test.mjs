import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { client, configuration, readRequest, submit, wait } from '../examples/node/reclip-client.mjs';
const jobId = '00000000-0000-4000-8000-000000000002';
const request = { tool: 'mp4_to_mp3', input: { asset_id: jobId, file_name: 'source.mp4', operation: 'extract_mp3' }, maximum_credits: 20 };
function fake() {
  const api = { base: 'https://example.test/api/v1', calls: [], cost: 10, key: 'key-1', fail: false,
    async call(method, path, body, idempotency) {
      this.calls.push({ method, path, body, idempotency });
      if (path === '/me') return { workspace_id: 'workspace-1', key_id: this.key };
      if (path === '/jobs/quote') return { estimated_credits: this.cost, affordable: true };
      if (path === '/jobs') {
        if (this.fail) throw new Error('Response lost');
        return { id: jobId };
      }
      return { id: jobId, status: this.status || 'succeeded', outputs: [] };
    },
  };
  return api;
}
async function temp(t) {
  const dir = await mkdtemp(join(tmpdir(), 'reclip-node-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return join(dir, 'job.state.json');
}
test('replaying an accepted job does not quote or submit twice', async t => {
  const path = await temp(t), api = fake();
  await submit(api, request, path);
  assert.equal((await submit(api, request, path)).replayed, true);
  assert.equal(api.calls.filter(c => c.path === '/jobs').length, 1);
  assert.equal(api.calls.filter(c => c.path === '/jobs/quote').length, 1);
});
test('uncertain submit persists its key before request and reuses it', async t => {
  const path = await temp(t), api = fake();
  api.fail = true;
  await assert.rejects(submit(api, request, path));
  const state = JSON.parse(await readFile(path));
  api.fail = false;
  await submit(api, request, path);
  assert.deepEqual(api.calls.filter(c => c.path === '/jobs').map(c => c.idempotency), [state.idempotency_key, state.idempotency_key]);
});
test('identity and changed-body conflicts do not create a replacement', async t => {
  const path = await temp(t), api = fake();
  await submit(api, request, path);
  api.key = 'rotated';
  await assert.rejects(submit(api, request, path), /does not match/);
  api.key = 'key-1';
  await assert.rejects(submit(api, { ...request, maximum_credits: 21 }, path), /does not match/);
  assert.equal(api.calls.filter(c => c.path === '/jobs').length, 1);
});
test('JSON object-key order does not change request identity', async t => {
  const path = await temp(t), api = fake();
  await submit(api, request, path);
  assert.equal((await submit(api, { maximum_credits: 20, input: request.input, tool: request.tool }, path)).replayed, true);
});
test('budget refusal creates no job', async t => {
  const path = await temp(t), api = fake();
  api.cost = 21;
  await assert.rejects(submit(api, request, path), /budget/);
  assert.equal(api.calls.filter(c => c.path === '/jobs').length, 0);
});
test('corrupt state and existing lock are not overwritten', async t => {
  const path = await temp(t), api = fake();
  await writeFile(path, '{bad');
  await assert.rejects(submit(api, request, path), /saved state/);
  assert.equal(await readFile(path, 'utf8'), '{bad');
  await writeFile(path + '.lock', '');
  await assert.rejects(submit(api, request, path), /locked/);
});
test('input cap is never widened', async t => {
  const path = await temp(t);
  await writeFile(path, JSON.stringify(request));
  assert.equal((await readRequest(path, 40)).maximum_credits, 20);
  assert.equal((await readRequest(path, 5)).maximum_credits, 5);
  await assert.rejects(readRequest(path, -1));
});
test('poll terminal failures never create jobs', async () => {
  const api = fake();
  assert.equal((await wait(api, jobId)).status, 'succeeded');
  for (const status of ['failed', 'canceled', 'unexpected']) {
    api.status = status;
    await assert.rejects(wait(api, jobId), /failed, canceled/);
  }
  assert.ok(api.calls.every(c => c.method === 'GET'));
});
test('poll timeout is bounded and resumes by ID', async () => {
  const api = fake();
  api.status = 'running';
  const start = Date.now();
  await assert.rejects(wait(api, jobId, 1, 20), /timed out/);
  assert.ok(Date.now() - start < 2000);
});
test('API auth and redirect policy are explicit', async () => {
  let observed;
  const api = client({ RECLIP_API_KEY: 'test-key' }, async (url, opts) => {
    observed = { url, opts };
    return new Response('{"ok":true}', { headers: { 'Content-Type': 'application/json' } });
  });
  await api.call('GET', '/me');
  assert.equal(observed.opts.headers.Authorization, 'Bearer test-key');
  assert.equal(observed.opts.redirect, 'error');
  assert.equal(observed.url, 'https://www.reclip.io/api/v1/me');
  await assert.rejects(api.call('GET', '/../../outside'), /Unsupported/);
});
test('real HTTP redirects never receive a second authenticated request', async t => {
  const paths = [];
  const server = createServer((req, res) => { paths.push(req.url); res.writeHead(302, { Location: '/leak' }); res.end(); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const api = client({ RECLIP_API_KEY: 'test-key', RECLIP_API_BASE_URL: `http://127.0.0.1:${server.address().port}/api/v1` });
  await assert.rejects(api.call('GET', '/me'), /Transport outcome uncertain/);
  assert.deepEqual(paths, ['/api/v1/me']);
});
test('errors do not echo provider bodies or credential values', async () => {
  const api = client({ RECLIP_API_KEY: 'SECRET' }, async () => new Response('SECRET', { status: 403 }));
  await assert.rejects(api.call('GET', '/me'), error => !error.message.includes('SECRET') && error.message.includes('403'));
});
test('base origin policy rejects cleartext remote and embedded credentials', () => {
  for (const base of ['http://example.com/api/v1', 'https://key@example.com/api/v1', 'https://example.com/api/v1?q=x']) {
    assert.throws(() => configuration({ RECLIP_API_KEY: 'test', RECLIP_API_BASE_URL: base }));
  }
});

test('rate-limit guidance retains server delay without automatically retrying', async () => {
  let calls = 0;
  const api = client({ RECLIP_API_KEY: 'test' }, async () => {
    calls++;
    return new Response('{}', { status: 429, headers: { 'Retry-After': '120' } });
  });
  await assert.rejects(api.call('GET', '/me'), /Wait at least 120 seconds/);
  assert.equal(calls, 1);
});

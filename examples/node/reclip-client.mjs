import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';

export function configuration(env = process.env) {
  const key = env.RECLIP_API_KEY;
  if (!key || /\s/.test(key)) throw new Error('Set RECLIP_API_KEY through your environment or secret manager.');
  const base = (env.RECLIP_API_BASE_URL || 'https://www.reclip.io/api/v1').replace(/\/+$/, '');
  const url = new URL(base);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/api/v1' ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) {
    throw new Error('Use an HTTPS API origin ending in /api/v1; HTTP is loopback-only.');
  }
  return { key, base };
}
export function integer(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Credit limits must be nonnegative safe integers.');
  return value;
}
const id = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const routes = {
  GET: new RegExp(`^/(me|tools|usage|tools/[a-z_]+(?:/catalog)?|jobs/${id})$`),
  POST: /^\/jobs(?:\/quote)?$/,
};
export function client(env = process.env, fetcher = fetch) {
  const { key, base } = configuration(env);
  return {
    base,
    async call(method, path, body, idempotency, timeout = 30000) {
      if (!routes[method]?.test(path)) throw new Error('Unsupported example endpoint.');
      const data = body === undefined ? undefined : JSON.stringify(body);
      if (data && Buffer.byteLength(data) > 1536 * 1024) throw new Error('Request exceeds 1.5 MiB.');
      if (path === '/jobs' && (!idempotency || !/^[A-Za-z0-9:_-]{8,160}$/.test(idempotency))) throw new Error('Saved idempotency key required.');
      const headers = { Authorization: `Bearer ${key}`, Accept: 'application/json' };
      if (data) headers['Content-Type'] = 'application/json';
      if (idempotency) headers['Idempotency-Key'] = idempotency;
      let response;
      try {
        response = await fetcher(base + path, { method, body: data, headers, redirect: 'error', signal: AbortSignal.timeout(Math.max(1, Math.ceil(timeout))) });
      } catch {
        throw new Error('Transport outcome uncertain. Resume the identical request with the same state file.');
      }
      if (!response.ok) {
        await response.body?.cancel();
        const retry = response.headers.get('retry-after');
        const delay = retry ? (/^\d+(?:\.\d+)?$/.test(retry) ? Number(retry) : (Date.parse(retry) - Date.now()) / 1000) : NaN;
        const guidance = Number.isFinite(delay) ? ` Wait at least ${Math.max(0, Math.ceil(delay))} seconds before resuming.` : '';
        throw new Error(`API HTTP ${response.status}.${guidance} No automatic replacement job was submitted.`);
      }
      const reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 16 * 1024 * 1024) throw new Error('API response exceeds 16 MiB.');
          chunks.push(value);
        }
      } catch {
        await reader.cancel().catch(() => {});
        throw new Error('Response interrupted or oversized. Preserve state before retrying.');
      }
      let result;
      try { result = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new Error('API returned invalid JSON.'); }
      if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Expected an API object response.');
      return result;
    },
  };
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
export async function readRequest(path, cap) {
  const text = await readFile(path, 'utf8');
  if (Buffer.byteLength(text) > 1536 * 1024) throw new Error('Request exceeds 1.5 MiB.');
  let body;
  try { body = JSON.parse(text); } catch { throw new Error('Invalid request JSON.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || !body.tool || !body.input) throw new Error('Expected a job object with tool and input.');
  if (cap !== undefined) body.maximum_credits = Math.min(integer(cap), integer(body.maximum_credits ?? cap));
  return body;
}
async function save(path, state) {
  const temp = `${path}.${randomUUID()}.tmp`;
  const file = await open(temp, 'wx', 0o600);
  try {
    await file.writeFile(JSON.stringify(state, null, 2));
    await file.sync();
  } finally { await file.close(); }
  try { await rename(temp, path); } finally { await unlink(temp).catch(() => {}); }
}
export async function submit(api, body, path) {
  const budget = integer(body.maximum_credits);
  await mkdir(dirname(path), { recursive: true });
  let lock;
  try { lock = await open(`${path}.lock`, 'wx', 0o600); }
  catch { throw new Error('State is locked. Confirm no process is running and reconcile saved state before removing a stale lock.'); }
  try {
    const identity = await api.call('GET', '/me');
    if (!identity.key_id || !identity.workspace_id) throw new Error('Invalid API identity.');
    const context = { base: api.base, workspace_id: identity.workspace_id, key_id: identity.key_id };
    const digest = createHash('sha256').update(JSON.stringify(canonical(body))).digest('hex');
    let state;
    try { state = JSON.parse(await readFile(path, 'utf8')); }
    catch (e) { if (e.code !== 'ENOENT') throw new Error('Cannot read saved state; preserve it for reconciliation.'); }
    if (state) {
      if (state.digest !== digest || JSON.stringify(state.context) !== JSON.stringify(context)) throw new Error('State does not match this request, API origin, workspace or key.');
      if (state.job_id) return { id: state.job_id, replayed: true };
    } else {
      const quote = await api.call('POST', '/jobs/quote', body);
      if (!Number.isFinite(quote.estimated_credits) || quote.estimated_credits < 0 || quote.estimated_credits > budget || quote.affordable !== true) throw new Error('Quote exceeds authorized budget or available balance. No job submitted.');
      state = { version: 1, context, digest, request: body, idempotency_key: randomUUID() };
      await save(path, state);
    }
    const accepted = await api.call('POST', '/jobs', body, state.idempotency_key);
    if (!(new RegExp(`^${id}$`)).test(accepted.id)) throw new Error('Unexpected job ID; preserve state to resume.');
    state.job_id = accepted.id;
    await save(path, state);
    return accepted;
  } finally { await lock.close(); await unlink(`${path}.lock`); }
}
export async function wait(api, jobId, timeoutSeconds = 1800, interval = 5000) {
  if (!Number.isSafeInteger(timeoutSeconds) || timeoutSeconds < 1 || timeoutSeconds > 86400) throw new Error('Timeout must be 1–86400 seconds.');
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    const job = await api.call('GET', `/jobs/${jobId}`, undefined, undefined, Math.min(30000, deadline - Date.now()));
    if (job.status === 'succeeded') return job;
    if (!['queued', 'running'].includes(job.status)) throw new Error('Job failed, canceled, or returned an unknown status. No replacement was submitted.');
    await new Promise(resolve => setTimeout(resolve, Math.min(interval, Math.max(0, deadline - Date.now()))));
  }
  throw new Error('Polling timed out. Resume with the same job ID; the job was not canceled.');
}
export async function report(fn) {
  try { console.log(JSON.stringify(await fn(), null, 2)); }
  catch (error) { console.error(error instanceof Error ? error.message : 'Example failed. Preserve state.'); process.exitCode = 1; }
}

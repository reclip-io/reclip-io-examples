import { client, report, wait } from './reclip-client.mjs';
await report(async () => {
  const [id, timeout = '1800'] = process.argv.slice(2);
  if (!id) throw new Error('Usage: node 03-wait.mjs JOB_ID [TIMEOUT_SECONDS]');
  return wait(client(), id, Number(timeout));
});

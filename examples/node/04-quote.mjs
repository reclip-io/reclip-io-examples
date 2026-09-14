import { client, readRequest, report } from './reclip-client.mjs';
await report(async () => {
  const [path] = process.argv.slice(2);
  if (!path) throw new Error('Usage: node 04-quote.mjs REQUEST.json');
  return client().call('POST', '/jobs/quote', await readRequest(path));
});

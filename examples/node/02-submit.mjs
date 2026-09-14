import { client, integer, readRequest, report, submit } from './reclip-client.mjs';
await report(async () => {
  const [request, state, budget] = process.argv.slice(2);
  if (!request || !state || budget === undefined) throw new Error('Usage: node 02-submit.mjs REQUEST.json STATE.json MAXIMUM_CREDITS');
  return submit(client(), await readRequest(request, integer(Number(budget))), state);
});

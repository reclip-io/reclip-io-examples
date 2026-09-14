import { client, report } from './reclip-client.mjs';
await report(async () => {
  const api = client();
  return { identity: await api.call('GET', '/me'), tools: await api.call('GET', '/tools'), usage: await api.call('GET', '/usage') };
});

// Read-only deployment check: no upload, quote or job creation.
import { client, report } from '../examples/node/reclip-client.mjs';
await report(async () => {
  const api = client();
  const identity = await api.call('GET', '/me');
  const tools = await api.call('GET', '/tools');
  const usage = await api.call('GET', '/usage');
  if (identity.api_eligible !== true || !identity.workspace_id || !Array.isArray(tools.data) || !usage) throw new Error('Unexpected live API contract.');
  return { read_only_checks: 'passed', tools_visible: tools.data.length, paid_execution_tested: false };
});

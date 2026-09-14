import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error(`${command} validation failed`);
}
function walk(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => {
    if (['.git', '__pycache__', 'node_modules'].includes(entry.name)) return [];
    const full = join(path, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
const files = walk(root);
for (const file of files) {
  if (file.endsWith('.mjs')) run(process.execPath, ['--check', file]);
  if (file.endsWith('.sh')) run('bash', ['-n', file]);
  if (file.endsWith('.md')) {
    for (const [, link] of readFileSync(file, 'utf8').matchAll(/\]\(([^)]+)\)/g)) {
      if (link.includes('://') || link.startsWith('#')) continue;
      const target = resolve(dirname(file), link.split('#')[0]);
      if (relative(root, target).startsWith('..') || !existsSync(target)) throw new Error(`Invalid document link in ${relative(root, file)}: ${link}`);
    }
  }
}
const catalog = JSON.parse(readFileSync(join(root, 'lib/reclip/references/tool-catalog.json')));
const operations = JSON.parse(readFileSync(join(root, 'lib/reclip/references/operations.json')));
if (catalog.tools.length !== 24 || operations.operations.length !== 23 || catalog.source.commit !== operations.source.commit) throw new Error('Inconsistent API snapshots');
for (const route of ['GET /me', 'GET /tools', 'GET /usage', 'POST /jobs/quote', 'POST /jobs', 'GET /jobs/{id}']) {
  if (!operations.operations.some(o => `${o.method} ${o.path}` === route)) throw new Error(`Missing contract route ${route}`);
}
run('python3', ['-m', 'compileall', '-q', 'examples/python', 'lib', 'tests']);
run('python3', ['-m', 'unittest', 'discover', '-s', 'tests', '-v']);
run(process.execPath, ['--test', 'tests/node.test.mjs']);
console.log('Offline examples, language syntax, links and pinned API references passed. Go tests run separately in CI.');

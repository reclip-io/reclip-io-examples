import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { integer } from './reclip-client.mjs';

const templates = new URL('../platforms/', import.meta.url);
export const platformExamples = JSON.parse(await readFile(new URL('index.json', templates), 'utf8')).guides;

function sourceUrl(platform, value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Supply a supported HTTPS video URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) {
    throw new Error('Use an HTTPS video URL without embedded credentials or a custom port.');
  }
  const hostname = url.hostname.toLowerCase();
  const belongsTo = domain => hostname === domain || hostname.endsWith(`.${domain}`);
  const matches = platform === 'youtube'
    ? belongsTo('youtube.com') || belongsTo('youtu.be')
    : platform === 'tiktok'
      ? belongsTo('tiktok.com')
      : platform === 'instagram'
        ? belongsTo('instagram.com')
        : belongsTo('twitch.tv') && /^\/videos\/\d+\/?$/.test(url.pathname);
  if (!matches) throw new Error(`The video URL does not match the ${platform} source contract.`);
  return url.toString();
}

/** Build a request offline. The existing quote/submit clients perform all API calls. */
export async function platformRequest(slug, url, maximumCredits) {
  const example = platformExamples.find(item => item.slug === slug);
  if (!example) throw new Error('Unknown platform API example. Run with --list for supported choices.');
  const input = JSON.parse(await readFile(new URL(example.request_file, templates), 'utf8'));
  input.input.source_url = sourceUrl(example.platform, url);
  input.maximum_credits = integer(maximumCredits);
  return input;
}

export async function main(args = process.argv.slice(2)) {
  if (args.length === 1 && args[0] === '--list') {
    return platformExamples.map(item => `${item.slug}\t${item.title}`).join('\n');
  }
  if (args.length !== 3 || !/^\d+$/.test(args[2])) {
    throw new Error('Usage: node examples/node/05-platform-request.mjs SLUG HTTPS_VIDEO_URL MAXIMUM_CREDITS\n       node examples/node/05-platform-request.mjs --list');
  }
  return JSON.stringify(await platformRequest(args[0], args[1], Number(args[2])), null, 2);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try { console.log(await main()); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

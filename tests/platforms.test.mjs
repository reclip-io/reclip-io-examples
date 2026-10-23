import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { platformExamples, platformRequest, main } from '../examples/node/05-platform-request.mjs';

const catalog = JSON.parse(await readFile(new URL('../lib/reclip/references/tool-catalog.json', import.meta.url), 'utf8'));
const directory = new URL('../examples/platforms/', import.meta.url);
const expected = {
  'youtube-video-downloader': ['youtube', 'video_downloader'],
  'tiktok-video-downloader': ['tiktok', 'video_downloader'],
  'instagram-video-downloader': ['instagram', 'video_downloader'],
  'youtube-ai-clipper': ['youtube', 'ai_clipper'],
  'twitch-vod-clipper': ['twitch', 'ai_clipper'],
  'youtube-ai-broll': ['youtube', 'ai_broll'],
  'twitch-vod-ai-broll': ['twitch', 'ai_broll'],
  'youtube-ai-captions': ['youtube', 'ai_captions'],
  'youtube-transcript': ['youtube', 'youtube_transcript'],
  'tiktok-transcript': ['tiktok', 'tiktok_transcript'],
};

// The exported schemas mark defaulted fields required. Check authored inputs
// against their field definitions while allowing the runtime to apply defaults.
function assertContractFields(value, schema, path) {
  if (!schema.properties || !value || typeof value !== 'object' || Array.isArray(value)) return;
  for (const field of schema.required ?? []) {
    if (schema.properties[field]?.default === undefined) {
      assert.ok(Object.hasOwn(value, field), `${path}.${field} is required`);
    }
  }
  for (const [field, input] of Object.entries(value)) {
    assert.ok(Object.hasOwn(schema.properties, field), `${path}.${field} is not a contract field`);
    assertContractFields(input, schema.properties[field], `${path}.${field}`);
  }
}

test('includes exactly the ten verified platform APIs with resolvable request files', async () => {
  assert.deepEqual(platformExamples.map(item => item.slug).sort(), Object.keys(expected).sort());
  assert.equal(new Set(platformExamples.map(item => item.slug)).size, 10);
  for (const example of platformExamples) {
    assert.deepEqual([example.platform, example.tool], expected[example.slug]);
    assert.equal(example.request_file, `${example.slug}.json`);
    assert.equal(example.landing_url, `https://www.reclip.io/api/tools/${example.slug}`);
    assert.equal(example.docs_url, `https://www.reclip.io/docs/${example.tool.endsWith('_transcript') ? 'tools' : 'platforms'}/${example.slug}`);
    const request = JSON.parse(await readFile(new URL(example.request_file, directory), 'utf8'));
    const schema = catalog.tools.find(tool => tool.id === example.tool)?.input_schema;
    assert.ok(schema, `${example.tool} exists in the pinned catalog`);
    assert.equal(request.tool, example.tool);
    assert.equal(request.maximum_credits, 100);
    assert.equal(Object.hasOwn(request.input, 'asset_id'), false);
    assertContractFields(request.input, schema, example.slug);
    assert.deepEqual(await platformRequest(example.slug, request.input.source_url, 100), request);
    if (example.tool === 'video_downloader') assert.equal(request.input.platform, example.platform);
    else assert.equal(Object.hasOwn(request.input, 'platform'), false);
  }
});

test('request selection is offline, uses an explicit cap, and does not mutate templates', async () => {
  const source = 'https://www.tiktok.com/@creator/video/9876543210123456789';
  const request = await platformRequest('tiktok-video-downloader', source, 7);
  assert.equal(request.maximum_credits, 7);
  assert.equal(request.input.source_url, source);
  assert.equal(request.input.platform, 'tiktok');
  assert.equal(JSON.parse(await readFile(new URL('tiktok-video-downloader.json', directory))).maximum_credits, 100);
  for (const budget of [-1, NaN, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(platformRequest('tiktok-video-downloader', source, budget), /nonnegative safe integers/);
  }
});

test('rejects unsupported platform combinations and mismatched or unsafe source URLs', async () => {
  for (const slug of ['twitch-video-downloader', 'instagram-transcript', '../youtube-video-downloader']) {
    await assert.rejects(platformRequest(slug, 'https://www.youtube.com/watch?v=VIDEO_ID_01', 0), /Unknown platform API/);
  }
  for (const source of [
    'https://www.instagram.com/reel/REEL_ID/',
    'https://youtube.com.example.test/watch?v=VIDEO_ID_01',
    'http://www.youtube.com/watch?v=VIDEO_ID_01',
    'https://secret@www.youtube.com/watch?v=VIDEO_ID_01',
    'https://www.youtube.com:1234/watch?v=VIDEO_ID_01',
  ]) {
    await assert.rejects(platformRequest('youtube-video-downloader', source, 0));
  }
  for (const source of ['https://www.twitch.tv/creator', 'https://clips.twitch.tv/Clip', 'https://www.twitch.tv/videos/not-a-number']) {
    await assert.rejects(platformRequest('twitch-vod-clipper', source, 0), /twitch source contract/);
  }
  assert.equal((await platformRequest('twitch-vod-clipper', 'https://www.twitch.tv/videos/1234567890', 0)).input.source_url, 'https://www.twitch.tv/videos/1234567890');
});

test('CLI lists choices and prints selected JSON without API credentials', async () => {
  const env = { ...process.env };
  delete env.RECLIP_API_KEY;
  const result = spawnSync(process.execPath, ['examples/node/05-platform-request.mjs', 'youtube-transcript', 'https://www.youtube.com/watch?v=VIDEO_ID_01', '0'], { encoding: 'utf8', env });
  assert.equal(result.status, 0, result.stderr);
  const request = JSON.parse(result.stdout);
  assert.equal(request.tool, 'youtube_transcript');
  assert.equal(request.maximum_credits, 0);
  assert.equal(request.input.include_timestamps, true);
  assert.equal((await main(['--list'])).split('\n').length, 10);
  await assert.rejects(main(['youtube-transcript', 'https://www.youtube.com/watch?v=VIDEO_ID_01']), /Usage/);
  await assert.rejects(main(['youtube-transcript', 'https://www.youtube.com/watch?v=VIDEO_ID_01', '1e3']), /Usage/);
});

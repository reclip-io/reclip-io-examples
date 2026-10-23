# Platform-specific video API examples

These examples cover **10 direct platform/tool combinations across six tools**. They use the existing Reclip REST job endpoint and MCP tool names; the complete product catalog remains 30 tools.

| Source | API example | Tool |
|---|---|---|
| YouTube | [Video Downloader](../examples/platforms/youtube-video-downloader.json) | `video_downloader` |
| TikTok | [Video Downloader](../examples/platforms/tiktok-video-downloader.json) | `video_downloader` |
| Instagram | [Video Downloader](../examples/platforms/instagram-video-downloader.json) | `video_downloader` |
| YouTube | [Video Clipping](../examples/platforms/youtube-ai-clipper.json) | `ai_clipper` |
| Twitch VOD | [Video Clipping](../examples/platforms/twitch-vod-clipper.json) | `ai_clipper` |
| YouTube | [AI B-Roll](../examples/platforms/youtube-ai-broll.json) | `ai_broll` |
| Twitch VOD | [AI B-Roll](../examples/platforms/twitch-vod-ai-broll.json) | `ai_broll` |
| YouTube | [Video Captions](../examples/platforms/youtube-ai-captions.json) | `ai_captions` |
| YouTube | [Transcript](../examples/platforms/youtube-transcript.json) | `youtube_transcript` |
| TikTok | [Transcript](../examples/platforms/tiktok-transcript.json) | `tiktok_transcript` |

The [online platform guides](https://www.reclip.io/docs/guides/platforms) explain input formats, results, limitations, and matching MCP prompts. The [public platform directory](https://www.reclip.io/platforms) links the corresponding API landing pages.

## Prepare a request offline

List the supported examples:

```bash
node examples/node/05-platform-request.mjs --list
```

Create a request with your own source URL and an explicit credit cap:

```bash
node examples/node/05-platform-request.mjs \
  youtube-video-downloader 'https://www.youtube.com/watch?v=YOUR_VIDEO_ID' 0 \
  > request.json
```

This command reads bundled JSON and prints a request. It makes no network requests and needs no API key. A zero cap is suitable for preparing a request and inspecting its quote; paid processing requires a cap that covers the current estimate. Choose your own authorized budget before submitting. The JSON templates use an illustrative cap of 100 credits; replace it rather than treating it as a price.

The selector checks that the source hostname matches the chosen platform. Twitch requires a recorded VOD URL such as `https://www.twitch.tv/videos/1234567890`; channel pages, live capture, and Twitch clip URLs are outside this source contract. Server-side validation remains authoritative, and an accepted URL shape does not guarantee that the video is accessible.

The downloader supplies a matching `platform` field. Clipping, captions, B-roll, and transcript requests identify their source through `source_url`. Do not add a downloader-only `platform` field to those requests. YouTube captions also require an accurate `duration_seconds`; update the example value and any selected time range to match your source. Customize options only after inspecting the live tool schema and catalog.

## Inspect, quote, submit, and poll

Configure `RECLIP_API_KEY` privately in your environment. Inspect the selected tool before quoting:

```bash
node examples/node/01-discover.mjs
python3 lib/reclip/scripts/reclip_api.py catalog video_downloader
node examples/node/04-quote.mjs request.json
# Or quote the same request with cURL:
bash examples/curl/quote.sh request.json
```

When the quote fits your chosen cap, submit through the existing durable client:

```bash
# Replace 100 with your approved cap after reviewing the estimate.
APPROVED_MAXIMUM_CREDITS=100
node examples/node/05-platform-request.mjs \
  youtube-video-downloader 'https://www.youtube.com/watch?v=YOUR_VIDEO_ID' "$APPROVED_MAXIMUM_CREDITS" \
  > request.json
node examples/node/02-submit.mjs request.json .reclip-runs/youtube-download/job.state.json "$APPROVED_MAXIMUM_CREDITS"
node examples/node/03-wait.mjs JOB_ID
```

Replace `JOB_ID` with the returned ID. Regenerating the request above replaces its initial zero cap before the first submission. After submission, preserve that exact request and its state file. The submit helper uses the lower of the JSON cap and command-line cap, checks the current quote, and persists its idempotency key before submission. Use the same request and state file when resuming an uncertain response. Give each genuinely new job its own state file. The poller waits for that existing job; it does not create a replacement.

As an alternative to Node submission, the [Python helper](../lib/reclip/scripts/reclip_api.py) accepts the same JSON request:

```bash
python3 lib/reclip/scripts/reclip_api.py quote request.json
python3 lib/reclip/scripts/reclip_api.py run request.json \
  --state .reclip-runs/python-youtube/job.state.json --maximum-credits 100
```

Choose one submission client for a job. Node and Python use different state formats; resume with the original client and state file. Read the [complete client instructions](quickstart.md) for uploads, downloads, state recovery, and the exact command options. These examples do not execute paid processing during offline validation.

## Source and result limitations

- YouTube and TikTok transcript tools retrieve existing caption tracks. They do not fall back to speech recognition when captions are absent; use Video Transcription with a compatible video asset for speech-to-text.
- Instagram supports direct video downloading. Transcription, clipping, captions, and other edits can use a compatible downloaded asset in separate jobs.
- Twitch direct URL inputs support clipping and B-roll for recorded VODs. They do not provide a general Twitch downloader.
- Shorts, Reels, and TikTok can describe destinations for generated video files. The APIs do not automatically publish those files or add source support to other tools.

Read completed jobs' `result` and `outputs`, retain asset IDs for later processing, and treat signed download URLs as temporary. Each additional processing job needs its own quote and credit budget.

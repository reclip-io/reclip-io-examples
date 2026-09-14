# More workflows

## Compress, then extract audio

```bash
python3 examples/python/03_chain.py source.mp4 \
  --state-dir .reclip-runs/chain --maximum-credits 0 --first-step-cap 0
```

This uploads once, compresses at CRF 28 with a 1280-pixel maximum width and 30 FPS maximum, then passes the generated video's asset ID into MP3 extraction. Both tools are free in the pinned catalog; the zero cap stops execution if live costs differ. The example requires an eligible paid API workspace even for these tools.

Each step has its own persistent state. The second step is quoted only after the first succeeds, within the remaining total cap. When actual first-step credits are not available, its full cap remains reserved. Resume with the same source, directory and budget arguments. Output JSON includes both job results. To download the audio, choose its `asset_id` from `audio_job.outputs` and use the helper's `download` command.

For other chains, inspect each tool's live schema and validate media compatibility. Inputs can use `asset_id`, `input_asset_ids`, `motion_asset_id`, `character_asset_id`, `product_asset_id`, or `avatar_asset_id`; these roles are not interchangeable. Pass a ready asset ID, not an expiring storage URL.

## Clip a video

The same quote/submit commands accept any supported tool request. For AI Clipper, inspect `tool ai_clipper` and write a range-limited request with your actual upload ID:

```json
{
  "tool": "ai_clipper",
  "input": {"asset_id": "00000000-0000-4000-8000-000000000001"},
  "options": {
    "analysis_start_seconds": 0,
    "analysis_end_seconds": 60,
    "captions_enabled": true,
    "language": "en"
  },
  "maximum_outputs": 2
}
```

The range must fit the media and the intended scope. Quote this request, choose an authorized budget, and submit it with a new state file for this intentional job. On success:

```bash
python3 lib/reclip/scripts/reclip_api.py clips JOB_ID
python3 lib/reclip/scripts/reclip_api.py clip CLIP_ID
```

To edit, create `edit.json` containing exactly `captions_enabled`, `caption_group_size`, `caption_style`, and `caption_words` from the current clip, changing only intended values. Do not send the entire GET result. Preserve valid style values or obtain a preset from the live catalog when the current style is null. The full editor schema is in the [API docs](https://github.com/ricciflow-api/reclip-io-api-docs).

```bash
python3 lib/reclip/scripts/reclip_api.py edit-clip CLIP_ID edit.json
```

The response supplies `editor_revision`. With explicit authorization for an export that does not require a hard credit cap:

```bash
python3 lib/reclip/scripts/reclip_api.py export-clip CLIP_ID \
  --revision EDITOR_REVISION --state .reclip-runs/export.state.json
python3 lib/reclip/scripts/reclip_api.py wait EXPORT_JOB_ID
```

No export quote/cap exists in this beta contract. A stale revision returns a conflict; inspect the current revision and intended edit before starting a new export request.

## Projects

```bash
python3 lib/reclip/scripts/reclip_api.py create-project --title 'Campaign assets'
```

The returned ID is the outer job envelope's organizational `project_id`. Roblox Rant compositions are a separate resource:

```bash
python3 lib/reclip/scripts/reclip_api.py create-composition --title 'Rant draft'
python3 lib/reclip/scripts/reclip_api.py composition COMPOSITION_ID
```

Roblox Rant's composition ID goes in its tool-specific **input** `project_id`; read the live tool and catalog for the remaining fields. Creating either project resource does not submit a media task. Project creation is not automatically retried after an ambiguous response.

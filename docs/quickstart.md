# Upload to first result

Run commands from the repository root. Use an API-enabled deployment and the scopes listed in [authentication](authentication.md). UUID placeholders such as `ASSET_ID` and `JOB_ID` below must be replaced by real response IDs.

## 1. Inspect the tool

```bash
python3 lib/reclip/scripts/reclip_api.py identity
python3 lib/reclip/scripts/reclip_api.py tool mp4_to_mp3
python3 lib/reclip/scripts/reclip_api.py catalog mp4_to_mp3
```

To inspect the bundled schema without credentials, append `--offline` to `tool mp4_to_mp3`. That snapshot is for planning; live catalogs govern availability and current options.

## 2. Upload and confirm

```bash
python3 lib/reclip/scripts/reclip_api.py upload source.mp4 \
  --tool mp4_to_mp3 --state .reclip-runs/manual/upload.state.json
```

The helper creates an upload intent, streams a PUT to the signed URL, then confirms the asset. Use the resulting `asset_id`. An upload must be confirmed before job submission. If the command is interrupted, rerun with the same state file and source file.

## 3. Write and quote the request

Create `request.json` using your confirmed asset UUID:

```json
{
  "tool": "mp4_to_mp3",
  "input": {
    "asset_id": "00000000-0000-4000-8000-000000000001",
    "file_name": "source.mp4",
    "operation": "extract_mp3"
  }
}
```

```bash
bash examples/curl/quote.sh request.json
# Or:
node examples/node/04-quote.mjs request.json
```

The response contains `estimated_credits`, `available_credits`, `affordable`, and `price_locked: false`. Quoting does not create a media job. This extraction tool is free in the pinned catalog; the live quote is checked before submission, and API eligibility still applies.

## 4. Submit with a cap and persistent identity

```bash
node examples/node/02-submit.mjs request.json .reclip-runs/manual/node-job.state.json 0
```

`0` is the explicit maximum credits for this job. This command quotes again and stops if the result is unaffordable or exceeds the cap. It saves an idempotency key before POST `/jobs` and prints the accepted job `id`. If an existing request file contains a lower cap, the helper preserves that lower limit.

Do not modify the request or switch keys when resuming an uncertain submission. Node and Python use **different state formats**: reuse the original runtime and file for a given job. Do not point a second implementation at its state or create a second state file to recover it.

## 5. Poll and download

```bash
node examples/node/03-wait.mjs JOB_ID 1800
python3 lib/reclip/scripts/reclip_api.py download OUTPUT_ASSET_ID --output output/result.mp3
```

The job result is not ready merely because submission returned HTTP 202. Wait for `succeeded`, inspect `outputs`, then choose an output asset by its media type and role. A tool can return multiple assets or structured text. Download uses a freshly generated signed URL; output asset IDs are stable references, URLs expire. Download refuses to overwrite an existing file.

`failed` and `canceled` terminate polling. A timeout leaves the job running; resume using the same ID. Read `credits.actual` when settled to determine usage. Consult [retries and budgets](retries-and-budgets.md) before creating another job.

## Python end-to-end alternative

```bash
python3 examples/python/02_convert.py source.mp4 \
  --state-dir .reclip-runs/python --maximum-credits 0 --output output/audio.mp3
```

This combines all stages using the vendored client. It uses separate upload/submission state files and selects an audio output. The [provenance record](../lib/PROVENANCE.md) identifies the exact helper version. It requires neither a skill installation nor pip packages.

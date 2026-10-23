# Reclip API examples

Runnable examples for the Reclip REST API, organized like [glade-api-examples](https://github.com/ricciflow-api/glade-api-examples). Learn workspace authentication, tool discovery, uploads, quotes, durable job submission, polling, downloads, and media-tool composition.

**Beta contract:** `1.0.0-beta.2`, the latest local `api-dev` contract recorded in the bundled catalog source metadata. These are client examples. The operator must deploy and enable the API; publishing this repository does not enable production access. Offline tests do not certify live provider execution.

## Quick start

Create a scoped workspace key in the API dashboard → API Keys on the API-enabled deployment. API access can use eligible promotional API credits, purchased credits, or a paid plan. Supply `RECLIP_API_KEY` through your shell environment or secret manager. Do not paste it into chat, source code, or command arguments. The examples do not automatically load `.env`.

Read the current identity:

```bash
bash examples/curl/quickstart.sh
```

Discover tools and limits:

```bash
python3 examples/python/01_discover.py
```

Upload a local video, quote, extract MP3, and download the result:

```bash
python3 examples/python/02_convert.py source.mp4 \
  --state-dir .reclip-runs/extract \
  --maximum-credits 0 \
  --output output/audio.mp3
```

This example deliberately permits **zero credits**; the pinned contract marks extraction as free, while workspace API access requirements still apply. If the live quote exceeds zero, the client stops. Choose a higher cap only within your intended budget. Use the same state directory, file, key, and arguments to resume an interrupted run.

## Examples

| Runtime | Runnable examples | Requirements |
|---|---|---|
| cURL | Identity, tool discovery, job quote | Bash, cURL 7.76+ |
| Python | Discovery; upload → extract → download; compression → audio chain; full API helper | Python 3.9+ standard library |
| Node.js | Discovery, quote, durable submit, bounded polling | Node.js 20+ built-ins |
| Go | Read-only identity, tools, usage | Go 1.23+ standard library |

For YouTube, TikTok, Instagram, and Twitch VOD source URLs, use the [10 platform-specific request examples](docs/platforms.md). The offline Node selector prepares a matching request without network access; the existing clients handle quoting, durable submission, and polling.

Node accepts a JSON request with a ready asset from the Python uploader:

```bash
node examples/node/04-quote.mjs request.json
node examples/node/02-submit.mjs request.json .reclip-runs/node/job.state.json 0
node examples/node/03-wait.mjs JOB_ID
```

The required integer argument on submission is the per-job credit cap. See the [complete walkthrough](docs/quickstart.md) for request creation, asset IDs and recovery. To run Go:

```bash
cd examples/go
go run .
```

## Guides

- [Authentication, configuration and scopes](docs/authentication.md)
- [Upload, quote, submit, wait and download](docs/quickstart.md)
- [Retries, state files and credit budgets](docs/retries-and-budgets.md)
- [Tool chaining, clips and exports](docs/workflows.md)
- [30-tool coverage and input schema index](docs/tools.md)
- [YouTube, TikTok, Instagram, and Twitch API examples](docs/platforms.md)

Examples consistently use `Authorization: Bearer`. `RECLIP_API_BASE_URL` defaults to `https://www.reclip.io/api/v1`; configure a different trusted deployment if needed. HTTPS is required except for loopback development. Reclip beta provides REST and Streamable HTTP MCP at `/api/mcp`. The MCP catalog is generated from the same tool and OpenAPI schemas.

## Validate

```bash
npm test
cd examples/go
go test ./...
```

`npm test` requires Node.js 20+, Python 3.9+, Bash and cURL; it runs offline behavioral tests and checks Python/Node/Bash syntax, local document links, and pinned contract references. Go tests run separately and in CI. No validation command submits real media jobs or spends credits.

Optional read-only deployment verification:

```bash
npm run test:live
```

This requires a configured key and checks identity, tools and usage. It does not create jobs, upload assets, or verify provider execution. Missing API deployment/access is a failure, not a skipped success.

## Related repositories

- [API documentation](https://github.com/reclip-io/reclip-io-api-docs)
- [Agent skill](https://github.com/reclip-io/reclip-io-skills)
- [Backend API branch](https://github.com/asterism-software/reclip-io/tree/api-dev)

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and the [MIT license](LICENSE).

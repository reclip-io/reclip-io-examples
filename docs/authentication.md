# Authentication and configuration

Set `RECLIP_API_KEY` using your environment or secret manager. `.env.example` documents the variables but is not loaded automatically. A workspace administrator creates, rotates and revokes keys in Settings → API Keys through the web identity. API credentials cannot create other keys.

The API derives workspace identity from the key. Do not put workspace overrides or credentials in query strings. A paid workspace and the selected tool's plan permission are required; browser free-trial/device exemptions do not apply. The API and website share the same credits.

| Example operation | Required scope |
|---|---|
| Identity and tool discovery | Valid eligible workspace key |
| Upload and confirmation | `assets:write` |
| Asset metadata and download | `assets:read` |
| Quote and submit jobs, cancel | `jobs:write` |
| Read jobs | `jobs:read` |
| List job clips | `jobs:read` + `assets:read` |
| Read a clip | `assets:read` |
| Edit a clip | `assets:write` |
| Export a clip | `jobs:write` + `assets:read` |
| Read/create projects | `projects:read` / `projects:write` |
| Read usage | `usage:read` |

Discovery examples also call usage, so they need `usage:read`. The full extraction flow needs asset read/write and job read/write permissions. Use only the scopes needed by your integration; the pinned [operation snapshot](../lib/reclip/references/operations.json) records precise requirements.

The base includes the version prefix:

```bash
export RECLIP_API_BASE_URL='http://127.0.0.1:3000/api/v1'
```

Use HTTPS for hosted environments. An override selects the server that receives your credential: point it only at a trusted Reclip deployment. Helpers do not forward API credentials on redirects. Signed storage PUT/GET requests use the temporary URL authorization and never the API Bearer header.

Successful discovery does not prove that every media provider is enabled. A 401 needs valid credentials; access/eligibility or scope failures need the appropriate workspace configuration. A missing/disabled beta deployment must be enabled by its operator before these examples can execute media work.

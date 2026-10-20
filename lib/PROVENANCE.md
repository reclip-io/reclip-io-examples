# Client provenance

`reclip/scripts/reclip_api.py`, the reference JSON files, and the baseline Python client tests are vendored from the current local `reclip-io-skills` release 1.1.0 under its MIT license (Copyright 2026 Reclip). The integration exporter synchronizes the client and snapshots; test discovery points to this repository's client path. This avoids requiring a separate skill installation or an unpublished package.

The snapshots derive from the current local `reclip-io` `api-dev` contract, API version `1.0.0-beta.2`. Their source metadata records the base commit, merged main revision, working-tree marker, full tool inventory and contract SHA-256. Uncommitted changes are identified as a working-tree snapshot rather than attributed to a published commit.

Run the backend's `scripts/export-public-integrations.mjs` after contract changes and verify it with `--check`. Update client behavior and tests together. Node/Go/cURL implementations remain maintained in this repository. This helper is not a separately published official SDK.

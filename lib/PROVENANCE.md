# Client provenance

`reclip/scripts/reclip_api.py`, the two reference JSON files, and the baseline Python client tests are vendored from [reclip-io-skills](https://github.com/ricciflow-api/reclip-io-skills/tree/b3026c51a34dce41d8767027f146c299561d2c9e), under its MIT license (Copyright 2026 Reclip). The client and JSON are unchanged; test discovery points to this repository's client path. This avoids requiring a separate skill installation or a package that has not been published.

The snapshots derive from backend `api-dev` commit `2059685938ec59f5277269b2ca73b723253be45d`, API version `1.0.0-beta.1`. New example workflows and the Node/Go/cURL implementations are local to this repository. The Glade examples repository provided the language/documentation structure, not Reclip endpoint contracts.

For upgrades, vendor from an explicit skill commit, compare the runtime and snapshots, rerun all behavioral tests, and update this record. This is an example helper, not a separately published official SDK.

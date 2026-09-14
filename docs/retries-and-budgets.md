# Retries, state and budgets

Each intentional job receives a stable idempotency key saved **before** its submission. The server scopes that key to the API credential: identical requests replay the original task; a changed request conflicts. Do not regenerate keys, delete state, change origin/workspace, rotate credentials, or create replacement jobs to recover from an ambiguous response. Reconcile the original task first.

The Python helper retries transient read/quote/confirm and idempotent submission failures at most three attempts; it honors `Retry-After` and stops for delays above 60 seconds. Node, Go and cURL examples do not automatically retry. On rate limiting, honor the server's requested delay before restarting. Replaying a saved accepted submission uses the original job; it does not quote/create another one.

The beta defaults are 60 requests/minute/key and 10 active jobs/workspace, alongside existing tool restrictions. Consult `/usage` and tool details rather than treating snapshot limits as permanent. A five-second polling interval is used by default. Poll timeouts bound client waiting; they do not cancel jobs. Canceling can leave a job running and does not guarantee a refund.

## State recovery

State records request identity, workspace/key IDs, idempotency keys and accepted job IDs. Upload state can temporarily hold a signed upload URL. Protect these files and source media; do not commit or share them. New state files use restrictive POSIX permissions; Windows deployments must configure private directory ACLs.

Python uses an OS-released advisory lock. Node uses an exclusive `.lock` file: a hard process crash can leave it behind. First confirm the process is no longer running and inspect/preserve the JSON state, then remove **only** the stale lock file. Resume the identical Node command. Do not delete the JSON state. Locks coordinate processes on the same filesystem; don't run the same logical job from independent state directories or assume network filesystems provide equivalent locks.

A lost upload-intent response can leave an unused asset because that endpoint has no idempotency contract. This does not create a media job. Upload URLs last 10 minutes, download URLs 5 minutes. Python first tries to confirm an existing upload before sending another PUT; a truly expired unfinished upload needs a new upload state. Keep the prior state for audit. Assets can expire according to `retained_until`; do not assume indefinite retention.

## Credit authorization

`maximum_credits` is sent with ordinary jobs. A quote is an estimate, not a locked price. Examples require an explicit cap and preserve a lower cap already in the request. Do not infer budget authorization from a template amount.

For multi-step workflows, sum settled actual credits plus the full caps reserved for unsettled jobs. Never subtract estimated credits as though they were final charges. If actual billing is unavailable, conservatively reserve the submitted cap. The chain example performs sequential steps and reuses each step's state on resume.

Clip exports have **no quote or credit-cap field** in the beta contract. They are not suitable for an integration that requires an enforceable total spending cap. Do not add unsupported budget fields or describe exports as free.

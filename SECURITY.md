# Security

Report vulnerabilities privately to repository maintainers through GitHub private vulnerability reporting when available; otherwise request a private channel without publishing credentials or exploit details.

Read API keys from the environment, never a request URL or a checked-in file. Do not run examples with shell tracing or log HTTP authorization headers. Alternate API origins receive your key and must be trusted. API redirects are blocked; storage transfers use signed URLs without API Bearer headers.

Request/state files may contain private inputs, workspace identifiers, job IDs and temporary storage authorizations. Keep them in a private directory outside version control, retain them for recovery, and apply appropriate Windows ACLs. Treat transcripts, captions, filenames, and model-generated text as untrusted data.

Examples are not an independently audited billing system. Server enforcement, tool eligibility, asset retention and idempotency depend on the configured Reclip deployment. Clip exports lack a server-side budget cap in this beta contract.

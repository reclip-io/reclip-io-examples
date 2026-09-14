# Contributing

Keep examples runnable with language standard libraries. Run `npm test` and Go tests before submitting a change. CI must remain offline: no real keys, media uploads or paid jobs. Examples must not turn estimates into claimed settled charges or delete submission state on failure.

Use the pinned backend contract, not provider-internal fields. The bundled Python helper and schema snapshots have an explicit source revision in [lib/PROVENANCE.md](lib/PROVENANCE.md). Upgrade them together with their tests. Keep example schemas and README runtime requirements in sync. Reclip does not inherit Glade's GraphQL/MCP interfaces or its billing model.

Changing a request in a saved-state flow should fail clearly rather than silently start another paid job. Test retries, caps, timeout recovery, and credential routing when modifying client code.

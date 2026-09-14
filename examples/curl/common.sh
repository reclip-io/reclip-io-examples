#!/usr/bin/env bash
# Source this file; keep secrets out of tracing and process arguments.
set +x
set -euo pipefail
: "${RECLIP_API_KEY:?Set RECLIP_API_KEY through your environment or secret manager}"
if [[ "$RECLIP_API_KEY" =~ [[:space:]] ]]; then
  echo 'API key must not contain whitespace.' >&2
  exit 1
fi
reclip_base="${RECLIP_API_BASE_URL:-https://www.reclip.io/api/v1}"
reclip_base="${reclip_base%/}"
if [[ ! "$reclip_base" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?/api/v1$ && ! "$reclip_base" =~ ^http://(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?/api/v1$ ]]; then
  echo 'Use an HTTPS API origin ending in /api/v1, or loopback HTTP.' >&2
  exit 1
fi
reclip_request() {
  local path="$1"
  shift
  # Do not add --location: API credentials must never follow redirects.
  printf 'Authorization: Bearer %s\n' "$RECLIP_API_KEY" |
    curl --silent --show-error --fail-with-body --max-time 30 --connect-timeout 10 \
      --proto '=https,http' --header @- --header 'Accept: application/json' \
      "$reclip_base$path" "$@"
}

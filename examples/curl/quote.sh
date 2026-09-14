#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
if [[ $# != 1 || ! -f "$1" ]]; then
  echo 'Usage: bash examples/curl/quote.sh REQUEST.json' >&2
  exit 1
fi
reclip_request '/jobs/quote' --request POST --header 'Content-Type: application/json' --data-binary "@$1"

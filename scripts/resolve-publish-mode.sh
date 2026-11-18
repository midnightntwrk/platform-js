#!/usr/bin/env bash
# Prints the release mode for a push to main: `stable`, `canary` or `none`, and nothing else on stdout. Reads two flags
# from the environment, each exactly `true` or `false`: HAS_UNPUBLISHED (some non-private package version is not on
# npm) and HAS_BUMPS (a pending changeset bumps a package). An unpublished version means `stable`, whatever HAS_BUMPS
# says; otherwise a pending bump means `canary`; otherwise `none`. Any other flag value is an error.
set -euo pipefail

require_bool() {
  local name="$1"
  local value="${!name-}"
  if [[ "$value" != "true" && "$value" != "false" ]]; then
    if [[ -z "${!name+set}" ]]; then
      echo "::error::${name} is unset; expected 'true' or 'false'" >&2
    else
      echo "::error::${name} is '${value}'; expected 'true' or 'false'" >&2
    fi
    exit 1
  fi
}

require_bool HAS_UNPUBLISHED
require_bool HAS_BUMPS

if [[ "$HAS_UNPUBLISHED" == "true" ]]; then
  echo stable
elif [[ "$HAS_BUMPS" == "true" ]]; then
  echo canary
else
  echo none
fi

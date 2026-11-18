#!/usr/bin/env bash
# Publishes a snapshot of each package a pending changeset bumps, under the `canary` dist-tag. It rewrites versions and
# consumes changesets, so run it only in a throwaway checkout; `npm_config_dry_run=true` stops it before the upload.
set -euo pipefail

# `changeset version --snapshot` refuses to run in pre-release mode.
if grep -q '"mode": "pre"' .changeset/pre.json 2>/dev/null; then
  yarn changeset pre exit
fi

SHORT_SHA="$(git rev-parse --short=7 HEAD)"
TIMESTAMP="$(date -u +%Y%m%d%H%M%S)"
yarn changeset version --snapshot "canary.${TIMESTAMP}-${SHORT_SHA}"

# Build after the versions change, so the published files carry them.
yarn dist:publish

# No git tags, and so no GitHub Releases, for a canary.
yarn changeset publish --tag canary --no-git-tag

#!/usr/bin/env bash
# Publishes a snapshot of each package a pending changeset bumps, under the `canary` dist-tag. It rewrites versions and
# consumes changesets, so run it only in a throwaway checkout; `npm_config_dry_run=true` stops it before the upload.
set -euo pipefail

# `changeset version --snapshot` refuses to run in pre-release mode. A missing pre.json means not in pre-release mode.
if node -e '
  const fs = require("fs");
  const file = ".changeset/pre.json";
  process.exit(fs.existsSync(file) && JSON.parse(fs.readFileSync(file, "utf8")).mode === "pre" ? 0 : 1);
'; then
  yarn changeset pre exit
fi

SHORT_SHA="$(git rev-parse --short=7 HEAD)"
TIMESTAMP="$(date -u +%Y%m%d%H%M%S)"
yarn changeset version --snapshot "canary.${TIMESTAMP}-${SHORT_SHA}"

# Only a `-canary.` version may go out under the canary tag. With no pending changeset that bumps a package,
# `changeset version --snapshot` still exits 0 but leaves the plain version, and `changeset publish` would upload it.
node -e '
  const fs = require("fs");
  const path = require("path");
  const stray = fs
    .readdirSync("packages")
    .map((dir) => path.join("packages", dir, "package.json"))
    .filter((file) => fs.existsSync(file))
    .map((file) => ({ file, pkg: JSON.parse(fs.readFileSync(file, "utf8")) }))
    .filter(({ pkg }) => !pkg.private && !String(pkg.version).includes("-canary."));
  if (stray.length > 0) {
    stray.forEach(({ file, pkg }) =>
      console.error(`${file}: version ${pkg.version} is not a canary snapshot; is there a pending changeset?`));
    process.exit(1);
  }
'

# `dist/` is not committed, so build it here. `dist:publish` is the build without source or declaration maps.
yarn dist:publish

# A canary gets no git tag; only the stable job tags and creates GitHub Releases.
yarn changeset publish --tag canary --no-git-tag

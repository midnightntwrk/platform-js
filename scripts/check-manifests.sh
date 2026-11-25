#!/usr/bin/env bash
# Checks the two rules that keep dev tool versions in the Yarn catalog (`.yarnrc.yml`) without leaking into a package:
#   - every root `package.json` `devDependencies` value is exactly `catalog:`, so each root tool's range lives only in
#     the catalog (`yarn up` or `yarn add -D` on a root tool writes an inline range and takes it out of the catalog);
#   - no `packages/*/package.json` has a `catalog:` value in `dependencies`, `peerDependencies`, `devDependencies` or
#     `optionalDependencies`, because npm packs and publishes these manifests and does not replace `catalog:`.
# Prints one PASS or FAIL line per check, naming each offender, and exits 1 if any check fails. Runs from any directory.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

failures=0

report() {
  local verdict="$1"
  local name="$2"
  echo "${verdict} ${name}"
  if [[ "$verdict" == "FAIL" ]]; then
    failures=$((failures + 1))
  fi
}

# Each node script prints one offender per line and nothing when the check holds. A crash (unreadable or invalid
# JSON) exits non-zero, which the caller reports as a FAIL so that it cannot pass as "no offenders".
root_offenders() {
  node -e '
    const fs = require("node:fs");
    const manifest = JSON.parse(fs.readFileSync("package.json", "utf8"));
    for (const [name, range] of Object.entries(manifest.devDependencies ?? {})) {
      if (range !== "catalog:") {
        console.log(`${name} (${JSON.stringify(range)})`);
      }
    }
  '
}

package_offenders() {
  node -e '
    const fs = require("node:fs");
    const path = require("node:path");
    const fields = ["dependencies", "peerDependencies", "devDependencies", "optionalDependencies"];
    const files = fs
      .readdirSync("packages", { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join("packages", entry.name, "package.json"))
      .filter((file) => fs.existsSync(file));
    for (const file of files) {
      const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
      for (const field of fields) {
        for (const [name, range] of Object.entries(manifest[field] ?? {})) {
          if (typeof range === "string" && range.startsWith("catalog:")) {
            console.log(`${file} ${field}.${name} (${JSON.stringify(range)})`);
          }
        }
      }
    }
  '
}

# Runs one check and reports it: PASS when the lister prints nothing, FAIL naming every offender otherwise.
run_check() {
  local name="$1"
  local lister="$2"
  local output
  local status=0
  output="$("$lister" 2>&1)" || status=$?
  if ((status != 0)); then
    report FAIL "${name} (the check crashed: ${output:-no output})"
  elif [[ -z "$output" ]]; then
    report PASS "$name"
  else
    report FAIL "${name}: ${output//$'\n'/, }"
  fi
}

run_check 'root package.json devDependencies are all "catalog:"' root_offenders
run_check 'no packages/*/package.json dependency field has a "catalog:" value' package_offenders

if ((failures > 0)); then
  echo "${failures} manifest check(s) failed" >&2
  exit 1
fi

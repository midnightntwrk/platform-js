#!/usr/bin/env bash
# Checks that the guards keeping the .ts source the source of truth still fire. No source file breaks them today, so
# lint and the type-check pass even when a guard is switched off; this script feeds each guard a one-line probe that
# must trip it:
#   - eslint `no-restricted-syntax` reports exactly one error for each form of a relative `.js` import or export path,
#     in src and in tests, and none for a relative `.ts` path;
#   - tsc with the repo's `tsconfig.base.json` rejects non-erasable syntax (an `enum`) with TS1294 (erasableSyntaxOnly).
# Prints one PASS or FAIL line per case and exits 1 if any case fails. Runs from any directory.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

SRC_PROBE='packages/platform-js/src/effect/Probe.ts'
TEST_PROBE='packages/platform-js/src/effect/test/Probe.test.ts'
failures=0

report() {
  local verdict="$1"
  local name="$2"
  echo "${verdict} ${name}"
  if [[ "$verdict" == "FAIL" ]]; then
    failures=$((failures + 1))
  fi
}

# Prints the number of `no-restricted-syntax` errors eslint reports for the source, or `fatal` when eslint fails to
# parse it or prints no JSON (a config crash), so that neither case can pass as a count.
count_restricted() {
  local filename="$1"
  local source="$2"
  local output
  # eslint exits 1 when it reports any error, which is the expected outcome for a bad case.
  output="$(printf '%s\n' "$source" | yarn run -T eslint --stdin --stdin-filename "$filename" --format json 2>/dev/null || true)"
  printf '%s' "$output" | node -e '
    let input = "";
    process.stdin.on("data", (chunk) => (input += chunk));
    process.stdin.on("end", () => {
      try {
        const messages = JSON.parse(input).flatMap((result) => result.messages);
        if (messages.some((message) => message.fatal)) {
          console.log("fatal");
          return;
        }
        console.log(messages.filter((m) => m.ruleId === "no-restricted-syntax" && m.severity === 2).length);
      } catch {
        console.log("fatal");
      }
    });
  '
}

expect_restricted() {
  local expected="$1"
  local filename="$2"
  local source="$3"
  local count
  local where="src"
  if [[ "$filename" == "$TEST_PROBE" ]]; then
    where="test"
  fi
  count="$(count_restricted "$filename" "$source")"
  if [[ "$count" == "$expected" ]]; then
    report PASS "eslint ${where}: ${source} (${count} no-restricted-syntax error(s))"
  else
    report FAIL "eslint ${where}: ${source} (expected ${expected} no-restricted-syntax error(s), got ${count})"
  fi
}

bad_src_cases=(
  "import './Hex.js'"
  "import type { X } from './Hex.js'"
  "export * from './Hex.js'"
  "export * as H from './Hex.js'"
  "export { x } from '../Hex.js'"
  "import('./Hex.js')"
  "import(\`./Hex.js\`)"
  "type T = typeof import('./Hex.js')"
  "declare module './Hex.js' {}"
)
bad_test_cases=(
  "import '../Hex.js'"
  "vi.mock('../Hex.js')"
  "vi.importActual('../Hex.js')"
)

for source in "${bad_src_cases[@]}"; do
  expect_restricted 1 "$SRC_PROBE" "$source"
done
for source in "${bad_test_cases[@]}"; do
  expect_restricted 1 "$TEST_PROBE" "$source"
done
expect_restricted 0 "$SRC_PROBE" "import './Hex.ts'"

# The probe config sits in a temp folder, outside the repo, so it type-checks only the probe file. `types` is emptied
# because the base config's `vitest/globals` and `node` resolve only from inside the repo.
probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT
printf '%s\n' 'enum E { A }' > "${probe_dir}/probe.ts"
cat > "${probe_dir}/tsconfig.json" <<EOF
{
  "extends": "${PWD}/tsconfig.base.json",
  "compilerOptions": { "types": [], "composite": false },
  "files": ["probe.ts"]
}
EOF
tsc_output="$(yarn run -T tsc --noEmit -p "${probe_dir}/tsconfig.json" 2>&1 || true)"
if grep -q 'error TS1294' <<<"$tsc_output"; then
  report PASS "tsc: enum E { A } (TS1294)"
else
  tsc_first_line="$(head -n 1 <<<"$tsc_output")"
  report FAIL "tsc: enum E { A } (expected TS1294, got: ${tsc_first_line:-no error})"
fi

if ((failures > 0)); then
  echo "${failures} source guard case(s) failed" >&2
  exit 1
fi

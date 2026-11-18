#!/usr/bin/env bash
# Releases each non-private package's current version: publishes it to npm under `latest`, pushes its
# `<name>@<version>` git tag to origin and creates its GitHub Release.
#
# A version counts as released when its `<name>@<version>` tag is on origin, not when it is on npm. Per package:
#   - tag missing on origin: publish from the version's commit unless npm already has it, then tag, push, Release;
#   - tag on origin and version on npm: only create the GitHub Release if it is missing;
#   - tag on origin and version not on npm: a baseline tag for a version that is never published; skip it.
#
# Invariant: every version in `packages/*/package.json` at HEAD whose tag is not on origin ends up on npm, tagged on
# origin and released on GitHub, built and published from the commit that set that version, never from a later HEAD.
# Every step checks before it acts, so a re-run finishes a partial release and repeats nothing.
#
# Needs full git history (the version's commit is found with `git log`) and, unless DRY_RUN=true, a token in
# GITHUB_TOKEN that may push tags and create Releases. Provenance comes from NPM_CONFIG_PROVENANCE in the caller's env.
#
# DRY_RUN=true pushes no tag, creates no Release and creates no tag for a version already on npm: it only reports what
# it would do. Pair it with npm_config_dry_run=true so `changeset publish` uploads nothing.
set -euo pipefail

DRY_RUN="${DRY_RUN:-false}"
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

is_dry_run() { [ "$DRY_RUN" = "true" ]; }

if ! is_dry_run && [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "::error::GITHUB_TOKEN must be set to push release tags and create GitHub Releases"
  exit 1
fi

# A shallow clone hides the commit that set a version, and a release built from HEAD instead is a different release.
if [ "$(git rev-parse --is-shallow-repository)" = "true" ]; then
  echo "::error::This checkout is shallow; the release needs full history (actions/checkout with fetch-depth: 0)"
  exit 1
fi

# gh finds the repository from origin, which is not a GitHub URL in every checkout.
if [ -z "${GH_REPO:-}" ] && [ -n "${GITHUB_REPOSITORY:-}" ]; then
  export GH_REPO="$GITHUB_REPOSITORY"
fi

TMP_ROOT="$(mktemp -d)"
WORKTREES=()
cleanup() {
  local dir
  for dir in "${WORKTREES[@]+"${WORKTREES[@]}"}"; do
    git -C "$ROOT" worktree remove --force "$dir" > /dev/null 2>&1 || true
  done
  git -C "$ROOT" worktree prune > /dev/null 2>&1 || true
  rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

# Runs git with the token as an HTTP header passed through the environment: it never reaches .git/config, the process
# arguments or the output. The empty first value clears any header a checkout step already configured.
git_auth() {
  if [ -z "${GITHUB_TOKEN:-}" ]; then
    git "$@"
    return
  fi
  local header
  header="AUTHORIZATION: basic $(printf 'x-access-token:%s' "$GITHUB_TOKEN" | base64 -w0)"
  GIT_CONFIG_COUNT=2 \
    GIT_CONFIG_KEY_0="http.https://github.com/.extraheader" GIT_CONFIG_VALUE_0="" \
    GIT_CONFIG_KEY_1="http.https://github.com/.extraheader" GIT_CONFIG_VALUE_1="$header" \
    git "$@"
}

# Prints one field of a manifest as it was at <rev>, or nothing when the file or field is missing there.
manifest_field() {
  local rev="$1" manifest="$2" field="$3"
  git show "${rev}:${manifest}" 2> /dev/null | node -e '
    const p = JSON.parse(require("fs").readFileSync(0, "utf8"));
    const v = p[process.argv[1]];
    process.stdout.write(v === undefined || v === null ? "" : String(v));
  ' "$field" 2> /dev/null || true
}

# Prints `published` or `unpublished` for <name>@<version>. Only a definite answer counts: a version the registry does
# not list (empty output, or E404 for a package it has never seen) is unpublished; any other failure (timeout, 5xx,
# 401) leaves the state unknown, and the release stops rather than guess.
npm_version_state() {
  local spec="$1" out status=0 err="$TMP_ROOT/npm-view.err"
  out="$(npm view "$spec" version --json 2> "$err")" || status=$?
  if [ "$status" -eq 0 ]; then
    if [[ "$out" =~ [^[:space:]] ]]; then echo published; else echo unpublished; fi
    return 0
  fi
  # No pipe into `grep -q`: its early exit would fail the pipeline under pipefail.
  if grep -q 'E404' "$err" || grep -q 'E404' <<< "$out"; then
    echo unpublished
    return 0
  fi
  echo "::error::Could not tell whether ${spec} is on npm (npm view exited ${status})" >&2
  cat "$err" >&2
  return 1
}

# Prints the commit that made <manifest> read <name>@<version>: the oldest commit of the newest unbroken run of
# name- or version-line changes that all leave the manifest at <name>@<version>. A later commit that touches those lines
# without changing the values (reformatting) does not move the release off that commit, and a commit from before a
# rename never counts, because the package it describes is a different one.
version_commit() {
  local manifest="$1" name="$2" version="$3" sha found=""
  while IFS= read -r sha; do
    if [ "$(manifest_field "$sha" "$manifest" name)" = "$name" ] &&
      [ "$(manifest_field "$sha" "$manifest" version)" = "$version" ]; then
      found="$sha"
    else
      break
    fi
  done < <(git log --format=%H -G'"(name|version)"' -- "$manifest")
  [ -n "$found" ] || return 1
  printf '%s\n' "$found"
}

# Prints the body of the `## <version>` section of the changelog as it was at <rev>, without surrounding blank lines.
release_notes() {
  local rev="$1" changelog="$2" version="$3"
  { git show "${rev}:${changelog}" 2> /dev/null || true; } | awk -v heading="## ${version}" '
    { line = $0; sub(/[[:space:]]+$/, "", line) }
    !inside && line == heading { inside = 1; next }
    inside && /^## / { exit }
    inside { lines[++n] = $0 }
    END {
      first = 1; while (first <= n && lines[first] ~ /^[[:space:]]*$/) first++
      last = n; while (last >= first && lines[last] ~ /^[[:space:]]*$/) last--
      for (i = first; i <= last; i++) print lines[i]
    }
  '
}

# Builds and publishes from <sha> in a separate worktree. The running script is never checked out over: bash reads it
# as it goes, and the release must be built from the version's commit, not from HEAD. `changeset publish` publishes
# every package whose version at <sha> is not on npm and tags each one locally; tags are shared by all worktrees.
publish_from_commit() {
  local sha="$1" dir="$TMP_ROOT/release-${1:0:12}"
  echo "::notice::Building and publishing from ${sha}"
  git worktree add --detach "$dir" "$sha"
  WORKTREES+=("$dir")
  (
    cd "$dir"
    # No install scripts run on the release path; the Yarn cache is the main checkout's, restored by the workflow.
    YARN_ENABLE_SCRIPTS=false YARN_CACHE_FOLDER="$ROOT/.yarn/cache" yarn install --immutable
    yarn dist:publish
    yarn changeset publish
  )
}

# Prints `present` or `missing` for <tag> on origin. Any failure other than "no such ref" (exit 2) leaves the release
# state unknown, and the release stops rather than guess.
origin_tag_state() {
  local tag="$1" status=0
  git_auth ls-remote --exit-code --tags origin "refs/tags/${tag}" > /dev/null || status=$?
  case "$status" in
    0) echo present ;;
    2) echo missing ;;
    *)
      echo "::error::Could not list tags on origin to check ${tag} (git ls-remote exited ${status})" >&2
      return 1
      ;;
  esac
}

# Makes sure <tag>, missing on origin, is pushed there at <sha>.
ensure_tag() {
  local tag="$1" sha="$2" local_commit
  local_commit="$(git rev-parse -q --verify "refs/tags/${tag}^{commit}" || true)"

  if [ -z "$local_commit" ]; then
    if is_dry_run; then
      echo "::notice::Dry run: would create tag ${tag} at ${sha} and push it to origin"
      return 0
    fi
    git tag -a -m "$tag" "$tag" "$sha"
  elif [ "$local_commit" != "$sha" ]; then
    echo "::error::Local tag ${tag} points at ${local_commit}, but ${sha} set that version; not pushing it"
    exit 1
  fi

  if is_dry_run; then
    echo "::notice::Dry run: would push tag ${tag} (${sha}) to origin"
    return 0
  fi
  git_auth push origin "refs/tags/${tag}"
  echo "::notice::Pushed tag ${tag}"
}

# Makes sure <tag> has a GitHub Release whose notes are that version's changelog section at <sha>.
ensure_release() {
  local tag="$1" sha="$2" changelog="$3" version="$4" out notes notes_file
  if ! command -v gh > /dev/null 2>&1; then
    if is_dry_run; then
      echo "::notice::Dry run: gh is not installed, so the GitHub Release for ${tag} was not checked"
      return 0
    fi
    echo "::error::gh is not installed, so the GitHub Release for ${tag} cannot be checked or created"
    exit 1
  fi

  if out="$(gh release view "$tag" --json tagName 2>&1)"; then
    echo "::notice::GitHub Release ${tag} already exists"
    return 0
  fi
  if ! grep -qi 'release not found' <<< "$out"; then
    if is_dry_run; then
      echo "::notice::Dry run: could not check the GitHub Release for ${tag} (gh: $(head -n 1 <<< "$out")); skipped"
      return 0
    fi
    echo "::error::Could not check the GitHub Release for ${tag}"
    printf '%s\n' "$out" >&2
    exit 1
  fi

  notes="$(release_notes "$sha" "$changelog" "$version")"
  if [ -z "$notes" ]; then
    echo "::warning::${changelog} at ${sha} has no '## ${version}' section; the Release notes are the tag name"
    notes="$tag"
  fi

  if is_dry_run; then
    echo "::notice::Dry run: would create GitHub Release ${tag} with these notes (first lines):"
    head -n 10 <<< "$notes"
    return 0
  fi
  notes_file="$TMP_ROOT/notes-${version}.md"
  printf '%s\n' "$notes" > "$notes_file"
  gh release create "$tag" --title "$tag" --notes-file "$notes_file" --verify-tag
  echo "::notice::Created GitHub Release ${tag}"
}

NAMES=()
VERSIONS=()
MANIFESTS=()
SHAS=()
TAG_ON_ORIGIN=()
UNPUBLISHED_SHAS=()

for manifest in packages/*/package.json; do
  [ -f "$manifest" ] || continue
  if [ "$(manifest_field HEAD "$manifest" private)" = "true" ]; then
    continue
  fi
  name="$(manifest_field HEAD "$manifest" name)"
  version="$(manifest_field HEAD "$manifest" version)"
  if [ -z "$name" ] || [ -z "$version" ]; then
    echo "::error::${manifest} at HEAD has no name or version"
    exit 1
  fi
  tag="${name}@${version}"

  tag_state="$(origin_tag_state "$tag")" || exit 1
  npm_state="$(npm_version_state "$tag")" || exit 1

  # A tag on origin for a version npm never had marks a baseline: that version is never published or released.
  if [ "$tag_state" = "present" ] && [ "$npm_state" = "unpublished" ]; then
    echo "::notice::Tag ${tag} is on origin but the version is not on npm: a baseline tag, so nothing to release"
    continue
  fi

  if ! sha="$(version_commit "$manifest" "$name" "$version")"; then
    echo "::error::No commit in the history of ${manifest} sets ${name} to ${version}"
    exit 1
  fi
  echo "::notice::${tag}: tag ${tag_state} on origin, ${npm_state} on npm; its version was set in ${sha}"

  NAMES+=("$name")
  VERSIONS+=("$version")
  MANIFESTS+=("$manifest")
  SHAS+=("$sha")
  TAG_ON_ORIGIN+=("$tag_state")
  if [ "$npm_state" = "unpublished" ] && [[ " ${UNPUBLISHED_SHAS[*]-} " != *" ${sha} "* ]]; then
    UNPUBLISHED_SHAS+=("$sha")
  fi
done

if [ "${#NAMES[@]}" -eq 0 ]; then
  echo "::notice::No package has a version to release"
  exit 0
fi

for sha in "${UNPUBLISHED_SHAS[@]+"${UNPUBLISHED_SHAS[@]}"}"; do
  publish_from_commit "$sha"
done

for i in "${!NAMES[@]}"; do
  tag="${NAMES[$i]}@${VERSIONS[$i]}"
  if [ "${TAG_ON_ORIGIN[$i]}" = "present" ]; then
    local_commit="$(git rev-parse -q --verify "refs/tags/${tag}^{commit}" || true)"
    if [ -n "$local_commit" ] && [ "$local_commit" != "${SHAS[$i]}" ]; then
      echo "::warning::Tag ${tag} points at ${local_commit}, but ${SHAS[$i]} set that version"
    fi
    echo "::notice::Tag ${tag} is already on origin"
  else
    ensure_tag "$tag" "${SHAS[$i]}"
  fi
  ensure_release "$tag" "${SHAS[$i]}" "$(dirname "${MANIFESTS[$i]}")/CHANGELOG.md" "${VERSIONS[$i]}"
done

# Developer Guide

This guide is for maintainers and contributors to the **platform-js** repository. It covers local setup, branch names,
the commands you can run, and how tests are organised.

> 💡 Using Claude Code on this repo? Recommended personal settings are in [`docs/ClaudeCode.md`](docs/ClaudeCode.md).
> The issue-to-PR flow for agents is in [`docs/AgenticWorkflow.md`](docs/AgenticWorkflow.md).

---

## Local setup

You need Node 22 or later. The exact version is pinned in [`.nvmrc`](.nvmrc).

```bash
nvm use && corepack enable
yarn
```

The repo root is a Yarn 4 workspace, built with Turborepo. Packages live in `packages/`; today there is one,
`packages/platform-js/` (`@midnightntwrk/platform-js`). See
[ADR-0001](docs/decisions/0001-turborepo-workspace-with-packages-folder.md).

---

## Branching Strategy

We use a simple, linear workflow. Branch names are not enforced, but the strongly recommended pattern is:

```
<type>/<ticket>-<short-description>
```

- `<type>` is a [Conventional Commits](https://www.conventionalcommits.org/) type: `feat`, `fix`, `docs`, `style`,
  `refactor`, `perf`, `test`, `build`, `ci`, `chore`.

- `<ticket>` is the issue number, when there is one (omit if there genuinely isn't).

- `<short-description>` is kebab-case.

Examples: `feat/123-network-id-parsing`, `chore/19-agentic-workflow-setup`, `docs/fix-readme-links`.

**Rules**

- Open PRs from these branches → merge into `main` after review and green CI.

- Do **not** bump versions or edit changelogs by hand: add a changeset instead
  ([Versioning & releases](#versioning--releases)).

---

## Commands

Run these from the repo root.

| Command                | What it does                                          |
| ---------------------- | ----------------------------------------------------- |
| `yarn dist`            | Compiles each package's `src/` to `dist/` (Turbo).    |
| `yarn dist:publish`    | Clean `dist/` build, no source or declaration maps.   |
| `yarn typecheck`       | Type-checks `src/` and the tests.                     |
| `yarn test`            | Runs all tests (Turbo) from `src/`; no build needed.  |
| `yarn lint`            | Lints packages and root configs; warnings fail.       |
| `yarn publint`         | Publish build, then `publint --strict`.               |
| `yarn package`         | Publish build, then `npm pack` in each package.       |
| `yarn clean`           | Removes `dist`, coverage, reports and build info.     |
| `yarn changeset`       | Adds a changeset (asks which packages and bumps).     |
| `yarn changeset:check` | Lists the pending changesets and the bumps they make. |

There is no `format` script yet.

### Known failures today

None today: build, tests, lint, publint and the type-check are clean on `main`, so any failure comes from your change.

### Continuous integration

The `CI` workflow (`.github/workflows/ci.yml`) runs on every pull request, on every merge queue entry (`merge_group`),
on every push to `main`, and by hand (`workflow_dispatch`). Build, General Checks and Unit Tests run side by side, each
after `yarn install --immutable`. Tests waits for all three and passes only when all three succeed:

| Job            | Runs                                                         |
| -------------- | ------------------------------------------------------------ |
| Build          | `yarn dist`, then `yarn publint`                             |
| General Checks | `yarn typecheck`, then `yarn lint`                           |
| Unit Tests     | `yarn test`                                                  |
| Tests          | waits for the three jobs above; passes only when all succeed |

**`Tests` is the status check for `main` to require** (a repo setting, made by a maintainer): a lint error, a type
error, a failing test or a broken build fails it. Run the same commands locally before you push ([Commands](#commands)).

A second workflow, `Check for Changeset` (`.github/workflows/check-changeset.yml`), runs on every pull request to
`main`. It fails when the PR changes a package but adds no changeset
([Versioning & releases](#versioning--releases)). It skips release PRs (`changeset-release/*` branches) and Renovate
and Dependabot PRs (`renovate/*`, `dependabot/*`), which never carry changesets.

---

## Testing Tiers

Today there are **unit tests only**. They are pure: no Docker, network or other outside services.

- Files are named `*.test.ts` and live in `packages/platform-js/test/` (for example `test/effect/Hex.test.ts`).
- They use [`@effect/vitest`](https://github.com/Effect-TS/effect/tree/main/packages/vitest) (`it.effect`) and property
  tests from `effect/FastCheck`.
- Tests import from `src/` by relative path, for example `../../src/effect/Hex.js`, so they need no build first.

Run every test from the repo root:

```bash
yarn test
```

Run one file from `packages/platform-js/`:

```bash
yarn run -T vitest run test/effect/Hex.test.ts
```

---

## Versioning & releases

Versions and changelogs use [Changesets](https://github.com/changesets/changesets) (CLI `2.31.1`, pinned exactly). A
changeset is a small Markdown file in `.changeset/` that names the packages a change releases, the
[semver](https://semver.org/) bump for each, and the line it adds to the changelog. Each package's changelog is its
own `CHANGELOG.md` (`packages/platform-js/CHANGELOG.md`).

### Adding a changeset

Every PR that changes a package carries a changeset, committed with the change. `Check for Changeset` fails the PR
without one ([Continuous integration](#continuous-integration)).

1. Run `yarn changeset` at the repo root, pick the packages and bumps, and write the summary.
2. Commit the new `.changeset/<name>.md` file.
3. Check it with `yarn changeset status --since=origin/main`.

The file looks like this:

```markdown
---
'@midnightntwrk/platform-js': minor
---

Add `NetworkId.fromMoniker`.
```

Pick the bump:

| Bump    | When                                                                                |
| ------- | ----------------------------------------------------------------------------------- |
| `major` | A breaking change to the public API: a removed or renamed export, changed behaviour |
| `minor` | A new feature that keeps the existing API working                                   |
| `patch` | A bug fix, or a dependency update, with no API change                               |

For a breaking change, start the summary with `**BREAKING CHANGE:**` and say how to migrate.

A change that releases nothing (docs, tests, CI, tooling) but touches a package folder still needs a changeset: add
an empty one with `yarn changeset add --empty`. A PR that touches no package needs none.

### Releasing

The `CD` workflow (`.github/workflows/cd.yml`) releases `@midnightntwrk/platform-js` to npm from `main`, modelled on
midnight-wallet's. It publishes to the `@midnightntwrk` scope only, with no alias scope. Never run `yarn changeset
version` or `yarn changeset publish` by hand: the workflow does both.

On every push to `main`, the `version` job reads the pending changesets and picks one mode:

| Mode     | When                                                                 | What happens                                      |
| -------- | -------------------------------------------------------------------- | ------------------------------------------------- |
| `stable` | No changesets are left and the package version is not on npm yet     | Publish that version under `latest`               |
| `canary` | A pending changeset bumps the package                                | Publish a snapshot under `canary`, never `latest` |
| `none`   | Only empty changesets are pending, or none and the version is on npm | Publish nothing                                   |

`stable` is the push that merges the release PR. A push that changes no package and brings no changeset is `none`, so
it asks no one for approval. The workflow does not wait for `CI` on the same push: what reaches `main` has already
passed the required `Tests` check on its PR.

**The release PR.** While changesets are pending, the job opens or updates one PR, `chore: release`, from the
`changeset-release/main` branch. It bumps the version, writes `CHANGELOG.md` and deletes the consumed changesets. Each
new merge to `main` regenerates it, so it always shows the next release. Closing it unmerged does not stop it: the next
push opens it again.

**Stable release.** Merging the release PR triggers `publish-stable`. It waits for a reviewer to approve the
`npm-publish-stable` environment, then publishes under `latest`, pushes the `@midnightntwrk/platform-js@<version>` git
tag and creates the GitHub Release from the changelog.

**Canary build.** Every merge that brings a package-bumping changeset publishes a canary at once, with no approval. Its
version is the next release plus a snapshot suffix: `<next version>-canary.<UTC timestamp>-<short sha>`, for example
`4.0.0-canary.20261118164023-12fd0e2`. A canary is a real test of the release path (build, pack, publish, install)
before a stable release, and lets other repos try a change early. Install the newest one with:

```bash
yarn add @midnightntwrk/platform-js@canary
npm view @midnightntwrk/platform-js dist-tags   # which version each tag points at
```

Pin the exact canary version for anything that must not move.

**Dry run on every PR.** The `Publish (dry run)` job runs the canary publish (`scripts/publish-canary.sh`) with
`npm_config_dry_run=true`, so it takes the same path and stops before the upload. It first adds a throwaway `patch`
changeset, so there is always a snapshot to test. It then packs the snapshot, installs the tarball into an empty
project and imports each entry point. The tarball lives only on the runner. Run the same rehearsal locally, in a
throwaway clone, because the script rewrites versions and deletes changesets (with no pending changeset, it tests the
current version instead of a snapshot):

```bash
git clone . /tmp/platform-js-dry-run && cd /tmp/platform-js-dry-run
nvm use && corepack enable
yarn install --immutable
npm_config_dry_run=true scripts/publish-canary.sh
yarn package   # the .tgz lands in packages/platform-js/
```

Both publish jobs use npm Trusted Publishing (OIDC: GitHub proves the job's identity to npm, so no npm token is
stored) and publish with provenance. The dry run cannot test that login or the upload; the first canary from `main`
is what proves them, before any stable release.

A maintainer sets up, once, in this order:

1. The GitHub environments: `npm-publish-stable` with required reviewers, `npm-publish-canary` with none.
2. The package on npmjs. npm only lets you add a Trusted Publisher to a package that already exists, so the first
   version is published by hand with a maintainer's npm login: run the dry-run commands above without
   `npm_config_dry_run=true`, which publishes a canary under `canary`. npm points `latest` at a package's first
   version whatever the tag, so `latest` shows this canary until the first stable release moves it.
3. Two Trusted Publishers on the package, one per environment: repository `midnightntwrk/platform-js`, workflow
   `cd.yml`, environment `npm-publish-stable` or `npm-publish-canary`. npm expires a new Trusted Publisher that has
   not published within 2 days, so merge a package-bumping change soon after, and check that its canary publishes.

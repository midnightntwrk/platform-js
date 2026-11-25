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

## Dependency versions

Root dev tooling versions live in one place: the Yarn [catalog](https://yarnpkg.com/features/catalogs) in
[`.yarnrc.yml`](.yarnrc.yml). The root `package.json` lists each tool in `devDependencies` as `"catalog:"`, and Yarn
reads the version from the catalog.

- **Add or bump a dev tool:** set its version under `catalog:` in `.yarnrc.yml`, write `"catalog:"` in the root
  `devDependencies`, then run `yarn` and commit `yarn.lock`. Don't use `yarn up <tool>` or `yarn add -D <tool>` on a
  root tool: Yarn writes an inline range into the root `package.json`, and the tool leaves the catalog. CI's
  `scripts/check-manifests.sh` fails when a root `devDependencies` value is not `"catalog:"`.
- **A dev tool only one package uses** still goes in the root `devDependencies`, through the catalog. Package scripts
  call it directly when run from the root (turbo); to run it by hand from a package folder, use `yarn run -T <tool>`.
- **No `catalog:` in a published package**, in any dependency field (`dependencies`, `peerDependencies`,
  `devDependencies`): write inline ranges there. npm does not replace `catalog:` when it packs or publishes (Yarn
  does), and this repo packs and publishes with npm. In `dependencies` or `peerDependencies`, a `catalog:` value makes
  the package uninstallable: npm fails with `EUNSUPPORTEDPROTOCOL`. In `devDependencies`, `npm pack` ships it
  unresolved in the published manifest. CI's `scripts/check-manifests.sh` enforces this rule. This lasts while packing
  and publishing use npm (`npm pack` in `yarn package` and the CD dry run, `npm publish` in Changesets 2.x); #84 plans
  to move publishing to Yarn with Changesets 3.x.
- **A script that needs a tool's version** reads it from the catalog, not from the root `package.json` (which says
  `catalog:`). The CD dry run uses `yarn config get 'catalog["<name>"]'`, which prints one entry's range. Use the
  bracket form: the dot form (`catalog.<name>`) prints `undefined`. `yarn config get catalog --json` prints the whole
  catalog as JSON.
- **Keep `effect` in step:** the root `effect` range (in the catalog, needed as the peer of `@effect/vitest`) must
  equal the `effect` range in `packages/platform-js/package.json` `dependencies`. Nothing checks this; bump both
  together.

To check a pack, run this from the repo root. It must print `no catalog: values`. It fails with an error when the
tarball is missing or its manifest holds a `catalog:` value. The clean removes old tarballs, so exactly one is read.

```bash
yarn clean && yarn package
tar -xOf packages/platform-js/*.tgz package/package.json | node -e '
  const manifest = require("node:fs").readFileSync(0, "utf8");
  if (manifest === "") throw new Error("no package.json read from the tarball");
  if (manifest.includes("catalog:")) throw new Error("the packed package.json holds a catalog: value");
  console.log("no catalog: values");
'
```

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

| Job            | Runs                                                                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Build          | `yarn dist`, then `yarn publint`                                                                                                                       |
| General Checks | `git diff --exit-code` after the install, `yarn typecheck`, `yarn lint`, `bash scripts/check-source-guards.sh`, then `bash scripts/check-manifests.sh` |
| Unit Tests     | `yarn test`                                                                                                                                            |
| Tests          | waits for the three jobs above; passes only when all succeed                                                                                           |

**`Tests` is the status check for `main` to require** (a repo setting, made by a maintainer): a lint error, a type
error, a failing test or a broken build fails it. Run the same commands locally before you push ([Commands](#commands)).

A second workflow, `Check for Changeset` (`.github/workflows/check-changeset.yml`), runs on every pull request to
`main`. It fails when the PR changes a package but adds no changeset
([Versioning & releases](#versioning--releases)). It skips release PRs (`changeset-release/*` branches) and Renovate
and Dependabot PRs (`renovate/*`, `dependabot/*`), which never carry changesets.

A third, `Publish (dry run)` in the `CD` workflow (`.github/workflows/cd.yml`), runs on every pull request to `main`. It
lints the workflows with actionlint, checks the publish-mode rule, rehearses a stable and a canary publish without
uploading, and installs the packed snapshot into an empty project to import every entry point and type-check it under
`node10`, `nodenext` and `bundler` ([Releasing](#releasing)).

Every job runs on `ubuntu-26.04`, a pinned GitHub-hosted image, never `ubuntu-latest`: the image changes only
when a PR changes the label. A new workflow pins the same label.

---

## Testing Tiers

Today there are **unit tests only**. They are pure: no Docker, network or other outside services.

- Files are named `*.test.ts` and live in `packages/platform-js/test/` (for example `test/effect/Hex.test.ts`).
- They use [`@effect/vitest`](https://github.com/Effect-TS/effect/tree/main/packages/vitest) (`it.effect`) and property
  tests from `effect/FastCheck`.
- Tests import from `src/` by relative path, for example `../../src/effect/Hex.ts`, so they need no build first.

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
version` or `yarn changeset publish` by hand: the workflow does both. The one exception is the first canary in the
one-time setup below.

A version counts as released when its git tag, `@midnightntwrk/platform-js@<version>`, is on GitHub. On every push to
`main`, the `version` job checks that tag and the pending changesets, and picks one mode:

| Mode     | When                                                               | What happens                                                     |
| -------- | ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `stable` | The package version in `main` has no release tag yet (on any push) | Publish that version under `latest`, from the commit that set it |
| `canary` | Every version is tagged and a pending changeset bumps the package  | Publish a snapshot under `canary`, never `latest`                |
| `none`   | Every version is tagged and no pending changeset bumps the package | Publish nothing                                                  |

`stable` starts with the push that merges the release PR, and holds until the tag is pushed. A push that lands while
that run waits for approval resolves `stable` again and asks again; approve the newest one. Whichever run is approved,
it publishes from the commit that set the version, not from the later push. `canary` holds on every push while a
bumping changeset is pending, docs-only merges included, so each of them publishes a fresh canary.

The workflow does not wait for `CI` on the same push. Each PR passed the required `Tests` check on its own, but two PRs
that passed alone can still break together, and a canary from that combination publishes with no reviewer.

**The release PR.** While changesets are pending, the job opens or updates one PR, `chore: release`, from the
`changeset-release/main` branch. It bumps the version, writes `CHANGELOG.md` and deletes the consumed changesets. Each
new merge to `main` regenerates it, so it always shows the next release. Closing it unmerged does not stop it: the next
push opens it again.

**Stable release.** Merging the release PR triggers `publish-stable`. It waits for a reviewer to approve the
`npm-publish-stable` environment, then runs `scripts/publish-stable.sh`. It builds and publishes under `latest` from the
commit that set the version, pushes the `@midnightntwrk/platform-js@<version>` git tag and creates the GitHub Release
from the changelog. Each step is skipped when already done, so if a run fails partway (published but not tagged, or
tagged but no Release), re-run the failed `publish-stable` job and it finishes the release.

**Canary build.** Every push to `main` in `canary` mode publishes a canary at once, with no approval. Its
version is the next release plus a snapshot suffix: `<next version>-canary.<UTC timestamp>-<short sha>`, for example
`4.0.0-canary.20261118164023-12fd0e2`. A canary is a real test of the release path (build, pack, publish, install)
before a stable release, and lets other repos try a change early. Install the newest one with:

```bash
yarn add @midnightntwrk/platform-js@canary
npm view @midnightntwrk/platform-js dist-tags   # which version each tag points at
```

Pin the exact canary version for anything that must not move.

**Dry run on every PR.** The `Publish (dry run)` job runs the same version, build and publish commands as the publish
jobs, with `npm_config_dry_run=true`, so nothing is uploaded. It does not test provenance, the OIDC login or registry
auth. In order, it:

- lints the workflows with actionlint, and checks the publish-mode rule (`scripts/resolve-publish-mode.sh`) against
  every case;
- checks each package's `repository.url` matches this repository (npm rejects provenance otherwise);
- writes a throwaway `patch` changeset for every package, so there is always a release to rehearse;
- rehearses a stable release: applies that changeset in a separate worktree, commits it locally, and dry-runs
  `scripts/publish-stable.sh`, which builds from that commit and stops before the upload, the tag push and the Release;
- rehearses a canary: dry-runs `scripts/publish-canary.sh` with the same changeset, and checks that each version is a
  `-canary.` snapshot, published under the `canary` tag, and not on npm;
- packs each package, installs the tarballs into an empty project, imports `.`, `./effect` and every
  `./effect/<module>`, and checks that `./effect/internal/*` is not exported;
- type-checks those imports against the installed `.d.ts` files (`--strict`, `skipLibCheck` off) under `node10`,
  `nodenext` and `bundler`, and checks that `./effect/internal/*` does not resolve under any of them.

The tarballs live only on the runner. Run the canary rehearsal locally in a throwaway clone, because the script
rewrites versions and deletes changesets. The clone takes your committed `HEAD`, not uncommitted changes, and the
script refuses to run without a pending changeset that bumps a package, so add one:

```bash
git clone . /tmp/platform-js-dry-run && cd /tmp/platform-js-dry-run
nvm use && corepack enable
yarn install --immutable
printf -- "---\n'@midnightntwrk/platform-js': patch\n---\n\nDry-run snapshot.\n" > .changeset/zzz-dry-run.md
npm_config_dry_run=true scripts/publish-canary.sh
(cd packages/platform-js && npm pack)   # the .tgz lands in packages/platform-js/
```

Both publish jobs use npm Trusted Publishing (OIDC: GitHub proves the job's identity to npm, so no npm token is
stored) and publish with provenance. The dry run cannot test that login or the upload; the first canary from `main`
is what proves them, before any stable release.

A maintainer sets up, once, in this order, and finishes every step before the CD workflow merges. Its merge is itself
a push to `main`: it publishes a canary at once if a bumping changeset is pending, and GitHub creates any missing
environment unprotected.

1. The GitHub environments: `npm-publish-stable` with required reviewers, `npm-publish-canary` with none. On both,
   limit deployment branches to `main`: npm's Trusted Publisher does not check the branch, so without that rule a job
   on any branch could use `npm-publish-canary` to publish.
2. The baseline tag. Version 3.0.0 was released under the old `@midnight-ntwrk` scope; tag it as released under the
   new name, so the workflow never publishes the scope-rename code as 3.0.0:

   ```bash
   SHA=$(git log -1 --format=%H --grep='rename the package scope' origin/main)
   git tag -s -m '@midnightntwrk/platform-js@3.0.0' '@midnightntwrk/platform-js@3.0.0' "$SHA"
   git push origin 'refs/tags/@midnightntwrk/platform-js@3.0.0'
   ```

3. The package on npmjs. npm only lets you add a Trusted Publisher to a package that already exists, so the first
   version is published by hand, the one time `changeset publish` runs outside the workflow. Log in first with
   `npm login` (a maintainer's account with publish rights on `@midnightntwrk`). Then run the local rehearsal above,
   in a clone of the branch that adds the CD workflow (its scripts are not on `main` yet), without
   `npm_config_dry_run=true`: it publishes a canary under `canary`. npm points `latest` at a package's first version
   whatever the tag, so `latest` shows this canary until the first stable release moves it. The first version of
   `@midnightntwrk/platform-js` went out another way: the canary job published it once with a temporary org npm token
   (#75), removed again once the Trusted Publishers were set up (#76).
4. Two Trusted Publishers on the package, one per environment: repository `midnightntwrk/platform-js`, workflow
   `cd.yml`, environment `npm-publish-stable` or `npm-publish-canary`. npm expires a new Trusted Publisher that has
   not published within 2 days, so merge the CD workflow soon after, and check that the canary from its merge
   publishes.

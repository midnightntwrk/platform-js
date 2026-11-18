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
| `yarn lint`            | Runs ESLint on each package. Warnings fail too.       |
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

Not set up yet. Releases (the release PR on `changeset-release/main` and publishing) come with the CD workflow,
modelled on midnight-wallet: [#54](https://github.com/midnightntwrk/platform-js/issues/54). Until then, don't run
`yarn changeset version` or `yarn changeset publish`: changesets wait in `.changeset/` for the first release.

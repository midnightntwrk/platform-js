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
`packages/platform-js/` (`@midnight-ntwrk/platform-js`). See
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

- Do **not** bump versions or edit changelogs by hand; [Versioning & releases](#versioning--releases) says how, once
  [#16](https://github.com/midnightntwrk/platform-js/issues/16) sets up the tooling.

---

## Commands

Run these from the repo root.

| Command        | What it does                                       |
| -------------- | -------------------------------------------------- |
| `yarn build`   | Builds all packages (Turbo).                       |
| `yarn test`    | Runs all tests (Turbo). Builds dependencies first. |
| `yarn lint`    | Runs ESLint across the workspace.                  |
| `yarn clean`   | Removes build output, reports and coverage.        |
| `yarn package` | Builds, then packs each package with `npm pack`.   |

There is no `typecheck` or `format` script yet. To type-check by hand, run `yarn run -T tsc -b tsconfig.json` in
`packages/platform-js/` (`-T` runs a tool installed at the workspace root).

### Known failures today

Failures that predate the current work are listed here, so other docs can point to it. Today the list is empty.

None. Build, tests, lint and the type-check are all clean on `main`, and [CI](#continuous-integration) keeps them so:
any failure comes from your change.

### Continuous integration

The `CI` workflow (`.github/workflows/ci.yml`) runs on every pull request, on every push to `main`, and by hand
(`workflow_dispatch`). Its jobs run side by side, each after `yarn install --immutable`:

| Job            | Runs                                              |
| -------------- | ------------------------------------------------- |
| Build          | `yarn build`                                      |
| General Checks | the type-check, then `yarn lint`                  |
| Unit Tests     | `yarn test`                                       |
| Tests          | passes only when the three jobs above all succeed |

**`Tests` is the status check for `main` to require** (a repo setting, made by a maintainer): a lint error, a type
error, a failing test or a broken build fails it. Run the same commands locally before you push ([Commands](#commands)).

---

## Testing Tiers

Today there are **unit tests only**. They are pure: no Docker, network or other outside services.

- Files are named `*.test.ts` and live in `packages/platform-js/test/` (for example `test/effect/Hex.test.ts`).
- They use [`@effect/vitest`](https://github.com/Effect-TS/effect/tree/main/packages/vitest) (`it.effect`) and property
  tests from `effect/FastCheck`.
- Tests import the package by name, for example `@midnight-ntwrk/platform-js/effect/Hex`.

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

Versions and changelogs will use [Changesets](https://github.com/changesets/changesets), which is not installed yet.
[#16](https://github.com/midnightntwrk/platform-js/issues/16) sets it up and settles how we write changesets and cut
releases. Until then, follow what that issue says.

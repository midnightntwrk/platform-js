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
cd platform-js
yarn
```

The git root has no `package.json`. The Yarn 4 workspace root is the `platform-js/` folder. It holds one package,
`platform-js/platform-js/` (`@midnight-ntwrk/platform-js`).

> The repository layout will change under [#18](https://github.com/midnightntwrk/platform-js/issues/18). The paths and
> commands below describe today's layout.

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

- Do **not** bump versions or edit changelogs manually.

---

## Commands

Run these from the `platform-js/` folder.

| Command                  | What it does                                                    |
| ------------------------ | --------------------------------------------------------------- |
| `yarn build`             | Builds all packages (Turbo).                                    |
| `yarn test`              | Runs all tests (Turbo). Builds dependencies first.              |
| `yarn lint`              | Runs ESLint across the workspace.                               |
| `yarn clean`             | Removes build output, reports and coverage.                     |
| `yarn package`           | Builds, then packs each package with `npm pack`.                |
| `yarn changeset`         | Adds a changeset. See [Versioning & releases](#versioning--releases). |
| `yarn changeset:status`  | Lists changesets pending since `origin/main`.                   |

There is no `typecheck` or `format` script yet. To type-check by hand, run `yarn run -T tsc -b tsconfig.json` in
`platform-js/platform-js/` (`-T` runs a tool installed at the workspace root).

### Known failures today

These predate the current work. Other docs point here; update this list when one is fixed.

- **`yarn lint` fails**: typescript-eslint doesn't support TypeScript 7. Lint gives no coverage today, so the
  type-check is the gate.
- **The type-check reports five known errors**, all TS2345 in `test/effect/NetworkId.test.ts` (lines 30, 37, 38, 44
  and 45): "Argument of type 'string' is not assignable to parameter of type 'NetworkIdInput'". Any other type error
  comes from your change.

---

## Testing Tiers

Today there are **unit tests only**. They are pure: no Docker, network or other outside services.

- Files are named `*.test.ts` and live in `platform-js/platform-js/test/` (for example `test/effect/Hex.test.ts`).
- They use [`@effect/vitest`](https://github.com/Effect-TS/effect/tree/main/packages/vitest) (`it.effect`) and property
  tests from `effect/FastCheck`.
- Tests import the package by name, for example `@midnight-ntwrk/platform-js/effect/Hex`.

Run every test from `platform-js/`:

```bash
yarn test
```

Run one file from `platform-js/platform-js/`:

```bash
yarn run -T vitest run test/effect/Hex.test.ts
```

---

## Versioning & releases

We use [Changesets](https://github.com/changesets/changesets) for versions and changelogs. How we write changesets and
cut releases is still being settled in [#16](https://github.com/midnightntwrk/platform-js/issues/16). Until then, follow
what that issue says.

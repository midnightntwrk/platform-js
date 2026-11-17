# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

platform-js (`@midnight-ntwrk/platform-js`) provides core abstractions, utilities and types for building services and
libraries that work with the Midnight blockchain: hex and Bech32m values, network IDs, contract addresses, keys, integer
ranges and configuration, written in TypeScript with [Effect](https://effect.website/).

## Documentation Map

| Topic                                              | Where                                      |
| -------------------------------------------------- | ------------------------------------------ |
| Contribution workflow                              | `CONTRIBUTING.md`                          |
| Setup, branching, commands, testing tiers          | `DEV_GUIDE.md`                             |
| How we build changes with agents (flow charts)     | `docs/AgenticWorkflow.md`                  |
| Functional programming conventions (full, examples) | `docs/CodingConventions.md`               |
| Claude Code setup (settings, permissions, plugins) | `docs/ClaudeCode.md`                       |
| Architectural decisions                            | `docs/decisions/` (MADR ADRs)              |
| Agent skill configuration                          | `docs/agents/` (see Agent skills below)    |

Hard rules load automatically from `.claude/rules/` when matching files are touched: `functional-style.md` (source
under `platform-js/platform-js/src`), `testing.md` (tests and vitest config), `claude-config.md` (`.claude/**`).
`code-review.md` has no path filter and is always loaded: it governs how review findings are turned into fixes.

## Workflow

The supported agentic flow is in `docs/AgenticWorkflow.md`. It replaces the skills' default flow:

- Ready issue → `/implement #N`. Issue with open questions → `/grill-with-docs`, write the outcome into the issue
  **body** (never comments), `/clear`, `/implement #N`. Idea with no issue → `/grill-with-docs`, then `/to-tickets` in
  the same session for exactly **one** ticket, `/clear`, `/implement #N`.
- Never `/to-spec` or `/implement-spec`. `/to-tickets` must not apply `ready-for-agent`.
- Inside `/implement`, `code-review` means `/mattpocock-skills:code-review`, and Matt's `tdd` runs inside our
  `test-first` loop, gate included.

## Git & GitHub Conventions

- **Never commit or push directly to `main`**: always work on a branch named `<type>/<ticket>-<short-description>`
  (`DEV_GUIDE.md` → Branching Strategy).
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <description>`,
  imperative mood, lower-case, no trailing period. Breaking changes: `!` after type/scope and/or a `BREAKING CHANGE:`
  footer.
- **Never commit, push, or create/edit PRs, issues, or comments unattended**: show the user the diff and the exact
  message/content first, and wait for explicit approval. For an issue or PR body edit, show the old and new body as a
  diff.
- Issues and PRs use the `.github/` templates, every section filled, and AI-assisted ones carry `bot:ai-assisted`. Link
  issues with plain references (`#123`), **never** closing keywords (`Closes`/`Fixes`/`Resolves`); issues are closed by
  hand after QA.
- Labels are IaC-managed: never create one. Triage labels: `docs/agents/triage-labels.md`.

## Build Commands

Run everything from the `platform-js/` folder (the Yarn workspace root; the git root has no `package.json`). The layout
changes under #18; update these commands when it lands.

```bash
nvm use && corepack enable   # at the git root
cd platform-js
yarn                         # install dependencies
yarn build                   # build all packages (turbo)
yarn test                    # full test suite (turbo; builds dependencies first)
yarn lint                    # eslint across the workspace (broken today, see Common Gotchas)

cd platform-js               # the package folder, platform-js/platform-js/
yarn run -T vitest run test/effect/Hex.test.ts   # one test file
yarn run -T tsc -b tsconfig.json                 # type-check src and tests
```

There is no `typecheck` or `format` script yet. `-T` runs a tool installed at the workspace root.

## Architecture

One package, `platform-js/platform-js/` (`@midnight-ntwrk/platform-js`, ESM). Modules live in `src/effect/`, one per
domain type (`Hex`, `NetworkId`, `ContractAddress`, `CoinPublicKey`, `IntegerRange`, `Configuration`, ...), with
private helpers in `src/effect/internal/`. Errors are `TypeId`-based (`src/effect/ParseError.ts`). Public entry points
are the `exports` in the package's `package.json`; changing one is a public API change.

## Testing

**TDD is mandatory** for feature and bug-fix work: design the test, observe it fail for the expected reason, let the
user review it, then implement. **A confirmed-failing test must never be weakened to fit the implementation**: escalate
to the user instead. Full loop: the `test-first` skill (Matt's `tdd`, which `/implement` calls, runs inside it).

Unit tests only today: `*.test.ts` in `platform-js/platform-js/test/`, using `@effect/vitest` and `effect/FastCheck`
property tests. Hard rules load from `.claude/rules/testing.md`; tiers: `DEV_GUIDE.md` → Testing Tiers.

## Versioning

Changesets and releases are being set up under #16; follow `DEV_GUIDE.md` → Versioning & releases.

## Coding Standards

This codebase follows functional programming principles **rigorously**: immutability (no `let`/loops/mutation),
`Either` for pure logic vs `Effect` for side effects, parse-don't-validate, total functions, typed errors. The hard
rules (including JSDoc requirements for public APIs) load from `.claude/rules/functional-style.md` when source code is
touched; full rationale and worked examples: `docs/CodingConventions.md`.

## Common Gotchas

- **Commands don't run from the git root**: `cd platform-js` first.
- **Tests import the package by name** (`@midnight-ntwrk/platform-js/effect/Hex`), through the `./effect/*` export.
  `./effect/internal/*` is blocked, so tests can't import internals; a new `effect/` module is also re-exported from
  `src/effect/index.ts`.
- **`yarn lint` fails today**: typescript-eslint doesn't support TypeScript 7. **The type-check fails today** on
  `test/effect/NetworkId.test.ts`. Both predate the agent setup; don't treat them as caused by your change.
- **Turbo's cache can be stale** after branch switches or rebases: bypass with `--force` (`yarn build --force`).
- **Effect skills** in `.claude/skills/effect-*` are managed by the `skills` CLI and pinned in `skills-lock.json`:
  never hand-edit them; update with `npx skills update` (`docs/ClaudeCode.md`).

<!-- Managed by /setup-matt-pocock-skills: change it by re-running the skill, not by hand. -->
## Agent skills

### Issue tracker

Issues live in GitHub Issues for `midnightntwrk/platform-js`, through the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The skills' five triage roles map onto existing org labels (`status:untriaged`, `question`, `wontfix`); never create
the skills' bare default labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` at the repo root, and ADRs in `docs/decisions/` in MADR format. This overrides the
skills' `docs/adr/` path and minimal ADR format. See `docs/agents/domain.md`.

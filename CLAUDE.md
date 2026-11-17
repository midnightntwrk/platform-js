# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

platform-js (`@midnight-ntwrk/platform-js`) provides core abstractions, utilities and types for building services and
libraries that work with the Midnight blockchain: hex and Bech32m values, network IDs, contract addresses, keys, integer
ranges and configuration, written in TypeScript with [Effect](https://effect.website/).

## Documentation Map

| Topic                                               | Where                                                                                                          |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Contribution workflow                               | [`CONTRIBUTING.md`](CONTRIBUTING.md)                                                                           |
| Setup, branching, commands, testing tiers           | [`DEV_GUIDE.md`](DEV_GUIDE.md)                                                                                 |
| How we build changes with agents (flow charts)      | [`docs/AgenticWorkflow.md`](docs/AgenticWorkflow.md)                                                           |
| Functional programming conventions (full, examples) | [`docs/CodingConventions.md`](docs/CodingConventions.md)                                                       |
| Claude Code setup (settings, permissions, plugins)  | [`docs/ClaudeCode.md`](docs/ClaudeCode.md)                                                                     |
| Architectural decisions                             | [`docs/decisions/`](docs/decisions/) (MADR ADRs)                                                               |
| Agent skill configuration                           | [`docs/agents/`](docs/agents/) (see Agent skills below)                                                        |
| Hard rules for agents (load automatically)          | [`.claude/rules/`](.claude/rules/): `functional-style.md`, `testing.md`, `claude-config.md`, `code-review.md`  |

Each rule loads when matching files are touched: `functional-style.md` for source under `packages/platform-js/src`,
`testing.md` for tests and vitest config, `claude-config.md` for `.claude/**`. `code-review.md` is always loaded: it
governs how review findings become fixes.

## Workflow

The supported agentic flow is in `docs/AgenticWorkflow.md`. It replaces the skills' default flow:

- Ready issue → `/implement #N`. Issue with open questions → `/grill-with-docs`, write the outcome into the issue
  **body** (never comments), `/clear`, `/implement #N`. Idea with no issue → `/grill-with-docs`, then `/to-tickets` in
  the same session for exactly **one** ticket, `/clear`, `/implement #N`.
- After a grill, commit `GLOSSARY.md` and any new ADRs on the change's branch before `/clear`.
- Never `/to-spec` or `/implement-spec`. `/to-tickets` must not apply `ready-for-agent`.
- Inside `/implement`, `code-review` means `/mattpocock-skills:code-review`, and Matt's `tdd` runs inside our
  `test-first` loop, gate included.

## Git & GitHub Conventions

- **Never commit or push directly to `main`**: always work on a branch named `<type>/<ticket>-<short-description>`
  (`DEV_GUIDE.md` → Branching Strategy). The one exception: a Path C branch (`docs/AgenticWorkflow.md`), made before
  its issue exists, is `<type>/<short-description>` and keeps that name to the end.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <description>`,
  imperative mood, lower-case, no trailing period. Breaking changes: `!` after type/scope and/or a `BREAKING CHANGE:`
  footer.
- Commits are signed off (`git commit -s`, for the DCO). AI-assisted commits also carry the trailer
  `Assisted-by: AI <noreply@ai-assistant>`, never an AI `Co-Authored-By`.
- **Never commit, push, or create/edit PRs, issues, or comments unattended**: show the user the diff and the exact
  message/content first, and wait for explicit approval. For an issue or PR body edit, show the old and new body as a
  diff.
- Issues and PRs use the `.github/` templates, every section filled, and AI-assisted ones carry `bot:ai-assisted`. Link
  issues with plain references (`#123`), **never** closing keywords (`Closes`/`Fixes`/`Resolves`); issues are closed by
  hand after QA. The PR template's `Closes #N` hint does not apply here: write `#N`.
- Labels are IaC-managed: never create one.

## Build Commands

This section is the one agent-facing source for the commands; other agent files point here. Run workspace commands
from the repo root (the Yarn workspace and Turborepo root, ADR-0001), and single-package commands from the package
folder.

```bash
nvm use && corepack enable   # at the repo root
yarn                         # install dependencies
yarn build                   # build all packages (turbo)
yarn test                    # full test suite (turbo; builds dependencies first)
yarn lint                    # eslint across the workspace (see Common Gotchas)

cd packages/platform-js      # the package folder
yarn run -T vitest run test/effect/Hex.test.ts   # one test file
yarn run -T tsc -b tsconfig.json                 # type-check src and tests
```

There is no `typecheck` or `format` script yet. `-T` runs a tool installed at the workspace root.

## Architecture

One package, `packages/platform-js/` (`@midnight-ntwrk/platform-js`, ESM). Modules live in `src/effect/`, one per
domain type (`Hex`, `NetworkId`, `ContractAddress`, `CoinPublicKey`, `IntegerRange`, `Configuration`, ...), with
private helpers in `src/effect/internal/`. Errors are `TypeId`-based (`src/effect/ParseError.ts`). Public entry points
are the `exports` in the package's `package.json`; changing one is a public API change.

## Testing

**TDD is mandatory** for feature and bug-fix work: design the test, observe it fail for the expected reason, let the
user review it, then implement. **A confirmed-failing test must never be weakened to fit the implementation**: escalate
to the user instead. Full loop: the `test-first` skill (Matt's `tdd`, which `/implement` calls, runs inside it).

Unit tests only today: `*.test.ts` in `packages/platform-js/test/`, using `@effect/vitest` and `effect/FastCheck`
property tests. Hard rules load from `.claude/rules/testing.md`; tiers: `DEV_GUIDE.md` → Testing Tiers.

## Versioning

Changesets and releases are being set up under #16; follow `DEV_GUIDE.md` → Versioning & releases.

## Coding Standards

This codebase follows functional programming principles **rigorously**: immutability (no `let`/loops/mutation),
`Either` for pure logic vs `Effect` for side effects, parse-don't-validate, total functions, typed errors. The hard
rules (including JSDoc requirements for public APIs) load from `.claude/rules/functional-style.md` when source code is
touched; full rationale and worked examples: `docs/CodingConventions.md`.

## Common Gotchas

- **Tests import the package by name** (`@midnight-ntwrk/platform-js/effect/Hex`), through the `./effect/*` export.
  `./effect/internal/*` is blocked, so tests can't import internals; a new `effect/` module is also re-exported from
  `src/effect/index.ts`.
- **`yarn lint` fails today**: typescript-eslint doesn't support TypeScript 7, so lint gives no coverage. The
  type-check is the gate.
- **The type-check has five known errors**, all from before the agent setup: `yarn run -T tsc -b tsconfig.json` (in
  `packages/platform-js/`) reports TS2345 in `test/effect/NetworkId.test.ts` at lines 30, 37, 38, 44 and 45
  ("Argument of type 'string' is not assignable to parameter of type 'NetworkIdInput'"). Any other type error is yours
  to fix.
- **Turbo's cache can be stale** after branch switches or rebases: bypass with `--force` (`yarn build --force`).
- **Effect skills** in `.claude/skills/effect-*` come from two places. `effect-ts` is vendored Effect v3 guidance from
  Claude-Matrix (MIT), not managed by a CLI: edit it only with `.claude/skills/effect-ts/ATTRIBUTION.md` updated.
  `effect-v3-to-v4` is managed by the `skills` CLI and pinned in `skills-lock.json` (copy install mode): never
  hand-edit it; update with `npx skills update` (`docs/ClaudeCode.md`).

<!-- Set up by /setup-matt-pocock-skills. Edit it by hand, together with docs/agents/*.md.
     Do not re-run the skill: its defaults create bare labels and docs/adr/. -->
## Agent skills

### Issue tracker

Issues live in GitHub Issues for `midnightntwrk/platform-js`, through the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The skills' five triage roles map onto existing org labels (`status:untriaged`, `question`, `wontfix`); never create
the skills' bare default labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` at the repo root, and ADRs in `docs/decisions/` in MADR format. This overrides the
skills' `docs/adr/` path and minimal ADR format. See `docs/agents/domain.md`.

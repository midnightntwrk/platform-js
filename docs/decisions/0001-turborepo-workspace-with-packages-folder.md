# Turborepo workspace at the repo root, packages in `packages/`

- Status: accepted
- Date: 2026-11-17

Technical Story: [#18](https://github.com/midnightntwrk/platform-js/issues/18)

## Context and Problem Statement

platform-js was split out of midnight-sdk and kept its layout: the Yarn workspace sits in `platform-js/` and the one
package in `platform-js/platform-js/`, because midnight-sdk held compact-js alongside it. The repo needs a layout of its
own. Should the workspace move to the repo root with packages under `packages/`, or should the single package become
the repo root?

## Decision Drivers

- Moving the package is the expensive part: every path in docs, agent rules, tsconfig, vitest, eslint and CI changes.
  The layout chosen now should not need moving again.
- The build already runs through Turborepo (`turbo run build|test|package`).
- midnight-wallet, a sibling Midnight repo, uses a Turborepo workspace with `packages/*`; matching it lowers the cost of
  working across both.

## Considered Options

- Turborepo workspace at the repo root, the package in `packages/platform-js/`
- Single package at the repo root, no workspace and no Turborepo

## Decision Outcome

Chosen option: "Turborepo workspace at the repo root, the package in `packages/platform-js/`", because a second package
can be added without another layout move, Turborepo already works here, and it matches midnight-wallet.

### Positive Consequences

- A new package is a new folder under `packages/`; nothing else moves.
- Shared config (`tsconfig.base.json`, `eslint.config.mjs`, `vitest.config.ts`, `turbo.json`) lives once, at the root.

### Negative Consequences

- With one package, the workspace and Turborepo add a layer a single-package repo would not need.
- Commands run from the root go through Turborepo; per-file commands (one test file, the type-check) run in the
  package folder.

## Pros and Cons of the Options

### Single package at the repo root

- Good, because it is the simplest layout for one package: no workspace, no task runner.
- Bad, because adding a second package means moving everything again.
- Bad, because it drops Turborepo, which the build already uses, and differs from midnight-wallet.

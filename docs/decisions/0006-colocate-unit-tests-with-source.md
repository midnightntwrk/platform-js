# Keep unit tests in a test folder beside the source they cover

- Status: accepted
- Date: 2026-11-25

Technical Story: [#30](https://github.com/midnightntwrk/platform-js/issues/30)

## Context and Problem Statement

The package's tests sit in a separate tree, `packages/platform-js/test/effect/`, inherited from midnight-sdk. That tree
mirrors `src/effect/` by hand, so a reader of a module has to know where to look for its tests, and a module without
tests is easy to miss. midnight-wallet, which this repo follows for layout (ADR-0001), mostly keeps tests in `test/`
folders inside `src/`. Its newer library packages do: `wallet-sdk` (added 2026-04-21, `src/test`), `wallet-sdk-testkit`
and `state-translation`. Some packages use a package-level `test/` folder, and `dust-wallet`, `shielded-wallet` and
`unshielded-wallet` use both layouts. Where should platform-js keep its tests, and where would integration and
end-to-end tests go?

## Decision Drivers

- A module's tests are found from the module, without a parallel tree to keep in step.
- Match midnight-wallet, so people and agents moving between the repos meet one layout.
- Test files must never reach `dist/` or become public entry points. The `./effect/*` export makes every module under
  `src/effect/`, at any depth, public as soon as it is built.
- The test tier stays readable from the file name alone.

## Considered Options

- A `test/` folder beside the source: `src/effect/test/Hex.test.ts`
- Each test file directly beside its module: `src/effect/Hex.test.ts`
- Keep the separate tree: `packages/platform-js/test/effect/Hex.test.ts`

## Decision Outcome

Chosen option: "A `test/` folder beside the source", because it puts each module's tests one folder away from it, keeps
the source folder listing to modules only, and matches the layout most midnight-wallet packages use (`wallet-sdk`,
`wallet-sdk-testkit`, `state-translation`, `capabilities`, `node-client`).

- Unit tests are `src/<folder>/test/<Module>.test.ts`, for the modules in `<folder>`. Shared test helpers (FastCheck
  arbitraries) sit in the same `test/` folder.
- The file name sets the tier, not the folder: `*.test.ts` is unit, `*.integration.test.ts` is integration, and both
  live in the same `test/` folders.
- No end-to-end tier for now: the package is a library with no running system to drive. If one is ever needed, it is a
  separate private workspace package (as midnight-wallet's `packages/e2e-tests`), never a folder inside a published
  package.
- `tsconfig.build.json` excludes `src/**/test/**`, so no test file is compiled into `dist/`. `check-barrel-exports`
  skips `test/` folders, as it skips `internal/`, and so does the JSDoc lint. An ESLint block for `**/test/**` rejects
  any load of `internal/` from a test.
- Tests still import the module under test by relative `.ts` path (ADR-0003), now `../Hex.ts`, and import public modules
  only, never `internal/`. Internal helpers are covered through the public modules that use them.

### Positive Consequences

- A module and its tests are listed side by side; a module with no `test/` file is visible at a glance.
- One layout with most midnight-wallet packages, its newer library packages included.

### Negative Consequences

- Test files sit under `src/`, so the build, the barrel check, the JSDoc lint and coverage must each leave `test/` out,
  and a new tool that scans `src/` must be told the same. A test can reach `internal/` by a short relative path
  (`../internal/hex.ts`), so only the ESLint ban keeps tests on the public modules.
- Every existing test, the Vitest, TypeScript and Turborepo configs, and the docs that name `test/effect/` change once.

## Pros and Cons of the Options

### A `test/` folder beside the source

- Good, because tests are one folder from their module.
- Good, because it matches most midnight-wallet packages.
- Bad, because build, barrel check and coverage must exclude `test/` under `src/`.

### Each test file directly beside its module

- Good, because a test is next to its module, with no folder between.
- Bad, because `src/effect/` would mix modules, tests and test helpers in one listing.
- Bad, because midnight-wallet uses it only in `spec-reference`.

### Keep the separate tree

- Good, because nothing changes, and `src/` holds only shipped code.
- Bad, because the tree must mirror `src/` by hand, and missing tests are easy to overlook.
- Bad, because midnight-wallet's newer library packages do not use it.

## Links

- Follows the layout of [ADR-0001](0001-turborepo-workspace-with-packages-folder.md)
- Keeps the relative `.ts` imports of [ADR-0003](0003-typescript-source-as-source-of-truth.md)

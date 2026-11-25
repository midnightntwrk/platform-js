---
paths:
  - 'packages/platform-js/src/**/test/**'
  - '**/*.test.ts'
  - '**/vitest.config.ts'
---

# Testing — hard rules

## One tier: unit

- Every test is a unit test: `*.test.ts` in a `test/` folder beside the source it covers,
  `packages/platform-js/src/<folder>/test/<Module>.test.ts` (ADR-0006). Pure: no network, no external services,
  no Docker. Must pass anywhere with zero setup. An `integration` Vitest lane exists (`*.integration.test.ts`,
  `yarn test:integration`) but holds no tests; don't add an integration test without an issue. A file named
  `*.integration.test.ts` leaves the unit lane, so never use that suffix for a unit test.
- Tooling tests are the one exception. Tests for the root scripts, `turbo.json`, the Vitest configs and the root ESLint
  config's JSDoc rules live in `test/tooling/` at the repo root and run with `yarn test:tooling` (root
  `vitest.tooling.config.ts`). They may use temp dirs and temp git repos, and run the scripts by path as child
  processes. They are not package tests, so the `src/` import rules below do not apply to them.
- Tests import the module under test by relative path (`../Hex.ts`), never by package name, so a test never needs a
  build and never runs against a stale `dist/`. Import public modules, not `internal/`: ESLint's
  `no-restricted-imports` rejects an `internal/` path in a `test/` folder. Internal helpers are covered through the
  public modules that use them.
- `test/` folders never reach `dist/` (`tsconfig.build.json` excludes them), are left out of coverage, and are skipped
  by `check-barrel-exports` and the JSDoc lint.
- Shared FastCheck arbitraries live in `src/effect/test/Arbitrary.ts`; add new ones there.
- Commands (all tests, one file, type-check): `CLAUDE.md` → Build Commands.

## TDD contract (mandatory — full loop: the `test-first` skill)

- `test-first` is the hard rule. Matt's `tdd` skill, which `/implement` calls, runs inside it; where they differ,
  `test-first` wins. One exception: inside `/implement`, write one test per cycle unless the user picks a suite for
  this ticket.
- Design the test thoroughly, write it, and **observe it fail for the expected reason** before implementing.
- The user reviews the tests before implementation starts.
- **A written, confirmed-failing test must never be weakened** to accommodate implementation difficulties — no loosened
  assertions, no "the fake can't do X so check Y instead". If implementation cannot pass the test as written, stop and
  present the gap to the user (what the test expects, what exists, why, proposed solutions). The test is the
  specification.

## House style (canonical file: `src/effect/test/Hex.test.ts`)

- Import `describe`, `expect`, `it` from `@effect/vitest`. Use `it.effect(..., () => Effect.gen(...))` for Effect code.
- Use a property test with `effect/FastCheck` (`fc.assert(fc.property(...))`, inside a plain `it`) for a rule that
  holds over an input space: every byte length in a range, every valid moniker, every value either side of a bound.
  Use an example for an exact error message or a named edge case (`''`, `'0x'`). Most modules need both. For Effect
  bodies use `it.prop` / `it.effect.prop`, or `fc.asyncProperty` with `Effect.runPromise`; then **return or await**
  `fc.assert(...)`, or the test passes before the property runs.
- Make a generator reach the edges: random integers seldom land on a bound, so check the values either side of it
  (`valuesAround` in `src/effect/test/IntegerRange.test.ts`) rather than trusting chance.
- Test names describe behaviour. New files use the `should …` style; in an existing file, match its style. Group by
  `describe` per module and per function.

## Test doubles

- Prefer real values, then hand-written stubs/fakes. Reach for `vi.fn`/`vi.mock` only when a fake is impractical.
- Fake Effect services with a Layer: `Layer.succeed(Configuration.Network, Configuration.Network.of(...))`, provided
  via `Effect.provide`.
- Config fixtures: `ConfigProvider.fromJson(json)`, applied with `Effect.withConfigProvider`. Never
  `Configuration.configProvider(json)`: it reads real environment variables first, so a shell or CI variable changes
  the result. To test `configProvider` itself, clear every variable it could read with `vi.stubEnv(name, undefined)`
  in a `beforeEach` and restore them with `vi.unstubAllEnvs()` (`src/effect/test/Configuration.test.ts`).

## Testing Effect code

- Inside `it.effect`, `yield*` the effect (an `Either` yields too). Outside it, unwrap with `Effect.runPromise`, or
  `Effect.runSync` for pure effects (allowed in tests; `src` code doesn't call it).
- Expected failures: `const error = yield* Effect.flip(...)`, then assert its guard (`ParseError.isParseError`) and
  its message. With an `Exit`, get the error with `Cause.failureOption` and assert the same. `Exit.isFailure` alone is
  not enough: a defect or interrupt passes it too. Never try/catch around a thrown Effect.
- Brand rejections: use `Brand.either(x)` with `Either.isLeft` and check the error, or
  `expect(() => Brand(x)).toThrowError(/…/)` with a message or class. Never a bare `toThrow()` /
  `toThrowError()`, and never `expect(() => Effect.runSync(...)).toThrow()`.

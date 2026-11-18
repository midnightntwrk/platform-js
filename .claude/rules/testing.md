---
paths:
  - 'packages/platform-js/test/**'
  - '**/*.test.ts'
  - '**/vitest.config.ts'
---

# Testing — hard rules

## One tier: unit

- Every test is a unit test: `*.test.ts` under `packages/platform-js/test/`. Pure: no network, no external services,
  no Docker. Must pass anywhere with zero setup. There is no integration tier; don't add one without an issue.
- Tests import from `src/` by relative path (`../../src/effect/Hex.js`), never by package name, so a test never needs
  a build and never runs against a stale `dist/`. Import public modules, not `src/effect/internal/`: nothing enforces
  this, so check it in review.
- Shared FastCheck arbitraries live in `test/effect/Arbitrary.ts`; add new ones there.
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

## House style (canonical file: `test/effect/Hex.test.ts`)

- Import `describe`, `expect`, `it` from `@effect/vitest`. Use `it.effect(..., () => Effect.gen(...))` for Effect code.
- Prefer property tests with `effect/FastCheck` (`fc.assert(fc.property(...))`) over hand-picked examples. For
  Effect bodies use `it.prop` / `it.effect.prop`, or `fc.asyncProperty` with `Effect.runPromise`; then **return or
  await** `fc.assert(...)`, or the test passes before the property runs.
- Test names describe behaviour. New files use the `should …` style; in an existing file, match its style. Group by
  `describe` per module and per function.

## Test doubles

- Prefer real values, then hand-written stubs/fakes. Reach for `vi.fn`/`vi.mock` only when a fake is impractical.
- Fake Effect services with a Layer: `Layer.succeed(Configuration.Network, Configuration.Network.of(...))`, provided
  via `Effect.provide`.
- Config fixtures: `ConfigProvider.fromJson(json)`, applied with `Effect.withConfigProvider`. Never
  `Configuration.configProvider(json)`: it reads real environment variables first, so a shell or CI variable changes
  the result. `test/effect/Configuration.test.ts` still uses it (#29): don't copy that part.

## Testing Effect code

- Inside `it.effect`, `yield*` the effect (an `Either` yields too). Outside it, unwrap with `Effect.runPromise`, or
  `Effect.runSync` for pure effects (allowed in tests; `src` code doesn't call it).
- Expected failures: `const error = yield* Effect.flip(...)`, then assert its guard (`ParseError.isParseError`) and
  its message. With an `Exit`, get the error with `Cause.failureOption` and assert the same. `Exit.isFailure` alone is
  not enough: a defect or interrupt passes it too. Never try/catch around a thrown Effect.
- Brand rejections: use `Brand.either(x)` with `Either.isLeft` and check the error, or
  `expect(() => Brand(x)).toThrowError(/…/)` with a message or class. Never a bare `toThrow()` /
  `toThrowError()`, and never `expect(() => Effect.runSync(...)).toThrow()`.

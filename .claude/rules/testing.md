---
paths:
  - 'platform-js/platform-js/test/**'
  - '**/*.test.ts'
  - '**/vitest.config.ts'
---

# Testing — hard rules

## One tier: unit

- Every test is a unit test: `*.test.ts` under `platform-js/platform-js/test/`. Pure: no network, no external services,
  no Docker. Must pass anywhere with zero setup. There is no integration tier; don't add one without an issue.
- Tests import the package by name (`@midnight-ntwrk/platform-js/effect/Hex`), never by relative path into `src/`.
- Shared FastCheck arbitraries live in `test/effect/Arbitrary.ts`; add new ones there.

Run from `platform-js/` (the Yarn workspace root; the layout changes under #18):

- All tests: `yarn test` (turbo; builds dependencies first).
- One file, from `platform-js/platform-js/`: `yarn run -T vitest run test/effect/Hex.test.ts`.

## TDD contract (mandatory — full loop: the `test-first` skill)

- `test-first` is the hard rule. Matt's `tdd` skill, which `/implement` calls, runs inside it; where they differ,
  `test-first` wins.
- Design the test thoroughly, write it, and **observe it fail for the expected reason** before implementing.
- The user reviews the tests before implementation starts.
- **A written, confirmed-failing test must never be weakened** to accommodate implementation difficulties — no loosened
  assertions, no "the fake can't do X so check Y instead". If implementation cannot pass the test as written, stop and
  present the gap to the user (what the test expects, what exists, why, proposed solutions). The test is the
  specification.

## House style (canonical file: `test/effect/Hex.test.ts`)

- Import `describe`, `expect`, `it` from `@effect/vitest`. Use `it.effect(..., () => Effect.gen(...))` for Effect code.
- Prefer property tests with `effect/FastCheck` (`fc.assert(fc.property(...))`, or `fc.asyncProperty` with
  `Effect.runPromise` for Effect bodies) over hand-picked examples.
- Test names describe behaviour in the existing `should …` style, grouped by `describe` per module and per function.

## Test doubles

- Prefer real values, then hand-written stubs/fakes. Reach for `vi.fn`/`vi.mock` only when a fake is impractical.
- Fake Effect services with a Layer: `Layer.succeed(Configuration.Network, Configuration.Network.of(...))`, provided
  via `Effect.provide`. Config-driven layers take a `ConfigProvider` (`Configuration.configProvider(json)`) instead of
  real environment variables.

## Testing Effect code

- Inside `it.effect`, `yield*` the effect (an `Either` yields too). Outside it, unwrap with `Effect.runPromise` (or
  `Effect.runSync` for pure effects).
- Expected failures: `yield* Effect.flip(...)` and assert on the error with its guard (`ParseError.isParseError`), or
  `Effect.runPromiseExit` then `Exit.isFailure` — never try/catch around a thrown Effect.
- Brand constructors throw by design; assert those with `expect(() => Brand(x)).toThrowError()`.

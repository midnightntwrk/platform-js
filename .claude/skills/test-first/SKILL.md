---
name: test-first
description: >
  Mandatory test-first loop for platform-js. Use whenever implementing new behavior or fixing a bug in code under
  platform-js/platform-js/src, or on any mention of TDD or test-first. The test is written, observed failing, and
  approved by the user BEFORE any implementation. Matt's `tdd` skill (called by /implement) runs inside this loop. Not
  needed for docs, config, or pure refactors with existing coverage.
---

# Test-First Loop: platform-js

**The test is the specification.** Once a test fails for the right reason, it must not be weakened to fit the
implementation. Consult the user on the size of the feedback loop: it may be one test at a time, or a full suite
prepared ahead of time, depending on the task. If unsure, prefer fewer tests per cycle.

Commands below are for today's layout: Yarn workspace root `platform-js/`, single package `platform-js/platform-js/`.
Issue #18 will change the layout; update these commands when it lands.

## 0. Choose the test file

- platform-js has **unit tests only**: `platform-js/platform-js/test/effect/<Module>.test.ts`. Pure, no network, no
  infra. Must pass anywhere with zero setup.
- Tests import the package by name (`@midnight-ntwrk/platform-js/effect/Hex`), never by relative path into `src/`.
- See `test/effect/Hex.test.ts` for the house style.

## 1. Design the test

- Pin down the exact behavior and the precise assertions before writing anything.
- Use `@effect/vitest` (`describe`, `it.effect`, `expect`) for Effect-returning code.
- Prefer property tests with `effect/FastCheck` (`fc.assert`, `fc.property` / `fc.asyncProperty`) where the behavior
  holds over a range of inputs. Put reusable generators in `test/effect/Arbitrary.ts`.
- Prefer stubs and fakes over `vi.fn` / `vi.mock`: implement a stub object (or a test `Layer`) that provides the
  expected data.
- Design so the test can be implemented **without later modification**.

## 2. Write the test

One behavior, precise assertions: exactly what was designed in step 1.

## 3. Observe RED

From `platform-js/platform-js/`, run the one test file:

```bash
yarn run -T vitest run test/effect/<Module>.test.ts
```

Confirm it fails **for the expected reason**: a failed assertion on the behavior under test. A type error, bad import,
or setup crash is not red; fix the test harness first.

## 4. GATE: stop for user review

Present the failing test to the user. The user reviews (and ideally commits) the test **before implementation begins**.
Do not proceed without approval.

## 5. Implement

The minimum code that makes the test pass. Follow the repo's functional rules (`.claude/rules/functional-style.md`,
`docs/CodingConventions.md`): no mutation, pure core, Effect at the I/O boundary.

## 6. Observe GREEN

Re-run the exact same command from step 3. Then confirm the whole package still passes.

## 7. Review

Re-read the diff as a reviewer would. From `platform-js/`, run:

```bash
yarn lint
yarn test
```

`yarn lint` fails today for every change (typescript-eslint doesn't support TypeScript 7; see `CLAUDE.md` → Common
Gotchas). Report that, don't try to fix it here.

## 8. Consider refactor

Improve names and structure while the tests stay green. Re-run the tests after.

## 9. Next item

Return to step 0 for the next behavior.

## If the implementation cannot pass the test as written

Do **not** weaken it: no loosened assertions (`toBe(5)` → `toBeGreaterThan(0)`), no "the fake can't do X, so we check
Y instead" comments. Instead, gather every such case and present it to the user: what the test expects, what currently
exists, why the gap exists, and proposed solutions (fix the fake, change the API design, …). Wait for the user's
decision.

## With /implement

`/implement` calls Matt's `tdd` skill (`/mattpocock-skills:tdd`) at the agreed seams. When it does, run this loop around
it, per ticket: Matt's `tdd` guides what a good test is and where it goes; this skill decides the steps. That includes
the step 4 gate: stop after red and wait for the user's approval before implementing, even inside `/implement`.

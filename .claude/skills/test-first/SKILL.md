---
name: test-first
description: >
  Mandatory test-first loop for platform-js. Use whenever implementing new behavior or fixing a bug in code under
  packages/platform-js/src, or on any mention of TDD or test-first. The test is written, observed failing, and
  approved by the user BEFORE any implementation. Matt's `tdd` skill (called by /implement) runs inside this loop. Not
  needed for docs, config, or pure refactors with existing coverage.
---

# Test-First Loop: platform-js

**The test is the specification.** Once a test fails for the right reason, it must not be weakened to fit the
implementation. Consult the user on the size of the feedback loop: it may be one test at a time, or a full suite
prepared ahead of time, depending on the task. If unsure, prefer fewer tests per cycle. Inside `/implement`, work one
test at a time unless the user picks a suite for this ticket.

Commands, layout and known failures (lint, type-check) are in `CLAUDE.md` → Build Commands and Common Gotchas. Run
loop commands from `packages/platform-js/` unless a step says otherwise.

## 0. Choose the test file

Follow `.claude/rules/testing.md`: where tests live, how they import the package, house style, test doubles.

## 1. Design the test

- Pin down the exact behavior and the precise assertions before writing anything.
- Design so the test can be implemented **without later modification**.

## 2. Write the test

One behavior, precise assertions: exactly what was designed in step 1.

## 3. Observe RED

For a new export, first add a stub with the final signature that returns a wrong value or `Effect.die(...)`, so red is
a failed assertion, not "is not a function". Then run:

```bash
yarn run -T vitest run test/effect/<Module>.test.ts
yarn run -T tsc -b tsconfig.json
```

Confirm the test fails **for the expected reason**: a failed assertion on the behavior under test. A type error, bad
import, or setup crash is not red; fix the test harness first. `tsc` may show only the known errors listed in
`CLAUDE.md` → Common Gotchas; any other type error is yours.

## 4. GATE: stop for user review

Present the failing test to the user. Do not implement without approval.

At approval, record a reference for the approved test:

- if the user commits it, that commit;
- otherwise, `git hash-object <file>` for each test file.

## 5. Implement

The minimum code that makes the test pass. Follow the repo's functional rules (`.claude/rules/functional-style.md`,
`docs/CodingConventions.md`): no mutation, pure core, Effect at the I/O boundary.

## 6. Observe GREEN

Re-run both commands from step 3. The test passes and `tsc` shows only the known errors.

Check the test is unchanged since the gate: `git diff <commit> -- test/` is empty, or each `git hash-object` matches.
If not, go back to step 4 and get approval again.

No `yarn lint` or full `yarn test` per cycle.

## 7. Next item

Return to step 0 for the next behavior. Refactoring is not part of this loop: it belongs to the `code-review` stage,
as in Matt's `tdd`.

## 8. Finish

After the last item, from the repo root, run the full suite once:

```bash
yarn test
```

Add `--force` (`yarn test --force`) when `vitest.config.ts` changed: turbo's cache does not track it.

## If the implementation cannot pass the test as written

Do **not** weaken it: no loosened assertions (`toBe(5)` → `toBeGreaterThan(0)`), no "the fake can't do X, so we check
Y instead" comments. Instead, gather every such case and present it to the user: what the test expects, what currently
exists, why the gap exists, and proposed solutions (fix the fake, change the API design, …). Wait for the user's
decision.

## With /implement

`/implement` calls Matt's `tdd` skill (`/mattpocock-skills:tdd`) at the agreed seams. When it does, run this loop around
it, per ticket: Matt's `tdd` guides what a good test is and where it goes; this skill decides the steps. That includes
the step 4 gate: stop after red and wait for the user's approval before implementing, even inside `/implement`.

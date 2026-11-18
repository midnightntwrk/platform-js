# Stay on TypeScript 6.0

- Status: accepted
- Date: 2026-11-18

Technical Story: [#47](https://github.com/midnightntwrk/platform-js/issues/47)

## Context and Problem Statement

platform-js was on TypeScript 6.0.3 until an automated dependency bump moved `typescript` to 7.0.2. Nobody chose that
move: the bump changed only `package.json` and `yarn.lock`, and it broke `yarn lint`. Effect 3 itself works on
TypeScript 7 (it has no TypeScript peer dependency), but the tools around it don't. Which TypeScript line should
platform-js stay on?

## Decision Drivers

- `typescript-eslint` supports only `typescript` `>=4.8.4 <6.1.0`, so on any later version `yarn lint` cannot run.
- TypeScript 7 loads no compiler plugins, so `@effect/language-service` can't run on it. Its TypeScript 7 replacement,
  `@effect/tsgo`, targets Effect 4 and runs only part of its checks on Effect 3, and platform-js is on Effect 3.
- midnight-wallet, the sibling Midnight TypeScript repo, is on TypeScript 5.9.3; staying close to it lowers the cost of
  working across both.

## Considered Options

- Stay on TypeScript 6.0
- Move to TypeScript 7

## Decision Outcome

Chosen option: "Stay on TypeScript 6.0", because it is the only option on which both `typescript-eslint` and the Effect
language service can run. The root `package.json` pins `typescript` to `~6.0.3`: `~` allows 6.0 patch releases only,
where `^` would allow 6.1 and later, which `typescript-eslint` does not support.

### Positive Consequences

- `yarn lint` runs, with `typescript-eslint`'s type-aware rules.
- The Effect language service can be configured on top of this TypeScript version.
- The TypeScript version stays close to midnight-wallet's.

### Negative Consequences

- Bumps past 6.0 wait until `typescript-eslint` supports them.
- Automated dependency updates must hold `typescript` below 6.1: the Renovate setup
  ([#17](https://github.com/midnightntwrk/platform-js/issues/17)) needs a rule for it.
- The move to TypeScript 7 needs a later decision, once `typescript-eslint` supports it and the Effect language service
  has a replacement that works with the Effect version in use.

## Pros and Cons of the Options

### Stay on TypeScript 6.0

- Good, because `typescript-eslint` supports it, so `yarn lint` runs.
- Good, because it loads compiler plugins, so `@effect/language-service` can run.
- Good, because it is closer to midnight-wallet's TypeScript 5.9.3.
- Bad, because platform-js misses what TypeScript 7 brings until the tools catch up.
- Bad, because the version must be held below 6.1 by hand and in automated updates.

### Move to TypeScript 7

- Good, because it is the newest TypeScript, and Effect 3 itself runs on it.
- Bad, because `typescript-eslint` does not support it, so `yarn lint` cannot run.
- Bad, because it loads no compiler plugins, so `@effect/language-service` cannot run, and `@effect/tsgo` targets
  Effect 4 and runs only part of its checks on Effect 3.
- Bad, because it moves further from midnight-wallet's TypeScript 5.9.3.

# Lint the public API's JSDoc with eslint-plugin-jsdoc

- Status: accepted
- Date: 2026-11-25

Technical Story: [#92](https://github.com/midnightntwrk/platform-js/issues/92)

## Context and Problem Statement

`.claude/rules/functional-style.md` → Public API documentation says every export needs JSDoc: a description, `@param`
for each parameter, `@returns` and a `@category` tag. Nothing checked it. `prettier-plugin-jsdoc` formats JSDoc but
checks nothing in it, and an audit ([#88](https://github.com/midnightntwrk/platform-js/issues/88)) found 21 of 63
exports with gaps. Should a lint rule enforce the rule, so new gaps fail `yarn lint` instead of waiting for a review?

## Decision Drivers

- Most of #88's gaps are mechanical: no JSDoc, no description, no `@category`, no `@param`/`@returns` on a plain
  function. A lint sees all of these.
- Some of the rule no lint can see: `@param`/`@returns` on exports built by a call (`dual(...)`, `Brand.refined`,
  `internal.make(...)`), `@throws`, and whether a doc is true.
- Each new dev dependency is one more thing to keep up to date.
- midnight-wallet, midnight-sdk, midnight-js and compact-js use no JSDoc lint rule.

## Considered Options

- Add a narrow `eslint-plugin-jsdoc` config
- Add no lint rule; rely on review

## Decision Outcome

Chosen option: "Add a narrow `eslint-plugin-jsdoc` config", because it turns the mechanical part of the rule into a
`yarn lint` failure for one dev dependency, and leaves the rest to review as before.

The config is a block in the root `eslint.config.mjs`, for `packages/*/src/**/*.{ts,mts,tsx}` minus `internal/` and the
two barrels, `src/index.ts` and `src/effect/index.ts`. Any other `index.ts` is checked like any other file.

- `jsdoc/require-jsdoc` and `jsdoc/require-description` on exported functions, constants, types, interfaces, enums and
  classes. Functions include `export declare function` and overload signatures. A `declare namespace` needs no JSDoc of
  its own, whether it merges with a same-named type or stands alone; its members do.
- `jsdoc/require-param` and `jsdoc/require-returns` on exports written as a function: a function declaration, an
  `export declare function` or overload signature, or a constant set to an arrow function or a function expression. Each
  parameter needs one `@param`. A destructured parameter's fields need no `@param` of their own.
- `jsdoc/no-restricted-syntax` for a `@category` tag on every export's JSDoc block, namespace members included, every
  namespace itself left out. `jsdoc/no-missing-syntax` can't do this: it passes a whole file on one match.
- ESLint's own `no-restricted-syntax` bans a local export list (`export { x }` with no `from`) and `export default`.
  Every export is declared in place, so the rules above can see its JSDoc. Re-exports (`export { x } from './X.ts'`,
  `export * from`) stay allowed. `jsdoc/no-restricted-syntax` can't do this ban: it checks only nodes that already have
  a JSDoc block.

The plugin's version lives in the Yarn catalog (`.yarnrc.yml`).

Not checked, so left to review:

- `@param`/`@returns` on an export not written as a function: one built by a call or assigned from another binding
  (`= internal.parseHex`). Calls include `dual(...)` and the brand constructors (`Brand.refined`, `internal.make(...)`).
  The house rule wants `@param`/`@returns` on a brand constructor, but the lint can't see one.
- A function export wrapped in `as` or `satisfies` (`export const f = ((a) => a) as F`): the lint doesn't see its
  parameters.
- `@returns` on a function that returns `void`: the plugin skips it, though the house rule has no exception.
- Members of an exported class: its methods and properties.
- JSDoc on a `declare namespace` with no same-named type: every namespace is exempt, so its doc is review's job.
- `@throws`: a lint can't tell which exports throw.
- The `@category` value: the check finds the tag, not whether its value is one of the set in use.
- `/** @internal */` in `internal/`, and the two barrels `src/index.ts` and `src/effect/index.ts`: all are outside the
  config.
- Whether a doc is true.

### Positive Consequences

- A new export with no JSDoc, no description, no `@category`, or a plain function with no `@param`/`@returns`, fails
  `yarn lint` and CI's General Checks.
- `jsdoc/require-jsdoc`'s `--fix` inserts empty JSDoc blocks; they then fail `require-description`, so a stub can't slip
  through.

### Negative Consequences

- The rule could only start once #88 had filled the existing gaps, so it lands after #88.
- The items under "Not checked" stay review-only.

## Pros and Cons of the Options

### Add a narrow `eslint-plugin-jsdoc` config

- Good, because the mechanical gaps fail CI instead of waiting for a reader.
- Good, because the plugin supports our ESLint 10 and TypeScript mode.
- Bad, because it adds a dev dependency the sibling repos don't have.
- Bad, because it checks only part of the rule, which may read as the whole rule being enforced.

### Add no lint rule; rely on review

- Good, because no new dependency.
- Bad, because gaps return as soon as a review misses one, as #88's audit shows they did.

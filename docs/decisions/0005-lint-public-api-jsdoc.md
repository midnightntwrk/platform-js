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

The config is a block in the root `eslint.config.mjs`, for `packages/*/src/**/*.ts` minus `internal/` and `index.ts`:

- `jsdoc/require-jsdoc` and `jsdoc/require-description` on exported functions, constants, types, interfaces, enums and
  classes. A `declare namespace` merged with a same-named type needs no JSDoc of its own (#88); its members do.
- `jsdoc/require-param` and `jsdoc/require-returns` on exports written as a function: a function declaration, or a
  constant set to an arrow function or a function expression.
- `jsdoc/no-restricted-syntax` for a `@category` tag on every export's JSDoc block, namespace members included, the
  namespace itself left out. `jsdoc/no-missing-syntax` can't do this: it passes a whole file on one match.

The plugin's version lives in the Yarn catalog (`.yarnrc.yml`).

Not checked, so left to review:

- `@param`/`@returns` on an export not written as a function: one built by a call (`dual(...)`, `Brand.refined`,
  `internal.make(...)`) or assigned from another binding (`= internal.parseHex`).
- `@throws`: a lint can't tell which exports throw.
- The `@category` value: the check finds the tag, not whether its value is one of the set in use.
- `/** @internal */` in `internal/`, and anything in `index.ts`: both are outside the config.
- Whether a doc is true.

### Positive Consequences

- A new export with no JSDoc, no description, no `@category`, or a plain function with no `@param`/`@returns`, fails
  `yarn lint` and CI's General Checks.
- #88's fixes can't quietly come undone.

### Negative Consequences

- The rule could only start once #88 had filled the existing gaps, so it lands after #88.
- The items under "Not checked" stay review-only, and a clean lint can read as a complete doc.
- `jsdoc/require-jsdoc`'s `--fix` inserts empty JSDoc blocks; they then fail `require-description`, so a stub can't slip
  through.

## Pros and Cons of the Options

### Add a narrow `eslint-plugin-jsdoc` config

- Good, because the mechanical gaps fail CI instead of waiting for a reader.
- Good, because the plugin supports our ESLint 10 and TypeScript mode.
- Bad, because it adds a dev dependency the sibling repos don't have.
- Bad, because it checks only part of the rule, which may read as the whole rule being enforced.

### Add no lint rule; rely on review

- Good, because no new dependency.
- Bad, because gaps return as soon as a review misses one, as #88's audit shows they did.

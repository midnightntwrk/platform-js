# TypeScript source as the source of truth

- Status: accepted
- Date: 2026-11-25

Technical Story: [#67](https://github.com/midnightntwrk/platform-js/issues/67)

## Context and Problem Statement

`@midnightntwrk/platform-js` is written in TypeScript and compiled by `tsc` to `dist/`. Its source imported siblings
as `./Hex.js`, and every entry in the package `exports` pointed only at `dist/`, the way midnight-wallet does. In
wallet's monorepo that means a package has to be built before another package, a test or an editor sees a change to
it. Should the `.ts` source, rather than the compiled `dist/`, be what the code imports and what tools resolve to?

## Decision Drivers

- The file you edit should be the file that is imported and resolved, with no build step in between.
- Consumers that don't opt in must see no change: same `dist/` code, same `.d.ts` types.
- publint `--strict` must pass: every file an export points at must be in the tarball.
- A custom export condition must not clash with another package's condition, including other `@midnightntwrk`
  packages.
- TypeScript stays on 6.0 ([ADR-0002](0002-stay-on-typescript-6.md)).

## Considered Options

- `.ts` imports and a source-first export condition, shipping `src/`
- `.ts` imports, with the `types` condition pointing at the `.ts` source
- Keep wallet's layout: `.js` imports and `dist/`-only exports

## Decision Outcome

Chosen option: "`.ts` imports and a source-first export condition, shipping `src/`", because it makes the `.ts` file
the one you edit, import and resolve inside the repo, while consumers without the condition get exactly what they got
before.

- **Imports:** relative imports end in `.ts` (`import * as Hex from './Hex.ts'`, `export * as Hex from './Hex.ts'`).
  `rewriteRelativeImportExtensions` (TypeScript 5.7+) allows them and rewrites them to `.js` in the emitted `.js`
  files. The emitted `.d.ts` files keep the `.ts` paths (`export * as Hex from './Hex.ts'`): TypeScript resolves such a
  path to the sibling `.d.ts`, and a consumer type-checks cleanly against them on TypeScript 4.9, 5.0, 5.6 and 6.0,
  with `skipLibCheck` off. `erasableSyntaxOnly` keeps the source runnable with types stripped. An ESLint
  `no-restricted-syntax` rule in the root `eslint.config.mjs` rejects relative import and export sources ending in
  `.js`.
- **Exports:** each of `.`, `./effect` and `./effect/*` has four conditions, in this order:
  `@midnightntwrk/platform-js/source` (the `.ts` in `src/`), `types`, `import` and `default` (all in `dist/`).
  `./effect/internal/*` stays `null`. The top-level `main`, `module` and `types` fields stay on `dist/` for resolvers
  that ignore `exports`.
- **Opting in:** only tools that ask for the condition pick it: TypeScript through `customConditions` (set in
  `tsconfig.base.json`, so TypeScript inside the repo resolves the package to its source), Vite and Vitest through
  `resolve.conditions`, Node through `--conditions`. Everyone else falls through to `types`, `import` and `default`.
  A TypeScript consumer that opts in also needs `allowImportingTsExtensions` or `rewriteRelativeImportExtensions`,
  because the source it then type-checks has `.ts` imports.
- **Condition name:** `@midnightntwrk/platform-js/source`, scoped to the package. A bare `source` could clash with a
  dependency that defines the same condition, and an org-wide `@midnightntwrk/source` would make a project opt in to
  every `@midnightntwrk` package's source at once. Prior art, all scoped and source-first: Zod (`@zod/source`), Colin
  McDonnell's [live types essay](https://colinhacks.com/essays/live-types-typescript-monorepo)
  (`@colinhacks/source`), [Nx](https://nx.dev/docs/kb/testing-without-building-dependencies) (`@myorg/source`),
  TanStack Query (`@tanstack/custom-condition`).
- **Tarball:** `files` is `["dist/", "src/", "!dist/**/*.js.map"]`. `src/` ships because the source condition points
  at it. `tsconfig.publish.json` emits declaration maps, so "Go to definition" in a consumer's editor lands in the
  shipped `.ts`; source maps (`*.js.map`) stay off.

### Positive Consequences

- Inside the repo, nothing needs a build before an editor, a test or (later) another package sees a change.
- Consumers without the condition get the same compiled `dist/` and `.d.ts` as before: a `minor` bump.
- "Go to definition" from an installed package lands in real source, not a `.d.ts`.

### Negative Consequences

- The tarball is larger: it carries `src/` and declaration maps.
- Node does not strip types from files under `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`), so an
  installed consumer that runs `node --conditions=@midnightntwrk/platform-js/source` fails. The condition is for
  TypeScript, bundlers, and packages linked inside a workspace, whose real path is outside `node_modules`.
- Source must stay erasable: no `enum`, no runtime `namespace`, no parameter properties.
- The layout differs from midnight-wallet's.

## Pros and Cons of the Options

### `.ts` imports and a source-first export condition, shipping `src/`

- Good, because the `.ts` file is what is edited, imported and resolved inside the repo.
- Good, because consumers without the condition get compiled `.d.ts`, which type-checks faster and doesn't depend on
  their compiler options.
- Good, because the condition is opt-in and scoped, so it can't be picked by accident.
- Bad, because `src/` must ship for publint and for the condition to resolve.

### `.ts` imports, with the `types` condition pointing at the `.ts` source

- Good, because no custom condition is needed.
- Bad, because every consumer type-checks the package's source with their own compiler options, which may reject it.
- Bad, because type-checking source is slower than reading `.d.ts`.

### Keep wallet's layout: `.js` imports and `dist/`-only exports

- Good, because it matches midnight-wallet and needs no change.
- Bad, because a package must be built before anything else sees a change to it.
- Bad, because `.js` imports name files that don't exist until a build.

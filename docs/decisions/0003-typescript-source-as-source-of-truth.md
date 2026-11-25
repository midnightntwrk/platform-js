# TypeScript source as the source of truth

- Status: accepted
- Date: 2026-11-25

Technical Story: [#67](https://github.com/midnightntwrk/platform-js/issues/67)

## Context and Problem Statement

`@midnightntwrk/platform-js` is written in TypeScript and compiled by `tsc` to `dist/`. Its source imported siblings as
`./Hex.js`, naming a compiled file that doesn't exist until a build, the way midnight-wallet does. Should the source
import the `.ts` files it actually sits next to, and should the published package expose that source to consumers?

## Decision Drivers

- The file you edit should be the file you import.
- Consumers must get the same package as before: compiled `.js` and `.d.ts`, nothing they have to compile.
- publint `--strict` must pass: every file an export points at must be in the tarball.
- No build machinery for a need the repo doesn't have: no package here consumes platform-js by name.
- TypeScript stays on 6.0 ([ADR-0002](0002-stay-on-typescript-6.md)).

## Considered Options

- `.ts` imports, shipping only `dist/`
- `.ts` imports plus a source export condition, shipping `src/`
- `.ts` imports plus a source export condition used only inside the repo, stripped at publish
- Keep wallet's layout: `.js` imports

## Decision Outcome

Chosen option: "`.ts` imports, shipping only `dist/`", because it makes the `.ts` file the one you edit and import,
while the published package stays the compiled `.js` and `.d.ts` consumers already get.

- **Imports:** relative imports end in `.ts` (`import * as Hex from './Hex.ts'`, `export * as Hex from './Hex.ts'`).
  `rewriteRelativeImportExtensions` (TypeScript 5.7+) allows them and rewrites them to `.js` in the emitted `.js` files.
  `erasableSyntaxOnly` keeps the source runnable with types stripped. An ESLint `no-restricted-syntax` rule in the root
  `eslint.config.mjs` rejects relative import and export sources ending in `.js`.
- **`.d.ts` paths:** the emitted `.d.ts` files keep the `.ts` paths (`export * as Hex from './Hex.ts'`). TypeScript
  resolves such a path to the sibling `.d.ts` in `dist/`, never to `src/`. A consumer of a tarball holding only `.js`
  and `.d.ts` type-checks cleanly, with `skipLibCheck: false`, on TypeScript 5.9 and 6.0 under `node10`, `nodenext` and
  `bundler`. TypeScript 5.0 is the oldest that reads `.ts` paths in `.d.ts` files. TypeScript 4.9 reports TS2691 (or
  types the module as `any` under `skipLibCheck`), and effect 3.x needs TypeScript 5 anyway.
- **Package:** `exports` keeps `types`, `import` and `default`, all in `dist/`. `files` is
  `["dist/", "!dist/**/*.map"]`, and `tsconfig.publish.json` emits no source or declaration maps, so the tarball holds
  `.js`, `.d.ts`, `package.json`, `LICENSE` and `README.md`.

### Positive Consequences

- The source imports files that exist; no import names a build output.
- Consumers' imports and resolved types are unchanged; only the relative paths inside the shipped `.d.ts` files now end
  in `.ts`.
- Nothing extra to build, ship or keep in step.

### Negative Consequences

- A tool that reads `.d.ts` files without TypeScript's resolution could trip on the `.ts` paths. None is known; if one
  turns up, a post-build rewrite of `dist/**/*.d.ts` fixes it without changing the package layout.
- Source must stay erasable: no `enum`, no runtime `namespace`, no parameter properties, no `import x = require()` or
  `export =`.
- The layout differs from midnight-wallet's.
- A future workspace package that wants to consume platform-js without a build needs a source condition then; this
  decision doesn't provide one.

## Pros and Cons of the Options

### `.ts` imports, shipping only `dist/`

- Good, because the `.ts` file is what is edited and imported.
- Good, because consumers' imports and resolved types are unchanged; only the relative paths inside the shipped `.d.ts`
  files now end in `.ts`.
- Bad, because nothing outside the package can resolve its source without a build.

### `.ts` imports plus a source export condition, shipping `src/`

A condition such as `@midnightntwrk/platform-js/source`, first in each `exports` entry, pointing at `src/*.ts`, with
`src/` and declaration maps in the tarball so "Go to definition" lands in source. Prior art: Zod (`@zod/source`),
[Nx](https://nx.dev/docs/kb/testing-without-building-dependencies), TanStack Query.

- Good, because tools that opt in resolve the package to its source with no build.
- Bad, because every consumer downloads `src/` and the maps, though only those who opt in use them.
- Bad, because a consumer that opts in also needs `allowImportingTsExtensions`, and Node won't strip types under
  `node_modules`, so it serves TypeScript and bundlers only.
- Bad, because nothing in this repo or outside it uses it today.

### `.ts` imports plus a source condition used only inside the repo, stripped at publish

- Good, because the repo gets source resolution and the tarball stays `dist/` only.
- Bad, because publishing needs a step that rewrites `package.json`, for a condition nothing in the repo uses yet.

### Keep wallet's layout: `.js` imports

- Good, because it matches midnight-wallet and needs no change.
- Bad, because `.js` imports name files that don't exist until a build.

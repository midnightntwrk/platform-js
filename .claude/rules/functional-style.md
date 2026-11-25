---
paths:
  - 'packages/platform-js/src/**/*.ts'
---

# Functional style — hard rules

Mandatory for all library code. Rationale and worked examples: `docs/CodingConventions.md`.
File paths below are relative to `packages/platform-js/src/`, except paths starting `packages/` (relative to the repo
root). Tests in `src/**/test/` follow `.claude/rules/testing.md` and these rules too, with two exceptions: the JSDoc
rules (Public API documentation) do not apply to them, and a `forEach` over assertions or an `it.each` table is not a
loop to replace. Quoted import specifiers (`'effect/Either'`) and Effect module names (`effect/Brand`, `effect/Array`)
name Effect's own modules, not files.

## Immutability

- `const` only — never `let`. No `for`/`while` loops — use `map`/`filter`/`reduce`/`flatMap`.
- No mutation: no `push`/`pop`/`splice`, no `obj[key] = value`. Build new values with spread.
- Exceptions (rare, must be isolated and justified): filling a fresh object created from a data type's prototype inside
  its own constructor (`effect/IntegerRange.ts` `make`), measured performance bottlenecks, inherently mutable external
  APIs, test setup/teardown.

## Either vs Effect — never interchangeable

- `Either` = pure synchronous computation: parsing, validation, transformations.
- `Effect` = side effects: I/O, async, configuration, resources, dependency injection.
- Never wrap pure logic in Effect. Return `Either` from pure code (`effect/internal/hex.ts` `parseHex`).
- Crossing from `Either` to `Effect` needs no helper: in Effect 3 an `Either` is an `Effect` subtype. `yield*` it inside
  `Effect.gen`, or pass it where an `Effect` is expected (`Effect.flip(Hex.parseHex(...))`, `effect/test/Hex.test.ts`).
- Brands cross into config and decoding through `Schema.fromBrand` (`effect/Configuration.ts`).

## Types

- Parse, don't validate: `parse(input): Either<Valid, ParseError>`, never `validate(input): boolean`. Use branded types
  (`effect/Brand`: `Brand.nominal`, `Brand.refined`, `Brand.all`) to keep similar primitives apart.
- Brands are erased at runtime. `.is` and `.either` run only the brand's refinement; a nominal brand's `.is` is always
  `true`. Never branch on `.is` to tell brands apart: `ContractAddress` and `DomainSeparator` share one refinement, so
  `ContractAddress.is` accepts a `DomainSeparator`. They stay distinct at compile time only.
- Make illegal states unrepresentable: `_tag` discriminated unions over optional-field bags. `effect/IntegerRange.ts`
  `IntegerRangeValue` encodes which bound is inclusive: `min` always, `max` only in `Inclusive`. A template-literal
  input type such as `IntegerRangeInput`'s `` `${number}..${number}` `` restricts nothing: any number text passes, so
  parse it at runtime.
- Total functions: `Option` for absence, `Either`/`Effect` for failure. Never throw for expected errors in new code.
  A brand constructor called directly (`Hex.PlainHex(s)`) throws by Effect's design; callers that can fail use its
  `.either`. Use `.option` only when absence is all the caller needs: it drops the reason.
- Known throwing exports, not a pattern to copy: `CoinPublicKey.make`, `CoinPublicKey.asHex`,
  `CoinPublicKey.asBytes` (#23); `IntegerRange.from`, `IntegerRange.inclusive`, `IntegerRange.exclusive` (#25); the
  constructors returned by `Hex.ConstrainedPlainHex` and `Hex.ConstrainedPrefixedHex`, which throw an `Error` on a
  `constraints.byteLength` that `IntegerRange.from` cannot read, even from `.either`, `.option` and `.is` (#25);
  `SigningKey.make` (#26). `CoinPublicKey.asBech32m` never throws, but labels any string Bech32m (#23).
- No `as` casts without exhausting alternatives first; a necessary cast requires a
  `// Type cast required because: <reason>` comment.

## Effect usage

- In new code, import Effect modules as namespaces (`import * as Either from 'effect/Either'`); existing files use the
  `effect` barrel (`import { Brand } from 'effect'`). Modules that shadow globals get an alias by convention (not
  enforced by any tool): `Array→EArray, Record→ERecord, Number→ENumber, String→EString, Boolean→EBoolean,
  Function→EFunction`. Named imports such as `{ dual } from 'effect/Function'` are fine.
- `Effect.gen` for multi-step sequential logic with intermediate values; `pipe` for linear chains. Never `Effect.gen`
  for a single operation. Don't mix both styles in one function.
- Errors: a public `parse*` function returns `Either<_, ParseError>` (`effect/ParseError.ts`). A brand's `.either`
  returns Effect's `BrandErrors`; leave that as it is. A new public parser exposes `ParseError`, not `BrandErrors`.
  A new failure mode that is not a parse failure gets its own error type in the `effect/ParseError.ts` style: a
  `TypeId` symbol, a class extending `TypeIdError` from `@effect/platform/Error`, an `is<Name>` guard, and a `make`
  constructor. Never a thrown exception or a boolean result for an expected failure.
- Data types with value semantics implement `Equal`/`Hash`/`Pipeable`/`Inspectable` on one shared prototype, typed
  `Omit<T, dataFields>` (`IntegerRangeProto: Omit<IntegerRange, 'value'>`), and export `dual` APIs. Copy
  `effect/IntegerRange.ts`. `effect/NetworkId.ts` is a known gap: no `Hash`, no `pipe`, a prototype per instance
  (#24); don't copy it.
- Services are `Context.Tag` classes provided by `Layer`s (`effect/Configuration.ts`).
- Check Effect's stdlib before writing utilities (`effect/Array`, `effect/Function`, `effect/Match`, `effect/HashMap`,
  `effect/Schema`, …) — many problems are already solved.

## Public API documentation

- Every export requires JSDoc: description, `@param` for each parameter, `@returns`, and a `@category` tag
  (`models`, `constructors`, `guards`, `errors`, `layers`, `symbols`, …) matching the existing modules. A brand
  constructor counts as a function: `@param` and `@returns` too.
- Every export that can throw gets `@throws`, in plain text, naming what is thrown (in backticks) and what makes it
  throw: ``@throws `Brand.BrandErrors` if `source` is not plain hex``. Read what is thrown from the code.
  `Brand.BrandErrors` is an array of refinement errors, not an `Error`. A brand constructor's `@remarks` points to its
  non-throwing `.either` and `.option`.
- A `declare namespace` merged with a documented type of the same name gets no JSDoc of its own (hover would show it
  twice); its members keep theirs.
- Mark everything in `effect/internal/` with `/** @internal */`.
- `yarn lint` checks only part of this (`eslint-plugin-jsdoc`). A clean lint is not a clean doc: check by hand what
  `docs/decisions/0005-lint-public-api-jsdoc.md` lists as unchecked.

## Public API and changesets

- The public API is what `packages/platform-js/package.json` `exports` exposes: `.`, `./effect`, `./effect/*`, each
  mapped to its compiled file in `dist/` (`types`, `import` and `default`). `./effect/internal/*` is blocked (`null`)
  — internal code is free to change. `typesVersions` mirrors `effect` and `effect/*` for `node10` consumers and maps
  `effect/internal/*` to nothing; keep it in step with `exports`.
- Relative imports end in `.ts` (`import * as Hex from './Hex.ts'`); lint rejects `.js`. Source stays erasable
  (`erasableSyntaxOnly`): no `enum`, no runtime `namespace`, no parameter properties, no `import =`/`export =`.
- A new module under `effect/` must also be re-exported from `effect/index.ts`.
- A removed or changed public signature is a major bump. Every PR that changes a package carries a changeset:
  `DEV_GUIDE.md` → Versioning & releases.

## Where the patterns live

Canonical files: pure core / parse-don't-validate `effect/internal/hex.ts`, `effect/Hex.ts`; brands
`effect/ContractAddress.ts`, `effect/DomainSeparator.ts` (distinct at compile time only); refined brand
`effect/NetworkIdMoniker.ts`; tagged union, `dual`, `Equal`/`Hash` data type `effect/IntegerRange.ts`; services,
`Context.Tag`, layers `effect/Configuration.ts`; errors `effect/ParseError.ts`.

---
paths:
  - 'platform-js/platform-js/src/**/*.ts'
---

# Functional style — hard rules

Mandatory for all library code. Rationale and worked examples: `docs/CodingConventions.md`.
File paths below are relative to `platform-js/platform-js/src/`, except `test/…` (relative to
`platform-js/platform-js/`) and `platform-js/…` (relative to the repo root). Quoted import specifiers
(`'effect/Either'`) and Effect module names (`effect/Brand`, `effect/Array`) name Effect's own modules, not files.

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
  `Effect.gen`, or pass it where an `Effect` is expected (`Effect.flip(Hex.parseHex(...))`, `test/effect/Hex.test.ts`).
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
  `CoinPublicKey.asBech32m`, `CoinPublicKey.asBytes` (#23); `IntegerRange.from`, `IntegerRange.inclusive`,
  `IntegerRange.exclusive` (#25); `SigningKey.make` (#26).
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
  (`models`, `constructors`, `guards`, `errors`, `layers`, …) matching the existing modules.
- In new code, add `@throws` to the rare export that can throw (a brand constructor called directly).
- Mark everything in `effect/internal/` with `/** @internal */`.

## Public API and changesets

- The public API is what `platform-js/platform-js/package.json` `exports` exposes: `.`, `./effect`, `./effect/*`.
  `./effect/internal/*` is blocked (`null`) — internal code is free to change.
- A new module under `effect/` must also be re-exported from `effect/index.ts`.
- A removed or changed public signature is a major bump. For changesets, follow `DEV_GUIDE.md` → Versioning & releases
  until #16 lands.

## Where the patterns live

Canonical files: pure core / parse-don't-validate `effect/internal/hex.ts`, `effect/Hex.ts`; brands
`effect/ContractAddress.ts`, `effect/DomainSeparator.ts` (distinct at compile time only); refined brand
`effect/NetworkIdMoniker.ts`; tagged union, `dual`, `Equal`/`Hash` data type `effect/IntegerRange.ts`; services,
`Context.Tag`, layers `effect/Configuration.ts`; errors `effect/ParseError.ts`.

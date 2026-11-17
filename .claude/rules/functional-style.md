---
paths:
  - 'platform-js/platform-js/src/**/*.ts'
---

# Functional style — hard rules

Mandatory for all library code. Rationale and worked examples: `docs/CodingConventions.md`.
Paths below are relative to `platform-js/platform-js/src/`.

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
- Make illegal states unrepresentable: `_tag` discriminated unions over optional-field bags (`effect/IntegerRange.ts`
  `IntegerRangeValue`).
- Total functions: `Option` for absence, `Either`/`Effect` for failure. Never throw for expected errors in new code.
  A brand constructor called directly (`Hex.PlainHex(s)`) throws by Effect's design; callers that can fail use its
  `.either`/`.option`/`.is`. Existing throwing helpers (`effect/IntegerRange.ts` `from`, `effect/CoinPublicKey.ts`
  `asHex`/`asBech32m`) are not a pattern to copy.
- No `as` casts without exhausting alternatives first; a necessary cast requires a
  `// Type cast required because: <reason>` comment.

## Effect usage

- Import Effect modules as namespaces (`import * as Either from 'effect/Either'`). Modules that shadow globals get an
  alias by convention (not enforced by any tool): `Array→EArray, Record→ERecord, Number→ENumber, String→EString,
  Boolean→EBoolean, Function→EFunction`. Named imports such as `{ dual } from 'effect/Function'` are fine.
- `Effect.gen` for multi-step sequential logic with intermediate values; `pipe` for linear chains. Never `Effect.gen`
  for a single operation. Don't mix both styles in one function.
- Errors: one error type per failure mode, in the `effect/ParseError.ts` style — a `TypeId` symbol, a class extending
  `TypeIdError` from `@effect/platform/Error`, an `is<Name>` guard, and a `make` constructor. Reuse `ParseError` for
  parse failures. Never a thrown exception or a boolean result for an expected failure.
- Data types with value semantics implement `Equal`/`Hash`/`Pipeable`/`Inspectable` on a prototype and export
  `dual` APIs (`effect/IntegerRange.ts`, `effect/NetworkId.ts`).
- Services are `Context.Tag` classes provided by `Layer`s (`effect/Configuration.ts`).
- Check Effect's stdlib before writing utilities (`effect/Array`, `effect/Function`, `effect/Match`, `effect/HashMap`,
  `effect/Schema`, …) — many problems are already solved.

## Public API documentation

- Every export requires JSDoc: description, `@param` for each parameter, `@returns`, and a `@category` tag
  (`models`, `constructors`, `guards`, `errors`, `layers`, …) matching the existing modules.

## Public API and changesets

- The public API is what `platform-js/platform-js/package.json` `exports` exposes: `.`, `./effect`, `./effect/*`.
  `./effect/internal/*` is blocked (`null`) — internal code is free to change.
- A new module under `effect/` must also be re-exported from `effect/index.ts`.
- Any change to a public export needs a changeset (`yarn changeset` from `platform-js/`); a removed or changed
  signature is a major bump. Release process: #16.

## Where the patterns live

Canonical files: pure core / parse-don't-validate `effect/internal/hex.ts`, `effect/Hex.ts`; brands
`effect/ContractAddress.ts`, `effect/DomainSeparator.ts`; refined brand `effect/NetworkIdMoniker.ts`; distinct brands
for one value `effect/CoinPublicKey.ts`; tagged union, `dual`, `Equal`/`Hash` data type `effect/IntegerRange.ts`,
`effect/NetworkId.ts`; services, `Context.Tag`, layers `effect/Configuration.ts`; errors `effect/ParseError.ts`.

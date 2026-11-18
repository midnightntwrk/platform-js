# Coding Conventions — platform-js

Human-facing reference for the functional programming conventions this codebase follows. This is the single source of
truth for the _why_ and the worked examples; the distilled hard rules that coding agents load automatically live in
[`.claude/rules/functional-style.md`](../.claude/rules/functional-style.md) — keep the two in sync when conventions
change.

All paths below are relative to the package root, `packages/platform-js/`.

Related reading:

- [`.claude/rules/functional-style.md`](../.claude/rules/functional-style.md) — the hard rules, in short form
- [`docs/decisions/`](decisions/) — architectural decision records (MADR)
- [effect.website](https://effect.website/) — Effect framework fundamentals (not duplicated here)

## Functional Programming Principles

This codebase follows functional programming principles rigorously. These patterns are **mandatory** - not preferences.

### Functional Core, Imperative Shell (Impureim Sandwich)

Structure code in three layers:

1. **Impure (input)**: Read data from external sources (environment variables, JSON configuration, user input)
2. **Pure (transform)**: Process data with pure functions - all parsing and domain logic lives here
3. **Impure (output)**: Hand results to the caller through services and layers

The "sandwich" keeps all domain logic pure and testable, with side effects only at the edges.

**Codebase pattern:**

```typescript
// Pure core - src/effect/internal/hex.ts: no I/O, returns Either
export const parseHex: (source: string) => Either.Either<Hex.ParsedHexString, ParseError.ParseError> = ...

// Imperative shell - src/effect/Configuration.ts: reads config (env, then JSON), parses at the boundary
const NetworkIdConfig = Config.option(Schema.Config(
  'network',
  Schema.String.pipe(Schema.fromBrand(NetworkIdMoniker.NetworkIdMoniker))
));
```

The shell never re-implements a check: it reuses the pure brand constructor (`NetworkIdMoniker`) through
`Schema.fromBrand`, so the same rule applies whether a value comes from code or from configuration.

### Parse, Don't Validate

Instead of `validate(input): boolean`, use `parse(input): ValidType | Error`.

The parsed type makes invalid states **unrepresentable** through the type system.

```typescript
// WRONG: validate returns boolean, caller can ignore result or use raw input
const isValid = /^[0-9a-fA-F]*$/.test(input);
if (isValid) {
  /* input is still an untyped string */
}

// RIGHT: parse returns a branded value or the reason it failed - invalid inputs cannot proceed
// src/effect/Hex.ts exports PlainHex; .either is Effect's total form of the brand constructor
const hex: Either.Either<Hex.Hex.PlainHex, Brand.Brand.BrandErrors> = Hex.PlainHex.either(source);
```

`Hex.parseHex` is the lower-level step under it. It returns a `ParsedHexString` on the right: a parse report (prefix
flag, whole-byte characters, leftover characters), not a branded value. On the left it returns a `ParseError` that
says exactly which character or byte was wrong.

**Use branded types** to prevent mixing similar primitives. A refined brand runs its check in the constructor:

```typescript
// src/effect/NetworkIdMoniker.ts
export type NetworkIdMoniker = Brand.Branded<string, 'NetworkIdMoniker'>;

export const NetworkIdMoniker = Brand.refined<NetworkIdMoniker>(
  (source: string) => {
    return source.match(NETWORK_ID_REGEXP)
      ? Option.none()
      : Option.some(Brand.error(`Source string '${source}' is not a valid network identifier`));
  }
);
```

Brands compose. `ContractAddress` is a nominal brand combined with a constrained hex parser:

```typescript
// src/effect/ContractAddress.ts
export type ContractAddress = Brand.Branded<string, 'ContractAddress'>;
export const ContractAddress = Brand.all(
  Brand.nominal<ContractAddress>(),
  Hex.ConstrainedPlainHex({ byteLength: '32..=32' })
);
```

A brand constructor such as `ContractAddress(s)` **throws** a `BrandErrors` when `s` is invalid. That is the Effect
`Brand` API. Where a caller needs a total parse, use the constructor's `.either(s)`: the `Left` keeps the reason. Use
`.option(s)` only when absence is all the caller needs, because it drops the reason. `.is(s)` is a type guard that
answers only whether the refinement passes.

**Brands are erased at runtime.** A branded value is a plain `string` at runtime, so `.is` and `.either` run only the
brand's refinement, and a nominal brand's `.is` (`Brand.nominal`) is always `true`. Never branch on `.is` to tell
brands apart: `ContractAddress` and `DomainSeparator` share one refinement, so `ContractAddress.is` accepts a
`DomainSeparator`. Brands keep values apart at compile time only.

### Make Illegal States Unrepresentable

Design types so invalid states **cannot be constructed**:

**Use distinct branded types** to tell apart values that share a runtime representation:

```typescript
// WRONG: both are just strings, easily confused
function deploy(address: string, separator: string): void;

// RIGHT: types prevent confusion at compile time
// src/effect/ContractAddress.ts, src/effect/DomainSeparator.ts - both 32-byte plain hex, but not interchangeable
type ContractAddress = Brand.Branded<string, 'ContractAddress'>;
type DomainSeparator = Brand.Branded<string, 'DomainSeparator'>;
```

The compiler rejects a `DomainSeparator` where a `ContractAddress` is expected, but at runtime both are the same
32-byte plain hex string and nothing tells them apart (see "Brands are erased at runtime" above). Where code must
tell two encodings apart at runtime, parse the content; don't ask a brand. `CoinPublicKey` gets this wrong today (see
the known exceptions under Total Functions).

**Use tagged unions** to model mutually exclusive states:

```typescript
// WRONG: a flag and two optional fields, unclear valid combinations
type Range = { min?: number; max?: number; inclusive?: boolean };

// RIGHT: the tag says how to read the bounds - src/effect/IntegerRange.ts
export type IntegerRangeValue =
  | { readonly _tag: 'Inclusive'; readonly min: number; readonly max: number }
  | { readonly _tag: 'Exclusive'; readonly min: number; readonly max: number };
```

The union encodes which bound is inclusive: `min` always, `max` only in `Inclusive`. It does not encode `min <= max`
or that both bounds are integers; nothing checks those today (#25).

A template-literal input type restricts nothing at runtime, and little at compile time: `IntegerRangeInput`'s
`` `${number}..${number}` `` accepts any number text, so a string range must still be parsed at runtime.

**Use literal unions** for closed sets of values, derived from one `as const` array so the list and the type cannot
drift apart:

```typescript
// src/effect/SigningKey.ts
export type SignatureKind = (typeof SignatureKinds)[number];
export const SignatureKinds = ['schnorr', 'ecdsa'] as const;
```

### Total Functions

Functions should be **total** - defined for all inputs of their declared type:

```typescript
// PARTIAL (avoid): undefined behaviour for an empty array
const unsafeHead = <T>(arr: readonly T[]): T => arr[0]; // undefined if empty!

// TOTAL (prefer): Returns Option - handles all inputs (Effect ships this as EArray.head)
const head = <T>(arr: readonly T[]): Option.Option<T> => (arr.length > 0 ? Option.some(arr[0]) : Option.none());

// TOTAL (alternative): Restrict input type (Effect ships this as EArray.headNonEmpty)
const headNonEmpty = <T>(arr: NonEmptyReadonlyArray<T>): T => arr[0];
```

In platform-js, `parseHex` is total: every string maps to a `Right` or a `Left`. `Configuration.Keys.getSigningKey()`
returns `Option.Option<SigningKey.SigningKey>` rather than `undefined` when no key is configured.

**Rules:**

- Never throw for expected error conditions
- Use `Option` for values that may not exist, never `null`/`undefined`
- Use `Either`/`Effect` for operations that may fail
- Restrict input types when possible (`NonEmptyReadonlyArray`, branded types)

**Known throwing exports, do not copy.** New code returns `Either` or fails an `Effect` instead.

- `CoinPublicKey.make`, `CoinPublicKey.asHex`, `CoinPublicKey.asBech32m`, `CoinPublicKey.asBytes` (#23): `make`
  throws on prefixed hex and labels any non-hex string Bech32m; the `as…` conversions throw a `ParseError` for
  conversions not yet supported, and rely on a nominal `.is` that is always `true`
- `IntegerRange.from`, `IntegerRange.inclusive`, `IntegerRange.exclusive` (#25): throw through the private `make` on
  input it cannot read (`from` on a malformed range string)
- `SigningKey.make` (#26): throws `BrandErrors` on an invalid key string, with no total alternative

### Immutability and Pure Functions (MANDATORY)

**THIS IS A HARD REQUIREMENT: Write purely functional, side-effect-free code.**

All code in platform-js MUST be purely functional unless there is absolutely no alternative. This is not a preference -
it is the default and expected style.

**Never this, always that:**

- `let` → `const` for every declaration
- `for`/`while` loops and `result` variables mutated in them → `map` (transform), `filter` (select), `reduce`
  (accumulate), `flatMap` (map and flatten), `some`/`every` (boolean checks), `Array.from()` (convert iterables)
- `array.push()`, `array.pop()`, `array.splice()` → a new array from the methods above, or spread `[...arr, item]`
- `object[key] = value` → spread `{ ...obj, key: value }` into a new object

Also `readonly` on interface fields and tuple types (as `IntegerRangeValue` and `IntegerRangeInput` do).

**Examples of WRONG code (do not write this):**

```typescript
// WRONG: mutation with let and push
let total = 0;
const names: string[] = [];
for (const item of items) {
  total += item.size;
  if (item.active) {
    names.push(item.name);
  }
}

// WRONG: object mutation
const options: HexConstraints = {};
options.requirePrefix = true;
```

**Examples of CORRECT code:**

```typescript
// CORRECT: pure functional
const total = items.reduce((sum, item) => sum + item.size, 0);
const names = items.filter((item) => item.active).map((item) => item.name);

// CORRECT: merge defaults with spread - src/effect/internal/hex.ts
const mergedOptions = { ...defaultHexConstructionConstraints, ...options };

// CORRECT: derive a new value instead of changing the old one - src/effect/IntegerRange.ts
return isInclusive(range)
  ? range // Already inclusive, return it.
  : make([range.value.min, range.value.max - 1], 'Inclusive');
```

**The only exceptions** where mutation may be acceptable:

- Performance-critical inner loops with measured bottlenecks (rare)
- Interacting with inherently mutable external APIs
- Building a fresh proto-object before it is returned (the private `make` in `src/effect/IntegerRange.ts` sets
  `self.value` on an object it just created with `Object.create`)
- Test setup/teardown code

Even in these cases, isolate mutations and document why they are necessary.

### Type Casts

**Avoid type casts (`as Type`) whenever possible.** Type casts bypass TypeScript's type checking and can hide bugs.
(`as const` is not a cast: it narrows, it does not override.)

Before using a type cast, exhaust all other options:

1. Fix the underlying type definitions
2. Use type guards or narrowing (`IntegerRange.isIntegerRange` in `src/effect/IntegerRange.ts`; a brand's `.is`
   checks only its refinement)
3. Use generics properly
4. Refactor code to improve type inference

If a type cast is absolutely necessary after exhausting other options, it **must** include a justification comment
explaining why:

```typescript
// Type cast required because: <specific reason why no alternative exists>
const value = someValue as SomeType;
```

The same applies to `eslint-disable` comments: `src/effect/internal/hex.ts` disables `no-explicit-any` on the generic
brand bound of `make`, on the line it applies to, not file-wide.

### Separation of Effect and Either

**Critical distinction - these are NOT interchangeable:**

- **Either** = pure synchronous computation, no side effects, for parsing and value transformations
- **Effect** = description of side-effecting computation (configuration, async, resources, errors, DI)

**When to use which:**

| Use Case             | Type     | Example                                                                     |
| -------------------- | -------- | --------------------------------------------------------------------------- |
| Pure parsing         | `Either` | `Hex.parseHex(source): Either<ParsedHexString, ParseError>`                 |
| Total brand check    | `Either` | `ContractAddress.either(source): Either<ContractAddress, BrandErrors>`      |
| Reading config       | `Effect` | `Layer.effect(Keys, Effect.gen(...))` in `Configuration.ts`                 |
| Async operations     | `Effect` | `Effect.tryPromise({ try, catch })` around any Promise-returning API        |
| Dependency injection | `Effect` | `Context.Tag` services `Configuration.Keys`, `Configuration.Network`        |

No platform-js module calls a Promise API today. When one does, wrap it in `Effect.tryPromise` with both options, and
never use `Promise` or `async`/`await` directly in library code. `catch` maps the rejection to a `TypeIdError` (see
Error Modeling), so callers can `Effect.catchTag` it. The single-argument form `Effect.tryPromise(() => ...)` fails
with `UnknownException`, which loses the error type.

**How Either crosses into Effect.** In Effect 3, `Either` is a subtype of `Effect`: a `Right` succeeds and a `Left`
fails. So there is no conversion helper; yield or pass the `Either` directly where an `Effect` is expected:

```typescript
// test/effect/Hex.test.ts - yield an Either inside Effect.gen; a Left fails the effect
Effect.gen(function* () {
  const result = yield* Hex.parseHex(hex);
  expect(result.hasPrefix).toBe(false);
});

// test/effect/Hex.test.ts - pass an Either to an Effect combinator
const error = yield* Effect.flip(Hex.parseHex('HOSKYA'));
expect(ParseError.isParseError(error)).toBeTruthy();
```

**Never mix them carelessly:**

```typescript
// WRONG: wrapping pure logic in Effect for no reason
Effect.gen(function* () {
  const result = yield* Effect.succeed(Either.right(compute(x))); // Unnecessary wrapping
});

// WRONG in src/: running an Effect to get at a pure value (tests may runSync a pure effect)
const parsed = Effect.runSync(Hex.parseHex(source));

// RIGHT: stay in Either for pure code; map the Right, and the ParseError stays on the Left
const byteCount: (source: string) => Either.Either<number, ParseError.ParseError> = (source) =>
  Either.map(Hex.parseHex(source), (parsed) => parsed.byteChars.length / 2);
```

`byteCount` is total: every string gives a `Right` count or a `Left` that says what was wrong. Branching on the
result and replacing a failure with a fallback value (`onLeft: () => something`) drops that reason; see the known
exceptions under Total Functions.

### Generator vs Pipe Style

Both `Effect.gen` and `pipe` are valid but serve different purposes:

**Use `Effect.gen`** (do-notation style) when:

- Multiple sequential operations need intermediate values
- Complex control flow with conditions
- Readability benefits from imperative-looking code

```typescript
// src/effect/Configuration.ts
Layer.effect(Keys, Effect.gen(function* () {
  const [coinPublic, signing, signingKind] = yield* KeysConfig;
  const signingKey = Option.map(signing, (value) => SigningKey.make(value, signingKind));

  return Keys.of({
    coinPublicKey: coinPublic,
    getSigningKey: () => signingKey
  });
}));
```

**Use `pipe`** (or the `.pipe` method) when:

- Simple linear transformations
- Single operation chains
- Parallel operations (`Effect.all`)

```typescript
// src/effect/Configuration.ts
export const configProvider: (json: unknown) => ConfigProvider.ConfigProvider
  = (json) => ConfigProvider.fromEnv({ pathDelim: '_'}).pipe(
    ConfigProvider.constantCase,
    ConfigProvider.orElse(() => ConfigProvider.fromJson(json))
  );
```

**Avoid mixing** both styles in the same function - pick one for consistency, but prefer pipes if custom operators need
to be used. Never use the `.gen` variant for a single operation with nothing after it: a `Context.Tag` such as
`Configuration.Keys` is already an `Effect` and can be used as one directly.

The above also is valid for usage with other Effect types, like `Either` (`Either.gen`, `Either.map`).

### Data Types (Proto-Object Pattern)

Rich data types follow the Effect library's own pattern: an interface carrying a `TypeId` symbol, a guard, a shared
prototype that implements `Equal`, `Hash`, `Inspectable` and `Pipeable`, and constructors that `Object.create` from it.
Use this when a value needs structural equality, a readable `toString`/`toJSON`, or `.pipe(...)` support.

```typescript
// src/effect/IntegerRange.ts
const TypeId: unique symbol = Symbol.for('platform-js/effect/IntegerRange');
export type TypeId = typeof TypeId;

export interface IntegerRange extends Equal.Equal, Pipeable, Inspectable {
  readonly [TypeId]: TypeId;
  readonly value: IntegerRangeValue;
}

export const isIntegerRange = (u: unknown): u is IntegerRange => hasProperty(u, TypeId);

const IntegerRangeProto: Omit<IntegerRange, 'value'> = {
  [TypeId]: TypeId,
  [Hash.symbol](this: IntegerRange) {
    return Hash.cached(this, Hash.structure(this.value))
  },
  [Equal.symbol](this: IntegerRange, that: unknown) {
    return isIntegerRange(that) && equals(this, that)
  },
  // toString, toJSON, [NodeInspectSymbol], pipe ...
}
```

Equality is defined once, as an `Equivalence`, and reused by `equals` and by `Equal.symbol`:

```typescript
// src/effect/IntegerRange.ts
export const Equivalence: equivalence.Equivalence<IntegerRange> =
  equivalence.struct({
    value: equivalence.struct({
      _tag: equivalence.string,
      min: equivalence.number,
      max: equivalence.number
    })
  });

export const equals: {
  (that: IntegerRange): (self: IntegerRange) => boolean;
  (self: IntegerRange, that: IntegerRange): boolean;
} = dual(2, (self: IntegerRange, that: IntegerRange): boolean => Equivalence(self, that));
```

**Rules:**

- Copy `src/effect/IntegerRange.ts`: one prototype object shared by every instance, typed `Omit<T, dataFields>`, that
  implements all of `Equal`, `Hash`, `Inspectable` and `Pipeable`. Equal values must hash equal, or `HashSet` and
  `HashMap` misbehave
- A data type is an immutable proto-object plus pure functions, never a class with mutable internal state
- `TypeId` uses `Symbol.for('platform-js/effect/<Module>')`, so it survives duplicate module copies
- State that is not part of the public shape goes behind a symbol key (`MonikerSymbol` in `NetworkId.ts`), not a
  named field. It is unnamed, not hidden: a `Symbol.for` key is global, so any code that knows the string can read it.
  That is the trade-off for surviving duplicate module copies. A module-local `Symbol()` is harder to reach (though
  `Object.getOwnPropertySymbols` still finds it), but two copies of the module no longer read each other's values
- Well-known instances are exported constants built from the same prototype, so they equal a value constructed from
  the same input
- The interface fields are `readonly`

**Known gap, do not copy:** `src/effect/NetworkId.ts` has no `Hash` and no `pipe`, and builds a new prototype per
instance (#24).

**Dual Functions** - Support both data-first and data-last (pipeable) calling:

```typescript
// src/effect/IntegerRange.ts
export const contains: {
  (value: number): (self: IntegerRange) => boolean;
  (self: IntegerRange, value: number): boolean;
} = dual(2, (self: IntegerRange, value: number): boolean => { ... });

// Both work:
IntegerRange.contains(range, 5); // Direct call
range.pipe(IntegerRange.contains(5)); // Piped
```

### Error Modeling

Errors are classes built with `TypeIdError` from `@effect/platform/Error`, not `Data.TaggedError`. Each error module
exports three things: the class, an `is…` guard keyed on its `TypeId`, and a `make` constructor.

```typescript
// src/effect/ParseError.ts
const TypeId: unique symbol = Symbol.for('platform-js/effect/ParseError');
type TypeId = typeof TypeId;

export class ParseError extends Error.TypeIdError(TypeId, 'ParseError')<{
  readonly message: string;
  readonly source: string;
  readonly meta?: Inspectable;
  readonly cause?: unknown;
}> { }

export const isParseError = (u: unknown): u is ParseError => hasProperty(u, TypeId);

export const make: {
  (message: string, source: string): ParseError;
  (message: string, source: string, meta: Inspectable): ParseError;
  (message: string, source: string, meta: Inspectable, cause: unknown): ParseError;
} = (message: string, source: string, meta?: Inspectable, cause?: unknown): ParseError =>
  new ParseError({ message, source, meta, cause });
```

`TypeIdError` still sets `_tag` (`'ParseError'` above), so `Effect.catchTag` and `Match.tag` work.

**Which error type to return:**

- A public `parse*` function returns `Either<_, ParseError>`, as `Hex.parseHex` does.
- A brand's `.either` returns Effect's `BrandErrors` (the `Brand` API); leave that as it is.
- A new public parser exposes `ParseError`, not `BrandErrors`.
- A new failure mode that is not a parse failure gets its own error type, built like `ParseError` above.

Carry the data needed to act on the error (`source`, `meta`, `cause`) rather than only a message:

```typescript
// src/effect/internal/hex.ts - the error says which character, and carries the partial parse
return Either.left(
  ParseError.make(
    `Invalid hex-digit '${source[invalidCharPos]}' found in source string at index ${invalidCharPos}`,
    source,
    parsedHex
  )
);
```

**Error channel composition** - errors accumulate through the type system:

```typescript
// src/effect/Configuration.ts - a failed config read shows up in the layer's error type
const makeKeys: () => Layer.Layer<Keys, ConfigError> = ...

// An Either's Left joins the Effect's error channel when yielded
Effect.gen(function* () {
  const parsed = yield* Hex.parseHex(source); // adds ParseError to E
  // ...
});
```

### Services and Layers

Services are `Context.Tag` classes keyed by `'@midnight-ntwrk/platform-js/<Module>#<Service>'`. A service's shape
is either an interface in an `export declare namespace` beside it (the `Keys` service's shape is the `Keys`
interface in `export declare namespace Configuration`), or an existing type (the `Network` service's shape is
`NetworkId.NetworkId`). Layers build them with `Layer.effect` and are combined with
`Layer.mergeAll`.

```typescript
// src/effect/Configuration.ts
export class Network extends Context.Tag('@midnight-ntwrk/platform-js/Configuration#Network')<
  Network,
  NetworkId.NetworkId
>() {}

export const layer = Layer.mergeAll(makeKeys(), makeNetwork());
```

Provide the layer at the edge, once:

```typescript
// A Context.Tag is already an Effect: pipe it, no Effect.gen needed
Configuration.Keys.pipe(
  Effect.provide(Configuration.layer),
  Effect.withConfigProvider(Configuration.configProvider(json))
);
```

### Resource Management

No platform-js module holds resources today. When one does, use Effect's resource management for anything that needs
cleanup:

**Scoped resources** with automatic cleanup:

```typescript
const withConnection = Effect.scoped(
  Effect.acquireRelease(
    openConnection(), // acquire
    (conn) => closeConnection(conn), // release (always runs)
  ),
);
```

**In services** - use `Layer.scoped` so the finalizer runs when the layer is released:

```typescript
Layer.scoped(
  Client,
  Effect.acquireRelease(openClient(), (client) => Effect.sync(() => client.close())),
);
```

### Concurrency Patterns

No platform-js module runs work concurrently today. The rules for when one does:

**Sequential** (default with flatMap/gen):

```typescript
Effect.gen(function* () {
  const a = yield* fetchA(); // waits
  const b = yield* fetchB(); // waits for a to complete
  return [a, b];
});
```

**Parallel** - use when operations are independent:

```typescript
// Both run concurrently
Effect.all([fetchA(), fetchB()], { concurrency: 'unbounded' });

// Object form for named results — also concurrent
Effect.all({ a: fetchA(), b: fetchB() }, { concurrency: 'unbounded' }); // → { a, b }
```

> Note: `Effect.all` without a `concurrency` option is **sequential**. So is `Effect.Do` + `Effect.bind`: each `bind`
> waits for the previous one, exactly like the `Effect.gen` example above. `Config.all` (used for `KeysConfig` in
> `Configuration.ts`) only combines configuration descriptions; it runs no effects of its own.

**Rule**: Use parallel execution when operations don't depend on each other's results.

### Scala/F# Idiom Translation

| Scala/F# Idiom       | TypeScript Equivalent                          | Example Location                                     |
| -------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| for-comprehension    | `Effect.gen(function* () { ... })`             | `src/effect/Configuration.ts`                        |
| case class           | Proto-object with `Equal`/`Hash`, `TypeId`     | `src/effect/IntegerRange.ts`                         |
| sealed trait / DU    | `_tag` union type                              | `IntegerRangeValue` in `src/effect/IntegerRange.ts`  |
| exception type       | `TypeIdError` class + guard + `make`           | `src/effect/ParseError.ts`                           |
| opaque / newtype     | `Brand.nominal`, `Brand.refined`, `Brand.all`  | `src/effect/ContractAddress.ts`                      |
| implicit / given     | `Context.Tag` + `Layer`                        | `src/effect/Configuration.ts`                        |
| `\|>` pipe           | `pipe()` / `.pipe()` from effect               | Throughout                                           |
| Railway-oriented     | `Either.map`, `Either.flatMap` chains          | Not used in `src/` yet                               |
| Pattern matching     | `Either.match({ onLeft, onRight })`, `Option.match` | `src/effect/internal/hex.ts`, `src/effect/Configuration.ts` |
| Property-based test  | `effect/FastCheck` arbitraries                 | `test/effect/Arbitrary.ts`, `test/effect/Hex.test.ts` |

### Effect Usage

platform-js is an Effect library: its public API is Effect modules (`@midnight-ntwrk/platform-js/effect/*`), and
callers are expected to use Effect.

- **Public modules** (`src/effect/*.ts`): types, constructors, guards and services, each with JSDoc. The package
  `exports` map publishes them through the `./effect/*` wildcard, so a new module is importable by path
  (`@midnight-ntwrk/platform-js/effect/Hex`) without touching `package.json`. Also re-export each new module from
  `src/effect/index.ts` as a namespace (`export * as Hex from './Hex.js';`), keeping the list sorted
- **Internal modules** (`src/effect/internal/*.ts`): implementation, marked `/** @internal */`, removed from the
  emitted types by `stripInternal`, and blocked from import by the package `exports` map, so callers and tests import
  the public module instead
- **Public re-export**: a public module re-exports the internal function with its full type
  (`export const parseHex: (...) => ... = internal.parseHex;` in `Hex.ts`)

**Import style** — import Effect modules as namespaces from their module path:

```typescript
import * as Effect from 'effect/Effect';
import * as Either from 'effect/Either';
import { dual } from 'effect/Function';
```

Both this and the barrel form (`import { Brand } from 'effect'`) appear in the code; prefer the module path in new code.
When a module import would clash with a local export, rename the import with a trailing underscore
(`import * as Hex_ from './Hex.js'` in `CoinPublicKey.ts`, which exports its own `Hex`).

**Import aliases** — Effect modules that shadow JS globals should be imported under an alias. This is a convention
only: nothing enforces it (the Effect language service is not configured yet, see #46), so reviewers check it.

| Module     | Alias       |
| ---------- | ----------- |
| `Array`    | `EArray`    |
| `Record`   | `ERecord`   |
| `Number`   | `ENumber`   |
| `String`   | `EString`   |
| `Boolean`  | `EBoolean`  |
| `Function` | `EFunction` |

**Effect is a rich library** - many problems are already solved. Before writing custom utilities, check if Effect
provides a solution:

| Module                                  | Provides                                              |
| --------------------------------------- | ----------------------------------------------------- |
| `effect/Array`                          | `NonEmptyReadonlyArray`, `reduce`, `match`            |
| `effect/Function`                       | `dual`, `pipe`, `identity`, `constVoid`               |
| `effect/Brand`                          | `nominal`, `refined`, `all`, `error` — branded types  |
| `effect/Equal`, `effect/Hash`           | Structural equality and hashing for data types        |
| `effect/Equivalence`                    | `struct`, `mapInput`, `string`, `number`              |
| `effect/Predicate`                      | `hasProperty`, `isString`, `isNumber`                 |
| `effect/Inspectable`, `effect/Pipeable` | `NodeInspectSymbol`, `pipeArguments`                  |
| `effect/Match`                          | Pattern matching combinators                          |
| `effect/HashMap`, `effect/HashSet`      | Immutable collections                                 |
| `effect/Option`, `effect/Either`        | Sum types                                             |
| `effect/Schema`                         | Validation and parsing (`fromBrand`, `Config`)        |
| `effect/Config`, `effect/ConfigProvider`| Typed configuration from env and JSON                 |
| `effect/FastCheck`                      | Property-based test arbitraries                       |

### Canonical Pattern Files

When implementing new features, refer to these exemplary files:

| Pattern                                    | File                                                      |
| ------------------------------------------ | --------------------------------------------------------- |
| Pure core, parse don't validate            | `src/effect/internal/hex.ts`, `src/effect/Hex.ts`         |
| Composed brands, distinct at compile time  | `src/effect/ContractAddress.ts`, `src/effect/DomainSeparator.ts` |
| Refined brand                              | `src/effect/NetworkIdMoniker.ts`                          |
| Proto-object data type, `_tag` union, dual | `src/effect/IntegerRange.ts`                              |
| Error type (`TypeIdError` + guard + make)  | `src/effect/ParseError.ts`                                |
| Services, `Context.Tag`, layers, config    | `src/effect/Configuration.ts`                             |
| Tests (`@effect/vitest`, FastCheck)        | `test/effect/Hex.test.ts`, `test/effect/Arbitrary.ts`     |

## Documentation Standards

Every exported symbol gets a JSDoc comment. The repo uses TSDoc tags plus Effect's `@category` tag. Required for public
APIs:

- A one-line summary of purpose, then `@remarks` for detail that does not fit in one line
- `@param` for each parameter and `@returns` for the result, naming `Right`/`Left` cases for an `Either`
- `@category` on every export, from the set in use: `models`, `constructors`, `guards`, `predicates`, `equivalence`,
  `utilities`, `errors`, `services`, `layers`, `keys`
- In new code, `@throws` on the rare export that can throw (a brand constructor called directly). No file in `src/`
  uses it yet, so existing exports, the known throwing exports under Total Functions included, lack it
- `/** @internal */` on anything in `src/effect/internal/`

Use `{@link ...}` to cross-reference other symbols, and `@see` for related ones.

```typescript
// src/effect/Hex.ts
/**
 * Parses a hex-encoded string.
 *
 * @param source The source string to parse.
 * @returns An `Either` with a `Right` value of {@link ParsedHexString} describing the parsed elements of `source`,
 * or a `Left` value of {@link ParseError.ParseError | ParseError} if parsing fails.
 *
 * @category utilities
 */
export const parseHex: (source: string) => Either.Either<ParsedHexString, ParseError.ParseError> = internal.parseHex;
```

```typescript
// src/effect/NetworkId.ts
/**
 * Creates a network identifier.
 *
 * @param input The input to use when constructing the network identifier.
 * @returns A {@link NetworkId} derived from `input`.
 *
 * @category constructors
 */
export const make: (input: NetworkIdInput) => NetworkId =
  (input) => Object.create(NetworkIdProto(isNetworkId(input) ? input[MonikerSymbol] : input));
```

**Recommended for new public APIs:** an `@example` block with a working snippet. No file in `src/` has one yet, so this
is a recommendation, not existing house style.

**Not used:** Effect's own modules also tag each export with `@since <version>`. platform-js does not use `@since`; do
not add it piecemeal.

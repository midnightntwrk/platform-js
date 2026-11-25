# Keep node10 subpath types through typesVersions

- Status: accepted
- Date: 2026-11-25

Technical Story: [#67](https://github.com/midnightntwrk/platform-js/issues/67) (reverses the consumer-impact call in
[#34](https://github.com/midnightntwrk/platform-js/issues/34))

## Context and Problem Statement

TypeScript's old `node10` module resolution (`"moduleResolution": "node"`) ignores the package `exports` map. Up to
3.0.0 the package served `node10` consumers through `typesVersions` and `effect/*/package.json` stub folders. #34
dropped both, so a `node10` consumer can still import `@midnightntwrk/platform-js` but gets TS2307 on
`@midnightntwrk/platform-js/effect` and `@midnightntwrk/platform-js/effect/Hex`. Existing consumers of the old package
use `node10`. Should the package keep serving them?

## Decision Drivers

- Existing consumers on `node10` should be able to upgrade without changing their compiler settings first.
- `nodenext` and `bundler` consumers must see no change.
- Nothing extra to maintain when a module is added.
- TypeScript 6.0 deprecates `node10` and TypeScript 7 removes it, so the support has a limited life.

## Considered Options

- A `typesVersions` map for `effect` and `effect/*`
- No `node10` support: consumers move to `NodeNext`, `Node16` or `Bundler`

## Decision Outcome

Chosen option: "A `typesVersions` map for `effect` and `effect/*`", because it costs a few lines of JSON, needs no
change when a module is added (the wildcard covers it), and changes nothing for consumers that read `exports`.

```json
"typesVersions": {
  "*": {
    "effect": ["./dist/effect/index.d.ts"],
    "effect/internal/*": [],
    "effect/*": ["./dist/effect/*.d.ts"]
  }
}
```

The root import needs no entry: the top-level `types` field covers it. The empty `effect/internal/*` entry makes that
path fail to resolve under `node10` (TS2307), as `exports` does elsewhere. It sits before `effect/*` so it wins.
`typesVersions` is read only when a resolver ignores `exports`, so `NodeNext`, `Node16` and `Bundler` consumers resolve
exactly as before. Under `node10`, the `.ts` relative paths in the emitted `.d.ts` files
([ADR-0003](0003-typescript-source-as-source-of-truth.md)) resolve to the sibling `.d.ts`, the same as under `NodeNext`.

Checked with a scratch consumer of the packed tarball, `skipLibCheck: false`, on TypeScript 5.9 and 6.0: `node10`,
`nodenext` and `bundler` all type-check imports of the root, `effect` and `effect/Hex`.

### Positive Consequences

- `node10` consumers keep subpath types, as they had up to 3.0.0.
- A new module needs no `package.json` change.

### Negative Consequences

- `node10` consumers on TypeScript 6.0 need `"ignoreDeprecations": "6.0"`; the map stops mattering once they move off
  `node10` or to TypeScript 7.
- One more field in `package.json` to keep in step if the `dist/` layout changes.

## Pros and Cons of the Options

### A `typesVersions` map for `effect` and `effect/*`

- Good, because existing `node10` consumers upgrade without changing settings.
- Good, because the wildcard covers every module.

### No `node10` support

- Good, because `exports` is the single map of entry points.
- Bad, because every `node10` consumer must change `moduleResolution` before upgrading.

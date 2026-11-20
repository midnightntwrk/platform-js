# @midnightntwrk/platform-js

## 4.0.0

### Major Changes

- 14cbfdc: **BREAKING CHANGE:** the package is now built with `tsc` straight to `dist/` and published as ESM only. Each entry in
  `exports` (`.`, `./effect`, `./effect/*`) has `types`, `import` and `default` conditions, all pointing at the ESM build
  in `dist/`; `default` no longer points at CommonJS files the package never shipped. The package no longer ships
  `typesVersions` or the `effect/*/package.json` stub folders, so TypeScript projects using the old `node10` module
  resolution lose the types for `effect/*` subpaths. To migrate, set `moduleResolution` to `NodeNext`, `Node16` or
  `Bundler`.
- 947b5c5: **BREAKING CHANGE:** the package is now published as `@midnightntwrk/platform-js` (the npm scope without the dash)
  instead of `@midnight-ntwrk/platform-js`. There is no alias under the old name: versions up to `3.0.0` stay on npm as
  `@midnight-ntwrk/platform-js` and get no further releases. The `Context.Tag` keys of the `Configuration` services
  (`Keys`, `Network`) move to the new scope too, for example `'@midnightntwrk/platform-js/Configuration#Network'`. A layer built with the old package does not provide
  the new package's `Keys` or `Network` services, so move every dependent to the new scope together.

  To migrate, swap the dependency and update every import:

  ```sh
  npm uninstall @midnight-ntwrk/platform-js
  npm install @midnightntwrk/platform-js
  ```

  ```ts
  // before
  import { Hex } from '@midnight-ntwrk/platform-js';
  import * as NetworkId from '@midnight-ntwrk/platform-js/effect/NetworkId';
  // after
  import { Hex } from '@midnightntwrk/platform-js';
  import * as NetworkId from '@midnightntwrk/platform-js/effect/NetworkId';
  ```

Versions up to 3.0.0 were published as `@midnight-ntwrk/platform-js`.

## 3.0.0

### Major Changes

- **BREAKING CHANGE:** `SigningKey.SigningKey` is now an object `{ tag, value }` instead of a branded hex string. The
  shape matches the Ledger 9 signing key. `tag` is the signature scheme (`SignatureKind`) and `value` is the raw key
  (`SigningKey.Value`).

  Migration: replace `SigningKey.SigningKey(hex)` with `SigningKey.make(hex)`, or `SigningKey.make(hex, 'ecdsa')` for
  an ECDSA key. Brand a raw key with `SigningKey.Value(hex)`. Code that read the key as a string reads `key.value`.

- **BREAKING CHANGE:** `Configuration.Keys.getSigningKey()` now returns `Option<SigningKey>` in the new `{ tag, value }`
  shape. The `tag` comes from the new `keys.signingKind` configuration value, and is `'schnorr'` when that is not set.

### Minor Changes

- Add `SigningKey.make` and `SigningKey.Value`, which build a signing key and brand its raw value.
- Add `SigningKey.SignatureKind` (`'schnorr' | 'ecdsa'`), `SigningKey.SignatureKinds` and
  `SigningKey.DefaultSignatureKind` (`'schnorr'`).
- Add the `keys.signingKind` configuration value (`'schnorr'` or `'ecdsa'`).

### Patch Changes

- Update dependencies: `effect` to `^3.21.0` and `@effect/platform` to `^0.96.1`.

## 2.2.4

### Patch Changes

- Update dependencies: `effect` to `^3.20.0` and `@effect/platform` to `^0.95.0`.

## 2.2.2

### Patch Changes

- Update dependencies: `effect` to `^3.19.19` and `@effect/platform` to `^0.94.5`.

## 2.2.0

### Patch Changes

- No API or behaviour change.
- Update dependencies: `effect` to `^3.19.15` and `@effect/platform` to `^0.94.2`, and add `tslib` (`^2.8.1`).

## 2.1.0

### Minor Changes

- First release on npm, with the `effect` modules `CoinPublicKey`, `Configuration`, `ContractAddress`,
  `DomainSeparator`, `Hex`, `IntegerRange`, `NetworkId`, `NetworkIdMoniker`, `ParseError` and `SigningKey`.

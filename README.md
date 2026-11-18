# platform-js

> [!WARNING]
> **This repository is not live yet.** platform-js is moving here from
> [`midnightntwrk/midnight-sdk`](https://github.com/midnightntwrk/midnight-sdk), and nothing has been released from this
> repository. Until the first release, treat its issues as placeholders: their scope and details may change.

[`@midnightntwrk/platform-js`](https://www.npmjs.com/package/@midnightntwrk/platform-js) provides core
abstractions, utilities and types for building services and libraries that work with the Midnight blockchain. Other
Midnight libraries and tools build on it, including [midnight-js](https://github.com/midnightntwrk/midnight-js) and
[compact-js](https://github.com/midnightntwrk/compact-js).

It is written in TypeScript with [Effect](https://effect.website/). Values are branded types (a plain type, such as
`string`, tagged so that only a validated value fits), and parsing fails with a typed `ParseError`.

## Install

```shell
npm install @midnightntwrk/platform-js
```

The package is ESM only. TypeScript consumers need `moduleResolution` set to `NodeNext`, `Node16` or `Bundler`.

Versions up to 3.0.0 were published from [`midnightntwrk/midnight-sdk`](https://github.com/midnightntwrk/midnight-sdk).
With the first release from this repository, the package moves to the `@midnightntwrk` scope, matching the GitHub
organisation.

## Usage

Import the modules from the package root, or one module at a time from `@midnightntwrk/platform-js/effect/<Module>`:

```ts
import { Hex, IntegerRange, NetworkId, NetworkIdMoniker } from '@midnightntwrk/platform-js';
import { Either } from 'effect';

// Parse a hex string: Right with its parts, or Left with a ParseError.
const parsed = Hex.parseHex('0xdeadbeef');
if (Either.isRight(parsed)) {
  parsed.right.hasPrefix; // true
  parsed.right.byteChars; // 'deadbeef'
}

// Brand constructors validate their input and throw if it is invalid.
const plain = Hex.PlainHex('deadbeef');
Hex.PlainHex('0xdeadbeef'); // throws: a prefixed string is not PlainHex

// Network IDs.
const preview = NetworkId.make(NetworkIdMoniker.NetworkIdMoniker('preview'));
NetworkId.equals(preview, NetworkId.MainNet); // false

// Integer ranges.
const byte = IntegerRange.inclusive([0, 255]);
IntegerRange.contains(byte, 256); // false
```

## Modules

| Module             | What it holds                                                                      |
| ------------------ | ---------------------------------------------------------------------------------- |
| `Hex`              | Hex-encoded strings, with or without a `0x` prefix, and a parser for them          |
| `NetworkId`        | Midnight network identifiers, including `MainNet`                                  |
| `NetworkIdMoniker` | The validated name of a Midnight network, such as `preview`                        |
| `ContractAddress`  | Hex-encoded contract addresses, 32 bytes long                                      |
| `CoinPublicKey`    | Public keys that can receive Zswap coins, as hex or Bech32m                        |
| `SigningKey`       | Signing keys, tagged with their signature scheme (`schnorr` or `ecdsa`)            |
| `DomainSeparator`  | Hex-encoded token domain separators, 32 bytes long                                 |
| `IntegerRange`     | Integer ranges, inclusive or exclusive of their maximum                            |
| `Configuration`    | Effect services and a layer that read configured keys and the network              |
| `ParseError`       | The typed error returned when a string fails to parse                              |

## Repository layout

- [`packages/platform-js/`](packages/platform-js/): the package. Modules live in `src/effect/`, one per domain type,
  and tests in `test/`.
- [`docs/`](docs/): coding conventions, the agentic workflow and the Claude Code setup.
- [`docs/decisions/`](docs/decisions/): architectural decision records (ADRs).

The repository is a Yarn 4 and Turborepo workspace
([ADR-0001](docs/decisions/0001-turborepo-workspace-with-packages-folder.md)).

## Development

You need Node.js (the version is pinned in [`.nvmrc`](.nvmrc)) and Yarn 4 (through Corepack). From the repository
root:

```shell
nvm use && corepack enable
yarn          # install dependencies
yarn dist     # build all packages
yarn test     # run the full test suite
yarn lint     # lint each package
```

[`DEV_GUIDE.md`](DEV_GUIDE.md) covers setup, branch naming, single-test commands, testing tiers, CI and releases.

## Contributing and documentation

- [`CONTRIBUTING.md`](CONTRIBUTING.md): how to contribute, with links to the repository guides.
- [`DEV_GUIDE.md`](DEV_GUIDE.md): setup, commands, testing and releases.
- [`docs/CodingConventions.md`](docs/CodingConventions.md): the functional programming conventions the code follows.
- [`docs/decisions/`](docs/decisions/): why the repository is built the way it is.
- [`SECURITY.md`](SECURITY.md): how to report a security issue.
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md): the code of conduct.
- [`packages/platform-js/README.md`](packages/platform-js/README.md): the platform-js package.

## Licence

[Apache 2.0](LICENSE).

### Software Package Data Exchange (SPDX)
Include the following Software Package Data Exchange (SPDX) short-form identifier in a comment at the top headers of each source code file.


 <I>// This file is part of <B>REPLACE WITH REPO-NAME</B>.<BR>
 // Copyright (C) Midnight Foundation<BR>
 // SPDX-License-Identifier: Apache-2.0<BR>
 // Licensed under the Apache License, Version 2.0 (the "License");<BR>
 // You may not use this file except in compliance with the License.<BR>
 // You may obtain a copy of the License at<BR>
 //<BR>
 //	https://www.apache.org/licenses/LICENSE-2.0<BR>
 //<BR>
 // Unless required by applicable law or agreed to in writing, software<BR>
 // distributed under the License is distributed on an "AS IS" BASIS,<BR>
 // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.<BR>
 // See the License for the specific language governing permissions and<BR>
 // limitations under the License.</I>

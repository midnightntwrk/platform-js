---
'@midnightntwrk/platform-js': major
---

**BREAKING CHANGE:** the package is now published as `@midnightntwrk/platform-js` (the npm scope without the dash)
instead of `@midnight-ntwrk/platform-js`. There is no alias under the old name: versions up to `3.0.0` stay on npm as
`@midnight-ntwrk/platform-js` and get no further releases. The `Context.Tag` keys of the `Configuration` services
(`Keys`, `Network`) move to the new scope too, for example `'@midnightntwrk/platform-js/Configuration#Network'`.

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

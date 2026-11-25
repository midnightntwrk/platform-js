---
'@midnightntwrk/platform-js': major
---

**BREAKING CHANGE:** the package is now built with `tsc` straight to `dist/` and published as ESM only. Each entry in
`exports` (`.`, `./effect`, `./effect/*`) has `types`, `import` and `default` conditions, all pointing at the ESM build
in `dist/`; `default` no longer points at CommonJS files the package never shipped. The `effect/*/package.json` stub
folders are gone; `typesVersions` now maps `effect` and `effect/*` into `dist/` in their place, so TypeScript projects
on the old `node10` module resolution still get the types for `effect` and `effect/*` subpaths. `NodeNext`, `Node16`
or `Bundler` is still the recommended setting: TypeScript 6.0 deprecates `node10`. Imports through the package's
exported paths need no change; code that imported files by their location inside the package must use the exported
paths. A CommonJS TypeScript project must use `NodeNext` on TypeScript 5.8 or later, or `Bundler`: under `Node16`, or
`NodeNext` before 5.8, TypeScript reports TS1479 for an ES module imported from CommonJS.

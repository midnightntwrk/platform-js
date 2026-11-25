---
'@midnightntwrk/platform-js': major
---

**BREAKING CHANGE:** the package is now built with `tsc` straight to `dist/` and published as ESM only. Each entry in
`exports` (`.`, `./effect`, `./effect/*`) has `types`, `import` and `default` conditions, all pointing at the ESM build
in `dist/`; `default` no longer points at CommonJS files the package never shipped. The `effect/*/package.json` stub
folders are gone; a `typesVersions` map takes their place, so TypeScript projects on the old `node10` module
resolution still get the types for `effect` and `effect/*` subpaths. `NodeNext`, `Node16` or `Bundler` is still the
recommended setting: TypeScript 6.0 deprecates `node10`.

---
'@midnight-ntwrk/platform-js': major
---

**BREAKING CHANGE:** the package is now built with `tsc` straight to `dist/` and published as ESM only. Each entry in
`exports` (`.`, `./effect`, `./effect/*`) has `types`, `import` and `default` conditions, all pointing at the ESM build
in `dist/`; `default` no longer points at CommonJS files the package never shipped. The package no longer ships
`typesVersions` or the `effect/*/package.json` stub folders, so TypeScript projects using the old `node10` module
resolution lose the types for `effect/*` subpaths. To migrate, set `moduleResolution` to `NodeNext`, `Node16` or
`Bundler`.

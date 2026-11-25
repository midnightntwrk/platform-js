#!/usr/bin/env node
/*
 * Copyright (C) 2025 Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// @ts-check

// Checks platform-js's barrel files against its sources. The package's `exports` map is wildcard-based
// (`./effect/*`, with `./effect/internal/*` set to null), so a module under src/effect/, at any depth, is public once
// it is built, and the barrels are what must keep up. test/ folders are never built (`tsconfig.build.json` excludes
// `src/**/test/**`), so this check skips them, as it skips internal/:
//   1. every module under src/effect/, at any depth, outside internal/ and test/ is re-exported from
//      src/effect/index.ts by its relative path, since the `./effect/*` wildcard already makes each such module public;
//   2. src/index.ts re-exports ./effect/index.ts;
//   3. no barrel re-exports anything from internal/, which is private, or from test/, which holds the unit tests and
//      their helpers and is never built (ADR-0006).
// The barrels are parsed with the TypeScript compiler, so a re-export inside a comment or a string never counts.
//
// Usage: check-barrel-exports.mjs [--src <dir>]   (default: packages/platform-js/src)
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import ts from 'typescript';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const { values } = parseArgs({ options: { src: { type: 'string' } } });
const srcDir = values.src === undefined ? path.join(repoRoot, 'packages/platform-js/src') : path.resolve(values.src);
const effectDir = path.join(srcDir, 'effect');

const ROOT_BARREL = 'index.ts';
const EFFECT_BARREL = 'effect/index.ts';

/**
 * The text of a module specifier node, or undefined when it is absent or not a string literal.
 *
 * @param {ts.Expression | undefined} specifier
 * @returns {string | undefined}
 */
const specifierText = (specifier) =>
  specifier !== undefined && ts.isStringLiteral(specifier) ? specifier.text : undefined;

/**
 * The local names an import declaration binds: default, namespace and named (type-only included).
 *
 * @param {ts.ImportDeclaration} declaration
 * @returns {string[]}
 */
const importedNames = (declaration) => {
  const clause = declaration.importClause;
  if (clause === undefined) return [];
  const bindings = clause.namedBindings;
  return [
    ...(clause.name === undefined ? [] : [clause.name.text]),
    ...(bindings === undefined
      ? []
      : ts.isNamespaceImport(bindings)
        ? [bindings.name.text]
        : bindings.elements.map((element) => element.name.text)),
  ];
};

/**
 * Every module specifier a file re-exports: the specifier of each top-level `export … from` declaration, plus the
 * specifier of each top-level import whose bound name a specifier-less `export { … }` in the same file re-exports.
 *
 * @param {ts.SourceFile} sourceFile
 * @returns {string[]}
 */
const reExportSpecifiers = (sourceFile) => {
  const statements = sourceFile.statements;
  const exportDeclarations = statements.filter(ts.isExportDeclaration);
  const fromSpecifiers = exportDeclarations.flatMap((declaration) => {
    const text = specifierText(declaration.moduleSpecifier);
    return text === undefined ? [] : [text];
  });
  const locallyExportedNames = new Set(
    exportDeclarations
      .filter((declaration) => declaration.moduleSpecifier === undefined)
      .flatMap((declaration) =>
        declaration.exportClause !== undefined && ts.isNamedExports(declaration.exportClause)
          ? declaration.exportClause.elements.map((element) => (element.propertyName ?? element.name).text)
          : [],
      ),
  );
  const importSpecifiers = statements.filter(ts.isImportDeclaration).flatMap((declaration) => {
    const text = specifierText(declaration.moduleSpecifier);
    return text !== undefined && importedNames(declaration).some((name) => locallyExportedNames.has(name))
      ? [text]
      : [];
  });
  return [...fromSpecifiers, ...importSpecifiers];
};

/**
 * Reads and parses a barrel once, returning the specifiers it re-exports.
 *
 * @param {string} barrel path relative to the src directory
 * @returns {string[]}
 */
const specifiersOf = (barrel) => {
  const fileName = path.join(srcDir, barrel);
  return reExportSpecifiers(
    ts.createSourceFile(fileName, fs.readFileSync(fileName, 'utf8'), ts.ScriptTarget.Latest, true),
  );
};

/** Folders whose modules are never public: `internal/` (private helpers) and `test/` (tests and their helpers). */
const SKIPPED_FOLDERS = new Set(['internal', 'test']);

/** @param {string} specifier */
const isSkipped = (specifier) => specifier.split('/').some((segment) => SKIPPED_FOLDERS.has(segment));

/**
 * The `.ts` modules (not `.d.ts`) under a directory, as `/`-separated paths relative to `effectDir`, skipping every
 * `internal/` and `test/` folder at any depth.
 *
 * @param {string} relDir `/`-separated path relative to `effectDir`, empty for `effectDir` itself
 * @returns {string[]}
 */
const modulesUnder = (relDir) =>
  fs.readdirSync(path.join(effectDir, relDir), { withFileTypes: true }).flatMap((entry) => {
    const relPath = relDir === '' ? entry.name : `${relDir}/${entry.name}`;
    if (entry.isDirectory()) return SKIPPED_FOLDERS.has(entry.name) ? [] : modulesUnder(relPath);
    return entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts') ? [relPath] : [];
  });

const effectModules = modulesUnder('')
  .filter((relPath) => relPath !== 'index.ts')
  .sort();

const rootSpecifiers = specifiersOf(ROOT_BARREL);
const effectSpecifiers = specifiersOf(EFFECT_BARREL);
const effectSpecifierSet = new Set(effectSpecifiers);

/** @type {ReadonlyArray<readonly [string, string[]]>} */
const barrels = [
  [ROOT_BARREL, rootSpecifiers],
  [EFFECT_BARREL, effectSpecifiers],
];

const problems = [
  ...effectModules
    .filter((relPath) => !effectSpecifierSet.has(`./${relPath}`))
    .map((relPath) => `src/effect/${relPath} is not re-exported from src/effect/index.ts`),
  ...(rootSpecifiers.includes('./effect/index.ts') ? [] : ['src/index.ts does not re-export ./effect/index.ts']),
  ...barrels.flatMap(([barrel, specifiers]) =>
    specifiers
      .filter(isSkipped)
      .map((specifier) => `src/${barrel} re-exports ${specifier}, which is internal or a test/ file`),
  ),
];

if (problems.length > 0) {
  console.error('packages/platform-js: barrel exports drift detected');
  problems.forEach((problem) => console.error(`  ${problem}`));
  process.exit(1);
}

console.log(`packages/platform-js: ${effectModules.length} effect modules re-exported, no internal or test/ re-exports`);

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
// (`./effect/*`, with `./effect/internal/*` set to null), so a module is public as soon as it exists in src/effect/,
// and the barrels are what must keep up:
//   1. every module in src/effect/ (internal/ aside) is re-exported from src/effect/index.ts;
//   2. src/index.ts re-exports ./effect/index.ts;
//   3. no barrel re-exports anything from internal/, which is private.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(repoRoot, 'packages/platform-js/src');
const effectDir = path.join(srcDir, 'effect');

const BARRELS = ['index.ts', 'effect/index.ts'];

/**
 * The module specifiers a file re-exports from: `export * from`, `export * as X from` and `export { ... } from`.
 *
 * @param {string} source
 * @returns {string[]}
 */
const reExportSpecifiers = (source) =>
  [...source.matchAll(/^\s*export\s+(?:type\s+)?(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/gm)].map(
    (match) => match[1],
  );

/** @param {string} barrel */
const specifiersOf = (barrel) => reExportSpecifiers(fs.readFileSync(path.join(srcDir, barrel), 'utf8'));

/** @param {string} specifier */
const isInternal = (specifier) => /(^|\/)internal(\/|$)/.test(specifier);

const effectModules = fs
  .readdirSync(effectDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts'))
  .map((entry) => entry.name)
  .filter((name) => name !== 'index.ts')
  .sort();

const effectIndexSpecifiers = new Set(specifiersOf('effect/index.ts'));

const problems = [
  ...effectModules
    .filter((name) => !effectIndexSpecifiers.has(`./${name}`))
    .map((name) => `src/effect/${name} is not re-exported from src/effect/index.ts`),
  ...(specifiersOf('index.ts').includes('./effect/index.ts') ? [] : ['src/index.ts does not re-export ./effect/index.ts']),
  ...BARRELS.flatMap((barrel) =>
    specifiersOf(barrel)
      .filter(isInternal)
      .map((specifier) => `src/${barrel} re-exports ${specifier}, which is internal`),
  ),
];

if (problems.length > 0) {
  console.error('packages/platform-js: barrel exports drift detected');
  problems.forEach((problem) => console.error(`  ${problem}`));
  process.exit(1);
}

console.log(`packages/platform-js: ${effectModules.length} effect modules re-exported, no internal re-exports`);

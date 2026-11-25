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
// Run @effect/language-service diagnostics on changed packages/**/*.ts(x) files.
// Uses the plugin config from tsconfig.base.json, with `deterministicKeys` downgraded
// to "off": the Context.Tag keys in src/effect/Configuration.ts don't match the deterministic
// pattern, and fixing them renames runtime tag keys (a breaking API change) — cleanup tracked
// in issue #87. Remove the override once it lands.
import { execFileSync, spawnSync } from 'node:child_process';
import ts from 'typescript';

const changed = execFileSync('node', ['scripts/changed-files.mjs'], { encoding: 'utf8' })
  .split('\n')
  .filter((file) => /^packages\/.*\.tsx?$/.test(file));

if (changed.length === 0) process.exit(0);

// Parse with TypeScript's own tsconfig reader (JSONC-aware: comments, trailing commas) —
// the same parser tsc uses, so it can never disagree with how the config is interpreted.
const { config: baseConfig, error } = ts.readConfigFile('tsconfig.base.json', ts.sys.readFile);
if (error) {
  console.error(ts.flattenDiagnosticMessageText(error.messageText, '\n'));
  process.exit(1);
}
const plugin = baseConfig.compilerOptions.plugins.find((p) => p.name === '@effect/language-service');
const lspConfig = {
  ...plugin,
  diagnosticSeverity: { ...plugin.diagnosticSeverity, deterministicKeys: 'off' },
};

const failures = changed.filter((file) => {
  const result = spawnSync(
    'yarn',
    [
      'effect-language-service',
      'diagnostics',
      '--file',
      `${process.cwd()}/${file}`,
      '--format',
      'pretty',
      '--lspconfig',
      JSON.stringify(lspConfig),
    ],
    { stdio: 'inherit' },
  );
  return result.status !== 0;
});

process.exit(failures.length > 0 ? 1 : 0);

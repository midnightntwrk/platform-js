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
// Run the Effect language service on the changed packages/**/*.ts(x) files, with the shared
// @effect/language-service plugin config from tsconfig.base.json. Any diagnostic fails the run,
// warnings as well as errors (`--strict`). "Changed" is measured against HEAD, so uncommitted
// and untracked work is checked.
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const PLUGIN_NAME = '@effect/language-service';

// changed-files.mjs sits next to this script and prints each path NUL-terminated, so any file
// name (spaces, newlines, non-ASCII) arrives intact. It is resolved from this file, not the cwd.
const changedFilesScript = fileURLToPath(new URL('./changed-files.mjs', import.meta.url));

const changed = execFileSync(process.execPath, [changedFilesScript], { encoding: 'utf8' })
  .split('\0')
  .filter((file) => file !== '')
  .filter((file) => /^packages\/.*\.tsx?$/.test(file));

if (changed.length === 0) {
  console.log('els:changed: no changed packages/**/*.ts files since HEAD; nothing to check');
  process.exit(0);
}

// Parse with TypeScript's own tsconfig reader (JSONC-aware: comments, trailing commas) —
// the same parser tsc uses, so it can never disagree with how the config is interpreted.
const { config: baseConfig, error } = ts.readConfigFile('tsconfig.base.json', ts.sys.readFile);
if (error) {
  console.error(ts.flattenDiagnosticMessageText(error.messageText, '\n'));
  process.exit(1);
}

const plugins = baseConfig?.compilerOptions?.plugins;
const plugin = Array.isArray(plugins) ? plugins.find((p) => p?.name === PLUGIN_NAME) : undefined;
if (plugin === undefined) {
  console.error(`tsconfig.base.json has no ${PLUGIN_NAME} plugin entry`);
  process.exit(1);
}

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
      '--strict',
      '--lspconfig',
      JSON.stringify(plugin),
    ],
    { stdio: 'inherit' },
  );
  if (result.error) {
    console.error(`could not run effect-language-service for ${file}: ${result.error.message}`);
    return true;
  }
  return result.status !== 0;
});

process.exit(failures.length > 0 ? 1 : 0);

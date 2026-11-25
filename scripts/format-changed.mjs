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
// Run `yarn format:file` on every file changed since HEAD (as listed by changed-files.mjs).
// A Node script rather than an `xargs` pipe so that each path is passed as exactly one
// argument, whatever characters it holds, and so that a git failure fails the run instead
// of silently formatting nothing.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const changedFilesScript = fileURLToPath(new URL('./changed-files.mjs', import.meta.url));

const listing = spawnSync(process.execPath, [changedFilesScript], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
});

if (listing.error !== undefined) {
  process.stderr.write(`format:changed: could not run changed-files.mjs: ${listing.error.message}\n`);
  process.exit(1);
}
if (listing.status !== 0) {
  process.stderr.write(`format:changed: listing the changed files failed (exit ${listing.status ?? listing.signal})\n`);
  process.exit(listing.status ?? 1);
}

const files = listing.stdout.split('\0').filter((file) => file !== '');

if (files.length === 0) {
  process.stdout.write('format:changed: no changed files since HEAD; nothing to format\n');
  process.exit(0);
}

const format = spawnSync('yarn', ['format:file', ...files], { stdio: 'inherit' });

if (format.error !== undefined) {
  process.stderr.write(`could not run yarn format:file: ${format.error.message}\n`);
  process.exit(1);
}
process.exit(format.status ?? 1);

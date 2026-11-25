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
// Print files changed vs HEAD — tracked modifications plus untracked files — each followed by
// a NUL byte, so any path (spaces, quotes, newlines, non-ASCII) survives intact. Prints nothing
// when nothing changed. Generic building block for whatever needs a changed-file list, e.g.
//   node scripts/changed-files.mjs | xargs -0 -r yarn format:file
// scripts/format-changed.mjs does exactly that without a shell pipe.
// If git fails, git's message goes to stderr and the script exits non-zero.
//
// Why not `turbo run format --affected`? Three mismatches:
//   1. Granularity: --affected selects whole *packages* and runs their format script
//      (prettier over the entire package), rewriting files you never touched.
//      This script feeds prettier only the changed files.
//   2. Root coverage: --affected only sees workspace packages. Root files (CLAUDE.md,
//      scripts/, docs/) are formatted by format:root (the whole root) and format:file
//      (the files named); there is no package format task for them, so --affected
//      never sees them.
//   3. Diff base: --affected diffs against the merge-base with main (the whole
//      branch); this diffs against HEAD (your current uncommitted work), which is
//      the right semantics for "format what I'm about to commit".
// `--affected` IS the right fit for package-level tasks — see lint:changed.
import { execFileSync } from 'node:child_process';
import { lstatSync } from 'node:fs';

// `-z` makes git print raw, NUL-terminated names: no C-style quoting of non-ASCII or
// special characters, and no ambiguity from spaces or newlines in a name. git's own stderr
// is inherited so its error message reaches the user.
/** @param {readonly string[]} args */
const git = (args) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
      .split('\0')
      .filter((file) => file !== '');
  } catch (error) {
    const status = /** @type {{ status?: number | null }} */ (error).status;
    process.stderr.write(`changed-files: git ${args.join(' ')} failed\n`);
    process.exit(typeof status === 'number' && status !== 0 ? status : 1);
  }
};

// Skip symlinks: prettier/eslint throw on them ("Explicitly specified pattern … is a symbolic
// link"), and a symlink has no content of its own to format — its target, if tracked, is
// handled on its own. Tool-managed skills (e.g. .agents/ + .claude/skills/<name> symlinks) are
// a common source of these in an otherwise-clean tree.
// Only a file that vanished between the git listing and the stat (ENOENT) is skipped; any
// other stat error is a real problem and is rethrown.
/** @param {string} file */
const isRealFile = (file) => {
  try {
    return !lstatSync(file).isSymbolicLink();
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
};

const files = [
  ...git(['diff', '-z', '--name-only', '--diff-filter=ACMR', 'HEAD']),
  ...git(['ls-files', '-z', '--others', '--exclude-standard']),
].filter(isRealFile);

process.stdout.write(files.map((file) => `${file}\0`).join(''));

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

import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The repository root. */
export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** A finished child process. */
export interface RunResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

/** Runs a command to completion without a shell. */
export const run = (
  command: string,
  args: readonly string[],
  options: { readonly cwd: string; readonly env?: NodeJS.ProcessEnv },
): RunResult => {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    encoding: 'utf8',
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};

/** Runs one of the repo's `scripts/*.mjs` files with Node. */
export const runScript = (
  script: string,
  args: readonly string[],
  options: { readonly cwd: string; readonly env?: NodeJS.ProcessEnv },
): RunResult => run(process.execPath, [path.join(repoRoot, 'scripts', script), ...args], options);

/**
 * Makes an empty directory. Under the OS temp folder by default; `insideRepo` puts it under the git-ignored
 * `node_modules/.cache/` instead, for fixtures that need the repo's installed packages to resolve.
 */
export const makeTempDir = (prefix: string, insideRepo = false): string => {
  const parent = insideRepo ? path.join(repoRoot, 'node_modules/.cache/tooling-tests') : os.tmpdir();
  fs.mkdirSync(parent, { recursive: true });
  return fs.mkdtempSync(path.join(parent, `${prefix}-`));
};

/** Removes a directory made by {@link makeTempDir}. */
export const removeDir = (dir: string): void => fs.rmSync(dir, { recursive: true, force: true });

/** Writes a file, creating its folders. */
export const writeFile = (file: string, content: string): void => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};

/** Runs git in `cwd`, failing the test on a git error. */
export const git = (cwd: string, args: readonly string[]): string =>
  execFileSync('git', args, { cwd, encoding: 'utf8' });

/** Starts a git repo in `dir` with every file already in it committed as the base. */
export const initRepo = (dir: string): void => {
  git(dir, ['init', '--quiet', '--initial-branch=main']);
  git(dir, ['config', 'user.email', 'tooling-tests@example.invalid']);
  git(dir, ['config', 'user.name', 'tooling tests']);
  git(dir, ['config', 'commit.gpgsign', 'false']);
  git(dir, ['add', '--all']);
  git(dir, ['commit', '--quiet', '--allow-empty', '-m', 'base']);
};

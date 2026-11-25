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

import * as fs from 'node:fs';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { git, initRepo, makeTempDir, removeDir, runScript, writeFile } from './support.ts';

describe('changed-files', () => {
  const state = { dir: '' };

  beforeEach(() => {
    state.dir = makeTempDir('changed-files');
  });

  afterEach(() => removeDir(state.dir));

  const at = (file: string) => path.join(state.dir, file);

  it('should list every uncommitted and untracked file once, NUL-separated, and nothing else', () => {
    writeFile(at('.gitignore'), 'ignored.md\n');
    writeFile(at('modified.md'), 'base\n');
    writeFile(at('deleted.md'), 'base\n');
    writeFile(at('target.md'), 'base\n');
    initRepo(state.dir);

    writeFile(at('modified.md'), 'changed\n');
    writeFile(at('added.md'), 'added\n');
    git(state.dir, ['add', 'added.md']);
    fs.rmSync(at('deleted.md'));
    writeFile(at('untracked.md'), 'untracked\n');
    writeFile(at('ignored.md'), 'ignored\n');
    fs.symlinkSync('target.md', at('link.md'));
    writeFile(at('café.md'), 'accent\n');
    writeFile(at('a b.md'), 'space\n');
    writeFile(at("it's.md"), 'quote\n');

    const result = runScript('changed-files.mjs', [], { cwd: state.dir });

    expect(result.status).toBe(0);
    expect(result.stdout.endsWith('\0')).toBe(true);
    expect(
      result.stdout
        .split('\0')
        .filter((file) => file !== '')
        .sort(),
    ).toEqual(['a b.md', 'added.md', 'café.md', "it's.md", 'modified.md', 'untracked.md'].sort());
  });

  it('should print nothing when the work tree is clean', () => {
    writeFile(at('a.md'), 'base\n');
    initRepo(state.dir);

    const result = runScript('changed-files.mjs', [], { cwd: state.dir });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
  });

  it('should fail when git fails', () => {
    const result = runScript('changed-files.mjs', [], {
      cwd: state.dir,
      env: { GIT_DIR: at('no-such-git-dir') },
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/not a git repository/i);
  });
});

describe('format-changed', () => {
  const state = { dir: '' };

  beforeEach(() => {
    state.dir = makeTempDir('format-changed');
  });

  afterEach(() => removeDir(state.dir));

  it('should say there is nothing to format and succeed when nothing changed', () => {
    writeFile(path.join(state.dir, 'a.md'), 'base\n');
    initRepo(state.dir);

    const result = runScript('format-changed.mjs', [], { cwd: state.dir });

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/nothing to format/);
  });

  it('should fail, with git’s message, when listing the changed files fails', () => {
    const result = runScript('format-changed.mjs', [], {
      cwd: state.dir,
      env: { GIT_DIR: path.join(state.dir, 'no-such-git-dir') },
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/not a git repository/i);
  });
});

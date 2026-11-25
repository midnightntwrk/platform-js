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

import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import { repoRoot, run } from './support.ts';

const packageDir = path.join(repoRoot, 'packages/platform-js');

/** The package source files a `tsc -p <tsconfig>` build compiles, as paths relative to the package. */
const compiledSources = (tsconfig: string): readonly string[] => {
  const result = run('yarn', ['run', '-T', 'tsc', '-p', tsconfig, '--listFilesOnly'], { cwd: packageDir });
  expect(result.status).toBe(0);
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((file) => file !== '')
    .map((file) => path.relative(packageDir, file))
    .filter((file) => file.startsWith('src/'));
};

describe('platform-js build', () => {
  it.each(['tsconfig.build.json', 'tsconfig.publish.json'])(
    'should compile the src/effect modules but no test/ folder with %s',
    (tsconfig) => {
      const sources = compiledSources(tsconfig);

      expect(sources.some((file) => file.startsWith('src/effect/'))).toBe(true);
      expect(sources.filter((file) => /^src\/(.*\/)?test\//.test(file))).toEqual([]);
    },
  );
});

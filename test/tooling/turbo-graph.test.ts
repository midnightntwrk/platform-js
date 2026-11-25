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

import packageConfig from '../../packages/platform-js/vitest.config.ts';
import { repoRoot, run } from './support.ts';

const pkg = '@midnightntwrk/platform-js';

/** The task IDs a `yarn turbo run <task>` would run, read from its dry-run graph. */
const plannedTasks = (task: string): readonly string[] => {
  const result = run('yarn', ['turbo', 'run', task, '--dry=json'], { cwd: repoRoot });
  expect(result.status).toBe(0);
  const graph: { readonly tasks: readonly { readonly taskId: string }[] } = JSON.parse(result.stdout);
  return graph.tasks.map((t) => t.taskId);
};

/** The test files a `vitest list` run selects, as repo-relative paths. */
const listedFiles = (cwd: string, args: readonly string[]): readonly string[] => {
  const result = run('yarn', ['run', '-T', 'vitest', 'list', '--filesOnly', ...args], { cwd });
  expect(result.status).toBe(0);
  return result.stdout
    .split('\n')
    .map((line) => line.replace(/^\[[^\]]+\]\s+/, '').trim())
    .filter((file) => file !== '')
    .map((file) => path.relative(repoRoot, path.resolve(cwd, file)))
    .sort();
};

describe('turbo verify graph', () => {
  it('should run every check that yarn lint, yarn format:check, the barrel check and both lanes run', () => {
    expect(plannedTasks('verify')).toEqual(
      expect.arrayContaining([
        `${pkg}#typecheck`,
        `${pkg}#format:check`,
        '//#format:check:root',
        `${pkg}#lint`,
        '//#lint:root',
        '//#check-barrel-exports',
        '//#typecheck:root',
        `${pkg}#test:unit`,
        `${pkg}#test:integration`,
        '//#test:tooling',
      ]),
    );
  });
});

describe('platform-js vitest config', () => {
  it('should select only src/**/test/**/*.test.ts at the top level, for runners that ignore its projects', () => {
    expect(packageConfig.test?.include).toEqual(['src/**/test/**/*.test.ts']);
  });

  it('should list from the repo root exactly the files of the unit project', () => {
    const fromRoot = listedFiles(repoRoot, []);
    const unit = listedFiles(path.join(repoRoot, 'packages/platform-js'), ['--project', 'unit']);

    expect(unit.length).toBeGreaterThan(0);
    expect(fromRoot).toEqual(unit);
  });

  it('should keep every unit test out of the integration project', () => {
    const packageDir = path.join(repoRoot, 'packages/platform-js');
    const unit = listedFiles(packageDir, ['--project', 'unit']);
    const integration = listedFiles(packageDir, ['--project', 'integration', '--passWithNoTests']);

    expect(integration.filter((file) => unit.includes(file))).toEqual([]);
    expect(integration.every((file) => file.endsWith('.integration.test.ts'))).toBe(true);
  });
});

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

import packageConfig from '../../packages/platform-js/vitest.config.ts';
import { makeTempDir, removeDir, repoRoot, run } from './support.ts';

const pkg = '@midnightntwrk/platform-js';
const packageDir = path.join(repoRoot, 'packages/platform-js');

/** The `include` globs of one of the package config's named projects. */
const projectInclude = (name: string): readonly string[] | undefined =>
  (packageConfig.test?.projects ?? []).flatMap((project) =>
    typeof project === 'object' && 'test' in project && project.test?.name === name ? [project.test.include] : [],
  )[0];

/**
 * Vitest arguments that send a run's coverage and reports to `dir`, so a test run never touches the package's own
 * `coverage/` and `reports/` folders, which a parallel `yarn verify` lane may be writing.
 */
const outputsIn = (dir: string): readonly string[] => [
  `--coverage.reportsDirectory=${path.join(dir, 'coverage')}`,
  '--reporter=default',
];

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
  // A temp folder per test for the coverage and reports of the runs it starts.
  const outputs = { dir: '' };
  beforeEach(() => {
    outputs.dir = makeTempDir('vitest-outputs');
  });
  afterEach(() => removeDir(outputs.dir));

  it('should select only src/**/test/**/*.test.ts at the top level, for runners that ignore its projects', () => {
    expect(packageConfig.test?.include).toEqual(['src/**/test/**/*.test.ts']);
  });

  it('should select only *.integration.test.ts files in a test/ folder for the integration project', () => {
    expect(projectInclude('integration')).toEqual(['src/**/test/**/*.integration.test.ts']);
  });

  it('should leave the tests and their helpers out of coverage', () => {
    expect(packageConfig.test?.coverage?.exclude).toContain('src/**/test/**');
  });

  it('should run every package test file in the unit or integration project', () => {
    const onDisk = fs
      .globSync('**/*.test.ts', {
        cwd: packageDir,
        exclude: (file) => ['node_modules', 'dist'].includes(path.basename(file)),
      })
      .map((file) => path.relative(repoRoot, path.join(packageDir, file)))
      .sort();
    const unit = listedFiles(packageDir, ['--project', 'unit']);
    const integration = listedFiles(packageDir, ['--project', 'integration', '--passWithNoTests']);

    expect([...unit, ...integration].sort()).toEqual(onDisk);
  });

  it('should list from the repo root exactly the files of the unit project', () => {
    const fromRoot = listedFiles(repoRoot, []);
    const unit = listedFiles(path.join(repoRoot, 'packages/platform-js'), ['--project', 'unit']);

    expect(unit.length).toBeGreaterThan(0);
    expect(fromRoot).toEqual(unit);
  });

  it.each<[string, readonly string[]]>([
    ['a single-file run', ['run', '-T', 'vitest', 'run', 'src/effect/test/Hex.test.ts']],
    ['the empty integration lane', ['test:integration']],
  ])('should not fail %s on the coverage thresholds', (_, args) => {
    const result = run('yarn', [...args, ...outputsIn(outputs.dir)], {
      cwd: packageDir,
      env: { npm_lifecycle_event: '' },
    });

    expect(result.stdout + result.stderr).not.toContain('threshold');
    expect(result.status).toBe(0);
  });

  it('should fail a package test:unit run below the coverage floor', () => {
    const result = run('yarn', ['test:unit', 'src/effect/test/Hex.test.ts', ...outputsIn(outputs.dir)], {
      cwd: packageDir,
    });

    expect(result.stdout + result.stderr).toContain('does not meet global threshold');
    expect(result.status).not.toBe(0);
  });

  it('should keep every unit test out of the integration project', () => {
    const unit = listedFiles(packageDir, ['--project', 'unit']);
    const integration = listedFiles(packageDir, ['--project', 'integration', '--passWithNoTests']);

    expect(integration.filter((file) => unit.includes(file))).toEqual([]);
    expect(integration.every((file) => file.endsWith('.integration.test.ts'))).toBe(true);
  });
});

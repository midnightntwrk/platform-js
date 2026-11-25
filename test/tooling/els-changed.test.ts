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

import ts from 'typescript';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { initRepo, makeTempDir, removeDir, repoRoot, runScript, writeFile } from './support.ts';

// A Context.Tag key that does not follow the deterministic pattern: an error under the shared plugin config.
const errorSource = `import * as Context from 'effect/Context';

export class Keys extends Context.Tag('not-deterministic')<Keys, number>() {}
`;

// The global Error in a failure channel: a warning-level diagnostic by default.
const warningSource = `import * as Effect from 'effect/Effect';

export const program = Effect.fail(new Error('boom'));
`;

const cleanSource = `export const one = 1;
`;

/** The repo's shared tsconfig, with or without the language-service plugin entry. */
const baseConfig = (withPlugin: boolean): string => {
  const { config } = ts.readConfigFile(path.join(repoRoot, 'tsconfig.base.json'), ts.sys.readFile);
  const compilerOptions = withPlugin ? config.compilerOptions : { ...config.compilerOptions, plugins: [] };
  return JSON.stringify({ ...config, compilerOptions }, null, 2);
};

describe('els-changed', () => {
  const state = { dir: '' };

  // The fixture sits inside the repo (git-ignored) so `effect` and the language service resolve from its node_modules.
  beforeEach(() => {
    state.dir = makeTempDir('els-changed', true);
  });

  afterEach(() => removeDir(state.dir));

  const at = (file: string) => path.join(state.dir, file);

  const setUp = (options: { readonly withPlugin?: boolean } = {}) => {
    writeFile(at('tsconfig.base.json'), baseConfig(options.withPlugin ?? true));
    writeFile(
      at('packages/x/tsconfig.json'),
      JSON.stringify({ extends: '../../tsconfig.base.json', include: ['src/**/*.ts'] }),
    );
    writeFile(at('packages/x/src/clean.ts'), cleanSource);
    initRepo(state.dir);
  };

  const check = () => {
    const result = runScript('els-changed.mjs', [], { cwd: state.dir });
    return { ...result, output: `${result.stdout}${result.stderr}` };
  };

  it('should fail on an error-level diagnostic in a changed file', () => {
    setUp();
    writeFile(at('packages/x/src/keys.ts'), errorSource);

    const result = check();

    expect(result.status).toBe(1);
    expect(result.output).toContain('deterministicKeys');
  });

  it('should fail on a warning-level diagnostic in a changed file', () => {
    setUp();
    writeFile(at('packages/x/src/warn.ts'), warningSource);

    const result = check();

    expect(result.status).toBe(1);
    expect(result.output).toContain('globalErrorInEffectFailure');
  });

  it('should check a changed file whose name is not ASCII', () => {
    setUp();
    writeFile(at('packages/x/src/clé.ts'), errorSource);

    const result = check();

    expect(result.status).toBe(1);
    expect(result.output).toContain('deterministicKeys');
  });

  it('should pass a changed file with no diagnostics', () => {
    setUp();
    writeFile(at('packages/x/src/clean.ts'), `${cleanSource}export const two = 2;\n`);

    expect(check().status).toBe(0);
  });

  it('should say there is nothing to check and succeed when no packages/**/*.ts file changed', () => {
    setUp();
    writeFile(at('notes.md'), 'not TypeScript\n');

    const result = check();

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/nothing to check/);
  });

  it('should fail, naming tsconfig.base.json, when it has no language-service plugin entry', () => {
    setUp({ withPlugin: false });
    writeFile(at('packages/x/src/clean.ts'), `${cleanSource}export const two = 2;\n`);

    const result = check();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('tsconfig.base.json');
    expect(result.stderr).toContain('@effect/language-service');
  });
});

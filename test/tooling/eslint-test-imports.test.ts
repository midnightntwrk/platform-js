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

import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

import { repoRoot } from './support.ts';

const eslint = new ESLint({ cwd: repoRoot });

const testFile = 'packages/platform-js/src/effect/test/Fixture.test.ts';

const internalMessage = 'Tests import public modules, not internal/.';

/** The messages the root ESLint config reports under `ruleId` for `code` at `filePath`. */
const ruleMessages = async (ruleId: string, code: string, filePath = testFile): Promise<readonly string[]> => {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).filter((message) => message.ruleId === ruleId).map((message) => message.message);
};

/** The `no-restricted-imports` messages the root ESLint config reports for `code` at `filePath`. */
const restrictedImports = (code: string, filePath = testFile): Promise<readonly string[]> =>
  ruleMessages('no-restricted-imports', code, filePath);

/** The `no-restricted-syntax` messages the root ESLint config reports for `code` at `filePath`. */
const restrictedSyntax = (code: string, filePath = testFile): Promise<readonly string[]> =>
  ruleMessages('no-restricted-syntax', code, filePath);

describe('eslint test import rules', () => {
  it.each([
    ["import * as internal from '../internal/hex.ts';", '../internal/hex.ts'],
    ["import { parseHex } from '../internal/hex.ts';", '../internal/hex.ts'],
    ["import * as internal from '../../internal/hex.ts';", '../../internal/hex.ts'],
  ])('should reject an import of internal/ from a test: %s', async (code, specifier) => {
    expect(await restrictedImports(code)).toEqual([
      `'${specifier}' import is restricted from being used by a pattern. ${internalMessage}`,
    ]);
  });

  it.each([
    "await import('../internal/hex.ts');",
    'await import(`../internal/hex.ts`);',
    "vi.mock('../internal/hex.ts');",
    "vi.doMock('../internal/hex.ts');",
    "await vi.importActual('../internal/hex.ts');",
    "await vi.importMock('../internal/hex.ts');",
  ])('should reject a dynamic load of internal/ from a test: %s', async (code) => {
    expect(await restrictedSyntax(code)).toEqual([internalMessage]);
  });

  it('should allow an import of a public module from a test', async () => {
    expect(await restrictedImports("import * as Hex from '../Hex.ts';")).toEqual([]);
  });

  it.each(["await import('../Hex.ts');", "vi.mock('../Hex.ts');", "await vi.importActual('../Hex.ts');"])(
    'should allow a dynamic load of a public module from a test: %s',
    async (code) => {
      expect(await restrictedSyntax(code)).toEqual([]);
    },
  );

  it('should still reject a relative .js path in a test', async () => {
    expect(await restrictedSyntax("vi.mock('../Hex.js');")).toEqual([
      'Relative import and export paths end in .ts, not .js: tsc rewrites them to .js when it compiles.',
    ]);
  });

  it('should allow a public module to import internal/', async () => {
    expect(
      await restrictedImports(
        "import * as internal from './internal/hex.ts';",
        'packages/platform-js/src/effect/Hex.ts',
      ),
    ).toEqual([]);
  });

  it('should allow a public module to load internal/ dynamically', async () => {
    expect(
      await restrictedSyntax("await import('./internal/hex.ts');", 'packages/platform-js/src/effect/Hex.ts'),
    ).toEqual([]);
  });
});

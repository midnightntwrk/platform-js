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

/** The `no-restricted-imports` messages the root ESLint config reports for `code` at `filePath`. */
const restrictedImports = async (code: string, filePath = testFile): Promise<readonly string[]> => {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? [])
    .filter((message) => message.ruleId === 'no-restricted-imports')
    .map((message) => message.message);
};

describe('eslint test import rules', () => {
  it.each([
    ["import * as internal from '../internal/hex.ts';", '../internal/hex.ts'],
    ["import { parseHex } from '../internal/hex.ts';", '../internal/hex.ts'],
    ["import * as internal from '../../internal/hex.ts';", '../../internal/hex.ts'],
  ])('should reject an import of internal/ from a test: %s', async (code, specifier) => {
    expect(await restrictedImports(code)).toEqual([
      `'${specifier}' import is restricted from being used by a pattern. Tests import public modules, not src/effect/internal/.`,
    ]);
  });

  it('should allow an import of a public module from a test', async () => {
    expect(await restrictedImports("import * as Hex from '../Hex.ts';")).toEqual([]);
  });

  it('should allow a public module to import internal/', async () => {
    expect(
      await restrictedImports(
        "import * as internal from './internal/hex.ts';",
        'packages/platform-js/src/effect/Hex.ts',
      ),
    ).toEqual([]);
  });
});

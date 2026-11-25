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

import { makeTempDir, removeDir, repoRoot, runScript, writeFile } from './support.ts';

const realSrc = path.join(repoRoot, 'packages/platform-js/src');

describe('check-barrel-exports', () => {
  const state = { src: '' };

  beforeEach(() => {
    state.src = path.join(makeTempDir('barrels'), 'src');
    fs.cpSync(realSrc, state.src, { recursive: true });
  });

  afterEach(() => removeDir(path.dirname(state.src)));

  const check = () => runScript('check-barrel-exports.mjs', ['--src', state.src], { cwd: repoRoot });
  const read = (file: string) => fs.readFileSync(path.join(state.src, file), 'utf8');
  const write = (file: string, content: string) => writeFile(path.join(state.src, file), content);
  const append = (file: string, content: string) => write(file, `${read(file)}\n${content}\n`);
  const effectIndex = 'effect/index.ts';
  const hexExport = "export * as Hex from './Hex.ts';";

  it('should pass on the real source tree', () => {
    expect(check().status).toBe(0);
  });

  it('should pass when a module in a subfolder is re-exported by its relative path', () => {
    write('effect/sub/A.ts', 'export const a = 1;\n');
    append(effectIndex, "export * as A from './sub/A.ts';");
    expect(check().status).toBe(0);
  });

  it('should fail when a module is missing from effect/index.ts', () => {
    write(effectIndex, read(effectIndex).replace(hexExport, ''));
    const result = check();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('src/effect/Hex.ts');
  });

  it('should fail when the only re-export of a module sits inside a block comment', () => {
    write(effectIndex, read(effectIndex).replace(hexExport, `/* ${hexExport} */`));
    expect(check().status).toBe(1);
  });

  it('should fail when the only re-export of a module sits inside a line comment', () => {
    write(effectIndex, read(effectIndex).replace(hexExport, `// ${hexExport}`));
    expect(check().status).toBe(1);
  });

  it('should fail when a module in a subfolder is not re-exported', () => {
    write('effect/sub/A.ts', 'export const a = 1;\n');
    const result = check();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('src/effect/sub/A.ts');
  });

  it('should not require modules under internal/ to be re-exported', () => {
    write('effect/internal/extra.ts', 'export const extra = 1;\n');
    expect(check().status).toBe(0);
  });

  it.each([
    ['export *', "export * from './internal/hex.ts';"],
    ['export * as', "export * as H from './internal/hex.ts';"],
    ['export { … }', "export { make } from './internal/hex.ts';"],
    ['export type { … }', "export type { HexConstraints } from './internal/hex.ts';"],
    ['an import re-exported by name', "import * as H from './internal/hex.ts';\nexport { H };"],
    [
      'an import re-exported by name as a type',
      "import { type HexConstraints } from './internal/hex.ts';\nexport type { HexConstraints };",
    ],
  ])('should fail when effect/index.ts re-exports internal/ through %s', (_form, line) => {
    append(effectIndex, line);
    const result = check();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('internal');
  });

  it('should fail when index.ts re-exports internal/', () => {
    append('index.ts', "export * from './effect/internal/hex.ts';");
    expect(check().status).toBe(1);
  });

  it('should fail when index.ts does not re-export ./effect/index.ts', () => {
    write('index.ts', read('index.ts').replace("export * from './effect/index.ts';", ''));
    const result = check();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('./effect/index.ts');
  });
});

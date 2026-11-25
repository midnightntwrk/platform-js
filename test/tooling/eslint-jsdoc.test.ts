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

const publicModule = 'packages/platform-js/src/effect/Fixture.ts';

const syntaxRules: readonly (string | null)[] = ['jsdoc/no-restricted-syntax', 'no-restricted-syntax'];

/**
 * The JSDoc problems the root ESLint config reports for `code` at `filePath`: the jsdoc rules, plus the syntax bans
 * that keep exports where those rules can see them. Each is `rule`, or `rule: message` for a syntax rule.
 */
const jsdocProblems = async (code: string, filePath = publicModule): Promise<readonly string[]> => {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? [])
    .filter((message) => message.ruleId?.startsWith('jsdoc/') === true || message.ruleId === 'no-restricted-syntax')
    .map((message) =>
      syntaxRules.includes(message.ruleId) ? `${message.ruleId}: ${message.message}` : `${message.ruleId}`,
    );
};

const missingCategory =
  'jsdoc/no-restricted-syntax: Every export needs a @category tag (.claude/rules/functional-style.md).';
const exportListBan = expect.stringMatching(/^no-restricted-syntax: .*declared in place/);
const defaultExportBan = expect.stringMatching(/^no-restricted-syntax: No default export/);

const documented = (description: string, tags: readonly string[], declaration: string): string =>
  ['/**', ` * ${description}`, ' *', ...tags.map((tag) => ` * ${tag}`), ' */', declaration].join('\n');

const category = '@category Fixture';

/** One undocumented export of each declaration kind the config requires a JSDoc block on. */
const undocumentedExports = {
  'function declaration': 'export function f(n: number): number {\n  return n;\n}',
  constant: 'export const c = 1;',
  'type alias': 'export type T = string;',
  interface: 'export interface I {\n  readonly a: string;\n}',
  enum: 'export enum E {\n  A,\n}',
  class: 'export class K {}',
  'declared function': 'export declare function h(a: string): string;',
} as const;

/** The same exports, each with a description, @param/@returns where it is written as a function, and @category. */
const documentedExports = {
  'function declaration': documented(
    'Returns its argument.',
    ['@param n The number.', '@returns `n`.', category],
    'export function f(n: number): number {\n  return n;\n}',
  ),
  constant: documented('One.', [category], 'export const c = 1;'),
  'arrow function constant': documented(
    'Doubles a number.',
    ['@param n The number.', '@returns Twice `n`.', category],
    'export const d = (n: number): number => n * 2;',
  ),
  'function expression constant': documented(
    'Doubles a number.',
    ['@param n The number.', '@returns Twice `n`.', category],
    'export const e = function (n: number): number {\n  return n * 2;\n};',
  ),
  'type alias': documented('A string.', [category], 'export type T = string;'),
  interface: documented('Has an a.', [category], 'export interface I {\n  readonly a: string;\n}'),
  enum: documented('One member.', [category], 'export enum E {\n  A,\n}'),
  class: documented('Empty.', [category], 'export class K {}'),
  'declared function': documented(
    'Returns its argument.',
    ['@param a The string.', '@returns `a`.', category],
    'export declare function h(a: string): string;',
  ),
} as const;

/** Exports written as a function, documented with a description and @category but no @param or @returns. */
const functionsWithoutParamOrReturns = {
  'arrow function constant': documented(
    'Doubles a number.',
    [category],
    'export const d = (n: number): number => n * 2;',
  ),
  'function expression constant': documented(
    'Doubles a number.',
    [category],
    'export const e = function (n: number): number {\n  return n * 2;\n};',
  ),
  'function declaration': documented(
    'Returns its argument.',
    [category],
    'export function f(n: number): number {\n  return n;\n}',
  ),
  'declared function': documented('Returns its argument.', [category], 'export declare function h(a: string): string;'),
  'overload signature': [
    documented('Returns its argument.', [category], 'export function o(a: string): string;'),
    documented(
      'Returns its argument.',
      ['@param a The value.', '@returns `a`.', category],
      'export function o(a: string | number): string | number {\n  return a;\n}',
    ),
  ].join('\n'),
} as const;

const typeWithNamespace = (namespace: string): string =>
  [documented('A string.', [category], 'export type T = string;'), namespace].join('\n');

describe('eslint jsdoc rules', () => {
  describe('in a public module', () => {
    it.each(Object.entries(undocumentedExports))('should require a JSDoc block on an exported %s', async (_, code) => {
      expect(await jsdocProblems(code)).toContain('jsdoc/require-jsdoc');
    });

    it.each(Object.entries(documentedExports))('should pass a fully documented exported %s', async (_, code) => {
      expect(await jsdocProblems(code)).toEqual([]);
    });

    it('should require a description in a JSDoc block that has only tags', async () => {
      expect(await jsdocProblems(['/**', ` * ${category}`, ' */', 'export const c = 1;'].join('\n'))).toEqual([
        'jsdoc/require-description',
      ]);
    });

    it.each(Object.entries(functionsWithoutParamOrReturns))(
      'should require @param and @returns on an exported %s',
      async (_, code) => {
        expect(await jsdocProblems(code)).toEqual(
          expect.arrayContaining(['jsdoc/require-param', 'jsdoc/require-returns']),
        );
      },
    );

    it('should require @category on a top-level export', async () => {
      expect(await jsdocProblems(documented('One.', [], 'export const c = 1;'))).toEqual([missingCategory]);
    });

    it('should require @category on a namespace member', async () => {
      const code = typeWithNamespace(
        ['export declare namespace T {', '  /** A member. */', '  export type U = string;', '}'].join('\n'),
      );
      expect(await jsdocProblems(code)).toEqual([missingCategory]);
    });

    it('should need no JSDoc block on a declare namespace whose members are documented', async () => {
      const code = typeWithNamespace(
        [
          'export declare namespace T {',
          `  /** A member.\n   *\n   * ${category}\n   */`,
          '  export type U = string;',
          '}',
        ].join('\n'),
      );
      expect(await jsdocProblems(code)).toEqual([]);
    });

    it('should need no @category on the JSDoc block of a declare namespace', async () => {
      const code = typeWithNamespace(
        [
          '/** The namespace. */',
          'export declare namespace T {',
          `  /** A member.\n   *\n   * ${category}\n   */`,
          '  export type U = string;',
          '}',
        ].join('\n'),
      );
      expect(await jsdocProblems(code)).toEqual([]);
    });

    it('should need no JSDoc block on a function that is not exported', async () => {
      expect(await jsdocProblems('function g(n: number): number {\n  return n;\n}')).toEqual([]);
    });

    it('should need one @param per parameter, not one per destructured field', async () => {
      const code = documented(
        'Reads x.',
        ['@param input The input.', '@returns Its x.', category],
        'export const x = ({ x }: { readonly x: number }): number => x;',
      );
      expect(await jsdocProblems(code)).toEqual([]);
    });

    it('should reject a local export list, which hides the declaration from the JSDoc rules', async () => {
      expect(await jsdocProblems('const z = 1;\nexport { z };')).toEqual([exportListBan]);
    });

    it('should reject a default export', async () => {
      expect(await jsdocProblems('export default function g(): void {}')).toEqual([defaultExportBan]);
    });

    it('should still reject a relative path ending in .js', async () => {
      expect(await jsdocProblems("export * from './X.js';")).toEqual([
        'no-restricted-syntax: Relative import and export paths end in .ts, not .js: ' +
          'tsc rewrites them to .js when it compiles.',
      ]);
    });

    it('should allow re-exports from another module', async () => {
      expect(await jsdocProblems("export { x } from './X.ts';\nexport * from './Y.ts';")).toEqual([]);
    });
  });

  describe('which files it checks', () => {
    it.each([
      'packages/platform-js/src/effect/P.mts',
      'packages/platform-js/src/effect/P.tsx',
      'packages/platform-js/src/effect/sub/index.ts',
    ])('should check %s', async (filePath) => {
      expect(await jsdocProblems(undocumentedExports.constant, filePath)).toContain('jsdoc/require-jsdoc');
    });

    it.each([
      'packages/platform-js/src/effect/internal/X.ts',
      'packages/platform-js/src/index.ts',
      'packages/platform-js/src/effect/index.ts',
      'packages/platform-js/src/effect/test/X.test.ts',
      'packages/platform-js/src/effect/test/Arbitrary.ts',
    ])('should not check %s', async (filePath) => {
      expect(await jsdocProblems(undocumentedExports.constant, filePath)).toEqual([]);
    });
  });
});

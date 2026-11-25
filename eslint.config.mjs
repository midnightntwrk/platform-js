// @ts-check

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import-x';
import jsdoc from 'eslint-plugin-jsdoc';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';

// Exported declarations that must carry a JSDoc block with a description. A `declare namespace` is not among them.
const documentedExportContexts = [
  'ExportNamedDeclaration > FunctionDeclaration',
  'ExportNamedDeclaration > VariableDeclaration',
  'ExportNamedDeclaration > TSTypeAliasDeclaration',
  'ExportNamedDeclaration > TSInterfaceDeclaration',
  'ExportNamedDeclaration > TSEnumDeclaration',
  'ExportNamedDeclaration > ClassDeclaration'
];
// Exports whose parameters a lint can see: written as a function. One built by a call (dual, Brand.refined) or
// assigned from another binding (`= internal.parseHex`) is not among them.
const functionExportContexts = [
  'ExportNamedDeclaration > FunctionDeclaration',
  'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression',
  'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > FunctionExpression'
];

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/*.d.ts',
      '**/node_modules/**',
      '**/.yarn/**',
      '.scratch/**',
      '.repos/**',
      '.agents/**',
      '**/coverage/**',
      '**/reports/**',
      '**/*.json'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'import-x': importPlugin,
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports
    },
    settings: {
      'import-x/parsers': {
        '@typescript-eslint/parser': ['.ts']
      },
      'import-x/resolver': {
        typescript: {
          alwaysTryTypes: false,
          project: ['tsconfig.json']
        }
      }
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          'vars': 'all',
          'varsIgnorePattern': '^_',
          'args': 'after-used',
          'argsIgnorePattern': '^_'
        }
      ],
      'object-curly-newline': ['error', {
        'ImportDeclaration': 'never'
      }],
      'object-property-newline': ['error', {
        'allowAllPropertiesOnSameLine': true
      }],
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/no-object-literal-type-assertion': 'off',
      '@typescript-eslint/prefer-interface': 'off',
      '@typescript-eslint/camelcase': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-use-before-define': ['error'],
      '@typescript-eslint/no-shadow': ['error'],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          'fixStyle': 'inline-type-imports'
        }
      ],
      '@typescript-eslint/no-namespace': [
        'error',
        // Ensure that we allow namespace declarations to support Effect style typing.
        {
          'allowDeclarations': true
        }
      ],
      'no-shadow': 'off',
      'prefer-destructuring': 'off',
      'no-use-before-define': 'off',
      'import-x/prefer-default-export': 'off',
      'import-x/no-default-export': 'off',
      'import-x/extensions': 'off',
      'import-x/no-unresolved': 'error',
      'import-x/no-extraneous-dependencies': 'off',
      'max-classes-per-file': 'off',
      'lines-between-class-members': 'off',
      // Relative paths name the .ts source (tsc rewrites them, rewriteRelativeImportExtensions). Flat config replaces
      // the whole rule option: a later block that sets no-restricted-syntax must repeat these entries.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            ':matches(ImportDeclaration, ExportNamedDeclaration, ExportAllDeclaration, ImportExpression, TSImportType)' +
            '[source.value=/^\\.{1,2}\\/.*\\.js$/]',
          message: 'Relative import and export paths end in .ts, not .js: tsc rewrites them to .js when it compiles.'
        },
        {
          selector:
            "ImportExpression[source.type='TemplateLiteral'][source.expressions.length=0]" +
            '[source.quasis.0.value.raw=/^\\.{1,2}\\/.*\\.js$/]',
          message: 'Relative import and export paths end in .ts, not .js: tsc rewrites them to .js when it compiles.'
        },
        {
          selector: 'TSModuleDeclaration[id.value=/^\\.{1,2}\\/.*\\.js$/]',
          message: 'Relative import and export paths end in .ts, not .js: tsc rewrites them to .js when it compiles.'
        },
        {
          selector:
            "CallExpression[callee.object.name='vi'][callee.property.name=/^(mock|importActual|importMock|doMock)$/]" +
            '[arguments.0.value=/^\\.{1,2}\\/.*\\.js$/]',
          message: 'Relative import and export paths end in .ts, not .js: tsc rewrites them to .js when it compiles.'
        }
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/dist/**', './dist/**', '../dist/**'],
              message: 'Direct imports from dist folders are not allowed. Use source files instead.'
            }
          ]
        }
      ],
    }
  },
  {
    files: ['**/test/**/*.ts'],
    rules: {
      // Flat config replaces the whole rule option, so the dist pattern from the block above is repeated here.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/dist/**', './dist/**', '../dist/**'],
              message: 'Direct imports from dist folders are not allowed. Use source files instead.'
            },
            {
              group: ['**/src/effect/internal/**'],
              message: 'Tests import public modules, not src/effect/internal/.'
            }
          ]
        }
      ]
    }
  },
  {
    // .claude/rules/functional-style.md → Public API documentation, as far as a lint can see it. ADR-0005 lists what
    // it can't see.
    files: ['packages/*/src/**/*.ts'],
    ignores: ['packages/*/src/**/internal/**', 'packages/*/src/**/index.ts'],
    plugins: { jsdoc },
    settings: { jsdoc: { mode: 'typescript' } },
    rules: {
      'jsdoc/require-jsdoc': [
        'error',
        {
          require: { FunctionDeclaration: false },
          contexts: documentedExportContexts
        }
      ],
      'jsdoc/require-description': [
        'error',
        {
          contexts: documentedExportContexts
        }
      ],
      'jsdoc/require-param': [
        'error',
        {
          contexts: functionExportContexts
        }
      ],
      'jsdoc/require-returns': [
        'error',
        {
          contexts: functionExportContexts
        }
      ],
      // Checked per export: jsdoc/no-missing-syntax would pass a whole file on a single @category. The context is the
      // bare ExportNamedDeclaration, which holds the JSDoc block: a child selector (`ExportNamedDeclaration > ...`)
      // never matches here. It also covers exports inside a `declare namespace`, but not the namespace itself: the
      // same-named type's JSDoc covers that.
      'jsdoc/no-restricted-syntax': [
        'error',
        {
          contexts: [
            {
              context: 'ExportNamedDeclaration[declaration.type!="TSModuleDeclaration"]',
              comment: 'JsdocBlock:not(:has(JsdocTag[tag="category"]))',
              message: 'Every export needs a @category tag (.claude/rules/functional-style.md).'
            }
          ]
        }
      ]
    }
  },
  prettierConfig
);

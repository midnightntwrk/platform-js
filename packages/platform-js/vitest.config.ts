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

/// <reference types="vitest" />
import { configDefaults, defineConfig } from 'vitest/config';

import { testOutputs } from '../../vitest.outputs.ts';

const outputs = testOutputs();

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    exclude: [...configDefaults.exclude, '**/dist/**'],
    coverage: {
      provider: 'v8',
      enabled: true,
      clean: true,
      include: ['src/**/*.ts'],
      reporter: ['clover', 'json', 'json-summary', 'lcov', 'text'],
      reportsDirectory: outputs.coverageDirectory
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['test/**/*.test.ts'],
          exclude: [...configDefaults.exclude, '**/dist/**', '**/*.integration.test.ts']
        }
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['test/**/*.integration.test.ts']
        }
      }
    ],
    reporters: [
      'default',
      ['junit', { outputFile: outputs.junitFile }],
      ['html', { outputFile: outputs.htmlFile }]
    ]
  }
});

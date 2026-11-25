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

import { checksCoverageThresholds, testOutputs } from '../../vitest.outputs.ts';

const outputs = testOutputs();

const exclude = [...configDefaults.exclude, '**/dist/**'];

// Settings every project shares. The projects do not use `extends: true`: Vitest concatenates inherited `include`
// lists, so the top-level `include` below would leak unit tests into the integration project.
const shared = { environment: 'node', globals: true } as const;

export default defineConfig({
  test: {
    ...shared,
    // Runners that ignore `projects` (vitest started from the repo root, some editor integrations) use this top-level
    // selection: the unit project's files, never integration tests.
    include: ['src/**/test/**/*.test.ts'],
    exclude: [...exclude, '**/*.integration.test.ts'],
    coverage: {
      provider: 'v8',
      enabled: true,
      clean: true,
      include: ['src/**/*.ts'],
      // Tests and their helpers sit beside the source (ADR-0006); coverage measures only the code they test.
      exclude: ['src/**/test/**'],
      // A floor, not a target: the coverage the unit tests reach, rounded down to the nearest 5. Raise it as the
      // known gaps close; never lower it to make a change pass. Checked only on a full unit run.
      ...(checksCoverageThresholds(process.env.npm_lifecycle_event)
        ? { thresholds: { statements: 90, branches: 80, functions: 90, lines: 90 } }
        : {}),
      reporter: ['clover', 'json', 'json-summary', 'lcov', 'text'],
      reportsDirectory: outputs.coverageDirectory,
    },
    projects: [
      {
        test: {
          ...shared,
          name: 'unit',
          include: ['src/**/test/**/*.test.ts'],
          exclude: [...exclude, '**/*.integration.test.ts'],
        },
      },
      {
        test: {
          ...shared,
          name: 'integration',
          include: ['src/**/test/**/*.integration.test.ts'],
          exclude,
        },
      },
    ],
    reporters: ['default', ['junit', { outputFile: outputs.junitFile }], ['html', { outputFile: outputs.htmlFile }]],
  },
});

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
import { defineConfig } from 'vitest/config';

/**
 * Tests for the repo's own tooling: the root scripts, `turbo.json`, the Vitest configs and the root ESLint config's
 * JSDoc rules. They run root scripts as child processes against temporary directories and git repos, so they live
 * outside the package projects and run through `yarn test:tooling` only.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/tooling/**/*.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});

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

/**
 * The test lane a vitest run belongs to: `unit` and `integration` for the package scripts of those names, `all` for any
 * other run (`yarn test`, a bare `vitest run`).
 */
export type TestLane = 'unit' | 'integration' | 'all';

/** Derives the lane from the package script being run, which yarn exposes as `npm_lifecycle_event`. */
export const testLaneOf = (script: string | undefined): TestLane =>
  script === 'test:unit' ? 'unit' : script === 'test:integration' ? 'integration' : 'all';

/**
 * Where a package's vitest run writes coverage and its junit/html reports, one folder per lane.
 *
 * `yarn verify` has turbo run a package's `test:unit` and `test:integration` at the same time, in the same package
 * directory. Coverage empties its directory before writing (`clean: true`) and both lanes write the same report file
 * names, so a shared path lets one lane delete or overwrite the other's output. Giving every lane, `all` included, its
 * own folder keeps any two runs apart. The `outputs` of the `test`, `test:unit` and `test:integration` tasks in
 * `turbo.json` name the same folders, so a cache hit restores only its own lane's files.
 *
 * The lane comes from the package script, not from `--project`: a run started without one (`yarn run -T vitest run
 * --project unit`, an editor's test runner) is the `all` lane and writes under `coverage/all` and `reports/all`.
 */
export const testOutputs = (lane: TestLane = testLaneOf(process.env.npm_lifecycle_event)) => ({
  coverageDirectory: `./coverage/${lane}`,
  junitFile: `reports/${lane}/test-report.xml`,
  htmlFile: `reports/${lane}/test-report.html`,
});

/**
 * Whether a run checks the coverage thresholds: any run of the package's `test` or `test:unit` script, including one
 * given a file filter (`yarn test -- <file>`), which then fails the thresholds because it covers one module. The runs
 * that skip them are the direct `yarn run -T vitest run <file>` (and editor runs), which measure one module, and the
 * integration lane, which covers nothing.
 */
export const checksCoverageThresholds = (script: string | undefined): boolean =>
  script === 'test' || script === 'test:unit';

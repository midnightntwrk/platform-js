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

import { describe, expect, it } from 'vitest';

import { type TestLane, testLaneOf, testOutputs } from '../../vitest.outputs.ts';

describe('testLaneOf', () => {
  it.each<[string | undefined, TestLane]>([
    ['test:unit', 'unit'],
    ['test:integration', 'integration'],
    ['test', 'all'],
    ['verify', 'all'],
    [undefined, 'all'],
  ])('should map the package script %j to the %s lane', (script, lane) => {
    expect(testLaneOf(script)).toBe(lane);
  });
});

describe('testOutputs', () => {
  it.each<TestLane>(['unit', 'integration', 'all'])('should write the %s lane under its own folders', (lane) => {
    expect(testOutputs(lane)).toEqual({
      coverageDirectory: `./coverage/${lane}`,
      junitFile: `reports/${lane}/test-report.xml`,
      htmlFile: `reports/${lane}/test-report.html`,
    });
  });
});

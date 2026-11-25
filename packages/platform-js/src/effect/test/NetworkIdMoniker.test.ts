/*
 * This file is part of midnight-sdk.
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

import { describe, expect, it } from '@effect/vitest';
import * as Either from 'effect/Either';
import * as fc from 'effect/FastCheck';

import * as NetworkIdMoniker from '../NetworkIdMoniker.ts';

const invalid = (source: string) => `Source string '${source}' is not a valid network identifier`;

/** Strings of letters, digits and `-` with exactly one other character in them. */
const invalidMonikerArbitrary = fc
  .tuple(
    fc.stringMatching(/^[a-zA-Z0-9-]{0,8}$/),
    fc.string({ minLength: 1, maxLength: 1 }).filter((c) => !/^[a-zA-Z0-9-]$/.test(c)),
    fc.stringMatching(/^[a-zA-Z0-9-]{0,8}$/),
  )
  .map(([before, bad, after]) => `${before}${bad}${after}`);

describe('NetworkIdMoniker', () => {
  describe('NetworkIdMoniker', () => {
    it('should accept any non-empty mix of ASCII letters, digits and hyphens', () =>
      fc.assert(
        fc.property(fc.stringMatching(/^[a-zA-Z0-9-]{1,32}$/), (moniker) => {
          expect(NetworkIdMoniker.NetworkIdMoniker(moniker)).toBe(moniker);
          expect(NetworkIdMoniker.NetworkIdMoniker.either(moniker)).toEqual(Either.right(moniker));
        }),
      ));

    it.each(['hosky!dev', 'hosky_dev_01', '!@£&^*', '', 'hosky dev'])(
      'should reject invalid identifiers (%o)',
      (networkId) => {
        expect(NetworkIdMoniker.NetworkIdMoniker.either(networkId)).toEqual(
          Either.left([{ message: invalid(networkId) }]),
        );
      },
    );

    it('should reject any identifier holding another character', () =>
      fc.assert(
        fc.property(invalidMonikerArbitrary, (networkId) => {
          expect(NetworkIdMoniker.NetworkIdMoniker.either(networkId)).toEqual(
            Either.left([{ message: invalid(networkId) }]),
          );
        }),
      ));

    it('should throw the brand errors from the constructor', () => {
      expect(() => NetworkIdMoniker.NetworkIdMoniker('hosky!dev')).toThrow(
        expect.arrayContaining([{ message: invalid('hosky!dev') }]),
      );
    });
  });
});

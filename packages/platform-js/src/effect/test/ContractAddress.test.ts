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

import * as ContractAddress from '../ContractAddress.ts';
import * as Arbitrary from './Arbitrary.ts';

const wrongByteLength = (source: string, byteLength: number) =>
  `Source string '${source}' has a byte length of ${byteLength}, but expected 32..=32`;

describe('ContractAddress', () => {
  describe('ContractAddress', () => {
    it('should parse plain addresses', () =>
      fc.assert(
        fc.property(Arbitrary.makePlainHexArbitrary('32..=32'), (hex) => {
          expect(ContractAddress.ContractAddress(hex)).toBe(hex);
        }),
      ));

    it('should reject short plain addresses', () =>
      fc.assert(
        fc.property(Arbitrary.makePlainHexArbitrary('1..32'), (hex) => {
          expect(ContractAddress.ContractAddress.either(hex)).toEqual(
            Either.left([{ message: wrongByteLength(hex, hex.length / 2) }]),
          );
        }),
      ));

    it('should reject long plain addresses', () =>
      fc.assert(
        fc.property(Arbitrary.makePlainHexArbitrary('33..=50'), (hex) => {
          expect(ContractAddress.ContractAddress.either(hex)).toEqual(
            Either.left([{ message: wrongByteLength(hex, hex.length / 2) }]),
          );
        }),
      ));

    it('should reject prefixed addresses', () =>
      fc.assert(
        fc.property(Arbitrary.makePrefixedHexArbitrary('32..=32'), (hex) => {
          expect(ContractAddress.ContractAddress.either(hex)).toEqual(
            Either.left([{ message: `Source string '${hex}' has a '0x' prefix but prefixes are not allowed` }]),
          );
        }),
      ));

    it('should reject an invalid address', () => {
      expect(ContractAddress.ContractAddress.either('HOSKYA')).toEqual(
        Either.left([{ message: "Invalid hex-digit 'H' found in source string at index 0", meta: expect.anything() }]),
      );
    });
  });

  describe('asBytes', () => {
    it('should return the 32 bytes the address encodes', () =>
      fc.assert(
        fc.property(Arbitrary.makePlainHexArbitrary('32..=32'), (hex) => {
          const bytes = ContractAddress.asBytes(ContractAddress.ContractAddress(hex));
          expect(bytes).toBeInstanceOf(Uint8Array);
          expect(bytes.length).toBe(32);
          expect(Buffer.from(bytes).toString('hex')).toBe(hex.toLowerCase());
        }),
      ));
  });
});

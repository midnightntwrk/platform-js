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

import { describe, expect, it } from '@effect/vitest';
import * as Either from 'effect/Either';
import * as fc from 'effect/FastCheck';

import * as CoinPublicKey from '../CoinPublicKey.ts';
import * as Arbitrary from './Arbitrary.ts';

describe('CoinPublicKey', () => {
  describe('Hex', () => {
    it('should accept plain hex', () =>
      fc.assert(
        fc.property(Arbitrary.makePlainHexArbitrary('1..=64'), (hex) => {
          expect(CoinPublicKey.Hex(hex)).toBe(hex);
          expect(CoinPublicKey.Hex.is(hex)).toBe(true);
        }),
      ));

    it('should reject prefixed hex', () =>
      fc.assert(
        fc.property(Arbitrary.makePrefixedHexArbitrary('1..=64'), (hex) => {
          expect(CoinPublicKey.Hex.either(hex)).toEqual(
            Either.left([{ message: `Source string '${hex}' has a '0x' prefix but prefixes are not allowed` }]),
          );
        }),
      ));

    it.each([
      ['an empty string', '', [{ message: 'Source string must have non-zero length' }]],
      [
        'an incomplete byte',
        'abc',
        [{ message: "Last byte of source string 'abc' is incomplete", meta: expect.anything() }],
      ],
      [
        'a non-hex digit',
        'zz',
        [{ message: "Invalid hex-digit 'z' found in source string at index 0", meta: expect.anything() }],
      ],
    ])('should reject %s', (_case, source, errors) => {
      expect(CoinPublicKey.Hex.either(source)).toEqual(Either.left(errors));
    });

    it('should throw the brand errors from the constructor', () => {
      expect(() => CoinPublicKey.Hex('0xab')).toThrow(
        expect.arrayContaining([{ message: "Source string '0xab' has a '0x' prefix but prefixes are not allowed" }]),
      );
    });
  });

  describe('make', () => {
    // Brands are erased at runtime, so which of Hex or Bech32m `make` picked cannot be observed here.
    it('should return plain hex unchanged', () =>
      fc.assert(
        fc.property(Arbitrary.makePlainHexArbitrary('1..=64'), (hex) => {
          expect(CoinPublicKey.make(hex)).toBe(hex);
        }),
      ));
  });

  describe('asHex', () => {
    it('should return a plain hex key unchanged', () =>
      fc.assert(
        fc.property(Arbitrary.makePlainHexArbitrary('1..=64'), (hex) => {
          expect(CoinPublicKey.asHex(CoinPublicKey.Hex(hex))).toBe(hex);
          expect(CoinPublicKey.asHex(hex)).toBe(hex);
        }),
      ));
  });

  describe('asBytes', () => {
    it('should return the bytes a plain hex key encodes', () =>
      fc.assert(
        fc.property(Arbitrary.makePlainHexArbitrary('1..=64'), (hex) => {
          const bytes = CoinPublicKey.asBytes(CoinPublicKey.Hex(hex));
          expect(bytes).toBeInstanceOf(Uint8Array);
          expect(bytes.length).toBe(hex.length / 2);
          expect(Buffer.from(bytes).toString('hex')).toBe(hex.toLowerCase());
        }),
      ));
  });
});

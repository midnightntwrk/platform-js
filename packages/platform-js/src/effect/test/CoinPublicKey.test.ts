/*
 * This file is part of platform-js.
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
import { prefixNotAllowed } from './Messages.ts';

const plainKeyArbitrary = Arbitrary.makePlainHexArbitrary('1..=64');
const prefixedKeyArbitrary = Arbitrary.makePrefixedHexArbitrary('1..=64');

// A key in the Bech32m form a wallet shows: human-readable part, separator `1`, then the data characters.
// Nothing here checks the checksum, so the data need not decode.
const BECH32M_KEY = 'mn_shield-cpk_test1q8xvz5e2p0gjjdx4nqu0qp6c5wkjyvh3dzrmf7xhk2hag0l3wtcsqzmh4tf';

describe('CoinPublicKey', () => {
  describe('Hex', () => {
    it('should accept plain hex', () =>
      fc.assert(
        fc.property(plainKeyArbitrary, (hex) => {
          expect(CoinPublicKey.Hex(hex)).toBe(hex);
          expect(CoinPublicKey.Hex.is(hex)).toBe(true);
        }),
      ));

    it('should reject prefixed hex', () =>
      fc.assert(
        fc.property(prefixedKeyArbitrary, (hex) => {
          expect(CoinPublicKey.Hex.either(hex)).toEqual(Either.left([{ message: prefixNotAllowed(hex) }]));
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
      expect(() => CoinPublicKey.Hex('0xab')).toThrow(expect.arrayContaining([{ message: prefixNotAllowed('0xab') }]));
    });
  });

  describe('Bech32m', () => {
    it('should return a Bech32m key unchanged', () => {
      expect(CoinPublicKey.Bech32m(BECH32M_KEY)).toBe(BECH32M_KEY);
    });
  });

  describe('make', () => {
    it('should return a Bech32m key unchanged', () => {
      expect(CoinPublicKey.make(BECH32M_KEY)).toBe(BECH32M_KEY);
    });

    // Brands are erased at runtime: this checks the value `make` returns, not which brand it carries.
    it('should return plain hex unchanged', () =>
      fc.assert(
        fc.property(plainKeyArbitrary, (hex) => {
          expect(CoinPublicKey.make(hex)).toBe(hex);
        }),
      ));
  });

  describe('asHex', () => {
    it('should return a plain hex key unchanged', () =>
      fc.assert(
        fc.property(plainKeyArbitrary, (hex) => {
          expect(CoinPublicKey.asHex(CoinPublicKey.Hex(hex))).toBe(hex);
          expect(CoinPublicKey.asHex(hex)).toBe(hex);
        }),
      ));
  });

  describe('asBech32m', () => {
    it('should return a Bech32m key unchanged', () => {
      expect(CoinPublicKey.asBech32m(CoinPublicKey.Bech32m(BECH32M_KEY))).toBe(BECH32M_KEY);
      expect(CoinPublicKey.asBech32m(BECH32M_KEY)).toBe(BECH32M_KEY);
    });
  });

  describe('asBytes', () => {
    it('should return the bytes a plain hex key encodes', () =>
      fc.assert(
        fc.property(plainKeyArbitrary, (hex) => {
          const bytes = CoinPublicKey.asBytes(CoinPublicKey.Hex(hex));
          expect(bytes).toBeInstanceOf(Uint8Array);
          expect(Buffer.from(bytes).toString('hex')).toBe(hex.toLowerCase());
        }),
      ));
  });
});

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

import * as SigningKey from '../SigningKey.ts';
import * as Arbitrary from './Arbitrary.ts';
import { byteLengthOutOfRange, prefixNotAllowed } from './Messages.ts';

// A valid signing key value is plain hex, 32 to 35 bytes in length.
const VALID_VALUE = 'a1'.repeat(32);

const wrongByteLength = (source: string, byteLength: number) => byteLengthOutOfRange(source, byteLength, '32..=35');

describe('SigningKey', () => {
  describe('Value', () => {
    it('accepts plain hex of 32 to 35 bytes', () =>
      fc.assert(
        fc.property(Arbitrary.makePlainHexArbitrary('32..=35'), (hex) => {
          expect(SigningKey.Value.either(hex)).toEqual(Either.right(hex));
        }),
      ));

    it('rejects plain hex shorter than 32 or longer than 35 bytes', () =>
      fc.assert(
        fc.property(
          fc.oneof(Arbitrary.makePlainHexArbitrary('1..=31'), Arbitrary.makePlainHexArbitrary('36..=50')),
          (hex) => {
            expect(SigningKey.Value.either(hex)).toEqual(
              Either.left([{ message: wrongByteLength(hex, hex.length / 2) }]),
            );
          },
        ),
      ));

    it.each([
      ['an empty value', '', [{ message: 'Source string must have non-zero length' }]],
      [
        'a value with an incomplete last byte',
        'not-hex',
        [{ message: "Last byte of source string 'not-hex' is incomplete", meta: expect.anything() }],
      ],
      ['a prefixed hex value', '0x' + VALID_VALUE, [{ message: prefixNotAllowed('0x' + VALID_VALUE) }]],
      // The lengths either side of the 32..=35 range, which a random length seldom lands on.
      ['a 31-byte value', 'a1'.repeat(31), [{ message: wrongByteLength('a1'.repeat(31), 31) }]],
      ['a 36-byte value', 'a1'.repeat(36), [{ message: wrongByteLength('a1'.repeat(36), 36) }]],
    ])('rejects %s', (_case, value, errors) => {
      expect(SigningKey.Value.either(value)).toEqual(Either.left(errors));
    });
  });

  describe('make', () => {
    it('defaults the kind to schnorr when none is provided', () => {
      expect(SigningKey.make(VALID_VALUE)).toEqual({ tag: 'schnorr', value: VALID_VALUE });
    });

    it('uses the provided kind', () => {
      expect(SigningKey.make(VALID_VALUE, 'ecdsa')).toEqual({ tag: 'ecdsa', value: VALID_VALUE });
    });

    it('keeps any supported kind and any valid value', () =>
      fc.assert(
        fc.property(
          Arbitrary.makePlainHexArbitrary('32..=35'),
          fc.constantFrom(...SigningKey.SignatureKinds),
          (value, tag) => {
            expect(SigningKey.make(value, tag)).toEqual({ tag, value });
          },
        ),
      ));
  });

  describe('SignatureKinds', () => {
    it('exposes the supported signature kinds', () => {
      expect(SigningKey.SignatureKinds).toEqual(['schnorr', 'ecdsa']);
    });
  });

  describe('DefaultSignatureKind', () => {
    it('defaults to the schnorr signature kind', () => {
      expect(SigningKey.DefaultSignatureKind).toBe('schnorr');
    });
  });
});

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
import { Effect } from 'effect';
import * as Either from 'effect/Either';
import * as fc from 'effect/FastCheck';
import { NodeInspectSymbol } from 'effect/Inspectable';

import * as Hex from '../Hex.ts';
import * as IntegerRange from '../IntegerRange.ts';
import * as ParseError from '../ParseError.ts';
import * as Arbitrary from './Arbitrary.ts';

const prefixNotAllowed = (source: string) => `Source string '${source}' has a '0x' prefix but prefixes are not allowed`;
const prefixRequired = (source: string) => `Source string '${source}' requires a '0x' prefix`;
const byteLengthOutOfRange = (source: string, byteLength: number, expected: string) =>
  `Source string '${source}' has a byte length of ${byteLength}, but expected ${expected}`;

describe('Hex', () => {
  describe('parseHex', () => {
    it('should parse plain hex-encodings', () =>
      fc.assert(
        fc.asyncProperty(Arbitrary.makePlainHexArbitrary('2..=10'), (hex) =>
          Effect.gen(function* () {
            const result = yield* Hex.parseHex(hex);
            expect(result.hasPrefix).toBe(false);
            expect(result.byteChars).toEqual(hex);
            expect(result.incompleteChars.length).toBe(0);
          }).pipe(Effect.runPromise),
        ),
      ));

    it('should parse prefixed hex-encodings', () =>
      fc.assert(
        fc.asyncProperty(Arbitrary.makePrefixedHexArbitrary('2..=10'), (hex) =>
          Effect.gen(function* () {
            const result = yield* Hex.parseHex(hex);
            expect(result.hasPrefix).toBe(true);
            expect(result.byteChars).toEqual(hex.substring(2));
            expect(result.incompleteChars.length).toBe(0);
          }).pipe(Effect.runPromise),
        ),
      ));

    it.effect('should describe the parsed elements when printed, serialised or inspected', () =>
      Effect.gen(function* () {
        const result = yield* Hex.parseHex('0xab12');
        const groups = { prefix: '0x', byteChars: 'ab12', incompleteChars: '' };
        expect(result.toString()).toBe('0xab12..[]');
        expect(result.toJSON()).toEqual(groups);
        expect(result[NodeInspectSymbol]()).toEqual(groups);
      }),
    );

    it.effect('should fail with a ParseError for an invalid hex-encoding', () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(Hex.parseHex('HOSKYA'));
        expect(ParseError.isParseError(error)).toBeTruthy();
        expect(error).toMatchObject({
          message: "Invalid hex-digit 'H' found in source string at index 0",
        });
      }),
    );

    it.effect.each([
      ['an empty string', '', 'Source string must have non-zero length'],
      ['an incomplete last byte', 'abc', "Last byte of source string 'abc' is incomplete"],
      ['an invalid digit after whole bytes', 'abzz', "Invalid hex-digit 'z' found in source string at index 2"],
      ['an invalid digit after a prefix', '0xzz', "Invalid hex-digit 'z' found in source string at index 2"],
      ['a prefix with no bytes', '0x', "Source string '0x' is not a valid hex-string"],
    ])('should fail with a ParseError for %s', ([, source, message]) =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(Hex.parseHex(source));
        expect(ParseError.isParseError(error)).toBe(true);
        expect(error.message).toBe(message);
        expect(error.source).toBe(source);
      }),
    );
  });

  describe('PlainHex', () => {
    it('should parse plain hex-encodings', () =>
      fc.assert(
        fc.property(Arbitrary.makePlainHexArbitrary('2..=10'), (hex) => {
          expect(Hex.PlainHex(hex)).toBe(hex);
        }),
      ));

    it('should reject prefixed hex-encodings', () =>
      fc.assert(
        fc.property(Arbitrary.makePrefixedHexArbitrary('2..=10'), (hex) => {
          expect(Hex.PlainHex.either(hex)).toEqual(Either.left([{ message: prefixNotAllowed(hex) }]));
        }),
      ));

    it('should reject a string that is not hex with the parse error message', () => {
      expect(Hex.PlainHex.either('abc')).toEqual(
        Either.left([{ message: "Last byte of source string 'abc' is incomplete", meta: expect.anything() }]),
      );
    });

    it('should throw the brand errors from the constructor', () => {
      expect(() => Hex.PlainHex('0xab')).toThrow(expect.arrayContaining([{ message: prefixNotAllowed('0xab') }]));
    });
  });

  describe('PrefixedHex', () => {
    it('should parse prefixed hex-encodings', () =>
      fc.assert(
        fc.property(Arbitrary.makePrefixedHexArbitrary('2..=10'), (hex) => {
          expect(Hex.PrefixedHex(hex)).toBe(hex);
        }),
      ));

    it('should reject plain hex-encodings', () =>
      fc.assert(
        fc.property(Arbitrary.makePlainHexArbitrary('2..=10'), (hex) => {
          expect(Hex.PrefixedHex.either(hex)).toEqual(Either.left([{ message: prefixRequired(hex) }]));
        }),
      ));
  });

  describe('ConstrainedPlainHex', () => {
    const TwoToFourBytes = Hex.ConstrainedPlainHex({ byteLength: '2..=4' });

    it('should accept plain hex within the byte length', () =>
      fc.assert(
        fc.property(Arbitrary.makePlainHexArbitrary('2..=4'), (hex) => {
          expect(TwoToFourBytes(hex)).toBe(hex);
        }),
      ));

    it('should reject plain hex outside the byte length', () =>
      fc.assert(
        fc.property(
          fc.oneof(Arbitrary.makePlainHexArbitrary('1..=1'), Arbitrary.makePlainHexArbitrary('5..=8')),
          (hex) => {
            expect(TwoToFourBytes.either(hex)).toEqual(
              Either.left([{ message: byteLengthOutOfRange(hex, hex.length / 2, '2..=4') }]),
            );
          },
        ),
      ));

    it('should reject prefixed hex within the byte length', () => {
      expect(TwoToFourBytes.either('0xabcd')).toEqual(Either.left([{ message: prefixNotAllowed('0xabcd') }]));
    });

    it('should take the byte length as an IntegerRange', () => {
      const TwoToFour = Hex.ConstrainedPlainHex({ byteLength: IntegerRange.exclusive([2, 5]) });
      expect(TwoToFour('abcdef01')).toBe('abcdef01');
      expect(TwoToFour.either('ab')).toEqual(Either.left([{ message: byteLengthOutOfRange('ab', 1, '2..5') }]));
    });

    it('should accept any byte length when no byte length is given', () =>
      fc.assert(
        fc.property(Arbitrary.makePlainHexArbitrary('1..=40'), (hex) => {
          expect(Hex.ConstrainedPlainHex({})(hex)).toBe(hex);
        }),
      ));
  });

  describe('ConstrainedPrefixedHex', () => {
    const TwoToFourBytes = Hex.ConstrainedPrefixedHex({ byteLength: '2..=4' });

    it('should accept prefixed hex within the byte length', () =>
      fc.assert(
        fc.property(Arbitrary.makePrefixedHexArbitrary('2..=4'), (hex) => {
          expect(TwoToFourBytes(hex)).toBe(hex);
        }),
      ));

    it('should reject prefixed hex outside the byte length', () =>
      fc.assert(
        fc.property(Arbitrary.makePrefixedHexArbitrary('5..=8'), (hex) => {
          expect(TwoToFourBytes.either(hex)).toEqual(
            Either.left([{ message: byteLengthOutOfRange(hex, (hex.length - 2) / 2, '2..=4') }]),
          );
        }),
      ));

    it('should reject plain hex within the byte length', () => {
      expect(TwoToFourBytes.either('abcd')).toEqual(Either.left([{ message: prefixRequired('abcd') }]));
    });
  });
});

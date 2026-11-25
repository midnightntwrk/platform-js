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
import * as Equal from 'effect/Equal';
import * as fc from 'effect/FastCheck';
import * as Hash from 'effect/Hash';
import { NodeInspectSymbol } from 'effect/Inspectable';

import * as IntegerRange from '../IntegerRange.ts';

/** Integer bounds with `min <= max`, kept small so the values around them can be checked one by one. */
const boundsArbitrary = fc
  .tuple(fc.integer({ min: -1000, max: 1000 }), fc.integer({ min: 0, max: 20 }))
  .map(([min, length]) => [min, min + length] as const);

/** Integer bounds with `min < max`: an exclusive range over them holds at least one value. */
const nonEmptyBoundsArbitrary = fc
  .tuple(fc.integer({ min: -1000, max: 1000 }), fc.integer({ min: 1, max: 20 }))
  .map(([min, length]) => [min, min + length] as const);

/** The integers from two below `min` to two above `max`: every value either side of each bound. */
const valuesAround = (min: number, max: number): readonly number[] =>
  Array.from({ length: max - min + 5 }, (_, i) => min - 2 + i);

describe('IntegerRange', () => {
  describe('from', () => {
    it.each<[IntegerRange.IntegerRangeInput, boolean]>([
      [[0, 10] as const, false],
      [[10, 100] as const, false],
      ['0..10', false],
      ['10..100', false],
      ['0..=10', true],
      ['10..=100', true],
    ])('should create a range from %o that is inclusive: %s', (input, inclusive) => {
      const range = IntegerRange.from(input);

      expect(IntegerRange.isInclusive(range)).toBe(inclusive);
      expect(IntegerRange.isExclusive(range)).toBe(!inclusive);
    });

    it('should keep the bounds of a tuple', () =>
      fc.assert(
        fc.property(nonEmptyBoundsArbitrary, ([min, max]) => {
          expect(IntegerRange.from([min, max]).value).toEqual({ _tag: 'Exclusive', min, max });
        }),
      ));

    it('should read the bounds of a string', () => {
      expect(IntegerRange.from('3..7').value).toEqual({ _tag: 'Exclusive', min: 3, max: 7 });
      expect(IntegerRange.from('3..=7').value).toEqual({ _tag: 'Inclusive', min: 3, max: 7 });
    });

    it('should copy an existing range', () => {
      const source = IntegerRange.inclusive([3, 7]);
      const range = IntegerRange.from(source);

      expect(range).not.toBe(source);
      expect(range.value).toEqual(source.value);
    });
  });

  describe('isIntegerRange', () => {
    it('should return true for an integer range', () => {
      expect(IntegerRange.isIntegerRange(IntegerRange.from([0, 10]))).toBe(true);
    });

    it.each([[[0, 10]], ['0..10'], [{ value: { _tag: 'Exclusive', min: 0, max: 10 } }], [null], [undefined], [10]])(
      'should return false for %o',
      (value) => {
        expect(IntegerRange.isIntegerRange(value)).toBe(false);
      },
    );
  });

  describe('equals', () => {
    it('should return true for two ranges equal by value', () => {
      const a = IntegerRange.from([0, 10]);
      const b = IntegerRange.exclusive([0, 10]);
      const c = IntegerRange.from('0..10');

      expect(IntegerRange.equals(a, b)).toBe(true);
      expect(IntegerRange.equals(a, c)).toBe(true);
    });

    it('should return false for two ranges different by value', () => {
      const a = IntegerRange.from([0, 10]);
      const b = IntegerRange.inclusive([0, 10]);
      const c = IntegerRange.from([0, 11]);
      const d = IntegerRange.from([1, 10]);

      expect(IntegerRange.equals(a, b)).toBe(false);
      expect(IntegerRange.equals(a, c)).toBe(false);
      expect(IntegerRange.equals(a, d)).toBe(false);
    });

    it('should compare data-last, for use in a pipe', () => {
      const a = IntegerRange.from([0, 10]);

      expect(a.pipe(IntegerRange.equals(IntegerRange.from('0..10')))).toBe(true);
      expect(a.pipe(IntegerRange.equals(IntegerRange.from('0..=10')))).toBe(false);
    });

    it('should agree with Equivalence', () =>
      fc.assert(
        fc.property(boundsArbitrary, boundsArbitrary, fc.boolean(), ([min1, max1], [min2, max2], inclusive) => {
          const a = IntegerRange.from([min1, max1]);
          const b = inclusive ? IntegerRange.inclusive([min2, max2]) : IntegerRange.exclusive([min2, max2]);

          expect(IntegerRange.Equivalence(a, b)).toBe(IntegerRange.equals(a, b));
          expect(IntegerRange.Equivalence(a, IntegerRange.from([min1, max1]))).toBe(true);
        }),
      ));
  });

  describe('Equal', () => {
    it('should make equal ranges Equal.equals with the same hash', () => {
      const a = IntegerRange.from([0, 10]);
      const b = IntegerRange.from('0..10');

      expect(Equal.equals(a, b)).toBe(true);
      expect(Hash.hash(a)).toBe(Hash.hash(b));
    });

    it('should make different ranges not Equal.equals', () => {
      const a = IntegerRange.from([0, 10]);

      expect(Equal.equals(a, IntegerRange.from('0..=10'))).toBe(false);
      expect(Equal.equals(a, { value: a.value })).toBe(false);
    });
  });

  describe('inclusive', () => {
    it('should create an inclusive range from component parts', () => {
      const range = IntegerRange.inclusive([0, 10]);

      expect(IntegerRange.isInclusive(range)).toBe(true);
      expect(IntegerRange.isExclusive(range)).toBe(false);
      expect(range.value).toEqual({ _tag: 'Inclusive', min: 0, max: 10 });
    });

    it('should return an already inclusive range', () => {
      const sourceRange = IntegerRange.from('0..=10');
      const range = IntegerRange.inclusive(sourceRange);

      expect(range).toBe(sourceRange);
    });

    it('should return an inclusive equivalent of an exclusive range', () =>
      fc.assert(
        fc.property(nonEmptyBoundsArbitrary, ([min, max]) => {
          const sourceRange = IntegerRange.exclusive([min, max]);
          const range = IntegerRange.inclusive(sourceRange);

          expect(IntegerRange.isInclusive(range)).toBe(true);
          expect(range.value).toEqual({ _tag: 'Inclusive', min, max: max - 1 });
          valuesAround(min, max).forEach((value) => {
            expect(IntegerRange.contains(range, value)).toBe(IntegerRange.contains(sourceRange, value));
          });
        }),
      ));
  });

  describe('exclusive', () => {
    it('should create an exclusive range from component parts', () => {
      const range = IntegerRange.exclusive([0, 10]);

      expect(IntegerRange.isExclusive(range)).toBe(true);
      expect(IntegerRange.isInclusive(range)).toBe(false);
      expect(range.value).toEqual({ _tag: 'Exclusive', min: 0, max: 10 });
    });

    it('should return an already exclusive range', () => {
      const sourceRange = IntegerRange.from('0..10');
      const range = IntegerRange.exclusive(sourceRange);

      expect(range).toBe(sourceRange);
    });

    it('should return an exclusive equivalent of an inclusive range', () =>
      fc.assert(
        fc.property(boundsArbitrary, ([min, max]) => {
          const sourceRange = IntegerRange.inclusive([min, max]);
          const range = IntegerRange.exclusive(sourceRange);

          expect(IntegerRange.isExclusive(range)).toBe(true);
          expect(range.value).toEqual({ _tag: 'Exclusive', min, max: max + 1 });
          valuesAround(min, max).forEach((value) => {
            expect(IntegerRange.contains(range, value)).toBe(IntegerRange.contains(sourceRange, value));
          });
        }),
      ));
  });

  describe('contains', () => {
    it('should contain exactly the integers from min up to, but not including, max of an exclusive range', () =>
      fc.assert(
        fc.property(nonEmptyBoundsArbitrary, ([min, max]) => {
          const range = IntegerRange.exclusive([min, max]);
          valuesAround(min, max).forEach((value) => {
            expect(IntegerRange.contains(range, value)).toBe(value >= min && value < max);
          });
        }),
      ));

    it('should contain exactly the integers from min up to and including max of an inclusive range', () =>
      fc.assert(
        fc.property(boundsArbitrary, ([min, max]) => {
          const range = IntegerRange.inclusive([min, max]);
          valuesAround(min, max).forEach((value) => {
            expect(IntegerRange.contains(range, value)).toBe(value >= min && value <= max);
          });
        }),
      ));

    it('should check data-last, for use in a pipe', () => {
      const range = IntegerRange.from('0..=10');

      expect(range.pipe(IntegerRange.contains(10))).toBe(true);
      expect(range.pipe(IntegerRange.contains(11))).toBe(false);
    });
  });

  describe('printing', () => {
    it('should print an exclusive range as min..max and an inclusive one as min..=max', () => {
      expect(IntegerRange.from([0, 10]).toString()).toBe('0..10');
      expect(IntegerRange.inclusive([0, 10]).toString()).toBe('0..=10');
    });

    it('should serialise and inspect as its tagged bounds', () => {
      const range = IntegerRange.inclusive([2, 4]);
      const json = { _id: 'IntegerRange', _tag: 'Inclusive', min: 2, max: 4 };

      expect(range.toJSON()).toEqual(json);
      expect(range[NodeInspectSymbol]()).toEqual(json);
    });
  });
});

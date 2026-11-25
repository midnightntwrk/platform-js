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

/* eslint-disable @typescript-eslint/no-use-before-define */

import * as Equal from 'effect/Equal';
import * as equivalence from 'effect/Equivalence';
import { dual } from 'effect/Function';
import * as Hash from 'effect/Hash';
import { type Inspectable, NodeInspectSymbol } from 'effect/Inspectable';
import { type Pipeable, pipeArguments } from 'effect/Pipeable';
import { hasProperty, isNumber, isString } from 'effect/Predicate';

const TypeId: unique symbol = Symbol.for('platform-js/effect/IntegerRange');
/**
 * The type of the unique symbol that marks a value as an {@link IntegerRange}.
 *
 * @category symbols
 */
export type TypeId = typeof TypeId;

/**
 * An integer range, bounded inclusively of its minimum value, and either inclusively or exclusively of its maximum
 * value.
 *
 * @remarks
 *   Construction checks neither that the bounds are integers nor that `min <= max`: `[5, 1]`, `[1.5, 3]` and `[NaN, 3]`
 *   all build a range.
 * @category models
 */
export interface IntegerRange extends Equal.Equal, Pipeable, Inspectable {
  readonly [TypeId]: TypeId;
  readonly value: IntegerRangeValue;
}

/**
 * Describes the internal structure of an {@link IntegerRange}.
 *
 * @category models
 */
export type IntegerRangeValue =
  | { readonly _tag: 'Inclusive'; readonly min: number; readonly max: number }
  | { readonly _tag: 'Exclusive'; readonly min: number; readonly max: number };

/**
 * An input for constructing {@link IntegerRange} instances.
 *
 * @remarks
 *   The tuple form of {@link IntegerRangeInput}, when used with {@link from}, will create an {@link IntegerRange} that is
 *   _exclusive_ of `max` ( i.e., `min <= x < max`). When used with {@link inclusive} or {@link exclusive}, `max` will be
 *   _inclusive_ or _exclusive_ respectively.
 *
 *   The template string forms of {@link IntegerRangeInput} represent _inclusive_ or _exclusive_ ranges as follows:
 *
 *   - `'n..m'` will create a _exclusive_ range that contains all values `x` where `n <= x < m`, and
 *   - `'n..=m'` will create an _inclusive_ range that contains all values `x` where `n <= x <= m`.
 *
 *   The string forms are read by an unanchored pattern of unsigned digits: the first run of digits, `..` (or `..=`) and
 *   digits found is used, and anything around it is dropped: `'-1..5'` reads as `1..5`, `'1.5..3'` as `5..3`. An empty
 *   bound reads as `0`: `'..5'` is `0..5`.
 * @category models
 */
export type IntegerRangeInput =
  | IntegerRange
  | readonly [min: number, max: number]
  | `${number}..${number}` // Exclusive.
  | `${number}..=${number}`; // Inclusive.

/**
 * Provides equivalence for {@link IntegerRange} instances.
 *
 * @remarks
 *   For two {@link IntegerRange} instances to be considered equal, both their minimum and maximum values must be equal,
 *   and they should both have the same type of inclusion (i.e., inclusive or exclusive). This is not _range
 *   equivalence_ which determines if two {@link IntegerRange} instances represent the same sequence of values.
 * @category equivalence
 */
export const Equivalence: equivalence.Equivalence<IntegerRange> = equivalence.struct({
  value: equivalence.struct({
    _tag: equivalence.string,
    min: equivalence.number,
    max: equivalence.number,
  }),
});

/**
 * Determines if a value is an integer range.
 *
 * @category guards
 * @param u The value to check.
 * @returns `true` if `u` is an {@link IntegerRange}; `false` otherwise.
 */
export const isIntegerRange = (u: unknown): u is IntegerRange => hasProperty(u, TypeId);

/**
 * Determines if an integer range will be _inclusive_ of its maximum value.
 *
 * @category guards
 * @param self The {@link IntegerRange} to check.
 * @returns `true` if `self` is an inclusive {@link IntegerRange}; `false` otherwise.
 */
export const isInclusive = (self: IntegerRange): boolean => self.value._tag === 'Inclusive';

/**
 * Determines if an integer range will be _exclusive_ of its maximum value.
 *
 * @category guards
 * @param self The {@link IntegerRange} to check.
 * @returns `true` if `self` is an exclusive {@link IntegerRange}; `false` otherwise.
 */
export const isExclusive = (self: IntegerRange): boolean => self.value._tag === 'Exclusive';

/**
 * Determines if two integer ranges are equal.
 *
 * @remarks
 *   Call it data-first, `equals(self, that)`, or data-last, `equals(that)(self)`, for use in a `pipe`. Equality is that
 *   of {@link Equivalence}: the same bounds and the same inclusion.
 * @category predicates
 * @param self The first {@link IntegerRange}.
 * @param that The {@link IntegerRange} to compare with `self`.
 * @returns `true` if `self` and `that` have the same bounds and the same inclusion; `false` otherwise.
 */
export const equals: {
  (that: IntegerRange): (self: IntegerRange) => boolean;
  (self: IntegerRange, that: IntegerRange): boolean;
} = dual(2, (self: IntegerRange, that: IntegerRange): boolean => Equivalence(self, that));

/**
 * Determines if an integer range is inclusive of a value.
 *
 * @remarks
 *   Call it data-first, `contains(self, value)`, or data-last, `contains(value)(self)`, for use in a `pipe`.
 *
 *   An exclusive range contains `value` when `min <= value < max`. An inclusive range is checked as the exclusive range
 *   `min..(max + 1)`, so a non-integer `value` just above `max` counts as contained: `3.5` is in `1..=3`.
 * @category predicates
 * @param self The {@link IntegerRange} to check.
 * @param value The value to look for.
 * @returns `true` if `self` contains `value`; `false` otherwise.
 */
export const contains: {
  (value: number): (self: IntegerRange) => boolean;
  (self: IntegerRange, value: number): boolean;
} = dual(2, (self: IntegerRange, value: number): boolean => {
  if (isInclusive(self)) {
    return contains(from([self.value.min, self.value.max + 1]), value);
  }
  const { min, max } = self.value;
  return value >= min && value < max;
});

/**
 * Creates _inclusive_ integer ranges.
 *
 * @remarks
 *   A string cast past the parameter type is read as in {@link from}: its own `..` or `..=` decides the inclusion, so the
 *   result need not be _inclusive_.
 * @category constructors
 * @param range A tuple of the minimum and maximum values, or an {@link IntegerRange} to convert.
 * @returns An {@link IntegerRange} that is _inclusive_ of its maximum value: `range` itself if it already is one.
 * @throws `Error` if `range` is neither an {@link IntegerRange}, a tuple of two numbers, nor a string containing `..`.
 *   Only a value cast past the parameter type gets there.
 */
export const inclusive: {
  /**
   * @param range A tuple defining the minimum and maximum values of the integer range.
   * @returns An {@link IntegerRange} that is _inclusive_ of its maximum value.
   */
  (range: readonly [min: number, max: number]): IntegerRange;
  /**
   * Creates an _inclusive_ integer range that is equivalent to a source {@link IntegerRange} with regards to the values
   * that it can contain.
   *
   * @param range The {@link IntegerRange} to use as a basis for an _inclusive_ integer range .
   * @returns `range`, if `range` is already an _inclusive_ integer range; otherwise, a new {@link IntegerRange} that is
   *   an _inclusive_ version of `range`.
   */
  (range: IntegerRange): IntegerRange;
} = (range) => {
  if (isIntegerRange(range)) {
    return isInclusive(range)
      ? range // Already inclusive, return it.
      : make([range.value.min, range.value.max - 1], 'Inclusive');
  }
  return make(range, 'Inclusive');
};

/**
 * Creates _exclusive_ integer ranges.
 *
 * @remarks
 *   A string cast past the parameter type is read as in {@link from}: its own `..` or `..=` decides the inclusion, so the
 *   result need not be _exclusive_.
 * @category constructors
 * @param range A tuple of the minimum and maximum values, or an {@link IntegerRange} to convert.
 * @returns An {@link IntegerRange} that is _exclusive_ of its maximum value: `range` itself if it already is one.
 * @throws `Error` if `range` is neither an {@link IntegerRange}, a tuple of two numbers, nor a string containing `..`.
 *   Only a value cast past the parameter type gets there.
 */
export const exclusive: {
  /**
   * @param range A tuple defining the minimum and maximum values of the integer range.
   * @returns An {@link IntegerRange} that is _exclusive_ of its maximum value.
   */
  (range: readonly [min: number, max: number]): IntegerRange;
  /**
   * Creates an _exclusive_ integer range that is equivalent to a source {@link IntegerRange} with regards to the values
   * that it can contain.
   *
   * @param range The {@link IntegerRange} to use as a basis for an _exclusive_ integer range .
   * @returns `range`, if `range` is already an _exclusive_ integer range; otherwise, a new {@link IntegerRange} that is
   *   an _exclusive_ version of `range`.
   */
  (range: IntegerRange): IntegerRange;
} = (range) => {
  if (isIntegerRange(range)) {
    return isExclusive(range)
      ? range // Already exclusive, return it.
      : make([range.value.min, range.value.max + 1], 'Exclusive');
  }
  return make(range, 'Exclusive');
};

/**
 * Creates an integer range.
 *
 * @remarks
 *   The tuple form of {@link IntegerRangeInput}, will create an {@link IntegerRange} that is _exclusive_ of `max` ( i.e.,
 *   `min <= x < max`).
 * @category constructors
 * @param input The input to use when constructing the integer range.
 * @returns An {@link IntegerRange} derived from `input`.
 * @throws `Error` if `input` is a string with no `..` in it, or is neither an {@link IntegerRange}, a tuple of two
 *   numbers, nor a string. The parameter type admits only strings with `..`, so a string from outside the program
 *   (config, user input) is what reaches this.
 */
export const from: (input: IntegerRangeInput) => IntegerRange = (input) => make(input);

const RANGE_REGEXP = /(?<n>\d*)\.\.(?<inc>\=?)(?<x>\d*)/; // eslint-disable-line no-useless-escape
const DEFAULT_ARRAY_INPUT_MODE: IntegerRangeValue['_tag'] = 'Exclusive';

const IntegerRangeProto: Omit<IntegerRange, 'value'> = {
  [TypeId]: TypeId,
  [Hash.symbol](this: IntegerRange) {
    return Hash.cached(this, Hash.structure(this.value));
  },
  [Equal.symbol](this: IntegerRange, that: unknown) {
    return isIntegerRange(that) && equals(this, that);
  },
  toString(this: IntegerRange) {
    const { min, max, _tag } = this.value;
    const sep = _tag === 'Inclusive' ? '..=' : '..';
    return `${min}${sep}${max}`;
  },
  toJSON(this: IntegerRange) {
    return {
      _id: 'IntegerRange',
      ...this.value,
    };
  },
  [NodeInspectSymbol](this: IntegerRange) {
    return this.toJSON();
  },
  pipe() {
    return pipeArguments(this, arguments); // eslint-disable-line prefer-rest-params
  },
};

const make = (input: IntegerRangeInput, arrayInputMode?: IntegerRangeValue['_tag']): IntegerRange => {
  const self = Object.create(IntegerRangeProto);
  if (isIntegerRange(input)) {
    self.value = input.value;
  } else if (Array.isArray(input) && input.length === 2 && input.every(isNumber)) {
    const [min, max] = input;
    self.value = {
      _tag: arrayInputMode ?? DEFAULT_ARRAY_INPUT_MODE,
      min,
      max,
    };
  } else if (isString(input)) {
    const match = input.match(RANGE_REGEXP);
    if (!match || !match.groups) {
      throw new Error(`Invalid IntegerRange: ${input}`);
    }
    const { n, inc, x } = match.groups;
    const min = Number(n);
    const max = Number(x);
    if (!isNumber(min) || !isNumber(max)) {
      throw new TypeError(`Invalid IntegerRange: ${input}`);
    }
    self.value = {
      _tag: inc === '=' ? 'Inclusive' : 'Exclusive',
      min,
      max,
    };
  } else {
    throw new Error('Invalid IntegerRange');
  }
  return self;
};

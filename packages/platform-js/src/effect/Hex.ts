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

import type * as Brand from 'effect/Brand';
import type * as Either from 'effect/Either';
import { type Inspectable } from 'effect/Inspectable';

import type * as IntegerRange from './IntegerRange.ts';
import * as internal from './internal/hex.ts';
import type * as ParseError from './ParseError.ts';

/**
 * A hex-encoded string, of some arbitrary byte length, that may or may not have a `'0x'` prefix.
 *
 * @remarks
 *   `Hex` is a 'branded' string type defining a sequence of hexadecimal characters, and represented either as a
 *   {@link Hex.PrefixedHex | PrefixedHex} or {@link Hex.PlainHex | PlainHex} instance.
 *
 *   It is possible to create custom `Hex` constructors that represent hex-encoded strings with specific constraints (such
 *   as byte lengths), by invoking {@link ConstrainedPrefixedHex} or {@link ConstrainedPlainHex} with options described by
 *   {@link HexConstraints}.
 * @category models
 * @see {@link ConstrainedPrefixedHex}
 * @see {@link ConstrainedPlainHex}
 */
export type Hex = Hex.PlainHex | Hex.PrefixedHex;

export declare namespace Hex {
  /**
   * A hex-encoded string, of some arbitrary byte length, that has a `'0x'` prefix.
   *
   * @category models
   */
  export type PrefixedHex = Brand.Branded<string, 'PrefixedHex'>;

  /**
   * A plain hex-encoded string, of some arbitrary byte length.
   *
   * @category models
   */
  export type PlainHex = Brand.Branded<string, 'PlainHex'>;
}

/**
 * Creates a hex-encoded string, of some arbitrary byte length, that has a `'0x'` prefix.
 *
 * @remarks
 *   Called directly, the constructor throws on invalid input. `PrefixedHex.either` returns the errors in a `Left`
 *   instead, and `PrefixedHex.option` returns `None` when only absence matters.
 * @category constructors
 * @param source The string to brand.
 * @returns `source`, branded as a {@link Hex.PrefixedHex | PrefixedHex}.
 * @throws `Brand.BrandErrors` if `source` is not `0x` followed by one or more whole bytes of hex digits.
 */
export const PrefixedHex: Brand.Brand.Constructor<Hex.PrefixedHex> = internal.make<Hex.PrefixedHex>({
  requirePrefix: true,
});

/**
 * Creates a hex-encoded string, from some given constraints, that has a `'0x'` prefix.
 *
 * @remarks
 *   The returned constructor, called directly, throws `Brand.BrandErrors` on a string that is not prefixed hex or falls
 *   outside `constraints`; its `.either` and `.option` are the non-throwing forms.
 *
 *   `constraints.byteLength` is read on each call of the returned constructor, after the hex and prefix checks, not here.
 *   If {@link IntegerRange.from} cannot read it, a string that passes those checks makes the constructor, and its
 *   `.either`, `.option` and `.is`, throw an `Error`.
 * @category constructors
 * @param constraints The {@link HexConstraints} to apply when parsing a received hex-encoded string.
 * @returns A function that creates a {@link Hex.PrefixedHex | PrefixedHex} instance from a received string ensuring that
 *   it meets `constraints`.
 */
export const ConstrainedPrefixedHex: (constraints: HexConstraints) => Brand.Brand.Constructor<Hex.PrefixedHex> = (
  constraints,
) => internal.make<Hex.PrefixedHex>({ requirePrefix: true, ...constraints });

/**
 * Creates a plain hex-encoded string, of some arbitrary byte length.
 *
 * @remarks
 *   Called directly, the constructor throws on invalid input. `PlainHex.either` returns the errors in a `Left` instead,
 *   and `PlainHex.option` returns `None` when only absence matters.
 * @category constructors
 * @param source The string to brand.
 * @returns `source`, branded as a {@link Hex.PlainHex | PlainHex}.
 * @throws `Brand.BrandErrors` if `source` is not one or more whole bytes of hex digits with no `0x` prefix.
 */
export const PlainHex: Brand.Brand.Constructor<Hex.PlainHex> = internal.make<Hex.PlainHex>({ requirePrefix: false });

/**
 * Creates a plain hex-encoded string, from some given constraints.
 *
 * @remarks
 *   The returned constructor, called directly, throws `Brand.BrandErrors` on a string that is not plain hex or falls
 *   outside `constraints`; its `.either` and `.option` are the non-throwing forms.
 *
 *   `constraints.byteLength` is read on each call of the returned constructor, after the hex and prefix checks, not here.
 *   If {@link IntegerRange.from} cannot read it, a string that passes those checks makes the constructor, and its
 *   `.either`, `.option` and `.is`, throw an `Error`.
 * @category constructors
 * @param constraints The {@link HexConstraints} to apply when parsing a received hex-encoded string.
 * @returns A function that creates a {@link Hex.PlainHex | PlainHex} instance from a received string ensuring that it
 *   meets `constraints`.
 */
export const ConstrainedPlainHex: (constraints: HexConstraints) => Brand.Brand.Constructor<Hex.PlainHex> = (
  constraints,
) => internal.make<Hex.PlainHex>({ requirePrefix: false, ...constraints });

/**
 * Describes constraints for creating {@link Hex} constructors that parse hex-encoded strings.
 *
 * @category models
 * @see {@link Hex}
 */
export interface HexConstraints {
  /**
   * An {@link IntegerRange.IntegerRangeInput | IntegerRangeInput} describing the minimum and maximum number of bytes a
   * hex-encoded string should represent.
   */
  readonly byteLength?: IntegerRange.IntegerRangeInput;
}

/**
 * The result of parsing a hex-encoded string.
 *
 * @category models
 * @see {@link parseHex}
 */
export interface ParsedHexString extends Inspectable {
  /** A flag indicating if the hex-string has a `'0x'` prefix. */
  readonly hasPrefix: boolean;

  /** The captured sequence of _whole_ bytes found in the source string. */
  readonly byteChars: string;

  /** The remaining characters of incomplete bytes and/or the non hexadecimal characters found in the source string. */
  readonly incompleteChars: string;
}

/**
 * Parses a hex-encoded string.
 *
 * @category utilities
 * @param source The source string to parse.
 * @returns An `Either` with a `Right` value of {@link ParsedHexString} describing the parsed elements of `source`, or a
 *   `Left` value of {@link ParseError.ParseError | ParseError} if parsing fails.
 */
export const parseHex: (source: string) => Either.Either<ParsedHexString, ParseError.ParseError> = internal.parseHex;

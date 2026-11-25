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

import { Brand } from 'effect';
import * as Either from 'effect/Either';

import * as Hex_ from './Hex.ts';
import * as ParseError from './ParseError.ts';

/**
 * A user public key capable of receiving Zswap coins.
 *
 * @remarks
 *   `CoinPublicKey` is a 'branded' string type that represents a public key encoded either as a sequence of hexadecimal
 *   characters, or as a string formatted according to the Bech32m encoding scheme. Unchecked: any string can carry the
 *   `Bech32m` brand.
 * @category keys
 * @see {@link CoinPublicKey.Hex}
 * @see {@link CoinPublicKey.Bech32m}
 */
export type CoinPublicKey = CoinPublicKey.Bech32m | CoinPublicKey.Hex;

export declare namespace CoinPublicKey {
  /**
   * A user public key capable of receiving Zswap coins, formatted as plain hex (no `0x` prefix).
   *
   * @category keys
   */
  export type Hex = Brand.Branded<string, 'CoinPublicKeyHex'>;

  /**
   * A user public key capable of receiving Zswap coins, formatted as a string according to the Bech32m encoding scheme.
   *
   * @remarks
   *   Unchecked: any string can carry the `Bech32m` brand.
   * @category keys
   */
  export type Bech32m = Brand.Branded<string, 'CoinPublicKeyBech32m'>;
}

/**
 * Creates a coin public key from a plain hex-encoded source string ({@link Hex_.PlainHex | PlainHex}).
 *
 * @remarks
 *   Non-throwing forms: `CoinPublicKey.Hex.either` returns the errors in a `Left`; `CoinPublicKey.Hex.option` returns
 *   `None`, dropping the reason.
 * @category constructors
 * @param source The string to brand.
 * @returns `source`, branded as a {@link CoinPublicKey.Hex}.
 * @throws `Brand.BrandErrors` if `source` is not plain hex.
 */
export const Hex = Brand.all(Brand.nominal<CoinPublicKey.Hex>(), Hex_.PlainHex);

/**
 * Creates a coin public key from a source string formatted according to the Bech32m encoding scheme.
 *
 * @remarks
 *   A nominal brand: it accepts any string, hex and the empty string included, and never throws. Its `.either` and
 *   `.option` always succeed, and `.is` is always `true`.
 * @category constructors
 * @param source The string to brand.
 * @returns `source`, branded as a {@link CoinPublicKey.Bech32m}.
 */
export const Bech32m = Brand.nominal<CoinPublicKey.Bech32m>();

/**
 * Creates a hex-encoded coin public key from a given source.
 *
 * @category constructors
 * @param self A source string that should become a {@link CoinPublicKey.Hex}, or a {@link CoinPublicKey} that should
 *   become a {@link CoinPublicKey.Hex}.
 * @returns `self`, unchanged, when it is plain hex.
 * @throws `ParseError` if `self` is not plain hex: any other string is taken for Bech32m, and Bech32m-to-hex conversion
 *   is not yet supported.
 */
export const asHex: (self: CoinPublicKey | string) => CoinPublicKey.Hex = (self) => {
  if (Hex.is(self)) return self;
  if (Bech32m.is(self)) {
    throw ParseError.make('Conversion from Bech32m to Hex is not yet supported', self);
  }
  return Hex(self);
};

/**
 * Creates a Bech32m formatted coin public key from a given source.
 *
 * @remarks
 *   `Bech32m.is` is always `true`, so no input is converted or rejected.
 * @category constructors
 * @param self A source string that should become a {@link CoinPublicKey.Bech32m}, or a {@link CoinPublicKey} that should
 *   become a {@link CoinPublicKey.Bech32m}.
 * @returns `self`, unchanged and unchecked, typed as a {@link CoinPublicKey.Bech32m}, hex included.
 */
export const asBech32m: (self: CoinPublicKey | string) => CoinPublicKey.Bech32m = (self) => {
  if (Bech32m.is(self)) return self;
  if (Hex.is(self)) {
    throw ParseError.make('Conversion from Hex to Bech32m is not yet supported', self);
  }
  return Bech32m(self);
};

/**
 * Creates a buffer representing the raw bytes of a coin public key.
 *
 * @category constructors
 * @param self The {@link CoinPublicKey} for which raw bytes are required.
 * @returns A `Uint8Array` representing the raw bytes of `self`.
 * @throws `ParseError` if `self` is not plain hex, as for {@link asHex}: Bech32m keys are not yet supported.
 */
export const asBytes: (self: CoinPublicKey) => Uint8Array = (self) => Buffer.from(asHex(self), 'hex');

/**
 * Creates a coin public key from a source string.
 *
 * @remarks
 *   A `value` that does not parse as hex, the empty string included, becomes a {@link CoinPublicKey.Bech32m} without any
 *   check.
 * @category constructors
 * @param value The string value that is to become a {@link CoinPublicKey}.
 * @returns A {@link CoinPublicKey} that is an instance of {@link CoinPublicKey.Hex} if `value` could be parsed as a
 *   hex-encoded string; otherwise as an instance of {@link CoinPublicKey.Bech32m}.
 * @throws `Brand.BrandErrors` if `value` is `0x` followed by one or more whole bytes of hex digits: it parses as hex,
 *   but {@link Hex} accepts only plain hex. Other `0x` strings (`'0x'`, `'0xabc'`) become Bech32m.
 */
export const make: (value: string) => CoinPublicKey = (value) => {
  return Either.match(Hex_.parseHex(value), {
    onRight: (_) => Hex(value),
    onLeft: (_) => Bech32m(value),
  });
};

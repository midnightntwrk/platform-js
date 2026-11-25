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

import * as Hex from './Hex.ts';

/**
 * A plain hex-encoded contract address, 32 bytes in length.
 *
 * @category models
 */
export type ContractAddress = Brand.Branded<string, 'ContractAddress'>;

/**
 * Creates a contract address from a plain hex-encoded string, 32 bytes in length.
 *
 * @remarks
 *   Called directly, the constructor throws on invalid input. `ContractAddress.either` returns the errors in a `Left`
 *   instead, and `ContractAddress.option` returns `None` when only absence matters.
 *
 *   Brands are erased at runtime, and {@link DomainSeparator} shares this refinement, so `ContractAddress.is` accepts a
 *   domain separator too. The two stay apart at compile time only.
 * @category constructors
 * @param source The string to brand.
 * @returns `source`, branded as a {@link ContractAddress}.
 * @throws `Brand.BrandErrors` if `source` is not plain hex (no `0x` prefix) exactly 32 bytes in length.
 */
export const ContractAddress = Brand.all(
  Brand.nominal<ContractAddress>(),
  Hex.ConstrainedPlainHex({ byteLength: '32..=32' }),
);

/**
 * Creates a buffer representing the raw bytes of a contract address.
 *
 * @category constructors
 * @param self The {@link ContractAddress} for which raw bytes are required.
 * @returns A `Uint8Array` representing the raw bytes of `self`.
 */
export const asBytes: (self: ContractAddress) => Uint8Array = (self) => Buffer.from(self, 'hex');

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

import * as Equal from 'effect/Equal';
import * as equivalence from 'effect/Equivalence';
import { dual } from 'effect/Function';
import { type Inspectable, NodeInspectSymbol } from 'effect/Inspectable';
import { hasProperty } from 'effect/Predicate';

import * as NetworkIdMoniker from './NetworkIdMoniker.ts';

const MAINNET_MONIKER = NetworkIdMoniker.NetworkIdMoniker('main');

const TypeId: unique symbol = Symbol.for('platform-js/effect/NetworkId');
/**
 * The type of the unique symbol that marks a value as a {@link NetworkId}.
 *
 * @category symbols
 */
export type TypeId = typeof TypeId;

const MonikerSymbol: unique symbol = Symbol.for('platform-js/effect/NetworkId#NetworkMoniker');

/**
 * Represents a Midnight network identifier.
 *
 * @remarks
 *   A {@link NetworkId} can be constructed by calling {@link make} with a valid
 *   {@link NetworkIdMoniker.NetworkIdMoniker | NetworkIdMoniker} identifying the network. Alternatively, in order to use
 *   the Midnight MainNet, use the exported instance {@link MainNet}.
 *
 *   {@link make} keeps the moniker it is given, so `make('main')` is not {@link MainNet}: it is not equal to it, and its
 *   `isMainNet()` is `false`.
 *
 *   Compare network identifiers with {@link equals}. `Equal.equals` returns `false` for two separately made identifiers
 *   with the same moniker, because a `NetworkId` has no hash, and so it does not work as a `HashSet` or `HashMap` key.
 * @category models
 * @see {@link NetworkIdInput}
 * @see {@link make}
 */
export interface NetworkId extends Equal.Equal, Inspectable {
  readonly [TypeId]: TypeId;
  readonly [MonikerSymbol]: NetworkIdMoniker.NetworkIdMoniker | true;
  /**
   * Determines if the network identifier represents the Midnight MainNet.
   *
   * @returns `true` for {@link MainNet} and network identifiers made from it; `false` otherwise, `make('main')`
   *   included.
   */
  readonly isMainNet: () => boolean;
}

/**
 * An input for constructing {@link NetworkId} instances.
 *
 * @category models
 * @see {@link make}
 */
export type NetworkIdInput = NetworkIdMoniker.NetworkIdMoniker | NetworkId;

/**
 * Provides equivalence for {@link NetworkId} instances.
 *
 * @remarks
 *   For two {@link NetworkId} instances to be considered equal, their underlying monikers must be equal. {@link MainNet}
 *   holds an internal moniker of its own, not `'main'`, so it equals only itself and identifiers made from it.
 * @category equivalence
 */
export const Equivalence: equivalence.Equivalence<NetworkId> = equivalence.mapInput(
  (a, b) => Equal.equals(a, b),
  (_) => _[MonikerSymbol],
);

/**
 * Determines if a value is a network identifier.
 *
 * @category guards
 * @param u The value to check.
 * @returns `true` if `u` is a {@link NetworkId}; `false` otherwise.
 */
export const isNetworkId = (u: unknown): u is NetworkId => hasProperty(u, TypeId);

/**
 * Determines if two network identifiers are equal.
 *
 * @remarks
 *   Call it data-first, `equals(self, that)`, or data-last, `equals(that)(self)`, for use in a `pipe`. Equality is that
 *   of {@link Equivalence}: the same moniker.
 * @category predicates
 * @param self The first {@link NetworkId}.
 * @param that The {@link NetworkId} to compare with `self`.
 * @returns `true` if `self` and `that` have the same moniker; `false` otherwise.
 */
export const equals: {
  (that: NetworkId): (self: NetworkId) => boolean;
  (self: NetworkId, that: NetworkId): boolean;
} = dual(2, (self: NetworkId, that: NetworkId): boolean => Equivalence(self, that));

const NetworkIdProto = (networkMoniker: string | true) => ({
  [TypeId]: TypeId,
  [Equal.symbol](this: NetworkId, that: unknown) {
    return isNetworkId(that) && equals(this, that);
  },
  toString(this: NetworkId) {
    return this[MonikerSymbol] === true ? MAINNET_MONIKER : this[MonikerSymbol];
  },
  toJSON(this: NetworkId) {
    return {
      _id: 'NetworkId',
      moniker: this.toString(),
    };
  },
  [NodeInspectSymbol](this: NetworkId) {
    return this.toJSON();
  },
  [MonikerSymbol]: networkMoniker,
  isMainNet(this: NetworkId): boolean {
    return this[MonikerSymbol] === true;
  },
});

/**
 * A network identifier that represents the Midnight MainNet.
 *
 * @category constructors
 */
export const MainNet: NetworkId = Object.create(NetworkIdProto(true));

/**
 * Creates a network identifier.
 *
 * @category constructors
 * @param input The input to use when constructing the network identifier.
 * @returns A {@link NetworkId} derived from `input`.
 */
export const make: (input: NetworkIdInput) => NetworkId = (input) =>
  Object.create(NetworkIdProto(isNetworkId(input) ? input[MonikerSymbol] : input));

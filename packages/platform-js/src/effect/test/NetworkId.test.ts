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
import * as fc from 'effect/FastCheck';
import { NodeInspectSymbol } from 'effect/Inspectable';

import * as NetworkId from '../NetworkId.ts';
import * as NetworkIdMoniker from '../NetworkIdMoniker.ts';
import * as Arbitrary from './Arbitrary.ts';

const monikerArbitrary = Arbitrary.makeNetworkIdArbitrary().map(NetworkIdMoniker.NetworkIdMoniker);

describe('NetworkId', () => {
  describe('isMainNet', () => {
    it('should return true for MainNet', () => {
      expect(NetworkId.MainNet.isMainNet()).toBe(true);
    });

    it('should return true for an identifier made from MainNet', () => {
      expect(NetworkId.make(NetworkId.MainNet).isMainNet()).toBe(true);
    });

    it('should return false for any named network identifier', () =>
      fc.assert(
        fc.property(Arbitrary.makeNetworkIdArbitrary(), (networkId) => {
          expect(NetworkId.make(NetworkIdMoniker.NetworkIdMoniker(networkId)).isMainNet()).toBe(false);
        }),
      ));
  });

  describe('make', () => {
    it('should keep the moniker of an existing network identifier', () =>
      fc.assert(
        fc.property(monikerArbitrary, (moniker) => {
          const source = NetworkId.make(moniker);
          const copy = NetworkId.make(source);

          expect(NetworkId.equals(copy, source)).toBe(true);
          expect(copy.toString()).toBe(moniker);
        }),
      ));

    it('should make an identifier equal to MainNet from MainNet', () => {
      expect(NetworkId.equals(NetworkId.make(NetworkId.MainNet), NetworkId.MainNet)).toBe(true);
    });
  });

  describe('isNetworkId', () => {
    it('should return true for network identifiers', () => {
      expect(NetworkId.isNetworkId(NetworkId.MainNet)).toBe(true);
      expect(NetworkId.isNetworkId(NetworkId.make(NetworkIdMoniker.NetworkIdMoniker('hosky-dev01')))).toBe(true);
    });

    it.each([['hosky-dev01'], [{ moniker: 'hosky-dev01' }], [null], [undefined]])(
      'should return false for %o',
      (value) => {
        expect(NetworkId.isNetworkId(value)).toBe(false);
      },
    );
  });

  describe('equals', () => {
    it('should return true for two network identifiers equal by name', () => {
      const a = NetworkId.make(NetworkIdMoniker.NetworkIdMoniker('hosky-dev01'));
      const b = NetworkId.make(NetworkIdMoniker.NetworkIdMoniker('hosky-dev01'));

      expect(NetworkId.equals(a, b)).toBe(true);
    });

    it('should return false for two network identifiers that differ by name', () => {
      const a = NetworkId.make(NetworkIdMoniker.NetworkIdMoniker('hosky-dev01'));
      const b = NetworkId.make(NetworkIdMoniker.NetworkIdMoniker('hosky-dev02'));

      expect(NetworkId.equals(a, b)).toBe(false);
    });

    it('should return false for MainNet and any named network identifier', () =>
      fc.assert(
        fc.property(monikerArbitrary, (moniker) => {
          expect(NetworkId.equals(NetworkId.MainNet, NetworkId.make(moniker))).toBe(false);
        }),
      ));

    it('should compare data-last', () => {
      const a = NetworkId.make(NetworkIdMoniker.NetworkIdMoniker('hosky-dev01'));

      expect(NetworkId.equals(NetworkId.make(NetworkIdMoniker.NetworkIdMoniker('hosky-dev01')))(a)).toBe(true);
      expect(NetworkId.equals(NetworkId.MainNet)(a)).toBe(false);
    });

    it('should agree with Equivalence', () =>
      fc.assert(
        fc.property(monikerArbitrary, monikerArbitrary, (first, second) => {
          const a = NetworkId.make(first);
          const b = NetworkId.make(second);

          expect(NetworkId.Equivalence(a, b)).toBe(first === second);
          expect(NetworkId.equals(a, b)).toBe(first === second);
        }),
      ));
  });

  describe('printing', () => {
    it('should print as its moniker', () =>
      fc.assert(
        fc.property(monikerArbitrary, (moniker) => {
          expect(NetworkId.make(moniker).toString()).toBe(moniker);
        }),
      ));

    it('should print MainNet as main', () => {
      expect(NetworkId.MainNet.toString()).toBe('main');
    });

    it('should serialise and inspect as its moniker', () => {
      const networkId = NetworkId.make(NetworkIdMoniker.NetworkIdMoniker('hosky-dev01'));
      const json = { _id: 'NetworkId', moniker: 'hosky-dev01' };

      expect(networkId.toJSON()).toEqual(json);
      expect(networkId[NodeInspectSymbol]()).toEqual(json);
      expect(NetworkId.MainNet.toJSON()).toEqual({ _id: 'NetworkId', moniker: 'main' });
    });
  });
});

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

import { afterEach, beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as ConfigError from 'effect/ConfigError';
import * as ConfigProvider from 'effect/ConfigProvider';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Configuration from '../Configuration.ts';
import * as NetworkId from '../NetworkId.ts';
import * as NetworkIdMoniker from '../NetworkIdMoniker.ts';

const COIN_PUBLIC = '0102';
// A valid signing key value is plain hex, 32 to 35 bytes in length.
const SIGNING = 'a1'.repeat(32);

const fromJson = (json: unknown) => Effect.withConfigProvider(ConfigProvider.fromJson(json));

const readKeys = (json: unknown) => Configuration.Keys.pipe(Effect.provide(Configuration.layer), fromJson(json));

const readNetwork = (json: unknown) => Configuration.Network.pipe(Effect.provide(Configuration.layer), fromJson(json));

describe('Configuration', () => {
  describe('Keys', () => {
    it.effect('reads the configured coin public key', () =>
      Effect.gen(function* () {
        const keys = yield* readKeys({ keys: { coinPublic: COIN_PUBLIC } });
        expect(keys.coinPublicKey).toBe(COIN_PUBLIC);
      }),
    );

    it.effect('assembles a signing key using the configured signing kind', () =>
      Effect.gen(function* () {
        const keys = yield* readKeys({ keys: { coinPublic: COIN_PUBLIC, signing: SIGNING, signingKind: 'ecdsa' } });
        expect(keys.getSigningKey()).toEqual(Option.some({ tag: 'ecdsa', value: SIGNING }));
      }),
    );

    it.effect('defaults the signing kind to schnorr when it is absent', () =>
      Effect.gen(function* () {
        const keys = yield* readKeys({ keys: { coinPublic: COIN_PUBLIC, signing: SIGNING } });
        expect(keys.getSigningKey()).toEqual(Option.some({ tag: 'schnorr', value: SIGNING }));
      }),
    );

    it.effect('returns None when no signing key is configured', () =>
      Effect.gen(function* () {
        const keys = yield* readKeys({ keys: { coinPublic: COIN_PUBLIC } });
        expect(keys.getSigningKey()).toEqual(Option.none());
      }),
    );

    it.effect('fails with a ConfigError for an unrecognized signing kind', () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(
          readKeys({ keys: { coinPublic: COIN_PUBLIC, signing: SIGNING, signingKind: 'rsa' } }),
        );
        expect(ConfigError.isConfigError(error)).toBe(true);
        expect(error).toMatchObject({ _op: 'InvalidData', path: ['keys', 'signingKind'] });
        expect(error.message).toContain('Expected "schnorr", actual "rsa"');
        expect(error.message).toContain('Expected "ecdsa", actual "rsa"');
      }),
    );

    it.effect('fails with a ConfigError when the coin public key is missing', () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(readKeys({ keys: { signing: SIGNING } }));
        expect(ConfigError.isConfigError(error)).toBe(true);
        expect(error).toMatchObject({ _op: 'MissingData', path: ['keys', 'coinPublic'] });
        expect(error.message).toMatch(/coinPublic to exist/);
      }),
    );

    it.effect('fails with a ConfigError for a signing key that is not a valid key value', () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(readKeys({ keys: { coinPublic: COIN_PUBLIC, signing: 'a1'.repeat(10) } }));
        expect(ConfigError.isConfigError(error)).toBe(true);
        expect(error).toMatchObject({ _op: 'InvalidData', path: ['keys', 'signing'] });
        expect(error.message).toContain(
          `Source string '${'a1'.repeat(10)}' has a byte length of 10, but expected 32..=35`,
        );
      }),
    );
  });

  describe('Network', () => {
    it.effect('reads the configured network', () =>
      Effect.gen(function* () {
        const network = yield* readNetwork({ keys: { coinPublic: COIN_PUBLIC }, network: 'testnet' });
        expect(network.isMainNet()).toBe(false);
        expect(NetworkId.equals(network, NetworkId.make(NetworkIdMoniker.NetworkIdMoniker('testnet')))).toBe(true);
      }),
    );

    it.effect('defaults to MainNet when no network is configured', () =>
      Effect.gen(function* () {
        const network = yield* readNetwork({ keys: { coinPublic: COIN_PUBLIC } });
        expect(network.isMainNet()).toBe(true);
        expect(NetworkId.equals(network, NetworkId.MainNet)).toBe(true);
      }),
    );

    it.effect('fails with a ConfigError for an invalid network moniker', () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(readNetwork({ keys: { coinPublic: COIN_PUBLIC }, network: 'hosky!dev' }));
        expect(ConfigError.isConfigError(error)).toBe(true);
        expect(error).toMatchObject({ _op: 'InvalidData', path: ['network'] });
        expect(error.message).toContain("Source string 'hosky!dev' is not a valid network identifier");
      }),
    );
  });

  describe('configProvider', () => {
    // configProvider reads the real environment, so every variable it could read is cleared first and restored after.
    beforeEach(() => {
      ['NETWORK', 'KEYS_COIN_PUBLIC', 'KEYS_SIGNING', 'KEYS_SIGNING_KIND'].forEach((name) =>
        vi.stubEnv(name, undefined),
      );
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    const readKeysFromEnvAndJson = (json: unknown) =>
      Configuration.Keys.pipe(
        Effect.provide(Configuration.layer),
        Effect.withConfigProvider(Configuration.configProvider(json)),
      );

    it.effect('reads values from the JSON when no environment variable is set', () =>
      Effect.gen(function* () {
        const keys = yield* readKeysFromEnvAndJson({ keys: { coinPublic: COIN_PUBLIC, signing: SIGNING } });
        expect(keys.coinPublicKey).toBe(COIN_PUBLIC);
        expect(keys.getSigningKey()).toEqual(Option.some({ tag: 'schnorr', value: SIGNING }));
      }),
    );

    it.effect('lets a constant-case environment variable override the JSON value at the same path', () =>
      Effect.gen(function* () {
        vi.stubEnv('KEYS_COIN_PUBLIC', 'abcd');
        vi.stubEnv('KEYS_SIGNING_KIND', 'ecdsa');
        const keys = yield* readKeysFromEnvAndJson({
          keys: { coinPublic: COIN_PUBLIC, signing: SIGNING, signingKind: 'schnorr' },
        });
        expect(keys.coinPublicKey).toBe('abcd');
        expect(keys.getSigningKey()).toEqual(Option.some({ tag: 'ecdsa', value: SIGNING }));
      }),
    );

    it.effect('reads a top-level key from its bare environment name', () =>
      Effect.gen(function* () {
        vi.stubEnv('NETWORK', 'hosky-dev01');
        const network = yield* Configuration.Network.pipe(
          Effect.provide(Configuration.layer),
          Effect.withConfigProvider(
            Configuration.configProvider({ keys: { coinPublic: COIN_PUBLIC }, network: 'testnet' }),
          ),
        );
        expect(network.toString()).toBe('hosky-dev01');
      }),
    );
  });

  describe('service keys', () => {
    it('keys the Keys and Network services under @midnightntwrk/platform-js', () => {
      expect(Configuration.Keys.key).toBe('@midnightntwrk/platform-js/Configuration#Keys');
      expect(Configuration.Network.key).toBe('@midnightntwrk/platform-js/Configuration#Network');
    });
  });
});

/*
 * This file is part of platform-js.
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
import { NodeInspectSymbol } from 'effect/Inspectable';

import * as ParseError from '../ParseError.ts';

const meta = {
  toJSON: () => ({ step: 'parse' }),
  [NodeInspectSymbol]: () => ({ step: 'parse' }),
};

describe('ParseError', () => {
  describe('make', () => {
    it('should keep the message and source', () => {
      const error = ParseError.make('Not hex', 'zz');

      expect(error.message).toBe('Not hex');
      expect(error.source).toBe('zz');
      expect(error.meta).toBeUndefined();
      expect(error.cause).toBeUndefined();
    });

    it('should keep the meta and cause when given', () => {
      const cause = new Error('underlying');
      const error = ParseError.make('Not hex', 'zz', meta, cause);

      expect(error.meta).toBe(meta);
      expect(error.cause).toBe(cause);
    });

    it('should make an Error tagged ParseError', () => {
      const error = ParseError.make('Not hex', 'zz');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ParseError.ParseError);
      expect(error._tag).toBe('ParseError');
    });
  });

  describe('isParseError', () => {
    it('should return true for a parse error', () => {
      expect(ParseError.isParseError(ParseError.make('Not hex', 'zz'))).toBe(true);
      expect(ParseError.isParseError(new ParseError.ParseError({ message: 'Not hex', source: 'zz' }))).toBe(true);
    });

    it.each([
      [new Error('Not hex')],
      [{ _tag: 'ParseError', message: 'Not hex', source: 'zz' }],
      ['Not hex'],
      [null],
      [undefined],
    ])('should return false for %o', (value) => {
      expect(ParseError.isParseError(value)).toBe(false);
    });
  });
});

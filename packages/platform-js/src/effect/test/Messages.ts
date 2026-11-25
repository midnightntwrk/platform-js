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

// The brand error messages every hex-based brand reports, shared so each test asserts the exact text.

/** The message for a `0x`-prefixed source given to a brand that forbids the prefix. */
export const prefixNotAllowed = (source: string) =>
  `Source string '${source}' has a '0x' prefix but prefixes are not allowed`;

/** The message for an unprefixed source given to a brand that requires the `0x` prefix. */
export const prefixRequired = (source: string) => `Source string '${source}' requires a '0x' prefix`;

/** The message for a source whose byte length falls outside the brand's range. */
export const byteLengthOutOfRange = (source: string, byteLength: number, expected: string) =>
  `Source string '${source}' has a byte length of ${byteLength}, but expected ${expected}`;

/*******************************************************************************
 *  (c) 2018 - 2024 Zondax AG
 *  (c) 2016-2017 Ledger
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *******************************************************************************/
import BaseApp from './app'

export default BaseApp

/**
 * @deprecated Prefer {@link LedgerTransport}.
 *
 * This used to re-export `Transport` from `@ledgerhq/hw-transport`, which Ledger deprecated
 * ahead of the September 2026 Device Management Kit cutoff. Carrying that re-export forced
 * the deprecated package into the dependency tree of every SDK built on this one, so the
 * name is now an alias for the structural type this package actually requires.
 *
 * A hw-transport `Transport` still satisfies it, so annotations keep compiling. The one
 * behaviour change: the alias describes `send` only, so reaching for a hw-transport-specific
 * member (`close`, `exchange`, `on`) through this type no longer typechecks -- import
 * `Transport` from `@ledgerhq/hw-transport` directly if you need those.
 */
export type { LedgerTransport as Transport } from './types'
export * from './common'
export * from './consts'
export * from './types'
export * from './bip32'
export * from './responseError'
export * from './payload'
export * from './transports/dmk'

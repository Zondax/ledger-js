/******************************************************************************
 *  (c) 2018 - 2024 Zondax AG
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
 *****************************************************************************/
import { LedgerCustomError } from './consts'

/**
 * Represents the version response from a device.
 */
export type ResponseVersion = {
  testMode?: boolean
  major?: number
  minor?: number
  patch?: number
  deviceLocked?: boolean
  targetId?: string
}

/**
 * Represents the application information response from a device.
 */
export type ResponseAppInfo = {
  appName?: string
  appVersion?: string
  flagLen?: number
  flagsValue?: number
  flagRecovery?: boolean
  flagSignedMcuCode?: boolean
  flagOnboarded?: boolean
  flagPINValidated?: boolean
}

/**
 * Represents the device information response.
 */
export type ResponseDeviceInfo = {
  targetId?: string
  seVersion?: string
  flag?: string
  mcuVersion?: string
}

/**
 * Interface for generic instruction set.
 */
export interface INSGeneric {
  GET_VERSION: 0x00
  [k: string]: number
}

/**
 * Interface for generic P1 values.
 */
export interface P1_VALUESGeneric {
  ONLY_RETRIEVE: number
  SHOW_ADDRESS_IN_DEVICE: number
  [k: string]: number
}

/**
 * Parameters for the constructor.
 */
export interface ConstructorParams {
  cla: number
  ins: INSGeneric
  p1Values: P1_VALUESGeneric
  chunkSize: number
  acceptedPathLengths?: number[]
  customAppErrorDescription?: Readonly<Record<LedgerCustomError, string>>
}

export type BIP32Path = string

/**
 * The transport surface this package needs in order to talk to a device.
 *
 * Deliberately structural rather than a nominal dependency on `Transport` from
 * `@ledgerhq/hw-transport`: `BaseApp` only ever calls `send`, so describing that one method
 * lets an app accept either a legacy `Transport` or a {@link DMKTransport} built on the
 * Device Management Kit. A `Transport` instance satisfies this interface as-is, so this is a
 * widening — existing callers are unaffected.
 */
export interface LedgerTransport {
  send: (
    cla: number,
    ins: number,
    p1: number,
    p2: number,
    data?: Buffer,
    statusList?: number[],
    options?: { abortTimeoutMs?: number }
  ) => Promise<Buffer>
}

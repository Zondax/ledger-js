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
}

export type BIP32Path = string

/******************************************************************************
 *  (c) 2018 - 2022 Zondax AG
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
import type Transport from '@ledgerhq/hw-transport'

import { errorCodeToString, processErrorResponse } from './common'
import { LedgerError } from './consts'
import {
  type ConstructorParams,
  type INSGeneric,
  type P1_VALUESGeneric,
  type ResponseAppInfo,
  type ResponseDeviceInfo,
  type ResponseVersion,
} from './types'

export default class BaseApp {
  readonly transport: Transport
  readonly CLA: number
  readonly INS: INSGeneric
  readonly P1_VALUES: P1_VALUESGeneric
  readonly acceptedPathLengths?: number[]
  readonly CHUNK_SIZE: number

  constructor(transport: Transport, params: ConstructorParams) {
    this.transport = transport
    this.CLA = params.cla
    this.INS = params.ins
    this.P1_VALUES = params.p1Values
    this.CHUNK_SIZE = params.chunkSize
    this.acceptedPathLengths = params.acceptedPathLengths
  }

  /**
   * Serializes a derivation path into a buffer.
   * @param path - The derivation path in string format.
   * @returns A buffer representing the serialized path.
   * @throws {Error} If the path format is incorrect or invalid.
   */
  serializePath(path: string): Buffer {
    const HARDENED = 0x80000000

    if (!path.startsWith('m/')) {
      throw new Error('Path should start with "m/" (e.g "m/44\'/5757\'/5\'/0/3")')
    }

    const pathArray = path.split('/')
    pathArray.shift() // remove "m"

    if (this.acceptedPathLengths && !this.acceptedPathLengths.includes(pathArray.length)) {
      throw new Error("Invalid path. (e.g \"m/44'/5757'/5'/0/3\")")
    }

    const buf = Buffer.alloc(4 * pathArray.length)

    pathArray.forEach((child, i) => {
      let value = 0
      if (child.endsWith("'")) {
        value += HARDENED
        child = child.slice(0, -1)
      }
      const numChild = Number(child)

      if (Number.isNaN(numChild)) {
        throw new Error(`Invalid path : ${child} is not a number. (e.g "m/44'/461'/5'/0/3")`)
      }
      if (numChild >= HARDENED) {
        throw new Error('Incorrect child value (bigger or equal to 0x80000000)')
      }

      value += numChild
      buf.writeUInt32LE(value, 4 * i)
    })

    return buf
  }

  /**
   * Prepares chunks of data to be sent to the device.
   * @param path - The derivation path.
   * @param message - The message to be sent.
   * @returns An array of buffers ready to be sent.
   */
  prepareChunks(path: string, message: Buffer): Buffer[] {
    const chunks = []
    const serializedPathBuffer = this.serializePath(path)

    // First chunk (only path)
    chunks.push(serializedPathBuffer)

    const messageBuffer = Buffer.from(message)

    for (let i = 0; i < messageBuffer.length; i += this.CHUNK_SIZE) {
      const end = Math.min(i + this.CHUNK_SIZE, messageBuffer.length)
      chunks.push(messageBuffer.subarray(i, end))
    }

    return chunks
  }

  /**
   * Retrieves the version information from the device.
   * @returns A promise that resolves to the version information.
   */
  async getVersion(): Promise<ResponseVersion> {
    const versionResponse: ResponseVersion = await this.transport.send(this.CLA, this.INS.GET_VERSION, 0, 0).then((res: Buffer) => {
      const errorCodeData = res.subarray(-2)
      const returnCode = errorCodeData[0] * 256 + errorCodeData[1]

      let targetId = 0;

      if (res.length >= 9) {
        targetId = res.readUInt32BE(5);
      }

      return {
        returnCode,
        errorMessage: errorCodeToString(returnCode),
        testMode: res[0] !== 0,
        major: res[1],
        minor: res[2],
        patch: res[3],
        deviceLocked: res[4] === 1,
        targetId: targetId.toString(16),
      }
    }, processErrorResponse)
    return versionResponse
  }

  /**
   * Retrieves application information from the device.
   * @returns A promise that resolves to the application information.
   */
  async appInfo(): Promise<ResponseAppInfo> {
    const response: ResponseAppInfo = await this.transport.send(0xb0, 0x01, 0, 0).then((response: Buffer) => {
      const errorCodeData = response.subarray(response.length - 2)
      const returnCode: number = errorCodeData[0] * 256 + errorCodeData[1]

      if (response[0] !== 1) {
        // Ledger responds with format ID 1. There is no spec for any format != 1
        return {
          returnCode: 0x9001,
          errorMessage: 'Format ID not recognized',
        }
      }
      const appNameLen = response[1]
      const appName = response.subarray(2, 2 + appNameLen).toString('ascii')
      let idx = 2 + appNameLen
      const appVersionLen = response[idx]
      idx += 1
      const appVersion = response.subarray(idx, idx + appVersionLen).toString('ascii')
      idx += appVersionLen
      const flagLen = response[idx]
      idx += 1
      const flagsValue = response[idx]
      return {
        returnCode,
        errorMessage: errorCodeToString(returnCode),
        appName,
        appVersion,
        flagLen,
        flagsValue,
        flagRecovery: (flagsValue & 1) !== 0,
        flagSignedMcuCode: (flagsValue & 2) !== 0,
        flagOnboarded: (flagsValue & 4) !== 0,
        flagPINValidated: (flagsValue & 128) !== 0,
      }
    }, processErrorResponse)
    return response
  }

  /**
   * Retrieves device information from the device.
   * @returns A promise that resolves to the device information.
   */
  async deviceInfo(): Promise<ResponseDeviceInfo> {
    const response: ResponseDeviceInfo = await this.transport
      .send(0xe0, 0x01, 0, 0, Buffer.from([]), [LedgerError.NoErrors, 0x6e00])
      .then((response: Buffer) => {
        const errorCodeData = response.subarray(-2)
        const returnCode = errorCodeData[0] * 256 + errorCodeData[1]

        if (returnCode === 0x6e00) {
          const res: ResponseDeviceInfo = {
            returnCode,
            errorMessage: 'This command is only available in the Dashboard',
          }
          return res
        }

        const targetId = response.subarray(0, 4).toString('hex')

        let pos = 4
        const secureElementVersionLen = response[pos]
        pos += 1
        const seVersion = response.subarray(pos, pos + secureElementVersionLen).toString()
        pos += secureElementVersionLen

        const flagsLen = response[pos]
        pos += 1
        const flag = response.subarray(pos, pos + flagsLen).toString('hex')
        pos += flagsLen

        const mcuVersionLen = response[pos]
        pos += 1
        // Patch issue in mcu version
        let tmp = response.subarray(pos, pos + mcuVersionLen)
        if (tmp[mcuVersionLen - 1] === 0) {
          tmp = response.subarray(pos, pos + mcuVersionLen - 1)
        }
        const mcuVersion = tmp.toString()

        return {
          returnCode,
          errorMessage: errorCodeToString(returnCode),
          targetId,
          seVersion,
          flag,
          mcuVersion,
        }
      }, processErrorResponse)
    return response
  }
}

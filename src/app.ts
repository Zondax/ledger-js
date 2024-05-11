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

import { processErrorResponse, processResponse } from './common'
import { HARDENED, LEDGER_DASHBOARD_CLA, LedgerError, PAYLOAD_TYPE } from './consts'
import {
  type ConstructorParams,
  type INSGeneric,
  type P1_VALUESGeneric,
  type ResponseAppInfo,
  type ResponseDeviceInfo,
  ResponseError,
  type ResponseVersion,
} from './types'

export default class BaseApp {
  readonly transport: Transport
  readonly CLA: number
  readonly INS: INSGeneric
  readonly P1_VALUES: P1_VALUESGeneric
  readonly ACCEPTED_PATH_LENGTHS?: number[]
  readonly CHUNK_SIZE: number

  constructor(transport: Transport, params: ConstructorParams) {
    this.transport = transport
    this.CLA = params.cla
    this.INS = params.ins
    this.P1_VALUES = params.p1Values
    this.CHUNK_SIZE = params.chunkSize
    this.ACCEPTED_PATH_LENGTHS = params.acceptedPathLengths
  }

  /**
   * Serializes a derivation path into a buffer.
   * @param path - The derivation path in string format.
   * @returns A buffer representing the serialized path.
   * @throws {Error} If the path format is incorrect or invalid.
   */
  serializePath(path: string): Buffer {
    if (typeof path !== 'string') {
      throw new Error("Path should be a string (e.g \"m/44'/461'/5'/0/3\")")
    }

    if (!path.startsWith('m/')) {
      throw new Error('Path should start with "m/" (e.g "m/44\'/5757\'/5\'/0/3")')
    }

    const pathArray = path.split('/')
    pathArray.shift() // remove "m"

    if (this.ACCEPTED_PATH_LENGTHS && !this.ACCEPTED_PATH_LENGTHS.includes(pathArray.length)) {
      throw new Error("Invalid path. (e.g \"m/44'/5757'/5'/0/3\")")
    }

    const buf = Buffer.alloc(4 * pathArray.length)

    pathArray.forEach((child: string, i: number) => {
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
   * Sends a chunk of data to the device and handles the response.
   * This method determines the payload type based on the chunk index and sends the chunk to the device.
   * It then processes the response from the device.
   *
   * @param ins - The instruction byte.
   * @param chunkIdx - The current chunk index.
   * @param chunkNum - The total number of chunks.
   * @param chunk - The chunk data as a buffer.
   * @returns A promise that resolves to the processed response from the device.
   * @throws {ResponseError} If the response from the device indicates an error.
   */
  async signSendChunk(ins: number, chunkIdx: number, chunkNum: number, chunk: Buffer): Promise<Buffer> {
    let payloadType = PAYLOAD_TYPE.ADD

    if (chunkIdx === 1) {
      payloadType = PAYLOAD_TYPE.INIT
    }

    if (chunkIdx === chunkNum) {
      payloadType = PAYLOAD_TYPE.LAST
    }

    const statusList = [LedgerError.NoErrors, LedgerError.DataIsInvalid, LedgerError.BadKeyHandle]

    const responseBuffer = await this.transport.send(this.CLA, ins, payloadType, 0, chunk, statusList)
    const response = processResponse(responseBuffer)

    return response
  }
  /**
   * Retrieves the version information from the device.
   * @returns A promise that resolves to the version information.
   * @throws {ResponseError} If the response from the device indicates an error.
   */
  async getVersion(): Promise<ResponseVersion> {
    try {
      const responseBuffer = await this.transport.send(this.CLA, this.INS.GET_VERSION, 0, 0)
      const response = processResponse(responseBuffer)

      let targetId = 0

      if (response.length >= 9) {
        targetId = response.readUInt32BE(5)
      }

      // FIXME: Add support for devices with multibyte version numbers

      return {
        testMode: response[0] !== 0,
        major: response[1],
        minor: response[2],
        patch: response[3],
        deviceLocked: response[4] === 1,
        targetId: targetId.toString(16),
      }
    } catch (error) {
      throw processErrorResponse(error)
    }
  }

  /**
   * Retrieves application information from the device.
   * @returns A promise that resolves to the application information.
   * @throws {ResponseError} If the response from the device indicates an error.
   */
  async appInfo(): Promise<ResponseAppInfo> {
    try {
      const responseBuffer = await this.transport.send(LEDGER_DASHBOARD_CLA, 0x01, 0, 0)
      const response = processResponse(responseBuffer)

      if (response[0] !== 1) {
        throw {
          returnCode: 0x9001,
          errorMessage: 'Format ID not recognized',
        } as ResponseError
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
        appName,
        appVersion,
        flagLen,
        flagsValue,
        flagRecovery: (flagsValue & 1) !== 0,
        flagSignedMcuCode: (flagsValue & 2) !== 0,
        flagOnboarded: (flagsValue & 4) !== 0,
        flagPINValidated: (flagsValue & 128) !== 0,
      }
    } catch (error) {
      throw processErrorResponse(error)
    }
  }

  /**
   * Retrieves device information from the device.
   * @returns A promise that resolves to the device information.
   * @throws {ResponseError} If the response from the device indicates an error.
   */
  async deviceInfo(): Promise<ResponseDeviceInfo> {
    try {
      const responseBuffer = await this.transport.send(0xe0, 0x01, 0, 0, Buffer.from([]), [LedgerError.NoErrors, 0x6e00])
      const response = processResponse(responseBuffer)

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
        targetId,
        seVersion,
        flag,
        mcuVersion,
      }
    } catch (error) {
      throw processErrorResponse(error)
    }
  }
}

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

import { serializePath } from './bip32'
import { processErrorResponse, processResponse } from './common'
import { LEDGER_DASHBOARD_CLA, LedgerError, PAYLOAD_TYPE } from './consts'
import { ResponsePayload } from './payload'
import { ResponseError } from './responseError'
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
  readonly REQUIRED_PATH_LENGTHS?: number[]
  readonly CHUNK_SIZE: number

  constructor(transport: Transport, params: ConstructorParams) {
    this.transport = transport
    this.CLA = params.cla
    this.INS = params.ins
    this.P1_VALUES = params.p1Values
    this.CHUNK_SIZE = params.chunkSize
    this.REQUIRED_PATH_LENGTHS = params.acceptedPathLengths
  }

  /**
   * Prepares chunks of data to be sent to the device.
   * @param path - The derivation path.
   * @param message - The message to be sent.
   * @returns An array of buffers ready to be sent.
   */
  prepareChunks(path: string, message: Buffer): Buffer[] {
    const chunks = []
    const serializedPathBuffer = serializePath(path, this.REQUIRED_PATH_LENGTHS)

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
  async signSendChunk(ins: number, chunkIdx: number, chunkNum: number, chunk: Buffer): Promise<ResponsePayload> {
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

      const testMode = response.readBytes(1).readUInt8() !== 0
      const major = response.readBytes(1).readUInt8()
      const minor = response.readBytes(1).readUInt8()
      const patch = response.readBytes(1).readUInt8()

      const deviceLocked = response.readBytes(1).readUInt8() === 1

      let targetId = ''
      if (response.length() >= 4) {
        targetId = response.readBytes(4).readUInt32BE().toString(16)
      }

      // FIXME: Add support for devices with multibyte version numbers

      return {
        testMode,
        major,
        minor,
        patch,
        deviceLocked,
        targetId,
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

      const formatId = response.readBytes(1).readUInt8()

      if (formatId !== 1) {
        throw {
          returnCode: 0x9001,
          errorMessage: 'Format ID not recognized',
        } as ResponseError
      }

      const appNameLen = response.readBytes(1).readUInt8()
      const appName = response.readBytes(appNameLen).toString('ascii')

      const appVersionLen = response.readBytes(1).readUInt8()
      const appVersion = response.readBytes(appVersionLen).toString('ascii')

      const flagLen = response.readBytes(1).readUInt8()
      const flagsValue = response.readBytes(flagLen).readUInt8()

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

      const targetId = response.readBytes(4).toString('hex')

      const secureElementVersionLen = response.readBytes(1).readUInt8()
      const seVersion = response.readBytes(secureElementVersionLen).toString()

      const flagsLen = response.readBytes(1).readUInt8()
      const flag = response.readBytes(flagsLen).toString('hex')

      const mcuVersionLen = response.readBytes(1).readUInt8()
      let tmp = response.readBytes(mcuVersionLen)

      // Patch issue in mcu version
      // Find the first zero byte and trim the buffer up to that point
      const firstZeroIndex = tmp.indexOf(0)
      if (firstZeroIndex !== -1) {
        tmp = tmp.subarray(0, firstZeroIndex)
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

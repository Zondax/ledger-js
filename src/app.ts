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

/**
 * Base class for interacting with a Ledger device.
 */
export default class BaseApp {
  readonly transport: Transport
  readonly CLA: number
  readonly INS: INSGeneric
  readonly P1_VALUES: P1_VALUESGeneric
  readonly REQUIRED_PATH_LENGTHS?: number[]
  readonly CHUNK_SIZE: number

  /**
   * Constructs a new BaseApp instance.
   * @param transport - The transport mechanism to communicate with the device.
   * @param params - The constructor parameters.
   */
  constructor(transport: Transport, params: ConstructorParams) {
    if (transport == null) {
      throw new Error('Transport has not been defined')
    }

    this.transport = transport
    this.CLA = params.cla
    this.INS = params.ins
    this.P1_VALUES = params.p1Values
    this.CHUNK_SIZE = params.chunkSize
    this.REQUIRED_PATH_LENGTHS = params.acceptedPathLengths
  }

  /**
   * Serializes a derivation path into a buffer.
   * @param path - The derivation path in string format.
   * @returns A buffer representing the serialized path.
   */
  serializePath(path: string): Buffer {
    return serializePath(path, this.REQUIRED_PATH_LENGTHS)
  }

  /**
   * Prepares chunks of data to be sent to the device.
   * @param path - The derivation path.
   * @param message - The message to be sent.
   * @returns An array of buffers that are ready to be sent.
   */
  protected prepareChunks(path: string, message: Buffer): Buffer[] {
    const serializedPathBuffer = this.serializePath(path)
    const chunks = this.messageToChunks(message)
    chunks.unshift(serializedPathBuffer)
    return chunks
  }

  /**
   * Splits a buffer into chunks of `this.CHUNK_SIZE` size.
   * @param message - The message to be chunked.
   * @returns An array of buffers, each representing a chunk of the original message.
   */
  protected messageToChunks(message: Buffer): Buffer[] {
    const chunks = []

    const messageBuffer = Buffer.from(message)

    for (let i = 0; i < messageBuffer.length; i += this.CHUNK_SIZE) {
      const end = Math.min(i + this.CHUNK_SIZE, messageBuffer.length)
      chunks.push(messageBuffer.subarray(i, end))
    }

    return chunks
  }

  /**
   * Sends a chunk of data to the device and handles the response.
   * Determines the payload type based on the chunk index and sends the chunk to the device.
   * Processes the response from the device.
   *
   * @param ins - The instruction byte.
   * @param p2 - P2 parameter byte.
   * @param chunkIdx - The current chunk index.
   * @param chunkNum - The total number of chunks.
   * @param chunk - The chunk data as a buffer.
   * @returns A promise that resolves to the processed response from the device.
   * @throws {ResponseError} If the response from the device indicates an error.
   */
  protected async sendGenericChunk(ins: number, p2: number, chunkIdx: number, chunkNum: number, chunk: Buffer): Promise<ResponsePayload> {
    let payloadType = PAYLOAD_TYPE.ADD

    if (chunkIdx === 1) {
      payloadType = PAYLOAD_TYPE.INIT
    }

    if (chunkIdx === chunkNum) {
      payloadType = PAYLOAD_TYPE.LAST
    }

    const statusList = [LedgerError.NoErrors, LedgerError.DataIsInvalid, LedgerError.BadKeyHandle]

    const responseBuffer = await this.transport.send(this.CLA, ins, payloadType, p2, chunk, statusList)
    const response = processResponse(responseBuffer)

    return response
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
  protected async signSendChunk(ins: number, chunkIdx: number, chunkNum: number, chunk: Buffer): Promise<ResponsePayload> {
    return this.sendGenericChunk(ins, 0, chunkIdx, chunkNum, chunk)
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

      // valid options are
      // test mode: 1 byte
      // major, minor, patch: 3 byte total
      // device locked: 1 byte
      // targetId: 4 bytes
      // total: 5 or 9 bytes
      // -----
      // test mode: 1 byte
      // major, minor, patch: 6 byte total
      // device locked: 1 byte
      // targetId: 4 bytes
      // total: 8 or 12 bytes
      // -----
      // test mode: 1 byte
      // major, minor, patch: 12 byte total
      // device locked: 1 byte
      // targetId: 4 bytes
      // total: 14 or 18 bytes

      let testMode
      let major, minor, patch

      if (response.length() === 5 || response.length() === 9) {
        testMode = response.readBytes(1).readUInt8() !== 0
        major = response.readBytes(1).readUInt8()
        minor = response.readBytes(1).readUInt8()
        patch = response.readBytes(1).readUInt8()
      } else if (response.length() === 8 || response.length() === 12) {
        testMode = response.readBytes(1).readUInt8() !== 0
        major = response.readBytes(2).readUInt16BE()
        minor = response.readBytes(2).readUInt16BE()
        patch = response.readBytes(2).readUInt16BE()
      } else if (response.length() === 14 || response.length() === 18) {
        testMode = response.readBytes(1).readUInt8() !== 0
        major = response.readBytes(4).readUInt32BE()
        minor = response.readBytes(4).readUInt32BE()
        patch = response.readBytes(4).readUInt32BE()
      } else {
        throw new ResponseError(LedgerError.TechnicalProblem, 'Invalid response length')
      }

      const deviceLocked = response.readBytes(1).readUInt8() === 1

      let targetId = ''
      if (response.length() >= 4) {
        targetId = response.readBytes(4).readUInt32BE().toString(16).padStart(8, '0')
      }

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
        throw new ResponseError(LedgerError.TechnicalProblem, 'Format ID not recognized')
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

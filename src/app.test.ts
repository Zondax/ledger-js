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
import { MockTransport } from '@ledgerhq/hw-transport-mocker'

import BaseApp from './app'
import { LedgerError } from './consts'

describe('BaseApp', () => {
  const params = {
    cla: 0x90,
    ins: { GET_VERSION: 0x00 as 0 },
    p1Values: { ONLY_RETRIEVE: 0x00 as 0, SHOW_ADDRESS_IN_DEVICE: 0x01 as 1 },
    chunkSize: 255,
    acceptedPathLengths: [3, 5],
  }

  describe('serializePath', () => {
    it('should throw an error if path does not start with "m/"', () => {
      const transport = new MockTransport(Buffer.alloc(0))
      const app = new BaseApp(transport, params)
      expect(() => app.serializePath("44'/0'/0'")).toThrow('Path should start with "m/"')
    })

    it('should throw an error if path length is not accepted', () => {
      const transport = new MockTransport(Buffer.alloc(0))
      const app = new BaseApp(transport, params)
      expect(() => app.serializePath("m/44'/0'")).toThrow('Invalid path.')
    })

    it('should correctly serialize a valid path', () => {
      const transport = new MockTransport(Buffer.alloc(0))
      const app = new BaseApp(transport, params)
      const path = "m/44'/0'/0'"
      const buffer = app.serializePath(path)
      expect(buffer.length).toBe(12)
      expect(buffer.readUInt32LE(0)).toBe(0x8000002c)
      expect(buffer.readUInt32LE(4)).toBe(0x80000000)
      expect(buffer.readUInt32LE(8)).toBe(0x80000000)
    })
  })

  describe('prepareChunks', () => {
    it('should prepare chunks correctly', () => {
      const transport = new MockTransport(Buffer.alloc(0))
      const app = new BaseApp(transport, params)
      const path = "m/44'/0'/0'"
      const message = Buffer.from('test message')
      const chunks = app.prepareChunks(path, message)

      expect(chunks.length).toBe(2)
      expect(chunks[0].length).toBe(12) // path buffer length
      expect(chunks[1].toString()).toBe('test message')
    })
  })

  describe('getVersion', () => {
    it('should retrieve version information', async () => {
      const responseBuffer = Buffer.concat([
        Buffer.from([0, 1, 2, 3]), // Version information
        Buffer.from([0x90, 0x00]), // Status code for no errors (0x9000)
      ])

      const transport = new MockTransport(responseBuffer)
      const app = new BaseApp(transport, params)
      const version = await app.getVersion()

      expect(version).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        deviceLocked: false,
        errorMessage: 'No errors',
        returnCode: 36864,
        targetId: '0',
        testMode: false,
      })
    })

    it('should handle errors correctly', async () => {
      const transport = new MockTransport(Buffer.alloc(0))
      transport.exchange = jest.fn().mockRejectedValue(new Error('Unknown error'))
      const app = new BaseApp(transport, params)
      const version = await app.getVersion()
      expect(version.returnCode).toBe(LedgerError.UnknownTransportError)
      expect(version.errorMessage).toBe('Unknown transport error')
    })
  })

  describe('appInfo', () => {
    it('should retrieve app information', async () => {
      const responseBuffer = Buffer.concat([
        Buffer.from([1, 3]), // format ID and app name length
        Buffer.from('App'), // app name
        Buffer.from([3]), // app version length
        Buffer.from('1.0'), // app version
        Buffer.from([1, 5]), // flags length and flags value
        Buffer.from([0x90, 0x00]), // Status code for no errors (0x9000)
      ])
      const transport = new MockTransport(responseBuffer)
      const app = new BaseApp(transport, params)
      const info = await app.appInfo()

      expect(info.appName).toBe('App')
      expect(info.appVersion).toBe('1.0')
      expect(info.flagsValue).toBe(5)
    })

    it('should handle errors correctly', async () => {
      const transport = new MockTransport(Buffer.alloc(0))
      transport.exchange = jest.fn().mockRejectedValue(new Error('App does not seem to be open'))
      const app = new BaseApp(transport, params)
      const appInfo = await app.appInfo()
      expect(appInfo.returnCode).toBe(LedgerError.UnknownTransportError)
      expect(appInfo.errorMessage).toBe('Unknown transport error')
    })
  })

  describe('deviceInfo', () => {
    it('should retrieve device information', async () => {
      const responseBuffer = Buffer.concat([
        Buffer.from([0, 0, 0, 0]), // target ID
        Buffer.from([3]), // SE version length
        Buffer.from('1.0'), // SE version
        Buffer.from([1]), // flag length
        Buffer.from([1]), // flag value
        Buffer.from([3]), // SE version length
        Buffer.from('2.0'), // SE version
        Buffer.from([0x90, 0x00]), // Status code for no errors (0x9000)
      ])

      const transport = new MockTransport(responseBuffer)
      const app = new BaseApp(transport, params)
      const info = await app.deviceInfo()

      expect(info.seVersion).toBe('1.0')
      expect(info.mcuVersion).toBe('2.0')
    })

    it('should handle errors correctly', async () => {
      const transport = new MockTransport(Buffer.alloc(0))
      transport.exchange = jest.fn().mockRejectedValue(new Error('Device is busy'))

      const app = new BaseApp(transport, params)
      const deviceInfo = await app.deviceInfo()
      expect(deviceInfo.returnCode).toBe(LedgerError.UnknownTransportError)
      expect(deviceInfo.errorMessage).toBe('Unknown transport error')
    })
  })
})
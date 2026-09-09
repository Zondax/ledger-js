/******************************************************************************
 *  (c) 2018 - 2026 Zondax AG
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
import BaseApp from '../app'
import { LedgerError } from '../consts'
import { ResponseError } from '../responseError'
import { type ApduResponseLike, DMKTransport, DMKTransportStatusError, type SendApduArgsLike } from './dmk'

/**
 * Minimal stand-in for a Device Management Kit instance. Records every APDU it is
 * handed and replays a queue of canned responses.
 */
class FakeDMK {
  readonly sent: SendApduArgsLike[] = []
  private readonly queue: ApduResponseLike[]

  constructor(queue: ApduResponseLike[]) {
    this.queue = [...queue]
  }

  sendApdu(args: SendApduArgsLike): Promise<ApduResponseLike> {
    this.sent.push(args)
    const next = this.queue.shift()
    if (next === undefined) {
      return Promise.reject(new Error('FakeDMK ran out of queued responses'))
    }
    return Promise.resolve(next)
  }
}

const ok = (data: number[] = []): ApduResponseLike => ({
  statusCode: Uint8Array.from([0x90, 0x00]),
  data: Uint8Array.from(data),
})

describe('DMKTransport', () => {
  describe('constructor', () => {
    it('rejects a missing DMK instance', () => {
      expect(() => new DMKTransport(undefined as any, 'session-1')).toThrow('Device Management Kit instance has not been defined')
    })

    it('rejects a missing session id', () => {
      expect(() => new DMKTransport(new FakeDMK([]), '')).toThrow('Device Management Kit session id has not been defined')
    })
  })

  describe('send', () => {
    it('encodes the APDU header and payload', async () => {
      const dmk = new FakeDMK([ok()])
      const transport = new DMKTransport(dmk, 'session-1')

      await transport.send(0x90, 0x01, 0x02, 0x03, Buffer.from([0xaa, 0xbb]))

      expect(dmk.sent).toHaveLength(1)
      expect(Array.from(dmk.sent[0].apdu)).toEqual([0x90, 0x01, 0x02, 0x03, 0x02, 0xaa, 0xbb])
      expect(dmk.sent[0].sessionId).toBe('session-1')
    })

    it('encodes an empty payload with a zero length byte', async () => {
      const dmk = new FakeDMK([ok()])
      const transport = new DMKTransport(dmk, 'session-1')

      await transport.send(0xb0, 0x01, 0, 0)

      expect(Array.from(dmk.sent[0].apdu)).toEqual([0xb0, 0x01, 0x00, 0x00, 0x00])
    })

    it('appends the status word to the response, as hw-transport does', async () => {
      const dmk = new FakeDMK([ok([0xde, 0xad])])
      const transport = new DMKTransport(dmk, 'session-1')

      const response = await transport.send(0x90, 0x00, 0, 0)

      expect(Array.from(response)).toEqual([0xde, 0xad, 0x90, 0x00])
      expect(response.readUInt16BE(response.length - 2)).toBe(LedgerError.NoErrors)
    })

    it('passes abortTimeout through to the DMK', async () => {
      const dmk = new FakeDMK([ok()])
      const transport = new DMKTransport(dmk, 'session-1', { abortTimeout: 5000 })

      await transport.send(0x90, 0x00, 0, 0)

      expect(dmk.sent[0].abortTimeout).toBe(5000)
    })

    it('rejects a payload longer than a short APDU can carry', async () => {
      const transport = new DMKTransport(new FakeDMK([]), 'session-1')

      await expect(transport.send(0x90, 0x00, 0, 0, Buffer.alloc(256))).rejects.toThrow('Data is too long')
    })

    it('rejects a malformed status word', async () => {
      const dmk = new FakeDMK([{ statusCode: Uint8Array.from([0x90]), data: Uint8Array.from([]) }])
      const transport = new DMKTransport(dmk, 'session-1')

      await expect(transport.send(0x90, 0x00, 0, 0)).rejects.toThrow('Malformed status word')
    })

    describe('status word handling', () => {
      it('throws when the status word is not accepted', async () => {
        const dmk = new FakeDMK([{ statusCode: Uint8Array.from([0x69, 0x85]), data: Uint8Array.from([]) }])
        const transport = new DMKTransport(dmk, 'session-1')

        await expect(transport.send(0x90, 0x00, 0, 0)).rejects.toThrow(DMKTransportStatusError)
      })

      it('carries statusCode on the error, so callers can recover the status word', async () => {
        const dmk = new FakeDMK([{ statusCode: Uint8Array.from([0x69, 0x85]), data: Uint8Array.from([]) }])
        const transport = new DMKTransport(dmk, 'session-1')

        await expect(transport.send(0x90, 0x00, 0, 0)).rejects.toMatchObject({
          statusCode: LedgerError.ConditionsOfUseNotSatisfied,
        })
      })

      it('returns instead of throwing when the status word is in statusList', async () => {
        const dmk = new FakeDMK([{ statusCode: Uint8Array.from([0x69, 0x84]), data: Uint8Array.from([]) }])
        const transport = new DMKTransport(dmk, 'session-1')

        const response = await transport.send(0x90, 0x00, 0, 0, Buffer.alloc(0), [LedgerError.NoErrors, LedgerError.DataIsInvalid])

        expect(response.readUInt16BE(0)).toBe(LedgerError.DataIsInvalid)
      })
    })
  })

  describe('as a BaseApp transport', () => {
    const params = {
      cla: 0x90,
      ins: { GET_VERSION: 0x00 as 0 },
      p1Values: { ONLY_RETRIEVE: 0x00 as 0, SHOW_ADDRESS_IN_DEVICE: 0x01 as 1 },
      chunkSize: 255,
    }

    it('drives getVersion end to end', async () => {
      // testMode=0, major=1, minor=2, patch=3, deviceLocked=0
      const dmk = new FakeDMK([ok([0x00, 0x01, 0x02, 0x03, 0x00])])
      const app = new BaseApp(new DMKTransport(dmk, 'session-1'), params)

      const version = await app.getVersion()

      expect(version).toMatchObject({ testMode: false, major: 1, minor: 2, patch: 3, deviceLocked: false })
      expect(Array.from(dmk.sent[0].apdu)).toEqual([0x90, 0x00, 0x00, 0x00, 0x00])
    })

    it('surfaces a device error as a ResponseError', async () => {
      const dmk = new FakeDMK([{ statusCode: Uint8Array.from([0x69, 0x85]), data: Uint8Array.from([]) }])
      const app = new BaseApp(new DMKTransport(dmk, 'session-1'), params)

      await expect(app.getVersion()).rejects.toBeInstanceOf(ResponseError)
    })
  })
})

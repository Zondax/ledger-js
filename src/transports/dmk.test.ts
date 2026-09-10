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

    it('wraps a DMK rejection so the cause survives', async () => {
      const dmk = {
        sendApdu: () => Promise.reject({ _tag: 'DeviceBusyError' }),
      }
      const transport = new DMKTransport(dmk as any, 'session-1')

      // DmkError is a plain object with no `message`, so an unwrapped rejection reaches
      // callers as "Unknown transport error" with the cause discarded.
      await expect(transport.send(0x90, 0x00, 0, 0)).rejects.toThrow('DeviceBusyError')
    })

    it('passes a per-call abortTimeoutMs through, overriding the constructor value', async () => {
      const dmk = new FakeDMK([ok()])
      const transport = new DMKTransport(dmk, 'session-1', { abortTimeout: 5000 })

      await transport.send(0x90, 0x00, 0, 0, Buffer.alloc(0), [LedgerError.NoErrors], { abortTimeoutMs: 60_000 })

      expect(dmk.sent[0].abortTimeout).toBe(60_000)
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

  describe('legacy hw-app-eth hooks', () => {
    it('survives the hw-app-eth constructor call shape', () => {
      const transport = new DMKTransport(new FakeDMK([]), 'session-1')
      const target = { getAddress: () => undefined }

      // hw-app-eth calls exactly this from its constructor; the EVM-adjacent SDKs
      // (Flare, Peaq, Avalanche) build an Eth instance unconditionally, so without
      // these hooks merely constructing one over a DMK session throws.
      expect(() => transport.decorateAppAPIMethods(target, ['getAddress'], 'w0w')).not.toThrow()
      expect(() => transport.setScrambleKey('w0w')).not.toThrow()
    })

    it('wraps the decorated methods rather than leaving them untouched', () => {
      const transport = new DMKTransport(new FakeDMK([]), 'session-1')
      const getAddress = () => 'original'
      const target: Record<string, any> = { getAddress }

      transport.decorateAppAPIMethods(target, ['getAddress'], 'w0w')

      expect(target.getAddress).not.toBe(getAddress)
    })

    it('still calls through, and releases the lock afterwards', async () => {
      const transport = new DMKTransport(new FakeDMK([]), 'session-1')
      const target: Record<string, any> = { getAddress: () => 'original' }

      transport.decorateAppAPIMethods(target, ['getAddress'], 'w0w')

      await expect(target.getAddress()).resolves.toBe('original')
      // A second sequential call proves the lock was released, not leaked.
      await expect(target.getAddress()).resolves.toBe('original')
    })

    it('rejects a second concurrent call instead of interleaving it', async () => {
      const transport = new DMKTransport(new FakeDMK([]), 'session-1')
      let release: () => void = () => undefined
      const target: Record<string, any> = {
        signTransaction: () => new Promise(resolve => (release = () => resolve('signed'))),
        getAddress: () => 'address',
      }

      transport.decorateAppAPIMethods(target, ['signTransaction', 'getAddress'], 'w0w')

      // hw-transport rejects the overlapping caller rather than queueing it, so that a
      // second flow cannot interleave its APDUs into an in-flight multi-APDU sign. The
      // DMK's own queue is per-APDU and would interleave, so this lock has to be ours.
      const signing = target.signTransaction()
      await expect(target.getAddress()).rejects.toThrow('Ledger Device is busy (lock signTransaction)')

      release()
      await expect(signing).resolves.toBe('signed')
      // Once the flow finishes the lock is free again.
      await expect(target.getAddress()).resolves.toBe('address')
    })

    it('releases the lock when the decorated method throws', async () => {
      const transport = new DMKTransport(new FakeDMK([]), 'session-1')
      const target: Record<string, any> = {
        boom: () => {
          throw new Error('device said no')
        },
      }

      transport.decorateAppAPIMethods(target, ['boom'], 'w0w')

      await expect(target.boom()).rejects.toThrow('device said no')
      await expect(target.boom()).rejects.toThrow('device said no')
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

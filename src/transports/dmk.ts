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
import { LedgerError } from '../consts'
import { errorCodeToString } from '../errors'
import { type LedgerTransport } from '../types'

/**
 * Maximum number of data bytes a short APDU can carry, since Lc is a single byte.
 */
const MAX_APDU_DATA_LENGTH = 255

/**
 * Number of bytes in an APDU header: CLA, INS, P1, P2, Lc.
 */
const APDU_HEADER_LENGTH = 5

/**
 * Number of bytes in a status word.
 */
const STATUS_WORD_LENGTH = 2

/**
 * The response returned by the Device Management Kit for a raw APDU exchange.
 *
 * Structurally identical to `ApduResponse` from `@ledgerhq/device-management-kit`.
 * It is redeclared here so that this package does not take a dependency on the DMK.
 */
export interface ApduResponseLike {
  readonly statusCode: Uint8Array
  readonly data: Uint8Array
}

/**
 * Arguments accepted by {@link DeviceManagementKitLike.sendApdu}.
 *
 * Structurally identical to `SendApduUseCaseArgs` from `@ledgerhq/device-management-kit`.
 */
export interface SendApduArgsLike {
  sessionId: string
  apdu: Uint8Array
  abortTimeout?: number
  triggersDisconnection?: boolean
}

/**
 * The subset of the Device Management Kit this adapter depends on.
 *
 * A real `DeviceManagementKit` instance satisfies this interface. Declaring the shape
 * structurally keeps `@ledgerhq/device-management-kit` out of this package's dependency
 * tree: consumers that use the DMK already have it, and consumers that do not are not
 * made to install it.
 */
export interface DeviceManagementKitLike {
  sendApdu(args: SendApduArgsLike): Promise<ApduResponseLike>
}

/**
 * Options accepted when constructing a {@link DMKTransport}.
 */
export interface DMKTransportOptions {
  /**
   * Time, in milliseconds, to wait before aborting an exchange. Passed straight through
   * to the Device Management Kit.
   */
  abortTimeout?: number
}

/**
 * Error thrown when a device returns a status word that the caller did not accept.
 *
 * Mirrors `TransportStatusError` from `@ledgerhq/hw-transport`: `BaseApp` and the
 * downstream app SDKs recover the status word from the `statusCode` property, so the
 * two are interchangeable at the point where they are caught.
 */
export class DMKTransportStatusError extends Error {
  readonly statusCode: number
  readonly statusText: string

  constructor(statusCode: number) {
    // errorCodeToString honours ERROR_DESCRIPTION_OVERRIDE and renders unknown codes as
    // "Unknown Return Code: 0x…". The bare `LedgerError[code]` reverse map does neither, and
    // returns the last-declared key for the enum's duplicate values.
    const statusText = errorCodeToString(statusCode)
    super(`Ledger device: ${statusText} (0x${statusCode.toString(16).padStart(4, '0')})`)
    // hw-transport's TransportStatusError registers under this name for
    // serializeError/deserializeError across a worker boundary; match it so a status code
    // survives that round trip.
    this.name = 'TransportStatusError'
    this.statusCode = statusCode
    this.statusText = statusText
  }
}

/**
 * Adapts a Device Management Kit session to the transport surface `BaseApp` expects.
 *
 * Ledger deprecated the `@ledgerhq/hw-transport` and `@ledgerhq/hw-app-*` packages ahead of
 * a September 2026 cutoff. The DMK replaces them, and for a device app that has no DMK signer
 * kit — which is every app this package serves — the supported path is to drive the device
 * with raw APDUs through `sendApdu`. That is exactly what `BaseApp` already does, so the whole
 * migration is this adapter: build the APDU, hand it to the DMK, and hand back the response in
 * the `Buffer`-with-status-word-appended form the rest of this package parses.
 *
 * @example
 * ```typescript
 * const dmk = new DeviceManagementKitBuilder().addTransport(webHidTransportFactory).build()
 * const sessionId = await dmk.connect({ device })
 *
 * const app = new MyApp(new DMKTransport(dmk, sessionId))
 * const version = await app.getVersion()
 * ```
 */
export class DMKTransport implements LedgerTransport {
  private readonly dmk: DeviceManagementKitLike
  private readonly sessionId: string
  private readonly abortTimeout?: number

  /** Name of the decorated method currently in flight, or null. See decorateAppAPIMethods. */
  private appAPILock: string | null = null

  /**
   * Constructs a transport bound to one Device Management Kit session.
   *
   * @param dmk - The Device Management Kit instance.
   * @param sessionId - The session identifier returned by `DeviceManagementKit.connect`.
   * @param options - Optional exchange settings.
   */
  constructor(dmk: DeviceManagementKitLike, sessionId: string, options: DMKTransportOptions = {}) {
    if (dmk == null) {
      throw new Error('Device Management Kit instance has not been defined')
    }
    if (sessionId == null || sessionId === '') {
      throw new Error('Device Management Kit session id has not been defined')
    }

    this.dmk = dmk
    this.sessionId = sessionId
    this.abortTimeout = options.abortTimeout
  }

  /**
   * Sends an APDU to the device and returns the raw response.
   *
   * @param cla - The instruction class.
   * @param ins - The instruction code.
   * @param p1 - The first parameter byte.
   * @param p2 - The second parameter byte.
   * @param data - The command data. Defaults to empty.
   * @param statusList - Status words to accept without throwing. Defaults to `[NoErrors]`.
   * @returns The response data with the two status word bytes appended, matching
   *          `Transport.send` from `@ledgerhq/hw-transport`.
   * @throws {DMKTransportStatusError} If the device returns a status word not in `statusList`.
   */
  send = async (
    cla: number,
    ins: number,
    p1: number,
    p2: number,
    data: Buffer = Buffer.alloc(0),
    statusList: number[] = [LedgerError.NoErrors],
    options?: { abortTimeoutMs?: number }
  ): Promise<Buffer> => {
    if (data.length > MAX_APDU_DATA_LENGTH) {
      throw new Error(`Data is too long: expected at most ${MAX_APDU_DATA_LENGTH} bytes, got ${data.length}`)
    }

    const apdu = new Uint8Array(APDU_HEADER_LENGTH + data.length)
    apdu[0] = cla
    apdu[1] = ins
    apdu[2] = p1
    apdu[3] = p2
    apdu[4] = data.length
    apdu.set(data, APDU_HEADER_LENGTH)

    let response: ApduResponseLike
    try {
      response = await this.dmk.sendApdu({
        sessionId: this.sessionId,
        apdu,
        abortTimeout: options?.abortTimeoutMs ?? this.abortTimeout,
      })
    } catch (e: any) {
      // The DMK rejects with a `DmkError` -- a plain object carrying `_tag`, sometimes
      // `message`, sometimes `originalError`. It is not an Error, so `e.message` is often
      // undefined, and callers upstream fall back to "Unknown transport error" and lose the
      // cause entirely. Rethrow something that survives that path.
      const detail = e?.message ?? e?._tag ?? 'unknown error'
      const wrapped = new Error(`Device Management Kit failed to send APDU: ${detail}`)
      // `cause` is set rather than passed to the constructor so this compiles below ES2022.
      ;(wrapped as Error & { cause?: unknown }).cause = e
      throw wrapped
    }

    if (response.statusCode.length !== STATUS_WORD_LENGTH) {
      throw new Error(`Malformed status word: expected ${STATUS_WORD_LENGTH} bytes, got ${response.statusCode.length}`)
    }

    const statusWord = (response.statusCode[0] << 8) | response.statusCode[1]
    if (!statusList.includes(statusWord)) {
      throw new DMKTransportStatusError(statusWord)
    }

    return Buffer.concat([Buffer.from(response.data), Buffer.from(response.statusCode)])
  }

  /**
   * Wraps each listed method so two app API calls cannot overlap on one device.
   *
   * This is not decoration for its own sake, and it is deliberately not a no-op. The
   * Device Management Kit does serialise traffic, but only per APDU: `sendApdu` enqueues
   * into a FIFO intent queue that runs one exchange at a time. hw-transport's lock is
   * coarser and stricter -- it spans an entire multi-APDU flow and *rejects* a second
   * caller rather than queueing it.
   *
   * That difference is observable. Given
   *
   *     await Promise.all([eth.signTransaction(path, tx), eth.getAddress(path)])
   *
   * hw-transport fails the second call immediately. A per-APDU queue instead interleaves
   * getAddress's exchange between two signing chunks, which the device sees as a foreign
   * APDU mid-flow. hw-app-eth's own source notes that the methods used *inside* the
   * signTransaction flow are deliberately left undecorated for exactly this reason.
   *
   * So the lock is reimplemented here rather than inherited. `hw-app-eth` calls this from
   * its constructor, which the EVM-adjacent SDKs (Flare, Peaq, Avalanche) invoke
   * unconditionally -- so without the method existing at all, merely constructing one of
   * those apps over a DMK session throws before a byte is sent.
   */
  decorateAppAPIMethods = (self: Record<string, any>, methods: string[], _scrambleKey: string): void => {
    for (const methodName of methods) {
      const fn = self[methodName]
      if (typeof fn !== 'function') {
        continue
      }
      self[methodName] = this.lockAppAPIMethod(methodName, fn, self)
    }
  }

  /**
   * Returns `fn` wrapped so that only one decorated method may be in flight at a time.
   * Mirrors `Transport.decorateAppAPIMethod` from `@ledgerhq/hw-transport`, including
   * rejecting rather than queueing, and the wording of its error.
   */
  private lockAppAPIMethod(methodName: string, fn: (...args: any[]) => any, ctx: unknown) {
    return async (...args: any[]) => {
      if (this.appAPILock !== null) {
        throw new Error(`Ledger Device is busy (lock ${this.appAPILock})`)
      }
      this.appAPILock = methodName
      try {
        return await fn.apply(ctx, args)
      } finally {
        this.appAPILock = null
      }
    }
  }

  /**
   * No-op retained for compatibility with `@ledgerhq/hw-app-eth`.
   *
   * Scramble keys belong to the legacy HID/U2F framing that the Device Management Kit does
   * not use. The DMK addresses a device by session, so there is nothing to scramble.
   */
  setScrambleKey = (_key: string): void => {
    // Intentionally empty: see the note above.
  }
}

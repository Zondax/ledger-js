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
import { MockTransport } from '@ledgerhq/hw-transport-mocker'

import BaseApp from './app'
import { LEGACY_TRANSPORT_DEPRECATION, resetLegacyTransportWarning } from './deprecation'
import { DMKTransport } from './transports/dmk'

describe('legacy transport deprecation', () => {
  const params = {
    cla: 0x90,
    ins: { GET_VERSION: 0x00 as 0 },
    p1Values: { ONLY_RETRIEVE: 0x00 as 0, SHOW_ADDRESS_IN_DEVICE: 0x01 as 1 },
    chunkSize: 255,
  }

  let warn: jest.SpyInstance

  beforeEach(() => {
    // The flag is module state, and bun test shares one module registry across files: another
    // suite may already have tripped it by constructing an app over a MockTransport.
    resetLegacyTransportWarning()
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warn.mockRestore()
  })

  it('warns when constructed over an hw-transport Transport', () => {
    new BaseApp(new MockTransport(Buffer.alloc(0)), params)

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(LEGACY_TRANSPORT_DEPRECATION)
  })

  it('warns when constructed over a hand-rolled transport', () => {
    new BaseApp({ send: async () => Buffer.from([0x90, 0x00]) }, params)

    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('warns once per process, not once per app', () => {
    new BaseApp(new MockTransport(Buffer.alloc(0)), params)
    new BaseApp(new MockTransport(Buffer.alloc(0)), params)

    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('stays silent over a DMKTransport', () => {
    const dmk = { sendApdu: async () => ({ statusCode: Uint8Array.from([0x90, 0x00]), data: new Uint8Array() }) }

    new BaseApp(new DMKTransport(dmk, 'session-1'), params)

    expect(warn).not.toHaveBeenCalled()
  })

  it('still rejects a missing transport before warning', () => {
    expect(() => new BaseApp(undefined as any, params)).toThrow('Transport has not been defined')
    expect(warn).not.toHaveBeenCalled()
  })
})

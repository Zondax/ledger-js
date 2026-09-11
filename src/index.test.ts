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
import BaseApp, { DMKTransport, DMKTransportLockedError, DMKTransportStatusError, errorCodeToString } from './index'

describe('package index', () => {
  // Every other suite imports the module it exercises directly, so the index is the one file
  // whose contents nothing pins. It is also what downstream SDKs import: dropping a line here
  // is invisible until an app fails to build against a published tag.
  it('exports the transport surface the DMK migration tells consumers to import', () => {
    expect(typeof BaseApp).toBe('function')
    expect(typeof DMKTransport).toBe('function')
    expect(typeof DMKTransportStatusError).toBe('function')
    expect(typeof DMKTransportLockedError).toBe('function')
    expect(typeof errorCodeToString).toBe('function')
  })

  it('builds a working transport through the index export', async () => {
    const dmk = { sendApdu: async () => ({ statusCode: Uint8Array.from([0x90, 0x00]), data: Uint8Array.from([0x01]) }) }

    const response = await new DMKTransport(dmk, 'session-1').send(0x90, 0x00, 0, 0)

    expect([...response]).toEqual([0x01, 0x90, 0x00])
  })
})

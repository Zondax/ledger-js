/******************************************************************************
 *  (c) 2018 - 2024 Zondax AG
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
import { Buffer } from 'buffer'

import { ByteStream } from './byteStream'
import { LedgerError } from './consts'
import { ResponseError } from './responseError'

describe('ByteStream', () => {
  let byteStream: ByteStream

  beforeEach(() => {
    byteStream = new ByteStream(Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]))
  })

  test('getCompleteBuffer should return a complete buffer', () => {
    expect(byteStream.getCompleteBuffer()).toEqual(Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]))
  })

  test('getAvailableBuffer should return the available buffer after some bytes are read', () => {
    byteStream.readBytes(3)
    expect(byteStream.getAvailableBuffer()).toEqual(Buffer.from([0x04, 0x05]))
  })

  test('readBytes should return the correct bytes and increase offset', () => {
    const readBuffer = byteStream.readBytes(2)
    expect(readBuffer).toEqual(Buffer.from([0x01, 0x02]))
    expect(byteStream.readBytes(1)).toEqual(Buffer.from([0x03]))
  })

  test('skipBytes should increase the offset correctly', () => {
    byteStream.skipBytes(2)
    expect(byteStream.readBytes(1)).toEqual(Buffer.from([0x03]))
  })

  test('resetOffset should reset the offset to zero', () => {
    byteStream.readBytes(3)
    byteStream.resetOffset()
    expect(byteStream.readBytes(2)).toEqual(Buffer.from([0x01, 0x02]))
  })

  test('readBytes should throw an error when reading beyond the buffer length', () => {
    expect(() => byteStream.readBytes(10)).toThrow(new ResponseError(LedgerError.UnknownError, 'Attempt to read beyond buffer length'))
  })

  test('skipBytes should throw an error when skipping beyond the buffer length', () => {
    expect(() => byteStream.skipBytes(10)).toThrow(new ResponseError(LedgerError.UnknownError, 'Attempt to skip beyond buffer length'))
  })

  test('appendUint8 should correctly append a byte to the buffer', () => {
    byteStream.appendUint8(0x06)
    expect(byteStream.getCompleteBuffer()).toEqual(Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]))
  })

  test('appendUint16 should correctly append a two-byte integer to the buffer', () => {
    byteStream.appendUint16(0x0708)
    expect(byteStream.getCompleteBuffer()).toEqual(Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x08, 0x07]))
  })

  test('appendUint32 should correctly append a four-byte integer to the buffer', () => {
    byteStream.appendUint32(0x090a0b0c)
    expect(byteStream.getCompleteBuffer()).toEqual(Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x0c, 0x0b, 0x0a, 0x09]))
  })

  test('appendUint64 should correctly append an eight-byte integer to the buffer', () => {
    byteStream = new ByteStream()
    byteStream.appendUint64(BigInt('0x0102030405060708'))
    expect(byteStream.readBytes(8)).toEqual(Buffer.from([8, 7, 6, 5, 4, 3, 2, 1]))
  })

  test('readBytesAt should return the correct bytes from a given offset', () => {
    const readBuffer = byteStream.readBytesAt(2, 1)
    expect(readBuffer).toEqual(Buffer.from([0x02, 0x03]))
  })

  test('readBytesAt should throw an error when reading beyond the buffer length', () => {
    expect(() => byteStream.readBytesAt(10, 1)).toThrow(new ResponseError(LedgerError.UnknownError, 'Attempt to read beyond buffer length'))
  })

  test('insertBytesAt should correctly insert bytes at a given offset', () => {
    byteStream.insertBytesAt(Buffer.from([0x06, 0x07]), 2)
    expect(byteStream.getCompleteBuffer()).toEqual(Buffer.from([0x01, 0x02, 0x06, 0x07, 0x03, 0x04, 0x05]))
  })

  test('insertBytesAt should expand the buffer if necessary', () => {
    byteStream.insertBytesAt(Buffer.from([0x08, 0x09]), 10)
    expect(byteStream.getCompleteBuffer()).toEqual(Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x09]))
  })

  test('writeBytesAt should correctly write bytes at a given offset and advance the write offset', () => {
    byteStream.writeBytesAt(Buffer.from([0x0a, 0x0b]), 1)
    expect(byteStream.getCompleteBuffer()).toEqual(Buffer.from([0x01, 0x0a, 0x0b, 0x04, 0x05]))
    expect(byteStream.readBytes(5)).toEqual(Buffer.from([0x01, 0x0a, 0x0b, 0x04, 0x05]))
  })

  test('writeBytesAt should expand the buffer if necessary', () => {
    byteStream.writeBytesAt(Buffer.from([0x0c, 0x0d]), 10)
    expect(byteStream.getCompleteBuffer()).toEqual(Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x0d]))
  })
})

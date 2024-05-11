import { Buffer } from 'buffer'

import { LedgerError } from './consts'
import { ResponsePayload } from './payload'
import { ResponseError } from './responseError'

describe('ResponsePayload', () => {
  let payload: Buffer
  let responsePayload: ResponsePayload

  beforeEach(() => {
    payload = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05])
    responsePayload = new ResponsePayload(payload)
  })

  test('getCompleteBuffer should return a complete buffer', () => {
    expect(responsePayload.getCompleteBuffer()).toEqual(Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]))
  })

  test('getAvailableBuffer should return the available buffer', () => {
    responsePayload.readBytes(3)
    expect(responsePayload.getAvailableBuffer()).toEqual(Buffer.from([0x04, 0x05]))
  })

  test('readBytes should return the correct bytes and increase offset', () => {
    const readBuffer = responsePayload.readBytes(2)
    expect(readBuffer).toEqual(Buffer.from([0x01, 0x02]))
    expect(responsePayload.readBytes(1)).toEqual(Buffer.from([0x03]))
  })

  test('skipBytes should increase the offset correctly', () => {
    responsePayload.skipBytes(2)
    expect(responsePayload.readBytes(1)).toEqual(Buffer.from([0x03]))
  })

  test('resetOffset should reset the offset to zero', () => {
    responsePayload.readBytes(3)
    responsePayload.resetOffset()
    expect(responsePayload.readBytes(2)).toEqual(Buffer.from([0x01, 0x02]))
  })

  test('readBytes should throw an error when reading beyond the buffer length', () => {
    expect(() => responsePayload.readBytes(10)).toThrow(new ResponseError(LedgerError.UnknownError, 'Attempt to read beyond buffer length'))
  })

  test('skipBytes should throw an error when skipping beyond the buffer length', () => {
    expect(() => responsePayload.skipBytes(10)).toThrow(new ResponseError(LedgerError.UnknownError, 'Attempt to skip beyond buffer length'))
  })
})

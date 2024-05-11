import { LedgerError } from './consts'
import { ResponseError } from './responseError'

export class ResponsePayload {
  private offset = 0
  private internalBuffer: Buffer

  constructor(payload: Buffer) {
    this.internalBuffer = payload
    this.offset = 0
  }

  /**
   * Returns a new buffer containing all bytes of the original payload.
   */
  getCompleteBuffer(): Buffer {
    return Buffer.from(this.internalBuffer)
  }

  /**
   * Returns a new buffer containing the bytes from the current offset to the end of the payload.
   */
  getAvailableBuffer(): Buffer {
    return Buffer.from(this.internalBuffer.subarray(this.offset))
  }

  length(): number {
    return this.internalBuffer.length - this.offset
  }

  /**
   * Reads a specified number of bytes from the current offset, then advances the offset.
   * @param length The number of bytes to read.
   * @returns A buffer containing the read bytes.
   * @throws Error if attempting to read beyond the buffer length.
   */
  readBytes(length: number): Buffer {
    if (this.offset + length > this.internalBuffer.length) {
      throw new ResponseError(LedgerError.UnknownError, 'Attempt to read beyond buffer length')
    }
    const response = this.internalBuffer.subarray(this.offset, this.offset + length)
    this.skipBytes(length)
    return response
  }

  /**
   * Advances the current offset by a specified number of bytes.
   * @param length The number of bytes to skip.
   * @throws Error if attempting to skip beyond the buffer length.
   */
  skipBytes(length: number) {
    if (this.offset + length > this.internalBuffer.length) {
      throw new ResponseError(LedgerError.UnknownError, 'Attempt to skip beyond buffer length')
    }
    this.offset += length
  }

  /**
   * Resets the current offset to zero.
   */
  resetOffset() {
    this.offset = 0
  }
}

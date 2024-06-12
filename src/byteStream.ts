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
import { LedgerError } from './consts'
import { ResponseError } from './responseError'

/**
 * Class representing a byte stream for reading and writing data.
 */
export class ByteStream {
  private readOffset = 0
  private writeOffset = 0
  protected internalBuffer: Buffer

  constructor(buffer?: Buffer) {
    this.internalBuffer = buffer ? Buffer.from(buffer) : Buffer.alloc(0)
    this.readOffset = 0
    this.writeOffset = this.internalBuffer.length
  }

  /**
   * Writes a single byte (Uint8) to the buffer at the current write offset, then advances the write offset.
   * If the write offset is at the buffer's end, the buffer is expanded.
   * @param value The byte to write.
   */
  appendUint8(value: number) {
    const byteBuffer = Buffer.from([value])
    this.appendBytes(byteBuffer)
  }

  /**
   * Writes a two-byte unsigned integer (Uint16) to the buffer at the current write offset in little-endian format, then advances the write offset.
   * If the write offset is at the buffer's end, the buffer is expanded.
   * @param value The two-byte unsigned integer to write.
   */
  appendUint16(value: number) {
    const byteBuffer = Buffer.alloc(2)
    byteBuffer.writeUInt16LE(value, 0)
    this.appendBytes(byteBuffer)
  }

  /**
   * Writes a four-byte unsigned integer (Uint32) to the buffer at the current write offset in little-endian format, then advances the write offset.
   * If the write offset is at the buffer's end, the buffer is expanded.
   * @param value The four-byte unsigned integer to write.
   */
  appendUint32(value: number) {
    const byteBuffer = Buffer.alloc(4)
    byteBuffer.writeUInt32LE(value, 0)
    this.appendBytes(byteBuffer)
  }

  /**
   * Writes an eight-byte unsigned integer (Uint64) to the buffer at the current write offset in little-endian format, then advances the write offset.
   * If the write offset is at the buffer's end, the buffer is expanded.
   * @param value The eight-byte unsigned integer to write.
   */
  appendUint64(value: bigint) {
    const byteBuffer = Buffer.alloc(8)
    byteBuffer.writeBigUInt64LE(value, 0)
    this.appendBytes(byteBuffer)
  }

  /**
   * Reads a specified number of bytes from the current read offset, then advances the read offset.
   * @param length The number of bytes to read.
   * @returns A buffer containing the read bytes.
   * @throws Error if attempting to read beyond the buffer length.
   */
  readBytes(length: number): Buffer {
    if (this.readOffset + length > this.internalBuffer.length) {
      throw new ResponseError(LedgerError.UnknownError, 'Attempt to read beyond buffer length')
    }
    const response = this.internalBuffer.subarray(this.readOffset, this.readOffset + length)
    this.readOffset += length
    return response
  }

  /**
   * Reads a specified number of bytes from a given offset without changing the current read offset.
   * @param length The number of bytes to read.
   * @param offset The offset from which to read the bytes.
   * @returns A buffer containing the read bytes.
   * @throws Error if attempting to read beyond the buffer length.
   */
  readBytesAt(length: number, offset: number): Buffer {
    if (offset + length > this.internalBuffer.length) {
      throw new ResponseError(LedgerError.UnknownError, 'Attempt to read beyond buffer length')
    }
    return this.internalBuffer.subarray(offset, offset + length)
  }

  /**
   * Writes data to the buffer at the current write offset, then advances the write offset.
   * If the data exceeds the buffer length, the buffer is expanded.
   * @param data The data to write.
   */
  appendBytes(data: Buffer) {
    if (this.writeOffset + data.length > this.internalBuffer.length) {
      const newBuffer = Buffer.alloc(this.writeOffset + data.length)
      this.internalBuffer.copy(newBuffer, 0, 0, this.writeOffset)
      this.internalBuffer = newBuffer
    }
    data.copy(this.internalBuffer, this.writeOffset)
    this.writeOffset += data.length
  }

  /**
   * Inserts data into the buffer at the specified offset without changing the current write offset.
   * Expands the buffer if necessary.
   * @param data The data to insert.
   * @param offset The offset at which to insert the data.
   */
  insertBytesAt(data: Buffer, offset: number) {
    if (offset > this.internalBuffer.length) {
      const padding = Buffer.alloc(offset - this.internalBuffer.length, 0)
      this.internalBuffer = Buffer.concat([this.internalBuffer, padding, data])
    } else {
      const before = this.internalBuffer.subarray(0, offset)
      const after = this.internalBuffer.subarray(offset)
      this.internalBuffer = Buffer.concat([before, data, after])
    }
  }

  /**
   * Writes data to the buffer at the specified offset and advances the write offset from that point.
   * Expands the buffer if the data exceeds the buffer length.
   * @param data The data to write.
   * @param offset The offset at which to write the data.
   */
  writeBytesAt(data: Buffer, offset: number) {
    if (offset + data.length > this.internalBuffer.length) {
      const newBuffer = Buffer.alloc(offset + data.length)
      this.internalBuffer.copy(newBuffer, 0, 0, offset)
      this.internalBuffer = newBuffer
    }
    data.copy(this.internalBuffer, offset)
    this.writeOffset = offset + data.length
  }

  /**
   * Advances the current read offset by a specified number of bytes.
   * @param length The number of bytes to skip.
   * @throws Error if attempting to skip beyond the buffer length.
   */
  skipBytes(length: number) {
    if (this.readOffset + length > this.internalBuffer.length) {
      throw new ResponseError(LedgerError.UnknownError, 'Attempt to skip beyond buffer length')
    }
    this.readOffset += length
  }

  clear() {
    this.internalBuffer = Buffer.alloc(0)
    this.readOffset = 0
    this.writeOffset = 0
  }

  /**
   * Resets the current read and write offsets to zero.
   */
  resetOffset() {
    this.readOffset = 0
    this.writeOffset = 0
  }

  /**
   * Returns a new buffer containing all bytes of the internal buffer.
   */
  getCompleteBuffer(): Buffer {
    return Buffer.from(this.internalBuffer)
  }

  /**
   * Returns a new buffer containing the bytes from the current read offset to the end of the internal buffer.
   */
  getAvailableBuffer(): Buffer {
    return Buffer.from(this.internalBuffer.subarray(this.readOffset))
  }

  /**
   * Returns the remaining length of the buffer from the current read offset.
   * @returns The remaining length of the buffer.
   */
  length(): number {
    return this.internalBuffer.length - this.readOffset
  }

  /**
   * Returns the total capacity of the internal buffer, irrespective of the current read or write offset.
   * @returns The total length of the internal buffer.
   */
  capacity(): number {
    return this.internalBuffer.length
  }

  /**
   * Returns the current read offset.
   * @returns The current read offset.
   */
  getReadOffset(): number {
    return this.readOffset
  }

  /**
   * Returns the current write offset.
   * @returns The current write offset.
   */
  getWriteOffset(): number {
    return this.writeOffset
  }

  /**
   * Sets the read offset to a specified value.
   * @param offset The new read offset.
   */
  setReadOffset(offset: number) {
    if (offset < 0 || offset > this.internalBuffer.length) {
      throw new ResponseError(LedgerError.UnknownError, 'Invalid read offset')
    }
    this.readOffset = offset
  }

  /**
   * Sets the write offset to a specified value.
   * @param offset The new write offset.
   */
  setWriteOffset(offset: number) {
    if (offset < 0 || offset > this.internalBuffer.length) {
      throw new ResponseError(LedgerError.UnknownError, 'Invalid write offset')
    }
    this.writeOffset = offset
  }
}

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
import { HARDENED, LedgerError } from './consts'
import { ResponseError } from './responseError'

/**
 * Serializes a derivation path into a buffer.
 * @param path - The derivation path in string format.
 * @returns A buffer representing the serialized path.
 * @throws {ResponseError} If the path format is incorrect or invalid.
 */
export function serializePath(path: string, requiredPathLengths?: number[]): Buffer {
  if (typeof path !== 'string') {
    // NOTE: this is probably unnecessary
    throw new ResponseError(LedgerError.GenericError, "Path should be a string (e.g \"m/44'/461'/5'/0/3\")")
  }

  if (!path.startsWith('m/')) {
    throw new ResponseError(LedgerError.GenericError, 'Path should start with "m/" (e.g "m/44\'/461\'/5\'/0/3")')
  }

  const pathArray = path.split('/')
  pathArray.shift() // remove "m"

  if (requiredPathLengths && requiredPathLengths.length > 0 && !requiredPathLengths.includes(pathArray.length)) {
    throw new ResponseError(LedgerError.GenericError, "Invalid path length. (e.g \"m/44'/5757'/5'/0/3\")")
  }

  const buf = Buffer.alloc(4 * pathArray.length)
  pathArray.forEach((child: string, i: number) => {
    let value = 0

    if (child.endsWith("'")) {
      value += HARDENED
      child = child.slice(0, -1)
    }

    const numChild = Number(child)

    if (Number.isNaN(numChild)) {
      throw new ResponseError(LedgerError.GenericError, `Invalid path : ${child} is not a number. (e.g "m/44'/461'/5'/0/3")`)
    }

    if (numChild >= HARDENED) {
      throw new ResponseError(LedgerError.GenericError, 'Incorrect child value (bigger or equal to 0x80000000)')
    }

    value += numChild
    buf.writeUInt32LE(value, 4 * i)
  })

  return buf
}

/**
 * Converts an array of numbers representing a serialized path back into a derivation path string.
 * @param items - The array of numbers representing the serialized path.
 * @returns The derivation path in string format.
 * @throws {Error} If the array length is not a multiple of 4 or if the array contains invalid values.
 */
export function numbersToBip32Path(items: number[]): string {
  if (items.length === 0) {
    throw new ResponseError(LedgerError.GenericError, 'The items array cannot be empty.')
  }

  const pathArray = []
  for (let i = 0; i < items.length; i++) {
    let value = items[i]
    if (!Number.isInteger(value) || value < 0) {
      throw new ResponseError(LedgerError.GenericError, 'Each item must be a positive integer.')
    }
    let child = value & ~HARDENED

    if (value >= HARDENED) {
      pathArray.push(`${child}'`)
    } else {
      pathArray.push(`${child}`)
    }
  }

  return 'm/' + pathArray.join('/')
}
/**
 * Converts a buffer representing a serialized path back into a derivation path string.
 * @param buffer - The buffer representing the serialized path.
 * @returns The derivation path in string format.
 * @throws {Error} If the buffer length is not a multiple of 4 or if the buffer contains invalid values.
 */
export function bufferToBip32Path(buffer: Buffer): string {
  if (buffer.length % 4 !== 0) {
    throw new ResponseError(LedgerError.GenericError, 'The buffer length must be a multiple of 4.')
  }

  const items = []
  for (let i = 0; i < buffer.length; i += 4) {
    items.push(buffer.readUInt32LE(i))
  }

  return numbersToBip32Path(items)
}

import { HARDENED, LedgerError } from './consts'
import { ResponseError } from './responseError'

/**
 * Serializes a derivation path into a buffer.
 * @param path - The derivation path in string format.
 * @returns A buffer representing the serialized path.
 * @throws {Error} If the path format is incorrect or invalid.
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

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
import { bufferToBip32Path, numbersToBip32Path, serializePath } from './bip32'

test('serializePath - valid path', async () => {
  const path = "m/44'/461'/0/0/5"
  const buf = Buffer.alloc(20)
  buf.writeUInt32LE(0x80000000 + 44, 0)
  buf.writeUInt32LE(0x80000000 + 461, 4)
  buf.writeUInt32LE(0, 8)
  buf.writeUInt32LE(0, 12)
  buf.writeUInt32LE(5, 16)

  const bufPath = serializePath(path)

  expect(bufPath).toEqual(buf)
})

test('serializePath - path should be a string', async () => {
  const path = [44, 461, 0, 2, 3]

  expect(() => {
    serializePath(path as unknown as string)
  }).toThrow(/Path should be a string/)
})

test("serializePath - path should start with 'm'", async () => {
  const path = "/44'/461'/0/0/5"

  expect(() => {
    serializePath(path)
  }).toThrow(/Path should start with "m\/"/)
})

test('serializePath - path length needs to be 5', async () => {
  const path = "m/44'/461'/0/0"

  expect(() => {
    serializePath(path, [5])
  }).toThrow(/Invalid path/)
})

test('serializePath - invalid number in path', async () => {
  const path = "m/44'/461'/0/0/l"

  expect(() => {
    serializePath(path)
  }).toThrow(/Invalid path : l is not a number/)
})

test('serializePath - child value should not be bigger than 0x80000000', async () => {
  const path = "m/44'/461'/0/0/2147483648"

  expect(() => {
    serializePath(path)
  }).toThrow('Incorrect child value (bigger or equal to 0x80000000)')
})

test('serializePath - child value should not be bigger than 0x80000000', async () => {
  const path = "m/44'/461'/0/0/2147483649"

  expect(() => {
    serializePath(path)
  }).toThrow('Incorrect child value (bigger or equal to 0x80000000)')
})

test('bip32pathToString - valid path', async () => {
  const items = [0x8000002c, 0x800001cd, 0, 0, 5]
  const path = numbersToBip32Path(items)
  expect(path).toBe("m/44'/461'/0/0/5")
})

test('bip32pathToString - empty array', async () => {
  expect(() => {
    numbersToBip32Path([])
  }).toThrow('The items array cannot be empty.')
})

test('bip32pathToString - valid path with hardened values', async () => {
  const items = [0x8000002c, 0x800001cd, 0x80000000, 0, 5]
  const path = numbersToBip32Path(items)
  expect(path).toBe("m/44'/461'/0'/0/5")
})

test('bip32pathToString - valid path with non-hardened values', async () => {
  const items = [44, 461, 0, 0, 5]
  const path = numbersToBip32Path(items)
  expect(path).toBe('m/44/461/0/0/5')
})

test('bufferToBip32Path - valid buffer', async () => {
  const buf = Buffer.alloc(20)
  buf.writeUInt32LE(0x80000000 + 44, 0)
  buf.writeUInt32LE(0x80000000 + 461, 4)
  buf.writeUInt32LE(0, 8)
  buf.writeUInt32LE(0, 12)
  buf.writeUInt32LE(5, 16)

  const path = bufferToBip32Path(buf)
  expect(path).toBe("m/44'/461'/0/0/5")
})

test('bufferToBip32Path - empty buffer', async () => {
  const buf = Buffer.alloc(0)

  expect(() => {
    bufferToBip32Path(buf)
  }).toThrow('The buffer length must be a multiple of 4.')
})

test('bufferToBip32Path - buffer with invalid length', async () => {
  const buf = Buffer.alloc(18)

  expect(() => {
    bufferToBip32Path(buf)
  }).toThrow('The buffer length must be a multiple of 4.')
})

test('bufferToBip32Path - valid buffer with hardened values', async () => {
  const buf = Buffer.alloc(20)
  buf.writeUInt32LE(0x80000000 + 44, 0)
  buf.writeUInt32LE(0x80000000 + 461, 4)
  buf.writeUInt32LE(0x80000000, 8)
  buf.writeUInt32LE(0, 12)
  buf.writeUInt32LE(5, 16)

  const path = bufferToBip32Path(buf)
  expect(path).toBe("m/44'/461'/0'/0/5")
})

test('bufferToBip32Path - valid buffer with non-hardened values', async () => {
  const buf = Buffer.alloc(20)
  buf.writeUInt32LE(44, 0)
  buf.writeUInt32LE(461, 4)
  buf.writeUInt32LE(0, 8)
  buf.writeUInt32LE(0, 12)
  buf.writeUInt32LE(5, 16)

  const path = bufferToBip32Path(buf)
  expect(path).toBe('m/44/461/0/0/5')
})

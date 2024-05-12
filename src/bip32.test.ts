import { serializePath } from './bip32'

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

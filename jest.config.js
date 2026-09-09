module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // `test` runs a build first, so dist/ holds a compiled copy of every suite.
  // Without this jest discovers both and runs the whole suite twice.
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
}

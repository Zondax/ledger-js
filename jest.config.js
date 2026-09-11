module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // The build no longer emits test files, but a dist/ left over from an older checkout still
  // holds compiled copies -- ignore it so jest never runs a suite twice.
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
}

module.exports = {
  verbose: true,
  preset: 'ts-jest',
  testPathIgnorePatterns: [
    '/cream',
    '/build/',
    'node_modules'
  ],
  testRegex:'./ts/__tests__/.*\\.test\\.ts$',
  testEnvironment: 'node',
}

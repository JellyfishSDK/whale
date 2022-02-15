const { pathsToModuleNameMapper } = require('ts-jest')
const { compilerOptions } = require('./tsconfig')

module.exports = {
  preset: 'ts-jest',
  testRegex: '.*\\.(spec|e2e|test)\\.ts$',
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
  testTimeout: 180000,
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '.*/.*.spec/.*',
    '.*/__tests__/.*'
  ]
}

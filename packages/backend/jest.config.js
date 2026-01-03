module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.ts',  // Exclui arquivos de módulo
    '!**/main.ts',      // Exclui arquivo principal
    '!scripts/**',      // Exclui scripts (incluindo create-admin.ts)
    '!test/**',         // Exclui arquivos de teste auxiliares
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
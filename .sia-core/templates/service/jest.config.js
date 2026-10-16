/**
 * Configuração do Jest para os testes do serviço.
 * Arquivo estático: *create-service copia sem renderizar (não há placeholders).
 * @type {import('jest').Config}
 */
module.exports = {
  // Usa o ts-jest para suportar TypeScript
  preset: 'ts-jest',

  // Ambiente de teste
  testEnvironment: 'node',

  // Diretórios raiz dos testes
  roots: ['<rootDir>'],

  // Padrões de arquivo de teste
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
  ],

  // Transformação do TypeScript
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          moduleResolution: 'NodeNext',
        },
      },
    ],
  },

  // Extensões de módulo
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Configuração de cobertura
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/node_modules/**',
    '!**/dist/**',
  ],

  // Limites de cobertura (meta acima de 70%)
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Formatos do relatório de cobertura
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],

  // Pasta de saída da cobertura
  coverageDirectory: 'coverage',

  // Limpa os mocks entre os testes
  clearMocks: true,

  // Saída detalhada
  verbose: true,

  // Tempo limite por teste (30 segundos)
  testTimeout: 30000,

  // Arquivos de setup
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Mapeamento do alias de caminho
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Caminhos ignorados
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],

  // Setup e teardown globais
  // globalSetup: '<rootDir>/jest.global-setup.ts',
  // globalTeardown: '<rootDir>/jest.global-teardown.ts',
};

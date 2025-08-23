import { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import * as fs from 'fs';
import * as path from 'path';

// Carrega o tsconfig.json de forma compatível com as versões mais novas do Jest
const tsconfig = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, './tsconfig.json'), 'utf8'),
);

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: './',
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.(t|j)s',
    '!src/**/*.e2e-spec.(t|j)s',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [
    'main.ts',
    '.entity.ts',
    '.module.ts',
    'index.ts',
    '.providers.ts',
  ],
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
    prefix: '<rootDir>',
  }),
  setupFiles: ['<rootDir>/jest.setup.ts'],
};

export default config;

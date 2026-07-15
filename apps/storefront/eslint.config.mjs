import tseslint from 'typescript-eslint';
import base from '../../packages/eslint-config/index.mjs';

export default tseslint.config(
  { ignores: ['.next/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**'] },
  ...base,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
);

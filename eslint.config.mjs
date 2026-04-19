import tseslint from 'typescript-eslint'
import sveltePlugin from 'eslint-plugin-svelte'
import svelteParser from 'svelte-eslint-parser'
import tsParser from '@typescript-eslint/parser'

export default [
  ...tseslint.configs.recommended,
  ...sveltePlugin.configs['flat/recommended'],
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tsParser
      }
    }
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/ban-ts-comment': ['error', {
        'ts-nocheck': false,
        'ts-ignore': true,
        'ts-expect-error': 'allow-with-description',
      }],
    }
  },
  {
    ignores: ['out/', 'dist/', 'node_modules/', 'src/_v1-reference/']
  }
]

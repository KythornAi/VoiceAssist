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
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  },
  {
    ignores: ['out/', 'dist/', 'node_modules/', 'src/_v1-reference/']
  }
]

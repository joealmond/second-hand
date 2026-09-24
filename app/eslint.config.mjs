import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      'dist/',
      'node_modules/',
      '.output/',
      '.netlify/',
      '.vercel/',
      '.nitro/',
      '.tanstack/',
      'docs/.vitepress/dist/',
      'docs/.vitepress/cache/',
      'convex/_generated/',
      '*.gen.ts',
      'worker-configuration.d.ts',
    ],
  },
  {
    files: ['public/sw.js'],
    languageOptions: { globals: { self: 'readonly', caches: 'readonly', fetch: 'readonly', URL: 'readonly', Response: 'readonly' } },
  },
  {
    // Node globals for .mjs scripts
    files: ['scripts/**/*.mjs', 'packages/**/*.mjs', '*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  }
)

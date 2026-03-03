import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Allow any when needed (warn instead of error)
      '@typescript-eslint/no-explicit-any': 'warn',

      // Allow unused vars with underscore prefix
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Don't require escaping quotes in JSX
      'react/no-unescaped-entities': 'off',

      // Hooks dependencies as warnings
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];

export default eslintConfig;

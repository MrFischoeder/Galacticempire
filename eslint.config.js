// @ts-check
import { builtinModules } from 'node:module';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Purity rules for the simulation (shared) and the AI: no system clock, no Math.random,
 * no timers, no browser or Node APIs. See CLAUDE.md, "Architektura".
 */
const PURE =
  'Game logic must be pure and deterministic (CLAUDE.md): use the game clock and the seeded RNG.';
const pureRules = {
  'no-restricted-properties': [
    'error',
    { object: 'Math', property: 'random', message: PURE },
    { object: 'Date', property: 'now', message: PURE },
    { object: 'performance', property: 'now', message: PURE },
  ],
  'no-restricted-syntax': [
    'error',
    { selector: "NewExpression[callee.name='Date']", message: PURE },
  ],
  'no-restricted-globals': [
    'error',
    ...[
      'Date',
      'setTimeout',
      'setInterval',
      'setImmediate',
      'requestAnimationFrame',
      'performance',
    ].map((name) => ({ name, message: PURE })),
    ...['window', 'document', 'navigator', 'localStorage', 'process', 'require', 'global'].map(
      (name) => ({ name, message: 'No browser or Node APIs in shared/ai (CLAUDE.md).' }),
    ),
  ],
  'no-restricted-imports': [
    'error',
    {
      patterns: [{ group: ['node:*'], message: 'No Node APIs in shared/ai (CLAUDE.md).' }],
      paths: builtinModules.map((name) => ({
        name,
        message: 'No Node APIs in shared/ai (CLAUDE.md).',
      })),
    },
  ],
};

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'docs/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['packages/client/**/*.ts', 'tests/**/*.ts', '**/vite.config.ts', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['packages/shared/src/**/*.ts', 'packages/ai/src/**/*.ts'],
    rules: pureRules,
  },
  prettier,
);

import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const eslint = new ESLint({ cwd: root });

async function errorsIn(file: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: `${root}/${file}` });
  return (result?.messages ?? []).filter((m) => m.severity === 2).map((m) => m.ruleId ?? '');
}

const FORBIDDEN: Record<string, string> = {
  'Math.random()': 'export const x = Math.random();',
  'Date.now()': 'export const x = Date.now();',
  'new Date()': 'export const x = new Date();',
  setTimeout: 'setTimeout(() => {}, 1);',
  window: 'export const x = window.innerWidth;',
  document: 'export const x = document.title;',
  'node: import': "import { readFileSync } from 'node:fs';\nexport const x = readFileSync;",
  'fs import': "import fs from 'fs';\nexport const x = fs;",
};

describe('purity rules', () => {
  for (const pkg of ['shared', 'ai']) {
    for (const [what, code] of Object.entries(FORBIDDEN)) {
      it(`${pkg}: detects ${what}`, async () => {
        expect(await errorsIn(`packages/${pkg}/src/probe.ts`, code)).not.toHaveLength(0);
      });
    }
  }

  it('allows plain pure code in shared', async () => {
    expect(
      await errorsIn('packages/shared/src/probe.ts', 'export const x = Math.min(1, 2);'),
    ).toEqual([]);
  });

  it('allows the browser clock in the client', async () => {
    expect(
      await errorsIn(
        'packages/client/src/probe.ts',
        'export const x = Math.random() + Date.now();',
      ),
    ).toEqual([]);
  });
});

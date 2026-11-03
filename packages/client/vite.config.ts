import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const root = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
  version: string;
};

export default defineConfig({
  define: { __GAME_VERSION__: JSON.stringify(root.version) },
});

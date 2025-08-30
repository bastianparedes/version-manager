import { build } from 'esbuild';
import { rmSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));

rmSync(path.resolve(__dirname, 'dist'), { recursive: true, force: true });

const entryFile = 'src/index.ts';

build({
  entryPoints: [entryFile],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outfile: 'dist/index.cjs',
  banner: {
    js: '#!/usr/bin/env node',
  },
  external: ['fs', 'path', 'os', 'crypto', 'util', 'stream', ...Object.keys(pkg.peerDependencies || {})],
}).catch(() => process.exit(1));

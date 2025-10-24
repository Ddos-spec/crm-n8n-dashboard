import { build } from 'esbuild';
import { mkdir, rm, readFile, writeFile } from 'fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const assetsDir = path.join(distDir, 'assets');

async function run() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(assetsDir, { recursive: true });

  await build({
    entryPoints: ['src/frontend/scripts/bootstrap/main.js'],
    bundle: true,
    format: 'esm',
    sourcemap: true,
    outdir: assetsDir
  });

  const indexPath = path.join(rootDir, 'src/frontend/index.html');
  const indexHtml = await readFile(indexPath, 'utf-8');
  const rewritten = indexHtml.replace(
    '/src/frontend/scripts/bootstrap/main.js',
    './assets/main.js'
  );
  await writeFile(path.join(distDir, 'index.html'), rewritten, 'utf-8');

  console.log('✅ Frontend built to dist/');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

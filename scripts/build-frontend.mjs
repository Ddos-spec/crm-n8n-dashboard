import { build } from 'esbuild';
import { mkdir, rm, readFile, writeFile } from 'fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const assetsDir = path.join(distDir, 'assets');

async function run() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(assetsDir, { recursive: true });

  const tailwindInput = path.join(rootDir, 'src', 'frontend', 'styles', 'tailwind.css');
  const tailwindOutput = path.join(assetsDir, 'tailwind.css');
  const tailwindConfig = path.join(rootDir, 'tailwind.config.js');
  const tailwindBin = path.join(
    rootDir,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'tailwindcss.cmd' : 'tailwindcss'
  );

  await execFileAsync(tailwindBin, ['-c', tailwindConfig, '-i', tailwindInput, '-o', tailwindOutput, '--minify']);

  await build({
    entryPoints: ['src/frontend/scripts/bootstrap/main.js'],
    bundle: true,
    format: 'esm',
    sourcemap: true,
    outdir: assetsDir
  });

  const indexPath = path.join(rootDir, 'src/frontend/index.html');
  const indexHtml = await readFile(indexPath, 'utf-8');
  if (!indexHtml.includes('./scripts/bootstrap/main.js')) {
    throw new Error('Failed to locate bootstrap script path in index.html');
  }

  if (!indexHtml.includes('./styles/tailwind.css')) {
    throw new Error('Failed to locate Tailwind stylesheet path in index.html');
  }

  const rewritten = indexHtml
    .replace('./scripts/bootstrap/main.js', './assets/main.js')
    .replace('./styles/tailwind.css', './assets/tailwind.css');
  await writeFile(path.join(distDir, 'index.html'), rewritten, 'utf-8');

  console.log('✅ Frontend built to dist/');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

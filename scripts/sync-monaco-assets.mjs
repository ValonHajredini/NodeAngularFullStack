#!/usr/bin/env node
/**
 * Copies the Monaco Editor distributable assets from the hoisted node_modules
 * directory into each Angular application's public assets directory so they
 * are available when running the Vite dev server.
 */
import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(new URL('.', import.meta.url).pathname, '..');
const sourceRoot = path.join(rootDir, 'node_modules', 'monaco-editor');
const sourceDirs = ['min', 'min-maps'];

const targets = [
  path.join(rootDir, 'apps', 'web', 'public', 'monaco-editor'),
  path.join(rootDir, 'apps', 'form-builder-ui', 'public', 'monaco-editor'),
];

function assertSourceExists() {
  if (!fs.existsSync(sourceRoot)) {
    throw new Error(
      `monaco-editor is not installed. Run "npm install" first so ${sourceRoot} is available.`,
    );
  }
}

function copyRecursive(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

function syncAssets() {
  assertSourceExists();

  for (const target of targets) {
    for (const dir of sourceDirs) {
      const srcDir = path.join(sourceRoot, dir);
      const destDir = path.join(target, dir);
      copyRecursive(srcDir, destDir);
      console.log(`✓ Copied ${dir} -> ${destDir}`);
    }
  }

  console.log('Monaco assets synchronized successfully.');
}

syncAssets();

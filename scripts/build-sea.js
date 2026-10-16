#!/usr/bin/env node
'use strict';

/**
 * Gera o executável único do SIA (Node single executable application) para o sistema atual.
 *   node scripts/build-sea.js [--name sia-macos-arm64]
 * Node ≥ 25.5 usa `node --build-sea`; versões anteriores usam --experimental-sea-config + postject.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const nameArg = process.argv.indexOf('--name');
const isWindows = process.platform === 'win32';
const baseName = nameArg > -1 ? process.argv[nameArg + 1] : 'sia';
const exe = path.join(DIST, isWindows && !baseName.endsWith('.exe') ? `${baseName}.exe` : baseName);

const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit', cwd: ROOT });

run(process.execPath, [path.join(__dirname, 'build-bundle.js')]);

const assets = { 'sia-core.bundle.json': path.join(DIST, 'sia-core.bundle.json') };
const main = path.join(ROOT, 'installer', 'sia-install.js');
const supportsBuildSea = process.execArgv && require('child_process')
  .spawnSync(process.execPath, ['--help'], { encoding: 'utf8' })
  .stdout.includes('--build-sea');

if (fs.existsSync(exe)) fs.rmSync(exe);

if (supportsBuildSea) {
  const config = path.join(DIST, 'sea-config.json');
  fs.writeFileSync(config, JSON.stringify({ main, output: exe, disableExperimentalSEAWarning: true, assets }, null, 2));
  run(process.execPath, ['--build-sea', config]);
} else {
  const blob = path.join(DIST, 'sia.blob');
  const config = path.join(DIST, 'sea-config.json');
  fs.writeFileSync(config, JSON.stringify({ main, output: blob, disableExperimentalSEAWarning: true, assets }, null, 2));
  run(process.execPath, ['--experimental-sea-config', config]);
  fs.copyFileSync(process.execPath, exe);
  if (process.platform === 'darwin') run('codesign', ['--remove-signature', exe]);
  const postject = ['--yes', 'postject@1.0.0-alpha.6', exe, 'NODE_SEA_BLOB', blob, '--sentinel-fuse', 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'];
  if (process.platform === 'darwin') postject.push('--macho-segment-name', 'NODE_SEA');
  run(isWindows ? 'npx.cmd' : 'npx', postject);
}

if (process.platform === 'darwin') run('codesign', ['--sign', '-', '--force', exe]);
if (!isWindows) fs.chmodSync(exe, 0o755);
console.log(`executável: ${path.relative(process.cwd(), exe)} (${(fs.statSync(exe).size / 1e6).toFixed(1)} MB)`);

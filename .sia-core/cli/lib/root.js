'use strict';

/**
 * Raiz do projeto SIA: sobe a partir do cwd até achar .sia-core/core-config.yaml.
 * O .sia-core pode ser um link simbólico (sandbox); o caminho lógico é preservado.
 */

const fs = require('fs');
const path = require('path');
const { exists, isSymlink } = require('./fsutil');
const { UsageError } = require('./errors');

const CORE_DIR = '.sia-core';
const CONFIG_FILE = 'core-config.yaml';

/**
 * @param {string} start Diretório inicial.
 * @returns {string|null}
 */
function findRoot(start) {
  let dir = path.resolve(start || process.cwd());
  for (;;) {
    if (exists(path.join(dir, CORE_DIR, CONFIG_FILE))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Descreve a raiz encontrada.
 * @param {string} root
 */
function describeRoot(root) {
  const coreDir = path.join(root, CORE_DIR);
  const symlink = isSymlink(coreDir);
  let coreRealPath = coreDir;
  try {
    coreRealPath = fs.realpathSync(coreDir);
  } catch {
    // mantém o caminho lógico
  }
  return {
    root,
    coreDir,
    configPath: path.join(coreDir, CONFIG_FILE),
    coreIsSymlink: symlink,
    coreRealPath,
  };
}

/**
 * Resolve a raiz a partir de --root ou do cwd.
 * @param {{ root?: string, cwd?: string }} [options]
 * @throws {UsageError} quando a raiz não é encontrada.
 */
function resolveRoot(options = {}) {
  if (options.root) {
    const candidate = path.resolve(options.cwd || process.cwd(), options.root);
    if (!exists(path.join(candidate, CORE_DIR, CONFIG_FILE))) {
      throw new UsageError(
        `--root ${options.root}: não encontrei ${CORE_DIR}/${CONFIG_FILE} em ${candidate}.`,
        { code: 'ROOT_NOT_FOUND' },
      );
    }
    return describeRoot(candidate);
  }
  const start = options.cwd || process.cwd();
  const root = findRoot(start);
  if (!root) {
    throw new UsageError(
      `Raiz do projeto SIA não encontrada: nenhum ${CORE_DIR}/${CONFIG_FILE} a partir de ${start}. ` +
        'Rode a partir do projeto ou use --root {dir}.',
      { code: 'ROOT_NOT_FOUND' },
    );
  }
  return describeRoot(root);
}

module.exports = { CORE_DIR, CONFIG_FILE, findRoot, describeRoot, resolveRoot };

'use strict';

/**
 * Utilitários de sistema de arquivos sem dependências.
 * Leituras toleram ausência (retornam null/[]); escritas são atômicas (tmp + rename).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function exists(p) {
  try {
    fs.statSync(p);
    return true;
  } catch {
    return false;
  }
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function isSymlink(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

/** Lê texto UTF-8 (sem BOM) ou null se não existir/não for arquivo. */
function readText(p) {
  try {
    const text = fs.readFileSync(p, 'utf8');
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  } catch {
    return null;
  }
}

/** @returns {{ data: any, error: string|null, exists: boolean }} */
function readJson(p) {
  const text = readText(p);
  if (text === null) return { data: null, error: null, exists: false };
  try {
    return { data: JSON.parse(text), error: null, exists: true, text };
  } catch (error) {
    return { data: null, error: error.message, exists: true, text };
  }
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/** Escrita atômica: grava em arquivo temporário no mesmo diretório e renomeia. */
function writeFileAtomic(p, content) {
  mkdirp(path.dirname(p));
  const tmp = `${p}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  try {
    fs.writeFileSync(tmp, content, 'utf8');
    fs.renameSync(tmp, p);
  } finally {
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      // ignorado: o temporário já foi renomeado ou removido
    }
  }
}

/** Nomes de entradas de um diretório, ordenados ([] se não existir). */
function listDir(dir) {
  try {
    return fs.readdirSync(dir).sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

/**
 * Lista arquivos recursivamente, com caminhos relativos em formato POSIX, ordenados.
 * Segue links simbólicos de diretório (o .sia-core pode ser um link).
 * @param {string} dir
 * @param {{ maxDepth?: number, filter?: (rel: string) => boolean, skipDirs?: string[] }} [options]
 */
function walkFiles(dir, options = {}) {
  const maxDepth = options.maxDepth === undefined ? 20 : options.maxDepth;
  const skipDirs = new Set(options.skipDirs || ['node_modules', '.git']);
  const result = [];
  const visit = (current, rel, depth) => {
    for (const name of listDir(current)) {
      const abs = path.join(current, name);
      const relPath = rel ? `${rel}/${name}` : name;
      let stat;
      try {
        stat = fs.statSync(abs);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        if (skipDirs.has(name) || depth >= maxDepth) continue;
        visit(abs, relPath, depth + 1);
      } else if (stat.isFile()) {
        if (!options.filter || options.filter(relPath)) result.push(relPath);
      }
    }
  };
  visit(dir, '', 0);
  return result.sort((a, b) => a.localeCompare(b));
}

function sha256(content) {
  return crypto.createHash('sha256').update(String(content), 'utf8').digest('hex');
}

function toPosix(p) {
  return String(p).split(path.sep).join('/');
}

/** Caminho relativo POSIX de `to` a partir de `from`. */
function relPosix(from, to) {
  return toPosix(path.relative(from, to)) || '.';
}

/** Verdadeiro se `target` está dentro de `base` (e não é o próprio base). */
function isInside(base, target) {
  const rel = path.relative(path.resolve(base), path.resolve(target));
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/** Remove diretórios vazios a partir de `fromDir` subindo até `stopDir` (exclusivo). */
function pruneEmptyDirs(fromDir, stopDir) {
  let current = path.resolve(fromDir);
  const stop = path.resolve(stopDir);
  const pruned = [];
  while (current !== stop && isInside(stop, current)) {
    let entries;
    try {
      entries = fs.readdirSync(current);
    } catch {
      return pruned;
    }
    if (entries.length > 0) return pruned;
    try {
      fs.rmdirSync(current);
      pruned.push(current);
    } catch {
      return pruned;
    }
    current = path.dirname(current);
  }
  return pruned;
}

function mtimeMs(p) {
  try {
    return fs.statSync(p).mtimeMs;
  } catch {
    return null;
  }
}

module.exports = {
  exists,
  isFile,
  isDir,
  isSymlink,
  readText,
  readJson,
  mkdirp,
  writeFileAtomic,
  listDir,
  walkFiles,
  sha256,
  toPosix,
  relPosix,
  isInside,
  pruneEmptyDirs,
  mtimeMs,
};

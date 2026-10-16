'use strict';

/**
 * Arquivos gerenciados pelo `sia sync`.
 *
 * - Arquivos inteiros: registrados em {pasta-da-ide}/sia-managed.json
 *   ({schemaVersion: 1, generatedBy: 'sia sync', files: [{path, sha256}]}, caminhos relativos à pasta da IDE).
 *   Saiu da geração e está no manifesto anterior → removido (pastas vazias são podadas).
 *   Arquivo não gerenciado com conteúdo diferente → conflito; nunca é tocado.
 * - Arquivos com blocos (CLAUDE.md, AGENTS.md...): só os blocos SIA-MANAGED são substituídos.
 * - JSON mesclado (settings.json, hooks.json): merge por entradas; não entra no manifesto.
 */

const fs = require('fs');
const path = require('path');
const {
  readText, readJson, writeFileAtomic, sha256, toPosix, isFile, isInside, pruneEmptyDirs,
} = require('./fsutil');

const MANIFEST_FILE = 'sia-managed.json';
const GENERATED_BY = 'sia sync';
const BLOCK_SOURCE = '<!-- SIA-MANAGED-START: ([A-Za-z0-9._-]+) -->[\\s\\S]*?<!-- SIA-MANAGED-END: \\1 -->';

function renderBlock(id, content) {
  return `<!-- SIA-MANAGED-START: ${id} -->\n${String(content).trim()}\n<!-- SIA-MANAGED-END: ${id} -->`;
}

/** Blocos SIA-MANAGED presentes num texto. */
function parseBlocks(text) {
  const re = new RegExp(BLOCK_SOURCE, 'g');
  const blocks = [];
  let match;
  while ((match = re.exec(String(text || ''))) !== null) blocks.push({ id: match[1], text: match[0] });
  return blocks;
}

/**
 * Mescla blocos gerenciados num texto existente.
 * Substitui blocos de mesmo id no lugar, remove blocos SIA que saíram da geração,
 * preserva o conteúdo do usuário e acrescenta blocos novos no fim.
 * @param {string|null} existing
 * @param {{ id: string, content: string }[]} blocks
 */
function mergeBlocks(existing, blocks) {
  const wanted = new Map(blocks.map((block) => [block.id, renderBlock(block.id, block.content)]));
  const source = existing === null || existing === undefined ? '' : String(existing);
  const re = new RegExp(BLOCK_SOURCE, 'g');
  const emitted = new Set();
  let out = '';
  let lastIndex = 0;
  let dropPending = false;
  const takeText = (text) => {
    let value = text;
    if (dropPending) {
      value = out.trim() ? value.replace(/^\n+/, '\n') : value.replace(/^\n+/, '');
      dropPending = false;
    }
    out += value;
  };
  let match;
  while ((match = re.exec(source)) !== null) {
    takeText(source.slice(lastIndex, match.index));
    const id = match[1];
    if (wanted.has(id) && !emitted.has(id)) {
      out += wanted.get(id);
      emitted.add(id);
    } else {
      out = out.trim() ? out.replace(/\n+$/, '\n') : '';
      dropPending = true;
    }
    lastIndex = match.index + match[0].length;
  }
  takeText(source.slice(lastIndex));
  for (const [id, block] of wanted) {
    if (emitted.has(id)) continue;
    if (out.trim()) {
      if (!out.endsWith('\n')) out += '\n';
      if (!out.endsWith('\n\n')) out += '\n';
    } else {
      out = '';
    }
    out += `${block}\n`;
  }
  if (out && !out.endsWith('\n')) out += '\n';
  return out;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Igualdade estrutural (ordem de chaves de objeto não importa; ordem de array importa). */
function deepEqual(a, b) {
  if (a === b) return true;
  if (Array.isArray(a)) {
    return Array.isArray(b) && a.length === b.length && a.every((item, i) => deepEqual(item, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    return keysA.length === keysB.length && keysA.every((key) => Object.prototype.hasOwnProperty.call(b, key) && deepEqual(a[key], b[key]));
  }
  return false;
}

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function formatJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/**
 * @returns {{ manifest: object|null, warning: string|null, file: string }}
 */
function readManifest(ideDirAbs) {
  const file = path.join(ideDirAbs, MANIFEST_FILE);
  const read = readJson(file);
  if (!read.exists) return { manifest: null, warning: null, file };
  if (read.error) {
    return { manifest: null, warning: `manifesto ilegível (${read.error}); será recriado sem remover órfãos`, file };
  }
  const data = read.data;
  if (!isPlainObject(data) || data.schemaVersion !== 1 || data.generatedBy !== GENERATED_BY || !Array.isArray(data.files)) {
    return { manifest: null, warning: 'manifesto não reconhecido; será recriado sem remover órfãos', file };
  }
  return { manifest: data, warning: null, file };
}

function buildManifest(entries) {
  const unique = new Map();
  for (const entry of entries) unique.set(entry.path, entry.sha256);
  const files = [...unique.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([p, hash]) => ({ path: p, sha256: hash }));
  return { schemaVersion: 1, generatedBy: GENERATED_BY, files };
}

/**
 * Planeja a aplicação de uma projeção num destino.
 * @param {string} targetRoot raiz onde as projeções são gravadas
 * @param {{ ide: string, dir: string, files: {path: string, content: string}[],
 *   blockFiles?: {path: string, blocks: {id: string, content: string}[]}[],
 *   jsonFiles?: {path: string, transform: (obj: object) => object}[], warnings?: string[] }} generation
 */
function planProjection(targetRoot, generation) {
  const ideDirAbs = path.join(targetRoot, generation.dir);
  const previous = readManifest(ideDirAbs);
  const previousPaths = new Set(
    previous.manifest ? previous.manifest.files.map((entry) => entry && entry.path).filter((p) => typeof p === 'string') : [],
  );
  const actions = [];
  const warnings = [...(generation.warnings || [])];
  if (previous.warning) warnings.push(`${toPosix(path.join(generation.dir, MANIFEST_FILE))}: ${previous.warning}`);
  const manifestEntries = [];
  const generated = new Set();

  for (const file of generation.files) {
    const abs = path.join(targetRoot, file.path);
    const ideRel = toPosix(path.relative(ideDirAbs, abs));
    if (!isInside(ideDirAbs, abs)) {
      actions.push({ kind: 'file', path: file.path, action: 'error', message: 'caminho fora da pasta da IDE' });
      continue;
    }
    generated.add(ideRel);
    const current = readText(abs);
    const hash = sha256(file.content);
    if (current === null) {
      actions.push({ kind: 'file', path: file.path, action: 'create', content: file.content });
      manifestEntries.push({ path: ideRel, sha256: hash });
    } else if (current === file.content) {
      actions.push({ kind: 'file', path: file.path, action: 'unchanged' });
      manifestEntries.push({ path: ideRel, sha256: hash });
    } else if (previousPaths.has(ideRel)) {
      actions.push({ kind: 'file', path: file.path, action: 'update', content: file.content });
      manifestEntries.push({ path: ideRel, sha256: hash });
    } else {
      actions.push({
        kind: 'file',
        path: file.path,
        action: 'conflict',
        message: 'arquivo existente não gerenciado pelo SIA; não foi alterado',
      });
    }
  }

  for (const rel of previousPaths) {
    if (generated.has(rel)) continue;
    const abs = path.resolve(ideDirAbs, rel);
    if (!isInside(ideDirAbs, abs) || rel === MANIFEST_FILE) continue;
    if (!isFile(abs)) continue;
    actions.push({ kind: 'file', path: toPosix(path.join(generation.dir, rel)), action: 'remove' });
  }

  for (const blockFile of generation.blockFiles || []) {
    const abs = path.join(targetRoot, blockFile.path);
    const current = readText(abs);
    const next = mergeBlocks(current, blockFile.blocks);
    let action = 'unchanged';
    if (current === null) action = 'create';
    else if (current !== next) action = 'update';
    actions.push({ kind: 'blocks', path: blockFile.path, action, content: next });
  }

  for (const jsonFile of generation.jsonFiles || []) {
    const abs = path.join(targetRoot, jsonFile.path);
    const read = readJson(abs);
    if (read.error) {
      actions.push({
        kind: 'json',
        path: jsonFile.path,
        action: 'error',
        message: `JSON inválido (${read.error}); corrija o arquivo, ele não foi alterado`,
      });
      continue;
    }
    const base = read.exists && isPlainObject(read.data) ? cloneJson(read.data) : {};
    if (read.exists && !isPlainObject(read.data)) {
      actions.push({ kind: 'json', path: jsonFile.path, action: 'error', message: 'o JSON não é um objeto; não foi alterado' });
      continue;
    }
    const next = jsonFile.transform(base);
    let action = 'unchanged';
    if (!read.exists) action = 'create';
    else if (!deepEqual(read.data, next)) action = 'update';
    actions.push({ kind: 'json', path: jsonFile.path, action, content: formatJson(next) });
  }

  const manifest = buildManifest(manifestEntries);
  const manifestPath = toPosix(path.join(generation.dir, MANIFEST_FILE));
  const manifestContent = formatJson(manifest);
  const currentManifest = readText(path.join(ideDirAbs, MANIFEST_FILE));
  let manifestAction = 'unchanged';
  if (currentManifest === null) manifestAction = 'create';
  else if (currentManifest !== manifestContent) manifestAction = 'update';
  actions.push({ kind: 'manifest', path: manifestPath, action: manifestAction, content: manifestContent });

  return { ide: generation.ide, dir: generation.dir, targetRoot, actions, warnings, notes: generation.notes || [] };
}

const CHECK_CATEGORY = { create: 'missing', update: 'drift', remove: 'stale', conflict: 'conflict', error: 'error' };

/** Diferenças de um plano para o --check. */
function planDifferences(plan) {
  return plan.actions
    .filter((action) => action.action !== 'unchanged')
    .map((action) => ({ path: action.path, kind: action.kind, category: CHECK_CATEGORY[action.action] || action.action, message: action.message || null }));
}

function summarize(plan) {
  const counts = { create: 0, update: 0, unchanged: 0, remove: 0, conflict: 0, error: 0 };
  for (const action of plan.actions) {
    if (action.kind === 'manifest') continue;
    counts[action.action] = (counts[action.action] || 0) + 1;
  }
  return counts;
}

/**
 * Executa um plano. Escritas atômicas; remoções podam pastas vazias até a pasta da IDE.
 */
function applyPlan(plan) {
  const ideDirAbs = path.join(plan.targetRoot, plan.dir);
  const done = { written: [], removed: [], pruned: [] };
  for (const action of plan.actions) {
    if (action.kind === 'manifest') continue;
    const abs = path.join(plan.targetRoot, action.path);
    if (action.action === 'create' || action.action === 'update') {
      writeFileAtomic(abs, action.content);
      done.written.push(action.path);
    } else if (action.action === 'remove') {
      try {
        fs.unlinkSync(abs);
        done.removed.push(action.path);
        done.pruned.push(...pruneEmptyDirs(path.dirname(abs), ideDirAbs).map((dir) => toPosix(path.relative(plan.targetRoot, dir))));
      } catch {
        // arquivo já removido ou sem permissão: segue
      }
    }
  }
  const manifestAction = plan.actions.find((action) => action.kind === 'manifest');
  if (manifestAction && manifestAction.action !== 'unchanged') {
    writeFileAtomic(path.join(plan.targetRoot, manifestAction.path), manifestAction.content);
    done.written.push(manifestAction.path);
  }
  return done;
}

module.exports = {
  MANIFEST_FILE,
  GENERATED_BY,
  renderBlock,
  parseBlocks,
  mergeBlocks,
  isPlainObject,
  deepEqual,
  cloneJson,
  formatJson,
  readManifest,
  buildManifest,
  planProjection,
  planDifferences,
  summarize,
  applyPlan,
};

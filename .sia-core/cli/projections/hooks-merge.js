'use strict';

/**
 * Merge das entradas do SIA em arquivos de hooks/settings das IDEs.
 * Entradas do SIA = handlers cujo comando contém ".sia-core/hooks/".
 * Tudo o que não é do SIA é preservado; o resultado é idempotente.
 */

const path = require('path');
const { isPlainObject } = require('../lib/managed-files');
const { listDir, isDir } = require('../lib/fsutil');
const { SIA_HOOK_MARKER } = require('./common');

function isSiaHandler(handler) {
  return isPlainObject(handler) && typeof handler.command === 'string' && handler.command.includes(SIA_HOOK_MARKER);
}

/**
 * Remove handlers do SIA de todos os eventos e acrescenta os grupos atuais.
 * @param {object} hooks objeto hooks existente
 * @param {Record<string, object>} siaGroups evento → grupo {matcher?, hooks: [...]}
 */
function mergeHookGroups(hooks, siaGroups) {
  const result = isPlainObject(hooks) ? { ...hooks } : {};
  for (const [event, groups] of Object.entries(result)) {
    if (!Array.isArray(groups)) continue;
    const cleaned = [];
    for (const group of groups) {
      if (!isPlainObject(group) || !Array.isArray(group.hooks)) {
        cleaned.push(group);
        continue;
      }
      const kept = group.hooks.filter((handler) => !isSiaHandler(handler));
      if (kept.length === group.hooks.length) cleaned.push(group);
      else if (kept.length > 0) cleaned.push({ ...group, hooks: kept });
    }
    if (cleaned.length > 0) result[event] = cleaned;
    else delete result[event];
  }
  for (const [event, group] of Object.entries(siaGroups)) {
    result[event] = [...(Array.isArray(result[event]) ? result[event] : []), group];
  }
  return result;
}

/** Remove todos os handlers do SIA (sem acrescentar). */
function removeSiaHooks(hooks) {
  return mergeHookGroups(hooks, {});
}

// ── Permissões do Claude Code (boundary) ─────────────────────

function globToRegex(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i];
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        re += '.*';
        i += 1;
      } else re += '[^/]*';
    } else if (ch === '?') re += '[^/]';
    else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

/** O caminho `rel` (diretório) pode conter algo que case com `pattern`? */
function couldContain(pattern, rel) {
  const patternSegs = pattern.split('/');
  const relSegs = rel.split('/');
  for (let i = 0; i < relSegs.length; i += 1) {
    const seg = patternSegs[i];
    if (seg === undefined) return false;
    if (seg === '**') return true;
    if (!globToRegex(seg).test(relSegs[i])) return false;
  }
  return patternSegs.length > relSegs.length;
}

/**
 * Expande um diretório protegido em entradas que não cobrem as exceções
 * (no Claude Code, deny vence allow).
 */
function expandDir(base, exceptions, sourceRoot) {
  const out = [];
  for (const name of listDir(path.join(sourceRoot, base))) {
    const rel = `${base}/${name}`;
    if (isDir(path.join(sourceRoot, rel))) {
      const inner = exceptions.filter((exception) => couldContain(exception, rel));
      if (inner.length > 0) out.push(...expandDir(rel, inner, sourceRoot));
      else out.push(`${rel}/**`);
    } else if (!exceptions.some((exception) => globToRegex(exception).test(rel))) {
      out.push(rel);
    }
  }
  return out;
}

function expandProtected(protectedList, exceptions, sourceRoot) {
  const result = [];
  for (const entry of protectedList) {
    const value = String(entry || '').trim();
    if (!value) continue;
    if (!value.endsWith('/**')) {
      result.push(value);
      continue;
    }
    const base = value.slice(0, -3);
    const relevant = exceptions.filter((exception) => couldContain(exception, base));
    if (relevant.length === 0) result.push(value);
    else result.push(...expandDir(base, relevant, sourceRoot));
  }
  return [...new Set(result)];
}

const SIA_PERMISSION_RE = /^(Edit|Write)\(\.sia-core\//;

/**
 * Regras de permissão do SIA a partir de boundary.
 * @returns {{ deny: string[], allow: string[] }}
 */
function siaPermissionRules(boundary, sourceRoot) {
  if (!isPlainObject(boundary) || boundary.frameworkProtection !== true) return { deny: [], allow: [] };
  const protectedList = Array.isArray(boundary.protected) ? boundary.protected.map(String) : [];
  const exceptions = Array.isArray(boundary.exceptions) ? boundary.exceptions.map(String) : [];
  const deny = [];
  for (const p of expandProtected(protectedList, exceptions, sourceRoot)) deny.push(`Edit(${p})`, `Write(${p})`);
  const allow = [];
  for (const p of exceptions) allow.push(`Edit(${p})`, `Write(${p})`);
  return { deny, allow };
}

/** Mescla deny/allow do SIA de forma idempotente (remove as antigas do SIA e acrescenta as atuais). */
function mergePermissions(permissions, rules) {
  const result = isPlainObject(permissions) ? { ...permissions } : {};
  for (const key of ['deny', 'allow']) {
    const existing = Array.isArray(result[key]) ? result[key] : [];
    const kept = existing.filter((rule) => !(typeof rule === 'string' && SIA_PERMISSION_RE.test(rule)));
    const merged = [...kept];
    for (const rule of rules[key]) if (!merged.includes(rule)) merged.push(rule);
    if (merged.length > 0) result[key] = merged;
    else delete result[key];
  }
  return result;
}

module.exports = {
  isSiaHandler,
  mergeHookGroups,
  removeSiaHooks,
  globToRegex,
  couldContain,
  expandProtected,
  siaPermissionRules,
  mergePermissions,
};

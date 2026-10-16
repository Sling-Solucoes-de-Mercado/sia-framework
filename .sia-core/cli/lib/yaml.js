'use strict';

/**
 * YAML: wrapper do js-yaml vendorizado, frontmatter e bloco ```yaml de agentes.
 */

const jsyaml = require('../vendor/js-yaml.js');

/**
 * @param {string} text
 * @param {{ failsafe?: boolean }} [options] failsafe: todos os escalares como string
 *   (evita que '1.10' vire 1.1 ou que datas virem Date).
 */
function load(text, options = {}) {
  return jsyaml.load(text, {
    schema: options.failsafe ? jsyaml.FAILSAFE_SCHEMA : jsyaml.DEFAULT_SCHEMA,
  });
}

/** @returns {{ data: any, error: string|null }} */
function tryLoad(text, options = {}) {
  try {
    return { data: load(text, options), error: null };
  } catch (error) {
    return { data: null, error: shortYamlError(error) };
  }
}

function shortYamlError(error) {
  if (!error) return 'erro desconhecido';
  if (error.mark && typeof error.mark.line === 'number') {
    return `${error.reason || error.message} (linha ${error.mark.line + 1}, coluna ${error.mark.column + 1})`;
  }
  return String(error.message || error).split('\n')[0];
}

function dump(value) {
  return jsyaml.dump(value, { lineWidth: 120, noRefs: true });
}

const FRONTMATTER_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

/**
 * Separa o frontmatter YAML do corpo.
 * @returns {{ hasFrontmatter: boolean, raw: string|null, body: string }}
 */
function splitFrontmatter(text) {
  const source = String(text || '').replace(/^﻿/, '');
  const match = source.match(FRONTMATTER_RE);
  if (!match) return { hasFrontmatter: false, raw: null, body: source };
  return { hasFrontmatter: true, raw: match[1], body: source.slice(match[0].length) };
}

/**
 * @returns {{ hasFrontmatter: boolean, data: any, error: string|null, body: string, raw: string|null }}
 */
function parseFrontmatter(text, options = {}) {
  const split = splitFrontmatter(text);
  if (!split.hasFrontmatter) {
    return { hasFrontmatter: false, data: null, error: null, body: split.body, raw: null };
  }
  const parsed = tryLoad(split.raw, options);
  const data = parsed.data === undefined || parsed.data === null ? {} : parsed.data;
  if (!parsed.error && (typeof data !== 'object' || Array.isArray(data))) {
    return { hasFrontmatter: true, data: null, error: 'o frontmatter não é um objeto YAML', body: split.body, raw: split.raw };
  }
  return { hasFrontmatter: true, data: parsed.error ? null : data, error: parsed.error, body: split.body, raw: split.raw };
}

const YAML_BLOCK_RE = /^```ya?ml[^\n]*\r?\n([\s\S]*?)^```[ \t]*$/m;

/**
 * Primeiro bloco ```yaml de um Markdown (formato de agente).
 * @returns {{ raw: string, index: number }|null}
 */
function extractYamlBlock(markdown) {
  const match = String(markdown || '').match(YAML_BLOCK_RE);
  if (!match) return null;
  return { raw: match[1], index: match.index };
}

/** Converte valores YAML (Date, número) em string legível. */
function scalarToString(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

module.exports = {
  jsyaml,
  load,
  tryLoad,
  dump,
  splitFrontmatter,
  parseFrontmatter,
  extractYamlBlock,
  scalarToString,
  shortYamlError,
};

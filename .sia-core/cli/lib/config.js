'use strict';

/**
 * Leitura do .sia-core/core-config.yaml com valores padrão do guia de autoria (seção 5.2).
 */

const path = require('path');
const { readText } = require('./fsutil');
const { tryLoad } = require('./yaml');

const DEFAULT_PATHS = Object.freeze({
  prd: 'docs/prd.md',
  prdSharded: 'docs/prd',
  architecture: 'docs/architecture.md',
  architectureSharded: 'docs/architecture',
  adr: 'docs/architecture/adr',
  stories: 'docs/stories',
  backlog: 'docs/stories/backlog.md',
  qa: 'docs/qa',
  qaGates: 'docs/qa/gates',
  qaAssessments: 'docs/qa/assessments',
  inspections: 'docs/qa/inspections',
  gotchas: 'docs/gotchas.md',
  squads: 'squads',
  runtime: '.sia',
});

const IDE_TARGETS = Object.freeze(['claude-code', 'codex', 'gemini', 'grok']);
const DEFAULT_MAX_QG_ITERATIONS = 5;

/**
 * @param {string} configPath
 * @returns {{ config: object, error: string|null, exists: boolean }}
 */
function loadConfig(configPath) {
  const text = readText(configPath);
  if (text === null) return { config: {}, error: 'core-config.yaml não encontrado', exists: false };
  const parsed = tryLoad(text);
  if (parsed.error) return { config: {}, error: parsed.error, exists: true };
  if (!parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
    return { config: {}, error: 'o core-config.yaml não é um objeto YAML', exists: true };
  }
  return { config: parsed.data, error: null, exists: true };
}

/** Lê um valor por caminho pontuado ("a.b.c"). */
function get(obj, dotted, fallback) {
  let current = obj;
  for (const key of String(dotted).split('.')) {
    if (current === null || current === undefined || typeof current !== 'object') return fallback;
    current = current[key];
  }
  return current === undefined ? fallback : current;
}

/** Caminhos do projeto (relativos à raiz) com padrões. */
function projectPaths(config) {
  const configured = (config && typeof config.paths === 'object' && config.paths) || {};
  const result = { ...DEFAULT_PATHS };
  for (const [key, value] of Object.entries(configured)) {
    if (typeof value === 'string' && value.trim()) result[key] = value.trim();
  }
  const squadsLocation = get(config, 'squads.location');
  if (typeof squadsLocation === 'string' && squadsLocation.trim() && !configured.squads) {
    result.squads = squadsLocation.trim();
  }
  return result;
}

/** Caminho absoluto de uma chave de paths. */
function projectPath(root, config, key) {
  return path.resolve(root, projectPaths(config)[key]);
}

function maxQgIterations(config) {
  const value = Number(get(config, 'quality.qaLoop.maxIterations', DEFAULT_MAX_QG_ITERATIONS));
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_MAX_QG_ITERATIONS;
}

function ideTargets(config) {
  const targets = get(config, 'ide.targets');
  if (!Array.isArray(targets) || targets.length === 0) return [...IDE_TARGETS];
  return targets.map((t) => String(t).trim()).filter(Boolean);
}

function slashPrefix(config) {
  const value = get(config, 'ide.slashPrefix', 'SIA');
  return typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value) ? value : 'SIA';
}

module.exports = {
  DEFAULT_PATHS,
  IDE_TARGETS,
  DEFAULT_MAX_QG_ITERATIONS,
  loadConfig,
  get,
  projectPaths,
  projectPath,
  maxQgIterations,
  ideTargets,
  slashPrefix,
};

'use strict';

/**
 * Registro das projeções e montagem do contexto de geração a partir do .sia-core.
 */

const path = require('path');
const { readText } = require('../lib/fsutil');
const { loadAgents } = require('../lib/agents');
const { loadRules, loadSkills } = require('../lib/catalog');
const { UsageError } = require('../lib/errors');

const PROJECTIONS = Object.freeze({
  'claude-code': require('./claude-code'),
  codex: require('./codex'),
  gemini: require('./gemini'),
  grok: require('./grok'),
});

const IDE_ALIASES = Object.freeze({
  'claude-code': 'claude-code',
  claude: 'claude-code',
  codex: 'codex',
  chatgpt: 'codex',
  openai: 'codex',
  gemini: 'gemini',
  'gemini-cli': 'gemini',
  grok: 'grok',
});

/** Normaliza uma lista de IDEs ("claude,codex") para ids canônicos. */
function resolveIdes(list) {
  const items = (Array.isArray(list) ? list : String(list || '').split(','))
    .map((item) => String(item).trim().toLowerCase())
    .filter(Boolean);
  const result = [];
  for (const item of items) {
    const id = IDE_ALIASES[item];
    if (!id) {
      throw new UsageError(`IDE desconhecida: ${item}. Use: ${Object.keys(PROJECTIONS).join(', ')}.`);
    }
    if (!result.includes(id)) result.push(id);
  }
  return result;
}

/**
 * @param {{ root: string, coreDir: string, config: object }} options
 */
function buildContext({ root, coreDir, config }) {
  return {
    root,
    coreDir,
    config,
    agents: loadAgents(path.join(coreDir, 'agents')),
    rules: loadRules(coreDir),
    skills: loadSkills(coreDir),
    constitutionText: readText(path.join(coreDir, 'constitution.md')) || '',
  };
}

function generate(ide, ctx) {
  const projection = PROJECTIONS[ide];
  if (!projection) throw new UsageError(`IDE desconhecida: ${ide}.`);
  return projection.generate(ctx);
}

module.exports = { PROJECTIONS, IDE_ALIASES, resolveIdes, buildContext, generate };

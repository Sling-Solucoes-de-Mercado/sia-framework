'use strict';

/**
 * Parser de agentes (.sia-core/agents/{id}.md): um bloco ```yaml por arquivo.
 */

const path = require('path');
const { readText, listDir } = require('./fsutil');
const { extractYamlBlock, tryLoad } = require('./yaml');
const tracker = require('../../hooks/track-active-agent.cjs');

const AGENT_IDS = tracker.AGENT_IDS;
const AGENT_ALIASES = tracker.AGENT_ALIASES;
const BUILTIN_COMMANDS = Object.freeze(['help', 'guide', 'yolo', 'exit']);
const DEP_TYPES = Object.freeze(['tasks', 'templates', 'checklists', 'data', 'workflows', 'schemas']);
const COMMAND_KEYS = Object.freeze([
  'name', 'task', 'template', 'checklist', 'args', 'hat', 'lenses', 'scope', 'visibility', 'description',
]);
const VISIBILITY_VALUES = Object.freeze(['full', 'quick', 'key']);
const REQUIRED_AGENT_FIELDS = Object.freeze(['name', 'id', 'title', 'icon', 'whenToUse']);

/** Mapeia o tipo de referência de um comando para o tipo de dependência. */
const COMMAND_REF_TYPES = Object.freeze({ task: 'tasks', template: 'templates', checklist: 'checklists' });

/**
 * Normaliza a lista de comandos do YAML do agente.
 * Aceita { name, ... } (formato do SIA) e { nome: descrição } (forma curta).
 */
function normalizeCommands(list) {
  if (!Array.isArray(list)) return [];
  return list.map((entry, index) => {
    if (entry && typeof entry === 'object' && !Array.isArray(entry) && typeof entry.name === 'string') {
      const extraKeys = Object.keys(entry).filter((key) => !COMMAND_KEYS.includes(key));
      return {
        index,
        name: entry.name.trim(),
        task: entry.task || null,
        template: entry.template || null,
        checklist: entry.checklist || null,
        args: entry.args || null,
        hat: entry.hat || null,
        lenses: Array.isArray(entry.lenses) ? entry.lenses : null,
        scope: entry.scope || null,
        visibility: Array.isArray(entry.visibility) ? entry.visibility : null,
        description: typeof entry.description === 'string' ? entry.description : '',
        extraKeys,
        malformed: false,
      };
    }
    if (entry && typeof entry === 'object' && !Array.isArray(entry) && Object.keys(entry).length === 1) {
      const [name] = Object.keys(entry);
      return {
        index, name, task: null, template: null, checklist: null, args: null, hat: null, lenses: null,
        scope: null, visibility: null, description: String(entry[name] || ''), extraKeys: [], malformed: false,
      };
    }
    return {
      index, name: '', task: null, template: null, checklist: null, args: null, hat: null, lenses: null,
      scope: null, visibility: null, description: '', extraKeys: [], malformed: true,
    };
  });
}

/**
 * @param {string} file Caminho absoluto do .md do agente.
 */
function parseAgentFile(file) {
  const id = path.basename(file, '.md');
  const result = {
    id,
    file,
    raw: null,
    data: null,
    agent: null,
    commands: [],
    dependencies: {},
    hats: [],
    error: null,
  };
  const raw = readText(file);
  if (raw === null) {
    result.error = 'arquivo não encontrado';
    return result;
  }
  result.raw = raw;
  const block = extractYamlBlock(raw);
  if (!block) {
    result.error = 'bloco ```yaml não encontrado';
    return result;
  }
  const parsed = tryLoad(block.raw);
  if (parsed.error) {
    result.error = `YAML inválido: ${parsed.error}`;
    return result;
  }
  if (!parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
    result.error = 'o bloco YAML não é um objeto';
    return result;
  }
  result.data = parsed.data;
  result.agent = parsed.data.agent && typeof parsed.data.agent === 'object' ? parsed.data.agent : null;
  result.commands = normalizeCommands(parsed.data.commands);
  result.dependencies =
    parsed.data.dependencies && typeof parsed.data.dependencies === 'object' && !Array.isArray(parsed.data.dependencies)
      ? parsed.data.dependencies
      : {};
  result.hats = Array.isArray(parsed.data.hats) ? parsed.data.hats.filter((h) => h && typeof h === 'object') : [];
  return result;
}

/** Ordena pela ordem canônica dos 5 agentes e depois alfabeticamente. */
function sortAgents(agents) {
  const rank = (id) => {
    const index = AGENT_IDS.indexOf(id);
    return index === -1 ? AGENT_IDS.length : index;
  };
  return [...agents].sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
}

/** Carrega todos os agentes de um diretório (arquivos *.md que não começam com _). */
function loadAgents(dir) {
  const files = listDir(dir).filter((name) => name.endsWith('.md') && !name.startsWith('_'));
  return sortAgents(files.map((name) => parseAgentFile(path.join(dir, name))));
}

function collapse(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

/** Primeira frase de um texto (até . ! ? seguido de espaço ou fim). */
function firstSentence(text) {
  const normalized = collapse(text);
  if (!normalized) return '';
  const match = normalized.match(/^(.+?[.!?])(?:\s|$)/);
  return match ? match[1] : normalized;
}

/** Corta em `max` caracteres na fronteira de palavra, com reticências. */
function truncate(text, max) {
  const value = collapse(text);
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s,;:.\/(\-–]+$/, '')}…`;
}

/** Resumo de exibição de um agente parseado. */
function summarizeAgent(parsed) {
  const agent = parsed.agent || {};
  const persona = (parsed.data && parsed.data.persona) || {};
  const authority = (parsed.data && parsed.data.authority) || {};
  return {
    id: parsed.id,
    name: agent.name || parsed.id,
    title: agent.title || '',
    icon: agent.icon || '',
    aliases: Array.isArray(agent.aliases) ? agent.aliases.map(String) : [],
    whenToUse: collapse(agent.whenToUse),
    firstSentence: firstSentence(agent.whenToUse),
    role: collapse(persona.role),
    blocked: Array.isArray(authority.blocked) ? authority.blocked.map(String) : [],
    delegates: Array.isArray(authority.delegates) ? authority.delegates.map(String) : [],
  };
}

/** Comandos executáveis (com task) do agente. */
function taskCommands(parsed) {
  return parsed.commands.filter((cmd) => cmd.task);
}

/** Lista de entradas de um tipo de dependência (strings). */
function dependencyList(parsed, type) {
  const list = parsed.dependencies[type];
  return Array.isArray(list) ? list.filter((entry) => typeof entry === 'string') : [];
}

/** Id canônico a partir de id ou alias de ativação (mira, davi, lance, vera, elo). */
function resolveAgentId(token) {
  return tracker.resolveAgentId(token);
}

module.exports = {
  AGENT_IDS,
  AGENT_ALIASES,
  BUILTIN_COMMANDS,
  DEP_TYPES,
  COMMAND_KEYS,
  COMMAND_REF_TYPES,
  VISIBILITY_VALUES,
  REQUIRED_AGENT_FIELDS,
  normalizeCommands,
  parseAgentFile,
  loadAgents,
  sortAgents,
  firstSentence,
  truncate,
  collapse,
  summarizeAgent,
  taskCommands,
  dependencyList,
  resolveAgentId,
};

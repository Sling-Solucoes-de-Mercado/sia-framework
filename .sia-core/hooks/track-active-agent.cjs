#!/usr/bin/env node
'use strict';

/**
 * SIA: rastreador do agente ativo.
 *
 * Evento: UserPromptSubmit (Claude Code, Codex, Grok) ou BeforeAgent (Gemini CLI).
 * Lê o prompt do stdin (prompt | userPrompt | user_prompt | input.prompt) e, quando ele
 * começa com a ativação de um agente do SIA, grava .sia/active-agent.json:
 *   {"id": "devops", "source": "hook", "at": "ISO-8601"}
 *
 * Ativações reconhecidas no início do prompt (ids e aliases dos 5 agentes):
 *   /sia-{id}            skill/comando de agente (Claude Code, Gemini, Grok)
 *   $sia-{id}            menção de skill no Codex
 *   /SIA:agents:{id}     comando legado do Claude Code (prefixo de ide.slashPrefix)
 *   @{id}                ativação por menção
 * Um prompt que é só `*exit` remove o arquivo.
 *
 * Contrato: sempre sai com 0, nunca escreve no stdout e nunca lança exceção.
 * O arquivo é lido pelo hook enforce-git-push-authority.cjs e por `sia agent current`.
 */

const fs = require('fs');
const path = require('path');

const AGENT_IDS = Object.freeze(['pm', 'dev', 'devops', 'validator', 'squad-creator']);
const AGENT_ALIASES = Object.freeze({
  mira: 'pm',
  davi: 'dev',
  lance: 'devops',
  vera: 'validator',
  elo: 'squad-creator',
});
const BRIDGE_DIR = '.sia';
const BRIDGE_FILE = 'active-agent.json';
const DEFAULT_SLASH_PREFIX = 'SIA';

/**
 * Converte id ou alias (com ou sem @) no id canônico do agente.
 * @param {string} token
 * @returns {string|null}
 */
function resolveAgentId(token) {
  const value = String(token || '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '');
  if (AGENT_IDS.includes(value)) return value;
  if (Object.prototype.hasOwnProperty.call(AGENT_ALIASES, value)) return AGENT_ALIASES[value];
  return null;
}

/** Extrai o texto do prompt dos formatos de payload conhecidos. */
function extractPrompt(input) {
  if (!input || typeof input !== 'object') return '';
  const candidates = [
    input.prompt,
    input.userPrompt,
    input.user_prompt,
    input.input && input.input.prompt,
  ];
  const found = candidates.find((value) => typeof value === 'string');
  return found || '';
}

/**
 * Detecta ativação ou saída no início do prompt.
 * @param {string} prompt
 * @param {string[]} [slashPrefixes] prefixos aceitos em /{prefixo}:agents:{id}
 * @returns {{ action: 'set', id: string, via: string }|{ action: 'clear' }|null}
 */
function detectActivation(prompt, slashPrefixes = [DEFAULT_SLASH_PREFIX]) {
  const text = String(prompt || '').replace(/^\s+/, '');
  if (/^\*exit\s*$/i.test(text)) return { action: 'clear' };

  let match = text.match(/^[/$]sia-([a-z][a-z0-9-]*)(?=$|\s)/i);
  if (match) {
    const id = resolveAgentId(match[1]);
    if (id) return { action: 'set', id, via: match[0] };
  }

  match = text.match(/^\/([A-Za-z0-9_-]+):agents:([a-z][a-z0-9-]*)(?=$|\s)/i);
  if (match) {
    const prefixes = slashPrefixes.map((p) => String(p).toLowerCase());
    const id = resolveAgentId(match[2]);
    if (id && prefixes.includes(match[1].toLowerCase())) return { action: 'set', id, via: match[0] };
  }

  match = text.match(/^@([a-z][a-z0-9-]*)(?=$|[\s,:;!?])/i);
  if (match) {
    const id = resolveAgentId(match[1]);
    if (id) return { action: 'set', id, via: match[0] };
  }
  return null;
}

/** Sobe a partir do cwd do payload (ou do processo) até achar o .sia-core. */
function findProjectRoot(input) {
  const candidates = [
    input && input.cwd,
    input && input.workspaceRoot,
    input && input.workspace_root,
    process.env.CLAUDE_PROJECT_DIR,
    process.env.GEMINI_PROJECT_DIR,
    process.env.GROK_WORKSPACE_ROOT,
    process.cwd(),
  ].filter((value) => typeof value === 'string' && value);
  for (const start of candidates) {
    let dir = path.resolve(start);
    for (let depth = 0; depth < 64; depth += 1) {
      if (fs.existsSync(path.join(dir, '.sia-core'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return path.resolve(candidates[0] || process.cwd());
}

/** Prefixo de ide.slashPrefix lido do core-config sem parser YAML (falha silenciosa). */
function readSlashPrefix(root) {
  try {
    const text = fs.readFileSync(path.join(root, '.sia-core', 'core-config.yaml'), 'utf8');
    const match = text.match(/^\s*slashPrefix:\s*['"]?([A-Za-z0-9_-]+)['"]?/m);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function bridgePath(root) {
  return path.join(root, BRIDGE_DIR, BRIDGE_FILE);
}

/** Grava o agente ativo de forma atômica. */
function writeActiveAgent(root, id, source, now = new Date()) {
  const file = bridgePath(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const payload = `${JSON.stringify({ id, source, at: now.toISOString() })}\n`;
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, payload, 'utf8');
  fs.renameSync(tmp, file);
  return file;
}

function clearActiveAgent(root) {
  const file = bridgePath(root);
  try {
    fs.unlinkSync(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * Processa um payload cru (texto do stdin).
 * @returns {{ action: 'set'|'clear'|'none', id?: string, file?: string }}
 */
function handle(rawInput) {
  let input = null;
  try {
    input = JSON.parse(rawInput || '');
  } catch {
    input = null;
  }
  const prompt = extractPrompt(input);
  if (!prompt) return { action: 'none' };
  const root = findProjectRoot(input);
  const prefixes = [DEFAULT_SLASH_PREFIX];
  if (prompt.trimStart().startsWith('/') && /:agents:/i.test(prompt)) {
    const configured = readSlashPrefix(root);
    if (configured && !prefixes.includes(configured)) prefixes.push(configured);
  }
  const detected = detectActivation(prompt, prefixes);
  if (!detected) return { action: 'none' };
  if (detected.action === 'clear') {
    clearActiveAgent(root);
    return { action: 'clear', file: bridgePath(root) };
  }
  const file = writeActiveAgent(root, detected.id, 'hook');
  return { action: 'set', id: detected.id, file };
}

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function main() {
  try {
    handle(readStdin());
  } catch {
    // Nunca bloqueia o prompt: falhas do rastreador são silenciosas.
  }
  process.exitCode = 0;
}

if (require.main === module) {
  main();
}

module.exports = {
  AGENT_IDS,
  AGENT_ALIASES,
  BRIDGE_DIR,
  BRIDGE_FILE,
  resolveAgentId,
  extractPrompt,
  detectActivation,
  findProjectRoot,
  bridgePath,
  writeActiveAgent,
  clearActiveAgent,
  handle,
};

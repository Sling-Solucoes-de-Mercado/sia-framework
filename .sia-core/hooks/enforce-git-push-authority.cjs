#!/usr/bin/env node
'use strict';

/**
 * SIA: hook de autoridade do @devops (Constitution, Artigo II).
 *
 * Evento: PreToolUse (Claude Code, Codex, Grok) ou BeforeTool (Gemini CLI), antes do shell.
 * Bloqueia operações remotas exclusivas do @devops quando o agente ativo não é o @devops:
 *   - git push (inclusive com opções globais: -C, -c, --git-dir, --no-pager...)
 *   - gh pr create | gh pr merge
 *   - gh api com mutação em pulls (-X POST|PUT|PATCH, -f/-F/--field/--raw-field/--input)
 *     e gh api graphql com createPullRequest/mergePullRequest
 *   - gh release create
 *   - deploy de produção na Vercel: vercel --prod, vercel deploy --prod, vercel promote,
 *     vercel rollback (também --target production e redeploy de produção)
 *
 * Identidade do agente (a primeira fonte disponível decide):
 *   1. .sia/active-agent.json fresco (mtime há menos de 8 h e não no futuro)
 *   2. variável de ambiente SIA_ACTIVE_AGENT
 *   3. prefixo `SIA_ACTIVE_AGENT=devops` no próprio comando
 * Permitidos: devops, lance, sia-devops (com ou sem @).
 *
 * Saída: permitir = exit 0 sem saída. Negar = exit 2, motivo no stderr e, no stdout,
 * {decision:'block', reason, hookSpecificOutput:{hookEventName:'PreToolUse',
 * permissionDecision:'deny', permissionDecisionReason}}.
 * Stdin inválido: permite, exceto se o texto cru casar com um padrão bloqueado.
 *
 * É um guarda-corpo de governança cooperativo, não uma fronteira de segurança:
 * qualquer processo do workspace pode escrever o arquivo de agente ativo.
 * Sem dependências; nunca lança exceção.
 */

const fs = require('fs');
const path = require('path');

const BRIDGE_TTL_MS = 8 * 60 * 60 * 1000;
// Tolerância para relógios e sistemas de arquivos com granularidade grossa.
const FUTURE_TOLERANCE_MS = 5 * 1000;
const DEVOPS_ALLOWLIST = new Set(['devops', 'lance', 'sia-devops']);

// O git aceita opções globais entre `git` e o subcomando; sem isso o padrão seria contornável.
const GIT_GLOBAL_OPTIONS =
  '(?:-[Cc]\\s+\\S+' +
  '|--(?:git-dir|work-tree|namespace|super-prefix|config-env)(?:=\\S+|\\s+\\S+)' +
  '|--exec-path(?:=\\S+)?' +
  '|-[pP]\\b' +
  '|--(?:no-pager|paginate|bare|literal-pathspecs|glob-pathspecs' +
  '|noglob-pathspecs|icase-pathspecs|no-optional-locks|no-replace-objects' +
  '|no-lazy-fetch|no-advice))';

// Opção genérica do gh (`--repo o/r`, `-R o/r`, `--verbose`), antes ou depois do subcomando.
const GH_OPTION = '(?:-{1,2}[\\w-]+(?:[=\\s]+\\S+)?)';

const REGEX_OPERATIONS = [
  {
    operation: 'git push',
    pattern: new RegExp(`\\bgit(?:\\s+${GIT_GLOBAL_OPTIONS})*\\s+push\\b`, 'i'),
  },
  {
    operation: 'gh pr create',
    pattern: new RegExp(`\\bgh(?:\\s+${GH_OPTION})*\\s+pr(?:\\s+${GH_OPTION})*\\s+create\\b`, 'i'),
  },
  {
    operation: 'gh pr merge',
    pattern: new RegExp(`\\bgh(?:\\s+${GH_OPTION})*\\s+pr(?:\\s+${GH_OPTION})*\\s+merge\\b`, 'i'),
  },
  {
    // Criação/merge de PR pela API REST. Leituras (GET) continuam permitidas.
    operation: 'gh api (mutação de pull request)',
    pattern: new RegExp(
      `\\bgh(?:\\s+${GH_OPTION})*\\s+api\\b(?=[^\\n]*\\/pulls\\b)[^\\n]*` +
        '(?:\\s(?:-X|--method)[=\\s]*(?:POST|PUT|PATCH)\\b|\\s(?:-f|-F|--field|--raw-field|--input)(?:[=\\s]|$))',
      'i',
    ),
  },
  {
    operation: 'gh api graphql (mutação de pull request)',
    pattern: new RegExp(
      `\\bgh(?:\\s+${GH_OPTION})*\\s+api(?:\\s+${GH_OPTION})*\\s+graphql\\b` +
        '(?=[\\s\\S]*\\bmutation\\b)(?=[\\s\\S]*\\b(?:createPullRequest|mergePullRequest)\\s*\\()',
      'i',
    ),
  },
  {
    operation: 'gh release create',
    pattern: new RegExp(`\\bgh(?:\\s+${GH_OPTION})*\\s+release(?:\\s+${GH_OPTION})*\\s+create\\b`, 'i'),
  },
];

// Opções da Vercel CLI que consomem o próximo token como valor.
const VERCEL_VALUE_FLAGS = new Set([
  '--scope', '-S', '--token', '-t', '--cwd', '--local-config', '-A', '--global-config', '-Q',
  '--team', '-T', '--archive', '--env', '-e', '--build-env', '-b', '--meta', '-m', '--regions',
  '--project',
]);
const VERCEL_DEPLOY_SUBCOMMANDS = new Set(['deploy', 'redeploy']);

function normalizeCommand(command) {
  return String(command || '')
    .replace(/\\\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripQuotes(token) {
  return String(token).replace(/^['"]+|['"]+$/g, '');
}

function looksLikePath(token) {
  return /^[.~/]/.test(token) || token.includes('/');
}

/** Deploy de produção na Vercel, analisando cada comando da linha. */
function findVercelProductionOperation(command) {
  const text = String(command || '').replace(/\\\r?\n/g, ' ');
  const segments = text.split(/&&|\|\||[;|\n()`]/);
  for (const segment of segments) {
    const tokens = segment.trim().split(/\s+/).filter(Boolean).map(stripQuotes);
    for (let start = 0; start < tokens.length; start += 1) {
      if (!/(^|\/)(vercel|vc)$/.test(tokens[start])) continue;
      let subcommand = null;
      let production = false;
      for (let i = start + 1; i < tokens.length; i += 1) {
        const token = tokens[i];
        if (/(^|\/)(vercel|vc)$/.test(token)) break;
        if (token === '--prod' || token === '--production' || /^--prod=(true|1)$/i.test(token)) {
          production = true;
        } else if (/^--target=production$/i.test(token)) {
          production = true;
        } else if (token === '--target') {
          if (/^production$/i.test(tokens[i + 1] || '')) production = true;
          i += 1;
        } else if (token.startsWith('-')) {
          if (!token.includes('=') && VERCEL_VALUE_FLAGS.has(token)) i += 1;
        } else if (subcommand === null) {
          subcommand = token.toLowerCase();
        }
      }
      if (subcommand === 'promote' || subcommand === 'rollback') {
        return { operation: `vercel ${subcommand} (produção)` };
      }
      if (
        production &&
        (subcommand === null || VERCEL_DEPLOY_SUBCOMMANDS.has(subcommand) || looksLikePath(subcommand))
      ) {
        return { operation: 'vercel --prod (deploy de produção)' };
      }
    }
  }
  return null;
}

/**
 * Operação bloqueável presente no comando, ou null.
 * @param {string} command
 * @returns {{ operation: string }|null}
 */
function findRemoteOperation(command) {
  const normalized = normalizeCommand(command);
  if (!normalized) return null;
  const regexHit = REGEX_OPERATIONS.find(({ pattern }) => pattern.test(normalized));
  if (regexHit) return { operation: regexHit.operation };
  return findVercelProductionOperation(command);
}

/** Comando de shell nos formatos de payload conhecidos. */
function extractCommand(input) {
  if (!input || typeof input !== 'object') return '';
  const candidates = [
    input.tool_input && input.tool_input.command,
    input.toolInput && input.toolInput.command,
    input.cmd,
    input.input && input.input.command,
    input.parameters && input.parameters.command,
    input.tool_input && input.tool_input.cmd,
    input.toolInput && input.toolInput.cmd,
  ];
  const found = candidates.find((value) => typeof value === 'string' && value);
  return found || '';
}

/** Sobe a partir do cwd do payload (ou do processo) até achar o .sia-core. */
function findProjectRoot(input, env = process.env, cwd = process.cwd()) {
  const candidates = [
    input && input.cwd,
    input && input.workspaceRoot,
    input && input.workspace_root,
    env.CLAUDE_PROJECT_DIR,
    env.GEMINI_PROJECT_DIR,
    env.GROK_WORKSPACE_ROOT,
    cwd,
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
  return path.resolve(candidates[0] || cwd);
}

function normalizeAgent(id) {
  return String(id || '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '');
}

/**
 * Lê .sia/active-agent.json.
 * @returns {{ state: 'fresh'|'stale'|'missing'|'invalid', id?: string, file: string }}
 */
function readBridge(root, now = Date.now()) {
  const file = path.join(root, '.sia', 'active-agent.json');
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return { state: 'missing', file };
  }
  const age = now - stat.mtimeMs;
  if (age < -FUTURE_TOLERANCE_MS || age >= BRIDGE_TTL_MS) return { state: 'stale', file };
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return { state: 'invalid', file };
  }
  const id = data && typeof data === 'object' ? data.id : null;
  if (!id || typeof id !== 'string') return { state: 'invalid', file };
  return { state: 'fresh', id: normalizeAgent(id), file };
}

function commandScopedAgent(command) {
  const match = String(command || '').match(
    /(?:^|[\s;&|(])(?:export\s+|env\s+)?SIA_ACTIVE_AGENT=["']?(@?[A-Za-z0-9_-]+)["']?/,
  );
  return match ? normalizeAgent(match[1]) : '';
}

/**
 * Resolve quem está executando o comando.
 * @returns {{ id: string, source: 'bridge'|'env'|'prefix'|'none', bridge: object }}
 */
function resolveIdentity(command, input, options = {}) {
  const env = options.env || process.env;
  const root = findProjectRoot(input, env, options.cwd || process.cwd());
  const bridge = readBridge(root, options.now || Date.now());
  if (bridge.state === 'fresh') return { id: bridge.id, source: 'bridge', bridge };
  if (env.SIA_ACTIVE_AGENT && String(env.SIA_ACTIVE_AGENT).trim()) {
    return { id: normalizeAgent(env.SIA_ACTIVE_AGENT), source: 'env', bridge };
  }
  const scoped = commandScopedAgent(command);
  if (scoped) return { id: scoped, source: 'prefix', bridge };
  return { id: '', source: 'none', bridge };
}

function isDevopsAgent(id) {
  return DEVOPS_ALLOWLIST.has(normalizeAgent(id));
}

const SOURCE_LABEL = {
  bridge: '.sia/active-agent.json',
  env: 'variável SIA_ACTIVE_AGENT',
  prefix: 'prefixo SIA_ACTIVE_AGENT no comando',
  none: 'nenhuma fonte',
};

function denyReason(operation, identity) {
  const who = identity.id ? `@${identity.id}` : 'desconhecido';
  return (
    `Bloqueado pelo SIA (Constitution, Artigo II): \`${operation}\` é exclusivo do @devops. ` +
    `Agente ativo: ${who} (${SOURCE_LABEL[identity.source] || identity.source}). ` +
    'Ative o @devops com /sia-devops (ou `sia agent use devops`) e repita a operação; ' +
    'não tente contornar o bloqueio.'
  );
}

/**
 * Decide sobre um payload cru.
 * @param {string} rawInput
 * @param {{ env?: NodeJS.ProcessEnv, cwd?: string, now?: number }} [options]
 * @returns {{ action: 'allow'|'deny', operation?: string, reason?: string, identity?: object }}
 */
function decide(rawInput, options = {}) {
  const raw = String(rawInput || '');
  if (!raw.trim()) return { action: 'allow' };
  let input = null;
  let command = '';
  try {
    input = JSON.parse(raw);
    command = extractCommand(input);
  } catch {
    input = null;
    command = raw;
  }
  if (input !== null && (typeof input !== 'object' || Array.isArray(input))) {
    input = null;
    command = raw;
  }
  const hit = findRemoteOperation(command);
  if (!hit) return { action: 'allow' };
  const identity = resolveIdentity(command, input, options);
  if (isDevopsAgent(identity.id)) return { action: 'allow', operation: hit.operation, identity };
  return { action: 'deny', operation: hit.operation, reason: denyReason(hit.operation, identity), identity };
}

function emitDeny(reason) {
  const payload = {
    decision: 'block',
    reason,
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  };
  process.stdout.write(JSON.stringify(payload));
  process.stderr.write(`${reason}\n`);
  process.exitCode = 2;
}

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function main() {
  let raw = '';
  try {
    raw = readStdin();
    const result = decide(raw);
    if (result.action === 'deny') {
      emitDeny(result.reason);
      return;
    }
    process.exitCode = 0;
  } catch {
    // Falha interna: só bloqueia se o texto cru for uma operação exclusiva do @devops.
    try {
      const hit = findRemoteOperation(raw);
      if (hit) {
        emitDeny(denyReason(hit.operation, { id: '', source: 'none' }));
        return;
      }
    } catch {
      // segue permitindo
    }
    process.exitCode = 0;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  BRIDGE_TTL_MS,
  DEVOPS_ALLOWLIST,
  normalizeCommand,
  findRemoteOperation,
  findVercelProductionOperation,
  extractCommand,
  findProjectRoot,
  readBridge,
  resolveIdentity,
  isDevopsAgent,
  denyReason,
  decide,
};

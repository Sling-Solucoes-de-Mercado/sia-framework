'use strict';

/**
 * sia mcp setup {servidor} [--ide lista] [--dry-run] [--json]
 * sia mcp status [--json]
 * Lê .sia-core/data/mcp-servers.yaml. Não altera o core-config (só lembra de integrations.{id}.enabled).
 */

const path = require('path');
const mcp = require('../lib/mcp');
const { readText, writeFileAtomic, toPosix } = require('../lib/fsutil');
const { get, ideTargets } = require('../lib/config');
const { IDE_ALIASES } = require('../projections');
const { EXIT, SiaError } = require('../lib/errors');

function normalizeIde(name) {
  const key = String(name || '').trim().toLowerCase();
  return IDE_ALIASES[key] || key;
}

function ideFormat(def) {
  if (def.format === 'json' || def.format === 'toml') return def.format;
  return /\.toml$/i.test(String(def.file || '')) ? 'toml' : 'json';
}

function ideKey(def, format) {
  return def.key || (format === 'toml' ? 'mcp_servers' : 'mcpServers');
}

function displayPath(root, file) {
  const rel = path.relative(root, file);
  return rel.startsWith('..') ? file : toPosix(rel);
}

/** Planeja a escrita de um servidor em uma IDE. */
function planIde(root, data, serverId, ide, url) {
  const def = data.ides[ide];
  if (!def || typeof def !== 'object') return { ide, action: 'skipped', reason: 'IDE sem formato em mcp-servers.yaml' };
  if (def.unsupported) return { ide, action: 'unsupported', reason: String(def.unsupported) };
  if (!def.file) return { ide, action: 'skipped', reason: 'campo file ausente em mcp-servers.yaml' };
  const file = mcp.resolveIdeFile(root, def.file);
  const format = ideFormat(def);
  const key = ideKey(def, format);
  const entry = mcp.renderEntry(def.entry || {}, { url, id: serverId });
  const current = readText(file);
  let next;
  try {
    next = format === 'toml' ? mcp.mergeTomlConfig(current, key, serverId, entry) : mcp.mergeJsonConfig(current, key, serverId, entry);
  } catch (error) {
    return { ide, action: 'error', file, path: displayPath(root, file), reason: error.message };
  }
  const action = current === null ? 'create' : current === next ? 'unchanged' : 'update';
  const login = def.login ? String(mcp.renderEntry(String(def.login), { url, id: serverId })) : null;
  return { ide, action, file, path: displayPath(root, file), format, key, entry, content: next, login };
}

function setup(ctx) {
  const [, serverId, extra] = ctx.positionals;
  if (!serverId) ctx.usage('informe o servidor: sia mcp setup {servidor}');
  if (extra) ctx.usage(`argumento inesperado: ${extra}`);
  const { root, coreDir } = ctx.root;
  const { data } = mcp.requireMcpData(coreDir);
  const server = data.servers[serverId];
  if (!server || typeof server !== 'object') {
    ctx.usage(`servidor desconhecido: ${serverId}. Disponíveis: ${Object.keys(data.servers).join(', ') || 'nenhum'}.`);
  }
  const requested = ctx.values.ide ? ctx.values.ide.split(',').map(normalizeIde).filter(Boolean) : ideTargets(ctx.config).map(normalizeIde);
  const ides = [...new Set(requested)];
  const url = mcp.buildServerUrl(server, ctx.config);
  const results = ides.map((ide) => planIde(root, data, serverId, ide, url));
  if (!ctx.values['dry-run']) {
    for (const result of results) {
      if (result.action === 'create' || result.action === 'update') writeFileAtomic(result.file, result.content);
    }
  }
  const enabled = get(ctx.config, `integrations.${serverId}.enabled`) === true;
  const report = {
    server: serverId,
    name: server.name || serverId,
    url,
    auth: server.auth || null,
    env: Array.isArray(server.env) ? server.env : [],
    docs: server.docs || null,
    notes: server.notes || null,
    dryRun: Boolean(ctx.values['dry-run']),
    enabledInConfig: enabled,
    ides: results.map(({ content, file, ...rest }) => rest),
  };
  const failed = results.some((result) => result.action === 'error');
  report.ok = !failed;
  if (ctx.out.json) {
    ctx.out.printJson(report);
    return failed ? EXIT.FAILURE : EXIT.OK;
  }
  const { out } = ctx;
  const { c } = out;
  out.heading(`sia mcp setup ${serverId}${report.dryRun ? ' --dry-run' : ''}: ${report.name}`);
  out.kv('URL', url);
  const verb = { create: 'criado', update: 'atualizado', unchanged: 'sem mudança' };
  for (const result of results) {
    if (result.action === 'unsupported') out.warn(`${result.ide}: não suportado (${result.reason})`);
    else if (result.action === 'skipped') out.warn(`${result.ide}: ignorado (${result.reason})`);
    else if (result.action === 'error') out.fail(`${result.ide}: ${result.path}: ${result.reason}`);
    else {
      out.ok(`${result.ide}: ${result.path} ${c.gray(`(${verb[result.action]}${report.dryRun ? ', simulação' : ''})`)}`);
      if (result.login) out.hint(`login: ${result.login}`);
    }
  }
  if (report.env.length > 0) out.info(`Variáveis de ambiente usadas: ${report.env.join(', ')} (defina fora do repositório; a CLI não grava segredos).`);
  if (report.auth) out.info(`Autenticação: ${report.auth}${report.docs ? ` · documentação: ${report.docs}` : ''}`);
  if (report.notes) out.info(String(report.notes).trim());
  if (!enabled) out.warn(`Lembrete: ajuste integrations.${serverId}.enabled: true em .sia-core/core-config.yaml (a CLI não altera o core-config).`);
  return failed ? EXIT.FAILURE : EXIT.OK;
}

function remove(ctx) {
  const [, serverId, extra] = ctx.positionals;
  if (!serverId) ctx.usage('informe o servidor: sia mcp remove {servidor}');
  if (extra) ctx.usage(`argumento inesperado: ${extra}`);
  const { root, coreDir } = ctx.root;
  const { data } = mcp.requireMcpData(coreDir);
  if (!data.servers[serverId]) {
    ctx.usage(`servidor desconhecido: ${serverId}. Disponíveis: ${Object.keys(data.servers).join(', ') || 'nenhum'}.`);
  }
  const requested = ctx.values.ide ? ctx.values.ide.split(',').map(normalizeIde).filter(Boolean) : ideTargets(ctx.config).map(normalizeIde);
  const results = [];
  for (const ide of [...new Set(requested)]) {
    const def = data.ides[ide];
    if (!def || typeof def !== 'object') {
      results.push({ ide, action: 'skipped', reason: 'IDE sem formato em mcp-servers.yaml' });
      continue;
    }
    if (def.unsupported) {
      results.push({ ide, action: 'unsupported', reason: String(def.unsupported) });
      continue;
    }
    const file = mcp.resolveIdeFile(root, def.file);
    const format = ideFormat(def);
    const key = ideKey(def, format);
    const current = readText(file);
    try {
      const outcome = format === 'toml' ? mcp.removeTomlBlock(current, key, serverId) : mcp.removeJsonEntry(current, key, serverId);
      if (outcome.removed && !ctx.values['dry-run']) writeFileAtomic(file, outcome.text);
      const action = outcome.removed ? 'removed' : outcome.outside ? 'outside' : 'absent';
      results.push({ ide, action, path: displayPath(root, file) });
    } catch (error) {
      results.push({ ide, action: 'error', path: displayPath(root, file), reason: error.message });
    }
  }
  const failed = results.some((result) => result.action === 'error');
  const report = { server: serverId, dryRun: Boolean(ctx.values['dry-run']), ides: results, ok: !failed };
  if (ctx.out.json) {
    ctx.out.printJson(report);
    return failed ? EXIT.FAILURE : EXIT.OK;
  }
  const { out } = ctx;
  out.heading(`sia mcp remove ${serverId}${report.dryRun ? ' --dry-run' : ''}`);
  for (const result of results) {
    if (result.action === 'removed') out.ok(`${result.ide}: entrada removida de ${result.path}${report.dryRun ? out.c.gray(' (simulação)') : ''}`);
    else if (result.action === 'absent') out.info(`${result.ide}: nada a remover em ${result.path}`);
    else if (result.action === 'outside') out.warn(`${result.ide}: ${result.path} tem a tabela fora do bloco gerenciado do SIA; remova à mão`);
    else if (result.action === 'unsupported') out.warn(`${result.ide}: não suportado (${result.reason})`);
    else if (result.action === 'skipped') out.warn(`${result.ide}: ignorado (${result.reason})`);
    else out.fail(`${result.ide}: ${result.path}: ${result.reason}`);
  }
  if (get(ctx.config, `integrations.${serverId}.enabled`) === true) {
    out.warn(`Lembrete: integrations.${serverId}.enabled continua true no core-config (a CLI não o altera).`);
  }
  return failed ? EXIT.FAILURE : EXIT.OK;
}

/** Matriz servidor × IDE (também usada pelo doctor). */
function collectStatus(root, coreDir, config) {
  const loaded = mcp.loadMcpData(coreDir);
  if (!loaded.exists || loaded.error) return { available: false, error: loaded.error, file: loaded.file, servers: {} };
  const { data } = loaded;
  const servers = {};
  for (const [serverId, server] of Object.entries(data.servers)) {
    const ides = {};
    for (const [ide, def] of Object.entries(data.ides)) {
      if (!def || typeof def !== 'object') continue;
      if (def.unsupported) {
        ides[ide] = { configured: false, unsupported: String(def.unsupported) };
        continue;
      }
      const file = mcp.resolveIdeFile(root, def.file);
      const format = ideFormat(def);
      const key = ideKey(def, format);
      const text = readText(file);
      const configured = format === 'toml' ? mcp.isConfiguredToml(text, key, serverId) : mcp.isConfiguredJson(text, key, serverId);
      ides[ide] = { configured, file: displayPath(root, file) };
    }
    servers[serverId] = {
      name: (server && server.name) || serverId,
      enabled: get(config, `integrations.${serverId}.enabled`) === true,
      ides,
    };
  }
  return { available: true, error: null, file: loaded.file, servers, targets: ideTargets(config).map(normalizeIde) };
}

function status(ctx) {
  if (ctx.positionals.length > 1) ctx.usage(`argumento inesperado: ${ctx.positionals[1]}`);
  const { root, coreDir } = ctx.root;
  const result = collectStatus(root, coreDir, ctx.config);
  if (!result.available) {
    if (result.error) throw new SiaError(`.sia-core/data/mcp-servers.yaml inválido: ${result.error}`);
    mcp.requireMcpData(coreDir);
  }
  if (ctx.out.json) {
    ctx.out.printJson(result);
    return EXIT.OK;
  }
  const { out } = ctx;
  const { c } = out;
  out.heading('sia mcp status');
  for (const [serverId, server] of Object.entries(result.servers)) {
    out.line(`${c.bold(serverId)} ${c.gray(`(${server.name})`)} · integrations.${serverId}.enabled: ${server.enabled ? c.green('true') : c.gray('false')}`);
    for (const [ide, info] of Object.entries(server.ides)) {
      const target = result.targets.includes(ide) ? '' : c.gray(' (fora de ide.targets)');
      if (info.unsupported) out.line(`    ${c.gray('—')} ${ide}: não suportado (${info.unsupported})`);
      else if (info.configured) out.line(`    ${c.green(out.sym.ok)} ${ide}: configurado em ${info.file}${target}`);
      else out.line(`    ${server.enabled ? c.yellow(out.sym.warn) : c.gray('·')} ${ide}: não configurado (${info.file})${target}`);
    }
  }
  return EXIT.OK;
}

module.exports = {
  name: 'mcp',
  summary: 'Configura (setup), remove (remove) e confere (status) os MCPs nas IDEs',
  usage:
    'sia mcp setup {servidor} [--ide claude-code,codex,gemini,grok] [--dry-run] [--json]\n' +
    '       sia mcp remove {servidor} [--ide lista] [--dry-run] [--json]\n' +
    '       sia mcp status [--json]',
  options: { ide: { type: 'string' }, 'dry-run': { type: 'boolean' } },
  needsRoot: true,
  run(ctx) {
    const [sub] = ctx.positionals;
    if (sub === 'setup') return setup(ctx);
    if (sub === 'remove') return remove(ctx);
    if (sub === 'status') return status(ctx);
    return ctx.usage(sub ? `subcomando desconhecido: ${sub}` : 'informe o subcomando: setup, remove ou status');
  },
  collectStatus,
  planIde,
};

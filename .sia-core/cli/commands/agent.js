'use strict';

/**
 * sia agent use {id} | current | clear [--json]
 * Registra, mostra ou limpa o agente ativo em .sia/active-agent.json ({id, source: 'cli', at}).
 * O arquivo é lido pelo hook enforce-git-push-authority (válido por 8 h).
 */

const path = require('path');
const tracker = require('../../hooks/track-active-agent.cjs');
const authority = require('../../hooks/enforce-git-push-authority.cjs');
const { readJson, mtimeMs, toPosix } = require('../lib/fsutil');
const { AGENT_IDS, AGENT_ALIASES } = require('../lib/agents');
const { EXIT } = require('../lib/errors');

function current(root, now = Date.now()) {
  const file = tracker.bridgePath(root);
  const read = readJson(file);
  if (!read.exists) return { active: false, file };
  const mtime = mtimeMs(file);
  const bridge = authority.readBridge(root, now);
  return {
    active: true,
    file,
    id: read.data && read.data.id ? String(read.data.id) : null,
    source: read.data && read.data.source ? String(read.data.source) : null,
    at: read.data && read.data.at ? String(read.data.at) : null,
    fresh: bridge.state === 'fresh',
    state: bridge.state,
    ageMinutes: mtime === null ? null : Math.round((now - mtime) / 60000),
    error: read.error || null,
  };
}

module.exports = {
  name: 'agent',
  summary: 'Registra, mostra ou limpa o agente ativo (.sia/active-agent.json)',
  usage: 'sia agent use {id} | sia agent current | sia agent clear',
  options: {},
  needsRoot: true,
  run(ctx) {
    const [sub, id, extra] = ctx.positionals;
    const { root } = ctx.root;
    const { out } = ctx;
    const accepted = [...AGENT_IDS, ...Object.keys(AGENT_ALIASES)].join(', ');
    if (sub === 'use') {
      if (!id) ctx.usage(`informe o agente: ${accepted}`);
      if (extra) ctx.usage(`argumento inesperado: ${extra}`);
      const resolved = tracker.resolveAgentId(id);
      if (!resolved) ctx.usage(`agente desconhecido: ${id}. Aceitos: ${accepted}.`);
      const file = tracker.writeActiveAgent(root, resolved, 'cli');
      const data = readJson(file).data;
      if (out.json) out.printJson({ ok: true, ...data, file: toPosix(path.relative(root, file)) });
      else out.ok(`Agente ativo: @${resolved} (${toPosix(path.relative(root, file))}, válido por 8 h para o hook de autoridade).`);
      return EXIT.OK;
    }
    if (sub === 'current') {
      if (id) ctx.usage(`argumento inesperado: ${id}`);
      const info = current(root);
      if (out.json) {
        out.printJson({ ...info, file: toPosix(path.relative(root, info.file)) });
        return EXIT.OK;
      }
      if (!info.active) out.info('Nenhum agente ativo registrado.');
      else if (info.error || !info.id) out.warn(`Arquivo de agente ativo ilegível: ${toPosix(path.relative(root, info.file))}`);
      else {
        const freshness = info.fresh ? out.c.green('válido para o hook') : out.c.yellow('expirado (mais de 8 h) ou com data no futuro');
        out.ok(`Agente ativo: @${info.id} · fonte ${info.source || '?'} · ${info.at || '?'} · ${freshness}`);
      }
      return EXIT.OK;
    }
    if (sub === 'clear') {
      if (id) ctx.usage(`argumento inesperado: ${id}`);
      const removed = tracker.clearActiveAgent(root);
      if (out.json) out.printJson({ ok: true, removed });
      else out.ok(removed ? 'Agente ativo removido.' : 'Nenhum agente ativo para remover.');
      return EXIT.OK;
    }
    return ctx.usage(sub ? `subcomando desconhecido: ${sub}` : 'informe o subcomando: use, current ou clear');
  },
  current,
};

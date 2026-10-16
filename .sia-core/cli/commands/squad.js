'use strict';

/**
 * sia squad list [--json]
 */

const path = require('path');
const { listDir, isDir, isFile, readText, toPosix } = require('../lib/fsutil');
const { tryLoad, scalarToString } = require('../lib/yaml');
const { projectPath } = require('../lib/config');
const { EXIT } = require('../lib/errors');

function listSquads(root, config) {
  const dir = projectPath(root, config, 'squads');
  const squads = [];
  for (const name of listDir(dir)) {
    const squadDir = path.join(dir, name);
    if (name.startsWith('.') || !isDir(squadDir)) continue;
    const manifest = ['squad.yaml', 'squad.yml'].map((f) => path.join(squadDir, f)).find((f) => isFile(f));
    const entry = { dir: toPosix(path.relative(root, squadDir)), name, version: null, description: null, error: null };
    if (!manifest) entry.error = 'squad.yaml ausente';
    else {
      const parsed = tryLoad(readText(manifest) || '');
      if (parsed.error) entry.error = `squad.yaml inválido: ${parsed.error}`;
      else if (parsed.data && typeof parsed.data === 'object') {
        entry.name = scalarToString(parsed.data.name) || name;
        entry.version = parsed.data.version !== undefined ? scalarToString(parsed.data.version) : null;
        entry.description = parsed.data.description ? scalarToString(parsed.data.description).trim() : null;
      }
    }
    squads.push(entry);
  }
  return { dir: toPosix(path.relative(root, dir)) || '.', squads };
}

module.exports = {
  name: 'squad',
  summary: 'Lista os squads locais (name, version e description do squad.yaml)',
  usage: 'sia squad list [--json]',
  options: {},
  needsRoot: true,
  run(ctx) {
    const [sub, extra] = ctx.positionals;
    if (sub !== 'list') ctx.usage(sub ? `subcomando desconhecido: ${sub}` : 'informe o subcomando: list');
    if (extra) ctx.usage(`argumento inesperado: ${extra}`);
    const result = listSquads(ctx.root.root, ctx.config);
    if (ctx.out.json) {
      ctx.out.printJson(result);
      return EXIT.OK;
    }
    const { out } = ctx;
    if (result.squads.length === 0) {
      out.info(`Nenhum squad em ${result.dir}/. Crie um com @squad-creator *create-squad {nome}.`);
      return EXIT.OK;
    }
    out.heading(`Squads em ${result.dir}/ (${result.squads.length})`);
    for (const squad of result.squads) {
      if (squad.error) out.warn(`${squad.name}: ${squad.error}`);
      else out.line(`  ${out.c.bold(squad.name)} ${out.c.gray(squad.version || 'sem versão')}${squad.description ? `: ${squad.description}` : ''}`);
    }
    return EXIT.OK;
  },
  listSquads,
};

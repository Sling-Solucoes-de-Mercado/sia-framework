'use strict';

/**
 * sia sync [--ide claude-code,codex,gemini,grok] [--check] [--target dir] [--link-core] [--dry-run] [--json]
 * Gera as projeções das IDEs a partir do .sia-core (nunca copia a definição do agente).
 */

const fs = require('fs');
const path = require('path');
const { exists, isSymlink, mkdirp, toPosix } = require('../lib/fsutil');
const { ideTargets } = require('../lib/config');
const projections = require('../projections');
const managed = require('../lib/managed-files');
const { EXIT } = require('../lib/errors');

/** Cria dir/.sia-core → {raiz}/.sia-core quando não existe. */
function linkCore(sourceRoot, targetRoot) {
  const link = path.join(targetRoot, '.sia-core');
  const source = path.join(sourceRoot, '.sia-core');
  if (exists(link) || isSymlink(link)) {
    return { created: false, path: link, note: isSymlink(link) ? 'link já existe' : '.sia-core já existe no destino (mantido)' };
  }
  fs.symlinkSync(source, link, process.platform === 'win32' ? 'junction' : 'dir');
  return { created: true, path: link, note: `link criado → ${source}` };
}

/**
 * Planeja (e aplica, quando apply=true) as projeções.
 * @returns {{ targetRoot: string, ides: string[], plans: object[], applied: object[] }}
 */
function runSync(options) {
  const { root, coreDir, config } = options;
  const targetRoot = options.target ? path.resolve(options.target) : root;
  const ides = options.ides && options.ides.length ? projections.resolveIdes(options.ides) : projections.resolveIdes(ideTargets(config));
  const ctx = projections.buildContext({ root, coreDir, config });
  const plans = [];
  const applied = [];
  for (const ide of ides) {
    const generation = projections.generate(ide, ctx);
    const plan = managed.planProjection(targetRoot, generation);
    plans.push(plan);
    if (options.apply) applied.push(managed.applyPlan(plan));
  }
  return { targetRoot, ides, plans, applied };
}

/** Resumo de diferenças (para --check e para o doctor). */
function checkSummary(result) {
  return result.plans.map((plan) => ({
    ide: plan.ide,
    differences: managed.planDifferences(plan),
    warnings: plan.warnings,
  }));
}

const ACTION_LABEL = { create: 'criado', update: 'atualizado', remove: 'removido', conflict: 'conflito', error: 'erro' };
const CATEGORY_LABEL = { missing: 'ausente', drift: 'divergente', stale: 'órfão', conflict: 'conflito', error: 'erro' };

function run(ctx) {
  const values = ctx.values;
  if (ctx.positionals.length > 0) ctx.usage(`argumento inesperado: ${ctx.positionals[0]}`);
  if (values['link-core'] && !values.target) ctx.usage('--link-core exige --target {dir}.');
  if (values.check && values['dry-run']) ctx.usage('use --check ou --dry-run, não os dois.');
  const out = ctx.out;
  const { root, coreDir } = ctx.root;
  const notes = [];

  let target = null;
  if (values.target) {
    target = path.resolve(ctx.cwd, values.target);
    if (path.resolve(target) === path.resolve(root)) target = null;
    else {
      if (!values.check && !values['dry-run']) mkdirp(target);
      if (values['link-core'] && !values.check && !values['dry-run']) notes.push(linkCore(root, target).note);
      else if (!exists(path.join(target, '.sia-core'))) {
        notes.push('o destino não tem .sia-core: as projeções apontam para .sia-core/ (use --link-core para criar o link)');
      }
    }
  }

  const apply = !values.check && !values['dry-run'];
  const result = runSync({
    root,
    coreDir,
    config: ctx.config,
    target,
    ides: values.ide ? values.ide.split(',') : null,
    apply,
  });

  const report = {
    mode: values.check ? 'check' : values['dry-run'] ? 'dry-run' : 'sync',
    source: root,
    target: result.targetRoot,
    notes,
    ides: [],
  };
  let failed = false;
  for (let i = 0; i < result.plans.length; i += 1) {
    const plan = result.plans[i];
    const counts = managed.summarize(plan);
    const differences = managed.planDifferences(plan);
    const errors = plan.actions.filter((a) => a.action === 'error');
    const conflicts = plan.actions.filter((a) => a.action === 'conflict');
    if (values.check && differences.length > 0) failed = true;
    if (errors.length > 0) failed = true;
    report.ides.push({
      ide: plan.ide,
      dir: plan.dir,
      counts,
      differences: values.check ? differences : undefined,
      actions: plan.actions.filter((a) => a.action !== 'unchanged').map((a) => ({ path: a.path, action: a.action, message: a.message || undefined })),
      conflicts: conflicts.map((a) => a.path),
      warnings: plan.warnings,
      removed: apply ? result.applied[i].removed : undefined,
    });
  }
  report.ok = !failed;

  if (out.json) {
    out.printJson(report);
    return failed ? EXIT.FAILURE : EXIT.OK;
  }

  const { c } = out;
  const where = result.targetRoot === root ? 'raiz do projeto' : toPosix(result.targetRoot);
  out.heading(`sia sync${values.check ? ' --check' : values['dry-run'] ? ' --dry-run' : ''} → ${where}`);
  for (const note of notes) out.info(note);
  for (const ide of report.ides) {
    const total = Object.values(ide.counts).reduce((sum, n) => sum + n, 0);
    if (values.check) {
      const diffs = ide.differences;
      if (diffs.length === 0) out.ok(`${ide.ide}: sincronizado (${total} itens)`);
      else {
        out.fail(`${ide.ide}: ${diffs.length} diferença(s)`);
        for (const diff of diffs) out.line(`    ${c.yellow(CATEGORY_LABEL[diff.category] || diff.category)} ${diff.path}${diff.message ? c.gray(` (${diff.message})`) : ''}`);
      }
    } else {
      const parts = [];
      if (ide.counts.create) parts.push(`${ide.counts.create} criado(s)`);
      if (ide.counts.update) parts.push(`${ide.counts.update} atualizado(s)`);
      if (ide.counts.remove) parts.push(`${ide.counts.remove} removido(s)`);
      if (ide.counts.unchanged) parts.push(`${ide.counts.unchanged} sem mudança`);
      const level = ide.counts.error ? 'fail' : ide.counts.conflict ? 'warn' : 'ok';
      const verb = values['dry-run'] ? 'seria' : '';
      out[level === 'fail' ? 'fail' : level === 'warn' ? 'warn' : 'ok'](`${ide.ide} (${ide.dir}): ${parts.join(', ') || 'nada a fazer'}${verb ? c.gray(' [simulação]') : ''}`);
      if (values['dry-run']) {
        for (const action of ide.actions) out.line(`    ${c.gray(ACTION_LABEL[action.action] || action.action)} ${action.path}`);
      }
      for (const conflict of ide.conflicts) out.line(`    ${c.yellow('conflito')} ${conflict} ${c.gray('(arquivo não gerenciado; não foi alterado)')}`);
      for (const action of ide.actions.filter((a) => a.action === 'error')) out.line(`    ${c.red('erro')} ${action.path}: ${action.message}`);
    }
    for (const warning of ide.warnings) out.line(`    ${c.yellow(out.sym.warn)} ${warning}`);
  }
  if (values.check && failed) out.hint('Rode `sia sync` para regenerar as projeções.');
  return failed ? EXIT.FAILURE : EXIT.OK;
}

module.exports = {
  name: 'sync',
  summary: 'Gera ou confere as projeções das IDEs (Claude Code, Codex, Gemini, Grok)',
  usage: 'sia sync [--ide claude-code,codex,gemini,grok] [--check] [--target dir] [--link-core] [--dry-run] [--json]',
  options: {
    ide: { type: 'string' },
    check: { type: 'boolean' },
    target: { type: 'string' },
    'link-core': { type: 'boolean' },
    'dry-run': { type: 'boolean' },
  },
  needsRoot: true,
  run,
  runSync,
  checkSummary,
  linkCore,
};

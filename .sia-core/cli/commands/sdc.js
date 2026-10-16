'use strict';

/**
 * sia sdc plan|next|verify|mark|status — ciclo de desenvolvimento da story com estado durável.
 *
 *   sia sdc plan {storyId|caminho} [--mode yolo|interactive] [--force]
 *   sia sdc next {storyId|caminho}
 *   sia sdc verify {storyId|caminho} {fase} [--mark]
 *   sia sdc mark {storyId|caminho} {fase} --status passed|failed|skipped|halted [--outcome approved|changes_requested] [--notes texto]
 *   sia sdc status {storyId|caminho}
 */

const path = require('path');
const sdc = require('../lib/sdc');
const storyLib = require('../lib/story');
const { maxQgIterations } = require('../lib/config');
const { toPosix } = require('../lib/fsutil');
const { EXIT, SiaError } = require('../lib/errors');

const MODES = ['interactive', 'yolo'];

function looksLikePath(ref) {
  return /[\\/]/.test(ref) || /\.md$/i.test(ref);
}

/** storyId a partir do argumento (lê a story quando é caminho). */
function storyIdOf(root, config, ref) {
  if (looksLikePath(ref)) return storyLib.loadStory(root, config, ref).storyId;
  return String(ref).trim();
}

/** Cria o estado a partir do status da story. */
function planState(root, config, loaded, mode) {
  const state = sdc.createState({
    storyId: loaded.storyId,
    storyPath: loaded.relPath,
    mode,
    maxQgIterations: maxQgIterations(config),
    executor: loaded.story.executor,
  });
  const closeOk = loaded.story.status === 'Done' ? sdc.verifyPhase(root, config, loaded, 'close').ok : false;
  const hasInspection = storyLib.listInspections(root, config, loaded.storyId).some((report) => report.verdictValid);
  sdc.seedFromStory(state, {
    status: loaded.story.status,
    statusRaw: loaded.story.statusRaw,
    closeOk,
    hasInspection,
  });
  return state;
}

function printState(state, out, extra = {}) {
  const { c } = out;
  out.heading(`Ciclo da story ${state.storyId} [${state.status}]`);
  if (state.storyPath) out.kv('Story', state.storyPath);
  if (extra.storyStatus) out.kv('Status', extra.storyStatus);
  if (state.executor) out.kv('Executor', `@${state.executor.agent}${state.executor.hat ? ` [${state.executor.hat}]` : ''}${state.skipInspection ? c.gray(' (story de pesquisa: sem inspeção)') : ''}`);
  out.kv('Modo', state.mode);
  out.kv('Fase atual', state.currentPhase || c.gray('nenhuma (ciclo concluído)'));
  out.kv('QA Loop', `${state.qgIterations}/${state.maxQgIterations} iteração(ões) de correção`);
  for (const phase of sdc.PHASES) {
    const entry = state.phases[phase] || { status: 'pending' };
    const marker =
      entry.status === 'passed' ? c.green(out.sym.ok)
        : entry.status === 'failed' || entry.status === 'halted' ? c.red(out.sym.fail)
          : entry.status === 'skipped' ? c.gray('-')
            : phase === state.currentPhase ? c.cyan(out.sym.arrow)
              : c.gray('·');
    const details = [entry.status];
    if (entry.outcome) details.push(entry.outcome);
    if (entry.at) details.push(entry.at);
    out.line(`  ${marker} ${phase.padEnd(15)} ${c.gray(details.join(' · '))}${entry.notes ? c.gray(` (${entry.notes})`) : ''}`);
  }
}

function printNext(state, out) {
  const action = sdc.nextAction(state);
  if (!action) {
    out.ok(`Ciclo da story ${state.storyId} concluído.`);
    return;
  }
  out.line('');
  out.line(out.c.bold(`Próxima fase: ${action.phase}`) + out.c.gray(` (${action.label})`));
  out.kv('Agente', `${action.agent}${action.hat ? ` [${action.hat}]` : ''}`);
  out.kv('Comando', `${action.agent} ${action.command}`);
  out.kv('Task', action.task);
  out.kv('Skill', `${action.skill}${action.skillPath ? out.c.gray(` (${action.skillPath})`) : ''}`);
  out.kv('Subagente', action.subagent);
  out.kv('Depois', action.verify);
}

function printVerify(result, out) {
  out.heading(`Verificação da fase ${result.phase} (story ${result.storyId})`);
  for (const item of result.checks) {
    if (item.ok) out.ok(item.message);
    else if (item.level === 'warning') out.warn(item.message);
    else out.fail(item.message);
  }
  if (result.outcome) out.kv('Resultado', result.outcome);
}

function cmdPlan(ctx, ref) {
  const { root } = ctx.root;
  const mode = ctx.values.mode || 'interactive';
  if (!MODES.includes(mode)) ctx.usage(`--mode inválido: ${mode}. Use yolo ou interactive.`);
  const loaded = storyLib.loadStory(root, ctx.config, ref);
  let state = sdc.loadState(root, ctx.config, loaded.storyId);
  let resumed = true;
  if (!state || ctx.values.force) {
    state = planState(root, ctx.config, loaded, mode);
    sdc.saveState(root, ctx.config, state);
    resumed = false;
  }
  const file = toPosix(path.relative(root, sdc.statePath(root, ctx.config, loaded.storyId)));
  if (ctx.out.json) {
    ctx.out.printJson({ resumed, statePath: file, state, next: sdc.nextAction(state) });
    return EXIT.OK;
  }
  printState(state, ctx.out, { storyStatus: loaded.story.status || loaded.story.statusRaw });
  ctx.out.kv('Estado', `${file}${resumed ? ctx.out.c.gray(' (existente; use --force para recriar)') : ''}`);
  printNext(state, ctx.out);
  return EXIT.OK;
}

function requireState(ctx, storyId) {
  const state = sdc.loadState(ctx.root.root, ctx.config, storyId);
  if (!state) throw new SiaError(`Sem estado do ciclo para a story ${storyId}. Rode: sia sdc plan ${storyId}`, { code: 'SDC_NO_STATE' });
  return state;
}

function cmdNext(ctx, ref) {
  const storyId = storyIdOf(ctx.root.root, ctx.config, ref);
  const state = requireState(ctx, storyId);
  const action = sdc.nextAction(state);
  if (ctx.out.json) {
    ctx.out.printJson({ storyId, status: state.status, currentPhase: state.currentPhase, next: action, halted: state.status === 'halted' });
    return EXIT.OK;
  }
  if (state.status === 'halted') {
    ctx.out.fail(`Ciclo da story ${storyId} interrompido (halted) na fase ${state.currentPhase}.`);
    const note = state.phases[state.currentPhase] && state.phases[state.currentPhase].notes;
    if (note) ctx.out.hint(note);
    return EXIT.OK;
  }
  if (state.status === 'failed') ctx.out.warn(`A fase ${state.currentPhase} falhou na última verificação; corrija e verifique de novo.`);
  printNext(state, ctx.out);
  return EXIT.OK;
}

function cmdVerify(ctx, ref, phase) {
  const { root } = ctx.root;
  if (!phase) ctx.usage(`informe a fase: ${sdc.PHASES.join(', ')}`);
  if (!sdc.PHASES.includes(phase)) ctx.usage(`fase desconhecida: ${phase}. Use: ${sdc.PHASES.join(', ')}`);
  const loaded = storyLib.loadStory(root, ctx.config, ref);
  let state = sdc.loadState(root, ctx.config, loaded.storyId);
  const result = sdc.verifyPhase(root, ctx.config, loaded, phase, { state });
  let marked = null;
  let message = null;
  if (ctx.values.mark) {
    if (!state) state = planState(root, ctx.config, loaded, 'interactive');
    if (state.status === 'halted') {
      throw new SiaError(`O ciclo da story ${loaded.storyId} está interrompido (halted). Escale para um humano ou rode \`sia sdc plan ${loaded.storyId} --force\`.`);
    }
    if (state.status === 'completed') throw new SiaError(`O ciclo da story ${loaded.storyId} já está concluído; nada a marcar.`);
    if (state.currentPhase !== phase) {
      throw new SiaError(`Sequence lock: a fase atual é ${state.currentPhase}; conclua-a antes de marcar ${phase}.`, { code: 'SDC_SEQUENCE_LOCK' });
    }
    const outcome = sdc.markPhase(state, phase, result.ok ? 'passed' : 'failed', {
      outcome: result.ok ? result.outcome : null,
      notes: result.ok ? null : result.failures.join('; '),
    });
    message = outcome.message;
    sdc.saveState(root, ctx.config, state);
    marked = { status: state.status, currentPhase: state.currentPhase, qgIterations: state.qgIterations };
  }
  const halted = Boolean(marked && marked.status === 'halted');
  if (ctx.out.json) {
    ctx.out.printJson({ ...result, marked, message, state: ctx.values.mark ? state : undefined });
  } else {
    printVerify(result, ctx.out);
    if (marked) {
      ctx.out.line('');
      ctx.out.kv('Marcado', `${phase} = ${result.ok ? 'passed' : 'failed'}; ciclo ${marked.status}; próxima fase ${marked.currentPhase || '—'}`);
      if (message) (halted ? ctx.out.fail : ctx.out.info)(message);
    }
  }
  return result.ok && !halted ? EXIT.OK : EXIT.FAILURE;
}

function cmdMark(ctx, ref, phase) {
  if (!phase) ctx.usage(`informe a fase: ${sdc.PHASES.join(', ')}`);
  if (!ctx.values.status) ctx.usage('informe --status passed|failed|skipped|halted');
  const storyId = storyIdOf(ctx.root.root, ctx.config, ref);
  const state = requireState(ctx, storyId);
  const warnings = [];
  if (state.currentPhase && state.currentPhase !== phase) warnings.push(`marcação manual fora da fase atual (${state.currentPhase})`);
  const { message } = sdc.markPhase(state, phase, ctx.values.status, { outcome: ctx.values.outcome, notes: ctx.values.notes });
  sdc.saveState(ctx.root.root, ctx.config, state);
  const breaker = Boolean(message) && state.status === 'halted';
  if (ctx.out.json) {
    ctx.out.printJson({ storyId, phase, status: ctx.values.status, warnings, message, state });
  } else {
    for (const warning of warnings) ctx.out.warn(warning);
    ctx.out.ok(`Fase ${phase} marcada como ${ctx.values.status}${ctx.values.outcome ? ` (${ctx.values.outcome})` : ''}.`);
    ctx.out.kv('Ciclo', `${state.status}; próxima fase ${state.currentPhase || '—'}`);
    if (message) (breaker ? ctx.out.fail : ctx.out.info)(message);
  }
  return breaker ? EXIT.FAILURE : EXIT.OK;
}

function cmdStatus(ctx, ref) {
  const { root } = ctx.root;
  const storyId = storyIdOf(root, ctx.config, ref);
  const state = requireState(ctx, storyId);
  let storyStatus = null;
  try {
    storyStatus = storyLib.loadStory(root, ctx.config, state.storyPath || storyId).story.status;
  } catch {
    storyStatus = null;
  }
  if (ctx.out.json) {
    ctx.out.printJson({ storyId, storyStatus, state, next: sdc.nextAction(state) });
    return EXIT.OK;
  }
  printState(state, ctx.out, { storyStatus: storyStatus || ctx.out.c.gray('story não encontrada') });
  return EXIT.OK;
}

module.exports = {
  name: 'sdc',
  summary: 'Ciclo da story: plan, next, verify, mark e status (estado em .sia/sdc/)',
  usage: [
    'sia sdc plan {storyId|caminho} [--mode yolo|interactive] [--force]',
    'sia sdc next {storyId|caminho}',
    'sia sdc verify {storyId|caminho} {fase} [--mark]',
    'sia sdc mark {storyId|caminho} {fase} --status passed|failed|skipped|halted [--outcome approved|changes_requested] [--notes texto]',
    '(--outcome vale para inspect e review; review aprovada exige --outcome)',
    'sia sdc status {storyId|caminho}',
    `fases: ${sdc.PHASES.join(' → ')}`,
  ].join('\n       '),
  options: {
    mode: { type: 'string' },
    force: { type: 'boolean' },
    mark: { type: 'boolean' },
    status: { type: 'string' },
    outcome: { type: 'string' },
    notes: { type: 'string' },
  },
  needsRoot: true,
  run(ctx) {
    const [sub, ref, phase, extra] = ctx.positionals;
    if (!sub) ctx.usage('informe o subcomando: plan, next, verify, mark ou status');
    if (!ref) ctx.usage('informe o storyId (ex.: 1.3) ou o caminho da story.');
    switch (sub) {
      case 'plan':
        if (phase) ctx.usage(`argumento inesperado: ${phase}`);
        return cmdPlan(ctx, ref);
      case 'next':
        if (phase) ctx.usage(`argumento inesperado: ${phase}`);
        return cmdNext(ctx, ref);
      case 'verify':
        if (extra) ctx.usage(`argumento inesperado: ${extra}`);
        return cmdVerify(ctx, ref, phase);
      case 'mark':
        if (extra) ctx.usage(`argumento inesperado: ${extra}`);
        return cmdMark(ctx, ref, phase);
      case 'status':
        if (phase) ctx.usage(`argumento inesperado: ${phase}`);
        return cmdStatus(ctx, ref);
      default:
        return ctx.usage(`subcomando desconhecido: ${sub}`);
    }
  },
  planState,
};

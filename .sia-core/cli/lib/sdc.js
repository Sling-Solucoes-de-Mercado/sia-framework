'use strict';

/**
 * Ciclo de desenvolvimento da story (SDC): estado durável, máquina de fases e verificações em disco.
 *
 * Fases: validate → develop → inspect → review → apply_qa_fixes (loop) → close.
 * Estado: {paths.runtime}/sdc/{storyId}/state.json (escrita atômica).
 */

const path = require('path');
const { readJson, writeFileAtomic } = require('./fsutil');
const { projectPaths, maxQgIterations, get } = require('./config');
const { SiaError, UsageError } = require('./errors');
const {
  APPROVED_GATES, GATE_VERDICTS, loadGateFile, listInspections, isResearchStory, executionCommand, fixCommand,
} = require('./story');

const PHASES = Object.freeze(['validate', 'develop', 'inspect', 'review', 'apply_qa_fixes', 'close']);
const MARK_STATUSES = Object.freeze(['passed', 'failed', 'skipped', 'halted']);
const OUTCOMES = Object.freeze(['approved', 'changes_requested']);

const PHASE_INFO = Object.freeze({
  validate: { agent: 'pm', hat: 'owner', command: 'validate-story', task: 'validate-story.md', skill: 'sia-validate-story', label: 'Validar a story (Draft → Ready)' },
  develop: { agent: 'dev', hat: 'dev', command: 'develop', task: 'develop-story.md', skill: 'sia-develop-story', label: 'Implementar (Ready → InProgress → InReview)' },
  inspect: { agent: 'validator', hat: null, command: 'revisar-feature', task: 'inspect.md', skill: 'revisar-feature', label: 'Inspecionar a entrega (7 lentes)' },
  review: { agent: 'pm', hat: 'quality', command: 'qa-gate', task: 'qa-gate.md', skill: 'sia-qa-gate', label: 'QA gate (PASS / CONCERNS / FAIL / WAIVED)' },
  apply_qa_fixes: { agent: 'dev', hat: 'dev', command: 'apply-qa-fixes', task: 'apply-qa-fixes.md', skill: 'sia-apply-qa-fixes', label: 'Aplicar o pedido de correção' },
  close: { agent: 'pm', hat: 'owner', command: 'close-story', task: 'close-story.md', skill: 'sia-close-story', label: 'Fechar a story (registro administrativo)' },
});

function safeId(id) {
  const value = String(id || '').replace(/[^a-zA-Z0-9._-]+/g, '_');
  return !value || value === '.' || value === '..' ? 'unknown' : value;
}

function statePath(root, config, storyId) {
  return path.resolve(root, projectPaths(config).runtime, 'sdc', safeId(storyId), 'state.json');
}

function emptyPhase() {
  return { status: 'pending', at: null, notes: null };
}

function createState({ storyId, storyPath, mode, maxQgIterations: max, executor, now = new Date() }) {
  const iso = now.toISOString();
  const phases = {};
  for (const phase of PHASES) phases[phase] = emptyPhase();
  return {
    version: 1,
    kind: 'sia-sdc',
    storyId: String(storyId),
    storyPath: storyPath || null,
    mode: mode || 'interactive',
    status: 'running',
    currentPhase: 'validate',
    phases,
    executor: { agent: (executor && executor.agent) || 'dev', hat: (executor && executor.hat) || null },
    skipInspection: isResearchStory(executor),
    qgIterations: 0,
    maxQgIterations: max || 5,
    inspectNotBefore: null,
    history: [],
    createdAt: iso,
    updatedAt: iso,
  };
}

function loadState(root, config, storyId) {
  const file = statePath(root, config, storyId);
  const read = readJson(file);
  if (!read.exists) return null;
  if (read.error || !read.data || typeof read.data !== 'object') {
    throw new SiaError(`Estado do ciclo ilegível em ${file}: ${read.error || 'não é um objeto'}. Rode \`sia sdc plan ${storyId} --force\`.`);
  }
  return read.data;
}

function saveState(root, config, state, now = new Date()) {
  state.updatedAt = now.toISOString();
  writeFileAtomic(statePath(root, config, state.storyId), `${JSON.stringify(state, null, 2)}\n`);
}

function passPhase(state, phase, notes, iso) {
  state.phases[phase] = { status: 'passed', at: iso, notes };
}

/**
 * Inicializa as fases a partir do status da story (retomada).
 * @param {object} state
 * @param {{ status: string|null, closeOk: boolean, hasInspection: boolean }} context
 */
function seedFromStory(state, context, now = new Date()) {
  const iso = now.toISOString();
  const skipInspect = () => {
    if (state.skipInspection) {
      state.phases.inspect = { status: 'skipped', at: iso, notes: 'story de pesquisa: sem inspeção (guia de autoria, seção 6)' };
    }
  };
  skipInspect();
  switch (context.status) {
    case 'Draft':
      state.currentPhase = 'validate';
      break;
    case 'Ready':
    case 'InProgress':
      passPhase(state, 'validate', `story já em ${context.status}`, iso);
      state.currentPhase = 'develop';
      break;
    case 'InReview':
      passPhase(state, 'validate', 'story já em InReview', iso);
      passPhase(state, 'develop', 'story já em InReview', iso);
      state.currentPhase = state.skipInspection ? 'review' : 'inspect';
      break;
    case 'Done':
      if (context.closeOk) {
        for (const phase of PHASES) {
          if (phase === 'apply_qa_fixes') state.phases[phase] = { status: 'skipped', at: iso, notes: 'story já Done com gate aprovado' };
          else passPhase(state, phase, 'story já Done com gate aprovado', iso);
        }
        state.currentPhase = null;
        state.status = 'completed';
      } else {
        passPhase(state, 'validate', 'story já Done sem gate aprovado', iso);
        passPhase(state, 'develop', 'story já Done sem gate aprovado', iso);
        if (!state.skipInspection) {
          state.phases.inspect = context.hasInspection
            ? { status: 'passed', at: iso, notes: 'relatório de inspeção existente' }
            : { status: 'skipped', at: iso, notes: 'story já Done sem relatório de inspeção' };
        }
        state.currentPhase = 'review';
      }
      break;
    default:
      throw new SiaError(
        `Status da story inválido ou ausente (${context.statusRaw || 'vazio'}). Use Draft, Ready, InProgress, InReview ou Done em ## Status.`,
      );
  }
  return state;
}

function escalationMessage(state) {
  return (
    `Circuit breaker do QA Loop: ${state.qgIterations} iteração(ões) de correção atingiram o máximo de ` +
    `${state.maxQgIterations} (quality.qaLoop.maxIterations) e o gate pediu correções de novo. ` +
    'Escale para um humano: @pm [Qualidade] decide entre WAIVED com aprovação registrada, ' +
    'replanejar a story (@pm *correct-course) ou encerrá-la. O ciclo ficou halted.'
  );
}

/**
 * Marca o resultado de uma fase e avança a máquina.
 * @returns {{ state: object, message: string|null }}
 */
function markPhase(state, phase, status, options = {}) {
  if (!PHASES.includes(phase)) throw new UsageError(`Fase desconhecida: ${phase}. Use uma de: ${PHASES.join(', ')}.`);
  if (!MARK_STATUSES.includes(status)) throw new UsageError(`Status de fase inválido: ${status}. Use: ${MARK_STATUSES.join(', ')}.`);
  const outcome = options.outcome || null;
  if (outcome && !OUTCOMES.includes(outcome)) throw new UsageError(`--outcome inválido: ${outcome}. Use approved ou changes_requested.`);
  if (phase === 'review' && status === 'passed' && !outcome) {
    throw new UsageError('A fase review aprovada exige --outcome approved ou --outcome changes_requested.');
  }
  if (outcome && phase !== 'review' && phase !== 'inspect') {
    throw new UsageError('--outcome só vale para as fases inspect e review.');
  }
  const iso = (options.now || new Date()).toISOString();
  const entry = { status, at: iso, notes: options.notes || null };
  if ((phase === 'review' || phase === 'inspect') && outcome) entry.outcome = outcome;
  state.phases[phase] = entry;
  state.history = Array.isArray(state.history) ? state.history : [];
  state.history.push({ at: iso, phase, status, outcome: outcome || undefined, notes: options.notes || undefined });
  let message = null;

  if (status === 'failed' || status === 'halted') {
    state.status = status;
    state.currentPhase = phase;
  } else if ((phase === 'review' || phase === 'inspect') && status === 'passed' && outcome === 'changes_requested') {
    if ((state.qgIterations || 0) >= state.maxQgIterations) {
      state.phases[phase].status = 'halted';
      message = escalationMessage(state);
      state.phases[phase].notes = options.notes || message;
      state.status = 'halted';
      state.currentPhase = phase;
    } else {
      state.phases.apply_qa_fixes = emptyPhase();
      state.currentPhase = 'apply_qa_fixes';
      state.status = 'running';
    }
  } else if (phase === 'review') {
    state.phases.close = state.phases.close && state.phases.close.status === 'passed' ? state.phases.close : emptyPhase();
    state.currentPhase = 'close';
    state.status = 'running';
  } else if (phase === 'apply_qa_fixes') {
    state.qgIterations = (state.qgIterations || 0) + 1;
    state.phases.review = emptyPhase();
    state.status = 'running';
    if (state.skipInspection) {
      state.currentPhase = 'review';
      message = `Correções aplicadas (iteração ${state.qgIterations} de ${state.maxQgIterations}). Nova revisão: @pm *qa-gate ${state.storyId}.`;
    } else {
      state.phases.inspect = emptyPhase();
      state.inspectNotBefore = iso;
      state.currentPhase = 'inspect';
      message = `Correções aplicadas (iteração ${state.qgIterations} de ${state.maxQgIterations}). Reinspeção obrigatória: @validator *revisar-feature ${state.storyId}.`;
    }
  } else {
    const index = PHASES.indexOf(phase);
    const next = PHASES.slice(index + 1).find((p) => p !== 'apply_qa_fixes' && state.phases[p] && state.phases[p].status === 'pending');
    if (next) {
      state.currentPhase = next;
      state.status = 'running';
    } else {
      state.currentPhase = null;
      state.status = 'completed';
    }
  }
  state.updatedAt = iso;
  return { state, message };
}

function check(list, ok, message, level = 'error') {
  list.push({ ok: Boolean(ok), level: ok ? 'ok' : level, message });
}

/** Verificações do gate (Resultado do QA + arquivo do gate + waiver). */
function gateChecks(checks, root, config, loaded) {
  const { story, storyId } = loaded;
  const qa = story.qa;
  const gateFile = loadGateFile(root, config, storyId, qa);
  if (gateFile && gateFile.exists) {
    if (gateFile.error) check(checks, false, `arquivo do gate ilegível (${gateFile.relPath}): ${gateFile.error}`);
    else {
      check(
        checks,
        gateFile.gate === qa.gate,
        `veredito do arquivo do gate (${gateFile.relPath}: ${gateFile.gate || 'ausente'}) igual ao da story (${qa.gate || 'ausente'})`,
      );
    }
  } else if (gateFile && gateFile.referenced) {
    check(checks, false, `arquivo do gate citado não existe: ${gateFile.relPath}`, 'warning');
  }
  if (qa.gate === 'WAIVED') {
    const waiver = gateFile && gateFile.exists && !gateFile.error ? gateFile.waiver : null;
    check(
      checks,
      Boolean(waiver && waiver.active && waiver.reason && waiver.approvedBy),
      'WAIVED exige no arquivo do gate waiver.active: true, reason e approved_by preenchidos',
    );
  }
  return gateFile;
}

/**
 * Verifica em disco se a fase foi cumprida.
 * @param {string} root
 * @param {object} config
 * @param {{ storyId: string, story: object, relPath: string }} loaded story carregada (lib/story.loadStory)
 * @param {string} phase
 * @param {{ state?: object }} [options]
 */
function verifyPhase(root, config, loaded, phase, options = {}) {
  if (!PHASES.includes(phase)) throw new UsageError(`Fase desconhecida: ${phase}. Use uma de: ${PHASES.join(', ')}.`);
  const { story, storyId } = loaded;
  const status = story.status;
  const checks = [];
  let outcome = null;
  const statusLabel = status || story.statusRaw || 'ausente';

  switch (phase) {
    case 'validate':
      check(checks, ['Ready', 'InProgress', 'InReview', 'Done'].includes(status), `status Ready ou posterior depois da validação (atual: ${statusLabel})`);
      break;
    case 'develop': {
      check(checks, ['InReview', 'Done'].includes(status), `status InReview depois da implementação (atual: ${statusLabel})`);
      const count = story.fileList.files.length;
      check(checks, count > 0, `File List preenchida (${count} arquivo(s))`);
      const open = story.tasks.open;
      check(checks, open === 0, `checkboxes de Tasks / Subtasks concluídos (${story.tasks.done}/${story.tasks.total})`, 'warning');
      break;
    }
    case 'inspect': {
      if (isResearchStory(story.executor)) {
        check(checks, true, 'story de pesquisa (executor @pm [Análise]): não passa por inspeção');
        outcome = 'approved';
        break;
      }
      const reports = listInspections(root, config, storyId);
      const valid = reports.filter((report) => report.verdictValid);
      const notBefore = options.state && options.state.inspectNotBefore ? Date.parse(options.state.inspectNotBefore) : null;
      const eligible = notBefore ? valid.filter((report) => report.time > notBefore) : valid;
      const latest = eligible.length > 0 ? eligible[eligible.length - 1] : null;
      if (reports.length > 0 && valid.length < reports.length) {
        const invalid = reports.filter((report) => !report.verdictValid).map((report) => `${report.relPath} (${report.verdict || 'sem veredito'})`);
        check(checks, false, `relatório(s) com veredito inválido: ${invalid.join(', ')}`, 'warning');
      }
      if (notBefore && valid.length > 0 && eligible.length === 0) {
        check(checks, false, `relatório de inspeção posterior às correções (reinspeção desde ${options.state.inspectNotBefore})`);
      } else {
        check(
          checks,
          Boolean(latest),
          latest
            ? `relatório de inspeção: ${latest.relPath} (${latest.verdict}${latest.revision ? `, revisão ${latest.revision}` : ''})`
            : `relatório em ${projectPaths(config).inspections}/ com story: '${storyId}' e veredito válido (aprovado | aprovado com ressalvas | reprovado)`,
        );
      }
      if (latest) {
        outcome = latest.verdict === 'reprovado' ? 'changes_requested' : 'approved';
        if (outcome === 'changes_requested') {
          check(checks, true, 'inspeção reprovada: correções antes do gate (*apply-qa-fixes), com a story em InReview', 'info');
        }
      }
      break;
    }
    case 'review': {
      const qa = story.qa;
      check(checks, qa.found, 'seção ## Resultado do QA presente');
      check(checks, qa.gateValid, `Gate válido em Resultado do QA (atual: ${qa.gateRaw || 'ausente'})`);
      check(checks, Boolean(qa.reviewer), `Revisor preenchido (${qa.reviewer || 'ausente'})`);
      check(checks, Boolean(qa.revision), `Revisão preenchida (${qa.revision || 'ausente'})`);
      if (qa.gateValid) {
        if (qa.gate === 'FAIL') {
          check(checks, status === 'InProgress', `gate FAIL devolveu a story para InProgress (atual: ${statusLabel})`);
          outcome = 'changes_requested';
        } else {
          check(checks, status === 'Done', `gate ${qa.gate} levou a story para Done (atual: ${statusLabel})`);
          outcome = 'approved';
        }
        gateChecks(checks, root, config, loaded);
        if (
          APPROVED_GATES.includes(qa.gate) &&
          !isResearchStory(story.executor) &&
          get(config, 'quality.inspection.requiredBeforeGate', true) === true
        ) {
          const reports = listInspections(root, config, storyId).filter((report) => report.verdictValid);
          check(checks, reports.length > 0, 'relatório de inspeção do @validator antes do gate (quality.inspection.requiredBeforeGate)', 'warning');
        }
      }
      break;
    }
    case 'apply_qa_fixes':
      check(checks, status === 'InReview', `story em InReview depois das correções (atual: ${statusLabel})`);
      break;
    case 'close': {
      const qa = story.qa;
      check(checks, status === 'Done', `status Done (atual: ${statusLabel})`);
      check(checks, APPROVED_GATES.includes(qa.gate), `gate aprovado (PASS, CONCERNS ou WAIVED; atual: ${qa.gateRaw || 'ausente'})`);
      if (GATE_VERDICTS.includes(qa.gate)) gateChecks(checks, root, config, loaded);
      break;
    }
    default:
      break;
  }

  const failures = checks.filter((item) => !item.ok && item.level === 'error');
  return {
    ok: failures.length === 0,
    phase,
    storyId,
    checks,
    failures: failures.map((item) => item.message),
    outcome,
    meta: {
      status,
      gate: story.qa.gate,
      fileListCount: story.fileList.files.length,
      tasks: { done: story.tasks.done, total: story.tasks.total },
    },
  };
}

/** Descrição do próximo passo para a fase atual. */
function nextAction(state) {
  const phase = state.currentPhase;
  if (!phase) return null;
  const info = { ...PHASE_INFO[phase] };
  if (phase === 'develop' || phase === 'apply_qa_fixes') {
    const exec = phase === 'develop' ? executionCommand(state.executor) : fixCommand(state.executor);
    info.agent = exec.agent.replace(/^@/, '');
    info.command = exec.command;
    info.hat = exec.hat;
  }
  return {
    phase,
    label: info.label,
    agent: `@${info.agent}`,
    hat: info.hat,
    command: `*${info.command} ${state.storyId}`,
    task: `.sia-core/tasks/${info.task}`,
    skill: info.skill,
    skillPath: info.skill.startsWith('sia-') ? `.sia-core/skills/${info.skill}/SKILL.md` : null,
    subagent: `sia-${info.agent}`,
    verify: `sia sdc verify ${state.storyId} ${phase} --mark`,
  };
}

module.exports = {
  PHASES,
  MARK_STATUSES,
  OUTCOMES,
  PHASE_INFO,
  safeId,
  statePath,
  createState,
  loadState,
  saveState,
  seedFromStory,
  markPhase,
  verifyPhase,
  nextAction,
  escalationMessage,
  maxQgIterations,
};

'use strict';

/**
 * sia story status {storyId|caminho} [--json]
 */

const storyLib = require('../lib/story');
const { EXIT } = require('../lib/errors');

function collectStatus(root, config, ref) {
  const loaded = storyLib.loadStory(root, config, ref);
  const { story, storyId } = loaded;
  const inspection = storyLib.latestInspection(root, config, storyId);
  const head = storyLib.gitHead(root);
  const gateFile = storyLib.loadGateFile(root, config, storyId, story.qa);
  const current = storyLib.inspectionIsCurrent(inspection, { head, qa: story.qa });
  return {
    storyId,
    title: story.title,
    path: loaded.relPath,
    status: story.status,
    statusRaw: story.statusRaw,
    statusValid: story.statusValid,
    executor: { agent: story.executor.agent, hat: story.executor.hat, declared: story.executor.declared, research: storyLib.isResearchStory(story.executor) },
    tasks: { done: story.tasks.done, total: story.tasks.total, open: story.tasks.open },
    fileList: { count: story.fileList.files.length, files: story.fileList.files, found: story.fileList.found },
    qa: {
      found: story.qa.found,
      gate: story.qa.gate,
      gateValid: story.qa.gateValid,
      reviewer: story.qa.reviewer,
      revision: story.qa.revision,
      date: story.qa.date,
      gateFile: story.qa.gateFile,
      inspection: story.qa.inspection,
      summary: story.qa.summary,
      iteration: story.qa.iteration,
      followUp: story.qa.followUp,
    },
    gateFile: gateFile
      ? { path: gateFile.relPath, exists: gateFile.exists, gate: gateFile.gate, error: gateFile.error, waiver: gateFile.waiver }
      : null,
    inspection: inspection
      ? { path: inspection.relPath, verdict: inspection.verdict, date: inspection.date, revision: inspection.revision, current }
      : null,
    head,
    next: storyLib.nextSteps(storyId, story, { inspection, head, qa: story.qa }),
  };
}

function print(status, out) {
  const { c } = out;
  out.heading(`Story ${status.storyId}${status.title ? `: ${status.title}` : ''}`);
  out.kv('Arquivo', status.path);
  out.kv('Status', status.statusValid ? c.bold(status.status) : c.red(`${status.statusRaw || 'ausente'} (inválido: use Draft, Ready, InProgress, InReview ou Done)`));
  const exec = status.executor;
  out.kv(
    'Executor',
    `@${exec.agent}${exec.hat ? ` [${exec.hat}]` : ''}${exec.declared ? '' : c.gray(' (padrão: seção ## Executor sem agente)')}${exec.research ? c.gray(' · story de pesquisa, sem inspeção') : ''}`,
  );
  out.kv('Tasks', `${status.tasks.done}/${status.tasks.total} concluída(s)${status.tasks.open ? c.yellow(` · ${status.tasks.open} aberta(s)`) : ''}`);
  out.kv('File List', status.fileList.found ? `${status.fileList.count} arquivo(s)` : c.gray('seção ausente'));
  if (status.qa.gate) {
    const parts = [`Gate ${c.bold(status.qa.gate)}`];
    if (status.qa.reviewer) parts.push(`Revisor ${status.qa.reviewer}`);
    if (status.qa.revision) parts.push(`Revisão ${status.qa.revision}`);
    if (status.qa.date) parts.push(`Data ${status.qa.date}`);
    if (status.qa.iteration > 1) parts.push(`iteração ${status.qa.iteration}`);
    out.kv('QA', parts.join(' · '));
    if (status.qa.summary) out.kv('', c.gray(status.qa.summary));
    if (status.qa.followUp) out.kv('Follow-up', status.qa.followUp);
  } else {
    out.kv('QA', c.gray(status.qa.found ? 'sem veredito' : 'seção Resultado do QA ausente'));
  }
  if (status.gateFile) {
    out.kv('Arquivo do gate', `${status.gateFile.path}${status.gateFile.exists ? (status.gateFile.gate ? ` (${status.gateFile.gate})` : '') : c.yellow(' (não existe)')}`);
  }
  if (status.inspection) {
    const rev = status.inspection.revision ? `, revisão ${status.inspection.revision}` : '';
    out.kv('Inspeção', `${status.inspection.path} (${status.inspection.verdict || 'sem veredito'}${rev})${status.inspection.current ? '' : c.yellow(' · não cobre a revisão atual')}`);
  } else {
    out.kv('Inspeção', c.gray('nenhum relatório'));
  }
  out.line('');
  if (status.next.length === 0) out.warn('Sem próximo passo: corrija o status da story.');
  else {
    out.line(c.bold('Próximo passo:'));
    for (const step of status.next) out.line(`  ${c.cyan(`${step.agent} ${step.command}`)} ${c.gray(`(${step.reason})`)}`);
  }
}

module.exports = {
  name: 'story',
  summary: 'Mostra status, checkboxes, File List, QA e o próximo passo da story',
  usage: 'sia story status {storyId|caminho} [--json]',
  options: {},
  needsRoot: true,
  run(ctx) {
    const [sub, ref, extra] = ctx.positionals;
    if (sub !== 'status') ctx.usage(sub ? `subcomando desconhecido: ${sub}` : 'informe o subcomando: status');
    if (!ref) ctx.usage('informe o storyId (ex.: 1.3) ou o caminho da story.');
    if (extra) ctx.usage(`argumento inesperado: ${extra}`);
    const status = collectStatus(ctx.root.root, ctx.config, ref);
    if (ctx.out.json) ctx.out.printJson(status);
    else print(status, ctx.out);
    return status.statusValid ? EXIT.OK : EXIT.FAILURE;
  },
  collectStatus,
};

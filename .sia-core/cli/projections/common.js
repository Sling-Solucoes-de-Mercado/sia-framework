'use strict';

/**
 * Peças comuns às projeções: descrições, corpo de ativação, comandos do @validator e skills de workflow.
 */

const { summarizeAgent, truncate, collapse } = require('../lib/agents');
const { validAgents } = require('./content');

const HOOK_COMMANDS = Object.freeze({
  push: 'node .sia-core/hooks/enforce-git-push-authority.cjs',
  tracker: 'node .sia-core/hooks/track-active-agent.cjs',
});
const SIA_HOOK_MARKER = '.sia-core/hooks/';

const LENS_LABELS = Object.freeze({
  gaps: 'gaps',
  falhas: 'falhas',
  logica: 'lógica',
  regressao: 'regressão',
  seguranca: 'segurança',
  arquitetura: 'arquitetura',
  'codigo-morto': 'código morto',
});

function notice(source) {
  return `<!-- Gerado por \`sia sync\` a partir de ${source}. Não edite: altere a fonte e rode \`sia sync\`. -->`;
}

/** Escalar YAML entre aspas duplas (compatível com JSON). */
function yamlQuoted(text) {
  return JSON.stringify(collapse(text));
}

function agentDescription(summary, max = 240) {
  return truncate(`Ativa ${summary.name} (@${summary.id}), ${summary.title}. ${summary.firstSentence}`, max);
}

/**
 * Corpo de ativação de agente (skills e comandos).
 * @param {object} summary resumo do agente
 * @param {{ argsLine: string }} options
 */
function activationBody(summary, options) {
  const lines = [
    `# ${summary.icon ? `${summary.icon} ` : ''}${summary.name} (@${summary.id})`,
    '',
    `Ativação do agente **${summary.name}** (\`@${summary.id}\`), ${summary.title}.`,
    '',
    `1. Leia \`.sia-core/agents/${summary.id}.md\` POR INTEIRO. Ele é a fonte da verdade da persona, dos comandos e das dependências; esta projeção não copia a definição.`,
    '2. Siga as `activation-instructions` do bloco YAML exatamente e mantenha a persona até `*exit`.',
    `3. ${options.argsLine}`,
    '4. Dependências ficam em `.sia-core/{tipo}/{nome}` (tasks, templates, checklists, data, workflows) e só são carregadas quando um comando pedir.',
  ];
  if (summary.id === 'devops') {
    lines.push(
      '5. Push, PR, release e deploy de produção passam pelo hook de autoridade, que lê `.sia/active-agent.json`. Se o hook bloquear, confira `sia agent current` e, se preciso, rode `sia agent use devops`.',
    );
  }
  return lines.join('\n');
}

function agentSummaries(ctx) {
  return validAgents(ctx).map((parsed) => ({ parsed, summary: summarizeAgent(parsed) }));
}

/** Comandos do @validator com lentes (cada um vira um comando/skill nas IDEs). */
function validatorCommands(ctx) {
  const validator = validAgents(ctx).find((agent) => agent.id === 'validator');
  if (!validator) return [];
  return validator.commands
    .filter((cmd) => Array.isArray(cmd.lenses) && cmd.lenses.length > 0 && /^[a-z0-9][a-z0-9-]*$/.test(cmd.name))
    .map((cmd) => ({
      ...cmd,
      agent: summarizeAgent(validator),
      lensLabels: cmd.lenses.map((lens) => LENS_LABELS[lens] || lens),
    }));
}

function validatorDescription(cmd, max = 240) {
  const base = cmd.description ? cmd.description.replace(/[.\s]+$/, '') : `Comando *${cmd.name}`;
  return truncate(`${base}. Comando *${cmd.name} do @validator (${cmd.agent.name}); só revisa e grava o relatório.`, max);
}

/** Instruções do comando do @validator. */
function validatorBody(cmd, options) {
  const task = cmd.task || 'inspect.md';
  return [
    `# /${cmd.name}`,
    '',
    `Comando \`*${cmd.name}\` do \`@validator\` (${cmd.agent.name}). Lentes: ${cmd.lensLabels.join(', ')}.${cmd.scope ? ` Escopo: ${cmd.scope}.` : ''}`,
    '',
    '1. Aja como `@validator`: leia `.sia-core/agents/validator.md` por inteiro e adote a persona, sem saudação.',
    `2. Execute \`*${cmd.name} ${options.argsText}\` seguindo \`.sia-core/tasks/${task}\`, com as lentes acima.`,
    '3. Escopo aceito: storyId, `epic-*`, caminho ou nada (entrega recente pelo diff).',
    '4. Só revise: não edite código, não faça commit nem push e não mude status de story. O único arquivo gravado é o relatório em `docs/qa/inspections/`.',
    '5. Responda primeiro com o veredito e os achados (id, severidade, onde) e depois com o caminho do relatório.',
  ].join('\n');
}

/** Skills de workflow válidas do .sia-core/skills (com SKILL.md e frontmatter). */
function workflowSkills(ctx) {
  return ctx.skills.filter((skill) => skill.exists && skill.hasFrontmatter && !skill.error && /^[a-z0-9][a-z0-9-]*$/.test(skill.dirName));
}

function skillDescription(skill, max = 240) {
  const description = skill.frontmatter && skill.frontmatter.description ? skill.frontmatter.description : `Skill ${skill.dirName} do SIA`;
  return truncate(description, max);
}

/** Linhas "missão → comando → task" geradas do YAML do agente. */
function missionRows(parsed) {
  return parsed.commands
    .filter((cmd) => cmd.task)
    .map((cmd) => {
      const command = `\`*${cmd.name}${cmd.args ? ` ${cmd.args}` : ''}\``;
      const extras = [];
      if (cmd.template) extras.push(`template \`${cmd.template}\``);
      if (cmd.checklist) extras.push(`checklist \`${cmd.checklist}\``);
      if (cmd.lenses) extras.push(`lentes ${cmd.lenses.map((lens) => LENS_LABELS[lens] || lens).join(', ')}`);
      const task = `\`${cmd.task}\`${extras.length ? ` (${extras.join('; ')})` : ''}`;
      const mission = collapse(cmd.description || cmd.name).replace(/\|/g, '\\|');
      return `| ${mission} | ${command.replace(/\|/g, '\\|')} | ${task.replace(/\|/g, '\\|')} |`;
    });
}

/** Registra um caminho, evitando colisão entre artefatos gerados. */
function claimPath(claimed, filePath, warnings, label) {
  if (claimed.has(filePath)) {
    warnings.push(`${label}: ${filePath} já é gerado por outro artefato; ignorado.`);
    return false;
  }
  claimed.add(filePath);
  return true;
}

module.exports = {
  HOOK_COMMANDS,
  SIA_HOOK_MARKER,
  LENS_LABELS,
  notice,
  yamlQuoted,
  agentDescription,
  activationBody,
  agentSummaries,
  validatorCommands,
  validatorDescription,
  validatorBody,
  workflowSkills,
  skillDescription,
  missionRows,
  claimPath,
};

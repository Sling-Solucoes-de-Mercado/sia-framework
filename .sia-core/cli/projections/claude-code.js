'use strict';

/**
 * Projeção para o Claude Code.
 *  - .claude/skills/sia-{id}/SKILL.md            ativação dos agentes
 *  - .claude/commands/{prefixo}/agents/{id}.md   atalho legado /{prefixo}:agents:{id}
 *  - .claude/skills/{comando}/SKILL.md           comandos do @validator com lentes
 *  - .claude/skills/{skill}/SKILL.md             cópia das skills de workflow
 *  - .claude/agents/sia-{id}.md                  subagentes autônomos
 *  - .claude/rules/sia-{nome}.md                 cópia das regras
 *  - .claude/settings.json                       merge de hooks e permissões do SIA
 *  - CLAUDE.md                                   blocos gerenciados
 */

const path = require('path');
const { slashPrefix, get } = require('../lib/config');
const { truncate } = require('../lib/agents');
const content = require('./content');
const common = require('./common');
const { mergeHookGroups, siaPermissionRules, mergePermissions } = require('./hooks-merge');

const SUBAGENT_TOOLS = Object.freeze({
  pm: 'Read, Grep, Glob, Write, Edit, Bash',
  dev: 'Read, Grep, Glob, Write, Edit, Bash',
  devops: 'Read, Grep, Glob, Write, Edit, Bash',
  'squad-creator': 'Read, Grep, Glob, Write, Edit, Bash',
  validator: 'Read, Grep, Glob, Bash, Write',
});

function skillFile(summary) {
  return [
    '---',
    `name: sia-${summary.id}`,
    `description: ${common.yamlQuoted(common.agentDescription(summary))}`,
    'user-invocable: true',
    '---',
    '',
    common.notice(`.sia-core/agents/${summary.id}.md`),
    '',
    common.activationBody(summary, {
      argsLine: `Se esta skill receber argumentos ($ARGUMENTS), cumprimente e trate-os como o comando a executar depois da saudação (ex.: \`/sia-${summary.id} *help\`).`,
    }),
    '',
  ].join('\n');
}

function commandShim(summary, prefix) {
  return [
    '---',
    `description: ${common.yamlQuoted(truncate(`Ativa ${summary.name} (@${summary.id}), ${summary.title} (atalho da skill sia-${summary.id})`, 240))}`,
    '---',
    '',
    common.notice(`.sia-core/agents/${summary.id}.md`),
    '',
    `# /${prefix}:agents:${summary.id}`,
    '',
    `Siga a skill \`sia-${summary.id}\` (\`.claude/skills/sia-${summary.id}/SKILL.md\`) com os argumentos: $ARGUMENTS`,
    '',
    `Se a skill não estiver disponível, leia \`.sia-core/agents/${summary.id}.md\` por inteiro e siga as \`activation-instructions\` do bloco YAML.`,
    '',
  ].join('\n');
}

function validatorSkill(cmd) {
  return [
    '---',
    `name: ${cmd.name}`,
    `description: ${common.yamlQuoted(common.validatorDescription(cmd))}`,
    'disable-model-invocation: true',
    `argument-hint: ${common.yamlQuoted(cmd.args || '[storyId|epic-*|caminho]')}`,
    '---',
    '',
    common.notice('.sia-core/agents/validator.md'),
    '',
    common.validatorBody(cmd, { argsText: '$ARGUMENTS' }),
    '',
  ].join('\n');
}

function lowerFirst(text) {
  return /^[A-ZÀ-Ý][a-zà-ÿ]/.test(text) ? `${text[0].toLowerCase()}${text.slice(1)}` : text;
}

function restrictions(parsed, summary) {
  const lines = [];
  for (const item of summary.blocked) lines.push(`- Bloqueado: ${lowerFirst(item)}.`.replace(/\.\.$/, '.'));
  for (const item of summary.delegates) lines.push(`- Delegue: ${lowerFirst(item)}.`.replace(/\.\.$/, '.'));
  if (summary.id === 'devops') {
    lines.push(
      '- Push, PR, merge, release e deploy de produção exigem confirmação explícita do usuário. Sem ela na missão, prepare tudo e devolva no relatório o comando pronto para o usuário aprovar.',
      '- O hook de autoridade exige o agente ativo devops (`.sia/active-agent.json`); se bloquear, registre com `sia agent use devops` só quando a missão autorizar a operação.',
    );
  } else {
    lines.push('- Nunca execute `git push`, `gh pr create|merge`, `gh release create` nem deploy de produção: são exclusivos do `@devops` (o hook bloqueia).');
  }
  if (summary.id === 'validator') {
    lines.push('- Você só revisa: o único arquivo que grava é o relatório de inspeção em `docs/qa/inspections/`.');
  }
  return lines;
}

function subagentFile(parsed, summary) {
  const description = truncate(
    `${summary.name} (@${summary.id}), ${summary.title}, como subagente autônomo do SIA: recebe uma missão, executa a task mapeada e devolve um relatório. ${summary.firstSentence}`,
    300,
  );
  const rows = common.missionRows(parsed);
  const lines = [
    '---',
    `name: sia-${summary.id}`,
    `description: ${common.yamlQuoted(description)}`,
    'model: inherit',
    `tools: ${SUBAGENT_TOOLS[summary.id] || SUBAGENT_TOOLS.pm}`,
    '---',
    '',
    common.notice(`.sia-core/agents/${summary.id}.md`),
    '',
    `# sia-${summary.id}: ${summary.name} como subagente`,
    '',
    `Você é **${summary.name}** (\`@${summary.id}\`), ${summary.title} do SIA, executando como subagente autônomo. A missão chega no prompt do agente principal; execute-a e devolva um relatório.`,
    '',
    '## Carregamento (antes de agir)',
    '',
    `1. Leia \`.sia-core/agents/${summary.id}.md\` por inteiro e adote a persona definida ali. Não faça a saudação de ativação nem espere input: você é um subagente.`,
    '2. Leia `.sia-core/core-config.yaml` (caminhos, gates e limites do projeto).',
    `3. Se existir, leia \`.sia-core/agents/${summary.id}/MEMORY.md\`.`,
    '',
    '## Execução',
    '',
    '- Escolha na tabela abaixo o comando que corresponde à missão e execute a task mapeada (`.sia-core/tasks/{task}`) exatamente como escrita, com os templates e checklists citados.',
  ];
  if (parsed.hats.length > 0) lines.push('- Declare o chapéu ativo no início do trabalho (`[Chapéu: …]`) e aplique o checklist do chapéu sem atalhos.');
  lines.push(
    '- Tasks com `elicit: true` pedem interação. Use as respostas que vieram na missão; o que faltar, decida no modo YOLO e registre (na story, em `### Decisões (modo YOLO)`) ou devolva as perguntas no relatório.',
    '- Missão sem comando correspondente: faça só o que couber no papel do agente ou devolva ao agente principal indicando o agente certo.',
    '',
    '## Missão → comando → task',
    '',
    '| Missão | Comando | Task |',
    '|--------|---------|------|',
    ...(rows.length > 0 ? rows : ['| (sem comandos com task) | | |']),
    '',
    '## Restrições',
    '',
    ...restrictions(parsed, summary),
    '',
    '## Relatório final',
    '',
    'Devolva um relatório conciso: o que foi feito, arquivos criados ou alterados, status da story (quando houver), verificações executadas com o resultado e o próximo passo no formato `@agente *comando {args}`.',
    '',
  );
  return lines.join('\n');
}

function settingsTransform(ctx) {
  const siaGroups = {
    PreToolUse: { matcher: 'Bash', hooks: [{ type: 'command', command: common.HOOK_COMMANDS.push, timeout: 10 }] },
    UserPromptSubmit: { hooks: [{ type: 'command', command: common.HOOK_COMMANDS.tracker, timeout: 10 }] },
  };
  const rules = siaPermissionRules(get(ctx.config, 'boundary', {}), ctx.root);
  return (settings) => {
    const result = settings && typeof settings === 'object' ? settings : {};
    result.hooks = mergeHookGroups(result.hooks, siaGroups);
    const permissions = mergePermissions(result.permissions, rules);
    if (Object.keys(permissions).length > 0) result.permissions = permissions;
    else delete result.permissions;
    return result;
  };
}

function generate(ctx) {
  const prefix = slashPrefix(ctx.config);
  const files = [];
  const warnings = [];
  const claimed = new Set();
  const add = (filePath, text, label) => {
    if (common.claimPath(claimed, filePath, warnings, label)) files.push({ path: filePath, content: text });
  };

  for (const { parsed, summary } of common.agentSummaries(ctx)) {
    add(`.claude/skills/sia-${summary.id}/SKILL.md`, skillFile(summary), `agente ${summary.id}`);
    add(`.claude/commands/${prefix}/agents/${summary.id}.md`, commandShim(summary, prefix), `agente ${summary.id}`);
    add(`.claude/agents/sia-${summary.id}.md`, subagentFile(parsed, summary), `agente ${summary.id}`);
  }
  for (const cmd of common.validatorCommands(ctx)) {
    add(`.claude/skills/${cmd.name}/SKILL.md`, validatorSkill(cmd), `comando *${cmd.name}`);
  }
  for (const skill of common.workflowSkills(ctx)) {
    add(`.claude/skills/${skill.dirName}/SKILL.md`, skill.raw, `skill ${skill.dirName}`);
  }
  for (const rule of ctx.rules) {
    add(`.claude/rules/sia-${rule.name}.md`, rule.raw, `regra ${rule.name}`);
  }
  for (const agent of ctx.agents.filter((a) => a.error)) {
    warnings.push(`agente ${agent.id} ignorado: ${agent.error}`);
  }

  return {
    ide: 'claude-code',
    dir: '.claude',
    files,
    blockFiles: [{ path: 'CLAUDE.md', blocks: content.essentialBlocks(ctx, 'claude-code') }],
    jsonFiles: [{ path: path.posix.join('.claude', 'settings.json'), transform: settingsTransform(ctx) }],
    warnings,
  };
}

module.exports = { generate, skillFile, subagentFile, settingsTransform, SUBAGENT_TOOLS };

'use strict';

/**
 * Projeção para o Grok Build.
 *
 * Documentação local (~/.grok/docs/user-guide/08-skills.md, 10-hooks.md, 12-project-rules.md, 16-subagents.md):
 * skills em .grok/skills/<nome>/SKILL.md; hooks em .grok/hooks/*.json (exigem projeto confiável);
 * handlers com o mesmo comando são deduplicados entre .grok/hooks e .claude/settings.json;
 * regras em .grok/rules/*.md. O .grok/config.toml só é tocado por `sia mcp setup`.
 *
 *  - .grok/skills/sia-{id}/SKILL.md            ativação dos agentes (/sia-{id})
 *  - .grok/agents/sia-{id}.md                  agentes de sessão/subagente
 *  - .grok/hooks/sia-git-push-authority.json   PreToolUse (Bash|run_terminal_command)
 *  - .grok/hooks/sia-track-agent.json          UserPromptSubmit
 *  - .grok/skills/{comando|skill}/SKILL.md     comandos do @validator e skills de workflow
 *  - .grok/rules/sia-core.md                   blocos gerenciados
 */

const content = require('./content');
const common = require('./common');
const { truncate } = require('../lib/agents');

function skillFile(summary) {
  const aliases = [`/sia-${summary.id}`, `@${summary.id}`];
  const nameAlias = summary.name ? summary.name.toLowerCase() : null;
  if (nameAlias && nameAlias !== summary.id) aliases.push(`@${nameAlias}`);
  return [
    '---',
    `name: sia-${summary.id}`,
    `description: ${common.yamlQuoted(common.agentDescription(summary))}`,
    `when-to-use: ${common.yamlQuoted(truncate(`Quando o usuário digitar ${aliases.join(', ')} ou pedir: ${summary.firstSentence}`, 300))}`,
    'user-invocable: true',
    'metadata:',
    `  short-description: ${common.yamlQuoted(`${summary.icon} ${summary.title}`)}`,
    `  sia-agent-id: ${common.yamlQuoted(summary.id)}`,
    `  sia-source: ${common.yamlQuoted(`.sia-core/agents/${summary.id}.md`)}`,
    '---',
    '',
    common.notice(`.sia-core/agents/${summary.id}.md`),
    '',
    common.activationBody(summary, {
      argsLine: `Se o usuário digitar um comando junto da ativação (ex.: \`/sia-${summary.id} *help\`), cumprimente e execute-o depois da saudação.`,
    }),
    '',
  ].join('\n');
}

function agentFile(summary) {
  const description = truncate(
    `${summary.icon} ${summary.name} (@${summary.id}), ${summary.title}. ${summary.firstSentence} Use /sia-${summary.id} ou spawn_subagent com subagent_type "sia-${summary.id}".`,
    320,
  );
  return [
    '---',
    `name: sia-${summary.id}`,
    `description: ${common.yamlQuoted(description)}`,
    'prompt_mode: full',
    'model: inherit',
    'permission_mode: default',
    'agents_md: true',
    '---',
    '',
    common.notice(`.sia-core/agents/${summary.id}.md`),
    '',
    `# sia-${summary.id}: ${summary.name} (@${summary.id})`,
    '',
    `Você é **${summary.name}** (\`@${summary.id}\`), ${summary.title} do SIA.`,
    '',
    `1. Leia \`.sia-core/agents/${summary.id}.md\` por inteiro e adote a persona definida ali; ele é a fonte da verdade dos comandos e das dependências.`,
    '2. Leia `.sia-core/core-config.yaml` e, se existir, a memória do agente em `.sia-core/agents/' + summary.id + '/MEMORY.md`.',
    '3. Como sessão interativa, siga as `activation-instructions` (saudação e espera). Como subagente, não cumprimente: escolha o comando do YAML que corresponde à missão, execute a task mapeada em `.sia-core/tasks/` exatamente como escrita e devolva um relatório conciso (feito, arquivos, verificações, próximo passo `@agente *comando`).',
    '4. Respeite `authority` do agente. Push, PR, release e deploy de produção são exclusivos do `@devops` e passam pelo hook de autoridade.',
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
    'user-invocable: true',
    'metadata:',
    `  short-description: ${common.yamlQuoted(`@validator *${cmd.name}`)}`,
    '---',
    '',
    common.notice('.sia-core/agents/validator.md'),
    '',
    common.validatorBody(cmd, { argsText: '{argumentos digitados depois do comando}' }),
    '',
  ].join('\n');
}

function hookJson(event, group) {
  return `${JSON.stringify({ hooks: { [event]: [group] } }, null, 2)}\n`;
}

function generate(ctx) {
  const files = [];
  const warnings = [];
  const claimed = new Set();
  const add = (filePath, text, label) => {
    if (common.claimPath(claimed, filePath, warnings, label)) files.push({ path: filePath, content: text });
  };
  for (const { summary } of common.agentSummaries(ctx)) {
    add(`.grok/skills/sia-${summary.id}/SKILL.md`, skillFile(summary), `agente ${summary.id}`);
    add(`.grok/agents/sia-${summary.id}.md`, agentFile(summary), `agente ${summary.id}`);
  }
  add(
    '.grok/hooks/sia-git-push-authority.json',
    hookJson('PreToolUse', {
      matcher: 'Bash|run_terminal_command',
      hooks: [{ type: 'command', command: common.HOOK_COMMANDS.push, timeout: 10 }],
    }),
    'hook',
  );
  add(
    '.grok/hooks/sia-track-agent.json',
    hookJson('UserPromptSubmit', { hooks: [{ type: 'command', command: common.HOOK_COMMANDS.tracker, timeout: 10 }] }),
    'hook',
  );
  for (const cmd of common.validatorCommands(ctx)) {
    add(`.grok/skills/${cmd.name}/SKILL.md`, validatorSkill(cmd), `comando *${cmd.name}`);
  }
  for (const skill of common.workflowSkills(ctx)) {
    add(`.grok/skills/${skill.dirName}/SKILL.md`, skill.raw, `skill ${skill.dirName}`);
  }
  return {
    ide: 'grok',
    dir: '.grok',
    files,
    blockFiles: [{ path: '.grok/rules/sia-core.md', blocks: [...content.essentialBlocks(ctx, 'grok'), content.shortcutsBlock(ctx, 'grok'), content.rulesBlock(ctx)] }],
    jsonFiles: [],
    warnings,
  };
}

module.exports = { generate };

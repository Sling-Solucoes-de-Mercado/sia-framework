'use strict';

/**
 * Projeção para o Codex (OpenAI).
 *
 * Documentação oficial (learn.chatgpt.com/docs/build-skills): o Codex descobre skills de projeto em
 * `.agents/skills/<nome>/SKILL.md` (do cwd até a raiz do repositório); `.codex/skills` é legado.
 * Frontmatter lido: name (até 64 caracteres), description e metadata.short-description.
 * Hooks (learn.chatgpt.com/docs/hooks) são estáveis e ligados por padrão; projeto: `.codex/hooks.json`.
 *
 *  - .agents/skills/sia-{id}/SKILL.md      ativação dos agentes ($sia-{id})
 *  - .agents/skills/{comando}/SKILL.md     comandos do @validator
 *  - .agents/skills/{skill}/SKILL.md       cópia das skills de workflow
 *  - .codex/hooks.json                     merge dos hooks do SIA (PreToolUse e UserPromptSubmit)
 *  - AGENTS.md                             blocos gerenciados (essencial + atalhos + regras)
 */

const content = require('./content');
const common = require('./common');
const { mergeHookGroups } = require('./hooks-merge');
const { truncate } = require('../lib/agents');

// project_doc_max_bytes padrão do Codex: 32 KiB.
const AGENTS_MD_LIMIT = 32 * 1024;

function skillFile(summary) {
  return [
    '---',
    `name: sia-${summary.id}`,
    `description: ${common.yamlQuoted(common.agentDescription(summary))}`,
    'metadata:',
    `  short-description: ${common.yamlQuoted(truncate(`${summary.icon} ${summary.name}, ${summary.title}`, 80))}`,
    '---',
    '',
    common.notice(`.sia-core/agents/${summary.id}.md`),
    '',
    common.activationBody(summary, {
      argsLine: `Se o usuário mencionar a skill junto de um comando (ex.: \`$sia-${summary.id} *help\`), cumprimente e execute o comando depois da saudação.`,
    }),
    '',
  ].join('\n');
}

function validatorSkill(cmd) {
  return [
    '---',
    `name: ${cmd.name}`,
    `description: ${common.yamlQuoted(common.validatorDescription(cmd))}`,
    'metadata:',
    `  short-description: ${common.yamlQuoted(`@validator *${cmd.name}`)}`,
    '---',
    '',
    common.notice('.sia-core/agents/validator.md'),
    '',
    common.validatorBody(cmd, { argsText: '{escopo informado pelo usuário}' }),
    '',
  ].join('\n');
}

function hooksTransform() {
  const siaGroups = {
    PreToolUse: { matcher: '^Bash$', hooks: [{ type: 'command', command: common.HOOK_COMMANDS.push, timeout: 10 }] },
    UserPromptSubmit: { hooks: [{ type: 'command', command: common.HOOK_COMMANDS.tracker, timeout: 10 }] },
  };
  return (data) => {
    const result = data && typeof data === 'object' ? data : {};
    result.hooks = mergeHookGroups(result.hooks, siaGroups);
    return result;
  };
}

function generate(ctx) {
  const files = [];
  const warnings = [];
  const claimed = new Set();
  const add = (filePath, text, label) => {
    if (common.claimPath(claimed, filePath, warnings, label)) files.push({ path: filePath, content: text });
  };
  for (const { summary } of common.agentSummaries(ctx)) {
    add(`.agents/skills/sia-${summary.id}/SKILL.md`, skillFile(summary), `agente ${summary.id}`);
  }
  for (const cmd of common.validatorCommands(ctx)) {
    add(`.agents/skills/${cmd.name}/SKILL.md`, validatorSkill(cmd), `comando *${cmd.name}`);
  }
  for (const skill of common.workflowSkills(ctx)) {
    add(`.agents/skills/${skill.dirName}/SKILL.md`, skill.raw, `skill ${skill.dirName}`);
  }
  const blocks = [...content.essentialBlocks(ctx, 'codex'), content.shortcutsBlock(ctx, 'codex'), content.rulesBlock(ctx)];
  const size = Buffer.byteLength(blocks.map((block) => block.content).join('\n\n'), 'utf8');
  if (size > AGENTS_MD_LIMIT) {
    warnings.push(
      `AGENTS.md: os blocos do SIA somam ${Math.round(size / 1024)} KiB; o Codex lê até 32 KiB por padrão (project_doc_max_bytes). Aumente o limite em ~/.codex/config.toml ou enxugue .sia-core/rules/.`,
    );
  }
  return {
    ide: 'codex',
    dir: '.agents',
    files,
    blockFiles: [{ path: 'AGENTS.md', blocks }],
    jsonFiles: [{ path: '.codex/hooks.json', transform: hooksTransform() }],
    warnings,
  };
}

module.exports = { generate, AGENTS_MD_LIMIT, hooksTransform };

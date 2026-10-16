'use strict';

/**
 * Projeção para o Gemini CLI.
 *
 * Documentação oficial (geminicli.com/docs, v0.64): comandos em `.gemini/commands/*.toml`
 * (description, prompt, {{args}}); hooks estáveis em `.gemini/settings.json`
 * (eventos BeforeTool e BeforeAgent, matcher regex, timeout em milissegundos,
 * shell `run_shell_command`, payload com tool_input.command e prompt).
 *
 *  - .gemini/commands/sia-{id}.toml        ativação dos agentes (/sia-{id})
 *  - .gemini/commands/sia-menu.toml        menu dos agentes
 *  - .gemini/commands/{comando}.toml       comandos do @validator
 *  - .gemini/commands/{skill}.toml         skills de workflow (lê .sia-core/skills/{skill}/SKILL.md)
 *  - .gemini/settings.json                 merge dos hooks do SIA
 *  - GEMINI.md                             blocos gerenciados (essencial + atalhos + regras)
 */

const content = require('./content');
const common = require('./common');
const { mergeHookGroups } = require('./hooks-merge');
const { truncate } = require('../lib/agents');

function tomlBasic(text) {
  return `"${String(text).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t')}"`;
}

function tomlMultiline(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/"""/g, '""\\"');
}

function commandToml(description, prompt) {
  return [`# Gerado por \`sia sync\`. Não edite: altere a fonte em .sia-core/ e rode \`sia sync\`.`, `description = ${tomlBasic(description)}`, 'prompt = """', tomlMultiline(prompt), '"""', ''].join('\n');
}

function agentCommand(summary) {
  const prompt = [
    `Ative o agente ${summary.id} do SIA (${summary.name}, ${summary.title}).`,
    '',
    `1. Leia \`.sia-core/agents/${summary.id}.md\` POR INTEIRO; é a fonte da verdade da persona, dos comandos e das dependências.`,
    '2. Siga as `activation-instructions` do bloco YAML exatamente e mantenha a persona até `*exit`.',
    '3. Argumentos da ativação: {{args}}',
    '   Se houver argumentos, cumprimente e trate-os como o comando a executar depois da saudação.',
  ];
  if (summary.id === 'devops') {
    prompt.push('4. Push, PR, release e deploy de produção passam pelo hook de autoridade (`.sia/active-agent.json`); se ele bloquear, confira `sia agent current`.');
  }
  return commandToml(truncate(`Ativa ${summary.name} (@${summary.id}), ${summary.title}. ${summary.firstSentence}`, 200), prompt.join('\n'));
}

function menuCommand(ctx, summaries) {
  const lines = [
    'Você está no menu do SIA (Sling Inteligência Artificial) no Gemini CLI.',
    '',
    'Mostre a lista numerada abaixo, com uma linha de quando usar cada agente, e peça para o usuário escolher um número ou digitar o comando:',
    '',
  ];
  summaries.forEach(({ summary }, index) => {
    lines.push(`${index + 1}. /sia-${summary.id}: ${summary.name}, ${summary.title}. ${truncate(summary.firstSentence, 140)}`);
  });
  const validator = common.validatorCommands(ctx).map((cmd) => `/${cmd.name}`);
  if (validator.length) lines.push('', `Inspeção (@validator): ${validator.join(', ')}.`);
  const skills = common.workflowSkills(ctx).map((skill) => `/${skill.dirName}`);
  if (skills.length) lines.push(`Workflows: ${skills.join(', ')}.`);
  lines.push('', 'Argumentos recebidos: {{args}}');
  return commandToml('Menu do SIA: lista os agentes e indica qual ativar', lines.join('\n'));
}

function validatorCommand(cmd) {
  return commandToml(common.validatorDescription(cmd, 200), common.validatorBody(cmd, { argsText: '{{args}}' }));
}

function skillCommand(skill) {
  const prompt = [
    `Leia \`.sia-core/skills/${skill.dirName}/SKILL.md\` por inteiro e siga o protocolo da skill com estes argumentos: {{args}}`,
    '',
    'A task citada como fonte da verdade na skill prevalece; a skill só acrescenta o protocolo de invocação.',
  ].join('\n');
  return commandToml(common.skillDescription(skill, 200), prompt);
}

function settingsTransform() {
  const siaGroups = {
    BeforeTool: {
      matcher: '^run_shell_command$',
      hooks: [{ name: 'sia-git-push-authority', type: 'command', command: common.HOOK_COMMANDS.push, timeout: 10000 }],
    },
    BeforeAgent: {
      hooks: [{ name: 'sia-track-active-agent', type: 'command', command: common.HOOK_COMMANDS.tracker, timeout: 10000 }],
    },
  };
  return (settings) => {
    const result = settings && typeof settings === 'object' ? settings : {};
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
  const summaries = common.agentSummaries(ctx);
  add('.gemini/commands/sia-menu.toml', menuCommand(ctx, summaries), 'menu');
  for (const { summary } of summaries) {
    add(`.gemini/commands/sia-${summary.id}.toml`, agentCommand(summary), `agente ${summary.id}`);
  }
  for (const cmd of common.validatorCommands(ctx)) {
    add(`.gemini/commands/${cmd.name}.toml`, validatorCommand(cmd), `comando *${cmd.name}`);
  }
  for (const skill of common.workflowSkills(ctx)) {
    add(`.gemini/commands/${skill.dirName}.toml`, skillCommand(skill), `skill ${skill.dirName}`);
  }
  return {
    ide: 'gemini',
    dir: '.gemini',
    files,
    blockFiles: [{ path: 'GEMINI.md', blocks: [...content.essentialBlocks(ctx, 'gemini'), content.shortcutsBlock(ctx, 'gemini'), content.rulesBlock(ctx)] }],
    jsonFiles: [{ path: '.gemini/settings.json', transform: settingsTransform() }],
    warnings,
  };
}

module.exports = { generate, settingsTransform, commandToml };

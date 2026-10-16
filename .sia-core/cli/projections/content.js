'use strict';

/**
 * Blocos de conteúdo essencial do SIA para os arquivos de contexto das IDEs
 * (CLAUDE.md, AGENTS.md, GEMINI.md, .grok/rules/sia-core.md).
 * Tudo é derivado do .sia-core (agentes, constitution, regras, core-config).
 */

const { get, maxQgIterations, slashPrefix } = require('../lib/config');
const { summarizeAgent } = require('../lib/agents');

const ACTIVATION = {
  'claude-code': (id, prefix) => `\`@${id}\` · \`/sia-${id}\` · \`/${prefix}:agents:${id}\``,
  codex: (id) => `\`@${id}\` · \`$sia-${id}\``,
  gemini: (id) => `\`@${id}\` · \`/sia-${id}\``,
  grok: (id) => `\`@${id}\` · \`/sia-${id}\``,
};

const PROJECTION_PATHS = {
  'claude-code':
    '`.claude/skills/` (skills do SIA), `.claude/commands/{prefixo}/agents/`, `.claude/agents/sia-*.md`, ' +
    '`.claude/rules/sia-*.md`, as entradas do SIA em `.claude/settings.json` e os blocos do `CLAUDE.md`',
  codex: '`.agents/skills/` (skills do SIA), as entradas do SIA em `.codex/hooks.json` e os blocos do `AGENTS.md`',
  gemini: '`.gemini/commands/` (comandos do SIA), as entradas do SIA em `.gemini/settings.json` e os blocos do `GEMINI.md`',
  grok: '`.grok/skills/`, `.grok/agents/sia-*.md`, `.grok/hooks/sia-*.json` e os blocos de `.grok/rules/sia-core.md`',
};

/** Artigos da constitution: "### I. CLI First (INEGOCIÁVEL)". */
function parseConstitution(text) {
  const articles = [];
  const re = /^###\s+([IVXLC]+)\.\s+(.+?)\s*\(([^)]+)\)\s*$/gm;
  let match;
  while ((match = re.exec(String(text || ''))) !== null) {
    articles.push({ numeral: match[1], title: match[2].trim(), severity: match[3].trim() });
  }
  return articles;
}

function validAgents(ctx) {
  return ctx.agents.filter((agent) => !agent.error && agent.agent);
}

function introBlock() {
  return {
    id: 'sia-intro',
    content: [
      '# SIA: Sling Inteligência Artificial',
      '',
      'Este projeto usa o **SIA**, framework de desenvolvimento orientado por agentes de IA, derivado do AIOX. O trabalho acontece em stories (`docs/stories/`), o processo vive em tasks executáveis (`.sia-core/tasks/`) e 5 agentes dividem as responsabilidades.',
      '',
      '- Fonte da verdade: `.sia-core/` e `squads/`. As pastas das IDEs são projeções geradas por `sia sync`.',
      '- Configuração: `.sia-core/core-config.yaml`. Formatos: `.sia-core/data/sia-authoring-guide.md`. Guia do usuário: `.sia-core/user-guide.md`.',
      '- Task é lei: ao executar um comando, siga a task exatamente como escrita, inclusive os pontos de elicitação (`elicit: true`), com opções numeradas.',
      '- Idioma: português do Brasil com acentuação. Ids, status da story e vereditos do QA gate ficam em inglês.',
    ].join('\n'),
  };
}

function constitutionBlock(ctx) {
  const articles = parseConstitution(ctx.constitutionText);
  const lines = ['## Constitution', '', 'Princípios em `.sia-core/constitution.md`. Gates automáticos bloqueiam violações dos princípios INEGOCIÁVEIS.', ''];
  if (articles.length > 0) {
    lines.push('| Artigo | Princípio | Severidade |', '|--------|-----------|------------|');
    for (const article of articles) lines.push(`| ${article.numeral} | ${article.title} | ${article.severity} |`);
    lines.push('');
  }
  lines.push(
    '- Só o `@devops` faz `git push`, PR, release, tag e deploy de produção; o hook `enforce-git-push-authority` bloqueia os demais.',
    '- Nenhum código sem story; specs não inventam requisito; lint, typecheck, testes e build passam antes do push.',
  );
  return { id: 'sia-constitution', content: lines.join('\n') };
}

function agentsBlock(ctx, ide) {
  const prefix = slashPrefix(ctx.config);
  const activation = ACTIVATION[ide] || ACTIVATION.gemini;
  const lines = ['## Agentes', '', '| Agente | Nome | Papel | Ativação |', '|--------|------|-------|----------|'];
  const aliases = [];
  const hatLines = [];
  for (const parsed of validAgents(ctx)) {
    const s = summarizeAgent(parsed);
    lines.push(`| ${s.icon} \`@${s.id}\` | ${s.name} | ${s.title} | ${activation(s.id, prefix)} |`);
    const nameAlias = s.name ? s.name.toLowerCase() : null;
    if (nameAlias && nameAlias !== s.id) aliases.push(`\`@${nameAlias}\``);
    if (parsed.hats.length > 0) {
      hatLines.push(`\`@${s.id}\` [${parsed.hats.map((hat) => hat.name || hat.id).join(', ')}]`);
    }
  }
  lines.push('');
  lines.push(
    `Comandos usam \`*\` (\`*help\`, \`*guide\`, \`*exit\`). Na ativação o agente lê \`.sia-core/agents/{id}.md\` por inteiro; a projeção nunca copia a definição.${
      aliases.length ? ` Aliases: ${aliases.join(', ')}.` : ''
    }`,
  );
  if (hatLines.length > 0) {
    lines.push(`Chapéus: ${hatLines.join('; ')}. Ao trocar de chapéu o agente declara \`[Chapéu: …]\` e aplica o checklist do chapéu sem atalhos.`);
  }
  if (ide === 'claude-code') lines.push('Subagentes autônomos: `sia-{id}` em `.claude/agents/` (delegação de missão com relatório no fim).');
  if (ide === 'grok') lines.push('Subagentes: `spawn_subagent` com `subagent_type: "sia-{id}"` (definições em `.grok/agents/`).');
  return { id: 'sia-agents', content: lines.join('\n') };
}

function storyCycleBlock(ctx) {
  const minScore = get(ctx.config, 'quality.storyValidation.minScore', 7);
  const max = maxQgIterations(ctx.config);
  return {
    id: 'sia-story-cycle',
    content: [
      '## Ciclo da story',
      '',
      '`Draft → Ready → InProgress → InReview → Done`',
      '',
      '| Etapa | Agente | Comando |',
      '|-------|--------|---------|',
      '| Criar (→ Draft) | `@pm` [Scrum] | `*create-story` |',
      `| Validar (Draft → Ready, GO ≥ ${minScore}/10) | \`@pm\` [Product Owner] | \`*validate-story {storyId}\` |`,
      '| Executar (Ready → InProgress → InReview) | executor de `## Executor`: `@dev` (padrão), `@devops` (infraestrutura) ou `@pm` [Análise] (pesquisa) | `*develop {storyId}` ou `*execute-research-story {storyId}` |',
      '| Inspecionar (não muda status; pesquisa não passa) | `@validator` | `*revisar-feature {storyId}` |',
      '| QA gate (InReview → Done ou InProgress) | `@pm` [Qualidade] | `*qa-gate {storyId}` |',
      '| Corrigir (gate FAIL ou inspeção reprovada) | `@dev` | `*apply-qa-fixes {storyId}` |',
      '| Entregar (só com a story Done) | `@devops` | `*push`, `*create-pr {storyId}` |',
      '',
      `Ciclo completo: skill \`sia-full-sdc\` com \`sia sdc plan|next|verify\`. QA Loop: no máximo ${max} iterações de correção; depois, escale para um humano. Toda transição de status vai para o \`## Change Log\` da story (data, \`@agente [Chapéu]\`, de → para, motivo).`,
    ].join('\n'),
  };
}

function cliBlock() {
  return {
    id: 'sia-cli',
    content: [
      '## CLI `sia`',
      '',
      'Rode na raiz do projeto: `sia {comando}` ou `node .sia-core/cli/sia.js {comando}`. Todo comando aceita `--json`.',
      '',
      '| Comando | Função |',
      '|---------|--------|',
      '| `sia doctor` | Diagnóstico: Node, estrutura, config, git, gh, projeções, hooks e MCPs |',
      '| `sia validate [--squad nome] [--strict]` | Valida agentes, tasks, templates, workflows, regras, skills e squads |',
      '| `sia sync [--ide lista] [--check]` | Gera ou confere as projeções das IDEs |',
      '| `sia story status {storyId}` | Status, checkboxes, File List, QA e próximo passo da story |',
      '| `sia sdc plan\\|next\\|verify\\|mark\\|status {storyId}` | Estado e verificação do ciclo da story |',
      '| `sia mcp setup {servidor} [--ide lista]`, `sia mcp status` | Configura e confere os MCPs (Supabase, Vercel) |',
      '| `sia squad list` | Lista os squads locais |',
      '| `sia agent use {id}\\|current\\|clear` | Registra, mostra ou limpa o agente ativo |',
    ].join('\n'),
  };
}

function boundaryBlock(ctx, ide) {
  const prefix = slashPrefix(ctx.config);
  const protection = get(ctx.config, 'boundary.frameworkProtection', false) === true;
  const protectedList = get(ctx.config, 'boundary.protected', []);
  const exceptions = get(ctx.config, 'boundary.exceptions', []);
  const paths = (PROJECTION_PATHS[ide] || '').replace('{prefixo}', prefix);
  const lines = [
    '## Fronteira do framework',
    '',
    `- Não edite projeções à mão: ${paths}. Mude a fonte em \`.sia-core/\` (ou \`squads/\`) e rode \`sia sync\`; \`sia sync --check\` aponta divergências.`,
    '- Blocos `<!-- SIA-MANAGED-START/END -->` pertencem ao SIA e são regenerados; o restante deste arquivo é do projeto e é preservado.',
  ];
  if (Array.isArray(protectedList) && protectedList.length > 0) {
    lines.push(
      `- Protegidos (\`boundary.frameworkProtection: ${protection}\`): ${protectedList.map((p) => `\`${p}\``).join(', ')}.` +
        (Array.isArray(exceptions) && exceptions.length ? ` Exceções editáveis: ${exceptions.map((p) => `\`${p}\``).join(', ')}.` : ''),
    );
  }
  lines.push('- Criar ou alterar agentes, tasks, workflows e squads é com o `@squad-creator`, seguindo o guia de autoria.');
  lines.push('- Runtime local, fora do git: `.sia/` (agente ativo, estado do ciclo, handoffs).');
  return { id: 'sia-boundary', content: lines.join('\n') };
}

function shortcutsBlock(ctx, ide) {
  const lines = [
    '## Ativação de agentes',
    '',
    'Quando a mensagem do usuário começar com um destes atalhos, leia o arquivo do agente POR INTEIRO e siga as `activation-instructions` do bloco YAML, mantendo a persona até `*exit`:',
    '',
    '| Atalho | Arquivo do agente |',
    '|--------|-------------------|',
  ];
  for (const parsed of validAgents(ctx)) {
    const s = summarizeAgent(parsed);
    const shortcuts = [`\`@${s.id}\``];
    const nameAlias = s.name ? s.name.toLowerCase() : null;
    if (nameAlias && nameAlias !== s.id) shortcuts.push(`\`@${nameAlias}\``);
    if (ide === 'codex') shortcuts.push(`\`$sia-${s.id}\``);
    else shortcuts.push(`\`/sia-${s.id}\``);
    lines.push(`| ${shortcuts.join(', ')} | \`.sia-core/agents/${s.id}.md\` |`);
  }
  lines.push('', 'Texto depois do atalho (ex.: `@pm *qa-gate 2.1`) é o comando a executar logo após a saudação.');
  return { id: 'sia-shortcuts', content: lines.join('\n') };
}

/** Rebaixa cabeçalhos Markdown fora de blocos de código. */
function demoteHeadings(markdown, by) {
  let fence = null;
  return String(markdown || '')
    .split('\n')
    .map((line) => {
      const fenceMatch = line.match(/^\s*(```+|~~~+)/);
      if (fenceMatch) {
        const marker = fenceMatch[1][0];
        if (!fence) fence = marker;
        else if (marker === fence) fence = null;
        return line;
      }
      if (fence) return line;
      const match = line.match(/^(#{1,6})(\s.*)$/);
      if (!match) return line;
      return `${'#'.repeat(Math.min(6, match[1].length + by))}${match[2]}`;
    })
    .join('\n');
}

/**
 * Bloco de regras para IDEs sem pasta de regras do SIA (Codex, Gemini e Grok).
 * Regras com `embed: full` no frontmatter entram com o corpo inteiro; as demais entram
 * como resumo (título, quando se aplica e caminho), para caber no limite de contexto
 * das IDEs (o Codex lê até 32 KiB do AGENTS.md).
 */
function rulesBlock(ctx) {
  const lines = ['## Regras do SIA', ''];
  const rules = ctx.rules.filter((rule) => !rule.error);
  if (rules.length === 0) {
    lines.push('Nenhuma regra em `.sia-core/rules/` ainda.');
    return { id: 'sia-rules', content: lines.join('\n') };
  }
  const parsed = rules.map((rule) => {
    const body = String(rule.body || '').replace(/^\s+/, '');
    const h1 = body.match(/^#\s+(.+)\n?/);
    const fm = rule.frontmatter || {};
    return {
      name: rule.name,
      title: h1 ? h1[1].trim() : rule.name,
      rest: h1 ? body.slice(h1[0].length) : body,
      description: fm.description ? String(fm.description).trim() : '',
      full: String(fm.embed || '').trim().toLowerCase() === 'full',
    };
  });
  lines.push('Conteúdo normativo de `.sia-core/rules/` (DEVE, NÃO DEVE, DEVERIA).');
  for (const rule of parsed.filter((r) => r.full)) {
    lines.push('', `### ${rule.title}`, '', `> Fonte: \`.sia-core/rules/${rule.name}.md\`${rule.description ? `. Quando se aplica: ${rule.description}` : ''}`, '');
    lines.push(demoteHeadings(rule.rest.trim(), 2));
  }
  const summaries = parsed.filter((r) => !r.full);
  if (summaries.length > 0) {
    lines.push('', '### Outras regras', '', 'Leia o arquivo completo antes de executar um comando ligado ao assunto da regra.', '');
    for (const rule of summaries) {
      lines.push(`- **${rule.title}** (\`.sia-core/rules/${rule.name}.md\`)${rule.description ? `: ${rule.description}` : ''}`);
    }
  }
  return { id: 'sia-rules', content: lines.join('\n') };
}

/** Blocos essenciais comuns a todas as IDEs. */
function essentialBlocks(ctx, ide) {
  return [introBlock(), constitutionBlock(ctx), agentsBlock(ctx, ide), storyCycleBlock(ctx), cliBlock(), boundaryBlock(ctx, ide)];
}

module.exports = {
  parseConstitution,
  essentialBlocks,
  shortcutsBlock,
  rulesBlock,
  demoteHeadings,
  validAgents,
};

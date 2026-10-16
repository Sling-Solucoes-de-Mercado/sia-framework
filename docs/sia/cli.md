# CLI `sia`: referência

A CLI `sia` é a parte executável do SIA: valida o framework, gera as projeções das IDEs, lê o estado das stories, conduz o ciclo da story com estado durável, configura MCPs e registra o agente ativo. Os hooks de governança ficam ao lado, em `.sia-core/hooks/`.

- Entrada: `.sia-core/cli/sia.js` (`bin` `sia` em `.sia-core/package.json`).
- Requisitos: Node.js 22 ou superior (18 e 20 saíram de suporte). CommonJS, sem dependências instaladas; o js-yaml 4 é vendorizado em `cli/vendor/js-yaml.js` com a licença MIT em `cli/vendor/js-yaml.LICENSE`.
- Execução: `sia {comando}` ou `node .sia-core/cli/sia.js {comando}`, sempre a partir do projeto.
- Mensagens em português do Brasil; código e identificadores em inglês.

## Sumário

1. [Opções globais e códigos de saída](#opções-globais-e-códigos-de-saída)
2. [sia doctor](#sia-doctor)
3. [sia validate](#sia-validate)
4. [sia sync](#sia-sync)
5. [sia story status](#sia-story-status)
6. [sia sdc](#sia-sdc)
7. [sia mcp](#sia-mcp)
8. [sia squad list](#sia-squad-list)
9. [sia agent](#sia-agent)
10. [Hooks de governança](#hooks-de-governança)
11. [Formatos lidos e escritos](#formatos-lidos-e-escritos)
12. [Projeções por IDE](#projeções-por-ide)
13. [Testes](#testes)
14. [Limitações conhecidas](#limitações-conhecidas)

---

## Opções globais e códigos de saída

| Opção | Efeito |
|-------|--------|
| `--root {dir}` | Raiz do projeto. Sem ela, a CLI sobe a partir do diretório atual até achar `.sia-core/core-config.yaml`. |
| `--json` | Saída em JSON no stdout (inclusive erros: `{"ok": false, "error": {"code", "message"}}`). |
| `-h`, `--help` | Ajuda geral ou do comando (`sia sdc --help`). |
| `-v`, `--version` | Versão da CLI. |

| Código | Significado |
|--------|-------------|
| `0` | Sucesso |
| `1` | Falha de validação ou verificação (erros do `validate`, diferenças no `sync --check`, fase não cumprida no `sdc verify`, story não encontrada, ciclo interrompido pelo circuit breaker) |
| `2` | Erro de uso (comando ou opção desconhecida, argumento faltando, raiz do projeto não encontrada, IDE ou servidor desconhecido) |

O `.sia-core` pode ser um link simbólico (sandbox): a raiz é o diretório que contém o link, e os caminhos lógicos são preservados.

Cores ANSI só em terminal (TTY). `NO_COLOR` (não vazio) desliga as cores; `FORCE_COLOR` (diferente de `0`) liga. `SIA_DEBUG=1` mostra o stack de erros inesperados.

---

## sia doctor

```bash
sia doctor [--json] [--root dir]
```

Diagnóstico do ambiente. Cada verificação sai como ✓ (ok), ⚠ (aviso) ou ✗ (falha), com a sugestão de correção na linha seguinte.

| Área | Verificação | Nível quando falha |
|------|-------------|--------------------|
| node | Node.js 22 ou superior | ✗ |
| estrutura | Raiz encontrada (e se o `.sia-core` é link); `core-config.yaml`, `constitution.md`, `agents/` com os 5 agentes, `tasks/`, os 2 hooks e `cli/sia.js` | ✗ |
| estrutura | `templates/`, `checklists/`, `workflows/`, `data/`, `rules/`, `skills/`, `schemas/`, `user-guide.md` | ⚠ |
| config | `core-config.yaml` parseia; chaves `sia.version`, `project`, `paths`, `quality`, `ide.targets`, `boundary` | ✗ (parse) / ⚠ (chave) |
| git | Repositório git; `.sia/` no `.gitignore` | ⚠ |
| gh | GitHub CLI instalado e autenticado (`gh auth status`) | ⚠ (não fatal) |
| projeções | Para cada IDE de `ide.targets`, o mesmo cálculo do `sia sync --check` | ⚠ |
| hooks | Entradas do SIA em `.claude/settings.json`, `.codex/hooks.json` e `.gemini/settings.json`; arquivos `.grok/hooks/sia-*.json` | ⚠ (✗ se o JSON for inválido) |
| mcp | Para cada servidor com `integrations.{id}.enabled: true`, configuração presente nas IDEs de `ide.targets` (mesmo cálculo do `sia mcp status`); ausência de `data/mcp-servers.yaml` | ⚠ |
| docs | `paths.stories`, `paths.qaGates`, `paths.inspections`, `paths.qaAssessments` | ⚠ |

Saída `0` sem falhas (avisos não falham); `1` com qualquer ✗. Em JSON: `{ok, root, checks: [{level: ok|warn|fail, area, message, fix}]}`.

---

## sia validate

```bash
sia validate [--squad nome] [--strict] [--json]
```

Valida as partes mecânicas do guia de autoria (`.sia-core/data/sia-authoring-guide.md`). A saída é agrupada por tipo, com a contagem de artefatos verificados. Erros sempre falham; avisos só falham com `--strict`. Sem `--squad`, valida o `.sia-core` e todos os squads de `paths.squads`; com `--squad`, só o squad.

| Tipo | Regras (E = erro, A = aviso) |
|------|-------------------------------|
| Agentes (`agents/*.md`) | E: bloco ```` ```yaml ```` ausente ou inválido; `agent.name`, `id`, `title`, `icon`, `whenToUse` obrigatórios; `agent.id` igual ao nome do arquivo; comando duplicado no agente; `task`/`template`/`checklist` do comando fora de `dependencies`; **dependência ausente em `.sia-core/{type}/{name}`** (entrada terminada em `/` é diretório); comando com `hat` inexistente; chapéu que lista comando inexistente; agente dos 5 ausente. A: tipo de dependência desconhecido; comando sem task que não é embutido (`help`, `guide`, `yolo`, `exit`); campo de comando não reconhecido; `visibility` fora de `full`/`quick`/`key`; chapéu e comando divergentes |
| Tasks (`tasks/*.md`) | E: frontmatter ausente ou inválido; `id` igual ao arquivo; `title`; `agent` ∈ `pm`, `dev`, `devops`, `validator`, `squad-creator`, `any`; `hat` obrigatório e válido para `pm` e `dev` (chapéus do YAML do agente); `elicit` booleano; `depends_on` existente; seções `## Objetivo`, `## Passos`, `## Saída` e `## Critérios de conclusão`. A: `next` aponta para comando inexistente; `modes` fora de `yolo`/`interactive`/`preflight`; `hat` em agente sem chapéus |
| Templates (`templates/**`) | E: YAML que não parseia; template de documento (com chave `template`) sem `template.id` ou sem `sections` |
| Checklists | Contagem (a existência é cobrada pelas dependências) |
| Workflows (`workflows/*.yaml`) | E: YAML inválido; `workflow.id` igual ao arquivo; `sequence` lista; `agent` de cada passo entre os 5 agentes; `task` existente; `requires` apontando para ids de passos existentes; id de passo duplicado. A: passo sem `agent` (exceto passos `meta`) e `hat` inexistente no agente |
| `data/workflow-chains.yaml` | E: agente inválido ou comando que o agente não tem (passos e alternativas) |
| Regras (`rules/*.md`) | E: frontmatter inválido. A: sem frontmatter, sem `description`, `paths` que não é lista |
| Skills (`skills/*/SKILL.md`) | E: `SKILL.md` ausente; frontmatter ausente ou inválido; `name` diferente do diretório; `description` ausente; `**Task fonte da verdade:**` citando arquivo `.md` inexistente. A: `agent` desconhecido |
| Squads (`squads/{nome}/`) | E: `squad.yaml` ausente ou inválido; schema `.sia-core/schemas/squad-schema.json` (validador próprio do subconjunto `type`, `required`, `properties`, `pattern`, `enum`, `items`, `minLength`, `maxLength`, `additionalProperties`); `components.{tipo}` inexistente. Agentes, tasks e workflows do squad seguem as regras acima, resolvendo dependências primeiro no squad e depois no `.sia-core`, e aceitando os ids dos agentes do squad. A: schema ausente (validação de schema pulada); `name` diferente da pasta |

JSON: `{ok, strict, scope, summary: {checked, errors, warnings}, groups: {agents|tasks|templates|checklists|workflows|chains|rules|skills|squads: {label, checked, errors, warnings, issues: [{level, file, message}]}}}`.

---

## sia sync

```bash
sia sync [--ide claude-code,codex,gemini,grok] [--check] [--target dir] [--link-core] [--dry-run] [--json]
```

Gera as projeções das IDEs a partir do `.sia-core`. Toda projeção aponta para `.sia-core` como fonte da verdade e nunca copia a definição do agente.

| Opção | Efeito |
|-------|--------|
| `--ide lista` | IDEs separadas por vírgula (`claude-code`, `codex`, `gemini`, `grok`; aceita `claude`, `chatgpt`, `openai`, `gemini-cli`). Padrão: `ide.targets` do core-config. |
| `--check` | Gera em memória e compara com o disco; reporta `ausente` (missing), `divergente` (drift), `órfão` (stale), `conflito` e `erro`. Sai com `1` se houver qualquer diferença. |
| `--dry-run` | Mostra o que seria criado, atualizado ou removido, sem gravar. |
| `--target dir` | Grava as projeções em outro diretório (sandbox). |
| `--link-core` | Com `--target`, cria `dir/.sia-core → {raiz}/.sia-core` se não existir. Conveniência de desenvolvimento, não é instalador. |

### Arquivos gerenciados

- **Arquivos inteiros** (skills, comandos, subagentes, regras, hooks do Grok): registrados no manifesto `{pasta-da-ide}/sia-managed.json` (`{schemaVersion: 1, generatedBy: 'sia sync', files: [{path, sha256}]}`, caminhos relativos à pasta da IDE). Um arquivo do manifesto anterior que saiu da geração é removido e as pastas vazias são podadas. Um arquivo que existe, não está no manifesto e tem conteúdo diferente é **conflito**: nunca é tocado (idêntico é adotado).
- **Blocos gerenciados** (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.grok/rules/sia-core.md`): só o conteúdo entre `<!-- SIA-MANAGED-START: {id} -->` e `<!-- SIA-MANAGED-END: {id} -->` é do SIA. Blocos de mesmo id são substituídos no lugar, blocos novos vão para o fim, blocos do SIA que saíram da geração são removidos e o conteúdo do usuário é preservado.
- **JSON mesclado por chave** (`.claude/settings.json`, `.codex/hooks.json`, `.gemini/settings.json`): só as entradas do SIA (handler cujo comando contém `.sia-core/hooks/` e, no Claude Code, regras `Edit(.sia-core/...)`/`Write(.sia-core/...)`) são regeneradas; todo o resto é preservado. Não entram no manifesto. Diferença só de formatação não é reescrita.
- **Configuração de MCP nunca é tocada pelo sync**: `.mcp.json`, `mcpServers` do `.gemini/settings.json` e os blocos `# >>> SIA MCP` de `.codex/config.toml` e `.grok/config.toml` são de `sia mcp`.

### Permissões do Claude Code

Com `boundary.frameworkProtection: true`, o sync gerencia em `.claude/settings.json` as regras `permissions.deny` (`Edit(...)` e `Write(...)` para `boundary.protected`) e `permissions.allow` (para `boundary.exceptions`), de forma idempotente. Como no Claude Code `deny` vence `allow`, um diretório protegido (`x/**`) que contém uma exceção é expandido em entradas por arquivo e subpasta que não cobrem a exceção.

---

## sia story status

```bash
sia story status {storyId|caminho} [--json]
```

Resolve `{paths.stories}/{id}-*.story.md` ou `{id}.story.md` (busca recursiva) ou um caminho direto. Mostra título, status, executor declarado, checkboxes de `## Tasks / Subtasks` (concluídos/total), quantidade de arquivos na File List, campos do `## Resultado do QA` (última ocorrência de cada campo, iteração e follow-up), o arquivo do gate e o último relatório de inspeção da story (frontmatter `story` igual ao id).

Próximo passo sugerido:

| Situação | Sugestão |
|----------|----------|
| `Draft` | `@pm *validate-story {id}` |
| `Ready`, `InProgress` | executor declarado: `@dev *develop`, `@devops *develop` ou `@pm *execute-research-story` |
| `InProgress` com último gate `FAIL` | `@dev *apply-qa-fixes {id}` (ou o comando de execução do executor `@devops`/`@pm`) |
| `InReview` sem inspeção que cubra a revisão atual | `@validator *revisar-feature {id}` |
| `InReview` com inspeção `reprovado` | correção antes do gate, mantendo `InReview` (`*apply-qa-fixes`) |
| `InReview` com inspeção válida, ou story de pesquisa | `@pm *qa-gate {id}` |
| `Done` | `@devops *push`, `@devops *create-pr {id}` e `@pm *close-story {id}` |

A inspeção "cobre a revisão atual" quando o `revision` do relatório é o HEAD do git (prefixo de hash) e não é a mesma revisão de um gate `FAIL`. Sem git, vale o último relatório. Saída `1` quando o status é inválido ou a story não existe.

---

## sia sdc

```bash
sia sdc plan {storyId|caminho} [--mode yolo|interactive] [--force]
sia sdc next {storyId|caminho}
sia sdc verify {storyId|caminho} {fase} [--mark]
sia sdc mark {storyId|caminho} {fase} --status passed|failed|skipped|halted [--outcome approved|changes_requested] [--notes texto]
sia sdc status {storyId|caminho}
```

Ciclo da story com estado durável em `{paths.runtime}/sdc/{storyId}/state.json` (padrão `.sia/`, escrita atômica com arquivo temporário e rename).

Fases: `validate → develop → inspect → review → apply_qa_fixes (loop) → close`.

| Fase | Agente | Comando | Task | Skill |
|------|--------|---------|------|-------|
| `validate` | `@pm` [Product Owner] | `*validate-story` | `validate-story.md` | `sia-validate-story` |
| `develop` | executor declarado | `*develop` (`@dev`, `@devops`) ou `*execute-research-story` (`@pm`) | `develop-story.md` | `sia-develop-story` |
| `inspect` | `@validator` | `*revisar-feature` | `inspect.md` | `revisar-feature` |
| `review` | `@pm` [Qualidade] | `*qa-gate` | `qa-gate.md` | `sia-qa-gate` |
| `apply_qa_fixes` | executor declarado | `*apply-qa-fixes` (`@dev`) | `apply-qa-fixes.md` | `sia-apply-qa-fixes` |
| `close` | `@pm` [Product Owner] | `*close-story` | `close-story.md` | `sia-close-story` |

**plan** cria o estado (ou retoma o existente; `--force` recria) a partir do status da story: `Draft → validate`; `Ready`/`InProgress → develop`; `InReview → inspect`; `Done` com gate aprovado → `completed`; `Done` sem gate → `review`. O executor vem de `## Executor`; story de pesquisa (executor `@pm` [Análise]) marca `inspect` como `skipped`. `maxQgIterations` vem de `quality.qaLoop.maxIterations` (padrão 5).

**next** mostra fase, agente, comando, task, skill, subagente (`sia-{agente}`) e o comando de verificação. Não cria estado.

**verify** checa em disco:

| Fase | Verificação |
|------|-------------|
| `validate` | status ∈ `Ready`, `InProgress`, `InReview`, `Done` |
| `develop` | status ∈ `InReview`, `Done`; File List não vazia; aviso se houver checkbox aberto |
| `inspect` | relatório em `paths.inspections` com `story` igual ao id e veredito válido (`aprovado`, `aprovado com ressalvas`, `reprovado`); depois de correções, só vale relatório posterior à reabertura. `reprovado` → outcome `changes_requested`. Story de pesquisa: dispensada |
| `review` | `## Resultado do QA` com Gate, Revisor e Revisão. `FAIL` exige `InProgress` (outcome `changes_requested`); os demais exigem `Done` (outcome `approved`). Se o arquivo do gate existir, o veredito precisa bater. `WAIVED` exige `waiver.active: true`, `reason` e `approved_by`. Aviso sem relatório de inspeção quando `quality.inspection.requiredBeforeGate` é true |
| `apply_qa_fixes` | status `InReview` (correção depois de `FAIL` devolvida, ou inspeção reprovada mantida em `InReview`) |
| `close` | status `Done` e gate aprovado (`PASS`, `CONCERNS`, `WAIVED`), coerente com o arquivo do gate |

Com `--mark`, grava `passed` ou `failed` (criando o estado se preciso). **Sequence lock:** só a fase atual pode ser marcada por `verify --mark`; ciclo `halted` ou `completed` recusa marcação.

Transições:

- `review` approved → `close`; `review` changes_requested → `apply_qa_fixes`.
- `inspect` changes_requested (relatório `reprovado`) → `apply_qa_fixes` antes do gate.
- `apply_qa_fixes` passed → soma 1 em `qgIterations` e reabre `inspect` e `review` (reinspeção; em story de pesquisa só `review`).
- **Circuit breaker:** com changes_requested e `qgIterations ≥ maxQgIterations`, o ciclo fica `halted` com a mensagem de escalada para um humano. `verify --mark` e `mark` saem com `1` nesse caso.

**mark** é a marcação manual (orquestrador); avisa quando a fase não é a atual. `--outcome` vale para `inspect` e `review`; `review` aprovada exige `--outcome`.

---

## sia mcp

```bash
sia mcp setup {servidor} [--ide lista] [--dry-run] [--json]
sia mcp remove {servidor} [--ide lista] [--dry-run] [--json]
sia mcp status [--json]
```

Lê `.sia-core/data/mcp-servers.yaml` (erro claro, saída `1`, se faltar):

```yaml
servers:
  <id>: { name, docs, url, params: {<p>: '{{caminho.no.core-config}}' | valor}, auth: oauth|bearer-env, env: [VAR], notes }
ides:
  <ide>: { file, format: json|toml, key, entry: {...template...}, login, unsupported?: motivo }
```

- `{{url}}` = `url` + query string dos `params` resolvidos no core-config: vazios e listas vazias omitidos; booleanos como `true`/`false`; listas como texto separado por vírgula. `{{id}}` = id do servidor. `{{env.NOME}}` fica literal: a CLI nunca resolve nem grava segredos.
- **JSON**: faz o parse, grava `obj[key][id] = entry` e preserva todo o resto. JSON inválido não é sobrescrito.
- **TOML**: sem parser. Mantém um bloco gerenciado entre `# >>> SIA MCP: {id}` e `# <<< SIA MCP: {id}` com a tabela `[{key}.{id}]` (string, booleano, número, array e tabela inline); substitui o bloco se existir, senão acrescenta. Se a tabela já existir fora do bloco, a IDE falha com conflito e nada é gravado.
- `--ide`: padrão `ide.targets`. IDE com `unsupported` mostra o motivo. `file` aceita `~/`.
- **setup** mostra a instrução de login de cada IDE e lembra de ajustar `integrations.{id}.enabled` (o core-config nunca é alterado).
- **remove** apaga `obj[key][id]` do JSON ou o bloco gerenciado do TOML; tabela fora do bloco é só reportada.
- **status** mostra a matriz servidor × IDE (configurado, não configurado, não suportado) com `integrations.{id}.enabled`.

---

## sia squad list

```bash
sia squad list [--json]
```

Lista os squads em `paths.squads` (padrão `squads/`) com `name`, `version` e `description` do `squad.yaml`.

---

## sia agent

```bash
sia agent use {id} | sia agent current | sia agent clear [--json]
```

Escreve, lê ou remove `.sia/active-agent.json` (`{"id", "source": "cli", "at"}`). Ids aceitos: `pm`, `dev`, `devops`, `validator`, `squad-creator` e os aliases `mira`, `davi`, `lance`, `vera`, `elo`. `current` mostra se o registro ainda vale para o hook de autoridade (8 horas).

---

## Hooks de governança

Em `.sia-core/hooks/`, CommonJS, sem dependências, rápidos e sem exceções não tratadas. As projeções registram os dois com os mesmos comandos em todas as IDEs (o Grok deduplica handlers iguais entre `.grok/hooks/` e `.claude/settings.json`).

### enforce-git-push-authority.cjs

Comando: `node .sia-core/hooks/enforce-git-push-authority.cjs` (PreToolUse no Claude Code, Codex e Grok; BeforeTool no Gemini CLI).

- Lê o comando de `tool_input.command`, `toolInput.command`, `cmd`, `input.command` ou `parameters.command`.
- Bloqueia: `git push` (inclusive com `-C`, `-c`, `--git-dir`, `--no-pager`...), `gh pr create|merge` (com opções antes ou depois), `gh api` com mutação em `/pulls` (`-X POST|PUT|PATCH`, `-f`, `-F`, `--field`, `--raw-field`, `--input`), `gh api graphql` com `createPullRequest`/`mergePullRequest`, `gh release create` e deploy de produção da Vercel (`vercel --prod`, `vercel deploy --prod`, `--target production`, `vercel promote`, `vercel rollback`, também via `npx`).
- Identidade (a primeira que existir decide): `.sia/active-agent.json` fresco (mtime há menos de 8 h e não no futuro); variável `SIA_ACTIVE_AGENT`; prefixo `SIA_ACTIVE_AGENT=devops` no próprio comando. Permitidos: `devops`, `lance`, `sia-devops`, com ou sem `@`.
- Negar: saída `2`, motivo em português no stderr (orientando ativar `/sia-devops`) e, no stdout, `{decision: 'block', reason, hookSpecificOutput: {hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason}}`. Permitir: saída `0` sem saída.
- Stdin inválido: permite, exceto se o texto cru casar com um padrão bloqueado.

### track-active-agent.cjs

Comando: `node .sia-core/hooks/track-active-agent.cjs` (UserPromptSubmit no Claude Code, Codex e Grok; BeforeAgent no Gemini CLI).

- Lê o prompt de `prompt`, `userPrompt`, `user_prompt` ou `input.prompt`.
- No início do prompt: `/sia-{id}`, `$sia-{id}` (menção de skill no Codex), `/SIA:agents:{id}` (prefixo de `ide.slashPrefix`) ou `@{id}`, com ids e aliases dos 5 agentes → grava `.sia/active-agent.json` com `source: 'hook'`. Prompt que é só `*exit` remove o arquivo.
- Sempre sai com `0` e nunca escreve no stdout.

É um guarda-corpo cooperativo, não uma fronteira de segurança: qualquer processo do workspace pode escrever o arquivo do agente ativo.

---

## Formatos lidos e escritos

| Formato | Lido por | Escrito por |
|---------|----------|-------------|
| Story (`## Status`, `## Executor`, `## Tasks / Subtasks`, `### File List`, `## Resultado do QA` com `### Revisão (iteração N)`; a última ocorrência de cada campo vale) | `story status`, `sdc` | tasks dos agentes |
| Arquivo do gate (`docs/qa/gates/{id}-{slug}.yml`: `gate`, `story`, `reviewer`, `reviewed_revision`, `waiver`), lido como texto (hashes entre aspas ou não) | `story status`, `sdc verify` | `*qa-gate` |
| Relatório de inspeção (frontmatter `command`, `story`, `verdict`, `date`, `revision`), lido como texto | `story status`, `sdc verify inspect` | `@validator` |
| `.sia/active-agent.json` | hook de autoridade, `agent current` | hook rastreador, `agent use` |
| `.sia/sdc/{id}/state.json` (`version`, `kind: sia-sdc`, `storyId`, `executor`, `skipInspection`, `currentPhase`, `phases`, `qgIterations`, `maxQgIterations`, `inspectNotBefore`, `history`) | `sdc` | `sdc` |
| `{pasta-da-ide}/sia-managed.json` | `sync` | `sync` |
| `.sia-core/data/mcp-servers.yaml` | `mcp`, `doctor` | lote B6 |

---

## Projeções por IDE

### Claude Code (`.claude/`, manifesto `.claude/sia-managed.json`)

| Arquivo | Conteúdo |
|---------|----------|
| `.claude/skills/sia-{id}/SKILL.md` | Ativação do agente: frontmatter `name`, `description` entre aspas ("Ativa {name} (@{id}), {title}. {primeira frase do whenToUse}", até 240 caracteres) e `user-invocable: true`; corpo manda ler `.sia-core/agents/{id}.md` por inteiro e seguir as activation-instructions, com `$ARGUMENTS` como comando após a saudação |
| `.claude/commands/{ide.slashPrefix}/agents/{id}.md` | Atalho `/SIA:agents:{id}` que segue a skill `sia-{id}` (fallback: o arquivo do agente) |
| `.claude/skills/{comando}/SKILL.md` | Um por comando do `@validator` com `lenses` (`revisar-feature`, `revisar-seguranca`, `revisar-todo`, `gaps`, `codigo-morto`, `regressao`, `revisar-arquitetura`, `logica`, `falhas`), com `disable-model-invocation: true` e `argument-hint` |
| `.claude/skills/{skill}/SKILL.md` | Cópia de `.sia-core/skills/*/SKILL.md` |
| `.claude/agents/sia-{id}.md` | Subagente autônomo (`model: inherit`; `tools` com Write/Edit para pm, dev, devops e squad-creator; Read, Grep, Glob, Bash, Write para o validator) com tabela missão → comando → task gerada do YAML |
| `.claude/rules/sia-{nome}.md` | Cópia de `.sia-core/rules/*.md` com o frontmatter |
| `.claude/settings.json` | Merge: `PreToolUse` (matcher `Bash`) e `UserPromptSubmit` com os hooks; permissões de `boundary` |
| `CLAUDE.md` | Blocos: o que é o SIA, Constitution, agentes, ciclo da story, CLI e fronteira (até 150 linhas) |

### Codex (`.agents/`, manifesto `.agents/sia-managed.json`)

Documentação oficial: [Build skills](https://learn.chatgpt.com/docs/build-skills) (skills de projeto em `.agents/skills/`, varridas do diretório atual até a raiz do repositório; `.codex/skills` é legado; frontmatter `name` até 64 caracteres e `description`), [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) (limite padrão `project_doc_max_bytes` de 32 KiB) e [Hooks](https://learn.chatgpt.com/docs/hooks) (estáveis; projeto em `.codex/hooks.json`, exige projeto confiável e revisão em `/hooks`).

| Arquivo | Conteúdo |
|---------|----------|
| `.agents/skills/sia-{id}/SKILL.md` | Ativação (`$sia-{id}`), `name`, `description` e `metadata.short-description` |
| `.agents/skills/{comando}/SKILL.md`, `.agents/skills/{skill}/SKILL.md` | Comandos do `@validator` e cópia das skills de workflow |
| `.codex/hooks.json` | Merge: `PreToolUse` (matcher `^Bash$`) e `UserPromptSubmit` |
| `AGENTS.md` | Blocos essenciais + atalhos `@id` → `.sia-core/agents/{id}.md` + bloco de regras com o corpo de `.sia-core/rules/*.md`. O sync avisa quando passa de 32 KiB |

### Gemini CLI (`.gemini/`, manifesto `.gemini/sia-managed.json`)

Documentação oficial (geminicli.com/docs, v0.64): [comandos](https://geminicli.com/docs/cli/custom-commands/) em `.gemini/commands/*.toml` com `description`, `prompt` e `{{args}}`; [hooks](https://geminicli.com/docs/hooks/) estáveis e ligados por padrão (`hooksConfig.enabled`), eventos `BeforeTool` e `BeforeAgent`, matcher regex, `timeout` em milissegundos, shell `run_shell_command`, bloqueio por saída `2` ou `{"decision": "deny"|"block"}`.

| Arquivo | Conteúdo |
|---------|----------|
| `.gemini/commands/sia-{id}.toml` | `/sia-{id}`: lê o arquivo do agente e segue as activation-instructions, com `{{args}}` |
| `.gemini/commands/sia-menu.toml` | Menu numerado dos agentes, comandos de inspeção e workflows |
| `.gemini/commands/{comando}.toml`, `.gemini/commands/{skill}.toml` | Comandos do `@validator`; skills de workflow (lê `.sia-core/skills/{skill}/SKILL.md` e segue com `{{args}}`) |
| `.gemini/settings.json` | Merge: `BeforeTool` (matcher `^run_shell_command$`, `name: sia-git-push-authority`, timeout 10000) e `BeforeAgent` (`name: sia-track-active-agent`) |
| `GEMINI.md` | Mesmos blocos do `AGENTS.md` |

### Grok Build (`.grok/`, manifesto `.grok/sia-managed.json`)

Documentação local: `~/.grok/docs/user-guide/08-skills.md`, `10-hooks.md`, `12-project-rules.md`, `16-subagents.md`.

| Arquivo | Conteúdo |
|---------|----------|
| `.grok/skills/sia-{id}/SKILL.md` | `name`, `description`, `when-to-use`, `user-invocable: true`, `metadata` (`short-description`, `sia-agent-id`, `sia-source`) |
| `.grok/agents/sia-{id}.md` | `prompt_mode: full`, `model: inherit`, `permission_mode: default`, `agents_md: true`; corpo aponta para `.sia-core` |
| `.grok/hooks/sia-git-push-authority.json` | `PreToolUse`, matcher `Bash\|run_terminal_command` |
| `.grok/hooks/sia-track-agent.json` | `UserPromptSubmit` |
| `.grok/skills/{comando}/SKILL.md`, `.grok/skills/{skill}/SKILL.md` | Comandos do `@validator` e skills de workflow |
| `.grok/rules/sia-core.md` | Blocos gerenciados (essencial + atalhos + regras) |

O `.grok/config.toml` não é tocado pelo sync (só por `sia mcp`).

---

## Testes

```bash
cd .sia-core && node --test cli/tests/
```

`cli/tests/index.js` carrega todos os `*.test.js` (desde o Node 21 o argumento de `--test` é um padrão glob e o diretório é executado como módulo). Fixture: `cli/tests/fixtures/mini/` (mini-core com os 5 agentes, tasks, templates, workflow, regras, skill, schema, `mcp-servers.yaml`, squad `demo`, story e relatório de inspeção). Cobertura: parsers (agente, task, story, frontmatter, schema), `validate` (ok e erros), máquina de fases e verificações do `sdc` (reinspeção, loop antes do gate, story de pesquisa, circuit breaker), hooks (padrões, identidade, arquivo vencido ou no futuro, stdin inválido, rastreador), `sync` nas 4 IDEs (idempotência, `--check`, órfãos, conflitos, blocos, `settings.json`, MCP intocado) e `mcp` (merge JSON, bloco TOML, remove, `mcp-servers.yaml` real).

---

## Limitações conhecidas

- Os hooks são guarda-corpos cooperativos: dependem do agente ativo registrado e não impedem um processo determinado a contorná-los.
- Os comandos dos hooks são relativos (`node .sia-core/hooks/...`): a IDE precisa rodar o hook na raiz do projeto (Claude Code, Gemini e Grok rodam; no Codex, abra a sessão na raiz).
- Projetos com várias IDEs carregam contexto repetido no Grok, que também lê `CLAUDE.md`, `AGENTS.md` e `.claude/rules/` por compatibilidade (desligue em `~/.grok/config.toml`, `[compat.claude]`).
- O `AGENTS.md` inclui o corpo das regras; acima de 32 KiB o Codex trunca o fim (aumente `project_doc_max_bytes`).
- Squads não são projetados nas IDEs pelo sync; só são validados e listados.
- O sync copia só o `SKILL.md` de cada skill de workflow (arquivos auxiliares da pasta não são copiados).

# Base de Conhecimento do SIA

> Referência compacta para o modo `*kb` do `@squad-creator` e para qualquer agente que precise responder dúvidas sobre o framework.
> Responda só com base neste arquivo, no guia do usuário (`.sia-core/user-guide.md`), no guia de autoria (`.sia-core/data/sia-authoring-guide.md`) e na Constitution (`.sia-core/constitution.md`). Se a resposta não estiver nessas fontes, diga que não está documentada.

---

## 1. Identidade

- **Nome:** SIA, Sling Inteligência Artificial.
- **O que é:** framework de desenvolvimento orientado por agentes de IA, organizado em stories, executado por tasks e governado por uma Constitution.
- **Origem:** derivado do Synkra AIOX 5.4.1, com 12 agentes consolidados em 5, runtime enxuto e conteúdo em português.
- **IDEs suportadas:** Claude Code, Codex (ChatGPT), Gemini CLI e Grok Build.
- **Stack padrão sugerido:** Next.js + React + TypeScript + Tailwind + shadcn/ui, Supabase (Postgres, Auth, RLS) e Vercel. Ajustável em `data/technical-preferences.md`.

## 2. Agentes

| id | Nome | Chapéus | Exclusividades |
|----|------|---------|----------------|
| `pm` | Mira | product, analyst, scrum, owner, quality | criar e validar stories; veredito do QA gate; backlog; orquestrar workflows e epics |
| `dev` | Davi | dev, architect, data, ux | código; Ready → InProgress → InReview; ADR; schema, migrations e RLS; interface |
| `devops` | Lance | (único) | push, PR, merge, release, tag, deploy de produção, MCP, CI/CD |
| `validator` | Vera | (único) | inspeção técnica; relatórios em `docs/qa/inspections/` |
| `squad-creator` | Elo | (único) | agentes, tasks, workflows, checklists e templates do framework; squads; `sia sync` |

- **Ativação:** `@{id}`, `/sia-{id}`, `/SIA:agents:{id}` (Claude Code) ou a skill `sia-{id}`.
- **Comandos:** prefixo `*`. Em todos os agentes existem `*help`, `*guide`, `*yolo` e `*exit`.
- **Chapéu:** o agente declara o chapéu ativo (`[Chapéu: Qualidade]`) e aplica o checklist do chapéu sem atalhos, mesmo sobre trabalho que ele mesmo produziu com outro chapéu.

## 3. Story

- **Arquivo:** `docs/stories/{epic}.{story}-{slug}.story.md`. O storyId é `{epic}.{story}` (ex.: `2.1`).
- **Status:** `Draft → Ready → InProgress → InReview → Done`.
- **Transições:**

  | Transição | Quem | Comando |
  |-----------|------|---------|
  | Draft → Ready | `@pm` [owner] | `*validate-story` |
  | Ready → InProgress → InReview | `@dev` | `*develop` |
  | InReview → Done ou InProgress | `@pm` [quality] | `*qa-gate` |

- **Change Log:** toda transição gera uma linha nele.
- **Seções canônicas:** Status, Executor, Story, Critérios de Aceite, Escopo, Dependências, Riscos, Definição de Pronto, Tasks / Subtasks, Dev Notes, Testes, Registro do Dev (com File List), Resultado do QA, Change Log.
- **O `@dev` edita:** checkboxes, Dev Notes, Testes e Registro do Dev. Critérios de aceite e escopo são do `@pm`.

## 4. Qualidade

- **Validação de story:** checklist de 10 pontos; GO com nota ≥ `quality.storyValidation.minScore` (7).
- **Inspeção:** 7 lentes (gaps, falhas, lógica, regressão, segurança, arquitetura, código morto).
  - Vereditos: `aprovado`, `aprovado com ressalvas`, `reprovado`.
  - Achado sem evidência não entra. Achado preexistente não derruba o veredito, exceto no `*revisar-todo`.
- **QA gate:** `PASS`, `CONCERNS`, `FAIL`, `WAIVED`.
  - Grava `docs/qa/gates/{id}-{slug}.yml` e o bloco "Resultado do QA" na story (Gate, Revisor, Revisão, Data, Arquivo do gate, Inspeção, Resumo).
  - Por padrão exige o relatório de inspeção.
- **QA Loop:** inspeção → gate → correção, no máximo `quality.qaLoop.maxIterations` (5) vezes; depois escala.
- **Pre-push:** lint, typecheck, testes e build (`quality.scripts`), varredura de segredos, story `Done` com gate aprovado.

## 5. Workflows

| id | Para quê |
|----|----------|
| `story-development-cycle` | ciclo completo de uma story (com inspeção) |
| `qa-loop` | iterações de revisão e correção |
| `spec-pipeline` | requisitos → complexidade → pesquisa → spec → crítica → plano |
| `epic-orchestration` | executar um epic em ondas |
| `greenfield` | produto novo (`project_type`: fullstack, service ou ui) |
| `brownfield` | evolução de sistema existente (mesmas variantes) |
| `brownfield-discovery` | avaliação de débito técnico |

- **Classes de complexidade:** SIMPLE ≤ 8 (3 fases), STANDARD 9 a 15 (6 fases), COMPLEX ≥ 16 (6 fases + revisão).
- **Próximo passo:** `data/workflow-chains.yaml` define o comando seguinte a cada etapa. Os agentes o usam na saudação, junto com os handoffs de `.sia/handoffs/`.

## 6. Arquivos do framework

| Pasta | Conteúdo |
|-------|----------|
| `.sia-core/agents/` | `{id}.md` (definição com bloco YAML) e `{id}/MEMORY.md` (memória no projeto) |
| `.sia-core/tasks/` | tasks com frontmatter (`id`, `title`, `agent`, `hat`, `elicit`, `depends_on`, `next`, `source`) |
| `.sia-core/templates/` | templates YAML de documento, Markdown, SQL (`sql/`), CI, squad (`squad/`), serviço (`service/`) |
| `.sia-core/checklists/` | checklists com blocos `[[LLM: ...]]` |
| `.sia-core/workflows/` | workflows YAML |
| `.sia-core/data/` | guia de autoria, esta KB, preferências técnicas, padrões de banco/UX, catálogo de MCP, tech presets |
| `.sia-core/rules/` | regras projetadas nas IDEs |
| `.sia-core/skills/` | skills do ciclo da story (`sia-full-sdc`, `sia-develop-story`...) |
| `.sia-core/hooks/` | `enforce-git-push-authority.cjs` e `track-active-agent.cjs` |
| `.sia-core/schemas/` | `squad-schema.json` |
| `.sia-core/cli/` | CLI `sia` (Node ≥ 22, sem dependências instaladas) |

Resolução de dependência: `{type}/{name}` → `.sia-core/{type}/{name}`. Num squad, procura primeiro em `squads/{nome}/{type}/`.

## 7. Projeções de IDE

- **Como são geradas:** `sia sync` gera tudo a partir do `.sia-core/` e nunca copia a definição do agente; as projeções apontam para ela.
- **Controle:** cada pasta tem um `sia-managed.json`. `sia sync --check` aponta divergência. Arquivos raiz usam blocos `<!-- SIA-MANAGED-START: x -->`.
- **Claude Code:**
  - skills `sia-{id}` e `/SIA:agents:{id}`
  - subagentes `sia-{id}`
  - regras `sia-*`
  - hooks em `.claude/settings.json`
  - `CLAUDE.md`
- **Codex:** `AGENTS.md` (regras essenciais embutidas, demais resumidas), skills em `.agents/skills/` e hooks em `.codex/hooks.json`.
- **Gemini:** `.gemini/commands/*.toml` (`/sia-menu`), `GEMINI.md` e hooks em `.gemini/settings.json` quando suportados.
- **Grok:** `.grok/skills/`, `.grok/agents/`, `.grok/hooks/*.json` e `.grok/rules/sia-core.md`.
- **Regra:** nunca edite projeções à mão (Artigo VII).

## 8. Governança automática

- **Hook de autoridade (`enforce-git-push-authority`):**
  - Bloqueia `git push`, `gh pr create|merge`, mutações de PR via `gh api`, `gh release create` e deploy de produção da Vercel, a menos que o agente ativo seja o `devops`.
  - O agente ativo vem de `.sia/active-agent.json` (válido por 8 h), da variável `SIA_ACTIVE_AGENT` ou do prefixo `SIA_ACTIVE_AGENT=devops`.
- **Hook de agente ativo (`track-active-agent`):** registra o agente quando o prompt começa com `/sia-{id}`, `/SIA:agents:{id}` ou `@{id}`, e limpa o registro com `*exit`.
- **Fallback manual:** `sia agent use {id}`.

## 9. CLI

Se `sia` não estiver no PATH, use `node .sia-core/cli/sia.js`.

| Comando | Função |
|---------|--------|
| `doctor` | diagnóstico |
| `validate [--squad x] [--strict]` | valida a estrutura; dependência ausente é erro |
| `sync [--ide ...] [--check] [--target dir] [--link-core]` | gera ou confere projeções |
| `story status {id}` | situação e próximo comando |
| `sdc plan\|next\|verify\|mark\|status` | ciclo da story com estado em `.sia/sdc/{id}/state.json`; fases validate → develop → inspect → review → apply_qa_fixes → close |
| `mcp setup {supabase\|vercel}` / `mcp status` | facilitador de MCP; lê `data/mcp-servers.yaml` |
| `squad list` | squads locais |
| `agent use\|current\|clear` | agente ativo |

Códigos de saída: 0 ok, 1 falha de validação, 2 erro de uso. Todos os comandos aceitam `--json`.

## 10. Integrações

- **Supabase:** chapéu Dados do `@dev`.
  - Migrations em `supabase/migrations/`, snapshots em `supabase/snapshots/`.
  - RLS em toda tabela exposta.
  - MCP somente leitura por padrão; DDL remoto só por migration.
- **Vercel:** `@devops *vercel-setup` e `*vercel-deploy {preview|production}`. Produção exige story `Done` e gate aprovado.
- **MCPs:** `@devops *setup-mcp {supabase|vercel}` ou `sia mcp setup`. O catálogo fica em `data/mcp-servers.yaml` (servidores e formato por IDE).
- **GitHub:** push, PR, release e CI pelo `@devops`, com conventional commits e storyId no título.

## 11. Como estender

| Quero... | Caminho |
|----------|---------|
| Novo agente | antes, avaliar se um chapéu em agente existente resolve; depois, `@squad-creator *create-agent` |
| Nova task | `@squad-creator *create-task` |
| Novo workflow | `@squad-creator *create-workflow` |
| Domínio específico | squad em `squads/{nome}/` (`*design-squad`, `*create-squad`) |
| Novo MCP | entrada em `data/mcp-servers.yaml` (servidor + formato por IDE) |
| Nova IDE | gerador em `cli/projections/` + `ide.targets` no core-config |

Sempre termine com `sia validate` e `sia sync`.

## 12. Solução de problemas

| Sintoma | Causa provável | Ação |
|---------|----------------|------|
| Push bloqueado | Agente ativo não é o devops | Ativar `/sia-devops` ou `sia agent use devops` |
| IDE não mostra agente novo | Projeção desatualizada | `sia sync` |
| `sia validate` acusa dependência ausente | Arquivo citado no agente ou na task não existe | Criar o arquivo ou corrigir o nome |
| QA gate não sai PASS | Falta relatório de inspeção | `@validator *revisar-feature {id}` |
| `sia sdc verify develop` falha | Story não está em InReview ou File List vazia | Concluir o `*develop` e atualizar a File List |
| MCP não aparece na IDE | Configuração ou autenticação pendente | `sia mcp status` e seguir a instrução de login da IDE |

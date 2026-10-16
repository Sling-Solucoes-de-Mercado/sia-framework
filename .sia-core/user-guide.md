# Guia do Usuário do SIA

> SIA (Sling Inteligência Artificial): desenvolvimento de software conduzido por agentes de IA, organizado em stories e com gates de qualidade.
> Para quem desenvolve, planeja ou revisa produto usando o SIA no Claude Code, no Codex (ChatGPT), no Gemini CLI ou no Grok.

---

## 1. Em uma página

- Você conversa com **5 agentes**, cada um com uma responsabilidade clara.
- Todo trabalho de código nasce numa **story** (`docs/stories/`) com critérios de aceite.
- Cada comando (`*create-story`, `*develop`, `*qa-gate`...) executa uma **task**, um passo a passo escrito em `.sia-core/tasks/`.
- Uma story só vai para produção depois de **inspecionada** pelo `@validator` e **aprovada** no QA gate do `@pm`.
- Só o `@devops` dá push, abre PR, faz release e deploy de produção.

```
@pm cria → @pm valida → @dev implementa → @validator inspeciona → @pm decide → @devops entrega
```

---

## 2. Conceitos

| Conceito | O que é |
|----------|---------|
| **Story** | Unidade de trabalho implementável, com critérios de aceite, tasks e registro do que foi feito. Arquivo `docs/stories/{epic}.{story}-{slug}.story.md`. |
| **Epic** | Conjunto de stories com um objetivo comum (`docs/prd/epic-{n}-{slug}.md`). |
| **Task** | Procedimento executável que um comando dispara. Fica em `.sia-core/tasks/`. |
| **Workflow** | Sequência de tasks para um objetivo maior (ex.: ciclo da story, projeto novo). |
| **Chapéu** | Papel que um agente veste para um comando. Ex.: `@pm` com o chapéu Qualidade decide o QA gate. |
| **Inspeção** | Revisão técnica do `@validator` em 7 lentes. Gera relatório; não muda status. |
| **QA gate** | Veredito do `@pm` sobre a story: `PASS`, `CONCERNS`, `FAIL` ou `WAIVED`. |
| **Squad** | Pacote de agentes e tasks para um domínio específico, em `squads/{nome}/`. |
| **Handoff** | Resumo curto que um agente deixa para o próximo em `.sia/handoffs/`. O próximo agente sugere o comando seguinte ao ser ativado. |

---

## 3. Os agentes

### 🎯 @pm (Mira): produto, stories e qualidade

Veste 5 chapéus:

| Chapéu | Para quê | Comandos principais |
|--------|----------|---------------------|
| Produto | PRD, epics, specs, rumo do projeto | `*create-prd`, `*create-brownfield-prd`, `*create-epic`, `*execute-epic`, `*correct-course`, `*run-workflow` |
| Análise | Pesquisa, brief, brainstorming | `*create-project-brief`, `*market-research`, `*competitor-analysis`, `*brainstorm`, `*research` |
| Scrum | Escrever stories prontas para o `@dev` | `*create-story`, `*create-brownfield-story` |
| Product Owner | Validar stories e cuidar do backlog | `*validate-story`, `*backlog`, `*status`, `*close-story` |
| Qualidade | Decidir se a entrega está pronta | `*qa-gate`, `*qa-loop`, `*nfr-assess`, `*risk-profile`, `*test-design`, `*trace` |

### 🛠️ @dev (Davi): tudo que é técnico

| Chapéu | Para quê | Comandos principais |
|--------|----------|---------------------|
| Desenvolvimento | Implementar e corrigir | `*develop {storyId}`, `*apply-qa-fixes`, `*run-tests`, `*generate-tests` |
| Arquitetura | Desenho do sistema e decisões | `*create-architecture`, `*create-adr`, `*analyze-impact`, `*assess-complexity`, `*create-plan` |
| Dados | Supabase/Postgres | `*db-setup`, `*db-model`, `*db-migrate`, `*db-rollback`, `*db-audit`, `*db-policy` |
| UX/UI | Interface e design system | `*create-front-end-spec`, `*ux-wireframe`, `*ux-design-system`, `*ux-build-component` |

### 🚀 @devops (Lance): entrega e infraestrutura

`*pre-push`, `*push`, `*create-pr`, `*release`, `*configure-ci`, `*environment-bootstrap`, `*setup-mcp {supabase|vercel}`, `*vercel-setup`, `*vercel-deploy {preview|production}`, `*health-check`.

### 🔍 @validator (Vera): inspeção

| Comando | O que olha |
|---------|------------|
| `*revisar-feature [storyId]` | as 7 lentes: lacunas, falhas, lógica, regressão, segurança, arquitetura, código morto |
| `*revisar-seguranca` | só segurança |
| `*revisar-todo [caminho]` | estrutura da área, além do diff |
| `*gaps`, `*falhas`, `*logica`, `*regressao`, `*revisar-arquitetura`, `*codigo-morto` | uma lente por vez |

As formas `#revisar-feature` e `/revisar-feature` funcionam igual.

### 🔗 @squad-creator (Elo): squads e o próprio framework

`*design-squad`, `*create-squad`, `*validate-squad`, `*extend-squad`, `*create-agent`, `*create-task`, `*create-workflow`, `*validate-framework`, `*sync-ide`, `*kb`.

Em qualquer agente: `*help` lista os comandos, `*guide` mostra o guia do agente, `*yolo` alterna o modo de execução e `*exit` sai.

---

## 4. Como ativar os agentes

| IDE | Ativação | Comandos do Validator | Fluxos |
|-----|----------|------------------------|--------|
| **Claude Code** | `/sia-pm`, `/SIA:agents:pm` ou `@pm` | `/revisar-feature 2.1` | `/sia-full-sdc 2.1`, `/sia-develop-story 2.1` |
| **Codex (ChatGPT)** | skill `sia-pm` ou `@pm` (definido no `AGENTS.md`) | skill `revisar-feature` | skills `sia-*` |
| **Gemini CLI** | `/sia-pm` (`/sia-menu` lista todos) | `/revisar-feature 2.1` | `/sia-full-sdc 2.1` |
| **Grok** | `/sia-pm` | `/revisar-feature 2.1` | `/sia-full-sdc 2.1` |

Depois de ativo, o agente se apresenta, mostra os comandos principais e espera. Os comandos usam `*`, por exemplo `*create-story`.

Ativar com argumentos executa o comando direto: `/sia-dev *develop 2.1`.

---

## 5. Primeiros passos

### 5.1 Projeto novo

1. `@devops *environment-bootstrap`: git, GitHub, estrutura de docs e CI
2. `@pm *create-project-brief`: problema, usuários, métricas, MVP
3. `@pm *create-prd`: requisitos e epics
4. `@dev *create-front-end-spec` (se houver interface)
5. `@dev *create-architecture`
6. `@pm *po-checklist`: coerência entre PRD e arquitetura
7. `@pm *shard-prd` e `@pm *shard-doc docs/architecture.md docs/architecture`
8. `@pm *create-story` → começa o ciclo da story (seção 6)

O workflow completo está em `@pm *run-workflow greenfield`.

### 5.2 Projeto existente

1. `@dev *analyze-codebase` ou `@dev *document-project`
2. Mudança grande: `@pm *create-brownfield-prd` + `@dev *create-brownfield-architecture`
3. Mudança pequena e isolada: `@pm *create-epic` ou direto `@pm *create-brownfield-story`
4. Ciclo da story

Para um diagnóstico profundo de débito técnico: `@pm *run-workflow brownfield-discovery`.

---

## 6. O ciclo da story

| # | Quem | Comando | O que acontece | Status |
|---|------|---------|----------------|--------|
| 1 | `@pm` [Scrum] | `*create-story` | Cria a próxima story do epic com todo o contexto técnico | → `Draft` |
| 2 | `@pm` [Product Owner] | `*validate-story {id}` | Checklist de 10 pontos; GO com nota ≥ 7 | `Draft` → `Ready` |
| 3 | `@dev` | `*develop {id}` | Implementa task a task, com testes; atualiza a File List | `Ready` → `InProgress` → `InReview` |
| 4 | `@validator` | `*revisar-feature {id}` | Inspeção em 7 lentes; relatório em `docs/qa/inspections/` | (não muda) |
| 5 | `@pm` [Qualidade] | `*qa-gate {id}` | Decide o gate com base na inspeção, nos critérios e nos testes | `InReview` → `Done` ou → `InProgress` |
| 6 | `@dev` (se FAIL) | `*apply-qa-fixes {id}` | Corrige o pedido de correção e volta para a inspeção | `InProgress` → `InReview` |
| 7 | `@devops` | `*push`, `*create-pr` | Portão de qualidade e entrega | (não muda) |
| 8 | `@pm` [Product Owner] | `*close-story {id}` | Registro final: epic, índice e follow-ups | (não muda) |

**Tudo de uma vez:** `/sia-full-sdc {id}` conduz as fases e confere cada uma com `sia sdc verify`.

**Modos do `*develop`:**
- `yolo`: autônomo; as decisões ficam registradas na story
- `interactive` (padrão): pede confirmação nas decisões
- `preflight`: faz todas as perguntas antes de começar

**Onde ver o andamento:** `sia story status {id}` mostra o status, os checkboxes, o resultado do QA e o próximo comando sugerido.

---

## 7. Qualidade

### Inspeção (`@validator`)
- Fecha o escopo pela story, pelo caminho ou pelo diff recente; lê o pedido e o diff; procura quem chama o que mudou.
- Só registra achado com arquivo, linha e evidência. Severidades: `bloqueante`, `alto`, `medio`, `baixo`, `nota`.
- Vereditos:
  - `reprovado`: há achado bloqueante ou alto que conta
  - `aprovado com ressalvas`: o pior achado é médio
  - `aprovado`: só achados baixos, notas ou nenhum achado
- Não edita código e não muda status.

### QA gate (`@pm` [Qualidade])

| Veredito | Quando | Efeito |
|----------|--------|--------|
| `PASS` | Tudo certo | Story → `Done` |
| `CONCERNS` | Problemas menores, registrados | Story → `Done` |
| `FAIL` | Problema alto ou crítico | Story → `InProgress` + pedido de correção para o `@dev` |
| `WAIVED` | Problema aceito conscientemente, com motivo e aprovador | Story → `Done` |

O gate grava `docs/qa/gates/{id}-{slug}.yml` e o bloco "Resultado do QA" na story. Por padrão, não existe `PASS` sem relatório de inspeção (`quality.inspection.requiredBeforeGate`).

### QA Loop
`@pm *qa-loop {id}` repete inspeção → gate → correção até aprovar, com no máximo 5 iterações. Ao atingir o limite, escala para você decidir.

### Avaliações de apoio
`*nfr-assess` (segurança, desempenho, confiabilidade, manutenibilidade), `*risk-profile`, `*test-design` e `*trace`. Ficam em `docs/qa/assessments/`.

---

## 8. Workflows

| Workflow | Quando usar | Como rodar |
|----------|-------------|------------|
| `story-development-cycle` | Toda story | `/sia-full-sdc {id}` ou passo a passo |
| `qa-loop` | Story precisa de várias rodadas de correção | `@pm *qa-loop {id}` |
| `spec-pipeline` | Feature complexa ou ambígua, antes da story | `@pm *run-workflow spec-pipeline` |
| `epic-orchestration` | Executar um epic inteiro em ondas | `@pm *execute-epic {epic}` |
| `greenfield` | Produto novo (fullstack, serviço ou UI) | `@pm *run-workflow greenfield` |
| `brownfield` | Evolução de sistema existente | `@pm *run-workflow brownfield` |
| `brownfield-discovery` | Avaliação de débito técnico de um sistema herdado | `@pm *run-workflow brownfield-discovery` |

### Spec Pipeline
Fases:
1. Requisitos: `@pm *gather-requirements`
2. Complexidade: `@dev *assess-complexity`
3. Pesquisa: `@pm *research-deps`
4. Spec: `@pm *write-spec`
5. Crítica: `@pm *critique-spec`
6. Plano: `@dev *create-plan`

A complexidade define o caminho:
- **SIMPLE** (nota ≤ 8): requisitos → spec → crítica
- **STANDARD** (9 a 15): as 6 fases
- **COMPLEX** (nota ≥ 16): as 6 fases + ciclo de revisão

Toda afirmação da spec precisa rastrear para um requisito, uma restrição ou uma pesquisa verificada (Artigo IV: sem invenção).

---

## 9. Banco de dados (Supabase)

O chapéu Dados do `@dev` cuida do ciclo do banco:

1. `*db-setup`: liga o projeto Supabase e cria a estrutura base
2. `*db-model`: modela o domínio e o schema
3. `*db-migrate {migration}`: dry-run, snapshot, aplicação e verificação
4. `*db-policy {tabela}` e `*db-audit`: RLS e segurança
5. `*db-rollback`: reverte a partir de snapshot ou script

Regras: toda tabela exposta tem RLS; mudança em ambiente remoto só por migration versionada (`supabase/migrations/`); a service role nunca vai para o cliente.

---

## 10. Deploy (Vercel)

1. `@devops *vercel-setup`: link do projeto, variáveis por ambiente, branch de produção
2. `@devops *vercel-deploy preview`: deploy de verificação
3. `@devops *vercel-deploy production`: produção, com story `Done`, gate aprovado, build verificado e confirmação; rollback documentado

---

## 11. Conectar os MCPs do Supabase e da Vercel

```
@devops *setup-mcp supabase
@devops *setup-mcp vercel
```

ou, direto pela CLI:

```bash
sia mcp setup supabase --ide claude-code,codex,gemini,grok
sia mcp status
```

O facilitador:
- grava a configuração no arquivo certo de cada IDE (Claude Code, Codex, Gemini e Grok)
- mostra como autenticar em cada uma
- confere o resultado com `sia mcp status`

O MCP do Supabase fica em **somente leitura** por padrão. Para escrita, é preciso confirmar o risco explicitamente.

Quem configura MCP é sempre o `@devops`. Os outros agentes só usam.

---

## 12. Squads

Um squad empacota agentes e tasks de um domínio (ex.: vendas, conteúdo, atendimento) dentro do projeto:

```
@squad-creator *design-squad --docs docs/prd.md
@squad-creator *create-squad meu-squad --from-design
@squad-creator *validate-squad meu-squad
```

Estrutura: `squads/{nome}/squad.yaml` (nome e versão obrigatórios), `agents/`, `tasks/`, `workflows/`, `checklists/`, `templates/`, `data/`, `scripts/`.

Depois de criar ou mudar um squad ou um componente do framework, rode `*sync-ide` (ou `sia sync`) para atualizar as IDEs.

---

## 13. CLI

Se `sia` não estiver no PATH, use `node .sia-core/cli/sia.js {comando}`.

| Comando | Para quê |
|---------|----------|
| `sia doctor` | Diagnóstico do ambiente e do SIA |
| `sia validate` | Valida agentes, tasks, workflows e referências |
| `sia sync [--check]` | Gera ou confere as integrações das IDEs |
| `sia story status {id}` | Situação da story e próximo comando |
| `sia sdc plan\|next\|verify\|status {id}` | Acompanha o ciclo completo da story |
| `sia mcp setup {supabase\|vercel}` / `sia mcp status` | Conexão de MCPs |
| `sia squad list` | Squads locais |
| `sia agent use {id}` / `current` / `clear` | Agente ativo, quando a IDE não registra sozinha |

---

## 14. Onde fica cada coisa

| Artefato | Caminho |
|----------|---------|
| PRD e epics | `docs/prd.md`, `docs/prd/` |
| Arquitetura e ADRs | `docs/architecture.md`, `docs/architecture/`, `docs/architecture/adr/` |
| Stories e backlog | `docs/stories/`, `docs/stories/backlog.md`, `docs/stories/index.md` |
| Spec de uma story | `docs/stories/{id}/spec/` |
| Gates e avaliações de QA | `docs/qa/gates/`, `docs/qa/assessments/` |
| Relatórios de inspeção | `docs/qa/inspections/` |
| UX | `docs/ux/`, `docs/front-end-spec.md` |
| Armadilhas conhecidas | `docs/gotchas.md` |
| Configuração do SIA | `.sia-core/core-config.yaml` |
| Memória de cada agente | `.sia-core/agents/{id}/MEMORY.md` |
| Estado local (não versionado) | `.sia/` |

Os caminhos podem ser ajustados em `.sia-core/core-config.yaml`.

---

## 15. Regras de ouro (Constitution)

1. **CLI First:** funcionalidade funciona via CLI/API antes de ter interface.
2. **Autoridade dos agentes:** só o `@devops` faz push, PR, release e deploy de produção.
3. **Orientado a stories:** não existe código sem story.
4. **Sem invenção:** specs só derivam de requisitos e de pesquisa verificada.
5. **Qualidade primeiro:** lint, typecheck, testes e build passam; inspeção sem achado bloqueante; story `Done` antes do push.
6. **Imports absolutos** (`@/...`) sempre que possível.
7. **Fonte única:** tudo nasce em `.sia-core/` e `squads/`. As pastas das IDEs são geradas.
8. **Automação governada:** loops têm limite e trabalho automático precisa de story.

Texto completo: `.sia-core/constitution.md`.

---

## 16. Perguntas frequentes

**O push foi bloqueado. Por quê?**
O hook de autoridade só libera push, PR, release e deploy de produção com o `@devops` ativo. Ative com `/sia-devops` (ou `@devops`) e repita. Se a sua IDE não registrar a ativação, use `sia agent use devops`.

**Posso pular a validação da story?**
Não. Story em `Draft` não pode ser implementada (Artigo III). A validação é rápida e evita retrabalho.

**O `@pm` cria e valida a própria story. Isso não é conflito?**
Por isso existem os chapéus. Ao validar, o `@pm` aplica o checklist do Product Owner sem atalhos, e a qualidade final depende da inspeção independente do `@validator`.

**Alterei um agente ou uma task e a IDE não mudou.**
Rode `sia sync` (ou `@squad-creator *sync-ide`). As pastas `.claude/`, `.codex/`, `.gemini/` e `.grok/` são geradas e não devem ser editadas à mão.

**Como sei o que fazer em seguida?**
Ative qualquer agente: se houver handoff pendente, ele sugere o próximo comando. Ou rode `*next`, ou `sia story status {id}`.

**Algo está estranho no ambiente.**
`sia doctor` ou `@devops *health-check`.

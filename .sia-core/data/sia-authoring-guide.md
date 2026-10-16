# Guia de Autoria do SIA

> Contrato de formato para todo artefato do SIA (agentes, tasks, templates, checklists, workflows, regras e skills).
> Quem cria ou altera um artefato segue este guia. O `@squad-creator` (Elo) usa este guia em `*create-agent`, `*create-task` e `*create-workflow`.
> A CLI `sia validate` verifica as partes mecânicas deste contrato.

---

## 1. O que é o SIA

SIA (Sling Inteligência Artificial) é um framework de desenvolvimento orientado por agentes de IA. Ele organiza o trabalho em stories, executa o processo por meio de tasks e distribui a responsabilidade entre **5 agentes**. O SIA deriva do AIOX, com menos agentes, menos runtime e o mesmo rigor de processo.

Princípios de desenho:

1. **Processo em Markdown/YAML.** Toda inteligência de processo vive em arquivos legíveis. JavaScript só existe na CLI `sia` e nos hooks de governança.
2. **Task-first.** Workflows encadeiam tasks. O agente é o executor padrão da task, não a fonte da regra.
3. **Fonte única.** Tudo nasce em `.sia-core/`. As pastas das IDEs (`.claude/`, `.codex/`, `.gemini/`, `.grok/`) são projeções geradas por `sia sync` e nunca são editadas à mão.
4. **Menos agentes, mais chapéus.** Um agente consolidado veste chapéus (papéis) diferentes conforme o comando. O chapéu define o mindset e o checklist.

---

## 2. Idioma

| Elemento | Idioma | Exemplo |
|----------|--------|---------|
| Texto para humanos e para o LLM (instruções, descrições, personas, seções de docs) | Português do Brasil, com acentuação correta | "Valide a story contra o checklist" |
| Nomes de arquivo e de pasta | Inglês, kebab-case | `create-story.md`, `qa-gate-tmpl.yaml` |
| Chaves YAML/JSON, ids, nomes de comando | Inglês, kebab-case | `id: create-story`, `*qa-gate` |
| Valores de status e de veredito do QA gate | Inglês (são identificadores de máquina) | `Draft`, `InReview`, `PASS`, `CONCERNS` |
| Código, variáveis, comandos de shell | Inglês | `git diff --stat` |

Exceções já estabelecidas: os comandos do `@validator` são em português (`*revisar-feature`, `*gaps`, `*codigo-morto`...) e os vereditos da inspeção também (`aprovado`, `aprovado com ressalvas`, `reprovado`).

Nunca troque letras acentuadas por equivalentes ASCII em texto (escreva "não", "validação", "código").

---

## 3. Glossário fixo

Use sempre estes termos. Eles são o vocabulário comum do time e da CLI.

| Termo | Significado no SIA |
|-------|--------------------|
| story | Unidade de trabalho implementável. Arquivo em `docs/stories/`. Não traduzir para "história". |
| epic | Conjunto de stories com um objetivo comum. |
| PRD | Documento de requisitos do produto (`docs/prd.md`). |
| critérios de aceite | Acceptance criteria. Preferir formato Dado/Quando/Então. |
| task | Arquivo executável em `.sia-core/tasks/`. Não confundir com as "Tasks / Subtasks" da story. |
| workflow | Sequência de tasks em `.sia-core/workflows/`. |
| chapéu | Papel que um agente consolidado assume (ex.: o `@pm` com chapéu de QA). |
| QA gate | Decisão formal de qualidade da story: `PASS`, `CONCERNS`, `FAIL` ou `WAIVED`. Dono: `@pm` (chapéu Qualidade). |
| inspeção | Revisão técnica feita pelo `@validator` (7 lentes). Gera relatório; não muda status. |
| handoff | Artefato curto que passa contexto de um agente para outro. |
| squad | Pacote de agentes, tasks e templates para um domínio específico, em `squads/{nome}/`. |
| projeção | Arquivos gerados para uma IDE a partir do `.sia-core/`. |
| modo YOLO / Interativo / Pre-Flight | Modos de execução de tasks (ver seção 8.3). |

---

## 4. Agentes e chapéus

| id | Nome | Ícone | Absorve do AIOX | Chapéus |
|----|------|-------|-----------------|---------|
| `pm` | Mira | 🎯 | pm, po, sm, qa, analyst + orquestração do aiox-master | `product`, `analyst`, `scrum`, `owner`, `quality` |
| `dev` | Davi | 🛠️ | dev, architect, data-engineer, ux-design-expert | `dev`, `architect`, `data`, `ux` |
| `devops` | Lance | 🚀 | devops | (único) |
| `validator` | Vera | 🔍 | validator (kit) | (único) |
| `squad-creator` | Elo | 🔗 | squad-creator + construção de framework do aiox-master | (único) |

Nomes dos chapéus para exibição:

| Chapéu | Exibição | Origem |
|--------|----------|--------|
| `product` | Produto | pm |
| `analyst` | Análise | analyst |
| `scrum` | Scrum | sm |
| `owner` | Product Owner | po |
| `quality` | Qualidade | qa |
| `dev` | Desenvolvimento | dev |
| `architect` | Arquitetura | architect |
| `data` | Dados | data-engineer |
| `ux` | UX/UI | ux-design-expert |

### 4.1 Mapeamento de referências do AIOX

Ao portar texto do AIOX, troque toda referência a agente assim:

| No AIOX | No SIA |
|---------|--------|
| `@pm`, `@po`, `@sm`, `@qa`, `@analyst` | `@pm` (indicar o chapéu quando fizer diferença) |
| `@architect`, `@data-engineer`, `@ux-design-expert`, `@dev` | `@dev` (indicar o chapéu quando fizer diferença) |
| `@devops`, `@github-devops` | `@devops` |
| `@aiox-master` (criar/modificar agentes, tasks, workflows, KB) | `@squad-creator` |
| `@aiox-master` (rodar workflow, correct-course, orquestração) | `@pm` |
| Quinn, Pax, River, Morgan, Atlas | Mira |
| Dex, Aria, Dara, Uma | Davi |
| Gage | Lance |
| Craft, Orion | Elo |

### 4.2 Regra de separação entre chapéus

Um agente consolidado não pode usar a consolidação para pular controles:

- Ao trocar de chapéu, o agente declara o chapéu ativo: `[Chapéu: Qualidade]`.
- O `@pm` que criou uma story (chapéu Scrum) valida a story com o checklist completo do chapéu Product Owner, sem atalhos. Toda nota abaixo do mínimo vira NO-GO.
- O veredito do QA gate (chapéu Qualidade) exige o relatório de inspeção do `@validator` quando o workflow pede inspeção. Sem relatório, o gate não sai como `PASS`.
- O `@dev` com chapéu Arquitetura registra decisões estruturais em ADR antes de implementá-las com o chapéu Desenvolvimento.

---

## 5. Estrutura de pastas

### 5.1 Framework (`.sia-core/`)

```text
.sia-core/
├── constitution.md         # princípios inegociáveis
├── core-config.yaml        # configuração do projeto
├── user-guide.md           # guia do usuário
├── agents/                 # {id}.md (definição) e {id}/MEMORY.md (memória no projeto)
├── tasks/                  # tasks executáveis
├── templates/              # templates de documento (YAML) e de arquivo (md, sql, yml)
│   ├── sql/                # templates SQL (chapéu Dados)
│   ├── squad/              # esqueleto de squad
│   └── service/            # esqueleto de serviço (create-service)
├── checklists/             # checklists de validação
├── workflows/              # workflows (YAML)
├── data/                   # bases de conhecimento e dados de apoio
├── rules/                  # regras projetadas nas IDEs
├── skills/                 # skills de workflow projetadas nas IDEs
├── hooks/                  # hooks de governança (JS)
├── schemas/                # JSON Schemas (squad, task, agente)
└── cli/                    # CLI `sia`
```

Resolução de dependências: `{type}/{name}` → `.sia-core/{type}/{name}`. Exemplo: `tasks/create-story.md` → `.sia-core/tasks/create-story.md`.

### 5.2 Projeto (configurável em `core-config.yaml`)

| Artefato | Caminho padrão |
|----------|----------------|
| Project brief, pesquisa de mercado, análise de concorrentes | `docs/brief.md`, `docs/market-research.md`, `docs/competitor-analysis.md` |
| PRD | `docs/prd.md` (fragmentado em `docs/prd/`) |
| Epics | `docs/prd/epic-{n}-{slug}.md` |
| Arquitetura | `docs/architecture.md` (fragmentada em `docs/architecture/`) |
| Documentação de projeto existente (`*document-project`) | `docs/brownfield-architecture.md` |
| Análise de código existente (`*analyze-codebase`) | `docs/architecture/project-analysis.md`, `docs/architecture/recommended-approach.md` |
| ADRs | `docs/architecture/adr/ADR-{nnn}-{slug}.md` |
| Stories | `docs/stories/{epic}.{story}-{slug}.story.md` |
| Backlog | `docs/stories/backlog.md` |
| Spec (spec pipeline) | `docs/stories/{epic}.{story}/spec/` |
| QA gates | `docs/qa/gates/{epic}.{story}-{slug}.yml` |
| Avaliações de QA (NFR, risco, test design, trace) | `docs/qa/assessments/{epic}.{story}-{tipo}-{AAAAMMDD}.md` |
| Relatórios de inspeção | `docs/qa/inspections/AAAA-MM-DD-HHmm-{comando}-{escopo}.md` |
| Plano de execução de epic | `docs/prd/epic-{n}-execution.yaml` |
| Propostas de mudança (`*correct-course`) | `docs/prd/change-proposals/{AAAA-MM-DD}-{slug}.md` |
| Pesquisas (`*research`, `*research-deps` fora de story) | `docs/research/{AAAA-MM-DD}-{slug}/` |
| Resultado de brainstorming | `docs/brainstorming-session-results.md` |
| Índice de stories | `docs/stories/index.md` |
| Arquivo morto do backlog | `docs/stories/backlog-archive-{AAAA-MM}.md` |
| Artefatos de UX | `docs/ux/` (`research/`, `wireframes/{slug}/`, `ai-prompts/`, `design-system/`, `components/`, `audit/{AAAA-MM-DD}/`) |
| Especificação de front-end | `docs/front-end-spec.md` |
| Arquitetura de front-end | `docs/front-end-architecture.md` |
| Revisões de especialistas e relatórios (brownfield discovery) | `docs/reviews/`, `docs/reports/` |
| RUN-LOG de pipelines longos | `docs/prd/epic-{n}-run-log.md` ou `docs/runlogs/{pipeline}-run-log.md` |
| Banco (Supabase) | `supabase/migrations/`, `supabase/rollback/`, `supabase/snapshots/`, `supabase/smoke/`, `supabase/docs/` (`SCHEMA.md`, `DB-AUDIT.md`, `migration-log.md`) |
| Design de banco | `docs/architecture/schema-design.md`, `docs/architecture/rls-policies.md`, `docs/architecture/index-strategy.md` |
| Gotchas | `docs/gotchas.md` |
| Squads | `squads/{nome}/` |
| Blueprints de squad (`*design-squad`) | `squads/.designs/` |
| Runtime (não versionado) | `.sia/` (handoffs, `sdc/`, `qa-loop/`, `workflows/`, `backups/`, `publish/`, `db/`, agente ativo) |

`{epic}.{story}` é o **storyId** (ex.: `1.3`). `{slug}` é o título curto em kebab-case, sem acentos.

### 5.3 Fragmentação de documentos (`shard-doc`)

- Cada seção de nível 2 (`##`) vira um arquivo: o nome é o título em kebab-case, sem acentos (`## Requisitos Não Funcionais` → `requisitos-nao-funcionais.md`).
- Seções de epic no PRD usam o título `## Epic {n}: {título}` e viram `epic-{n}-{slug}.md`.
- Na arquitetura, três seções têm título fixo em inglês, porque o `@dev` sempre as carrega (`devLoadAlwaysFiles`): `## Tech Stack` → `tech-stack.md`, `## Source Tree` → `source-tree.md`, `## Coding Standards` → `coding-standards.md`.
- O fragmentador gera um `index.md` com links para os fragmentos.

---

## 6. Ciclo de vida da story

```text
Draft → Ready → InProgress → InReview → Done
```

| Transição | Quem | Comando | Condição |
|-----------|------|---------|----------|
| (criação) → `Draft` | `@pm` [Scrum] | `*create-story` | story criada a partir do epic |
| `Draft` → `Ready` | `@pm` [Product Owner] | `*validate-story` | GO (nota ≥ 7/10) |
| `Ready` → `InProgress` | executor declarado | `*develop` (`@dev`, `@devops`) ou `*execute-research-story` (`@pm` [Análise]) | início da execução |
| `InProgress` → `InReview` | executor declarado | idem | tasks concluídas; testes e lint passando quando houver código |
| (inspeção) | `@validator` | `*revisar-feature {storyId}` | stories que alteram código ou configuração; não muda status |
| `InReview` → `Done` | `@pm` [Qualidade] | `*qa-gate` | `PASS`, `CONCERNS` ou `WAIVED` |
| `InReview` → `InProgress` | `@pm` [Qualidade] | `*qa-gate` | `FAIL` (volta para `@dev` com fix request) |
| (entrega) | `@devops` | `*push`, `*create-pr` | só com story em `Done` |

Regras:

- O executor declarado na seção `## Executor` é `@dev` [chapéu] por padrão, `@devops` em stories de infraestrutura (CI/CD, deploy) e `@pm` [Análise] em stories de pesquisa. Só ele faz Ready → InProgress → InReview.
- Toda transição é registrada no `## Change Log` da story: data, agente no formato `@agente [Chapéu]`, de → para, motivo.
- O `@devops` não muda status de story, exceto como executor declarado de story de infraestrutura.
- Inspeção `reprovado` antes do gate: o `@dev` corrige com `*apply-qa-fixes` mantendo a story em `InReview`, registra uma linha no Change Log e pede nova inspeção. Gate `FAIL`: a story volta para `InProgress` e o `@dev` a devolve para `InReview` depois das correções.
- Story de pesquisa (entregável documental) não passa por inspeção: vai direto ao `*qa-gate`.
- Depois de um gate `FAIL`, quem corrige é o executor declarado: o `@dev` com `*apply-qa-fixes`; o `@devops` e o `@pm` [Análise] reexecutando o próprio comando de execução sobre o pedido de correção.
- Story em `Draft` depois de um GO é violação de processo.

### 6.1 Seções canônicas do arquivo de story

Os títulos abaixo são fixos. Tasks e CLI dependem deles.

```markdown
# Story {epic}.{story}: {título}

## Status
Draft

## Executor
- Executor: @dev [Desenvolvimento]
- Gate de qualidade: @pm [Qualidade]
- Inspeção: @validator (*revisar-feature)
- Complexidade: Média (motivo curto)

## Story
**Como** {persona}, **quero** {ação}, **para** {benefício}.

## Critérios de Aceite
1. Dado ..., quando ..., então ...

## Escopo
### Dentro
### Fora

## Dependências
## Riscos
## Definição de Pronto

## Tasks / Subtasks
- [ ] 1. ... (CA: 1)
  - [ ] 1.1 ...

## Dev Notes
## Testes

## Registro do Dev
### Modelo usado
### Decisões (modo YOLO)
### Log de debug
### Notas de conclusão
### File List

## Resultado do QA

## Change Log
| Data | Agente | Mudança |
|------|--------|---------|
```

Quem edita cada seção:

| Seção | Pode editar |
|-------|-------------|
| Título, Story, Critérios de Aceite, Escopo, Dependências, Riscos, Definição de Pronto | `@pm` |
| Status | conforme a tabela de transições |
| Tasks / Subtasks (checkboxes), Dev Notes, Testes, Registro do Dev | executor declarado (`@dev`, `@devops` ou `@pm` [Análise]) |
| Resultado do QA | `@pm` [Qualidade] |
| Change Log | qualquer agente que muda status ou entrega, só acrescentando linhas (o `@validator` não edita a story) |

### 6.2 Formatos verificados pela CLI

A CLI (`sia story status`, `sia sdc verify`) lê estes formatos. Tasks e templates devem produzi-los exatamente assim.

**Status da story:** a primeira linha não vazia depois de `## Status` contém só o valor (`Draft`, `Ready`, `InProgress`, `InReview` ou `Done`).

**Bloco `## Resultado do QA`** (escrito pelo `*qa-gate`; a última ocorrência de cada campo vale):

```markdown
## Resultado do QA

- **Gate:** PASS
- **Revisor:** @pm (Mira) [Qualidade]
- **Revisão:** 3f2a9c1
- **Data:** 2026-10-16
- **Arquivo do gate:** docs/qa/gates/2.1-login-social.yml
- **Inspeção:** docs/qa/inspections/2026-10-16-1430-revisar-feature-2.1.md (aprovado com ressalvas)
- **Resumo:** uma ou duas frases

### Pedido de correção (iteração 1)
Só quando o gate é FAIL. Lista numerada de correções com severidade, arquivo e critério de aceite afetado.
```

`Revisão` é o hash curto do commit avaliado (`git rev-parse --short HEAD`).

Da iteração 2 do QA Loop em diante, o gate acrescenta `### Revisão (iteração N)` dentro de `## Resultado do QA`, repetindo os mesmos campos. Como vale a última ocorrência de cada campo, o veredito atual é sempre o da iteração mais recente. A linha opcional `- **Follow-up:** [2.1-F1], [2.1-F2]` lista os itens criados no backlog.

As correções do `@dev` ficam em `### Notas de conclusão` como `#### Correções do QA (iteração N)`.

**Conversão de severidade da inspeção para o gate:** `bloqueante` e `alto` → `high`; `medio` → `medium`; `baixo` → `low`; `nota` não entra em `top_issues`. Achado `bloqueante` nunca é dispensado com `WAIVED`.

**Arquivo do gate** (`docs/qa/gates/{storyId}-{slug}.yml`):

```yaml
schema: 1
story: '2.1'
story_title: Login social
gate: PASS                      # PASS | CONCERNS | FAIL | WAIVED
status_reason: Uma frase com o motivo
reviewer: '@pm (Mira) [Qualidade]'
reviewed_revision: '3f2a9c1'           # entre aspas: um hash só com dígitos viraria número
updated: '2026-10-16T14:45:00-03:00'
inspection_report: docs/qa/inspections/2026-10-16-1430-revisar-feature-2.1.md
iteration: 1                    # iteração do QA Loop
top_issues: []                  # [{id, severity: low|medium|high, category, finding, suggested_action}]
waiver: { active: false, reason: '', approved_by: '' }
nfr_validation: {}              # {security|performance|reliability|maintainability: {status: PASS|CONCERNS|FAIL, notes}}
risk_summary: {}
recommendations: { immediate: [], future: [] }   # itens: {action, refs}
```

**Relatório de inspeção** (`docs/qa/inspections/AAAA-MM-DD-HHmm-{comando}-{escopo}.md`) começa com frontmatter:

```yaml
---
command: revisar-feature
scope: '2.1'
story: '2.1'                    # vazio quando o escopo não é uma story
verdict: aprovado com ressalvas # aprovado | aprovado com ressalvas | reprovado
date: '2026-10-16T14:30:00-03:00'
revision: '3f2a9c1'
findings: { bloqueante: 0, alto: 0, medio: 1, baixo: 2, nota: 0 }
---
```

`findings` conta todos os achados, inclusive os preexistentes. Quem decide é o `verdict`: a CLI e o `*qa-gate` leem o veredito, não as contagens.

**Handoff** (`.sia/handoffs/handoff-{de}-para-{para}-{AAAAMMDD-HHmmss}.yaml`): campos do template `agent-handoff-tmpl.yaml`, incluindo `last_command` e `consumed` (false ao gravar; true quando o agente seguinte exibe a sugestão).

**Agente ativo** (`.sia/active-agent.json`): `{"id": "devops", "source": "hook|cli", "at": "ISO-8601"}`. Escrito pelo hook de prompt ou por `sia agent use {id}`; lido pelo hook de autoridade.

---

## 7. Formato de agente

Arquivo `.sia-core/agents/{id}.md`: Markdown com um bloco YAML completo, seguido de seções de apoio. O bloco YAML é lido pela CLI, então precisa ser YAML válido.

````markdown
# {id}

AVISO DE ATIVAÇÃO: ...

```yaml
IDE-FILE-RESOLUTION: [...]
REQUEST-RESOLUTION: ...
activation-instructions: [...]
agent:
  name: Mira
  id: pm
  title: ...
  icon: 🎯
  aliases: [mira]
  whenToUse: ...
  absorbs: [pm, po, sm, qa, analyst]
persona_profile:
  archetype: ...
  communication:
    tone: ...
    emoji_frequency: low
    vocabulary: [...]
    greeting_levels: { minimal: ..., named: ..., archetypal: ... }
    signature_closing: ...
persona:
  role: ...
  style: ...
  identity: ...
  focus: ...
  core_principles: [...]
hats:                       # só para agentes consolidados
  - id: quality
    name: Qualidade
    origin: qa
    mindset: ...
    commands: [qa-gate, nfr-assess]
commands:
  - name: qa-gate
    hat: quality
    args: '{storyId}'
    task: qa-gate.md
    visibility: [full, quick, key]
    description: '...'
dependencies:
  tasks: [...]
  templates: [...]
  checklists: [...]
  data: [...]
  workflows: [...]
authority:
  exclusive: [...]
  delegates: [...]
```

## Comandos rápidos
## Colaboração
## Guia (*guide)
````

Regras do bloco YAML:

- Todo comando com `task:` aponta para um arquivo listado em `dependencies.tasks`.
- `template:` e `checklist:` em comandos também precisam constar em `dependencies`.
- Comandos embutidos (sem task): `help`, `guide`, `yolo`, `exit`.
- Campos extras aceitos em comandos: `args`, `hat`, `lenses`, `scope`.
- `dependencies` aceita os tipos `tasks`, `templates`, `checklists`, `data`, `workflows` e `schemas`. Entradas terminadas em `/` são diretórios (ex.: `squad/`).
- `visibility`: `key` aparece na saudação, `quick` no `*help` curto, `full` no `*help` completo.
- A saudação não usa adjetivo com gênero ("pronto/pronta"). Use construções neutras: "em ação", "na área", "por aqui".

### 7.1 Agentes e tasks de squad

- Seguem os mesmos formatos (seções 7 e 8) e ficam em `squads/{nome}/agents/` e `squads/{nome}/tasks/`.
- Dependências resolvem primeiro em `squads/{nome}/{type}/` e depois em `.sia-core/{type}/`.
- Em tasks de squad, `agent:` aceita o id de um agente do próprio squad.
- O tier do agente (posição no fluxo do squad) fica em `## Colaboração`. Agentes de especialista podem ter uma seção opcional `## Voz`.
- Memória opcional em `squads/{nome}/agents/{id}/MEMORY.md`.

---

## 8. Formato de task

Arquivo `.sia-core/tasks/{id}.md`. Frontmatter YAML obrigatório, corpo com seções fixas.

### 8.1 Frontmatter

```yaml
---
id: create-story                 # igual ao nome do arquivo, sem .md
title: Criar a próxima story
agent: pm                        # pm | dev | devops | validator | squad-creator | any
hat: scrum                       # opcional; obrigatório quando agent é pm ou dev
elicit: true                     # true quando a task exige interação com o usuário
modes: [yolo, interactive, preflight]   # opcional; modos suportados
inputs:
  - 'epic (opcional): número do epic; se ausente, usa o próximo pendente'
outputs:
  - 'docs/stories/{epic}.{story}-{slug}.story.md com status Draft'
depends_on:                      # artefatos do .sia-core usados; a CLI verifica se existem
  tasks: [execute-checklist.md]
  templates: [story-tmpl.yaml]
  checklists: [story-draft-checklist.md]
  data: []
next: [validate-story]           # comandos sugeridos depois desta task
source: [create-next-story.md, sm-create-next-story.md]   # origem no AIOX
---
```

### 8.2 Corpo

```markdown
# {Título}

## Objetivo
Uma ou duas frases: o que a task produz e por quê.

## Quando usar
- Situações em que a task se aplica (e quando não se aplica).

## Pré-condições
- [ ] Condição bloqueante 1

## Passos
### 1. {Nome do passo}
Instruções objetivas, no imperativo.
**Ponto de elicitação:** (quando houver) o que perguntar e como apresentar opções numeradas.

### 2. ...

## Saída
O que é gravado, onde e em que formato.

## Critérios de conclusão
- [ ] Verificação objetiva 1

## Tratamento de erros
| Situação | Ação |
|----------|------|

## Handoff
Próximo passo: `@agente *comando {args}`.
```

### 8.3 Modos de execução

Tasks que suportam modos descrevem o comportamento de cada um em uma tabela curta:

| Modo | Interação | Uso |
|------|-----------|-----|
| YOLO | 0 a 1 pergunta; decisões registradas na story em `### Decisões (modo YOLO)` | tarefas simples e determinísticas |
| Interativo (padrão) | 5 a 10 checkpoints de decisão | decisões relevantes, aprendizado |
| Pre-Flight | todas as perguntas antes, depois execução sem ambiguidade | requisitos ambíguos, trabalho crítico |

### 8.4 Elicitação

- Tasks com `elicit: true` exigem interação. Nunca pule a elicitação por eficiência.
- Opções sempre em lista numerada, permitindo responder com o número.
- Em templates YAML, seções com `elicit: true` param após o rascunho da seção e oferecem as opções da task `advanced-elicitation`.

---

## 9. Formato de template

### 9.1 Template de documento (YAML)

Usado pela task `create-doc`. Estrutura (chaves em inglês, textos em português):

```yaml
template:
  id: prd-template
  name: Documento de Requisitos do Produto (PRD)
  version: 1.0
  output:
    format: markdown
    filename: docs/prd.md
    title: "{{project_name}}: Documento de Requisitos do Produto"

workflow:
  mode: interactive
  elicitation: advanced-elicitation

sections:
  - id: goals-context
    title: Objetivos e Contexto
    instruction: |
      Instrução para o LLM, em português.
    elicit: true
    sections:
      - id: goals
        title: Objetivos
        type: bullet-list
        instruction: ...
```

Campos de seção aceitos: `id`, `title`, `instruction`, `type` (`paragraphs`, `bullet-list`, `numbered-list`, `table`, `choice`, `code`, `template-text`, `mermaid`), `elicit`, `repeatable`, `condition`, `columns`, `choices`, `template`, `examples`, `owner`, `editors`, `sections`, `mermaid_type`, `language`, `prefix`, `content`. Em `workflow`, `custom_elicitation` substitui o menu padrão de elicitação.

`owner` e `editors` usam ids de agente do SIA (`pm`, `dev`...), opcionalmente com chapéu: `pm:quality`.

### 9.2 Template de arquivo

Markdown, SQL, YAML de CI etc. Comece com um comentário curto no formato do arquivo explicando o uso e os placeholders `{{variavel}}`. Exceção: templates de documento que começam com frontmatter YAML (ex.: `inspection-report-tmpl.md`) trazem o frontmatter primeiro e o comentário logo depois.

---

## 10. Formato de checklist

```markdown
# Checklist: {Nome}

> Usado por: `@agente` [chapéu] em `*comando`.
> Modo: interativo (item a item) ou YOLO (relatório completo de uma vez).

[[LLM: instruções de inicialização: o que carregar antes, como avaliar, como reportar.]]

## 1. {Categoria}
- [ ] Item verificável e objetivo
- [ ] ...

## Resultado
| Categoria | Status (✅ / ⚠️ / ❌) | Observações |
|-----------|----------------------|-------------|

**Decisão:** {regra de decisão, ex.: GO ≥ 7/10}
```

Blocos `[[LLM: ...]]` são instruções para o agente e não aparecem no relatório final.

Itens podem ser marcados como `(B)` bloqueante ou `(R)` recomendado. Um item `(B)` reprovado reprova o checklist; itens `(R)` só reduzem a nota.

---

## 11. Formato de workflow

```yaml
workflow:
  id: story-development-cycle
  name: Ciclo de Desenvolvimento de Story
  version: "1.0"
  description: >-
    ...
  type: generic            # generic | greenfield | brownfield
  project_types: [greenfield, brownfield]
  execution_modes: [yolo, interactive, preflight]

  sequence:
    - step: create_story
      id: create
      phase: 1
      agent: pm
      hat: scrum
      task: create-story.md
      creates: docs/stories/{storyId}-{slug}.story.md
      requires: []
      notes: |
        ...
      success_criteria:
        - Story criada com status Draft

    - step: validate_story
      id: validate
      phase: 2
      agent: pm
      hat: owner
      task: validate-story.md
      requires: [create]
      on_failure: { goto: create, reason: NO-GO }

  flow_diagram: |
    ```mermaid
    flowchart TD
      ...
    ```

  decision_guidance:
    when_to_use: [...]
    when_not_to_use: [...]

  handoff_prompts:
    create_to_validate: "Story {storyId} criada. Próximo: @pm *validate-story {storyId}"
```

Todo `task:` de workflow precisa existir em `.sia-core/tasks/`. Todo `agent:` precisa ser um dos 5 agentes.

Chaves de passo aceitas além do exemplo: `command` (comando do agente, ex.: `*develop {storyId}`), `action`, `condition` (o passo só roda quando a condição vale), `optional`, `elicit`, `repeats`, `on_verdict` (rota por veredito), `on_failure` (`goto` + `reason`), `complete`. Variantes de workflow usam `variables`, `by_project_type`, `by_executor` e `routes`; orientações gerais vão em `guidance` e o encerramento em `completion`.

**Convenção de laços:** o `run-workflow` só volta atrás por `on_failure.goto`. Por isso, o passo de correção fica **antes** da etapa que o aciona, com `condition`, e o primeiro passe o pula.

---

## 12. Formato de regra

Arquivo `.sia-core/rules/{nome}.md`. Projetado em `.claude/rules/` (arquivo inteiro), e no `AGENTS.md` (Codex), no `GEMINI.md` e em `.grok/rules/sia-core.md` (inteiro com `embed: full`; resumo nos demais casos). Use `embed: full` só nas regras essenciais: o Codex lê até 32 KiB do `AGENTS.md`.

```markdown
---
description: Uma linha explicando quando a regra se aplica
paths: []        # opcional; globs que restringem quando a regra carrega (Claude Code)
embed: full      # opcional; embute o corpo inteiro no AGENTS.md, GEMINI.md e .grok/rules (sem a chave, entra só um resumo)
---

# {Título da regra}

Conteúdo normativo, curto, com tabelas. Use MUST / SHOULD em português: DEVE, NÃO DEVE, DEVERIA.
```

---

## 13. Formato de skill

Skills de workflow vivem em `.sia-core/skills/{nome}/SKILL.md` e são projetadas em cada IDE.

```markdown
---
name: sia-develop-story
description: >
  Uma frase do que a skill faz. Use quando: gatilhos separados por vírgula.
argument-hint: "{storyId} [yolo|interactive|preflight]"
agent: dev
---

# sia-develop-story

**Task fonte da verdade:** `.sia-core/tasks/develop-story.md`

## Entrada
## Protocolo
## Gates antes de concluir
## Handoff
```

A skill não duplica a lógica da task: ela aponta para a task e acrescenta só o protocolo de invocação.

---

## 14. Portando do AIOX

### 14.1 Remover

| Item do AIOX | Ação no SIA |
|--------------|-------------|
| Bloco genérico "Task Definition (AIOX Task Format V1.0)", Pre/Post-Conditions genéricas, "Tools", "Scripts", "Performance", "Metadata" | Remover. Manter só pré-condições reais da task. |
| Code Intelligence (`code-intel`, `isCodeIntelAvailable`) | Remover. Substituir por busca no código (grep/glob) quando o passo depender disso. |
| IDS (registry, gates G1-G6, `*ids`) | Remover. Manter a ideia "REUSE > ADAPT > CREATE" como orientação em texto. |
| SYNAPSE, `pvMindContext`, minds, Bob, TerminalSpawner, `user_profile` | Remover. |
| CodeRabbit (self-healing, WSL) | Remover. A inspeção técnica é do `@validator`. |
| ClickUp (pull/sync de story) | Remover. |
| Pro, licenças, `devops-pro-*` | Remover. |
| `autoClaude`, worktree automática, build autônomo | Remover. |
| `require('...')` de módulos JS do `.aiox-core/core` | Remover ou trocar por comando da CLI `sia` (seção 16). |
| Comandos `aiox ...` | Trocar pelo equivalente `sia ...` ou remover. |
| "Synkra AIOX", "AIOX" | "SIA" |
| `.aiox-core/development/{tasks,templates,checklists,workflows}` e `.aiox-core/product/*` | `.sia-core/{tasks,templates,checklists,workflows,data}` |
| `.aiox/` | `.sia/` |
| Referência a "Story X.Y" internas do AIOX (histórico de desenvolvimento do AIOX) | Remover. |

### 14.2 Manter

- Os passos reais do processo, a ordem e os pontos de decisão.
- Pontos de elicitação e opções numeradas.
- Gates, critérios de decisão e limites numéricos (ex.: GO ≥ 7/10, máximo de 5 iterações no QA Loop).
- Exemplos curtos que ensinam o formato de saída.

### 14.3 Fundir

Quando várias tasks do AIOX viram uma task do SIA, a task resultante cobre todos os casos de uso das originais, com seções ou parâmetros claros (ex.: `*manage-worktrees {create|list|merge|remove|cleanup}`). Liste todas as origens em `source:`.

---

## 15. Condensação

- Alvo de tamanho: 80 a 300 linhas por task. Tasks críticas (`develop-story`, `qa-gate`, `create-story`, `validate-story`, `environment-bootstrap`) podem chegar a 450.
- Texto no imperativo, frases curtas, sem repetição.
- Uma informação, um lugar: se a regra está na constitution ou numa regra do `rules/`, a task referencia em vez de copiar.
- Tabelas para mapeamentos e decisões; listas numeradas para passos.
- Não invente funcionalidade que não existia no AIOX nem no pedido (Artigo IV). Integrações novas (Vercel, facilitador de MCP) seguem a documentação oficial pesquisada.

---

## 16. CLI do SIA

Tasks podem citar estes comandos. Todos rodam a partir da raiz do projeto.

| Comando | Função |
|---------|--------|
| `sia doctor [--json]` | Diagnóstico do ambiente: estrutura, config, Node ≥ 22, git, gh, projeções, hooks, MCPs |
| `sia validate` | Valida agentes, tasks, templates, checklists, workflows, skills e referências cruzadas |
| `sia validate --squad {nome}` | Valida um squad contra o schema |
| `sia sync [--ide claude-code,codex,gemini,grok] [--check]` | Gera ou confere as projeções das IDEs |
| `sia story status {storyId}` | Mostra status, checkboxes e próximo passo da story |
| `sia sdc plan {storyId} [--mode yolo\|interactive]` | Cria ou retoma o estado do ciclo da story |
| `sia sdc next {storyId}` | Diz a próxima fase e o comando a executar |
| `sia sdc verify {storyId} {fase} [--mark]` | Verifica se a fase foi cumprida (status, gate, relatório) e marca |
| `sia sdc status {storyId}` | Mostra o estado do ciclo |
| `sia mcp setup {supabase\|vercel} [--ide ...]` | Configura o MCP nas IDEs escolhidas |
| `sia mcp status` | Mostra quais MCPs estão configurados em cada IDE |
| `sia mcp remove {supabase\|vercel} [--ide ...]` | Remove a configuração do MCP nas IDEs escolhidas |
| `sia squad list` | Lista squads locais |

| `sia agent use {id}` / `sia agent current` / `sia agent clear` | Registra, mostra ou limpa o agente ativo (`.sia/active-agent.json`) |

Se `sia` não estiver no PATH, use `node .sia-core/cli/sia.js {comando}`. Se a CLI não estiver disponível, a task descreve a verificação manual equivalente.

---

## 17. Checklist do autor

Antes de considerar um artefato pronto:

- [ ] Frontmatter válido e `id` igual ao nome do arquivo
- [ ] Todo `depends_on`, `task:`, `template:` e `checklist:` aponta para arquivo existente no `.sia-core/`
- [ ] Nenhuma referência a agente do AIOX que não exista no SIA
- [ ] Nenhum resíduo da seção 14.1
- [ ] Português correto e acentuado; identificadores em inglês
- [ ] Caminhos de projeto conforme a seção 5.2
- [ ] Status e transições conforme a seção 6
- [ ] `sia validate` sem erros

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
| PRD | `docs/prd.md` (fragmentado em `docs/prd/`) |
| Epics | `docs/prd/epic-{n}-{slug}.md` |
| Arquitetura | `docs/architecture.md` (fragmentada em `docs/architecture/`) |
| ADRs | `docs/architecture/adr/ADR-{nnn}-{slug}.md` |
| Stories | `docs/stories/{epic}.{story}-{slug}.story.md` |
| Backlog | `docs/stories/backlog.md` |
| Spec (spec pipeline) | `docs/stories/{epic}.{story}/spec/` |
| QA gates | `docs/qa/gates/{epic}.{story}-{slug}.yml` |
| Avaliações de QA (NFR, risco, test design, trace) | `docs/qa/assessments/{epic}.{story}-{tipo}-{AAAAMMDD}.md` |
| Relatórios de inspeção | `docs/qa/inspections/AAAA-MM-DD-HHmm-{comando}-{escopo}.md` |
| Gotchas | `docs/gotchas.md` |
| Squads | `squads/{nome}/` |
| Runtime (não versionado) | `.sia/` (handoffs, estado do ciclo, sessão) |

`{epic}.{story}` é o **storyId** (ex.: `1.3`). `{slug}` é o título curto em kebab-case.

---

## 6. Ciclo de vida da story

```text
Draft → Ready → InProgress → InReview → Done
```

| Transição | Quem | Comando | Condição |
|-----------|------|---------|----------|
| (criação) → `Draft` | `@pm` [Scrum] | `*create-story` | story criada a partir do epic |
| `Draft` → `Ready` | `@pm` [Product Owner] | `*validate-story` | GO (nota ≥ 7/10) |
| `Ready` → `InProgress` | `@dev` | `*develop` | início da implementação |
| `InProgress` → `InReview` | `@dev` | `*develop` | tasks concluídas, testes e lint passando |
| (inspeção) | `@validator` | `*revisar-feature {storyId}` | não muda status |
| `InReview` → `Done` | `@pm` [Qualidade] | `*qa-gate` | `PASS`, `CONCERNS` ou `WAIVED` |
| `InReview` → `InProgress` | `@pm` [Qualidade] | `*qa-gate` | `FAIL` (volta para `@dev` com fix request) |
| (entrega) | `@devops` | `*push`, `*create-pr` | só com story em `Done` |

Regras:

- Toda transição é registrada no `## Change Log` da story: data, agente, de → para, motivo.
- O `@devops` nunca muda status de story.
- Story em `Draft` depois de um GO é violação de processo.

### 6.1 Seções canônicas do arquivo de story

Os títulos abaixo são fixos. Tasks e CLI dependem deles.

```markdown
# Story {epic}.{story}: {título}

## Status
Draft

## Executor
- Executor: @dev [chapéu]
- Gate de qualidade: @pm [Qualidade]
- Inspeção: @validator (*revisar-feature)

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
| Tasks / Subtasks (checkboxes), Dev Notes, Testes, Registro do Dev | `@dev` |
| Resultado do QA | `@pm` [Qualidade] |
| Change Log | qualquer agente, só acrescentando linhas |

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

Campos de seção aceitos: `id`, `title`, `instruction`, `type` (`paragraphs`, `bullet-list`, `numbered-list`, `table`, `choice`, `code`, `template-text`), `elicit`, `repeatable`, `condition`, `columns`, `choices`, `template`, `examples`, `owner`, `editors`, `sections`.

`owner` e `editors` usam ids de agente do SIA (`pm`, `dev`...), opcionalmente com chapéu: `pm:quality`.

### 9.2 Template de arquivo

Markdown, SQL, YAML de CI etc. Comece com um comentário curto no formato do arquivo explicando o uso e os placeholders `{{variavel}}`.

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

---

## 12. Formato de regra

Arquivo `.sia-core/rules/{nome}.md`. Projetado em `.claude/rules/`, `.codex/` (via AGENTS.md), `.gemini/` (via GEMINI.md) e `.grok/rules/`.

```markdown
---
description: Uma linha explicando quando a regra se aplica
paths: []        # opcional; globs que restringem quando a regra carrega (Claude Code)
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
| `sia doctor` | Diagnóstico do ambiente: estrutura, config, Node, git, gh, projeções, MCPs |
| `sia validate` | Valida agentes, tasks, templates, checklists, workflows, skills e referências cruzadas |
| `sia validate --squad {nome}` | Valida um squad contra o schema |
| `sia sync [--ide claude,codex,gemini,grok] [--check]` | Gera ou confere as projeções das IDEs |
| `sia story status {storyId}` | Mostra status, checkboxes e próximo passo da story |
| `sia sdc plan {storyId} [--mode yolo\|interactive]` | Cria ou retoma o estado do ciclo da story |
| `sia sdc next {storyId}` | Diz a próxima fase e o comando a executar |
| `sia sdc verify {storyId} {fase} [--mark]` | Verifica se a fase foi cumprida (status, gate, relatório) e marca |
| `sia sdc status {storyId}` | Mostra o estado do ciclo |
| `sia mcp setup {supabase\|vercel} [--ide ...]` | Configura o MCP nas IDEs escolhidas |
| `sia mcp status` | Mostra quais MCPs estão configurados em cada IDE |
| `sia squad list` | Lista squads locais |

Se a CLI não estiver disponível, a task descreve a verificação manual equivalente.

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

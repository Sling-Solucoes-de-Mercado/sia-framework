---
id: next
title: Sugerir o próximo comando
agent: any
elicit: false
inputs:
  - 'story (opcional): storyId ou caminho da story; sem ele, a task detecta o contexto'
  - '--all (opcional): mostra todas as sugestões em vez das 3 primeiras'
  - '--help (opcional): mostra o uso'
outputs:
  - 'Até 3 sugestões numeradas de comando (agente, comando, argumentos e motivo), no chat'
depends_on:
  data: [workflow-chains.yaml]
next: []
source: [next.md]
---

# Sugerir o próximo comando

## Objetivo
Dizer qual é o próximo comando, e de qual agente, a partir do estado real do projeto: status das stories, handoffs, workflows em andamento e `data/workflow-chains.yaml`. Assim o usuário navega o processo sem decorar sequências.

## Quando usar
- `*next` em qualquer agente que tenha o comando, a qualquer momento.
- Depois de uma interrupção, para retomar o fio do trabalho.
- Não use para executar o comando sugerido: esta task só sugere.

## Pré-condições
- [ ] Nenhuma bloqueante. Sem histórico (handoffs ou estados), a task usa só o estado das stories.

## Passos

### 1. Ajuda
Com `--help`, mostre e pare:
```text
Uso: *next [storyId|caminho] [--all]
Sugere o próximo comando com base nas stories, nos handoffs e no workflow.
  *next           detecta o contexto
  *next 2.1       contexto da story 2.1
  *next --all     todas as sugestões (não só as 3 primeiras)
```

### 2. Coletar sinais (somente leitura)
1. **Story explícita:** argumento da task. Caminho inválido: avise e siga com a detecção automática.
2. **Handoff:** o mais recente em `.sia/handoffs/` (prefira os com `consumed` diferente de `true`): `from_agent`, `to_agent`, `last_command`, `story_context`, `next_action`.
3. **Workflow em andamento:** estados em `.sia/workflows/*.yaml` com `status: active` (gravados por `run-workflow`), com o passo atual.
4. **Epic em execução:** `docs/prd/epic-*-execution.yaml` com `status: active` (gravado por `execute-epic`).
5. **Stories:** status de cada arquivo em `docs/stories/` (primeira linha não vazia depois de `## Status`). Story ativa: a mais recente em `InProgress` ou `InReview`; senão, `Ready`; senão, `Draft`.
6. **Contexto:** agente ativo, branch (`git branch --show-current`) e alterações não commitadas (`git status --porcelain`).

### 3. Consultar a CLI (quando existir)
Com a story conhecida, rode `sia story status {storyId}` e `sia sdc next {storyId}` (ou `node .sia-core/cli/sia.js ...`). O comando que a CLI indicar é a sugestão principal, com confiança alta.

### 4. Derivar pelo estado da story (sem CLI ou para complementar)
| Situação | Sugestão principal | Alternativa |
|----------|-------------------|-------------|
| Projeto sem PRD nem epic | `@pm *create-project-brief` | `@pm *create-epic` (melhoria pontual em projeto existente) |
| Epic sem próxima story criada | `@pm *create-story {epic}` | `@pm *execute-epic {epic}` |
| `Draft` | `@pm *validate-story {storyId}` | `@pm *story-checklist {storyId}` |
| `Ready` | `@dev *develop {storyId}` | `@dev *develop {storyId} yolo` (story simples) |
| `InProgress` com tasks pendentes | `@dev *develop {storyId}` (continuar) | `@dev *run-tests` |
| `InProgress` depois de gate `FAIL` | `@dev *apply-qa-fixes {storyId}` | `@pm *create-fix-request {storyId}` |
| `InReview` sem inspeção válida | `@validator *revisar-feature {storyId}` | — |
| `InReview` com inspeção `reprovado` | `@dev *apply-qa-fixes {storyId}` | — |
| `InReview` com inspeção `aprovado` ou `aprovado com ressalvas` | `@pm *qa-gate {storyId}` | `@pm *nfr-assess {storyId}` |
| `Done` | `@devops *push` e `@devops *create-pr {storyId}` | `@pm *close-story {storyId}`, depois `@pm *create-story {epic}` |

Regras de leitura:
- Gate `FAIL`: último `**Gate:**` do bloco `## Resultado do QA` da story.
- Inspeção da story: relatório mais recente em `docs/qa/inspections/` com `story: '{storyId}'` no frontmatter. Se o Change Log registrar uma volta para `InReview` depois da data do relatório, a inspeção está desatualizada: sugira uma nova.

### 5. Usar a cadeia do workflow
1. Workflow ativo (`run-workflow`): o comando do passo atual é a sugestão principal.
2. Epic ativo: `@pm *execute-epic {n} continue`.
3. Handoff com `last_command`: encontre em `data/workflow-chains.yaml` a etapa com o mesmo agente e comando; a etapa seguinte cuja `condition` vale vira sugestão, e as `alternatives` dela entram como alternativas.
4. Se o handoff e o status da story divergirem, vale o arquivo da story (fonte da verdade). Baixe a confiança e mencione a divergência.

### 6. Ordenar e apresentar
1. Remova sugestões repetidas e ordene: CLI ou workflow ativo; estado da story; cadeia do handoff.
2. Mostre as 3 primeiras (todas com `--all`), cada uma com agente, comando, argumentos e motivo.
3. Confiança: **alta** (CLI, ou estado e handoff concordam); **média** (só um sinal); **baixa** (sinais insuficientes ou em conflito).
4. Se a sugestão veio de um handoff destinado ao agente ativo, marque `consumed: true` nesse handoff (guia de autoria, seção 6.2).

Saída padrão:
```text
🧭 Workflow: story-development-cycle
📍 Estado: story 2.1 em InReview, inspeção aprovada (confiança: alta)

Próximos passos:
1. `@pm *qa-gate 2.1`: decidir o gate com o relatório de inspeção
2. `@pm *nfr-assess 2.1`: avaliar requisitos não funcionais antes do gate
3. `@validator *revisar-seguranca 2.1`: inspeção extra de segurança

Se o comando for do agente ativo, responda com o número para executar. Se for de outro agente, ative-o (ex.: `@validator`).
```

Confiança baixa:
```text
🧭 Workflow: indefinido
📍 Estado: incerto (confiança: baixa)

Possíveis próximos passos:
1. `*help`: comandos do agente ativo
2. `@pm *status`: panorama do projeto

⚠️ Contexto pouco claro. Informe a story: `*next {storyId}`.
```

Nenhum workflow detectado:
```text
🧭 Workflow: nenhum detectado
Não foi possível determinar o fluxo a partir do contexto atual.
Tente: `*next {storyId}` ou `*help`.
Último comando (handoff): *develop · Agente ativo: @dev
```

## Saída
Sugestões no chat. O único arquivo que a task pode alterar é o handoff usado, marcado com `consumed: true`.

## Critérios de conclusão
- [ ] Sinais lidos dos arquivos (story, handoff, estados), sem suposição
- [ ] No máximo 3 sugestões (sem `--all`), cada uma com agente, comando, argumentos e motivo
- [ ] Nível de confiança informado
- [ ] Nenhum comando executado por conta própria

## Tratamento de erros
| Situação | Ação |
|----------|------|
| `workflow-chains.yaml` ausente | Use só a tabela do passo 4 e avise |
| Handoff com YAML inválido | Ignore-o e avise |
| CLI indisponível | Derive manualmente (passos 4 e 5) |
| Story sem campo `## Status` | Avise e sugira a correção da story pelo `@pm` |

## Handoff
O próximo passo é a própria sugestão escolhida pelo usuário: ele ativa o agente indicado ou responde com o número quando o comando é do agente ativo.

---
id: qa-loop
title: QA Loop (inspeção, gate e correção)
agent: pm
hat: quality
elicit: true
inputs:
  - 'ação: start | resume | stop | escalate | status (sem ação, *qa-loop {storyId} equivale a start)'
  - 'storyId: id da story (ex.: 2.1)'
  - 'start --reset (opcional): descarta o estado anterior e recomeça'
outputs:
  - '.sia/qa-loop/{storyId}.json com o estado e o histórico do ciclo'
  - 'Story aprovada (Done) ou escalada para decisão humana com o pacote de contexto'
depends_on:
  tasks: [qa-gate.md, create-fix-request.md, inspect.md, apply-qa-fixes.md]
  workflows: [qa-loop.yaml]
next: [revisar-feature, qa-gate, apply-qa-fixes]
source: [development/workflows/qa-loop.yaml]
---

# QA Loop

## Objetivo

Conduzir o ciclo inspeção (`@validator`) → gate (`@pm [Qualidade]`) → correção (`@dev`) → nova inspeção até a story ser aprovada, com no máximo `quality.qaLoop.maxIterations` iterações (padrão 5). Ao bater o limite ou travar, o loop escala para uma pessoa com o contexto completo.

## Quando usar

- Story em `InReview` que deve chegar a `Done` sem condução manual de cada etapa.
- Para retomar, pausar, escalar ou consultar um loop em andamento.
- Não use para iniciar com story fora de `InReview`.

## Pré-condições

- [ ] `start`: story em `InReview`
- [ ] `resume`, `stop`, `escalate` e `status`: existe `.sia/qa-loop/{storyId}.json`

## Regras do loop

- Uma iteração = inspeção + gate, mais pedido de correção e correção quando o gate é `FAIL`.
- O limite de iterações é declarado antes da primeira iteração (Constitution, Artigo VIII). Se houver custo de modelo, declare também o teto de orçamento.
- Orquestre sem simular: o `@pm` não executa a inspeção nem a correção. Em cada etapa de outro agente, dispare o subagente correspondente quando a IDE suportar; senão, indique o comando, grave o estado e aguarde o `resume`.
- Etapa que falha é repetida até 2 vezes antes de escalar.
- Tempo: inspeção e gate acima de 30 minutos, ou correção acima de 60 minutos, escalam.

## Estado

Arquivo `.sia/qa-loop/{storyId}.json`, gravado ao fim de cada etapa:

```json
{
  "storyId": "2.1",
  "currentIteration": 2,
  "maxIterations": 5,
  "status": "in_progress",
  "phase": "inspect",
  "startedAt": "2026-10-16T14:00:00-03:00",
  "updatedAt": "2026-10-16T15:10:00-03:00",
  "escalation": null,
  "history": [
    {
      "iteration": 1,
      "inspection": "docs/qa/inspections/2026-10-16-1405-revisar-feature-2.1.md",
      "inspectionVerdict": "reprovado",
      "gate": "FAIL",
      "verdict": "REJECT",
      "issuesFound": 3,
      "reviewedAt": "2026-10-16T14:20:00-03:00",
      "fixedAt": "2026-10-16T15:05:00-03:00",
      "issuesFixed": 3
    }
  ]
}
```

| Campo | Valores |
|-------|---------|
| `status` | `pending`, `in_progress` (inclui a espera por etapa de outro agente), `completed`, `stopped`, `escalated` |
| `phase` | `inspect`, `gate` ou `fix`: a etapa a executar ou em execução |
| `verdict` | `APPROVE` (gate `PASS`, `CONCERNS` ou `WAIVED`), `REJECT` (gate `FAIL`), `BLOCKED` (gate não emitido) |
| `escalation` | `{ "trigger": "...", "reason": "...", "at": "..." }` |

## Passos

### 1. Ação `start`

1. Declare `[Chapéu: Qualidade]`. Leia `quality.qaLoop.maxIterations` (padrão 5).
2. Sem storyId: pergunte ("Uso: *qa-loop start {storyId}").
3. Story fora de `InReview`: PARE.
4. Estado existente em `in_progress`, `stopped` ou `escalated`:
   **Ponto de elicitação:** "Já existe um loop para {storyId} (iteração {n}, {status}). 1. Retomar (`resume`) 2. Recomeçar do zero (`start --reset`) 3. Cancelar". O `--reset` apaga o estado e recomeça.
5. Crie o estado com `currentIteration: 1`, `status: in_progress` e `phase: inspect`. Anuncie: "QA Loop iniciado para {storyId}: máximo de {max} iterações."
6. Siga para o ciclo (passo 2).

### 2. Ciclo de uma iteração

**2.1 Inspeção** (`phase: inspect`)

- Etapa do `@validator`: `*revisar-feature {storyId}`.
- Concluída quando existe relatório da story com `revision` igual ao HEAD atual. Registre `inspection` e `inspectionVerdict` no histórico e passe a `phase: gate`.

**2.2 Gate** (`phase: gate`)

- Rode `tasks/qa-gate.md`; o gate lê a iteração do arquivo de estado.
- Registre `gate`, `verdict`, `issuesFound` (itens em `top_issues`) e `reviewedAt`.

| Gate | Veredito | Ação |
|------|----------|------|
| `PASS`, `CONCERNS`, `WAIVED` | `APPROVE` | `status: completed`; mensagem de conclusão (passo 6) |
| `FAIL` | `REJECT` | o gate já gravou o pedido de correção; `phase: fix` |
| não emitido (condição de bloqueio) | `BLOCKED` | escale com `verdict_blocked` (passo 5) |

Se o pedido de correção falhar ao ser gravado, o loop segue: o `@dev` usa os `top_issues` do gate.

**2.3 Correção** (`phase: fix`)

- Etapa do `@dev`: `*apply-qa-fixes {storyId}`.
- Concluída quando a story volta a `InReview` e `### Notas de conclusão` traz `#### Correções do QA (iteração {n})`. Registre `fixedAt` e `issuesFixed`.
- Falha (correção não aplicada, testes quebrando): repita até 2 vezes; depois escale com `fix_failure`.

**2.4 Checar o limite**

- `currentIteration` ≥ `maxIterations`: escale com `max_iterations_reached` ("Máximo de {max} iterações sem aprovação").
- Senão: some 1 a `currentIteration`, passe a `phase: inspect`, anuncie "Iniciando a iteração {n}/{max}" e volte a 2.1.

### 3. Ação `stop`

Grave `status: stopped` e informe: "QA Loop parado na iteração {n}." O loop pode ser retomado depois.

### 4. Ação `resume`

1. Carregue o estado. Arquivo inválido ou corrompido: PARE e sugira `*qa-loop start {storyId} --reset`.
2. Aceite `in_progress` (etapa de outro agente concluída), `stopped` ou `escalated`.
3. Escalada por `max_iterations_reached`: continue só se `quality.qaLoop.maxIterations` tiver sido aumentado; senão, oriente a revisão manual (`@validator *revisar-feature {storyId}` e `@pm *qa-gate {storyId}`).
4. Grave `status: in_progress`, continue da `phase` gravada e informe: "QA Loop retomado na iteração {n}."

### 5. Escalada

Gatilhos: `max_iterations_reached`, `verdict_blocked`, `fix_failure` e `manual_escalate` (ação `escalate`).

1. Grave `status: escalated` e preencha `escalation`.
2. Monte o pacote de contexto: arquivo de estado; `## Resultado do QA` da story, com todas as iterações e pedidos de correção; relatórios de inspeção do histórico; arquivo do gate; resumo das iterações.
3. Mensagem:

```text
Escalada do QA Loop: {storyId}
Motivo: {gatilho}: {motivo}
Iterações concluídas: {n}/{max}
Último veredito: {gate} (inspeção: {veredito da inspeção})
Pendências: {issuesFound menos issuesFixed da última iteração}

Decida:
1. Retomar o loop: *qa-loop resume {storyId}
2. Corrigir manualmente e seguir com inspeção e gate avulsos
3. Rejeitar a story e criar follow-up: *backlog add follow-up
```

### 6. Ação `status` e conclusão

`status`: mostre storyId, status, fase, iteração {n}/{max}, último veredito, histórico e o próximo comando.

Conclusão (`APPROVE`):

```text
QA Loop concluído
Story: {storyId}
Status: completed
Iterações: {n}/{max}
Veredito final: {gate}
Histórico:
  1. REJECT (FAIL): 3 encontrados, 3 corrigidos
  2. APPROVE (CONCERNS): 1 encontrado
```

## Saída

- `.sia/qa-loop/{storyId}.json` atualizado a cada etapa.
- Story em `Done` (gate aprovado) ou loop em `escalated` com o pacote de contexto.
- Mensagens de início, retomada, conclusão ou escalada.

## Critérios de conclusão

- [ ] Estado gravado ao fim de cada etapa
- [ ] Nunca mais de `maxIterations` iterações
- [ ] Cada gate precedido de inspeção válida da revisão atual
- [ ] Loop termina em `completed` ou em `escalated` com o pacote de contexto
- [ ] Nenhuma etapa de outro agente simulada pelo `@pm`

## Tratamento de erros

| Situação | Ação |
|----------|------|
| storyId ausente | pergunte |
| Estado corrompido | PARE; `*qa-loop start {storyId} --reset` |
| Inspeção ou gate sem resultado após 2 tentativas | escale com `verdict_blocked` |
| Etapa acima do tempo (30 ou 60 minutos) | escale com o gatilho da etapa |
| Status da story mudou fora do loop | PARE e mostre o estado |

## Handoff

- `APPROVE`: `@devops *push` / `*create-pr {storyId}`. Também: `@pm *close-story {storyId}`.
- Etapa pendente sem subagente: o comando da fase atual (`@validator *revisar-feature {storyId}` ou `@dev *apply-qa-fixes {storyId}`) e depois `*qa-loop resume {storyId}`.
- Escalada: decisão humana com as três opções do passo 5.

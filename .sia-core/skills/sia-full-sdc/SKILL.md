---
name: sia-full-sdc
description: >
  Executa o ciclo completo de uma story (validate → develop → inspect → review → loop de QA → close)
  com estado durável e verificação em disco pela CLI `sia sdc`. Use quando: full-sdc, ciclo completo,
  SDC, rodar a story de ponta a ponta, /sia-full-sdc.
argument-hint: "{storyId|caminho} [yolo|interactive]"
agent: pm
---

# sia-full-sdc

**Task fonte da verdade:** cada fase segue a própria task (tabela abaixo). Esta skill só orquestra; a CLI (sia sdc) é dona do estado, da sequência e das verificações.

## Entrada

- `storyId` (ex.: `2.1`) ou caminho da story. Obrigatório; pergunte se faltar.
- Modo: `interactive` (padrão) ou `yolo`.

Se `sia` não estiver no PATH, use `node .sia-core/cli/sia.js`. Estado do ciclo: `.sia/sdc/{storyId}/state.json` (local, fora do git).

| # | Fase | Agente | Comando | Skill | Task |
|---|------|--------|---------|-------|------|
| 1 | `validate` | `@pm` [Product Owner] | `*validate-story {storyId}` | `sia-validate-story` | `.sia-core/tasks/validate-story.md` |
| 2 | `develop` | executor declarado | `*develop {storyId} {modo}` (`@dev`, `@devops`) ou `*execute-research-story {storyId}` (`@pm` [Análise]) | `sia-develop-story` | `.sia-core/tasks/develop-story.md` |
| 3 | `inspect` | `@validator` | `*revisar-feature {storyId}` (pulada em story de pesquisa) | `revisar-feature` | `.sia-core/tasks/inspect.md` |
| 4 | `review` | `@pm` [Qualidade] | `*qa-gate {storyId}` | `sia-qa-gate` | `.sia-core/tasks/qa-gate.md` |
| 4b | `apply_qa_fixes` | executor declarado | `*apply-qa-fixes {storyId}` (`@dev`) ou o comando de execução do executor | `sia-apply-qa-fixes` | `.sia-core/tasks/apply-qa-fixes.md` |
| 5 | `close` | `@pm` [Product Owner] | `*close-story {storyId}` | `sia-close-story` | `.sia-core/tasks/close-story.md` |

## Protocolo

```text
0. sia sdc plan {storyId} --mode {modo}
   Retoma pelo status da story: Draft → validate; Ready/InProgress → develop; InReview → inspect
   (review em story de pesquisa); Done com gate aprovado → concluído; Done sem gate → review.
   O executor vem de ## Executor da story.
1. LOOP
   a. sia sdc next {storyId}             → fase, agente, comando, task, skill e subagente
   b. sem próxima fase                   → FIM (ciclo concluído)
   c. ciclo halted                       → PARE e escale para um humano com a mensagem da CLI
   d. execute a fase com o agente indicado (subagente ou inline, ver abaixo)
   e. sia sdc verify {storyId} {fase} --mark
   f. verificação falhou                 → PARE; corrija com o agente da fase e repita o passo e
   g. volte para a
```

Loop de QA:

- `inspect` com relatório `reprovado`: a CLI marca `changes_requested` e manda para `apply_qa_fixes` antes do gate; a story continua em `InReview`.
- `review` com gate `FAIL`: a CLI marca `changes_requested` e manda para `apply_qa_fixes`.
  - Modo `interactive`: reporte o FAIL e o pedido de correção e siga só com aprovação explícita do usuário.
  - Modo `yolo`: siga direto para `*apply-qa-fixes`.
- `apply_qa_fixes` aprovado: a CLI reabre `inspect` e `review` (reinspeção obrigatória, com relatório novo; em story de pesquisa só `review`) e soma uma iteração.
- Circuit breaker: depois de `quality.qaLoop.maxIterations` iterações de correção (padrão 5), um novo FAIL deixa o ciclo `halted`. PARE e escale: o `@pm` decide entre `WAIVED` com aprovação registrada, replanejar (`*correct-course`) ou encerrar a story.

Execução de cada fase:

| IDE | Como executar |
|-----|---------------|
| Claude Code | subagente `sia-{agente}` com a missão "execute `*{comando} {storyId}` pela task da fase" |
| Grok | `spawn_subagent` com `subagent_type: "sia-{agente}"` e a mesma missão |
| Codex, Gemini e outras | inline: ative o agente (`$sia-{agente}`, `/sia-{agente}` ou `@{agente}`) e execute o comando |

A sessão principal (o orquestrador) roda `sia sdc verify ... --mark` depois de cada fase; o subagente nunca marca o estado.

Sequence lock:

1. Fases em ordem: a CLI recusa `--mark` fora da fase atual.
2. Só o QA gate (`@pm` [Qualidade]) leva a story para Done; `close` faz só o registro administrativo.
3. Quem implementa não aprova: executor (`@dev`) ≠ inspeção (`@validator`) ≠ gate (`@pm` [Qualidade]).
4. Toda transição de status vai para o `## Change Log` da story.

## Gates antes de concluir

- [ ] `sia sdc status {storyId}` mostra o ciclo `completed`
- [ ] Story em Done, com `## Resultado do QA` (Gate, Revisor, Revisão) coerente com o arquivo do gate
- [ ] Relatório de inspeção da revisão final em `docs/qa/inspections/`

## Handoff

Story Done → `@devops *push` e `@devops *create-pr {storyId}`. Esta skill nunca faz push.

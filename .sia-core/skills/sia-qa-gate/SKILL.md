---
name: sia-qa-gate
description: >
  Decide o QA gate da story (PASS, CONCERNS, FAIL ou WAIVED) com base em evidência e no relatório do @validator,
  e faz a transição de status. Use quando: QA gate, revisar story, veredito, *qa-gate, /sia-qa-gate.
argument-hint: "{storyId|caminho} [yolo|interactive]"
agent: pm
---

# sia-qa-gate

**Task fonte da verdade:** `.sia-core/tasks/qa-gate.md`

## Entrada

- `storyId` ou caminho da story (obrigatório).
- Modo: `interactive` (padrão) ou `yolo`.

## Protocolo

1. Atue como `@pm` com o chapéu Qualidade e declare `[Chapéu: Qualidade]`.
2. Pré-condições: story em `InReview` e relatório de inspeção do `@validator` que cubra a revisão atual (`quality.inspection.requiredBeforeGate`). Sem relatório, o gate não sai como `PASS`: peça `@validator *revisar-feature {storyId}`. Story de pesquisa (executor `@pm` [Análise]) não passa por inspeção e vem direto ao gate.
   - Inspeção `reprovado`: não decida o gate. O executor corrige com `*apply-qa-fixes` mantendo a story em `InReview` e pede nova inspeção.
3. Carregue a task fonte da verdade e execute a revisão completa: critérios de aceite, rastreabilidade, testes, NFRs e achados da inspeção.
4. Grave o arquivo do gate `docs/qa/gates/{storyId}-{slug}.yml` com o template da task, com `story` e `reviewed_revision` entre aspas no YAML (ex.: `reviewed_revision: '3f2a9c1'`).
5. Escreva o bloco `## Resultado do QA` (guia de autoria, seção 6.2): Gate, Revisor, Revisão (`git rev-parse --short HEAD`), Data, Arquivo do gate, Inspeção e Resumo. Da iteração 2 do QA Loop em diante, acrescente `### Revisão (iteração N)` repetindo os mesmos campos: vale a última ocorrência de cada campo. Itens criados no backlog entram em `- **Follow-up:** [{storyId}-F1]`.
6. Status: `PASS`, `CONCERNS` ou `WAIVED` → `Done`; `FAIL` → `InProgress`, com `### Pedido de correção (iteração N)`. Registre no `## Change Log` (data, `@agente [Chapéu]`, de → para e motivo), ex.: `| 2026-10-16 | @pm [Qualidade] | InReview → Done: gate PASS |`.
7. `WAIVED` exige no arquivo do gate `waiver.active: true`, `reason` e `approved_by`.

## Gates antes de concluir

- [ ] `sia sdc verify {storyId} review` passa
- [ ] Veredito do arquivo do gate igual ao da story
- [ ] FAIL tem pedido de correção com severidade, arquivo e critério de aceite afetado

Proibido: aprovar sem o checklist do chapéu Qualidade, mudar código de produto, `git push`.

## Handoff

`PASS`, `CONCERNS` ou `WAIVED` → `@pm *close-story {storyId}` e `@devops *push` / `*create-pr {storyId}`.
`FAIL` → `@dev *apply-qa-fixes {storyId}`.

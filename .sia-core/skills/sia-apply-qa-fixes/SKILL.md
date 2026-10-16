---
name: sia-apply-qa-fixes
description: >
  Aplica o pedido de correção do QA gate ou da inspeção e devolve a story para reinspeção.
  Nunca aprova nem fecha. Use quando: aplicar correções do QA, gate FAIL, *apply-qa-fixes, /sia-apply-qa-fixes.
argument-hint: "{storyId|caminho} [yolo|interactive]"
agent: dev
---

# sia-apply-qa-fixes

**Task fonte da verdade:** `.sia-core/tasks/apply-qa-fixes.md`

## Entrada

- `storyId` ou caminho da story em um destes casos:
  - gate `FAIL`: a story está em `InProgress` e volta para `InReview` depois das correções;
  - inspeção `reprovado` antes do gate: a story continua em `InReview`.
- Modo: `interactive` (padrão) ou `yolo`.

## Protocolo

1. Atue como o executor declarado em `## Executor`: `@dev` por padrão. Em story de infraestrutura o `@devops` corrige com `*develop`; em story de pesquisa, o `@pm` [Análise] com `*execute-research-story`.
2. Carregue a task fonte da verdade e execute-a.
3. Leia todos os achados antes de corrigir: `### Pedido de correção`, `top_issues` do arquivo do gate e o relatório de inspeção.
4. Corrija bloqueante e alto antes de médio e baixo. Cada achado termina como corrigido, não corrigido (com justificativa) ou adiado (com dono).
5. Rode de novo os scripts de `quality.scripts` (lint, typecheck, testes, build).
6. Registre as correções em `### Notas de conclusão` como `#### Correções do QA (iteração N)` e atualize a File List.
7. Gate `FAIL`: devolva a story para `InReview`. Inspeção reprovada: mantenha `InReview`. Nos dois casos, acrescente uma linha no `## Change Log` (data, `@agente [Chapéu]`, de → para e motivo).

## Gates antes de concluir

- [ ] `sia sdc verify {storyId} apply_qa_fixes` passa (story em `InReview`)
- [ ] Todo achado tem destino registrado
- [ ] Nenhum status `Done` e nenhuma edição em `## Resultado do QA`

Proibido: aprovar o próprio trabalho, `git push`, `--no-verify`.

## Handoff

Reinspeção obrigatória: `@validator *revisar-feature {storyId}` e depois `@pm *qa-gate {storyId}`. Story de pesquisa: direto para `@pm *qa-gate {storyId}`.

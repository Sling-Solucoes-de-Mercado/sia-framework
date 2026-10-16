---
name: sia-develop-story
description: >
  Implementa uma story (Ready → InProgress → InReview) com testes, validações e File List em dia.
  Use quando: implementar story, desenvolver critérios de aceite, *develop, /sia-develop-story.
argument-hint: "{storyId|caminho} [yolo|interactive|preflight]"
agent: dev
---

# sia-develop-story

**Task fonte da verdade:** `.sia-core/tasks/develop-story.md`

## Entrada

- `storyId` ou caminho da story (obrigatório).
- Modo: `yolo`, `interactive` (padrão) ou `preflight`.

## Protocolo

1. Atue como o executor declarado em `## Executor` da story: `@dev` [Desenvolvimento] por padrão; `@devops` em story de infraestrutura (`*develop`); `@pm` [Análise] em story de pesquisa (`*execute-research-story`, mesma task).
2. Carregue a task fonte da verdade e execute-a do início ao fim.
3. Branch: nunca trabalhe em `main`/`master`; use `feat/{storyId}-{slug}` ou `fix/{storyId}-{slug}`.
4. REUSE > ADAPT > CREATE; imports absolutos; CLI First (Constitution, Artigos I e VI).
5. Para cada task da story: implementar → testar → validar → só então marcar `[x]` → atualizar a File List.
6. Na story, edite só checkboxes, Dev Notes, Testes e o Registro do Dev. Status apenas `Ready → InProgress` (início) e `InProgress → InReview` (conclusão), cada um com uma linha no `## Change Log` (data, `@agente [Chapéu]`, de → para e motivo), ex.: `| 2026-10-16 | @dev [Desenvolvimento] | Ready → InProgress: início da implementação |`.
7. Commits locais com a skill `sia-commit`. Push é do `@devops`.

## Gates antes de concluir

- [ ] Scripts de `quality.scripts` do core-config passando (lint, typecheck, testes, build); script ausente é registrado
- [ ] `sia sdc verify {storyId} develop` passa: status `InReview`, File List preenchida, nenhum checkbox aberto
- [ ] Nenhum status `Done`

Proibido: `git push`, `--no-verify`, status `Done`, alterar critérios de aceite ou escopo (peça ao `@pm`).

## Handoff

Story que altera código ou configuração → `@validator *revisar-feature {storyId}`. Story de pesquisa → `@pm *qa-gate {storyId}` (sem inspeção).

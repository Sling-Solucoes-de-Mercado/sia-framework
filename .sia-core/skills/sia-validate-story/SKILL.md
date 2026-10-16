---
name: sia-validate-story
description: >
  Valida uma story em Draft com o checklist de 10 pontos; GO move para Ready, NO-GO lista as correções.
  Use quando: validar story, prontidão da story, *validate-story, /sia-validate-story.
argument-hint: "{storyId|caminho} [yolo|interactive]"
agent: pm
---

# sia-validate-story

**Task fonte da verdade:** `.sia-core/tasks/validate-story.md`

## Entrada

- `storyId` ou caminho da story (obrigatório; pergunte se faltar).
- Modo: `interactive` (padrão) ou `yolo`.

## Protocolo

1. Atue como `@pm` com o chapéu Product Owner e declare `[Chapéu: Product Owner]`.
2. Carregue a task fonte da verdade e siga as pré-condições, os passos e os critérios de conclusão dela.
3. Aplique o checklist completo. A nota mínima é `quality.storyValidation.minScore` do core-config (padrão 7).
4. Faça só as correções mecânicas que a task permite. Não invente critério de aceite nem escopo. Confira se `## Executor` declara o executor (`@dev` [chapéu] por padrão, `@devops` em infraestrutura, `@pm` [Análise] em pesquisa).
5. GO: `## Status` passa para `Ready` e a decisão vai para o `## Change Log` (data, `@agente [Chapéu]`, de → para e motivo), ex.: `| 2026-10-16 | @pm [Product Owner] | Draft → Ready: GO 9/10 |`.
6. NO-GO: a story continua em `Draft`, com a lista de correções obrigatórias.
7. Separação de chapéus: se o `@pm` criou a story, a validação usa o checklist inteiro mesmo assim (guia de autoria, seção 4.2).

## Gates antes de concluir

- [ ] GO: `sia sdc verify {storyId} validate` passa
- [ ] NO-GO: story em `Draft` com as correções listadas
- [ ] Decisão registrada no `## Change Log`
- [ ] Nenhum status `Done` escrito por esta skill

## Handoff

GO → executor declarado: `@dev *develop {storyId}` (padrão), `@devops *develop {storyId}` (infraestrutura) ou `@pm *execute-research-story {storyId}` (pesquisa). NO-GO → ajuste com `@pm` [Scrum] e nova validação.

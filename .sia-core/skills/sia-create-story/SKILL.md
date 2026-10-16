---
name: sia-create-story
description: >
  Cria a próxima story do epic, em status Draft, com todo o contexto que o @dev precisa.
  Use quando: criar story, próxima story, *create-story, /sia-create-story.
argument-hint: "[epic] [yolo|interactive]"
agent: pm
---

# sia-create-story

**Task fonte da verdade:** `.sia-core/tasks/create-story.md`

## Entrada

- `epic` (opcional): número do epic. Sem ele, a task escolhe o próximo epic com stories pendentes.
- Modo (opcional): `interactive` (padrão) ou `yolo`.

## Protocolo

1. Atue como `@pm` com o chapéu Scrum. Se a persona não estiver ativa, leia `.sia-core/agents/pm.md` e declare `[Chapéu: Scrum]`.
2. Carregue a task fonte da verdade e execute-a do início ao fim, com o template e o checklist que ela cita.
3. Respeite os pontos de elicitação da task, com opções numeradas. No modo `yolo`, registre as decisões na story.
4. Grave a story em `docs/stories/{epic}.{story}-{slug}.story.md` com as seções canônicas (guia de autoria, seção 6.1) e `## Status` igual a `Draft`. Declare o executor em `## Executor` (`@dev` [chapéu] por padrão, `@devops` em infraestrutura, `@pm` [Análise] em pesquisa). Registre a criação no `## Change Log` (data, `@agente [Chapéu]`, de → para e motivo).
5. Não invente requisito: tudo rastreia para PRD, epic ou arquitetura (Constitution, Artigo IV).

## Gates antes de concluir

- [ ] Arquivo da story criado com as seções canônicas
- [ ] `sia story status {storyId}` mostra `Draft` e sugere `@pm *validate-story {storyId}`
- [ ] Nenhum status além de `Draft`

## Handoff

`@pm *validate-story {storyId}` com o chapéu Product Owner e o checklist completo, sem atalhos, mesmo tendo criado a story.

---
name: sia-close-story
description: >
  Faz o fechamento administrativo de uma story já aprovada no QA gate (índice, backlog, epic), sem mudar o status.
  Use quando: fechar story, story Done, *close-story, /sia-close-story.
argument-hint: "{storyId|caminho}"
agent: pm
---

# sia-close-story

**Task fonte da verdade:** `.sia-core/tasks/close-story.md`

## Entrada

- `storyId` ou caminho da story (obrigatório).

## Protocolo

1. Atue como `@pm` com o chapéu Product Owner e declare `[Chapéu: Product Owner]`.
2. Antes de qualquer registro, rode `sia sdc verify {storyId} close`. Se falhar, PARE sem escrever nada.
   - Gate aprovado: `PASS`, `CONCERNS` aceito ou `WAIVED` (não `FAIL` nem ausente).
   - Story já em `Done` pelo QA gate.
3. Carregue a task fonte da verdade e faça só o registro administrativo: índice de stories, backlog e epic.
4. Preserve `## Status` em `Done`; esta skill não faz transição de status.
5. Sugira a próxima story do epic quando houver.

## Gates antes de concluir

- [ ] `## Status` continua `Done`
- [ ] Registro de fechamento acrescentado só quando traz informação nova
- [ ] Índice ou epic atualizado quando aplicável

Proibido: fechar sem veredito aprovado, mudar status, `git push`.

## Handoff

Se ainda não entregue: `@devops *push` e `@devops *create-pr {storyId}`. Próxima story: `@pm *create-story`.

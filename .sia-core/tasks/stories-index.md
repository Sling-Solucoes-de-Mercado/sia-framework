---
id: stories-index
title: Gerar o índice de stories
agent: pm
hat: owner
elicit: true
modes: [yolo, interactive]
inputs:
  - 'nenhum: lê docs/stories/'
outputs:
  - 'docs/stories/index.md com as stories por epic e status, progresso dos checkboxes, gate e executor'
depends_on:
  tasks: []
next: [backlog, create-story]
source: [po-stories-index.md]
---

# Gerar o índice de stories

## Objetivo

Gerar `docs/stories/index.md`, a visão única das stories do projeto: agrupadas por epic, com status, progresso das tasks, gate do QA e executor.

## Quando usar

- Depois de criar, validar ou fechar stories (o `*close-story` regenera o índice).
- Antes de planejamento ou de `*status`.
- Para ver só os números, sem gravar: opção de prévia.

## Pré-condições

- [ ] Pasta `docs/stories/` existe

## Modos

| Modo | Comportamento nesta task |
|------|--------------------------|
| YOLO | Regenera direto, sem confirmação. É o modo usado quando outra task chama esta. |
| Interativo (padrão) | Pergunta antes de gravar e oferece a prévia. |

## Passos

### 1. Confirmar

**Ponto de elicitação (Interativo):** "Regenerar o índice? Isso lê todas as stories e reescreve docs/stories/index.md. 1. Sim 2. Não, cancelar 3. Prévia (só os números, sem gravar)"

### 2. Ler as stories

Para cada `docs/stories/*.story.md`, extraia:

| Campo | Como obter |
|-------|------------|
| storyId e slug | nome do arquivo `{epic}.{story}-{slug}.story.md` |
| Título | linha `# Story {storyId}: {título}` |
| Status | primeira linha não vazia depois de `## Status` |
| Progresso | em `## Tasks / Subtasks`, checkboxes `[x]` sobre o total (tasks e subtasks) |
| Gate | última ocorrência de `- **Gate:**` em `## Resultado do QA`; sem ocorrência, `—` |
| Executor | linha `Executor:` de `## Executor` |

Com a CLI disponível, use `sia story status {storyId}` para status e checkboxes. Story com formato inválido (sem status, nome fora do padrão): registre um aviso e liste-a em "Stories com problema", fora das contagens.

### 3. Agrupar

1. Agrupe por epic (número antes do ponto no storyId). Título do epic: o H1 de `docs/prd/epic-{n}-*.md`; sem arquivo, "Epic {n}".
2. Dentro do epic, ordene pelo número da story.
3. Calcule as contagens por status, por gate e o total de `Done` por epic.

### 4. Prévia (opção 3)

Mostre o total, a contagem por epic e por status, e termine sem gravar: "Rode `*stories-index` e escolha 1 para gravar."

### 5. Gravar o índice

```markdown
# Índice de Stories

> Gerado por @pm (Mira) [Product Owner] em {AAAA-MM-DD HH:mm}. Não edite à mão: rode `*stories-index`.

## Resumo
- **Total:** 12 stories
- **Por status:** Draft 1 · Ready 2 · InProgress 1 · InReview 1 · Done 7
- **Por gate:** PASS 5 · CONCERNS 2 · FAIL 0 · WAIVED 0 · sem gate 5

## Epic 1: Fundação (4/5 Done)

| Story | Título | Status | Progresso | Gate | Executor |
|-------|--------|--------|-----------|------|----------|
| [1.1](1.1-setup-inicial.story.md) | Setup inicial | Done | 8/8 | PASS | @dev [Desenvolvimento] |
| [1.2](1.2-login-social.story.md) | Login social | InReview | 6/6 | — | @dev [Desenvolvimento] |

## Stories com problema
- `docs/stories/rascunho.story.md`: nome fora do padrão `{epic}.{story}-{slug}.story.md`
```

Use links relativos à pasta `docs/stories/`. Omita a seção "Stories com problema" quando não houver nenhuma.

### 6. Resumir

Mostre o total, as stories por epic e por status, e os próximos passos: `*backlog review` para ver o backlog e `*create-story` para criar a próxima story.

## Saída

- `docs/stories/index.md` reescrito por inteiro (opções Sim e YOLO).
- Resumo na resposta (todas as opções; a prévia não grava nada).

## Critérios de conclusão

- [ ] Total do índice igual ao número de stories lidas sem problema
- [ ] Stories agrupadas por epic, em ordem numérica
- [ ] Status, progresso, gate e executor de cada story
- [ ] Links relativos funcionando
- [ ] Prévia sem nenhuma escrita

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Nenhuma story | grave o índice vazio e avise |
| Metadado inválido | aviso; a story vai para "Stories com problema" |
| `docs/stories/` ausente | PARE; sugira `*create-story` |
| Falha de escrita | verifique a pasta e a permissão; não deixe arquivo pela metade |

## Handoff

- Backlog: `@pm *backlog review`.
- Próxima story: `@pm *create-story`.

---
name: sia-commit
description: >
  Cria um commit local em conventional commits com o storyId, sem push.
  Use quando: commitar, commit local, salvar o trabalho da story, /sia-commit.
argument-hint: "[storyId] [descrição]"
agent: dev
---

# sia-commit

Regras de origem: Constitution, Artigo II (push é exclusivo do `@devops`) e `github.conventionalCommits` do core-config.

## Entrada

- `storyId` (recomendado): story do trabalho; sem ele, use a story ativa (InProgress ou InReview).
- Descrição (opcional): resumo da mudança.

## Protocolo

1. Rode `git status`, `git diff` e `git diff --staged`.
2. Branch: não commite em `main`/`master`. Use `feat/{storyId}-{slug}` ou `fix/{storyId}-{slug}`.
3. Adicione só os arquivos da mudança (os da File List da story). Nunca adicione segredos (`.env`, chaves, tokens).
4. Monte a mensagem `{tipo}: {descrição} [Story {storyId}]`. O tipo vem de `github.conventionalCommits.branchTypeMap` (ex.: `feat/` → `feat`, `fix/` → `fix`) ou da natureza da mudança: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `ci`, `chore`.
5. Rode `git commit -m "{mensagem}"`. Os hooks do git rodam normalmente.
6. Não faça push. Para entregar, ative o `@devops` com `/sia-devops` e use `*push`.

## Gates antes de concluir

- [ ] `git log -1 --oneline` mostra a mensagem com `[Story {storyId}]`
- [ ] Nenhum arquivo fora do escopo da story no commit

Proibido: `git push`, `--force`, `--no-verify`, `--amend` de commit já publicado sem pedido explícito.

## Handoff

`@devops *push` (ative `/sia-devops`).

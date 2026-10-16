---
id: manage-worktrees
title: Gerenciar worktrees para desenvolvimento isolado
agent: devops
elicit: true
modes: [yolo, interactive]
inputs:
  - 'ação (obrigatório): create | list | merge | remove | cleanup'
  - 'nome (create, merge e remove): storyId ou nome curto com letras, números, ponto, hífen e sublinhado'
  - 'opções: --base {branch} (create), --force (remove), --days {n} (cleanup; padrão 30), --stale e --json (list)'
outputs:
  - 'create: worktree em .sia/worktrees/{nome} com branch própria; list: tabela de status; merge: branch integrada à base; remove e cleanup: worktrees removidas'
depends_on:
  tasks: [push.md]
next: [develop, push, create-pr]
source: [create-worktree.md, list-worktrees.md, remove-worktree.md, merge-worktree.md, cleanup-worktrees.md]
---

# Gerenciar worktrees para desenvolvimento isolado

## Objetivo
Criar, listar, integrar e remover worktrees do git, para que várias stories avancem em paralelo, cada uma com diretório e branch próprios, sem conflito na árvore de trabalho principal.

## Quando usar
- Duas ou mais stories em desenvolvimento ao mesmo tempo.
- Revisar ou testar outra branch sem `git stash`.
- Toda worktree é criada a pedido. O SIA não cria worktrees automaticamente.

## Pré-condições
- [ ] Repositório git (`git rev-parse --is-inside-work-tree`), com git 2.5 ou mais novo
- [ ] `.sia/` no `.gitignore` (as worktrees ficam em `.sia/worktrees/`)

## Convenções

| Item | Padrão |
|------|--------|
| Diretório | `.sia/worktrees/{nome}` |
| Branch | `{prefixo}{nome}`; prefixo de `github.conventionalCommits.branchTypeMap` (padrão `feat/`) |
| Limite | 10 worktrees ativas |
| Obsoleta | sem commit há mais de 30 dias |

Ferramentas que varrem o projeto (lint, testes, busca) devem ignorar `.sia/`, para não processar as worktrees em dobro.

## Modos

| Modo | Interação | Uso |
|------|-----------|-----|
| YOLO | `create` e `list` sem perguntas; `remove`, `merge` e `cleanup` ainda confirmam | uso diário |
| Interativo (padrão) | mostra caminho, branch e detalhes antes de cada ação | primeiras vezes, operações destrutivas |

## Passos

### create {nome}
1. Sem nome: peça um (ex.: `2.1`, `2.1-login-social`, `fix-auth`); valide o formato.
2. Já existe? `git worktree list --porcelain` com `.sia/worktrees/{nome}` → informe caminho e branch e pare.
3. Limite: com 10 worktrees ativas, pare e sugira `*worktree cleanup` ou `*worktree remove {nome}`, citando as obsoletas.
4. Branch: `{prefixo}{nome}` (interativo: confirme o prefixo); base: `--base` ou a branch padrão do remoto, atualizada com `git fetch origin`.
5. Crie: `git worktree add -b {branch} .sia/worktrees/{nome} origin/{base}`.
6. Mostre:
```text
━━━ Worktree criada ━━━
Nome:    2.1-login-social
Caminho: .sia/worktrees/2.1-login-social
Branch:  feat/2.1-login-social (base: main)
Próximos passos:
  cd .sia/worktrees/2.1-login-social e instale as dependências (npm ci)
  @dev *develop 2.1 dentro da worktree
  *worktree merge 2.1-login-social ou *push + *create-pr ao terminar
```

### list
1. `git worktree list --porcelain`; considere as de `.sia/worktrees/`.
2. Para cada uma: alterações pendentes (`git -C {caminho} status --porcelain`, contando linhas) e último commit (`git -C {caminho} log -1 --format=%cr`).
3. Status: 🟢 ativa com alterações | 🟡 ativa e limpa | ⚫ obsoleta (mais de 30 dias).
4. `--stale` mostra só as obsoletas; `--json` devolve `[{nome, caminho, branch, alteracoes, ultimo_commit, status}]`.
5. Rodapé: `Total: 3 | Ativas: 2 | Obsoletas: 1 | Limite: 10`. Sem worktrees: sugira `*worktree create {nome}`.

### merge {nome}
1. Confirme que a worktree existe.
2. Na worktree, rode os scripts de `quality.scripts` (lint, typecheck, test; ausentes são ignorados). Falha → pare e encaminhe ao `@dev`.
3. Base protegida no GitHub ou trabalho de story → prefira `*push` da branch da worktree e `*create-pr`. A integração local só vale para base sem exigência de PR.
4. Confirme a direção: "{branch} → {base}".
5. Na árvore principal: `git checkout {base}`, `git pull --ff-only origin {base}` e `git merge {branch}`.
6. Conflitos: resolva com o usuário, arquivo a arquivo; sem acordo, `git merge --abort`.
7. Envie com `*push` (o portão de qualidade roda de novo, com a verificação da story).
8. Pergunte se remove a worktree (`*worktree remove {nome}`).

### remove {nome}
1. Confirme que existe e que a sessão atual não está dentro dela (sem isso, saia para a raiz do projeto).
2. Mostre caminho, branch, data de criação, alterações pendentes e status.
3. Com alterações pendentes e sem `--force`:
```text
⚠️ A worktree tem {n} alterações não commitadas. Remover apaga essas alterações.
1. Fazer commit antes (dentro da worktree)
2. Integrar antes (*worktree merge {nome})
3. Remover mesmo assim (perde as alterações)
4. Cancelar
```
4. Confirmação final: o usuário digita "sim" para remover a worktree e a branch.
5. Execute: `git worktree remove .sia/worktrees/{nome}` (com `--force` na opção 3) e `git branch -d {branch}`. Branch não integrada: `-D` só com confirmação explícita da perda dos commits.
6. Falhou: `git worktree remove --force` e `git worktree prune`, com confirmação.

### cleanup
1. Liste as obsoletas: último commit há mais de `--days` dias (padrão 30).
2. Nunca inclua worktree com alterações pendentes: mostre-as à parte.
3. Confirme a lista (todas, escolher pelos números ou cancelar).
4. Para cada aprovada: `git worktree remove {caminho}` e, se a branch estiver integrada, `git branch -d {branch}`.
5. Rode `git worktree prune` e mostre o resumo.

## Saída
Conforme a ação: worktree criada com branch própria, tabela de status, branch integrada e enviada, ou worktrees removidas, com resumo.

## Critérios de conclusão
- [ ] Ação executada e confirmada por `git worktree list`
- [ ] Nenhuma alteração pendente perdida sem confirmação explícita
- [ ] Nenhuma branch não integrada apagada sem confirmação explícita
- [ ] `merge` só depois dos scripts de qualidade passarem na worktree

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Não é repositório git | `git init` ou `*environment-bootstrap` |
| Worktree já existe | use a existente ou remova antes |
| Limite de 10 atingido | `*worktree cleanup` ou `*worktree remove {nome}` |
| Branch já usada em outra worktree | o git não permite a mesma branch em duas worktrees; escolha outro nome ou remova a outra |
| Sessão dentro da worktree a remover | saia para a raiz do projeto e repita |
| `git worktree add` falhou | confira `git status` e se a base existe no remoto |

## Handoff
- Worktree criada: `@dev *develop {storyId}` dentro dela.
- Trabalho pronto: `@devops *push` e `@devops *create-pr {storyId}`.

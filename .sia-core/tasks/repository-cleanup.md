---
id: repository-cleanup
title: Limpar branches obsoletas e arquivos temporários
agent: devops
elicit: true
modes: [yolo, interactive]
inputs:
  - '--days (opcional): idade mínima, em dias, do último commit de uma branch obsoleta; padrão: 30'
  - '--dry-run (opcional): só lista o que seria removido'
outputs:
  - 'Branches locais e remotas já integradas e antigas removidas, arquivos temporários apagados e resumo da limpeza'
next: [worktree]
source: [github-devops-repository-cleanup.md]
---

# Limpar branches obsoletas e arquivos temporários

## Objetivo
Manter o repositório limpo: remover branches já integradas e paradas há mais de 30 dias e apagar arquivos temporários, sempre com lista prévia e confirmação. Apagar branch remota é operação de push, exclusiva do `@devops`.

## Quando usar
- Manutenção periódica do repositório.
- Depois de uma leva de merges ou de uma release.
- Worktrees obsoletas têm fluxo próprio: `*worktree cleanup`.

## Pré-condições
- [ ] Repositório git com remoto `origin`
- [ ] `gh auth status` autenticado, para apagar branches remotas

## Modos

| Modo | Interação | Uso |
|------|-----------|-----|
| YOLO | monta a lista e pede uma única confirmação | manutenção de rotina |
| Interativo (padrão) | confirma item a item | primeira limpeza ou repositório compartilhado |

`--dry-run` só lista, em qualquer modo.

## Passos

### 1. Atualizar referências
1. `git fetch --prune origin` atualiza as branches remotas e descarta as que já não existem.
2. Base: `git symbolic-ref --short refs/remotes/origin/HEAD` sem `origin/`; padrão `main`.
3. Branches protegidas desta task: a base, a branch de produção (`integrations.vercel.productionBranch`), `main`, `master` e a branch atual.

### 2. Branches locais obsoletas
1. Candidatas: `git branch --merged {base}`, sem as protegidas.
2. Idade: `git log -1 --format=%ct {branch}`; mantenha só as com último commit há mais de `--days` dias (padrão 30).
3. Branch com worktree ativa (`git worktree list`) fica de fora: use `*worktree remove`.

### 3. Branches remotas obsoletas
1. Candidatas: `git branch -r --merged origin/{base}`, sem `origin/HEAD` e as protegidas.
2. Mesmo critério de idade: `git log -1 --format=%ct origin/{branch}`.

### 4. Arquivos temporários
Procure, fora de `node_modules/` e `.git/`, os padrões `.DS_Store`, `Thumbs.db`, `*.tmp`, `*.log` e `.eslintcache`:

```bash
find . \( -path ./node_modules -o -path ./.git \) -prune -o -type f \( -name .DS_Store -o -name Thumbs.db -o -name '*.tmp' -o -name '*.log' -o -name .eslintcache \) -print
```

Separe os não rastreados (podem ser apagados) dos rastreados pelo git (`git ls-files {arquivo}`), que exigem `git rm` e commit.

### 5. Apresentar e confirmar

```text
━━━ Sugestões de limpeza ━━━
Repositório: https://github.com/org/app (base: main)

Branches locais (integradas, mais de 30 dias):
  feat/3.1-dashboard     45 dias
  fix/vazamento-memoria  60 dias
Branches remotas (integradas, mais de 30 dias):
  origin/feat/3.1-dashboard  45 dias
Arquivos temporários: .DS_Store (5), .eslintcache, debug.log
```

**Ponto de elicitação:**
1. Limpar tudo
2. Só branches locais
3. Escolher item a item
4. Só o relatório (dry-run)
5. Cancelar

### 6. Executar
1. Branch local: `git branch -d {branch}`. Nunca `-D`: branch não integrada fica, a menos que o usuário peça e confirme a perda dos commits.
2. Branch remota (com confirmação explícita da lista): `git push origin --delete {branch}`. Se o hook bloquear, oriente `/sia-devops` e repita.
3. Arquivo temporário não rastreado: apague. Rastreado: `git rm --cached {arquivo}`, inclua o padrão no `.gitignore` e faça commit operacional (`chore: remove arquivos temporários`), enviado por `*push`.
4. Registre cada falha e siga com os demais itens.

### 7. Resumo
Mostre o que foi removido, o que falhou e por quê, e o que ficou por decisão do usuário.

## Saída
Branches e arquivos removidos conforme a confirmação, e resumo da limpeza. Em `--dry-run`, só o relatório.

## Critérios de conclusão
- [ ] Nenhuma branch protegida, atual ou com worktree ativa removida
- [ ] Nenhuma branch não integrada removida sem pedido explícito
- [ ] Lista confirmada pelo usuário antes de qualquer remoção
- [ ] Resumo apresentado com sucessos e falhas

## Tratamento de erros

| Situação | Ação |
|----------|------|
| `git branch -d` recusa (não integrada) | mantenha; mostre os commits que seriam perdidos (`git log --oneline {base}..{branch}`) |
| Remoção remota recusada por proteção | branch protegida no GitHub; mantenha e informe |
| Hook bloqueou a remoção remota | oriente `/sia-devops` e repita |
| Arquivo rastreado entre os temporários | não apague direto; `git rm --cached` e commit |

## Handoff
`@devops *worktree cleanup` para worktrees obsoletas; `@devops *push` se houve commit de limpeza.

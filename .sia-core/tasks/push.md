---
id: push
title: Enviar a branch para o remoto
agent: devops
elicit: true
inputs:
  - 'branch (opcional): branch a enviar; padrão: branch atual'
  - '--force (opcional): só com pedido explícito do usuário e nunca na branch de produção'
outputs:
  - 'Commits da branch no remoto, com upstream configurado no primeiro envio'
depends_on:
  tasks: [pre-push.md]
  checklists: [pre-push-checklist.md]
next: [create-pr, vercel-deploy]
source: [devops.md]
---

# Enviar a branch para o remoto

## Objetivo
Enviar commits ao remoto somente depois do portão de qualidade e da confirmação do usuário. `git push` é exclusivo do `@devops` (Constitution, Artigo II); o portão aplica o Artigo V.

## Quando usar
- Story com status `Done` e QA gate aprovado, pronta para entrega.
- Commits operacionais do `@devops` (CI, release, bootstrap), que o portão trata como N/A de story.
- Não use para contornar um portão reprovado nem para enviar trabalho que o usuário não pediu para publicar.

## Pré-condições
- [ ] Agente ativo registrado como devops: o hook `enforce-git-push-authority` bloqueia push de qualquer outro agente
- [ ] Remoto `origin` configurado (`git remote get-url origin`)
- [ ] Credencial válida para o remoto (`gh auth status` ou credencial git)

## Passos

### 1. Definir o alvo
1. Branch: argumento ou `git branch --show-current`. Detached HEAD → pare e peça uma branch.
2. Upstream: `git rev-parse --abbrev-ref --symbolic-full-name @{u}` (falha = primeiro envio).
3. Branches protegidas pelo SIA: a branch de produção (`integrations.vercel.productionBranch`, padrão `main`) e a branch padrão do remoto (`git symbolic-ref --short refs/remotes/origin/HEAD`).
4. Push direto numa branch protegida pelo SIA: avise que ele pula a revisão por PR e que o remoto pode recusá-lo se houver proteção de branch. Recomende o fluxo branch de feature → `*create-pr`. Só continue com confirmação explícita.

### 2. Rodar o portão de qualidade
1. Execute `pre-push.md` em modo YOLO.
2. FAIL → pare. Mostre as ações do relatório e encaminhe (`@dev`, `@pm` ou `@validator`). Não ofereça push.
3. CONCERNS → liste cada ressalva e peça confirmação explícita ("sim, enviar com ressalvas"). Sem ela, pare.
4. PASS → siga.
5. Se surgir commit novo depois do portão, rode o portão de novo.

### 3. Resumo e confirmação
Mostre exatamente o que será feito:

```text
━━━ Push para origin ━━━
Branch:    feat/2.1-login-social (upstream: novo)
Commits:   3
  a1b2c3d feat(auth): login social [Story 2.1]
  d4e5f6a test(auth): cobre callback do provedor
  0a1b2c3 docs(story): resultado do QA da story 2.1
Portão:    PASS
Comando:   git push -u origin feat/2.1-login-social
```

**Ponto de elicitação:**
1. Enviar
2. Ver o diff resumido antes (`git diff --stat origin/{base}...HEAD`)
3. Cancelar

A confirmação é obrigatória também no modo YOLO (regra de confirmação do agente).

### 4. Executar
- Branch com upstream: `git push origin {branch}`.
- Primeiro envio: `git push -u origin {branch}`.
- Não acrescente flags que não apareceram no resumo confirmado.

### 5. Se o hook bloquear
A mensagem do `enforce-git-push-authority` diz que a operação é exclusiva do `@devops`. Nesse caso:
1. Não contorne o bloqueio: não defina variáveis de ambiente, não mude o comando, não use outro terminal em nome do usuário.
2. Peça ao usuário para ativar o `@devops` com `/sia-devops` (ou `sia agent use devops`, que grava `.sia/active-agent.json`) e repita `*push`.

### 6. Se o remoto recusar

| Recusa | Ação |
|--------|------|
| Remoto à frente (non-fast-forward) | `git pull --rebase origin {branch}`; resolva conflitos com o usuário; rode o portão de novo; repita o push |
| Branch protegida no GitHub | envie para uma branch de feature e abra `*create-pr {storyId}` |
| Autenticação | `gh auth status`; se preciso, `gh auth login` (escopos `repo` e `workflow` para alterar `.github/workflows/`) |
| Hook do servidor ou limite de tamanho | mostre a mensagem; não repita sem resolver a causa |

### 7. Force push (exceção)
Só quando o usuário pedir explicitamente:
1. Recuse sem exceção se a branch for a de produção ou a padrão do remoto.
2. Mostre o que será sobrescrito: `git log --oneline HEAD..origin/{branch}` (commits do remoto que serão perdidos).
3. Peça confirmação digitada: "confirmo force push em {branch}".
4. Use `git push --force-with-lease origin {branch}`, que falha se o remoto mudou desde o último fetch.

### 8. Depois do push
1. Confirme a sincronia: `git status -sb` sem commits à frente.
2. Mostre o link da branch ou de comparação no GitHub.
3. Branch de feature com story → sugira `*create-pr {storyId}`. Push na branch de produção com deploy automático (Git da Vercel ou CD) → sugira acompanhar o deploy com `*vercel-deploy`.

## Saída
Commits no remoto, upstream configurado no primeiro envio e resumo final com branch, commits enviados e próximo passo.

## Critérios de conclusão
- [ ] Portão com PASS, ou CONCERNS confirmado pelo usuário
- [ ] Confirmação explícita do push registrada na conversa
- [ ] `git status -sb` sem commits pendentes de envio
- [ ] Nenhum force push na branch de produção ou na padrão
- [ ] Nenhuma tentativa de contornar o hook de autoridade

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Portão FAIL | pare; encaminhe conforme o relatório |
| Hook bloqueou | oriente `/sia-devops` e repita; nunca contorne |
| Conflito no rebase | resolva com o usuário arquivo a arquivo; depois, novo portão |
| Push parcial (várias refs) | `git status -sb` e `git ls-remote origin {branch}` para conferir o que chegou |
| Usuário pede push sem o portão | recuse: o portão é obrigatório (Artigo V) |

## Handoff
- Branch de feature: `@devops *create-pr {storyId}`.
- Branch de produção com Vercel: `@devops *vercel-deploy production` (ou acompanhe o deploy automático).
- Portão reprovado: `@dev *apply-qa-fixes {storyId}` ou `@pm *qa-gate {storyId}`, conforme o relatório.

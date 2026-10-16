---
id: create-pr
title: Criar pull request a partir da story
agent: devops
elicit: true
modes: [yolo, interactive]
inputs:
  - 'storyId (opcional): story da branch; se ausente, é deduzido do nome da branch'
  - 'base (opcional): branch de destino; padrão: branch padrão do remoto'
  - 'issue (opcional): número da issue resolvida (vira "Closes #N")'
  - '--draft (opcional): cria como rascunho; padrão: github.pr.draftByDefault'
outputs:
  - 'Pull request no GitHub com título convencional e corpo de templates/github-pr-tmpl.md (URL e número)'
depends_on:
  tasks: [pre-push.md]
  templates: [github-pr-tmpl.md, agent-handoff-tmpl.yaml]
next: [close-story, vercel-deploy, release]
source: [github-devops-github-pr-automation.md, pr-automation.md]
---

# Criar pull request a partir da story

## Objetivo
Abrir o pull request da branch com título no formato Conventional Commits (com o storyId) e corpo que liga story, QA gate e relatório de inspeção. Criar e fazer merge de PR é exclusivo do `@devops` (Constitution, Artigo II).

## Quando usar
- Depois do `*push` de uma branch de feature com story `Done`.
- Para contribuir com um repositório de terceiros a partir de um fork (passo 8).
- Não use para abrir PR de branch com portão reprovado.

## Pré-condições
- [ ] `gh auth status` autenticado
- [ ] Branch atual diferente da base e já enviada (`git ls-remote --heads origin {branch}` retorna a ref)
- [ ] Nenhum commit local sem envio (`git status -sb`); se houver, rode `*push` antes
- [ ] Story `Done` com gate aprovado, conforme o passo 5 de `pre-push.md` (reaproveite o veredito se o portão rodou nesta sessão para o mesmo HEAD)

## Modos

| Modo | Interação | Uso |
|------|-----------|-----|
| YOLO | só a confirmação final | branch e story claras |
| Interativo (padrão) | revisa título, corpo, revisores e labels | primeira vez, PR com breaking change ou fork |

## Passos

### 1. Contexto
1. Branch: `git branch --show-current`.
2. Base: argumento ou `git symbolic-ref --short refs/remotes/origin/HEAD` sem `origin/`; padrão `main`.
3. Já existe PR para a branch? `gh pr list --head {branch} --state open --json number,url`. Se existir, mostre a URL e ofereça atualizar título e corpo com `gh pr edit` em vez de criar outro.

### 2. Story
1. storyId: argumento → padrão `\d+\.\d+` no nome da branch → pergunta.
2. Leia `{paths.stories}/{storyId}-*.story.md`: título (`# Story {storyId}: {título}`), `## Status`, `## Critérios de Aceite`, `### File List` e, em `## Resultado do QA`, as últimas linhas `Gate`, `Data`, `Arquivo do gate` e `Inspeção`.
3. Sem story (PR operacional, como CI ou release): siga sem as seções de story e diga isso no resumo.

### 3. Título
Formato definido por `github.pr.titleFormat`:

| Formato | Resultado | Exemplo |
|---------|-----------|---------|
| `conventional` (padrão do SIA) | `{tipo}({escopo}): {descrição} [Story {id}]` | `feat(auth): login social [Story 2.1]` |
| `story-first` | `[Story {id}] {Título}` | `[Story 2.1] Login social` |
| `branch-based` | nome da branch como título | `Login Social [Story 2.1]` |

Regras do formato `conventional`:
- **Tipo:** prefixo da branch em `github.conventionalCommits.branchTypeMap` (ex.: `fix/` → `fix`); sem correspondência → `defaultType`.
- **Escopo:** segundo segmento da branch quando há três (`feat/auth/login` → `auth`); senão, sem escopo.
- **Descrição:** título da story sem o prefixo "Story X.Y", com a primeira letra minúscula. Sem story: nome da branch sem o prefixo, com hífens viram espaços.
- **Story:** acrescente ` [Story {id}]` quando `github.pr.includeStoryId` é `true`.
- **Breaking change:** acrescente `!` depois do tipo ou escopo (`feat(auth)!: ...`) e pergunte ao usuário antes.
- Com "Squash and merge", o título vira a mensagem do commit na base: ele precisa estar correto antes do merge.

### 4. Corpo
1. Use `templates/github-pr-tmpl.md` e preencha os placeholders.
2. Links absolutos: `https://github.com/{owner}/{repo}/blob/{branch}/{caminho}` para story, arquivo do gate e relatório de inspeção (`gh repo view --json owner,name`).
3. Mudanças: itens da File List e `git log --oneline origin/{base}..HEAD`.
4. Issues: `Closes #{n}` para cada issue resolvida (argumento, story ou commits com `#n`); isso fecha a issue no merge.
5. Portão: resultados do último `*pre-push` (PASS, FAIL ou AUSENTE por script).
6. Preview: se a Vercel estiver conectada ao Git, a URL do deploy de preview aparece no PR; senão, use a do `*vercel-deploy preview`, se houver.
7. Remova as seções que não se aplicam e grave o corpo em `.sia/pr-body.md`.

### 5. Revisão e confirmação
Mostre:

```text
━━━ Pull request ━━━
Título:  feat(auth): login social [Story 2.1]
Base:    main  ←  feat/2.1-login-social
Tipo:    pronto para revisão (draft: não)
Corpo:   .sia/pr-body.md (story, gate PASS, inspeção, Closes #42)
```

**Ponto de elicitação:**
1. Criar o PR
2. Editar o título
3. Editar o corpo
4. Criar como rascunho
5. Cancelar

### 6. Criar
```bash
gh pr create --title "{título}" --body-file .sia/pr-body.md --base {base} --head {branch} [--draft]
```
Guarde a URL e o número devolvidos. Se o hook `enforce-git-push-authority` bloquear, peça ao usuário para ativar `/sia-devops` e repita; não contorne.

### 7. Revisores e labels (opcional)
Pergunte se o usuário quer revisores ou labels e aplique:
```bash
gh pr edit {número} --add-reviewer {usuário-ou-time} --add-label {label}
```

### 8. Contribuição via fork
Quando o usuário não tem permissão de escrita no repositório de destino:
1. Confirme o fork: `gh repo view {usuário}/{repo}`. Se não existir, ofereça `gh repo fork {owner}/{repo} --remote` (confirme antes).
2. Garanta a base atualizada: `git fetch upstream` e compare `upstream/{base}` com a branch; se estiver atrás, ofereça sincronizar.
3. Siga as regras de contribuição do projeto de destino (`CONTRIBUTING.md`), inclusive o formato de commits e de branch.
4. Envie a branch para o fork com `*push` e crie o PR no destino:
   ```bash
   gh pr create --repo {owner}/{repo} --base {base} --head {usuário}:{branch} --title "{título}" --body-file .sia/pr-body.md
   ```

### 9. Merge (só a pedido do usuário)
1. Confira os checks e as aprovações: `gh pr checks {número}` e `gh pr view {número} --json reviewDecision,mergeable`.
2. Checks falhando ou revisão pendente → não faça merge; informe.
3. Mostre estratégia e título final e peça confirmação. Padrão: squash, que usa o título do PR como mensagem do commit.
4. Execute `gh pr merge {número} --squash --delete-branch`. Nunca use `--admin` para furar a proteção de branch.

### 10. Encerrar
Mostre a URL do PR e os próximos passos: revisão, CI e, depois do merge, fechamento da story. Grave um handoff em `.sia/handoffs/` com `templates/agent-handoff-tmpl.yaml` (para `@pm`, `last_command: create-pr`).

## Saída
Pull request no GitHub (URL e número), corpo em `.sia/pr-body.md` e, quando pedido, merge concluído. Handoff gravado em `.sia/handoffs/`.

## Critérios de conclusão
- [ ] Título no formato configurado, com storyId quando há story
- [ ] Corpo com links para story, gate e relatório de inspeção (ou seção removida quando não há story)
- [ ] `Closes #N` para cada issue resolvida
- [ ] Confirmação do usuário antes de criar
- [ ] URL do PR apresentada

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Branch não enviada | rode `*push` e volte |
| PR já existe | ofereça `gh pr edit {número}` com título e corpo novos |
| `gh` sem permissão no repositório | use o fluxo de fork (passo 8) |
| Hook bloqueou | oriente `/sia-devops` e repita |
| Story sem gate aprovado | não crie o PR; encaminhe ao `@pm *qa-gate {storyId}` |
| Checks falhando na hora do merge | não faça merge; encaminhe a falha ao `@dev` |

## Handoff
- PR aberto: aguardar revisão e CI. Mudanças pedidas na revisão → `@dev *apply-qa-fixes {storyId}`.
- PR com merge: `@pm *close-story {storyId}`.
- Merge na branch de produção: `@devops *vercel-deploy production` (se o deploy não for automático) ou `@devops *release`.

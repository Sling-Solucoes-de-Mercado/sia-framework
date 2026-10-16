---
id: release
title: Versionar e publicar uma release
agent: devops
elicit: true
modes: [yolo, interactive, preflight]
inputs:
  - 'tipo (opcional): major | minor | patch; se ausente, é recomendado pela análise dos commits'
  - '--prerelease (opcional): marca a release como pré-release no GitHub'
outputs:
  - 'Versão nova nos manifestos, CHANGELOG.md atualizado, tag anotada v{versão} no remoto e release no GitHub'
depends_on:
  tasks: [pre-push.md, push.md, create-pr.md, execute-checklist.md]
  templates: [changelog-tmpl.md]
  checklists: [release-checklist.md]
next: [vercel-deploy]
source: [github-devops-version-management.md, release-management.md]
---

# Versionar e publicar uma release

## Objetivo
Decidir a próxima versão pelo Versionamento Semântico, registrar as mudanças no changelog, criar a tag e publicar a release no GitHub, com plano de rollback. Release, tag e versionamento são exclusivos do `@devops` (Constitution, Artigo II).

## Quando usar
- Ao fechar um conjunto de stories que vai para usuários.
- Em hotfix depois de um incidente (PATCH).
- Não use para entregar uma story isolada sem marco de versão: isso é `*push` + `*create-pr`.

## Pré-condições
- [ ] Na branch de produção (ou numa branch `release/v{versão}` a partir dela), atualizada: `git fetch origin --tags` e nenhum commit faltando
- [ ] Árvore limpa (`git status --porcelain` vazio)
- [ ] `gh auth status` autenticado
- [ ] Projeto com manifesto de versão (`package.json` ou equivalente)

## Modos

| Modo | Interação | Uso |
|------|-----------|-----|
| YOLO | aceita o bump recomendado; confirma só tag e publicação | PATCH e MINOR rotineiros |
| Interativo (padrão) | confirma versão, changelog e cada etapa externa | releases comuns |
| Pre-Flight | análise completa e plano aprovado antes de qualquer mudança | MAJOR, várias stories, migração de banco |

## Passos

### 1. Última versão
1. `git describe --tags --abbrev=0` dá a última tag. Sem tags, a base é `v0.0.0`, ou a versão atual do manifesto se for maior.
2. Compare com a versão do manifesto (`node -p "require('./package.json').version"`). Divergência → avise e pergunte qual vale.

### 2. Commits desde a última tag
`git log {última-tag}..HEAD --format='%h %s%n%b'` e classifique cada commit:

| Sinal no commit | Classe | Bump |
|-----------------|--------|------|
| `BREAKING CHANGE:` ou `BREAKING:` no corpo, ou `!` depois do tipo (`feat!:`) | breaking | MAJOR |
| `feat:` ou `feature:` | funcionalidade | MINOR |
| `fix:`, `bugfix:` ou `hotfix:` | correção | PATCH |
| `docs:`, `chore:`, `test:`, `ci:`, `refactor:` sem efeito para quem usa | interno | nenhum |

Exemplos de MAJOR: remover ou renomear API pública, mudar assinatura, abandonar versão de Node suportada, mudança de schema que exige migração. MINOR: endpoint novo, parâmetro opcional novo, melhoria de desempenho. PATCH: correção de bug, correção de segurança, refatoração interna.

### 3. Recomendar a versão
1. Regra: algum breaking → MAJOR; senão algum feat → MINOR; senão algum fix → PATCH; senão "nenhum bump necessário" e a task termina.
2. Projeto em `0.y.z`: avise que, pelo SemVer, mudanças incompatíveis antes da 1.0.0 podem subir só o MINOR, e pergunte.
3. Se o usuário passou um tipo menor que o recomendado (ex.: `patch` com breaking change), mostre o conflito e peça decisão.
4. Liste as stories incluídas (referências `[Story X.Y]` nos commits) e as issues (`#n`).

**Ponto de elicitação:**

```text
━━━ Análise de versão ━━━
Versão atual:  v1.3.2
Recomendada:   v1.4.0 (MINOR)
Desde v1.3.2:  0 breaking | 3 funcionalidades | 2 correções
Stories:       2.1, 2.2, 2.4 | Issues: #42, #57
```
1. Aceitar v1.4.0
2. Escolher outro tipo (major, minor, patch)
3. Marcar como pré-release (ex.: v1.4.0-rc.1)
4. Cancelar

### 4. Checklist e portões
1. Toda story incluída precisa estar `Done` com gate `PASS`, `CONCERNS` ou `WAIVED` (passo 5 de `pre-push.md` para cada uma).
2. Execute `execute-checklist.md` com `release-checklist.md`, seções 1 a 7. Item (BLOCK) pendente → pare.

### 5. Atualizar versão e changelog
1. Versão: `npm version {versão} --no-git-tag-version` atualiza `package.json` e o lockfile sem commit nem tag. Atualize também outros manifestos que declaram versão.
2. Changelog: sem `CHANGELOG.md`, crie a partir de `templates/changelog-tmpl.md`. Com o arquivo, mova as entradas de `Não publicado` para `## [{versão}] - {AAAA-MM-DD}` e complete com os commits classificados no passo 2, escritos para quem usa. Atualize os links de comparação no fim do arquivo.
3. Mostre o diff (`git diff`) e peça aprovação do changelog.

### 6. Commit e tag
1. Commit: `git add {manifestos} CHANGELOG.md` e `git commit -m "chore(release): v{versão}"`.
2. Branch de produção sem proteção:
   - Rode `*push` (que executa o portão) para enviar o commit.
   - Tag anotada: `git tag -a v{versão} -m "Release v{versão}"`.
3. Branch de produção protegida (exige PR):
   - Faça o commit numa branch `release/v{versão}`, rode `*push` e `*create-pr`, e aguarde o merge.
   - Depois do merge: `git fetch origin` e crie a tag no commit da base, com as opções antes do nome: `git tag -a -m "Release v{versão}" v{versão} origin/{branch-de-produção}`.
4. Envie a tag com confirmação: `git push origin v{versão}`.

### 7. Release no GitHub
1. Extraia a seção da versão do `CHANGELOG.md` para `.sia/release-notes.md`.
2. Confirme e execute:
   ```bash
   gh release create v{versão} --title "v{versão}" --notes-file .sia/release-notes.md --verify-tag [--prerelease]
   ```
   `--verify-tag` aborta se a tag não estiver no remoto (sem ela, o `gh` criaria uma tag nova a partir da branch padrão).
3. Pacote publicado em registro (npm): só a pedido do usuário, `npm publish`, depois de conferir `npm whoami` e o `name` no manifesto.

### 8. Verificar
1. `gh release view v{versão}` e `git ls-remote --tags origin v{versão}`.
2. Pacote: `npm view {pacote} version` mostra a versão nova.
3. Deploy: se o CD publica em tag ou na branch de produção, acompanhe; senão, sugira `*vercel-deploy production`.
4. Feche a seção 8 do `release-checklist.md`.

### 9. Plano de rollback
Registre no resumo final:

| Alvo | Rollback |
|------|----------|
| Release e tag erradas, antes de alguém usar | `gh release delete v{versão} --cleanup-tag` (apaga release e tag; confirme antes) |
| Deploy de produção | `*vercel-deploy` (passo de rollback): `vercel rollback` ou `vercel promote` do deploy anterior |
| Pacote npm | `npm deprecate {pacote}@{versão} "{motivo}"` e `npm dist-tag add {pacote}@{anterior} latest`; nunca `npm unpublish` |
| Banco | script de rollback da migração (`@dev [Dados] *db-rollback`) |

Depois do rollback, a correção segue o fluxo normal (story, portão, nova release PATCH).

## Saída
- Manifestos com a nova versão e `CHANGELOG.md` atualizado, em commit `chore(release): v{versão}`.
- Tag anotada `v{versão}` no remoto e release no GitHub com as notas.
- Resumo final com versão, stories, issues, links e plano de rollback.

## Critérios de conclusão
- [ ] Versão decidida por SemVer e confirmada pelo usuário
- [ ] `release-checklist.md` sem item (BLOCK) pendente
- [ ] Changelog com a seção da versão e breaking changes marcadas
- [ ] Tag no remoto e release no GitHub verificadas
- [ ] Plano de rollback apresentado

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Nenhum commit relevante desde a última tag | informe que não há bump necessário e encerre |
| Tag já existe | não sobrescreva; revise a versão ou confirme se a release anterior falhou no meio |
| Push da tag bloqueado pelo hook | oriente `/sia-devops` e repita |
| `gh release create` falhou depois da tag | corrija a causa e repita só o passo 7 |
| `npm publish` falhou | não crie outra versão às pressas; corrija credencial ou escopo e repita |
| Story incluída sem gate aprovado | pare; encaminhe ao `@pm *qa-gate {storyId}` ou retire a story da release |

## Handoff
- Release publicada sem deploy automático: `@devops *vercel-deploy production`.
- Stories incluídas ainda abertas: `@pm *close-story {storyId}`.

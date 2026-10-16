---
id: configure-ci
title: Configurar CI/CD no GitHub Actions
agent: devops
elicit: true
modes: [yolo, interactive]
inputs:
  - 'workflows (opcional): ci | cd | ambos; padrão: perguntado (o CD é o deploy na Vercel)'
outputs:
  - '.github/workflows/ci.yml a partir de templates/github-actions-ci.yml'
  - '.github/workflows/cd.yml a partir de templates/github-actions-cd.yml, quando escolhido'
  - 'Segredos exigidos cadastrados e primeira execução verificada'
depends_on:
  tasks: [push.md]
  templates: [github-actions-ci.yml, github-actions-cd.yml]
  data: [vercel-patterns.md]
next: [setup-github, push]
source: [ci-cd-configuration.md]
---

# Configurar CI/CD no GitHub Actions

## Objetivo
Instalar no repositório o pipeline de CI (lint, typecheck, testes, build e auditoria) e, quando o deploy na Vercel for feito pelo GitHub Actions, o pipeline de CD (preview em PR, produção na branch de produção). Configuração de CI/CD é exclusiva do `@devops` (Constitution, Artigo II).

## Quando usar
- Repositório sem CI, ou com CI que não roda os scripts de `quality.scripts`.
- Ao escolher o GitHub Actions como estratégia de deploy na Vercel (`*vercel-setup`).
- Os templates do SIA cobrem só o GitHub Actions. Outro provedor (GitLab CI, CircleCI, Jenkins) exige adaptação manual a partir dos mesmos passos.

## Pré-condições
- [ ] Repositório git com remoto no GitHub
- [ ] `gh auth status` autenticado com o escopo `workflow` (sem ele, o envio de arquivos em `.github/workflows/` é recusado: `gh auth refresh -s workflow`)
- [ ] Manifesto do projeto na raiz (`package.json` ou equivalente)

## Modos

| Modo | Interação | Uso |
|------|-----------|-----|
| YOLO | instala o CI com os valores detectados; CD só quando `integrations.vercel` usa Actions | projeto Node padrão |
| Interativo (padrão) | confirma workflows, versões, segredos e substituição de arquivos | primeira configuração |

## Passos

### 1. Detectar o projeto

| Item | Como detectar | Valor no template |
|------|---------------|-------------------|
| Gerenciador de pacotes | `package-lock.json`, `pnpm-lock.yaml` ou `yarn.lock` | `{{package_manager}}` e `{{install_command}}` (`npm ci`, `pnpm install --frozen-lockfile`, `yarn install --frozen-lockfile`) |
| Versão do Node.js | `.nvmrc` ou `engines.node` do `package.json`; senão, a LTS ativa | `{{node_version}}` |
| Scripts de qualidade | `quality.scripts` do core-config cruzado com `scripts` do `package.json` | `{{lint_command}}`, `{{typecheck_command}}`, `{{test_command}}`, `{{build_command}}` |
| Branch de produção | `integrations.vercel.productionBranch` ou a branch padrão do repositório | `{{production_branch}}` |

Script ausente: o passo correspondente sai do workflow. Registre no relatório.

### 2. Workflows existentes
Liste `.github/workflows/`. Para cada arquivo com o mesmo nome:
1. Substituir, guardando cópia em `.github/workflows/{nome}.yml.bak` fora do commit
2. Manter o atual e só comparar com o template
3. Cancelar

### 3. Escolher os workflows
**Ponto de elicitação:**
1. Só CI (recomendado como mínimo)
2. CI e CD na Vercel
3. Só CD na Vercel

CD na Vercel exige o projeto ligado (`*vercel-setup`) e a decisão de deploy pelo GitHub Actions. Se a integração Git da Vercel continuar fazendo deploy, os dois publicam o mesmo commit: inclua `{"git": {"deploymentEnabled": false}}` no `vercel.json` (`data/vercel-patterns.md`, seção 2).

### 4. Gerar o CI
1. Copie `templates/github-actions-ci.yml` para `.github/workflows/ci.yml`.
2. Substitua todos os placeholders e remova os passos de scripts ausentes.
3. Confira que não sobrou `{{` no arquivo e valide a sintaxe (`yamllint`, se disponível, ou um parser YAML).
4. Mantenha os nomes dos jobs (`lint`, `test`, `build`): são os checks exigidos na proteção de branch.

### 5. Gerar o CD (quando escolhido)
1. Copie `templates/github-actions-cd.yml` para `.github/workflows/cd.yml` e substitua `{{production_branch}}` e `{{node_version}}`.
2. Se o build do projeto depende das variáveis de sistema da Vercel, troque `vercel build` e `vercel deploy --prebuilt` por `vercel deploy` (build na Vercel), como indicado no comentário do template.
3. Recomende criar o ambiente `production` no GitHub com revisor obrigatório (Settings → Environments), para aprovar cada deploy de produção.

### 6. Segredos
Liste os segredos que os workflows usam e cadastre os que faltam (`gh secret list` mostra os existentes):

| Segredo | Workflow | Como obter |
|---------|----------|------------|
| `VERCEL_TOKEN` | CD | vercel.com/account/tokens, escopo de projeto |
| `VERCEL_ORG_ID` | CD | `orgId` de `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | CD | `projectId` de `.vercel/project.json` |
| `CODECOV_TOKEN` | CI (opcional) | painel do Codecov |

Segredo de verdade: o usuário roda `gh secret set {NOME}` no próprio terminal. IDs não sensíveis: o agente pode usar `gh secret set {NOME} --body "{valor}"`. Nunca grave valores no workflow.

### 7. Proteção de branch
Se a branch de produção ainda não exige os checks, execute o passo 5 de `setup-github.md` com os contextos `lint`, `test` e `build`.

### 8. Enviar e verificar
1. Mostre o diff dos workflows e peça confirmação.
2. Commit operacional: `git add .github/workflows/ vercel.json` (este só quando alterado) e `git commit -m "ci: pipeline do GitHub Actions"`.
3. Envie com `*push`.
4. Acompanhe a primeira execução: `gh run list --workflow ci.yml --limit 1` e `gh run watch {id}`. Falhou → `gh run view {id} --log-failed` e corrija o workflow ou encaminhe ao `@dev` (falha de código).
5. Para validar os gatilhos de PR e a proteção de branch, abra um PR de teste de uma branch de feature com `*create-pr` e feche-o depois.

### 9. Relatório
Mostre: workflows criados, passos removidos por script ausente, segredos cadastrados (só nomes), situação da proteção de branch e a URL `https://github.com/{owner}/{repo}/actions`. Opcional: selo no README, `[![CI](https://github.com/{owner}/{repo}/actions/workflows/ci.yml/badge.svg)](https://github.com/{owner}/{repo}/actions/workflows/ci.yml)`.

## Saída
`.github/workflows/ci.yml`, opcionalmente `.github/workflows/cd.yml` e `vercel.json` com `git.deploymentEnabled: false`, segredos cadastrados e relatório da primeira execução.

## Critérios de conclusão
- [ ] Workflows sem placeholders e com YAML válido
- [ ] Passos de scripts ausentes removidos e registrados
- [ ] Segredos exigidos cadastrados, sem valores no repositório
- [ ] Primeira execução do CI verde, ou falha encaminhada
- [ ] Sem deploy em dobro: integração Git da Vercel desligada quando o CD roda no Actions

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Push de workflow recusado | falta o escopo `workflow`: `gh auth refresh -s workflow` |
| `npm ci` falha no CI | lockfile ausente ou desatualizado: o `@dev` gera e versiona o lockfile |
| Teste em modo watch trava o job | o template define `CI: true`; confira o script de teste |
| CD falha em `vercel pull` | segredos da Vercel ausentes ou token sem acesso ao projeto |
| PR de fork sem deploy de preview | esperado: PR de fork não recebe segredos |
| Check obrigatório não aparece no PR | o nome do job difere do contexto da proteção; alinhe os dois |

## Handoff
`@devops *setup-github` para a proteção de branch, ou `@devops *push` se só faltar enviar a configuração.

---
id: setup-github
title: Configurar o repositório no GitHub
agent: devops
elicit: true
modes: [yolo, interactive, preflight]
inputs:
  - '--force (opcional): reconfigura mesmo com relatório anterior em .sia/devops-setup-report.yaml'
outputs:
  - '.github/pull_request_template.md a partir de templates/github-pr-tmpl.md'
  - 'Proteção da branch de produção no GitHub, quando o plano permite'
  - 'Segredos do repositório cadastrados (só os nomes aparecem no relatório)'
  - '.sia/devops-setup-report.yaml com o que foi configurado'
depends_on:
  tasks: [configure-ci.md]
  templates: [github-pr-tmpl.md]
next: [configure-ci, push]
source: [setup-github.md]
---

# Configurar o repositório no GitHub

## Objetivo
Deixar o repositório pronto para o fluxo de entrega do SIA: workflows de CI, template de pull request, proteção da branch de produção e segredos. Configuração de CI/CD e de proteção de branch é exclusiva do `@devops` (Constitution, Artigo II).

## Quando usar
- Depois do `*environment-bootstrap`, com o repositório já no GitHub.
- Repositório existente que ainda não tem proteção de branch, template de PR ou segredos de CI.
- Não use para criar o repositório: isso é o passo 5 do `*environment-bootstrap`.

## Pré-condições
- [ ] Repositório git (`git rev-parse --is-inside-work-tree`)
- [ ] Remoto `origin` no GitHub (`git remote get-url origin`)
- [ ] `gh auth status` autenticado, com permissão de administrador no repositório
- [ ] Repositório existe no GitHub (`gh repo view`)

## Modos

| Modo | Interação | Uso |
|------|-----------|-----|
| YOLO | aplica os padrões (CI, template de PR, proteção com 1 revisor) e só confirma o que é visível fora da máquina | setup rápido |
| Interativo (padrão) | explica e decide cada componente | primeira vez, onboarding do time |
| Pre-Flight | levanta tudo e apresenta o plano antes de aplicar | organizações com regras próprias |

## Passos

### 1. Pré-checagem
1. Rode as verificações das pré-condições e mostre o resultado de cada uma.
2. `gh repo view --json nameWithOwner,defaultBranchRef,visibility` dá dono, nome, branch padrão e visibilidade.
3. Já existe `.sia/devops-setup-report.yaml`? Avise que o setup já foi feito e pergunte se reconfigura (equivale a `--force`).

### 2. Tipo de projeto
Detecte pelos arquivos da raiz:

| Arquivo | Tipo | Detalhes a registrar |
|---------|------|----------------------|
| `package.json` | node | TypeScript, framework de testes (jest, vitest), ESLint |
| `requirements.txt` ou `pyproject.toml` | python | |
| `go.mod` | go | |
| `Cargo.toml` | rust | |
| mais de um | mixed | |

**Ponto de elicitação** (só quando a detecção é incerta): confirme o tipo ou escolha 1. Node.js/TypeScript, 2. Python, 3. Go, 4. Rust, 5. Misto.

### 3. Workflows
Execute `configure-ci.md`: ele instala o CI e, quando o deploy na Vercel for por GitHub Actions, o CD. Os nomes dos jobs do CI (`lint`, `test`, `build`) são os checks exigidos no passo 5.

### 4. Template de pull request
1. Copie `templates/github-pr-tmpl.md` para `.github/pull_request_template.md`.
2. Se o arquivo já existe: 1. substituir, 2. manter o atual, 3. mostrar a diferença antes.

### 5. Proteção da branch de produção
Branch: `integrations.vercel.productionBranch` (padrão `main`), que deve ser a branch padrão do repositório.

**Ponto de elicitação:**
- Ativar a proteção? (S/n)
- Revisões aprovadas exigidas (0 a 6; padrão 1)
- Checks obrigatórios (padrão: `lint`, `test`, `build`)
- Exigir conversas resolvidas antes do merge? (S/n)
- Exigir histórico linear? (s/N)

Aplique pela API do GitHub (confirme antes):

```bash
gh api --method PUT -H "Accept: application/vnd.github+json" \
  repos/{owner}/{repo}/branches/{branch}/protection --input - <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["lint", "test", "build"] },
  "enforce_admins": false,
  "required_pull_request_reviews": { "required_approving_review_count": 1, "dismiss_stale_reviews": true },
  "restrictions": null,
  "required_conversation_resolution": true,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

- Confira: `gh api repos/{owner}/{repo}/branches/{branch}/protection`.
- Disponibilidade: branches protegidas existem em repositórios públicos no GitHub Free e em públicos e privados no Pro, Team e Enterprise. Repositório privado no plano gratuito → a API recusa; registre no relatório e oriente a configuração manual (Settings → Branches) depois da mudança de plano.
- `enforce_admins: false` deixa administradores agirem numa emergência; mude para `true` se o time preferir.

### 6. Segredos do repositório
**Ponto de elicitação:** lista numerada dos segredos comuns; o usuário escolhe pelos números ou responde "pular".

| # | Segredo | Uso |
|---|---------|-----|
| 1 | `VERCEL_TOKEN` | CD na Vercel (token com escopo de projeto) |
| 2 | `VERCEL_ORG_ID` | CD na Vercel (`orgId` de `.vercel/project.json`) |
| 3 | `VERCEL_PROJECT_ID` | CD na Vercel (`projectId` de `.vercel/project.json`) |
| 4 | `SUPABASE_ACCESS_TOKEN` | CLI ou MCP do Supabase na CI |
| 5 | `CODECOV_TOKEN` | cobertura de testes (opcional) |
| 6 | `NPM_TOKEN` | publicação de pacote (projeto que é biblioteca) |

- Valor secreto: o usuário roda `gh secret set {NOME}` no próprio terminal (o `gh` pede o valor sem exibi-lo). Nunca peça nem receba o valor na conversa.
- Valor não sensível já conhecido (IDs da Vercel): o agente pode rodar `gh secret set {NOME} --body "{valor}"`.
- Confira com `gh secret list` (mostra só nomes e datas).

### 7. Relatório
Grave `.sia/devops-setup-report.yaml`:

```yaml
setup: { completed: true, date: '2026-10-16T15:40:00-03:00', project_type: node }
repository: { url: 'https://github.com/org/app', default_branch: main, visibility: private }
workflows_installed: [ci.yml]
pr_template: .github/pull_request_template.md
branch_protection:
  enabled: true
  branch: main
  required_checks: [lint, test, build]
  required_reviewers: 1
secrets_configured: [VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID]
next_steps:
  - Commit e push da pasta .github/
  - Primeiro PR para testar o CI
```

### 8. Resumo e próximos passos
1. Mostre o que foi configurado e o que ficou pendente (ex.: proteção recusada pelo plano).
2. Faça o commit operacional: `git add .github/` e `git commit -m "chore(ci): configuração do GitHub"`; envie com `*push`.
3. Teste o CI com o primeiro PR de uma branch de feature (`*create-pr`).

## Saída
`.github/pull_request_template.md`, workflows do `configure-ci.md`, proteção da branch de produção, segredos cadastrados e `.sia/devops-setup-report.yaml`.

## Critérios de conclusão
- [ ] Pré-condições verificadas
- [ ] Tipo de projeto definido
- [ ] CI instalado pelo `configure-ci.md`
- [ ] Template de PR no repositório
- [ ] Proteção aplicada e conferida, ou recusa do plano registrada
- [ ] Segredos escolhidos cadastrados, sem valor na conversa
- [ ] Relatório gravado e próximos passos apresentados

## Tratamento de erros

| Situação | Ação |
|----------|------|
| API de proteção responde 403 | confira se é administrador e o plano do repositório; `gh auth refresh -s repo`; senão, configuração manual em Settings → Branches |
| API responde 404 na proteção | a branch não existe no remoto: envie-a antes com `*push` |
| Workflow já existe | o `configure-ci.md` pergunta se substitui (com backup) ou mantém |
| `gh secret set` sem permissão | o token precisa de acesso de administrador ao repositório; peça a quem administra |
| Checks obrigatórios nunca aparecem | os nomes em `contexts` precisam ser iguais aos `name` dos jobs; rode o CI uma vez antes |

## Handoff
`@devops *configure-ci` (se pulou o passo 3) e, depois, `@devops *push` para enviar a configuração.

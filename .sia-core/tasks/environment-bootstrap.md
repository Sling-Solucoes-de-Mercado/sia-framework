---
id: environment-bootstrap
title: Preparar o ambiente de um projeto novo
agent: devops
elicit: true
modes: [yolo, interactive, preflight]
inputs:
  - 'nome do projeto (obrigatório): minúsculas e hífens'
  - 'dono no GitHub (opcional): organização ou usuário; padrão: conta autenticada no gh'
  - 'ferramentas opcionais (opcional): escolhidas na elicitação do passo 3'
outputs:
  - 'Repositório git com .gitignore, README e commit inicial; repositório no GitHub quando escolhido'
  - 'Estrutura de pastas do SIA (docs/, .sia/) e .env.example a partir de templates/env.example'
  - '.sia/environment-report.yaml com ferramentas, versões, autenticações e estado do repositório'
depends_on:
  templates: [env.example]
next: [setup-github, configure-ci, health-check, create-project-brief]
source: [environment-bootstrap.md, init-project-status.md]
---

# Preparar o ambiente de um projeto novo

## Objetivo
Verificar e instalar as CLIs necessárias, autenticar os serviços, inicializar o git e o repositório no GitHub e criar a estrutura do SIA. O ambiente sai validado antes do PRD: esta é a primeira task de todo projeto novo.

## Quando usar
- Projeto greenfield, antes de `@pm *create-project-brief` e `*create-prd`.
- Máquina nova de alguém do time: passos 1 a 4 e 9.
- Projeto existente sem git ou sem a estrutura do SIA: passos 5 a 10.

## Pré-condições
- [ ] Sistema operacional Windows, macOS ou Linux
- [ ] Conexão com a internet (instalação e autenticação)
- [ ] Permissão de administrador para instalações globais; sem ela, use instalação por usuário

## Modos

| Modo | Interação | Uso |
|------|-----------|-----|
| YOLO | instala só as essenciais, pula as opcionais e registra as decisões no relatório | máquina experiente, setup rápido |
| Interativo (padrão) | explica cada ferramenta e pede decisão em cada ponto de elicitação | primeiro setup, onboarding |
| Pre-Flight | faz a auditoria completa e apresenta o plano inteiro antes de instalar qualquer coisa | ambiente corporativo, políticas rígidas |

## Passos

### 1. Detectar o sistema
Use os comandos nativos do shell em uso. Não misture sintaxe de PowerShell e bash.
- macOS e Linux: `uname -s` e `uname -m`; gerenciadores com `command -v brew` (macOS) e `command -v apt`, `dnf` ou `pacman` (Linux).
- Windows (PowerShell): `Get-Command winget, choco, scoop -ErrorAction SilentlyContinue`.
- Verificações de versão (`git --version`) funcionam igual em todos.

### 2. Auditar as ferramentas

| Categoria | Ferramenta | Verificação | Exigência |
|-----------|------------|-------------|-----------|
| Essencial | git | `git --version` | obrigatória |
| Essencial | GitHub CLI | `gh --version` | obrigatória |
| Essencial | Node.js | `node --version` | obrigatória: 18 ou superior; prefira a LTS ativa |
| Essencial | npm | `npm --version` | vem com o Node.js |
| Integração | CLI do Supabase | `supabase --version` ou `npx supabase --version` | recomendada quando o projeto usa Supabase |
| Integração | CLI da Vercel | `vercel --version` | recomendada quando o deploy é na Vercel |
| Integração | Docker ou runtime compatível | `docker --version` e `docker info` | recomendada para o Supabase local, que roda em contêineres |
| Opcional | pnpm | `pnpm --version` | opcional |
| Opcional | bun | `bun --version` | opcional |

Apresente o resultado assim:

```text
━━━ Auditoria do ambiente ━━━
Essenciais   ✅ git 2.x   ❌ gh   ✅ node 24.x   ✅ npm 11.x
Integrações  ❌ supabase  ✅ vercel  ⚠️ docker (instalado, parado)
Opcionais    ❌ pnpm  ❌ bun
Resumo: 1 essencial faltando | 1 recomendada faltando
```

**Desatualizadas.** Compare a versão instalada com a mais recente e ofereça atualizar (1. todas, 2. escolher, 3. não):

| Ferramenta | Versão mais recente | Atualização |
|------------|---------------------|-------------|
| gh | `gh api repos/cli/cli/releases/latest --jq .tag_name` | `brew upgrade gh`, `winget upgrade GitHub.cli` ou o gerenciador da distribuição |
| CLI do Supabase | `npm view supabase version` | `brew upgrade supabase`, `scoop update supabase` ou `npm update supabase` (instalação por projeto) |
| CLI da Vercel | `npm view vercel version` | `npm i -g vercel@latest` |
| Node.js | https://nodejs.org | gerenciador de versões (nvm ou fnm) |

### 3. Instalar o que falta
**Ponto de elicitação:**
1. Tudo: essenciais e recomendadas
2. Só as essenciais (git, gh, Node.js)
3. Personalizado: escolher da lista numerada
4. Pular (não recomendado)

| Ferramenta | macOS | Windows | Linux |
|------------|-------|---------|-------|
| git | `xcode-select --install` | `winget install --id Git.Git` | `sudo apt install git` |
| gh | `brew install gh` | `winget install --id GitHub.cli` | `sudo apt install gh` ou o repositório oficial (https://cli.github.com) |
| Node.js | `brew install node` | `winget install --id OpenJS.NodeJS.LTS` | nvm, fnm ou pacote de https://nodejs.org/en/download |
| CLI do Supabase | `brew install supabase/tap/supabase` | `scoop bucket add supabase https://github.com/supabase/scoop-bucket.git` e `scoop install supabase` | `brew install supabase/tap/supabase` ou pacote .deb, .rpm ou .apk das releases |
| CLI da Vercel | `npm i -g vercel` | `npm i -g vercel` | `npm i -g vercel` |
| Docker | `brew install --cask docker` | `winget install --id Docker.DockerDesktop` | https://docs.docker.com/engine/install/ |
| pnpm | `npm install -g pnpm` | `npm install -g pnpm` | `npm install -g pnpm` |

- CLI do Supabase só no projeto, sem instalação global: `npm install supabase --save-dev` e uso com `npx supabase`.
- bun: veja o instalador oficial em https://bun.sh (script para macOS e Linux; PowerShell no Windows).
- No Windows, depois de instalar, abra outro terminal (ou recarregue o PATH) e confira com `{ferramenta} --version`.
- Instalação falhou: mostre o caminho manual (site oficial da ferramenta), registre no relatório e siga com as demais.

### 4. Autenticar os serviços
**Ponto de elicitação:** "Autenticar agora? 1. Sim 2. Depois"

| Serviço | Verificar | Autenticar |
|---------|-----------|------------|
| GitHub | `gh auth status` | `gh auth login` (navegador; escopos `repo` e `workflow`) |
| Supabase | `supabase projects list` | `supabase login` |
| Vercel | `vercel whoami` | `vercel login` |

- O login é interativo e acontece no terminal e no navegador do usuário. O agente nunca recebe senha nem token na conversa.
- Falha no GitHub: ofereça seguir só com git local e autenticar depois.

### 5. Git e repositório no GitHub
**Ponto de elicitação:**
1. Criar repositório NOVO no GitHub (recomendado para greenfield)
2. Ligar a um repositório EXISTENTE
3. Só local (git sem GitHub)
4. Pular

Repositório novo: pergunte a visibilidade (1. privado, recomendado; 2. público), o dono (organizações de `gh api user/orgs --jq '.[].login'` ou a conta pessoal) e a descrição.

1. Inicialize: `git init -b {branch}`, com `{branch}` igual a `integrations.vercel.productionBranch` (padrão `main`).
2. `.gitignore`: crie, ou acrescente o que faltar a um existente:

```gitignore
# Dependências
node_modules/
.pnpm-store/

# Build
dist/
build/
.next/
out/

# Ambiente e segredos (o .env.example é versionado)
.env
.env.local
.env.*.local
*.pem

# Vercel
.vercel/

# Runtime do SIA (handoffs, estado de ciclo, relatórios locais)
.sia/

# IDE e sistema
.idea/
*.swp
.DS_Store
Thumbs.db

# Logs e testes
logs/
*.log
npm-debug.log*
coverage/
.nyc_output/

# Temporários
tmp/
temp/
*.tmp
```

3. `README.md` mínimo, quando não existir: título, descrição, como rodar (`npm install`, `npm run dev`) e links para `docs/prd.md` e `docs/architecture.md`.
4. Commit inicial **antes** do `gh repo create --push`, que exige ao menos um commit:
   ```bash
   git add .gitignore README.md
   git commit -m "chore: estrutura inicial do projeto"
   ```
   Falhou: confira se já existe commit (`git rev-parse HEAD`). Sem commit, pare.
5. Criação no GitHub (visível fora da máquina: confirme antes):
   ```bash
   gh repo create {dono}/{nome} --private --description "{descrição}" --source . --remote origin --push
   ```
   Falhou: crie sem `--push` e envie depois com `git push -u origin {branch}`; persistindo, oriente a criação manual.
6. Repositório existente: `git remote add origin {url}` e `git fetch origin`. Se o remoto já tem histórico, não sobrescreva: integre (`git pull origin {branch} --allow-unrelated-histories`) e resolva conflitos com o usuário antes do primeiro envio.

### 6. Estrutura do projeto
Crie o que faltar, sem sobrescrever (caminhos de `paths` no core-config):

```text
docs/
├── prd/                  # PRD fragmentado e epics
├── architecture/adr/     # arquitetura e ADRs
├── stories/              # stories {epic}.{story}-{slug}.story.md
└── qa/
    ├── gates/            # arquivos de QA gate
    ├── assessments/      # avaliações de QA
    └── inspections/      # relatórios do @validator
.sia/                     # runtime local, fora do git
src/
tests/
```

- Pastas vazias de `docs/` recebem `.gitkeep` para entrar no git.
- `.env.example`: copie `templates/env.example` para a raiz, se não existir.
- core-config: preencha `project.name` e `project.type`, com confirmação.
- Projeto Node sem `package.json`: `npm init -y` e `"private": true`. Não crie scripts de qualidade de mentira (que só imprimem texto): o `*pre-push` registra os scripts ausentes, e o `@dev` define os reais quando a stack for escolhida.
- Commit: `git add -A` e `git commit -m "chore: estrutura do SIA"`; o envio vai pelo `*push`.

### 7. Status do projeto nos agentes
A saudação dos agentes mostra branch, arquivos modificados, commits à frente e último commit a partir do git. Confira que funcionam sem erro:
- `git rev-parse --is-inside-work-tree` retorna `true`
- `git branch --show-current`, `git status --porcelain` e `git log -2 --oneline --no-decorate`
- `.sia/` existe e está no `.gitignore`

### 8. Integrações (opcional)
**Ponto de elicitação:**
1. Ligar o projeto à Vercel → `*vercel-setup`
2. Conectar o MCP do Supabase → `*setup-mcp supabase`
3. Conectar o MCP da Vercel → `*setup-mcp vercel`
4. Configurar o banco Supabase → `@dev *db-setup`
5. Nenhuma agora

No modo YOLO, nenhuma integração é feita; elas entram como próximos passos.

### 9. Relatório do ambiente
Grave `.sia/environment-report.yaml`:

```yaml
generated_at: '2026-10-16T15:20:00-03:00'
project: meu-projeto
system: { os: Darwin, arch: arm64, package_managers: [brew] }
tools:
  git: { installed: true, version: '2.47.0' }
  gh: { installed: true, version: '2.80.0', authenticated: true }
  node: { installed: true, version: '24.11.0' }
  npm: { installed: true, version: '11.6.0' }
  supabase: { installed: false }
  vercel: { installed: true, authenticated: false }
  docker: { installed: true, running: false }
repository: { initialized: true, remote: 'https://github.com/org/meu-projeto', branch: main }
validation: { essentials_ok: true, recommended_ok: false, ready_for_development: true }
decisions: []   # decisões do modo YOLO
```

### 10. Validação final e resumo
Confira: essenciais instaladas, `gh` autenticado, git iniciado, remoto criado (quando escolhido), `.gitignore` com `.env` e `.sia/`, estrutura criada, `.env.example` presente e relatório gravado. Depois mostre:

```text
━━━ Ambiente pronto ━━━
Projeto:      meu-projeto
Repositório:  https://github.com/org/meu-projeto (main)
Ferramentas:  git ✅  gh ✅ autenticado  node ✅  npm ✅  vercel ✅  supabase ⏭️
Relatório:    .sia/environment-report.yaml

Próximos passos:
1. @devops *setup-github     proteção de branch, template de PR, segredos
2. @devops *configure-ci     GitHub Actions
3. @pm *create-project-brief e @pm *create-prd   (workflow greenfield)
```

## Saída
- Repositório git local, com remoto no GitHub quando escolhido, e commit inicial.
- `.gitignore`, `README.md`, `.env.example` e a estrutura de `docs/` e `.sia/`.
- `.sia/environment-report.yaml`.

## Critérios de conclusão
- [ ] git, gh e Node.js instalados e respondendo à verificação de versão
- [ ] `gh auth status` autenticado, ou adiamento registrado
- [ ] Repositório git com commit inicial e, quando escolhido, remoto no GitHub
- [ ] `.gitignore` cobre `.env`, `.env.local`, `.env.*.local`, `.vercel/` e `.sia/`
- [ ] Estrutura do SIA criada e `.env.example` presente
- [ ] Relatório gravado em `.sia/environment-report.yaml`

## Tratamento de erros

| Situação | Ação |
|----------|------|
| `winget` não reconhecido | atualize o Windows (App Installer da Microsoft Store) ou use `choco install gh` ou `scoop install gh` |
| `gh auth login` sem conexão | confira a rede; atrás de proxy, defina `HTTPS_PROXY`; alternativa: `gh auth login --with-token` com token lido de arquivo |
| "Resource not accessible by personal access token" | `gh auth refresh -s repo,workflow`; organização com SSO exige autorizar o token para ela |
| Docker não inicia | macOS: abra o Docker Desktop; Linux: `sudo systemctl start docker`; Windows: inicie o Docker Desktop |
| Permissão negada na instalação | instale por usuário (nvm, fnm, `npm config set prefix`) ou peça elevação |
| `gh repo create` falhou | crie sem `--push` e envie depois; persistindo, crie pelo site e ligue como existente |

## Rollback
Só com confirmação explícita, e apenas do que esta task criou (consulte o relatório):

```bash
rm -rf .git .sia
rm -f .gitignore README.md .env.example
gh repo delete {dono}/{nome} --yes   # CUIDADO: apaga o repositório no GitHub
```

## Handoff
Próximo passo: `@devops *setup-github`, depois `@devops *configure-ci`; em seguida, `@pm *create-project-brief` para começar o workflow greenfield (`workflows/greenfield.yaml`).

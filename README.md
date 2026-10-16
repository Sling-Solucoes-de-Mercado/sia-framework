# SIA: Sling Inteligência Artificial

Framework de desenvolvimento orientado por agentes de IA da Sling. O trabalho é organizado em stories, executado por tasks e conduzido por 5 agentes. Funciona no **Claude Code**, no **Codex (ChatGPT)**, no **Gemini CLI** e no **Grok**.

[![CI](https://github.com/Sling-Solucoes-de-Mercado/sia-framework/actions/workflows/ci.yml/badge.svg)](https://github.com/Sling-Solucoes-de-Mercado/sia-framework/actions/workflows/ci.yml)

---

## Instalação

Abra o terminal **na pasta do seu projeto** (nova ou existente) e escolha uma opção.

### macOS e Linux

```bash
curl -fsSL https://raw.githubusercontent.com/Sling-Solucoes-de-Mercado/sia-framework/main/install.sh | sh
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/Sling-Solucoes-de-Mercado/sia-framework/main/install.ps1 | iex
```

### Com Node.js 22+ instalado

```bash
npx github:Sling-Solucoes-de-Mercado/sia-framework
```

### Executável para baixar

Nas [Releases](https://github.com/Sling-Solucoes-de-Mercado/sia-framework/releases/latest) há o executável `sia` para cada sistema. Não precisa de Node para instalar:

| Sistema | Arquivo |
|---------|---------|
| macOS (Apple Silicon) | `sia-macos-arm64.tar.gz` |
| macOS (Intel) | `sia-macos-x64.tar.gz` |
| Linux x64 / ARM | `sia-linux-x64.tar.gz` / `sia-linux-arm64.tar.gz` |
| Windows | `sia-windows-x64.zip` |

Descompacte e rode `sia install` na pasta do projeto. Na primeira vez, o macOS pode pedir permissão em *Ajustes > Privacidade e Segurança*, e o Windows pode mostrar o aviso do SmartScreen (*Mais informações > Executar assim mesmo*).

### O que a instalação faz

1. Pergunta o nome do projeto, o tipo (novo ou existente) e as IDEs que você usa.
2. Copia o framework para `.sia-core/`.
3. Gera a integração de cada IDE: `.claude/`, `AGENTS.md` + `.agents/`, `.gemini/` + `GEMINI.md` e `.grok/`.
4. Cria as pastas `docs/` e acrescenta `.sia/` ao `.gitignore`.

Para responder tudo de uma vez: `sia install --yes --name "Meu App" --type greenfield --ide claude-code,codex`.

**Atualizar:** `sia update`. O comando preserva o `core-config.yaml`, a memória dos agentes e as preferências técnicas, e guarda uma cópia da versão anterior em `.sia/backups/`.

**Requisito para os agentes:** os hooks de governança (push só pelo `@devops`) usam o Node.js 22+. O instalador avisa se ele não estiver presente.

---

## Primeiros passos

1. Abra o projeto na sua IDE.
2. Ative um agente: `/sia-pm` (ou `@pm`). Os comandos começam com `*`, por exemplo `*help`.
3. Projeto novo: `@pm *create-project-brief`. Projeto existente: `@dev *document-project`.

## O time

| Agente | Nome | Quando usar |
|--------|------|-------------|
| `@pm` | Mira 🎯 | Pesquisa, PRD, epics, stories, backlog e o veredito de qualidade (QA gate) |
| `@dev` | Davi 🛠️ | Implementar stories, arquitetura, banco de dados (Supabase) e UX/UI |
| `@devops` | Lance 🚀 | Push, pull request, release, CI/CD, deploy na Vercel e conexão de MCPs |
| `@validator` | Vera 🔍 | Inspeção técnica da entrega: lacunas, falhas, segurança, regressão, código morto |
| `@squad-creator` | Elo 🔗 | Criar squads e novos agentes, tasks e workflows |

## O ciclo de uma story

```
@pm *create-story → @pm *validate-story → @dev *develop → @validator *revisar-feature → @pm *qa-gate → @devops *push
  Draft               Draft → Ready         Ready → InReview     relatório                InReview → Done
```

Se o gate sair `FAIL`, a story volta para o `@dev` (`*apply-qa-fixes`) e passa por nova inspeção.

## CLI

Depois de instalado, o executável `sia` também roda os comandos do projeto:

```bash
sia doctor                 # diagnóstico do ambiente
sia validate               # valida agentes, tasks, workflows e referências
sia sync                   # regenera as integrações das IDEs
sia story status 1.1       # situação da story e próximo comando
sia mcp setup supabase     # conecta o MCP do Supabase nas IDEs
```

Referência completa: [docs/sia/cli.md](docs/sia/cli.md).

## Documentação

- [Guia do usuário](.sia-core/user-guide.md)
- [Constitution](.sia-core/constitution.md)
- [Arquitetura e decisões](docs/sia/architecture.md)
- [Guia de autoria (formatos)](.sia-core/data/sia-authoring-guide.md)
- [Referência da CLI](docs/sia/cli.md)
- [Mapa AIOX → SIA](docs/sia/porting-map.yaml)

## Desenvolvimento do framework

```bash
npm test                                   # testes do instalador e da CLI
node .sia-core/cli/sia.js validate         # valida o .sia-core
node scripts/build-sea.js                  # gera o executável para o sistema atual (Node oficial 22+)
```

Uma nova versão é publicada criando a tag `vX.Y.Z`. O workflow `Release` gera os executáveis e os anexa à Release.

---

Licença MIT. Derivado do [Synkra AIOX](https://github.com/SynkraAI/aiox-core) (MIT); veja [NOTICE](NOTICE).

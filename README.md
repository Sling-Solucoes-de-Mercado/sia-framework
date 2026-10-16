# SIA: Sling Inteligência Artificial

Framework de desenvolvimento orientado por agentes de IA da Sling. O trabalho é organizado em stories, executado por tasks e conduzido por 5 agentes. Funciona no Claude Code, no Codex (ChatGPT), no Gemini CLI e no Grok.

> **Status:** framework em validação. O instalador ainda não existe; veja [Como testar](#como-testar).

---

## O time

| Agente | Nome | Quando usar |
|--------|------|-------------|
| `@pm` | Mira 🎯 | Pesquisa, PRD, epics, stories, backlog e o veredito de qualidade (QA gate) |
| `@dev` | Davi 🛠️ | Implementar stories, arquitetura, banco de dados (Supabase) e UX/UI |
| `@devops` | Lance 🚀 | Push, pull request, release, CI/CD, deploy na Vercel e conexão de MCPs |
| `@validator` | Vera 🔍 | Inspeção técnica da entrega: lacunas, falhas, segurança, regressão, código morto |
| `@squad-creator` | Elo 🔗 | Criar squads e novos agentes, tasks e workflows |

Ative um agente com `@pm`, `/sia-pm` ou `/SIA:agents:pm` (o formato varia por IDE) e use os comandos com `*`, como `*help`, `*create-story` e `*develop 1.1`.

## O ciclo de uma story

```
@pm *create-story → @pm *validate-story → @dev *develop → @validator *revisar-feature → @pm *qa-gate → @devops *push
  Draft               Draft → Ready         Ready → InReview     relatório                InReview → Done
```

Se o gate sair `FAIL`, a story volta para o `@dev` (`*apply-qa-fixes`) e passa por nova inspeção.

## Estrutura do repositório

```text
.sia-core/          o framework: agentes, tasks, templates, checklists, workflows, regras, skills, hooks e CLI
docs/sia/           documentação de manutenção (arquitetura, CLI, mapa AIOX → SIA)
```

As pastas das IDEs (`.claude/`, `.codex/`, `.gemini/`, `.grok/`) e os arquivos `CLAUDE.md`, `AGENTS.md` e `GEMINI.md` são gerados por `sia sync` a partir do `.sia-core/` e não são editados à mão.

## CLI

```bash
node .sia-core/cli/sia.js validate        # valida agentes, tasks, workflows e referências
node .sia-core/cli/sia.js doctor          # diagnóstico do ambiente
node .sia-core/cli/sia.js sync            # gera as integrações das IDEs
node .sia-core/cli/sia.js story status 1.1
node .sia-core/cli/sia.js mcp setup supabase
```

Referência completa: [docs/sia/cli.md](docs/sia/cli.md).

## Como testar

Sem instalador, a validação é feita num projeto-sandbox:

```bash
mkdir -p ~/sia-sandbox && cd ~/sia-sandbox && git init
node /caminho/para/sia-framework/.sia-core/cli/sia.js sync --target . --link-core
```

O comando cria um link para o `.sia-core` deste repositório e gera as integrações das 4 IDEs. Depois, abra o sandbox na IDE e ative um agente, por exemplo `/sia-pm`.

## Documentação

- [Guia do usuário](.sia-core/user-guide.md)
- [Constitution](.sia-core/constitution.md)
- [Arquitetura e decisões](docs/sia/architecture.md)
- [Guia de autoria (formatos)](.sia-core/data/sia-authoring-guide.md)
- [Referência da CLI](docs/sia/cli.md)
- [Mapa AIOX → SIA](docs/sia/porting-map.yaml)

---

Derivado do Synkra AIOX (licença MIT).

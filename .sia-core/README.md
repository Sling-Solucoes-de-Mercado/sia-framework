# .sia-core

Fonte da verdade do **SIA** (Sling Inteligência Artificial): agentes, tasks, templates, checklists, workflows, regras, skills, hooks e a CLI `sia`. As pastas das IDEs (`.claude/`, `.agents/`, `.codex/`, `.gemini/`, `.grok/`) e os arquivos `CLAUDE.md`, `AGENTS.md` e `GEMINI.md` são projeções geradas por `sia sync`; não edite projeções à mão.

| Pasta ou arquivo | Conteúdo |
|------------------|----------|
| `constitution.md` | Princípios inegociáveis |
| `core-config.yaml` | Configuração do projeto (caminhos, gates, IDEs, integrações, fronteira) |
| `user-guide.md` | Guia do usuário |
| `agents/` | Os 5 agentes (`pm`, `dev`, `devops`, `validator`, `squad-creator`) e a memória de cada um |
| `tasks/`, `templates/`, `checklists/`, `workflows/`, `data/`, `schemas/` | Processo executável e dados de apoio |
| `rules/` | Regras projetadas nas IDEs |
| `skills/` | Skills de workflow (`sia-full-sdc`, `sia-develop-story`, `sia-qa-gate`...) |
| `hooks/` | Hooks de governança: autoridade do `@devops` e rastreio do agente ativo |
| `cli/` | CLI `sia` (Node 22+, sem dependências; js-yaml vendorizado em `cli/vendor/`) |

## CLI

Rode na raiz do projeto: `sia {comando}` ou `node .sia-core/cli/sia.js {comando}`. Todo comando aceita `--json`.

```bash
sia doctor                         # diagnóstico do ambiente
sia validate [--squad nome]        # valida o .sia-core e os squads
sia sync [--ide lista] [--check]   # gera ou confere as projeções das IDEs
sia story status 2.1               # status e próximo passo da story
sia sdc plan|next|verify|mark|status 2.1
sia mcp setup supabase --ide claude-code,codex
sia mcp remove supabase | sia mcp status
sia squad list
sia agent use devops | current | clear
```

Códigos de saída: `0` ok, `1` falha de validação ou verificação, `2` erro de uso.

Testes: `cd .sia-core && node --test cli/tests/` (ou `npm test`).

Referência completa: [`docs/sia/cli.md`](../docs/sia/cli.md).

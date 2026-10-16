---
id: health-check
title: Diagnóstico do ambiente e do SIA
agent: devops
elicit: true
inputs:
  - '--verbose (opcional): mostra também as verificações que passaram na seção de problemas'
outputs:
  - 'Relatório em Markdown com resumo, problemas mapeados à Constitution e correções sugeridas'
next: [environment-bootstrap, setup-mcp, sync-ide]
source: [health-check.yaml]
---

# Diagnóstico do ambiente e do SIA

## Objetivo
Rodar o diagnóstico da CLI (`sia doctor`), interpretar cada resultado à luz da Constitution e sugerir a correção. A lógica das verificações vive na CLI; esta task não mantém lista própria de checagens, só a interpretação.

## Quando usar
- Ao entrar num projeto ou numa máquina nova.
- Quando um comando de agente, hook ou MCP se comporta de forma estranha.
- Antes de uma release, como verificação geral.

## Pré-condições
- [ ] Comando executado na raiz do projeto
- [ ] Node.js disponível para rodar a CLI

## Passos

### 1. Rodar o diagnóstico
```bash
sia doctor
```
Sem `sia` no PATH: `node .sia-core/cli/sia.js doctor`. Se `sia doctor --help` listar saída estruturada (`--json`), prefira-a. Guarde a saída inteira.

Sem a CLI disponível, faça a verificação manual equivalente: estrutura do `.sia-core/` (agentes, tasks, templates, checklists, workflows, data), `core-config.yaml` legível, `node --version` (18 ou superior), `git rev-parse --is-inside-work-tree`, `gh auth status`, projeções das IDEs presentes e MCPs configurados nos arquivos de `data/mcp-servers.yaml`.

### 2. Interpretar
Para cada verificação com WARN ou FAIL, encontre a categoria e aplique o mapa:

| Categoria | Artigo da Constitution | Por que importa | Correção típica |
|-----------|------------------------|-----------------|-----------------|
| Estrutura do `.sia-core/` | VII Fonte única | agentes, tasks e templates vêm só daqui | restaurar o arquivo da fonte; `sia validate` |
| `core-config.yaml` | I CLI First | a configuração guia a CLI e as tasks | corrigir o YAML e os caminhos de `paths` |
| Node.js | V Qualidade primeiro | a CLI e os scripts precisam de runtime suportado | instalar Node.js 18 ou superior (LTS ativa) |
| Dependências do projeto | V Qualidade primeiro | lint, testes e build dependem delas | `npm install` (ou o gerenciador do projeto) |
| Repositório git | III Orientado a stories, V Qualidade | status, portões e entrega dependem do git | `git init` ou `*environment-bootstrap` |
| GitHub CLI | II Autoridade dos agentes | push, PR e release do `@devops` usam o `gh` | `gh auth login` |
| Hooks de governança | II Autoridade dos agentes | o `enforce-git-push-authority` restringe push, PR e release ao `@devops` | `sia sync` para projetar os hooks de novo |
| Projeções das IDEs | VII Fonte única | `.claude/`, `.codex/`, `.gemini/` e `.grok/` precisam refletir a fonte | `sia sync`; conferir com `sia sync --check` |
| Regras e arquivos de contexto | II Autoridade, VII Fonte única | CLAUDE.md, AGENTS.md e GEMINI.md carregam as regras | `sia sync` |
| Artefatos e referências | VII Fonte única | dependência apontando para arquivo inexistente quebra comandos | `sia validate` e correção pelo `@squad-creator` |
| Memória dos agentes | II Autoridade dos agentes | contexto persistente de cada agente | recriar `agents/{id}/MEMORY.md` vazio a partir de outro agente |
| MCPs | II Autoridade dos agentes | MCP é configurado só pelo `@devops` | `*setup-mcp supabase` ou `*setup-mcp vercel` |
| Integrações (Supabase, Vercel) | II Autoridade dos agentes | `integrations.*.enabled` sem CLI, login ou link | `*vercel-setup`, `@dev *db-setup` ou ajustar o core-config |

Categoria fora do mapa: interprete pelo texto da mensagem e diga que não há mapeamento.

### 3. Relatório
```markdown
## Diagnóstico do SIA

Resumo: {pass} PASS | {warn} WARN | {fail} FAIL

### Problemas
**[FAIL] {verificação}**: {mensagem}
- Constitution: Artigo {N} ({nome}). {por que importa}
- Correção: {comando ou instrução}

**[WARN] {verificação}**: {mensagem}
- Constitution: Artigo {N} ({nome}). {por que importa}
- Correção: {comando ou instrução}

### Todas as verificações
| Verificação | Status | Observação |
|-------------|--------|------------|
```
Sem `--verbose`, a seção de problemas traz só FAIL e WARN. O resumo e a tabela completa aparecem sempre.

### 4. Correções
**Ponto de elicitação:** liste as correções em ordem (FAIL antes de WARN) e pergunte quais executar:
1. Todas as automáticas (comandos como `sia sync` e `npm install`)
2. Escolher pelos números
3. Nenhuma agora

Execute só as escolhidas. Correções visíveis fora da máquina ou de autoridade de outro agente: encaminhe (ex.: artefatos do framework → `@squad-creator`). Depois, rode `sia doctor` de novo e mostre a diferença.

## Saída
Relatório em Markdown com resumo, problemas, mapeamento à Constitution e correções sugeridas ou executadas.

## Critérios de conclusão
- [ ] `sia doctor` executado, ou verificação manual equivalente registrada
- [ ] Todo FAIL e WARN com artigo da Constitution e correção
- [ ] Correções executadas só com a escolha do usuário
- [ ] Novo diagnóstico depois das correções, quando houve alguma

## Tratamento de erros

| Situação | Ação |
|----------|------|
| CLI `sia` não encontrada | use `node .sia-core/cli/sia.js doctor`; sem a CLI, faça a verificação manual do passo 1 |
| Saída fora do formato esperado | apresente a saída bruta e interprete por mensagem |
| Correção falhou | mostre o erro; não tente alternativas destrutivas sem confirmação |

## Handoff
- Ambiente incompleto: `@devops *environment-bootstrap`.
- MCP ausente ou inválido: `@devops *setup-mcp {supabase|vercel}`.
- Projeções divergentes: `@squad-creator *sync-ide`.

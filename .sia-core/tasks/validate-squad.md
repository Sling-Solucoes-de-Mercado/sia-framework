---
id: validate-squad
title: Validar um squad
agent: squad-creator
elicit: false
inputs:
  - 'nome ou caminho (obrigatório): nome em squads/ ou caminho da pasta do squad'
  - '--strict (opcional): avisos viram erros'
  - '--verbose (opcional): mostra o detalhe de cada verificação'
outputs:
  - 'Relatório no chat: erros, avisos, sugestões e resultado (VALID, VALID com avisos ou INVALID)'
depends_on:
  data: [sia-authoring-guide.md]
  schemas: [squad-schema.json]
next: [sync-ide, analyze-squad, publish-squad]
source: [squad-creator-validate.md]
---

# Validar um squad

## Objetivo

Verificar um squad contra `schemas/squad-schema.json` e contra os formatos de agente, task e workflow do guia de autoria, com um relatório que aponta cada problema e a correção.

## Quando usar

- Depois de criar, estender ou migrar um squad.
- Antes de `*publish-squad` (exige zero erros) e de `*sync-ide`.

## Pré-condições

- [ ] Pasta do squad existe

## Passos

### 1. Resolver o caminho

Nome → `squads/{nome}/`. Caminho → use como está. Pasta inexistente: `SQUAD_NOT_FOUND`.

### 2. Rodar a CLI

```bash
sia validate --squad {nome}
# sem sia no PATH: node .sia-core/cli/sia.js validate --squad {nome}
```

Com `--strict`, repasse a flag à CLI (`sia validate --squad {nome} --strict`). Use a saída como base do relatório e os passos 3 a 8 para explicar cada achado e sugerir a correção. Sem CLI, execute os passos 3 a 8 manualmente e registre isso no relatório.

### 3. Manifest

- `squad.yaml` existe. Só `config.yaml`: aviso `DEPRECATED_MANIFEST` (sugira `*migrate-squad`). Nenhum dos dois: erro `MANIFEST_NOT_FOUND`.
- YAML válido (`YAML_PARSE_ERROR`).
- Schema (`SCHEMA_ERROR`): `name` e `version` obrigatórios; `name` em kebab-case (2 a 50 caracteres) e igual ao nome da pasta; `version` semântica; `license` na lista permitida; `config.extends` em extend, override ou none; `dependencies` como objeto com `node`, `python` e `squads`.

### 4. Estrutura

- Pastas `tasks/` e `agents/` existem (aviso `MISSING_DIRECTORY`).
- Cada arquivo de `components.{tipo}` existe em `{tipo}/` (erro `FILE_NOT_FOUND`). As entradas são nomes de arquivo, não globs.
- `tasks/` sem nenhuma task: aviso `NO_TASKS` (arquitetura task-first).

### 5. Tasks (guia, seção 8)

Para cada `tasks/*.md`:

- Frontmatter YAML com `id` igual ao nome do arquivo, `title`, `agent` e `elicit` booleano (erro `TASK_MISSING_FIELD` quando falta campo).
- `agent` é um agente do squad ou um dos 5 agentes do SIA; `hat` presente quando `agent` é `pm` ou `dev`.
- Cada item de `depends_on` existe no squad ou no `.sia-core/` (erro `FILE_NOT_FOUND`).
- Seções `## Objetivo`, `## Passos`, `## Saída` e `## Critérios de conclusão` (aviso `TASK_MISSING_FIELD` quando falta seção).
- Nome em kebab-case (aviso `INVALID_NAMING`).

### 6. Agentes (guia, seção 7)

Para cada `agents/*.md`:

- Bloco YAML válido com `agent.id` igual ao nome do arquivo (aviso `AGENT_INVALID_FORMAT` quando o formato não segue o guia).
- Todo comando com `task:`, `template:` ou `checklist:` aponta para item de `dependencies`, e cada dependência existe (squad primeiro, depois `.sia-core/`).
- Nome em kebab-case (aviso `INVALID_NAMING`).

### 7. Configuração

Para cada caminho em `config.coding-standards`, `config.tech-stack` e `config.source-tree`:

- Caminho local (`config/...`) inexistente: erro `FILE_NOT_FOUND`.
- Caminho do projeto (`../../docs/...`) inexistente: aviso `FILE_NOT_FOUND`, com a sugestão de criar o arquivo ou voltar para `config/{arquivo}`.

### 8. Workflows (guia, seção 11)

Para cada `workflows/*.yaml`: `workflow.id`, `workflow.name` e `sequence` não vazio; todo `agent:` é agente do squad ou um dos 5 do SIA (mesmo id nos dois: aviso de ambiguidade, vale o do squad); todo `task:` existe no squad ou no `.sia-core/`.

### 9. Montar o relatório

Junte erros e avisos, cada um com a sugestão. Resultado `INVALID` com qualquer erro; com `--strict`, também com qualquer aviso.

| Mensagem de schema | Sugestão |
|--------------------|----------|
| não casa com o padrão | kebab-case para nomes, versão semântica para versões |
| esperado string | coloque o valor entre aspas |
| esperado array | use lista YAML (`- item` ou `[a, b]`) |
| campo obrigatório ausente | acrescente o campo |
| valor fora da lista | use um dos valores permitidos |

## Saída

Relatório no chat:

```text
Validando squad: squads/vendas-b2b/

Erros: 0
Avisos: 2
  - [MISSING_DIRECTORY] Pasta esperada não encontrada: workflows/
    Sugestão: crie workflows/ quando houver sequências de tasks
  - [TASK_MISSING_FIELD] (gerar-proposta.md) Falta a seção ## Critérios de conclusão
    Sugestão: acrescente a seção (guia de autoria, seção 8.2)

Resultado: VALID (com avisos)
```

| Código | Severidade |
|--------|------------|
| `MANIFEST_NOT_FOUND`, `YAML_PARSE_ERROR`, `SCHEMA_ERROR` | erro |
| `FILE_NOT_FOUND` | erro (aviso para referência a documento do projeto) |
| `TASK_MISSING_FIELD` | erro (campo do frontmatter) ou aviso (seção) |
| `DEPRECATED_MANIFEST`, `MISSING_DIRECTORY`, `NO_TASKS`, `AGENT_INVALID_FORMAT`, `INVALID_NAMING` | aviso |

## Critérios de conclusão

- [ ] Verificações dos passos 3 a 8 cobertas, pela CLI ou manualmente
- [ ] Cada erro e aviso com a sugestão de correção
- [ ] Resultado declarado: VALID, VALID (com avisos) ou INVALID

## Tratamento de erros

| Situação | Ação |
|----------|------|
| `SQUAD_NOT_FOUND` | Liste os squads (`sia squad list`) e peça o nome certo |
| `MANIFEST_NOT_FOUND` | Pare; sugira `*create-squad` ou `*migrate-squad` |
| CLI indisponível | Verifique manualmente (passos 3 a 8) e avise que o resultado não passou pela CLI |

## Handoff

VALID: `@squad-creator *sync-ide` (e `*publish-squad {nome}` quando for distribuir). INVALID: corrija e rode `*validate-squad {nome}` de novo.
